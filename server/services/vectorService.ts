import { storage } from "../storage";
import { EmbeddingService } from "./embeddingService";
import { type DocumentChunk } from "@shared/schema";

export interface SimilarityResult {
  chunk: DocumentChunk;
  similarity: number;
  documentName?: string;
}

export class VectorService {
  static async searchSimilarChunks(
    queryEmbedding: number[], 
    topK: number = 5,
    threshold: number = 0.7
  ): Promise<SimilarityResult[]> {
    try {
      const allChunks = await storage.getAllChunks();
      const allDocuments = await storage.getAllDocuments();
      
      // Create document lookup map
      const documentMap = new Map();
      allDocuments.forEach(doc => {
        documentMap.set(doc.id, doc.originalName);
      });

      const similarities: SimilarityResult[] = [];

      for (const chunk of allChunks) {
        if (!chunk.embedding) continue;

        try {
          const chunkEmbedding = JSON.parse(chunk.embedding);
          const similarity = EmbeddingService.cosineSimilarity(queryEmbedding, chunkEmbedding);
          
          if (similarity >= threshold) {
            similarities.push({
              chunk,
              similarity,
              documentName: documentMap.get(chunk.documentId) || 'Unknown Document'
            });
          }
        } catch (parseError) {
          console.error('Failed to parse embedding for chunk:', chunk.id);
          continue;
        }
      }

      // Sort by similarity (descending) and return top K
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

    } catch (error) {
      throw new Error(`Failed to search similar chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
