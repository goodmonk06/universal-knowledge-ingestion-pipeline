import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';
import {
  IngestDocumentSchema,
  SearchDocumentsSchema,
  ListDocumentsSchema,
  DocumentIdSchema,
} from '../schemas/document.schema';
import * as documentsController from './documents.controller';

const router = Router();

/**
 * POST /api/documents/ingest
 * ドキュメントをインジェスト
 */
router.post(
  '/ingest',
  validateBody(IngestDocumentSchema),
  asyncHandler(documentsController.ingestDocument)
);

/**
 * GET /api/documents
 * ドキュメント一覧を取得
 */
router.get(
  '/',
  validateQuery(ListDocumentsSchema),
  asyncHandler(documentsController.listDocuments)
);

/**
 * GET /api/documents/:id
 * IDでドキュメントを取得
 */
router.get(
  '/:id',
  validateParams(DocumentIdSchema),
  asyncHandler(documentsController.getDocumentById)
);

/**
 * DELETE /api/documents/:id
 * ドキュメントを削除
 */
router.delete(
  '/:id',
  validateParams(DocumentIdSchema),
  asyncHandler(documentsController.deleteDocument)
);

/**
 * POST /api/documents/search
 * 類似度検索
 */
router.post(
  '/search',
  validateBody(SearchDocumentsSchema),
  asyncHandler(documentsController.searchDocuments)
);

/**
 * GET /api/collections
 * コレクション一覧を取得
 */
router.get(
  '/collections',
  asyncHandler(documentsController.getCollections)
);

export default router;
