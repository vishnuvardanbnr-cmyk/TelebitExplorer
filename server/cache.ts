interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  set<T>(key: string, data: T, ttlSeconds: number = 10): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  invalidate(keyPattern: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

export const cache = new InMemoryCache();

export const CACHE_KEYS = {
  STATS: 'stats',
  LATEST_BLOCKS: 'latest_blocks',
  LATEST_TXS: 'latest_txs',
  BLOCK: (id: string | number) => `block:${id}`,
  TX: (hash: string) => `tx:${hash}`,
  ADDRESS: (addr: string) => `address:${addr.toLowerCase()}`,
};

export const CACHE_TTL = {
  STATS: 5,
  LATEST_BLOCKS: 3,
  LATEST_TXS: 3,
  BLOCK: 60,
  TX: 60,
  ADDRESS: 10,
};
