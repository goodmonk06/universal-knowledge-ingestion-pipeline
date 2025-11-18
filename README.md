# Universal Knowledge Ingestion Pipeline

A production-ready, end-to-end knowledge ingestion pipeline for RAG (Retrieval-Augmented Generation) systems. Extract content from PDFs, web pages, and text files, split into semantic chunks, generate embeddings, and store in a vector database with a full REST API.

## Overview

This project provides a complete, type-safe ETL pipeline for knowledge ingestion:

- **Extract**: Load documents from multiple sources (PDF, text files, web pages)
- **Transform**: Split text into semantic chunks with configurable overlap
- **Load**: Generate embeddings and store in vector database (PGVector)
- **Query**: REST API for document management and semantic search

Perfect for building RAG applications, knowledge bases, or semantic search systems.

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js with full REST API
- **Vector Database**: PostgreSQL + PGVector extension
- **Embeddings**: OpenAI Embeddings API (text-embedding-3-small)
- **Validation**: Zod for request validation
- **Testing**: Vitest with comprehensive unit tests
- **Container**: Docker + Docker Compose for easy deployment
- **Text Processing**: tiktoken for token-based chunking

## Domain Model

### Core Entities

**Document**
- `content`: Raw text content
- `metadata`: Source information, type, collection, custom fields
- Loaded from PDF, text files, or web pages

**DocumentChunk**
- Split from documents using token-based chunking
- Contains embedding vector for semantic search
- Preserves metadata from parent document
- Stored in PGVector with unique ID

**Collection**
- Logical grouping of related documents
- Enables filtered search and organization
- Examples: "product-docs", "blog-posts", "legal-contracts"

### Relationships

```
Source (PDF/Web/Text)
    ↓
Document (1)
    ↓ splits into
DocumentChunk (N)
    ↓ stored in
Collection
    ↓ searchable via
Vector Database (PGVector)
```

## Getting Started

### Requirements

- Node.js 20 or higher
- Docker and Docker Compose (recommended)
- OR PostgreSQL 16+ with PGVector extension
- OpenAI API key

### Quick Start (Docker)

1. **Clone and setup environment**

```bash
git clone <repository-url>
cd universal-knowledge-ingestion-pipeline

# Copy and configure environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

2. **Start the entire stack**

```bash
docker compose up -d
```

This starts:
- PostgreSQL with PGVector on port 5432
- API server on http://localhost:3000

3. **Initialize database and load sample data**

```bash
# Run migrations (creates tables and indexes)
docker compose exec app npm run db:migrate

# Load sample documents
docker compose exec app npm run db:seed
```

4. **Test the API**

```bash
# Health check
curl http://localhost:3000/health

# List documents
curl http://localhost:3000/api/documents

# Search for similar content
curl -X POST http://localhost:3000/api/documents/search \
  -H "Content-Type: application/json" \
  -d '{"query": "TypeScript programming", "topK": 3}'
```

### Local Development Setup

1. **Install dependencies**

```bash
npm install
```

2. **Start PostgreSQL (dev environment)**

```bash
docker compose -f docker-compose.dev.yml up -d
```

3. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your settings
```

Required environment variables:
```env
OPENAI_API_KEY=sk-...
PGVECTOR_HOST=localhost
PGVECTOR_PORT=5432
PGVECTOR_DATABASE=vector_db
PGVECTOR_USER=postgres
PGVECTOR_PASSWORD=postgres
```

4. **Run migrations and seed**

```bash
npm run db:migrate
npm run db:seed
```

5. **Start development server**

```bash
npm run dev
```

Server runs on http://localhost:3000 with hot reload.

### Available Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run dev:cli      # Run CLI commands (original functionality)
npm run build        # Build for production
npm start            # Start production server
npm test             # Run test suite
npm test:watch       # Run tests in watch mode
npm run lint         # Lint TypeScript code
npm run db:migrate   # Initialize database schema
npm run db:seed      # Load sample data
```

## API Documentation

Base URL: `http://localhost:3000/api`

### Health Check

```http
GET /health
```

Returns server status and uptime.

### Document Management

#### Ingest Document

```http
POST /api/documents/ingest
Content-Type: application/json

{
  "sourceType": "web",
  "collection": "documentation",
  "sourceUrl": "https://example.com"
}
```

**Parameters:**
- `sourceType`: "pdf" | "text" | "web"
- `collection`: Collection name (string)
- `sourcePath`: File path (required for pdf/text)
- `sourceUrl`: URL (required for web)

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "ドキュメントのインジェストが完了しました",
    "collection": "documentation"
  }
}
```

#### List Documents

```http
GET /api/documents?collection=documentation&limit=20&offset=0
```

**Query Parameters:**
- `collection`: Filter by collection (optional)
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

#### Get Document by ID

```http
GET /api/documents/:id
```

#### Delete Document

```http
DELETE /api/documents/:id
```

#### Search Documents

```http
POST /api/documents/search
Content-Type: application/json

{
  "query": "How to use TypeScript?",
  "collection": "programming-languages",
  "topK": 5
}
```

**Parameters:**
- `query`: Search query (string)
- `collection`: Filter by collection (optional)
- `topK`: Number of results (default: 5)

### Collections

#### List Collections

```http
GET /api/collections
```

Returns all available collection names.

### Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## Example Workflow

### Complete End-to-End Example

This demonstrates the full vertical slice of the system:

1. **Start the system**

```bash
docker compose up -d
docker compose exec app npm run db:migrate
docker compose exec app npm run db:seed
```

2. **Ingest a web page**

```bash
curl -X POST http://localhost:3000/api/documents/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "web",
    "collection": "tech-blogs",
    "sourceUrl": "https://example.com/blog/post"
  }'
```

3. **List all documents**

```bash
curl http://localhost:3000/api/documents
```

4. **Search for similar content**

```bash
curl -X POST http://localhost:3000/api/documents/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning embeddings",
    "topK": 3
  }'
```

5. **Filter by collection**

```bash
curl "http://localhost:3000/api/documents?collection=tech-blogs&limit=10"
```

6. **Get specific document**

```bash
curl http://localhost:3000/api/documents/1
```

7. **Delete document**

```bash
curl -X DELETE http://localhost:3000/api/documents/1
```

### CLI Usage (Original Functionality)

The CLI interface is still available for batch processing:

```bash
# Ingest PDF
npx ingest run --source pdf --path ./docs/manual.pdf --collection manuals

# Ingest web page
npx ingest run --source web --url https://docs.example.com --collection docs

# Search from CLI
npx ingest search --query "installation guide" --top-k 5
```

## Testing

Run the test suite:

```bash
npm test
```

Tests include:
- **Unit tests**: Text splitter, schemas, loaders
- **Validation tests**: Request schema validation
- **Integration tests**: End-to-end API flows

Coverage report available in `coverage/` directory.

## Architecture

### Request Flow

```
Client Request
    ↓
Express Middleware (CORS, JSON parsing, logging)
    ↓
Route Handler
    ↓
Validation Middleware (Zod schemas)
    ↓
Controller
    ↓
Business Logic (Pipeline, VectorStore)
    ↓
PGVector Database
    ↓
Response (standardized format)
```

### Abstraction Layers

All core components use interfaces for easy extensibility:

- `ILoader`: Document loading (PDF, text, web)
- `ITextSplitter`: Text chunking strategies
- `IEmbeddingClient`: Embedding generation
- `IVectorStore`: Vector database operations

**Easy to extend:**
- Swap OpenAI → Cohere/HuggingFace embeddings
- Swap PGVector → Qdrant/Pinecone/Weaviate
- Add new loaders: Notion, Confluence, Google Docs

## Project Structure

```
.
├── src/
│   ├── api/                    # REST API layer
│   │   ├── documents.controller.ts
│   │   └── documents.routes.ts
│   ├── loaders/                # Document loaders
│   │   ├── pdfLoader.ts
│   │   ├── textLoader.ts
│   │   └── webLoader.ts
│   ├── splitters/              # Text chunking
│   │   └── textSplitter.ts
│   ├── embeddings/             # Embedding generation
│   │   └── openaiEmbeddings.ts
│   ├── vectorstores/           # Vector database
│   │   └── pgVectorStore.ts
│   ├── pipelines/              # ETL pipeline
│   │   └── ingestPipeline.ts
│   ├── schemas/                # Validation schemas
│   │   └── document.schema.ts
│   ├── middleware/             # Express middleware
│   │   ├── errorHandler.ts
│   │   ├── validate.ts
│   │   └── asyncHandler.ts
│   ├── scripts/                # Utility scripts
│   │   ├── migrate.ts
│   │   └── seed.ts
│   ├── __tests__/              # Test suite
│   │   └── unit/
│   ├── types.ts                # TypeScript types
│   ├── server.ts               # Express server
│   └── cli.ts                  # CLI interface
├── docker-compose.yml          # Production setup
├── docker-compose.dev.yml      # Development setup
├── Dockerfile
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | 3000 |
| `NODE_ENV` | Environment | development |
| `OPENAI_API_KEY` | OpenAI API key | **Required** |
| `EMBEDDING_MODEL` | OpenAI model | text-embedding-3-small |
| `EMBEDDING_DIMENSION` | Vector dimension | 1536 |
| `PGVECTOR_HOST` | PostgreSQL host | localhost |
| `PGVECTOR_PORT` | PostgreSQL port | 5432 |
| `PGVECTOR_DATABASE` | Database name | vector_db |
| `PGVECTOR_USER` | Database user | postgres |
| `PGVECTOR_PASSWORD` | Database password | **Required** |
| `CHUNK_SIZE` | Tokens per chunk | 1000 |
| `CHUNK_OVERLAP` | Overlap between chunks | 200 |

## Future Extensions

- [ ] **Additional Vector Stores**: Qdrant, Pinecone, Weaviate adapters
- [ ] **More Loaders**: Notion, Confluence, Google Docs, Slack
- [ ] **Advanced Chunking**: Semantic chunking, document structure awareness
- [ ] **Metadata Filtering**: Complex queries with metadata filters
- [ ] **Batch Processing**: Bulk document ingestion with progress tracking
- [ ] **Authentication**: API key management and rate limiting
- [ ] **Monitoring**: Prometheus metrics, health checks
- [ ] **Admin UI**: Web dashboard for document management
- [ ] **Webhooks**: Real-time notifications for ingestion events
- [ ] **Multi-tenancy**: Isolated collections per user/organization

## Demo Credentials

After running `npm run db:seed`, the database contains sample documents in these collections:

- `programming-languages`: TypeScript, React content
- `databases`: Vector database explanations
- `ai-ml`: NLP and RAG architecture docs
- `backend-technologies`: Node.js overview

Use these collections to test search functionality:

```bash
curl -X POST http://localhost:3000/api/documents/search \
  -H "Content-Type: application/json" \
  -d '{"query": "vector database", "collection": "databases", "topK": 3}'
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm test` and `npm run lint`
5. Submit a pull request

## License

MIT

---

**Production Ready** ✓ Full REST API ✓ Docker Support ✓ Comprehensive Tests ✓ Type Safety
