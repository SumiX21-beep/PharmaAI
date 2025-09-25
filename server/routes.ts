import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { PDFService } from "./services/pdfService";
import { EmbeddingService } from "./services/embeddingService";
import { VectorService } from "./services/vectorService";
import { insertDocumentSchema, insertQuerySchema } from "@shared/schema";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const openai = OPENAI_API_KEY ? new OpenAI({
  apiKey: OPENAI_API_KEY,
}) : null;

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload PDF endpoint
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = req.file.path;
      const originalName = req.file.originalname;

      // Extract text from PDF
      const text = await PDFService.extractTextFromPDF(filePath);
      
      // Split into chunks
      const textChunks = PDFService.splitTextIntoChunks(text);

      // Create document record
      const document = await storage.createDocument({
        filename: req.file.filename,
        originalName,
        chunksCount: textChunks.length,
      });

      // Generate embeddings and store chunks
      const embeddings = await EmbeddingService.generateEmbeddings(textChunks);

      for (let i = 0; i < textChunks.length; i++) {
        await storage.createDocumentChunk({
          documentId: document.id,
          chunkIndex: i,
          text: textChunks[i],
          embedding: JSON.stringify(embeddings[i]),
        });
      }

      // Cleanup uploaded file
      await PDFService.cleanupFile(filePath);

      res.json({
        success: true,
        document: {
          id: document.id,
          filename: document.originalName,
          chunksCount: document.chunksCount,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      
      // Cleanup file on error
      if (req.file?.path) {
        await PDFService.cleanupFile(req.file.path);
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to process PDF",
      });
    }
  });

  // Query endpoint
  app.post("/api/query", async (req, res) => {
    try {
      const { query } = req.body as { query?: string };
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }

      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: "Query is required" });
      }

      // Generate embedding for query
      const queryEmbedding = await EmbeddingService.generateEmbedding(query);

      // Find similar chunks
      const similarChunks = await VectorService.searchSimilarChunks(queryEmbedding, 5, 0.7);

      if (similarChunks.length === 0) {
        return res.json({
          answer: "I couldn't find any relevant information in your uploaded documents to answer this question. Please try rephrasing your query or upload more relevant documents.",
          sources: [],
        });
      }

      // Prepare context for LLM
      const context = similarChunks
        .map((result, index) => `[Source ${index + 1} - ${result.documentName}]: ${result.chunk.text}`)
        .join("\n\n");

      // Generate response using Gemini/OpenAI or fallback
      const prompt = `You are PharmaQuery, an AI research assistant specializing in pharmaceutical research. Use the provided context from research papers to answer the question accurately and concisely.

Context from uploaded research papers:
${context}

Question: ${query}

Instructions:
- Provide a clear, factual answer based on the context
- Reference specific findings from the papers when applicable
- If the context doesn't fully answer the question, mention what information is available
- Use medical terminology appropriately but explain complex concepts
- Be precise about any limitations in the available data

Answer:`;

      let answer: string | undefined;
      if (ai) {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        // @ts-ignore - SDK typing differences
        answer = response.text;
      } else if (openai) {
        const chat = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        });
        answer = chat.choices?.[0]?.message?.content;
      } else {
        // Simple extractive fallback: return top chunk texts as a summary
        const joined = similarChunks
          .map((r, i) => `Source ${i + 1} (${r.documentName}): ${r.chunk.text}`)
          .join("\n\n");
        answer = joined.slice(0, 1200) + (joined.length > 1200 ? "..." : "");
      }

      if (!answer) {
        answer = "I'm sorry, I couldn't generate a response.";
      }

      // Format sources for frontend
      const sources = similarChunks.map((result) => ({
        docName: result.documentName,
        chunkIndex: result.chunk.chunkIndex,
        text: result.chunk.text.substring(0, 400) + (result.chunk.text.length > 400 ? "..." : ""),
        similarity: Math.round(result.similarity * 100) / 100,
      }));

      // Save query to storage
      await storage.createQuery({
        query,
        response: answer,
        sources: JSON.stringify(sources),
      });

      res.json({
        answer,
        sources,
      });
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to process query",
      });
    }
  });

  // Get documents endpoint
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json({
        documents: documents.map(doc => ({
          id: doc.id,
          filename: doc.originalName,
          chunksCount: doc.chunksCount,
          uploadedAt: doc.uploadedAt,
        })),
      });
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get documents",
      });
    }
  });

  // Delete document endpoint
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      await storage.deleteDocument(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete document",
      });
    }
  });

  // Get statistics endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      const queries = await storage.getRecentQueries();
      
      res.json({
        totalDocuments: documents.length,
        totalQueries: queries.length,
      });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get statistics",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
