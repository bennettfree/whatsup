// Simple in-memory cache for API results
// Reduces unnecessary API calls and improves performance

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  generateKey(params: Record<string, any>): string {
    return JSON.stringify(params);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  clearOld(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}

export const apiCache = new APICache();
