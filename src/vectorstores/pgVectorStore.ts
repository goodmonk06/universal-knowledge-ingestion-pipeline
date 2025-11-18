import { Pool, PoolClient } from 'pg';
import { IVectorStore, DocumentChunk, VectorStoreConfig, IEmbeddingClient } from '../types';

/**
 * PGVectorを使用したベクトルストア
 */
export class PGVectorStore implements IVectorStore {
  private pool: Pool;
  private tableName: string;
  private embeddingClient: IEmbeddingClient;
  private dimension: number;

  constructor(
    config: VectorStoreConfig,
    embeddingClient: IEmbeddingClient,
    dimension: number = 1536
  ) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });
    this.tableName = config.tableName || 'documents';
    this.embeddingClient = embeddingClient;
    this.dimension = dimension;
  }

  /**
   * ベクトルストアの初期化（テーブル作成）
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // pgvector拡張を有効化
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');

      // テーブル作成
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id SERIAL PRIMARY KEY,
          content TEXT NOT NULL,
          metadata JSONB,
          embedding vector(${this.dimension}),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ベクトル検索用のインデックス作成
      await client.query(`
        CREATE INDEX IF NOT EXISTS ${this.tableName}_embedding_idx
        ON ${this.tableName}
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);

      console.log(`テーブル '${this.tableName}' の初期化が完了しました`);
    } catch (error) {
      throw new Error(`ベクトルストアの初期化に失敗しました: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * ドキュメントチャンクをベクトルストアに追加
   */
  async addDocuments(chunks: DocumentChunk[]): Promise<void> {
    const client = await this.pool.connect();

    try {
      // 埋め込みがない場合は生成
      const textsToEmbed = chunks.map(chunk => chunk.content);
      const embeddings = await this.embeddingClient.embedDocuments(textsToEmbed);

      // トランザクション開始
      await client.query('BEGIN');

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        await client.query(
          `INSERT INTO ${this.tableName} (content, metadata, embedding) VALUES ($1, $2, $3)`,
          [chunk.content, JSON.stringify(chunk.metadata), JSON.stringify(embedding)]
        );
      }

      await client.query('COMMIT');
      console.log(`${chunks.length}件のドキュメントを追加しました`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`ドキュメントの追加に失敗しました: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * 類似度検索
   */
  async similaritySearch(query: string, k: number = 5): Promise<DocumentChunk[]> {
    const client = await this.pool.connect();

    try {
      // クエリの埋め込みを生成
      const queryEmbedding = await this.embeddingClient.embedQuery(query);

      // コサイン類似度で検索
      const result = await client.query(
        `
        SELECT content, metadata,
               1 - (embedding <=> $1::vector) AS similarity
        FROM ${this.tableName}
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        `,
        [JSON.stringify(queryEmbedding), k]
      );

      return result.rows.map(row => ({
        content: row.content,
        metadata: row.metadata,
        embedding: undefined, // 検索結果には埋め込みを含めない
      }));
    } catch (error) {
      throw new Error(`類似度検索に失敗しました: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * コネクションプールを閉じる
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
