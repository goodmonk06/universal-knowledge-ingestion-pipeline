import { ICacheAdapter } from '../types';

/**
 * In-memory cache implementation (production would use Redis)
 */
export class InMemoryCache implements ICacheAdapter {
  private cache: Map<string, { value: any; expiresAt?: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;

    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Destroy cache and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

/**
 * Global cache instance
 */
export const cache = new InMemoryCache();

/**
 * Cache key generators
 */
export const CacheKeys = {
  embedding: (text: string) => `embedding:${Buffer.from(text).toString('base64').substring(0, 32)}`,
  search: (query: string, collection?: string, topK?: number) =>
    `search:${query}:${collection || 'all'}:${topK || 5}`,
  document: (id: number) => `document:${id}`,
  collection: (name: string) => `collection:${name}`,
};
