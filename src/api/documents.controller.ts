import { Request, Response } from 'express';
import { IngestPipeline } from '../pipelines';
import { RecursiveCharacterTextSplitter } from '../splitters';
import { OpenAIEmbeddings } from '../embeddings';
import { PGVectorStore } from '../vectorstores';
import { AppError, SuccessResponse } from '../middleware/errorHandler';
import {
  IngestDocumentInput,
  SearchDocumentsInput,
  ListDocumentsInput,
} from '../schemas/document.schema';

/**
 * ベクトルストアのシングルトンインスタンス
 */
let vectorStoreInstance: PGVectorStore | null = null;

const getVectorStore = (): PGVectorStore => {
  if (!vectorStoreInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AppError('OPENAI_API_KEYが設定されていません', 500, 'CONFIG_ERROR');
    }

    const embeddingClient = new OpenAIEmbeddings(
      apiKey,
      process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
    );

    vectorStoreInstance = new PGVectorStore(
      {
        host: process.env.PGVECTOR_HOST || 'localhost',
        port: parseInt(process.env.PGVECTOR_PORT || '5432', 10),
        database: process.env.PGVECTOR_DATABASE || 'vector_db',
        user: process.env.PGVECTOR_USER || 'postgres',
        password: process.env.PGVECTOR_PASSWORD || '',
        tableName: 'documents',
      },
      embeddingClient,
      parseInt(process.env.EMBEDDING_DIMENSION || '1536', 10)
    );
  }
  return vectorStoreInstance;
};

/**
 * ドキュメントをインジェスト
 */
export const ingestDocument = async (req: Request, res: Response) => {
  const input = req.body as IngestDocumentInput;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError('OPENAI_API_KEYが設定されていません', 500, 'CONFIG_ERROR');
  }

  const embeddingClient = new OpenAIEmbeddings(
    apiKey,
    process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
  );

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: parseInt(process.env.CHUNK_SIZE || '1000', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200', 10),
  });

  const vectorStore = getVectorStore();

  const pipeline = new IngestPipeline(textSplitter, vectorStore);

  await pipeline.run({
    sourceType: input.sourceType,
    collection: input.collection,
    sourcePath: input.sourcePath,
    sourceUrl: input.sourceUrl,
  });

  textSplitter.free();

  const response: SuccessResponse = {
    success: true,
    data: {
      message: 'ドキュメントのインジェストが完了しました',
      collection: input.collection,
    },
  };

  res.status(201).json(response);
};

/**
 * ドキュメント一覧を取得
 */
export const listDocuments = async (req: Request, res: Response) => {
  const { collection, limit, offset } = req.query as any as ListDocumentsInput;

  const vectorStore = getVectorStore();

  const { documents, total } = await vectorStore.listDocuments({
    collection,
    limit,
    offset,
  });

  const response: SuccessResponse = {
    success: true,
    data: documents,
    meta: {
      total,
      count: documents.length,
      page: Math.floor(offset / limit) + 1,
    },
  };

  res.json(response);
};

/**
 * IDでドキュメントを取得
 */
export const getDocumentById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const vectorStore = getVectorStore();
  const document = await vectorStore.getDocumentById(id);

  if (!document) {
    throw new AppError('ドキュメントが見つかりません', 404, 'NOT_FOUND');
  }

  const response: SuccessResponse = {
    success: true,
    data: document,
  };

  res.json(response);
};

/**
 * ドキュメントを削除
 */
export const deleteDocument = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const vectorStore = getVectorStore();
  const deleted = await vectorStore.deleteDocument(id);

  if (!deleted) {
    throw new AppError('ドキュメントが見つかりません', 404, 'NOT_FOUND');
  }

  const response: SuccessResponse = {
    success: true,
    data: {
      message: 'ドキュメントを削除しました',
      id,
    },
  };

  res.json(response);
};

/**
 * 類似度検索
 */
export const searchDocuments = async (req: Request, res: Response) => {
  const { query, collection, topK } = req.body as SearchDocumentsInput;

  const vectorStore = getVectorStore();
  const results = await vectorStore.similaritySearch(query, topK, collection);

  const response: SuccessResponse = {
    success: true,
    data: results,
    meta: {
      count: results.length,
    },
  };

  res.json(response);
};

/**
 * コレクション一覧を取得
 */
export const getCollections = async (req: Request, res: Response) => {
  const vectorStore = getVectorStore();
  const collections = await vectorStore.getCollections();

  const response: SuccessResponse = {
    success: true,
    data: collections,
    meta: {
      count: collections.length,
    },
  };

  res.json(response);
};
