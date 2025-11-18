import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryCache } from '../../lib/cache';

class TestCache extends InMemoryCache {
  // For testing
}

describe('InMemoryCache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should set and get values', async () => {
    await cache.set('key1', 'value1');

    const value = await cache.get<string>('key1');

    expect(value).toBe('value1');
  });

  it('should return null for non-existent keys', async () => {
    const value = await cache.get('nonexistent');

    expect(value).toBeNull();
  });

  it('should delete keys', async () => {
    await cache.set('key1', 'value1');
    await cache.delete('key1');

    const value = await cache.get('key1');

    expect(value).toBeNull();
  });

  it('should clear all keys', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');

    await cache.clear();

    const value1 = await cache.get('key1');
    const value2 = await cache.get('key2');

    expect(value1).toBeNull();
    expect(value2).toBeNull();
  });

  it('should handle TTL expiration', async () => {
    await cache.set('key1', 'value1', 1); // 1 second TTL

    // Should exist immediately
    let value = await cache.get<string>('key1');
    expect(value).toBe('value1');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));

    value = await cache.get<string>('key1');
    expect(value).toBeNull();
  });

  it('should store complex objects', async () => {
    const obj = { name: 'Test', count: 42, nested: { value: true } };

    await cache.set('complex', obj);

    const retrieved = await cache.get<typeof obj>('complex');

    expect(retrieved).toEqual(obj);
  });

  it('should provide cache statistics', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');

    const stats = cache.getStats();

    expect(stats.size).toBe(2);
    expect(stats.keys).toContain('key1');
    expect(stats.keys).toContain('key2');
  });
});
