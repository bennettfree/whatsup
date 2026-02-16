/**
 * Redis Distributed Cache
 * 
 * Replaces in-memory cache for production scalability.
 * Falls back to in-memory if Redis unavailable.
 */

export interface CacheOptions {
  ttlSeconds: number;
  useRedis?: boolean;
}

/**
 * Redis Cache Implementation
 * 
 * NOTE: Requires 'redis' package and Redis server running.
 * For development, falls back to in-memory cache.
 */
export class RedisCache {
  private client: any = null;
  private connected: boolean = false;
  private fallbackCache = new Map<string, { value: any; expiry: number }>();
  private useRedis: boolean;
  
  constructor(useRedis: boolean = false) {
    this.useRedis = useRedis;
  }
  
  /**
   * Connect to Redis server
   */
  async connect(): Promise<void> {
    if (!this.useRedis) {
      console.log('[RedisCache] Redis disabled, using in-memory fallback');
      this.connected = false;
      return;
    }
    
    try {
      // Lazy load redis (don't require it for development)
      const redis = await import('redis').catch(() => null);
      
      if (!redis) {
        console.warn('[RedisCache] Redis package not installed, using in-memory fallback');
        this.connected = false;
        return;
      }
      
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });
      
      this.client.on('error', (err: any) => {
        console.error('[RedisCache] Redis error:', err);
        this.connected = false;
      });
      
      this.client.on('connect', () => {
        console.log('[RedisCache] Connected to Redis');
        this.connected = true;
      });
      
      await this.client.connect();
    } catch (error) {
      console.error('[RedisCache] Failed to connect to Redis:', error);
      console.log('[RedisCache] Falling back to in-memory cache');
      this.connected = false;
    }
  }
  
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Try Redis if connected
    if (this.connected && this.client) {
      try {
        const value = await this.client.get(key);
        if (value) {
          return JSON.parse(value) as T;
        }
        return null;
      } catch (error) {
        console.error('[RedisCache] Get error, falling back to memory:', error);
        this.connected = false;
      }
    }
    
    // Fallback to in-memory
    const cached = this.fallbackCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value as T;
    }
    
    return null;
  }
  
  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    // Try Redis if connected
    if (this.connected && this.client) {
      try {
        await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
        return;
      } catch (error) {
        console.error('[RedisCache] Set error, falling back to memory:', error);
        this.connected = false;
      }
    }
    
    // Fallback to in-memory
    this.fallbackCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
    
    // Clean up expired entries periodically
    if (this.fallbackCache.size > 1000) {
      this.cleanupExpired();
    }
  }
  
  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    if (this.connected && this.client) {
      try {
        return (await this.client.exists(key)) === 1;
      } catch (error) {
        console.error('[RedisCache] Has error:', error);
      }
    }
    
    const cached = this.fallbackCache.get(key);
    return cached !== undefined && cached.expiry > Date.now();
  }
  
  /**
   * Delete key
   */
  async delete(key: string): Promise<void> {
    if (this.connected && this.client) {
      try {
        await this.client.del(key);
      } catch (error) {
        console.error('[RedisCache] Delete error:', error);
      }
    }
    
    this.fallbackCache.delete(key);
  }
  
  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (this.connected && this.client) {
      try {
        await this.client.flushDb();
      } catch (error) {
        console.error('[RedisCache] Clear error:', error);
      }
    }
    
    this.fallbackCache.clear();
  }
  
  /**
   * Get cache stats
   */
  getStats(): {
    type: 'redis' | 'memory';
    connected: boolean;
    entries: number;
  } {
    return {
      type: this.connected ? 'redis' : 'memory',
      connected: this.connected,
      entries: this.fallbackCache.size,
    };
  }
  
  /**
   * Clean up expired entries from in-memory cache
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.fallbackCache.entries()) {
      if (value.expiry <= now) {
        this.fallbackCache.delete(key);
      }
    }
  }
  
  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
}

/**
 * Generate semantic cache key
 */
export function generateSemanticCacheKey(params: {
  query: string;
  location: { latitude: number; longitude: number };
  radiusMiles: number;
  intentType: string;
  timeLabel?: string;
}): string {
  // Round coordinates to ~1km precision
  const roundedLat = Math.round(params.location.latitude * 100) / 100;
  const roundedLng = Math.round(params.location.longitude * 100) / 100;
  
  // Bucket radius
  const radiusBucket = bucketRadius(params.radiusMiles);
  
  // Normalize query
  const normalizedQuery = params.query.toLowerCase().trim();
  
  // Build key
  const parts = [
    'search',
    normalizedQuery,
    `${roundedLat}`,
    `${roundedLng}`,
    `r${radiusBucket}`,
    params.intentType,
    params.timeLabel || 'any',
  ];
  
  return parts.join(':');
}

/**
 * Bucket radius into discrete values for cache key grouping
 */
function bucketRadius(radiusMiles: number): number {
  if (radiusMiles <= 1) return 1;
  if (radiusMiles <= 3) return 3;
  if (radiusMiles <= 5) return 5;
  if (radiusMiles <= 10) return 10;
  if (radiusMiles <= 25) return 25;
  return 50;
}

// Singleton instance
let redisCache: RedisCache | null = null;

/**
 * Get or create Redis cache instance
 */
export async function getRedisCache(): Promise<RedisCache> {
  if (!redisCache) {
    const useRedis = process.env.USE_REDIS_CACHE === 'true';
    redisCache = new RedisCache(useRedis);
    await redisCache.connect();
  }
  
  return redisCache;
}
