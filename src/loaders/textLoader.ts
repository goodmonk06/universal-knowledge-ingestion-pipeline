import * as fs from 'fs';
import { ILoader, Document, DocumentMetadata } from '../types';

/**
 * プレーンテキストファイルを読み込むローダー
 */
export class TextLoader implements ILoader {
  private filePath: string;
  private encoding: BufferEncoding;

  constructor(filePath: string, encoding: BufferEncoding = 'utf-8') {
    this.filePath = filePath;
    this.encoding = encoding;
  }

  async load(): Promise<Document[]> {
    try {
      const content = fs.readFileSync(this.filePath, this.encoding);

      const metadata: DocumentMetadata = {
        source: this.filePath,
        sourceType: 'text',
      };

      return [{
        content,
        metadata,
      }];
    } catch (error) {
      throw new Error(`テキストファイルの読み込みに失敗しました: ${error}`);
    }
  }
}
