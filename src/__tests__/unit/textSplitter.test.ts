import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RecursiveCharacterTextSplitter } from '../../splitters/textSplitter';
import { Document } from '../../types';

describe('RecursiveCharacterTextSplitter', () => {
  let splitter: RecursiveCharacterTextSplitter;

  beforeEach(() => {
    splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 100,
      chunkOverlap: 20,
    });
  });

  afterEach(() => {
    splitter.free();
  });

  it('should split text into chunks', async () => {
    const document: Document = {
      content: 'This is a test document. '.repeat(20),
      metadata: {
        source: 'test',
        sourceType: 'text',
      },
    };

    const chunks = await splitter.splitDocuments([document]);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].content).toBeTruthy();
    expect(chunks[0].metadata.source).toBe('test');
  });

  it('should preserve metadata in chunks', async () => {
    const document: Document = {
      content: 'Test content',
      metadata: {
        source: 'test-file.txt',
        sourceType: 'text',
        customField: 'custom value',
      },
    };

    const chunks = await splitter.splitDocuments([document]);

    expect(chunks[0].metadata.source).toBe('test-file.txt');
    expect(chunks[0].metadata.customField).toBe('custom value');
  });

  it('should handle empty document', async () => {
    const document: Document = {
      content: '',
      metadata: {
        source: 'empty',
        sourceType: 'text',
      },
    };

    const chunks = await splitter.splitDocuments([document]);

    expect(chunks.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle multiple documents', async () => {
    const documents: Document[] = [
      {
        content: 'First document content',
        metadata: { source: 'doc1', sourceType: 'text' },
      },
      {
        content: 'Second document content',
        metadata: { source: 'doc2', sourceType: 'text' },
      },
    ];

    const chunks = await splitter.splitDocuments(documents);

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const sources = chunks.map(c => c.metadata.source);
    expect(sources).toContain('doc1');
    expect(sources).toContain('doc2');
  });
});
