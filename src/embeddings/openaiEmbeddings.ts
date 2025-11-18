import OpenAI from 'openai';
import { IEmbeddingClient } from '../types';

/**
 * OpenAI Embeddings APIクライアント
 */
export class OpenAIEmbeddings implements IEmbeddingClient {
  private client: OpenAI;
  private model: string;
  private batchSize: number;

  constructor(apiKey: string, model: string = 'text-embedding-3-small', batchSize: number = 100) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.batchSize = batchSize;
  }

  /**
   * 複数のテキストを埋め込みベクトルに変換
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // バッチ処理でAPIコールを最適化
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);

      try {
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
        });

        const batchEmbeddings = response.data.map(item => item.embedding);
        embeddings.push(...batchEmbeddings);
      } catch (error) {
        throw new Error(`埋め込みの生成に失敗しました: ${error}`);
      }
    }

    return embeddings;
  }

  /**
   * 単一のクエリテキストを埋め込みベクトルに変換
   */
  async embedQuery(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      throw new Error(`クエリの埋め込み生成に失敗しました: ${error}`);
    }
  }
}
