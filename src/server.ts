import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import documentsRoutes from './api/documents.routes';
import jobsRoutes from './api/jobs.routes';
import { errorHandler, notFoundHandler, SuccessResponse } from './middleware/errorHandler';
import { metrics } from './lib/metrics';
import { eventBus } from './lib/events';
import { logger } from './lib/logger';
import { cache } from './lib/cache';

// 環境変数を読み込み
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Enhanced health check
app.get('/health', (req, res) => {
  const memoryUsage = process.memoryUsage();

  const response: SuccessResponse = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      },
      cache: cache.getStats(),
      events: {
        registered: eventBus.getRegisteredEvents().length,
        recent: eventBus.getEventLog().length,
      },
    },
  };
  res.json(response);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const format = req.query.format as string;

  if (format === 'prometheus') {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics.toPrometheus());
  } else {
    const response: SuccessResponse = {
      success: true,
      data: metrics.getMetrics(),
    };
    res.json(response);
  }
});

// Events endpoint (for debugging)
app.get('/debug/events', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: { message: 'Not available in production', code: 'FORBIDDEN' },
    });
  }

  const eventType = req.query.type as string | undefined;
  const limit = parseInt(req.query.limit as string || '100', 10);

  const response: SuccessResponse = {
    success: true,
    data: {
      events: eventBus.getEventLog(eventType, limit),
      registered: eventBus.getRegisteredEvents(),
    },
  };
  res.json(response);
});

// APIルート
app.get('/api', (req, res) => {
  const response: SuccessResponse = {
    success: true,
    data: {
      message: 'Universal Knowledge Ingestion Pipeline API',
      version: '2.0.0',
      endpoints: {
        health: 'GET /health',
        metrics: 'GET /metrics',
        documents: {
          ingest: 'POST /api/documents/ingest',
          list: 'GET /api/documents',
          get: 'GET /api/documents/:id',
          delete: 'DELETE /api/documents/:id',
          search: 'POST /api/documents/search',
        },
        jobs: {
          create: 'POST /api/jobs',
          list: 'GET /api/jobs',
          get: 'GET /api/jobs/:id',
          cancel: 'POST /api/jobs/:id/cancel',
          stats: 'GET /api/jobs/stats',
        },
        collections: {
          list: 'GET /api/collections',
        },
      },
    },
  };
  res.json(response);
});

app.use('/api/documents', documentsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/collections', documentsRoutes);

// エラーハンドリング
app.use(notFoundHandler);
app.use(errorHandler);

// サーバー起動
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║  Universal Knowledge Ingestion Pipeline API          ║
║  Server running on http://localhost:${PORT}            ║
╚═══════════════════════════════════════════════════════╝
    `);
  });
}

export default app;
