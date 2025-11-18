import dotenv from 'dotenv';
import { OpenAIEmbeddings } from '../embeddings';
import { PGVectorStore } from '../vectorstores';
import { RecursiveCharacterTextSplitter } from '../splitters';
import { Document, DocumentChunk } from '../types';

dotenv.config();

/**
 * シードデータ
 */
const sampleDocuments: Document[] = [
  {
    content: `
TypeScriptは、Microsoftによって開発されたプログラミング言語です。
JavaScriptのスーパーセットであり、静的型付けを追加することで、
大規模なアプリケーション開発をより安全に行うことができます。
型システムにより、開発時にバグを早期に発見でき、IDEのサポートも充実しています。
    `.trim(),
    metadata: {
      source: 'seed-data',
      sourceType: 'text',
      collection: 'programming-languages',
      title: 'TypeScript入門',
    },
  },
  {
    content: `
Reactは、Facebookによって開発されたJavaScriptライブラリです。
ユーザーインターフェースを構築するために使用され、
コンポーネントベースのアーキテクチャを採用しています。
仮想DOMを使用することで、高速なレンダリングを実現しています。
    `.trim(),
    metadata: {
      source: 'seed-data',
      sourceType: 'text',
      collection: 'web-frameworks',
      title: 'React基礎',
    },
  },
  {
    content: `
ベクトルデータベースは、機械学習の埋め込みベクトルを効率的に保存・検索するためのデータベースです。
類似度検索により、セマンティックな意味が近いデータを高速に取得できます。
RAG（Retrieval-Augmented Generation）システムの構築に不可欠な技術です。
PGVector、Qdrant、Pinecone、Weaviateなどが代表的な実装です。
    `.trim(),
    metadata: {
      source: 'seed-data',
      sourceType: 'text',
      collection: 'databases',
      title: 'ベクトルデータベース概要',
    },
  },
  {
    content: `
自然言語処理（NLP）は、人間の言語をコンピュータで処理する技術です。
テキスト分類、感情分析、機械翻訳、質問応答システムなど、様々な応用があります。
最近では、Transformerアーキテクチャに基づく大規模言語モデル（LLM）が
目覚ましい進化を遂げており、ChatGPTやGPT-4などが注目を集めています。
    `.trim(),
    metadata: {
      source: 'seed-data',
      sourceType: 'text',
      collection: 'ai-ml',
      title: '自然言語処理の基礎',
    },
  },
  {
    content: `
Node.jsは、Chrome V8 JavaScriptエンジンで動作するJavaScript実行環境です。
サーバーサイドでJavaScriptを実行できるため、フロントエンドとバックエンドで
同じ言語を使用できるのが大きな利点です。
非同期I/Oとイベント駆動アーキテクチャにより、高いスループットを実現しています。
    `.trim(),
    metadata: {
      source: 'seed-data',
      sourceType: 'text',
      collection: 'backend-technologies',
      title: 'Node.js概要',
    },
  },
  {
    content: `
RAG（Retrieval-Augmented Generation）は、大規模言語モデルに外部知識を組み込む技術です。
ベクトルデータベースから関連情報を検索し、それをプロンプトに含めることで、
モデルの出力精度を向上させます。ハルシネーション（幻覚）の削減にも効果的です。
企業の内部文書や専門知識を活用したAIアシスタント構築に適しています。
    `.trim(),
    metadata: {
      source: 'seed-data',
      sourceType: 'text',
      collection: 'ai-ml',
      title: 'RAGアーキテクチャ',
    },
  },
];

/**
 * シードデータ投入
 */
async function seed() {
  console.log('=== シードデータ投入開始 ===\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEYが設定されていません');
  }

  const embeddingClient = new OpenAIEmbeddings(
    apiKey,
    process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
  );

  const vectorStore = new PGVectorStore(
    {
      host: process.env.PGVECTOR_HOST || 'localhost',
      port: parseInt(process.env.PGVECTOR_PORT || '5432', 10),
      database: process.env.PGVECTOR_DATABASE || 'vector_db',
      user: process.env.PGVECTOR_USER || 'postgres',
      password: process.env.PGVECTOR_PASSWORD || '',
      tableName: 'documents',
    },
    embeddingClient,
    parseInt(process.env.EMBEDDING_DIMENSION || '1536', 10)
  );

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: parseInt(process.env.CHUNK_SIZE || '500', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '100', 10),
  });

  try {
    console.log(`${sampleDocuments.length}件のサンプルドキュメントを処理します...\n`);

    const chunks: DocumentChunk[] = await textSplitter.splitDocuments(sampleDocuments);
    console.log(`✓ ${chunks.length}個のチャンクに分割しました`);

    await vectorStore.addDocuments(chunks);
    console.log('✓ ベクトルストアへの保存が完了しました\n');

    const collections = await vectorStore.getCollections();
    console.log('投入されたコレクション:');
    collections.forEach(col => console.log(`  - ${col}`));

    console.log('\n=== シードデータ投入完了 ===');
  } catch (error) {
    console.error('\n✗ シードデータ投入失敗:', error);
    process.exit(1);
  } finally {
    textSplitter.free();
    await vectorStore.close();
  }
}

seed();
