/**
 * Search Cache Layer
 * 
 * In-memory cache with TTL and LRU eviction for search results.
 * Supports automatic expiration and cache invalidation.
 */

import {
  CacheEntry,
  CacheConfig,
  CacheStats,
  UnifiedSearchResponse,
  SearchCategory,
} from './types/searchTypes';

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  maxSize: 500,
  enableStats: true,
};

// ============================================================
// CACHE IMPLEMENTATION
// ============================================================

/**
 * Search cache with TTL and LRU eviction
 */
export class SearchCache {
  private cache: Map<string, CacheEntry<UnifiedSearchResponse>>;
  private config: CacheConfig;
  private stats: CacheStats;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0,
      size: 0,
    };
  }

  /**
   * Generate cache key from search parameters
   */
  private generateKey(
    query: string,
    category?: SearchCategory,
    district?: string
  ): string {
    const normalized = query.toLowerCase().trim();
    const cat = category || 'AUTO';
    const dist = district || 'ALL';
    return `search:${cat}:${dist}:${this.hash(normalized)}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached result if valid
   */
  get(
    query: string,
    category?: SearchCategory,
    district?: string
  ): UnifiedSearchResponse | null {
    const key = this.generateKey(query, category, district);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      this.updateHitRate();
      return null;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    return entry.data;
  }

  /**
   * Set cache entry with TTL
   */
  set(
    query: string,
    response: UnifiedSearchResponse,
    category?: SearchCategory,
    district?: string,
    customTTL?: number
  ): void {
    const key = this.generateKey(query, category, district);
    const ttl = customTTL || this.config.defaultTTL;
    const now = Date.now();

    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<UnifiedSearchResponse> = {
      data: response,
      timestamp: now,
      expiresAt: now + ttl,
      hits: 0,
      lastAccessed: now,
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  invalidate(pattern: string): number {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      count++;
    }

    this.stats.size = this.cache.size;
    return count;
  }

  /**
   * Invalidate by category
   */
  invalidateByCategory(category: SearchCategory): number {
    return this.invalidate(`search:${category}:`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0,
      size: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats, size: this.cache.size };
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists
   */
  has(query: string, category?: SearchCategory, district?: string): boolean {
    const key = this.generateKey(query, category, district);
    return this.cache.has(key);
  }

  /**
   * Update TTL for specific entry
   */
  updateTTL(
    query: string,
    category: SearchCategory,
    ttl: number
  ): boolean {
    const key = this.generateKey(query, category);
    const entry = this.cache.get(key);

    if (entry) {
      entry.expiresAt = Date.now() + ttl;
      return true;
    }

    return false;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// ============================================================
// DEFAULT CACHE INSTANCE
// ============================================================

/**
 * Default cache instance for search results
 */
export const searchCache = new SearchCache();

// ============================================================
// CACHE INVALIDATION HELPERS
// ============================================================

/**
 * Cache invalidation events
 */
export type CacheInvalidationEvent =
  | { type: 'deployment_complete' }
  | { type: 'new_market_data' }
  | { type: 'manual_clear' }
  | { type: 'memory_pressure' }
  | { type: 'category_invalidation'; category: SearchCategory };

/**
 * Handle cache invalidation events
 */
export function handleCacheInvalidation(event: CacheInvalidationEvent): void {
  switch (event.type) {
    case 'deployment_complete':
      // Invalidate deployment cache after successful deploy
      searchCache.invalidateByCategory('DEPLOY');
      break;

    case 'new_market_data':
      // Invalidate market cache when new data available
      searchCache.invalidateByCategory('MARKET');
      break;

    case 'manual_clear':
      searchCache.clear();
      break;

    case 'memory_pressure':
      // Clear oldest entries under memory pressure
      searchCache.invalidateByCategory('AGRI');
      break;

    case 'category_invalidation':
      searchCache.invalidateByCategory(event.category);
      break;
  }
}

// ============================================================
// TTL CONSTANTS
// ============================================================

/** TTL values by category */
export const CACHE_TTL = {
  AGRI: 15 * 60 * 1000, // 15 minutes
  DEPLOY: 5 * 60 * 1000, // 5 minutes - deployment info changes often
  MARKET: 30 * 60 * 1000, // 30 minutes - market prices change less frequently
} as const;

export default searchCache;
