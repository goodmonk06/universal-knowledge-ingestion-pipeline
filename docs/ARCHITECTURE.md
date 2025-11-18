# Architecture Documentation

## System Overview

The Universal Knowledge Ingestion Pipeline (UKIP) is a modular, production-ready system designed for extracting, processing, and indexing knowledge from multiple sources into a vector database for semantic search and RAG applications.

## Architectural Principles

1. **Separation of Concerns**: Clear boundaries between loading, processing, embedding, and storage
2. **Interface-Driven Design**: All major components implement interfaces for easy swapping
3. **Event-Driven**: Asynchronous event bus for loose coupling between components
4. **Observable**: Comprehensive logging, metrics, and health monitoring
5. **Extensible**: Plugin system allows adding new capabilities without modifying core code

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  REST endpoints, validation, error handling, auth            │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                  Service Layer                               │
│  Job management, pipeline orchestration, business logic      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                  Domain Layer                                │
│  Loaders, splitters, embeddings, vector stores               │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│              Infrastructure Layer                            │
│  Logging, metrics, events, cache, plugins                    │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Loaders (Data Extraction)

**Purpose**: Extract raw content from various sources

**Implementations**:
- `PDFLoader`: Extracts text from PDF files using pdf-parse
- `TextLoader`: Reads plain text files
- `WebLoader`: Scrapes web pages using JSDOM

**Interface**: `ILoader`

```typescript
interface ILoader {
  load(): Promise<Document[]>;
}
```

**Extension Points**:
- Add new loader implementations via plugin system
- Examples: NotionLoader, ConfluenceLoader, GoogleDocsLoader

### 2. Splitters (Text Segmentation)

**Purpose**: Break documents into semantically meaningful chunks

**Implementation**:
- `RecursiveCharacterTextSplitter`: Token-based chunking with configurable overlap

**Interface**: `ITextSplitter`

```typescript
interface ITextSplitter {
  splitDocuments(documents: Document[]): Promise<DocumentChunk[]>;
}
```

**Configuration**:
- `chunkSize`: Maximum tokens per chunk (default: 1000)
- `chunkOverlap`: Overlapping tokens between chunks (default: 200)

**Extension Points**:
- Semantic splitters (sentence/paragraph boundaries)
- Document-structure-aware splitters (headers, sections)

### 3. Embeddings (Vector Generation)

**Purpose**: Convert text into dense vector representations

**Implementation**:
- `OpenAIEmbeddings`: Uses OpenAI's text-embedding-3-small model

**Interface**: `IEmbeddingClient`

```typescript
interface IEmbeddingClient {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}
```

**Features**:
- Batch processing for efficiency
- Caching support to avoid redundant API calls

**Extension Points**:
- CohereEmbeddings, HuggingFaceEmbeddings, LocalEmbeddings

### 4. Vector Stores (Persistence & Search)

**Purpose**: Store and retrieve vectors efficiently

**Implementation**:
- `PGVectorStore`: PostgreSQL with pgvector extension

**Interface**: `IVectorStore`

```typescript
interface IVectorStore {
  initialize(): Promise<void>;
  addDocuments(chunks: DocumentChunk[]): Promise<void>;
  similaritySearch(query: string, k?: number): Promise<DocumentChunk[]>;
  listDocuments(options): Promise<{ documents, total }>;
  getDocumentById(id): Promise<DocumentChunk | null>;
  deleteDocument(id): Promise<boolean>;
  getCollections(): Promise<string[]>;
}
```

**Search Algorithm**:
- Cosine similarity using vector operators
- IVFFlat index for fast approximate nearest neighbor search

**Extension Points**:
- QdrantStore, PineconeStore, WeaviateStore

### 5. Job System (Async Processing)

**Purpose**: Track long-running ingestion operations

**Components**:
- `JobService`: Manages job lifecycle
- In-memory job queue (production would use Bull/BullMQ)
- Configurable concurrency limits

**Job States**:
```
PENDING → PROCESSING → COMPLETED
                    ↘ FAILED
                    ↘ CANCELLED
```

**Features**:
- Progress tracking
- Error handling and retry logic
- Job statistics and monitoring

## Infrastructure Components

### Logger

**Implementation**: Structured JSON logging with correlation IDs

**Features**:
- Context-aware logging (child loggers)
- Request tracing with correlation IDs
- Log levels: debug, info, warn, error
- Production-ready format for log aggregation

**Usage**:
```typescript
import { logger } from './lib/logger';

const requestLogger = logger.withCorrelationId(req.id);
requestLogger.info('Processing request', { userId, action });
```

### Metrics

**Implementation**: In-memory metrics collector (Prometheus-compatible)

**Metric Types**:
- **Counter**: Monotonically increasing (requests, errors)
- **Gauge**: Current value (active connections, memory)
- **Histogram**: Distribution of values (latency, duration)

**Features**:
- Label support for multi-dimensional metrics
- Prometheus export format
- Statistical aggregation (min, max, avg, percentiles)

**Common Metrics**:
- `documents_ingested_total`
- `search_latency_ms`
- `jobs_completed_total`
- `http_request_duration_ms`

### Event Bus

**Implementation**: In-memory pub/sub system

**Features**:
- Type-safe events with payloads
- Multiple handlers per event
- Async handler support
- Event history/audit log
- Subscription management

**Event Types**:
- Document: ingested, updated, deleted
- Job: created, started, progress, completed, failed
- Search: performed
- System: error, warning

**Usage**:
```typescript
import { eventBus, EventTypes } from './lib/events';

// Subscribe
eventBus.on(EventTypes.DOCUMENT_INGESTED, async (event) => {
  console.log('Document ingested:', event.payload.documentId);
});

// Publish
await eventBus.emit(EventTypes.DOCUMENT_INGESTED, {
  documentId: 123,
  collection: 'docs',
});
```

### Cache

**Implementation**: In-memory cache with TTL support

**Use Cases**:
- Embedding caching (avoid redundant API calls)
- Search result caching
- Frequently accessed documents

**Features**:
- TTL-based expiration
- Automatic cleanup
- Statistics tracking

### Plugin System

**Purpose**: Enable extensibility without modifying core code

**Registry**:
- Centralized plugin registration
- Component factories
- Lifecycle hooks

**Hook Points**:
- `beforeIngest`: Modify config before ingestion
- `afterIngest`: Post-processing after ingestion
- `beforeSearch`: Query modification
- `afterSearch`: Result transformation

**Example Plugin**:
```typescript
const myPlugin: Plugin = {
  metadata: {
    name: 'my-plugin',
    version: '1.0.0',
  },
  loaders: new Map([
    ['custom', () => new CustomLoader()],
  ]),
  hooks: {
    afterIngest: async (result) => {
      // Send notification
    },
  },
};

pluginRegistry.register(myPlugin);
```

## Data Flow

### Ingestion Flow

```
1. API Request
   ↓
2. Validation (Zod schemas)
   ↓
3. Job Creation
   ↓
4. Loader Selection & Execution
   ↓
5. Document Loading
   ↓
6. Text Splitting (chunks)
   ↓
7. Embedding Generation (batched)
   ↓
8. Vector Store Insertion
   ↓
9. Job Completion
   ↓
10. Event Emission
```

### Search Flow

```
1. API Request
   ↓
2. Validation
   ↓
3. Query Embedding Generation
   ↓
4. Cache Check
   ↓
5. Vector Similarity Search
   ↓
6. Result Ranking
   ↓
7. Metadata Filtering
   ↓
8. Response Formation
   ↓
9. Metrics Recording
```

## Scalability Considerations

### Current Limitations (Phase 3)

- In-memory job queue (single process)
- In-memory cache (no distribution)
- Synchronous embedding generation
- Single-server deployment

### Production Scaling Path

1. **Job Queue**: Replace with Bull/BullMQ + Redis
2. **Cache**: Use Redis or Memcached
3. **Embeddings**: Batch async workers
4. **Database**: Read replicas, connection pooling
5. **API**: Horizontal scaling with load balancer
6. **Vector Search**: Sharding, distributed index

## Security Considerations

### Current State

- No authentication (assumed internal use)
- Basic input validation
- SQL injection prevention (parameterized queries)
- CORS enabled for all origins

### Production Hardening

- [ ] API key authentication
- [ ] Rate limiting per key
- [ ] Request signing/verification
- [ ] TLS/HTTPS enforcement
- [ ] Input sanitization
- [ ] Secrets management (Vault, AWS Secrets Manager)
- [ ] Network isolation
- [ ] Audit logging

## Error Handling Strategy

### Levels

1. **Validation Errors** (400): Invalid input
2. **Not Found** (404): Resource doesn't exist
3. **Business Logic Errors** (400-409): Domain-specific failures
4. **Internal Errors** (500): Unexpected failures

### Response Format

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Recovery Strategies

- **Transient failures**: Automatic retry with exponential backoff
- **Permanent failures**: Error logging, job marking as failed
- **Partial failures**: Continue processing, log errors, report summary

## Monitoring & Observability

### Health Checks

- `/health`: Basic liveness check
- `/health/ready`: Readiness check (DB connectivity, dependencies)
- `/metrics`: Prometheus-compatible metrics

### Key Metrics to Monitor

- Request rate and latency
- Error rate by endpoint
- Job completion rate
- Embedding API latency
- Vector search performance
- Memory and CPU usage

### Alerts

Recommended alerts:
- High error rate (> 5%)
- Job failure rate (> 10%)
- High latency (p99 > 5s)
- Memory usage (> 80%)
- Queue depth (> 100 pending jobs)

## Testing Strategy

### Unit Tests

- Individual component logic
- Interface implementations
- Utility functions
- Mock external dependencies

### Integration Tests

- API endpoint flows
- Database operations
- Pipeline execution

### Performance Tests

- Embedding generation throughput
- Search latency under load
- Concurrent job processing

## Deployment Architectures

### Development

```
Docker Compose:
- App container
- PostgreSQL + pgvector
- Local file volumes
```

### Production (Single Server)

```
- App server (PM2/systemd)
- Managed PostgreSQL (RDS, Cloud SQL)
- Reverse proxy (Nginx)
- SSL termination
- Backup/restore automation
```

### Production (Distributed)

```
- Load Balancer
- App servers (auto-scaled)
- Redis (cache + queue)
- PostgreSQL (primary + replicas)
- Object storage (S3, GCS)
- Monitoring stack (Prometheus, Grafana)
```

## Future Enhancements

See docs/PHASE3_OVERVIEW.md for comprehensive roadmap.

Key areas:
- Multi-tenancy
- Advanced caching strategies
- Batch processing optimization
- Real-time search updates
- A/B testing framework for embeddings
- Cost optimization (embedding caching, batch grouping)
