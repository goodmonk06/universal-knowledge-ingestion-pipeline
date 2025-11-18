import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';
import { ILoader, Document, DocumentMetadata } from '../types';

/**
 * PDFファイルからテキストを抽出するローダー
 */
export class PDFLoader implements ILoader {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async load(): Promise<Document[]> {
    try {
      const dataBuffer = fs.readFileSync(this.filePath);
      const pdfData = await pdfParse(dataBuffer);

      const metadata: DocumentMetadata = {
        source: this.filePath,
        sourceType: 'pdf',
        title: pdfData.info?.Title || this.filePath,
      };

      // PDFの全テキストを1つのドキュメントとして返す
      // より詳細な実装では、ページごとに分割することも可能
      const documents: Document[] = [{
        content: pdfData.text,
        metadata: {
          ...metadata,
          pages: pdfData.numpages,
        },
      }];

      return documents;
    } catch (error) {
      throw new Error(`PDFの読み込みに失敗しました: ${error}`);
    }
  }
}
