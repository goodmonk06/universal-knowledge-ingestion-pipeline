#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { IngestPipeline } from './pipelines';
import { RecursiveCharacterTextSplitter } from './splitters';
import { OpenAIEmbeddings } from './embeddings';
import { PGVectorStore } from './vectorstores';
import { PipelineConfig } from './types';

// 環境変数を読み込み
dotenv.config();

/**
 * CLIプログラム
 */
const program = new Command();

program
  .name('ingest')
  .description('汎用的な知識インジェストパイプライン')
  .version('1.0.0');

program
  .command('run')
  .description('ドキュメントをベクトルストアに取り込む')
  .requiredOption('-s, --source <type>', 'ソースタイプ (pdf, text, web)')
  .requiredOption('-c, --collection <name>', 'コレクション名')
  .option('-p, --path <path>', 'ファイルパス (pdf, text用)')
  .option('-u, --url <url>', 'URL (web用)')
  .action(async (options) => {
    try {
      // 環境変数の検証
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEYが設定されていません');
      }

      // 設定の取得
      const config: PipelineConfig = {
        sourceType: options.source,
        collection: options.collection,
        sourcePath: options.path,
        sourceUrl: options.url,
      };

      // コンポーネントの初期化
      const embeddingClient = new OpenAIEmbeddings(
        apiKey,
        process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
      );

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: parseInt(process.env.CHUNK_SIZE || '1000', 10),
        chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200', 10),
      });

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

      // パイプライン実行
      const pipeline = new IngestPipeline(textSplitter, vectorStore);
      await pipeline.run(config);

      // クリーンアップ
      await vectorStore.close();
      textSplitter.free();

      process.exit(0);
    } catch (error) {
      console.error('エラー:', error);
      process.exit(1);
    }
  });

program
  .command('search')
  .description('ベクトルストアから類似ドキュメントを検索')
  .requiredOption('-q, --query <text>', '検索クエリ')
  .option('-k, --top-k <number>', '取得する件数', '5')
  .action(async (options) => {
    try {
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

      console.log(`\n検索クエリ: "${options.query}"\n`);

      const results = await vectorStore.similaritySearch(
        options.query,
        parseInt(options.topK, 10)
      );

      console.log(`=== 検索結果 (${results.length}件) ===\n`);

      results.forEach((result, index) => {
        console.log(`[${index + 1}] (コレクション: ${result.metadata.collection || 'N/A'})`);
        console.log(`ソース: ${result.metadata.source}`);
        console.log(`内容: ${result.content.substring(0, 200)}...`);
        console.log('---\n');
      });

      await vectorStore.close();
      process.exit(0);
    } catch (error) {
      console.error('エラー:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
