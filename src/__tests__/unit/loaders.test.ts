import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TextLoader } from '../../loaders/textLoader';
import * as fs from 'fs';
import * as path from 'path';

describe('Loaders', () => {
  const testDir = path.join(__dirname, '../../../test-data');
  const testFilePath = path.join(testDir, 'test.txt');

  beforeAll(() => {
    // テスト用ディレクトリとファイルを作成
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    fs.writeFileSync(testFilePath, 'This is test content for the loader.');
  });

  afterAll(() => {
    // テストファイルをクリーンアップ
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  describe('TextLoader', () => {
    it('should load text file content', async () => {
      const loader = new TextLoader(testFilePath);
      const documents = await loader.load();

      expect(documents).toHaveLength(1);
      expect(documents[0].content).toBe('This is test content for the loader.');
      expect(documents[0].metadata.source).toBe(testFilePath);
      expect(documents[0].metadata.sourceType).toBe('text');
    });

    it('should throw error for non-existent file', async () => {
      const loader = new TextLoader('/path/to/nonexistent.txt');

      await expect(loader.load()).rejects.toThrow();
    });

    it('should handle empty file', async () => {
      const emptyFilePath = path.join(testDir, 'empty.txt');
      fs.writeFileSync(emptyFilePath, '');

      const loader = new TextLoader(emptyFilePath);
      const documents = await loader.load();

      expect(documents).toHaveLength(1);
      expect(documents[0].content).toBe('');

      fs.unlinkSync(emptyFilePath);
    });
  });
});
