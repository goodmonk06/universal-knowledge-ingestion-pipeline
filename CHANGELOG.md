# Changelog

All notable changes to the Universal Knowledge Ingestion Pipeline will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-XX (Phase 3: Production-Grade Platform)

### Added

#### Infrastructure & Observability
- **Structured Logging**: JSON-based logging with correlation IDs and context support
- **Metrics System**: Prometheus-compatible metrics with counters, gauges, and histograms
- **Event Bus**: Type-safe pub/sub system for loose coupling between components
- **Caching Layer**: In-memory cache with TTL support for embeddings and search results
- **Plugin Registry**: Extensible plugin system for custom loaders, splitters, and adapters

#### Job Management System
- **Async Job Processing**: Background job system for long-running ingestion operations
- **Job States**: PENDING → PROCESSING → COMPLETED/FAILED/CANCELLED
- **Progress Tracking**: Real-time progress updates for jobs
- **Job Statistics**: Comprehensive stats endpoint for monitoring
- **Concurrency Control**: Configurable concurrent job limits

#### Enhanced Domain Model
- `IngestionJob`: Track long-running operations with full lifecycle management
- `DocumentVersion`: Version history for documents (schema defined)
- `Tag`: Rich metadata tagging system (schema defined)
- `Webhook`: Event notification subscriptions (schema defined)
- `APIKey`: Multi-tenant access control (schema defined)
- `ProcessingPipeline`: Configurable workflows (schema defined)
- `SearchQuery`: Search analytics and history (schema defined)

#### API Endpoints
- `POST /api/jobs` - Create ingestion job
- `GET /api/jobs` - List jobs with filtering
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/:id/cancel` - Cancel running job
- `GET /api/jobs/stats` - Job statistics
- `GET /metrics` - System metrics (JSON and Prometheus formats)
- `GET /debug/events` - Event history (development only)

#### Vector Store Enhancements
- `listDocuments()` - Paginated document listing
- `getDocumentById()` - Single document retrieval
- `deleteDocument()` - Document deletion
- `getCollections()` - List all collections
- Collection filtering in search

#### Documentation
- `docs/PHASE3_OVERVIEW.md` - Comprehensive Phase 3 plan and objectives
- `docs/ARCHITECTURE.md` - Detailed system architecture documentation
- `docs/INTEGRATION_RECIPES.md` - Integration examples and recipes
- Enhanced README with full API documentation

#### Testing
- Logger unit tests with spy verification
- Event bus tests with async handlers
- Metrics collector tests with Prometheus export
- Cache tests with TTL expiration
- Enhanced schema validation tests
- Text splitter tests with metadata preservation
- Loader tests with error handling

#### Developer Experience
- Enhanced health endpoint with memory, cache, and event stats
- Comprehensive TypeScript interfaces for all new entities
- Notification adapter system with console and webhook implementations
- Correlation ID support for request tracing

### Changed

- **API Version**: Bumped to v2.0.0
- **Health Check**: Enhanced with detailed system statistics
- **Error Responses**: More detailed error information with codes
- **Server Startup**: Improved initialization with better logging
- **Type Safety**: Stricter type definitions across the system

### Fixed

- Export MetricsCollector class for testing
- Export InMemoryCache class for testing
- Export EventBus class for testing

## [1.0.0] - 2025-01-XX (Phase 2: Production-Ready REST API)

### Added

#### Core REST API
- Full CRUD operations for documents
- Semantic search endpoint with collection filtering
- Document ingestion via API
- Validation using Zod schemas
- Centralized error handling middleware

#### Docker Support
- Production Dockerfile with multi-stage build
- docker-compose.yml for full stack deployment
- docker-compose.dev.yml for local development
- Health checks in containers

#### Validation & Error Handling
- Zod schemas for all request types
- Validation middleware for body, query, and params
- Async error handler wrapper
- Standardized error response format

#### Testing Infrastructure
- Vitest configuration with coverage
- Unit tests for text splitter
- Schema validation tests
- Loader tests
- ESLint configuration

#### Database Scripts
- Migration script (db:migrate)
- Seed script with 6 sample documents
- 4 sample collections for demonstration

#### Package Scripts
- `dev` - Development server with hot reload
- `build` - Production build
- `start` - Start production server
- `test` - Run test suite
- `lint` - Lint TypeScript code
- `db:migrate` - Run migrations
- `db:seed` - Load seed data

### Changed

- Reorganized codebase with api/, middleware/, schemas/ directories
- Enhanced README with comprehensive documentation
- Improved .env.example with all configuration options

## [0.1.0] - 2025-01-XX (Initial Release)

### Added

- PDF document loader using pdf-parse
- Text file loader
- Web page loader using JSDOM
- Token-based text splitter with tiktoken
- OpenAI embeddings integration
- PGVector vector store implementation
- ETL-style ingestion pipeline
- CLI interface for ingestion and search
- Basic TypeScript type definitions
- Docker support for PostgreSQL + PGVector

### Core Features

- Extract content from PDF, text files, and web pages
- Split text into configurable chunks with overlap
- Generate embeddings using OpenAI API
- Store and search vectors in PostgreSQL with pgvector
- Cosine similarity search
- Collection-based organization

---

## Migration Guides

### Migrating from 1.x to 2.x

#### Breaking Changes

1. **Server Entry Point**: Main server is now in `src/server.ts` (previously no server, CLI only)
2. **API Version**: All endpoints now return v2.0.0 in the API info response
3. **Job-Based Ingestion**: Direct ingestion via `POST /api/documents/ingest` now creates a job

#### New Features to Adopt

1. **Use Jobs for Long Operations**:
   ```javascript
   // Old way (synchronous, blocking)
   POST /api/documents/ingest { sourceType, collection, ... }

   // New way (async, trackable)
   POST /api/jobs { sourceType, collection, ... }
   GET /api/jobs/:id // Check progress
   ```

2. **Monitor with Metrics**:
   ```bash
   curl http://localhost:3000/metrics
   # Or Prometheus format:
   curl http://localhost:3000/metrics?format=prometheus
   ```

3. **Subscribe to Events**:
   ```typescript
   import { eventBus, EventTypes } from './lib/events';

   eventBus.on(EventTypes.DOCUMENT_INGESTED, (event) => {
     console.log('Document ingested:', event.payload);
   });
   ```

4. **Use Structured Logging**:
   ```typescript
   import { logger } from './lib/logger';

   const requestLogger = logger.withCorrelationId(requestId);
   requestLogger.info('Processing request', { userId, action });
   ```

#### Configuration Changes

Add these new environment variables to your `.env`:

```env
# Optional: Enable/disable metrics
ENABLE_METRICS=true

# Optional: Job concurrency
MAX_CONCURRENT_JOBS=3
```

---

## Roadmap

### Phase 4 (Future)

- [ ] Qdrant vector store implementation
- [ ] Multiple embedding provider support (Cohere, HuggingFace)
- [ ] Webhook delivery system
- [ ] API key management and authentication
- [ ] Rate limiting per tenant
- [ ] Batch document operations API
- [ ] Document versioning API
- [ ] Tag management API
- [ ] Advanced search filters
- [ ] Search analytics dashboard
- [ ] Performance optimizations (embedding caching, batch processing)
- [ ] Real-time ingestion via websockets
- [ ] Admin UI for management

### Phase 5 (Vision)

- [ ] Distributed job processing with Bull/BullMQ
- [ ] Redis-based caching and session management
- [ ] Multi-region deployment support
- [ ] A/B testing framework for embeddings
- [ ] Cost optimization tooling
- [ ] Machine learning pipeline for quality scoring
- [ ] Auto-scaling infrastructure templates
- [ ] GraphQL API option
- [ ] gRPC API for high-performance use cases
