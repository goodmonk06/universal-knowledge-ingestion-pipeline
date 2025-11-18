# Integration Recipes

This document provides practical examples for integrating the Universal Knowledge Ingestion Pipeline with common services and use cases.

## Table of Contents

1. [Webhooks & Notifications](#webhooks--notifications)
2. [Authentication Services](#authentication-services)
3. [Content Management Systems](#content-management-systems)
4. [RAG Application Integration](#rag-application-integration)
5. [Analytics & Monitoring](#analytics--monitoring)
6. [Batch Processing](#batch-processing)
7. [Multi-Tenant Setup](#multi-tenant-setup)

---

## Webhooks & Notifications

### Slack Notifications for Ingestion Events

```typescript
import { eventBus, EventTypes } from './lib/events';

// Subscribe to job completion events
eventBus.on(EventTypes.JOB_COMPLETED, async (event) => {
  const { jobId, result } = event.payload;

  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `✅ Ingestion job ${jobId} completed`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Job Completed*\n` +
                  `Documents: ${result.documentsCreated}\n` +
                  `Chunks: ${result.chunksCreated}`,
          },
        },
      ],
    }),
  });
});
```

### Discord Notifications

```typescript
eventBus.on(EventTypes.JOB_FAILED, async (event) => {
  const { jobId, error } = event.payload;

  await fetch(process.env.DISCORD_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: '❌ Ingestion Job Failed',
        description: `Job ID: ${jobId}\nError: ${error}`,
        color: 0xff0000,
        timestamp: new Date().toISOString(),
      }],
    }),
  });
});
```

### Custom Webhook System

```typescript
// Store webhook subscriptions
interface WebhookSubscription {
  url: string;
  events: string[];
  secret?: string;
}

const webhooks: WebhookSubscription[] = [];

// Generic webhook dispatcher
async function dispatchWebhook(eventType: string, payload: any) {
  const relevantWebhooks = webhooks.filter(wh =>
    wh.events.includes(eventType)
  );

  for (const webhook of relevantWebhooks) {
    const body = JSON.stringify({
      event: eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    const signature = webhook.secret
      ? crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')
      : undefined;

    await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature && { 'X-Webhook-Signature': signature }),
      },
      body,
    });
  }
}

// Subscribe to all events
eventBus.onMany(
  Object.values(EventTypes),
  async (event) => {
    await dispatchWebhook(event.type, event.payload);
  }
);
```

---

## Authentication Services

### JWT-Based API Authentication

```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    collections: string[];
  };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'No token provided', code: 'UNAUTHORIZED' },
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid token', code: 'UNAUTHORIZED' },
    });
  }
};

// Apply to protected routes
app.use('/api/documents', authMiddleware, documentsRoutes);
```

### API Key Authentication

```typescript
const API_KEYS = new Map([
  ['sk_test_123', { name: 'Test App', collections: ['docs', 'blogs'] }],
  ['sk_prod_456', { name: 'Prod App', collections: ['*'] }],
]);

export const apiKeyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: { message: 'API key required', code: 'UNAUTHORIZED' },
    });
  }

  const keyData = API_KEYS.get(apiKey);

  if (!keyData) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid API key', code: 'UNAUTHORIZED' },
    });
  }

  (req as any).apiKey = keyData;
  next();
};
```

---

## Content Management Systems

### WordPress Integration

```typescript
import { WordPressRestAPI } from 'wordpress-rest-api';

class WordPressLoader implements ILoader {
  constructor(
    private siteUrl: string,
    private username: string,
    private password: string
  ) {}

  async load(): Promise<Document[]> {
    const wp = new WordPressRestAPI({
      endpoint: `${this.siteUrl}/wp-json`,
      username: this.username,
      password: this.password,
    });

    const posts = await wp.posts().get();

    return posts.map(post => ({
      content: this.stripHtml(post.content.rendered),
      metadata: {
        source: post.link,
        sourceType: 'web' as const,
        title: post.title.rendered,
        author: post.author,
        publishedAt: post.date,
        categories: post.categories,
      },
    }));
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}

// Register plugin
pluginRegistry.register({
  metadata: { name: 'wordpress-loader', version: '1.0.0' },
  loaders: new Map([
    ['wordpress', () => new WordPressLoader(
      process.env.WP_SITE_URL!,
      process.env.WP_USERNAME!,
      process.env.WP_PASSWORD!
    )],
  ]),
});
```

### Notion Integration

```typescript
import { Client } from '@notionhq/client';

class NotionLoader implements ILoader {
  private notion: Client;

  constructor(apiKey: string, private databaseId: string) {
    this.notion = new Client({ auth: apiKey });
  }

  async load(): Promise<Document[]> {
    const response = await this.notion.databases.query({
      database_id: this.databaseId,
    });

    const documents: Document[] = [];

    for (const page of response.results) {
      const blocks = await this.notion.blocks.children.list({
        block_id: page.id,
      });

      const content = this.extractTextFromBlocks(blocks.results);

      documents.push({
        content,
        metadata: {
          source: (page as any).url,
          sourceType: 'web',
          title: this.getPageTitle(page),
          notionId: page.id,
        },
      });
    }

    return documents;
  }

  private extractTextFromBlocks(blocks: any[]): string {
    return blocks
      .map(block => {
        const type = block.type;
        const textContent = block[type]?.rich_text || [];
        return textContent.map((t: any) => t.plain_text).join('');
      })
      .join('\n');
  }

  private getPageTitle(page: any): string {
    const titleProperty = Object.values(page.properties).find(
      (prop: any) => prop.type === 'title'
    ) as any;

    return titleProperty?.title?.[0]?.plain_text || 'Untitled';
  }
}
```

---

## RAG Application Integration

### LangChain Integration

```typescript
import { VectorStore } from 'langchain/vectorstores/base';
import { Embeddings } from 'langchain/embeddings/base';

class UKIPVectorStore extends VectorStore {
  constructor(
    embeddings: Embeddings,
    private apiUrl: string,
    private apiKey: string
  ) {
    super(embeddings, {});
  }

  async addDocuments(documents: any[]): Promise<void> {
    for (const doc of documents) {
      await fetch(`${this.apiUrl}/api/documents/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          sourceType: 'text',
          collection: 'langchain-docs',
          content: doc.pageContent,
          metadata: doc.metadata,
        }),
      });
    }
  }

  async similaritySearchWithScore(
    query: string,
    k: number
  ): Promise<[any, number][]> {
    const response = await fetch(`${this.apiUrl}/api/documents/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        query,
        topK: k,
      }),
    });

    const result = await response.json();

    return result.data.map((doc: any) => [
      {
        pageContent: doc.content,
        metadata: doc.metadata,
      },
      doc.metadata.similarity || 0,
    ]);
  }

  async similaritySearch(query: string, k: number): Promise<any[]> {
    const results = await this.similaritySearchWithScore(query, k);
    return results.map(([doc]) => doc);
  }
}

// Usage in RAG chain
import { RetrievalQAChain } from 'langchain/chains';
import { OpenAI } from 'langchain/llms/openai';

const vectorStore = new UKIPVectorStore(
  new OpenAIEmbeddings(),
  'http://localhost:3000',
  'your-api-key'
);

const chain = RetrievalQAChain.fromLLM(
  new OpenAI(),
  vectorStore.asRetriever()
);

const answer = await chain.call({
  query: 'What is TypeScript?',
});
```

### Chatbot Integration

```typescript
import { OpenAI } from 'openai';

async function answerQuestion(question: string, collection?: string) {
  // 1. Search for relevant context
  const searchResponse = await fetch('http://localhost:3000/api/documents/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: question,
      collection,
      topK: 3,
    }),
  });

  const searchResult = await searchResponse.json();
  const context = searchResult.data
    .map((doc: any) => doc.content)
    .join('\n\n');

  // 2. Generate answer with LLM
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant. Answer questions based on the provided context.',
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  return {
    answer: completion.choices[0].message.content,
    sources: searchResult.data.map((doc: any) => doc.metadata.source),
  };
}
```

---

## Analytics & Monitoring

### Prometheus Metrics Export

```typescript
import promClient from 'prom-client';

// Convert internal metrics to Prometheus format
const register = new promClient.Registry();

const ingestedCounter = new promClient.Counter({
  name: 'ukip_documents_ingested_total',
  help: 'Total documents ingested',
  labelNames: ['collection', 'source_type'],
  registers: [register],
});

const searchLatency = new promClient.Histogram({
  name: 'ukip_search_latency_seconds',
  help: 'Search latency in seconds',
  labelNames: ['collection'],
  registers: [register],
});

// Sync with internal metrics periodically
setInterval(() => {
  const internalMetrics = metrics.getMetrics();

  // Update Prometheus metrics
  // ... conversion logic ...
}, 60000);

app.get('/metrics/prometheus', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "UKIP Monitoring",
    "panels": [
      {
        "title": "Ingestion Rate",
        "targets": [
          {
            "expr": "rate(ukip_documents_ingested_total[5m])"
          }
        ]
      },
      {
        "title": "Search Latency (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, ukip_search_latency_seconds)"
          }
        ]
      },
      {
        "title": "Job Success Rate",
        "targets": [
          {
            "expr": "ukip_jobs_completed_total / (ukip_jobs_completed_total + ukip_jobs_failed_total)"
          }
        ]
      }
    ]
  }
}
```

---

## Batch Processing

### Bulk Document Ingestion

```typescript
import { jobService } from './services/jobService';

async function batchIngest(files: string[], collection: string) {
  const jobs = [];

  for (const file of files) {
    const job = await jobService.createJob({
      sourceType: file.endsWith('.pdf') ? 'pdf' : 'text',
      sourcePath: file,
      collection,
      metadata: { batch: true, batchId: crypto.randomUUID() },
    });

    jobs.push(job);
  }

  // Wait for all jobs to complete
  const results = await Promise.all(
    jobs.map(job => waitForJobCompletion(job.id))
  );

  return {
    total: jobs.length,
    completed: results.filter(r => r.status === 'completed').length,
    failed: results.filter(r => r.status === 'failed').length,
  };
}

async function waitForJobCompletion(jobId: string) {
  while (true) {
    const job = jobService.getJob(jobId);

    if (!job) throw new Error('Job not found');

    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

---

## Multi-Tenant Setup

### Collection-Based Isolation

```typescript
// Middleware to enforce tenant isolation
const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: { message: 'Tenant ID required', code: 'BAD_REQUEST' },
    });
  }

  // Prefix collection with tenant ID
  if (req.body.collection) {
    req.body.collection = `tenant_${tenantId}_${req.body.collection}`;
  }

  if (req.query.collection) {
    req.query.collection = `tenant_${tenantId}_${req.query.collection}`;
  }

  next();
};

app.use('/api', tenantMiddleware);
```

### Tenant-Specific Configuration

```typescript
interface TenantConfig {
  id: string;
  embeddingModel: string;
  chunkSize: number;
  maxDocuments: number;
  rateLimit: number;
}

const tenantConfigs = new Map<string, TenantConfig>();

async function getTenantConfig(tenantId: string): Promise<TenantConfig> {
  if (tenantConfigs.has(tenantId)) {
    return tenantConfigs.get(tenantId)!;
  }

  // Load from database
  const config = await db.query(
    'SELECT * FROM tenant_configs WHERE id = $1',
    [tenantId]
  );

  tenantConfigs.set(tenantId, config);
  return config;
}
```

---

## Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Phase 3 Overview](./PHASE3_OVERVIEW.md)
- [API Reference](../README.md#api-documentation)
