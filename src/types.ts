/**
 * 文書のメタデータ
 */
export interface DocumentMetadata {
  source: string;
  sourceType: 'pdf' | 'text' | 'web' | 'unknown';
  page?: number;
  url?: string;
  title?: string;
  [key: string]: any;
}

/**
 * 読み込んだ文書
 */
export interface Document {
  content: string;
  metadata: DocumentMetadata;
}

/**
 * 分割されたチャンク
 */
export interface DocumentChunk {
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
}

/**
 * ローダーのインターフェース
 */
export interface ILoader {
  load(): Promise<Document[]>;
}

/**
 * テキスト分割器のインターフェース
 */
export interface ITextSplitter {
  splitDocuments(documents: Document[]): Promise<DocumentChunk[]>;
}

/**
 * 埋め込みクライアントのインターフェース
 */
export interface IEmbeddingClient {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

/**
 * ベクトルストアのインターフェース
 */
export interface IVectorStore {
  addDocuments(chunks: DocumentChunk[]): Promise<void>;
  similaritySearch(query: string, k?: number): Promise<DocumentChunk[]>;
  initialize(): Promise<void>;
}

/**
 * テキスト分割のオプション
 */
export interface SplitterOptions {
  chunkSize: number;
  chunkOverlap: number;
}

/**
 * ベクトルストア接続設定
 */
export interface VectorStoreConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  tableName?: string;
}

/**
 * インジェストパイプラインの設定
 */
export interface PipelineConfig {
  collection: string;
  sourceType: 'pdf' | 'text' | 'web';
  sourcePath?: string;
  sourceUrl?: string;
}
