import { JSDOM } from 'jsdom';
import { ILoader, Document, DocumentMetadata } from '../types';

/**
 * Webページからテキストをスクレイピングするローダー
 */
export class WebLoader implements ILoader {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async load(): Promise<Document[]> {
    try {
      const response = await fetch(this.url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // タイトルを取得
      const title = document.querySelector('title')?.textContent || this.url;

      // 主要なコンテンツを抽出（script、styleタグを除外）
      const scripts = document.querySelectorAll('script, style, nav, footer');
      scripts.forEach(script => script.remove());

      // body内のテキストを取得
      const content = document.body?.textContent || '';

      // 余分な空白を削除
      const cleanContent = content
        .replace(/\s+/g, ' ')
        .trim();

      const metadata: DocumentMetadata = {
        source: this.url,
        sourceType: 'web',
        url: this.url,
        title,
      };

      return [{
        content: cleanContent,
        metadata,
      }];
    } catch (error) {
      throw new Error(`Webページの読み込みに失敗しました: ${error}`);
    }
  }
}
