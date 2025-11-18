import { encoding_for_model } from 'tiktoken';
import { ITextSplitter, Document, DocumentChunk, SplitterOptions } from '../types';

/**
 * テキストをトークンベースで分割するスプリッター
 */
export class RecursiveCharacterTextSplitter implements ITextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;
  private encoding: any;

  constructor(options: SplitterOptions) {
    this.chunkSize = options.chunkSize;
    this.chunkOverlap = options.chunkOverlap;
    // OpenAI embeddings用のエンコーダー
    this.encoding = encoding_for_model('text-embedding-3-small');
  }

  /**
   * 文書を分割してチャンクを生成
   */
  async splitDocuments(documents: Document[]): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];

    for (const doc of documents) {
      const docChunks = await this.splitText(doc.content, doc.metadata);
      chunks.push(...docChunks);
    }

    return chunks;
  }

  /**
   * テキストを指定サイズのチャンクに分割
   */
  private async splitText(text: string, metadata: any): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];

    // テキストをトークン化
    const tokens = this.encoding.encode(text);

    let startIdx = 0;
    let chunkIndex = 0;

    while (startIdx < tokens.length) {
      // チャンクの終了位置を計算
      const endIdx = Math.min(startIdx + this.chunkSize, tokens.length);

      // チャンクのトークンを抽出
      const chunkTokens = tokens.slice(startIdx, endIdx);

      // トークンをテキストにデコード
      const chunkText = this.encoding.decode(chunkTokens);

      chunks.push({
        content: chunkText,
        metadata: {
          ...metadata,
          chunkIndex,
          startIndex: startIdx,
          endIndex: endIdx,
        },
      });

      // 次のチャンクの開始位置を計算（オーバーラップを考慮）
      startIdx += this.chunkSize - this.chunkOverlap;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * リソースのクリーンアップ
   */
  free(): void {
    if (this.encoding) {
      this.encoding.free();
    }
  }
}
