import { describe, it, expect } from 'vitest';
import {
  IngestDocumentSchema,
  SearchDocumentsSchema,
  ListDocumentsSchema,
} from '../../schemas/document.schema';

describe('Document Schemas', () => {
  describe('IngestDocumentSchema', () => {
    it('should validate valid PDF ingest request', () => {
      const validData = {
        sourceType: 'pdf',
        collection: 'test-collection',
        sourcePath: '/path/to/file.pdf',
      };

      const result = IngestDocumentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate valid web ingest request', () => {
      const validData = {
        sourceType: 'web',
        collection: 'web-docs',
        sourceUrl: 'https://example.com',
      };

      const result = IngestDocumentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject web request without URL', () => {
      const invalidData = {
        sourceType: 'web',
        collection: 'web-docs',
        sourcePath: '/some/path',
      };

      const result = IngestDocumentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject PDF request without path', () => {
      const invalidData = {
        sourceType: 'pdf',
        collection: 'test',
        sourceUrl: 'https://example.com',
      };

      const result = IngestDocumentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty collection name', () => {
      const invalidData = {
        sourceType: 'text',
        collection: '',
        sourcePath: '/path/to/file.txt',
      };

      const result = IngestDocumentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL', () => {
      const invalidData = {
        sourceType: 'web',
        collection: 'test',
        sourceUrl: 'not-a-valid-url',
      };

      const result = IngestDocumentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('SearchDocumentsSchema', () => {
    it('should validate valid search request', () => {
      const validData = {
        query: 'test query',
        topK: 10,
      };

      const result = SearchDocumentsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topK).toBe(10);
      }
    });

    it('should use default topK value', () => {
      const validData = {
        query: 'test query',
      };

      const result = SearchDocumentsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topK).toBe(5);
      }
    });

    it('should reject empty query', () => {
      const invalidData = {
        query: '',
      };

      const result = SearchDocumentsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative topK', () => {
      const invalidData = {
        query: 'test',
        topK: -1,
      };

      const result = SearchDocumentsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('ListDocumentsSchema', () => {
    it('should validate with all parameters', () => {
      const validData = {
        collection: 'test',
        limit: 20,
        offset: 10,
      };

      const result = ListDocumentsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const validData = {};

      const result = ListDocumentsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should reject negative offset', () => {
      const invalidData = {
        offset: -5,
      };

      const result = ListDocumentsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
