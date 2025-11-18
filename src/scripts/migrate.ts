import dotenv from 'dotenv';
import { OpenAIEmbeddings } from '../embeddings';
import { PGVectorStore } from '../vectorstores';

dotenv.config();

/**
 * データベースマイグレーションスクリプト
 */
async function migrate() {
  console.log('=== データベースマイグレーション開始 ===\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEYが設定されていません');
  }

  const embeddingClient = new OpenAIEmbeddings(
    apiKey,
    process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
  );

  const vectorStore = new PGVectorStore(
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

  try {
    await vectorStore.initialize();
    console.log('\n✓ マイグレーション完了');
  } catch (error) {
    console.error('\n✗ マイグレーション失敗:', error);
    process.exit(1);
  } finally {
    await vectorStore.close();
  }
}

migrate();
