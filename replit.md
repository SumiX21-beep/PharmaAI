# PharmaQuery

## Overview

PharmaQuery is a generative AI-powered pharmaceutical research assistant that enables users to upload PDF documents and query their contents using natural language. The application combines document processing, vector embeddings, and large language models to provide accurate answers with source citations from uploaded pharmaceutical research papers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming support
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Design System**: Component-based architecture with reusable UI components

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **File Processing**: Multer for file uploads with PDF parsing capabilities
- **PDF Processing**: pdf-parse library for text extraction from PDF documents
- **Text Processing**: Custom chunking algorithms for splitting documents into searchable segments
- **API Design**: RESTful endpoints for document upload, query processing, and data retrieval

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM for metadata storage
- **Vector Storage**: In-memory vector search using cosine similarity for document chunk retrieval
- **Schema Management**: Drizzle Kit for database migrations and schema management
- **Storage Strategy**: Hybrid approach with structured data in PostgreSQL and vector embeddings in application memory

### Authentication and Authorization
- **Current State**: No authentication system implemented
- **Session Management**: Basic session handling infrastructure in place
- **Security**: File upload restrictions (PDF only, 10MB limit)

### AI Integration Architecture
- **Embedding Generation**: OpenAI's text-embedding-3-small model for document vectorization
- **Language Model**: Google Gemini AI for query response generation
- **Vector Search**: Custom cosine similarity implementation for semantic search
- **Prompt Engineering**: Dynamic prompt composition combining user queries with relevant document chunks

### Document Processing Pipeline
1. **Upload**: PDF files received via multipart form data
2. **Text Extraction**: PDF content converted to plain text
3. **Chunking**: Text split into overlapping segments (1000 chars, 200 char overlap)
4. **Embedding**: Each chunk vectorized using OpenAI embeddings
5. **Storage**: Metadata in PostgreSQL, embeddings in application memory
6. **Query Processing**: User queries embedded and matched against document chunks
7. **Response Generation**: Top matching chunks sent to LLM for answer synthesis

### Error Handling and Validation
- **Input Validation**: Zod schemas for type-safe data validation
- **File Validation**: MIME type checking and size limits for uploads
- **Error Boundaries**: Comprehensive error handling with user-friendly messages
- **API Error Management**: Structured error responses with appropriate HTTP status codes

## External Dependencies

### AI Services
- **OpenAI API**: Text embedding generation (text-embedding-3-small model)
- **Google Gemini API**: Large language model for query responses and answer generation

### Database Services
- **Neon Database**: PostgreSQL hosting service for structured data storage
- **Connection**: @neondatabase/serverless for database connectivity

### Development and Deployment
- **Replit Platform**: Development environment with specialized Vite plugins
- **Build Tools**: Vite for frontend bundling, esbuild for backend compilation
- **TypeScript Compiler**: Type checking and transpilation

### UI and Styling Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography

### Utility Libraries
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with validation
- **date-fns**: Date manipulation and formatting
- **clsx/tailwind-merge**: CSS class composition utilities

### File Processing
- **Multer**: Multipart form data handling for file uploads
- **pdf-parse**: PDF text extraction library
- **Node.js File System**: Local file storage for uploaded documents