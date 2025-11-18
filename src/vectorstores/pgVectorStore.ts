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
  async similaritySearch(query: string, k: number = 5, collection?: string): Promise<DocumentChunk[]> {
    const client = await this.pool.connect();

    try {
      // クエリの埋め込みを生成
      const queryEmbedding = await this.embeddingClient.embedQuery(query);

      // コレクションフィルタを追加
      let sql = `
        SELECT id, content, metadata,
               1 - (embedding <=> $1::vector) AS similarity
        FROM ${this.tableName}
      `;
      const params: any[] = [JSON.stringify(queryEmbedding), k];

      if (collection) {
        sql += ` WHERE metadata->>'collection' = $3`;
        params.push(collection);
      }

      sql += `
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `;

      const result = await client.query(sql, params);

      return result.rows.map(row => ({
        content: row.content,
        metadata: { ...row.metadata, id: row.id },
        embedding: undefined,
      }));
    } catch (error) {
      throw new Error(`類似度検索に失敗しました: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * ドキュメント一覧を取得
   */
  async listDocuments(options: {
    collection?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ documents: DocumentChunk[]; total: number }> {
    const client = await this.pool.connect();
    const { collection, limit = 50, offset = 0 } = options;

    try {
      let whereClauses: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      if (collection) {
        whereClauses.push(`metadata->>'collection' = $${paramIndex}`);
        params.push(collection);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // 総数を取得
      const countResult = await client.query(
        `SELECT COUNT(*) FROM ${this.tableName} ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // ドキュメントを取得
      const result = await client.query(
        `
        SELECT id, content, metadata, created_at
        FROM ${this.tableName}
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `,
        [...params, limit, offset]
      );

      const documents = result.rows.map(row => ({
        content: row.content,
        metadata: {
          ...row.metadata,
          id: row.id,
          created_at: row.created_at,
        },
        embedding: undefined,
      }));

      return { documents, total };
    } catch (error) {
      throw new Error(`ドキュメント一覧の取得に失敗しました: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * IDでドキュメントを取得
   */
  async getDocumentById(id: number): Promise<DocumentChunk | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        SELECT id, content, metadata, created_at
        FROM ${this.tableName}
        WHERE id = $1
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        content: row.content,
        metadata: {
          ...row.metadata,
          id: row.id,
          created_at: row.created_at,
        },
        embedding: undefined,
      };
    } catch (error) {
      throw new Error(`ドキュメントの取得に失敗しました: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * ドキュメントを削除
   */
  async deleteDocument(id: number): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `DELETE FROM ${this.tableName} WHERE id = $1`,
        [id]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new Error(`ドキュメントの削除に失敗しました: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * コレクション一覧を取得
   */
  async getCollections(): Promise<string[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        SELECT DISTINCT metadata->>'collection' as collection
        FROM ${this.tableName}
        WHERE metadata->>'collection' IS NOT NULL
        ORDER BY collection
        `
      );

      return result.rows.map(row => row.collection);
    } catch (error) {
      throw new Error(`コレクション一覧の取得に失敗しました: ${error}`);
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
