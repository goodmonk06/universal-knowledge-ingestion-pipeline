# universal-knowledge-ingestion-pipeline

PDF・Webページ・テキストファイルからコンテンツを抽出し、分割・埋め込みしてベクトルDBに投入する汎用インジェストパイプライン。

## Tech Stack

- **Node.js** + **TypeScript**
- **OpenAI Embeddings** (text-embedding-3-small)
- **PGVector** (PostgreSQL拡張)
- **pdf-parse**, **jsdom**, **tiktoken**

## Features

- 📄 **複数ソース対応**: PDF、テキストファイル、Webページから読み込み可能
- 🔄 **ETLパイプライン**: 読み込み → 分割 → 埋め込み → 保存のフロー
- 🎯 **抽象化レイヤー**: 埋め込みプロバイダとベクトルストアを差し替え可能
- 🔍 **類似度検索**: ベクトルDBからコサイン類似度で検索
- 🛠️ **CLI対応**: コマンドラインから簡単に実行可能

## Project Structure

```
src/
├── loaders/           # ドキュメントローダー
│   ├── pdfLoader.ts   # PDFファイル読み込み
│   ├── textLoader.ts  # テキストファイル読み込み
│   └── webLoader.ts   # Webページスクレイピング
├── splitters/         # テキスト分割
│   └── textSplitter.ts # トークンベースのチャンク分割
├── embeddings/        # 埋め込み生成
│   └── openaiEmbeddings.ts # OpenAI Embeddings API
├── vectorstores/      # ベクトルストア
│   └── pgVectorStore.ts # PGVector実装
├── pipelines/         # パイプライン
│   └── ingestPipeline.ts # インジェスト処理
├── types.ts           # 型定義
└── cli.ts             # CLIエントリポイント
```

## Prerequisites

### 1. PostgreSQL + PGVector

PGVector拡張を有効にしたPostgreSQLが必要です。

#### Dockerで起動する場合:

```bash
docker run -d \
  --name pgvector \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=vector_db \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

#### 既存のPostgreSQLにPGVectorをインストール:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. OpenAI API Key

OpenAI APIキーを取得してください: https://platform.openai.com/api-keys

## Getting Started

### 1. インストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

`.env` を編集して必要な情報を設定:

```env
# OpenAI API Key (必須)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

# PGVector設定 (必須)
PGVECTOR_HOST=localhost
PGVECTOR_PORT=5432
PGVECTOR_DATABASE=vector_db
PGVECTOR_USER=postgres
PGVECTOR_PASSWORD=your-password

# 埋め込み設定 (オプション)
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536

# テキスト分割設定 (オプション)
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

### 3. ビルド

```bash
npm run build
```

## Usage

### ドキュメントのインジェスト

#### PDFファイルを取り込む

```bash
npx ingest run --source pdf --path ./docs/sample.pdf --collection my-docs
```

#### Webページを取り込む

```bash
npx ingest run --source web --url https://example.com --collection web-docs
```

#### テキストファイルを取り込む

```bash
npx ingest run --source text --path ./data/article.txt --collection articles
```

### 類似度検索

```bash
npx ingest search --query "検索したいテキスト" --top-k 5
```

## Architecture

### データフロー

```
┌─────────────┐
│   Source    │ (PDF / Text / Web)
└──────┬──────┘
       │
       v
┌─────────────┐
│   Loader    │ → Document[]
└──────┬──────┘
       │
       v
┌─────────────┐
│  Splitter   │ → DocumentChunk[]
└──────┬──────┘
       │
       v
┌─────────────┐
│  Embeddings │ → Vectors
└──────┬──────┘
       │
       v
┌─────────────┐
│ VectorStore │ (PGVector)
└─────────────┘
```

### 抽象化レイヤー

すべての主要コンポーネントはインターフェースで抽象化されています:

- `ILoader`: ドキュメント読み込み
- `ITextSplitter`: テキスト分割
- `IEmbeddingClient`: 埋め込み生成
- `IVectorStore`: ベクトルストア操作

これにより、実装を簡単に差し替え可能です。例えば:
- OpenAI → Cohere / HuggingFace Embeddings
- PGVector → Qdrant / Pinecone / Weaviate

## Development

### 開発モードで実行

```bash
npm run dev -- run --source pdf --path ./sample.pdf --collection test
```

### 型チェック

```bash
npx tsc --noEmit
```

## Next Steps

- [ ] Qdrantベクトルストアの実装
- [ ] Notionローダーの追加
- [ ] バッチ処理の最適化
- [ ] メタデータフィルタリング機能
- [ ] テストコードの追加

## License

MIT
