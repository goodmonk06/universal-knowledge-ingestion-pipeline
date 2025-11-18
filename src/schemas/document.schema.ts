import { z } from 'zod';

/**
 * ドキュメントインジェストのリクエストスキーマ
 */
export const IngestDocumentSchema = z.object({
  sourceType: z.enum(['pdf', 'text', 'web']),
  collection: z.string().min(1, 'コレクション名は必須です'),
  sourcePath: z.string().optional(),
  sourceUrl: z.string().url('有効なURLを指定してください').optional(),
  metadata: z.record(z.any()).optional(),
}).refine(
  (data) => {
    if (data.sourceType === 'web') {
      return !!data.sourceUrl;
    }
    return !!data.sourcePath;
  },
  {
    message: 'webの場合はsourceUrlが必須、それ以外はsourcePathが必須です',
  }
);

/**
 * 検索リクエストのスキーマ
 */
export const SearchDocumentsSchema = z.object({
  query: z.string().min(1, '検索クエリは必須です'),
  collection: z.string().optional(),
  topK: z.number().int().positive().default(5),
});

/**
 * ドキュメント一覧取得のクエリパラメータ
 */
export const ListDocumentsSchema = z.object({
  collection: z.string().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

/**
 * ドキュメントID検証
 */
export const DocumentIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'IDは数値である必要があります').transform(Number),
});

export type IngestDocumentInput = z.infer<typeof IngestDocumentSchema>;
export type SearchDocumentsInput = z.infer<typeof SearchDocumentsSchema>;
export type ListDocumentsInput = z.infer<typeof ListDocumentsSchema>;
export type DocumentIdInput = z.infer<typeof DocumentIdSchema>;
