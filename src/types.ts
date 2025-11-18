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

/**
 * IngestionJobのステータス
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * IngestionJob - 長時間実行されるインジェスト操作の追跡
 */
export interface IngestionJob {
  id: string;
  status: JobStatus;
  sourceType: 'pdf' | 'text' | 'web' | 'batch';
  sourcePath?: string;
  sourceUrl?: string;
  collection: string;
  progress: {
    total: number;
    processed: number;
    failed: number;
  };
  result?: {
    documentsCreated: number;
    chunksCreated: number;
    errors: string[];
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * DocumentVersion - ドキュメントのバージョン履歴
 */
export interface DocumentVersion {
  id: number;
  documentId: number;
  version: number;
  content: string;
  metadata: DocumentMetadata;
  createdAt: Date;
  createdBy?: string;
}

/**
 * Tag - ドキュメントとコレクションのタグ
 */
export interface Tag {
  id: number;
  name: string;
  category?: string;
  color?: string;
  description?: string;
  createdAt: Date;
}

/**
 * Webhook - イベント通知の設定
 */
export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  secret?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  lastTriggeredAt?: Date;
}

/**
 * Webhook イベントタイプ
 */
export enum WebhookEvent {
  DOCUMENT_INGESTED = 'document.ingested',
  DOCUMENT_UPDATED = 'document.updated',
  DOCUMENT_DELETED = 'document.deleted',
  JOB_STARTED = 'job.started',
  JOB_COMPLETED = 'job.completed',
  JOB_FAILED = 'job.failed',
  SEARCH_PERFORMED = 'search.performed',
}

/**
 * APIKey - マルチテナントとアクセス制御
 */
export interface APIKey {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  collections?: string[];
  rateLimit?: number;
  active: boolean;
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}

/**
 * ProcessingPipeline - カスタマイズ可能な処理フロー
 */
export interface ProcessingPipeline {
  id: string;
  name: string;
  description?: string;
  steps: PipelineStep[];
  active: boolean;
  createdAt: Date;
}

/**
 * PipelineStep - パイプライン内の個別ステップ
 */
export interface PipelineStep {
  id: string;
  type: 'load' | 'transform' | 'split' | 'embed' | 'store' | 'custom';
  config: Record<string, any>;
  order: number;
}

/**
 * SearchQuery - 検索クエリのログ
 */
export interface SearchQuery {
  id: string;
  query: string;
  collection?: string;
  filters?: Record<string, any>;
  topK: number;
  results: number;
  latencyMs: number;
  apiKey?: string;
  createdAt: Date;
}

/**
 * DomainEvent - システム内のイベント
 */
export interface DomainEvent<T = any> {
  id: string;
  type: string;
  payload: T;
  metadata: {
    timestamp: Date;
    source: string;
    correlationId?: string;
  };
}

/**
 * Notification Adapter インターフェース
 */
export interface INotificationAdapter {
  send(notification: Notification): Promise<void>;
}

/**
 * Notification
 */
export interface Notification {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Metrics Adapter インターフェース
 */
export interface IMetricsAdapter {
  recordCounter(name: string, value?: number, labels?: Record<string, string>): void;
  recordGauge(name: string, value: number, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
}

/**
 * Logger インターフェース
 */
export interface ILogger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, error?: Error, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

/**
 * Cache Adapter インターフェース
 */
export interface ICacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
