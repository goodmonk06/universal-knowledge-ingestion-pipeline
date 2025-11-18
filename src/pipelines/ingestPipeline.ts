import { ILoader, ITextSplitter, IVectorStore, PipelineConfig } from '../types';
import { PDFLoader, TextLoader, WebLoader } from '../loaders';

/**
 * インジェストパイプライン
 * ドキュメントの読み込み → 分割 → 埋め込み → ベクトルストア保存を実行
 */
export class IngestPipeline {
  private textSplitter: ITextSplitter;
  private vectorStore: IVectorStore;

  constructor(textSplitter: ITextSplitter, vectorStore: IVectorStore) {
    this.textSplitter = textSplitter;
    this.vectorStore = vectorStore;
  }

  /**
   * ソースタイプに応じたローダーを作成
   */
  private createLoader(config: PipelineConfig): ILoader {
    switch (config.sourceType) {
      case 'pdf':
        if (!config.sourcePath) {
          throw new Error('PDF読み込みにはsourcePathが必要です');
        }
        return new PDFLoader(config.sourcePath);

      case 'text':
        if (!config.sourcePath) {
          throw new Error('テキスト読み込みにはsourcePathが必要です');
        }
        return new TextLoader(config.sourcePath);

      case 'web':
        if (!config.sourceUrl) {
          throw new Error('Web読み込みにはsourceUrlが必要です');
        }
        return new WebLoader(config.sourceUrl);

      default:
        throw new Error(`未対応のソースタイプです: ${config.sourceType}`);
    }
  }

  /**
   * インジェストパイプラインを実行
   */
  async run(config: PipelineConfig): Promise<void> {
    try {
      console.log('=== インジェストパイプライン開始 ===');
      console.log(`コレクション: ${config.collection}`);
      console.log(`ソースタイプ: ${config.sourceType}`);

      // 1. ドキュメントの読み込み
      console.log('\n[1/4] ドキュメントを読み込んでいます...');
      const loader = this.createLoader(config);
      const documents = await loader.load();
      console.log(`✓ ${documents.length}件のドキュメントを読み込みました`);

      // 2. テキストの分割
      console.log('\n[2/4] テキストを分割しています...');
      const chunks = await this.textSplitter.splitDocuments(documents);
      console.log(`✓ ${chunks.length}個のチャンクに分割しました`);

      // メタデータにコレクション名を追加
      chunks.forEach(chunk => {
        chunk.metadata.collection = config.collection;
      });

      // 3. ベクトルストアの初期化（必要に応じて）
      console.log('\n[3/4] ベクトルストアを初期化しています...');
      await this.vectorStore.initialize();
      console.log('✓ ベクトルストアの初期化が完了しました');

      // 4. ドキュメントの保存
      console.log('\n[4/4] ドキュメントを保存しています...');
      await this.vectorStore.addDocuments(chunks);
      console.log('✓ ドキュメントの保存が完了しました');

      console.log('\n=== インジェストパイプライン完了 ===');
    } catch (error) {
      console.error('\n❌ エラーが発生しました:', error);
      throw error;
    }
  }
}
