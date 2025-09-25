# PharmaQueryAI

PharmaQueryAI is a full‑stack (TypeScript) RAG-style PDF Q&A app. Upload pharmaceutical research PDFs, generate embeddings, and ask questions. The backend extracts text and stores chunk embeddings in memory, searches for the most relevant chunks, and then answers using Gemini (preferred) or OpenAI if keys are available, with a reasonable extractive fallback when no key is provided. The frontend is a Vite + React app with a clean UI for uploads, chat, and citations.

---

## Features
- Upload PDF files (validated, 10 MB per file)
- PDF text extraction and sentence-aware chunking
- Embedding generation
  - Gemini/OpenAI not required (deterministic local fallback embeddings)
- Vector search with cosine similarity and thresholding
- Query answering
  - Gemini (gemini-2.5-flash) → preferred if `GEMINI_API_KEY` is set
  - OpenAI (gpt-4o-mini) → if `OPENAI_API_KEY` is set
  - Extractive fallback if no API keys
- Source attributions with clickable previews
- Basic stats: total documents, total queries
- In-memory storage (no database required to run)

---

## Tech stack
- Frontend: React 18, Vite, TailwindCSS, Radix UI, TanStack Query
- Backend: Node.js, Express, TypeScript
- Embeddings/LLM: Google GenAI SDK (Gemini), OpenAI SDK; local fallback
- PDF parsing: pdf-parse
- Dev/build tooling: Vite, esbuild
- Optional ORM schema via Drizzle (for future DB use) – not required at runtime

---

## Project structure
```
PharmaQueryAI/
  client/                 # React app (Vite)
  server/                 # Express server, API routes, Vite dev/serve integration
  shared/                 # Shared types & Drizzle schema (optional)
  uploads/                # Temp upload directory for PDFs (gitignored)
  dist/                   # Production build output (server serves dist/public)
  vite.config.ts          # Vite config (root set to client)
  server/index.ts         # Express entry
  server/routes.ts        # API endpoints
  server/services/        # PDF, embeddings, vector search
  server/storage.ts       # In-memory storage implementation
  package.json            # Unified scripts
```

---

## Prerequisites
- Node.js 18+ and npm
- Windows, macOS, or Linux

Optional for cloud LLM:
- Gemini: set `GEMINI_API_KEY`
- OpenAI: set `OPENAI_API_KEY` (or `OPENAI_API_KEY_ENV_VAR`)

Note: No database is required to run. The Drizzle config is only for future persistence.

---

## Quick start (development)
1. Install dependencies:
   ```bash
   npm install
   ```
2. (Optional) Create `.env` in project root for LLM keys:
   ```bash
   # one or both
   GEMINI_API_KEY=your_gemini_key
   OPENAI_API_KEY=your_openai_key
   # or OPENAI_API_KEY_ENV_VAR=your_openai_key
   ```
3. Start the dev server (Express + Vite middleware):
   ```bash
   npm run dev
   ```
4. Open the app in your browser (port is printed in the console, default 5000).

The single dev process serves both API and frontend with hot reloads.

---

## Production build & run
1. Build the client and server bundle:
   ```bash
   npm run build
   ```
2. Run the production server:
   ```bash
   npm start
   ```
The Express server will serve static assets from `dist/public` and expose the API.

---

## Environment variables
- `PORT` (optional): Port to serve the app; defaults to `5000`.
- `GEMINI_API_KEY` (optional): Enables Gemini responses.
- `OPENAI_API_KEY` or `OPENAI_API_KEY_ENV_VAR` (optional): Enables OpenAI responses.
- `DATABASE_URL` (only for Drizzle CLI): Required only if you plan to use `drizzle-kit` to push the schema to a Postgres database; not needed to run the app.

No API keys → app still runs using deterministic local embeddings and extractive answers.

---

## NPM scripts
- `npm run dev` – Start Express in dev mode with Vite middleware
- `npm run build` – Build React app (to `dist/public`) and bundle the server
- `npm start` – Run the production server
- `npm run check` – TypeScript type-check
- `npm run db:push` – Drizzle schema push (requires `DATABASE_URL`) — optional

---

## API overview
Base URL is the same host/port as the app (Express serves both UI and API).

- POST `/api/upload`
  - Body: `multipart/form-data` with `file` (PDF). Max 10 MB.
  - Response example:
    ```json
    {
      "success": true,
      "document": { "id": "...", "filename": "paper.pdf", "chunksCount": 12 }
    }
    ```

- POST `/api/query`
  - Body: JSON `{ "query": "your question" }`
  - Response example:
    ```json
    {
      "answer": "...",
      "sources": [
        { "docName": "paper.pdf", "chunkIndex": 3, "text": "...", "similarity": 0.89 }
      ]
    }
    ```

- GET `/api/documents`
  - Returns uploaded documents with counts and timestamps.

- DELETE `/api/documents/:id`
  - Deletes a document and its chunks.

- GET `/api/stats`
  - Returns total documents and total queries counts.

---

## How it works (high level)
1. Upload: PDF is stored temporarily in `uploads/`. Text is extracted via `pdf-parse`.
2. Chunking: Text is split into sentence-aware overlapping chunks.
3. Embeddings: Each chunk embedding is generated via OpenAI (if configured) or a local deterministic fallback.
4. Storage: Documents, chunks, and queries are stored in memory (see `server/storage.ts`).
5. Retrieval: On a query, the query text is embedded and compared with all chunk embeddings using cosine similarity. Top matches above a threshold are returned.
6. Answering: A prompt is built with the matched chunk content and sent to Gemini (if key set), else OpenAI, else an extractive fallback concatenation.
7. Frontend: Displays the answer with source tags; sources are clickable to preview chunk text.

---

## Frontend usage
- Use the Upload card to drag-and-drop or select PDFs.
- After processing, your documents appear in the Recent Documents list.
- Ask a question in the chat panel; click source tags in the answer to preview.
- The Statistics card shows counts of uploaded documents and asked queries.

---

## Notes & limitations
- In-memory storage is ephemeral and resets on server restart.
- PDF text quality depends on `pdf-parse`. Scanned PDFs without text layers may not extract well.
- Embedding fallback is deterministic but not semantic at the level of real models; results are best with API keys.
- `drizzle.config.ts` is present to enable future Postgres support; it is not required for running this app.

---

## Troubleshooting (Windows)
- Use a recent Node.js LTS.
- If a module fails to build or load, try deleting `node_modules` and `package-lock.json`, then `npm install`.
- If port 5000 is busy, set `PORT=5050` (PowerShell: `$env:PORT=5050; npm run dev`).
- Ensure PDFs are < 10 MB and `application/pdf` content type.

---

## Security
- Uploaded PDFs are stored temporarily and removed after processing.
- No user accounts or authentication are implemented.
- Do not expose API keys in the browser; keep them as server-side environment variables.

---

## License
MIT

---

## Acknowledgements
- Google Gemini (`@google/genai`)
- OpenAI (`openai`)
- pdf-parse
- Radix UI, TanStack Query, Vite, TailwindCSS
