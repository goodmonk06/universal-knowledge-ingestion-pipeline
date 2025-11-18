import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import documentsRoutes from './api/documents.routes';
import { errorHandler, notFoundHandler, SuccessResponse } from './middleware/errorHandler';

// 環境変数を読み込み
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ヘルスチェック
app.get('/health', (req, res) => {
  const response: SuccessResponse = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
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
      version: '1.0.0',
      endpoints: {
        health: 'GET /health',
        documents: {
          ingest: 'POST /api/documents/ingest',
          list: 'GET /api/documents',
          get: 'GET /api/documents/:id',
          delete: 'DELETE /api/documents/:id',
          search: 'POST /api/documents/search',
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
