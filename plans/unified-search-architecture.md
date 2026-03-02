# Krishi AI Unified Search Architecture Design

**Date:** March 2, 2026  
**Status:** Architecture Design Complete  
**Version:** 1.0

---

## 1. Query Classification System

### 1.1 Query Categories

The unified search system classifies queries into three primary categories:

| Category | Code | Description | Priority |
|----------|------|-------------|----------|
| Agriculture | `AGRI` | Crop prices, farming methods, pest/disease, weather | Primary |
| Deployment | `DEPLOY` | Build errors, Vercel issues, API keys, CORS | Primary |
| Market | `MARKET` | Commodity prices, district-wise rates | Primary |

### 1.2 Classification Keywords/Triggers

#### Agriculture Keywords (bn-BD + English)

```typescript
const AGRI_KEYWORDS = {
  // Crops
  crops: ['ধান', 'ভুট্রা', 'গম', 'আলু', 'পেঁয়াজ', 'টমেটো', 'বেগুন', 'মরিচ', 'ডাল', 'তেল'],
  // Farming
  farming: ['চাষ', 'ফসল', 'বীজ', 'চারা', 'রোপণ', 'সেচ', 'সার', 'ধান', 'ফসল'],
  // Pests/Diseases
  pests: ['পোকা', 'রোগ', 'জাব', 'ফোড়া', 'আগাছা', 'disease', 'pest', 'insect'],
  // Weather
  weather: ['বৃষ্টি', 'তাপমাত্রা', 'আবহাওয়া', 'বন্যা', 'খরা', 'weather'],
  // Fertilizers
  fertilizer: ['সার', 'ইউরিয়া', 'টিএসপি', 'ডিএপি', 'পটাশ', 'fertilizer'],
  // General agri terms
  general: ['কৃষি', 'কৃষক', 'মাঠ', 'জমি', 'ফলন', 'উৎপাদন', 'agriculture', 'farmer'],
} as const;
```

#### Deployment Keywords (bn-BD + English)

```typescript
const DEPLOY_KEYWORDS = {
  // Build errors
  build: ['build', 'failed', 'error', 'বিল্ড', 'ত্রুটি', 'npm', 'yarn', 'pnpm'],
  // Vercel
  vercel: ['vercel', 'deployment', 'deploy', 'ডিপ্লয়', 'ভার্সেল'],
  // Environment
  env: ['env', 'environment', 'variable', 'API key', 'পরিবেশ', 'কী'],
  // Errors
  errors: ['cors', '404', '500', '403', 'error', 'ত্রুটি', 'সমস্যা'],
  // Performance
  performance: ['bundle', 'size', 'optimize', 'slow', 'loading', 'পারফরম্যান্স'],
  // Firebase
  firebase: ['firebase', 'auth', 'realtime', 'firestore', 'ফায়ারবেস'],
  // Git
  git: ['git', 'commit', 'push', 'branch', 'merge', 'গিট'],
  // TypeScript
  typescript: ['typescript', 'tsc', 'type error', 'টাইপস্ক্রিপ্ট'],
  // React
  react: ['react', 'component', 'hook', 'state', 'props', 'রিঅ্যাক্ট'],
  // General dev
  dev: ['debug', 'troubleshoot', 'fix', 'সমাধান', 'সমস্যা'],
} as const;
```

#### Market Keywords

```typescript
const MARKET_KEYWORDS = {
  price: ['দাম', 'মূল্য', 'price', 'rate', 'কত', 'টাকা'],
  buy: ['কেনা', 'বিক্রি', 'কিনতে', 'বিক্রি করতে', 'buy', 'sell'],
  market: ['বাজার', 'হাট', 'market', 'মার্কেট'],
  district: ['ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'district'],
  commodities: ['চাল', 'আলু', 'পেঁয়াজ', 'মরিচ', 'ডাল', 'তেল', 'ডিম', 'মাংস'],
} as const;
```

### 1.3 Confidence Scoring Algorithm

```typescript
interface ClassificationResult {
  category: SearchCategory;
  confidence: number; // 0.0 - 1.0
  subCategory?: string;
  detectedKeywords: string[];
}

const classifyQuery = (query: string): ClassificationResult => {
  const normalizedQuery = query.toLowerCase();
  const words = normalizedQuery.split(/\s+/);
  
  // Score each category
  const scores = {
    AGRI: 0,
    DEPLOY: 0,
    MARKET: 0,
  };
  
  const detectedKeywords: string[] = [];
  
  // Check each category's keywords
  for (const [category, keywordGroups] of Object.entries(KEYWORDS)) {
    for (const [, keywords] of Object.entries(keywordGroups)) {
      for (const keyword of keywords) {
        if (normalizedQuery.includes(keyword.toLowerCase())) {
          scores[category as keyof typeof scores] += 1;
          detectedKeywords.push(keyword);
        }
      }
    }
  }
  
  // Normalize scores to confidence
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  if (totalScore === 0) {
    return {
      category: 'AGRI', // Default to AGRI
      confidence: 0.5,
      detectedKeywords: [],
    };
  }
  
  const maxScore = Math.max(...Object.values(scores));
  const confidence = maxScore / totalScore;
  
  // Determine category
  let category: SearchCategory;
  if (maxScore === scores.DEPLOY) category = 'DEPLOY';
  else if (maxScore === scores.MARKET) category = 'MARKET';
  else category = 'AGRI';
  
  return {
    category,
    confidence,
    detectedKeywords: [...new Set(detectedKeywords)],
  };
};
```

---

## 2. Unified Search Service Architecture

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Unified Search Architecture                          │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   User Query    │
                              │  (Text/Voice)   │
                              └────────┬────────┘
                                       │
                                       ▼
                        ┌────────────────────────┐
                        │   Query Classifier     │
                        │  (classifyQuery)        │
                        └────────────┬───────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   Market Handler    │  │   Agri Handler     │  │  Deployment Handler│
│  (Local COMMODITIES)│  │  (Gemini + Search) │  │ (Knowledge Base)   │
└─────────┬───────────┘  └─────────┬───────────┘  └─────────┬───────────┘
          │                       │                         │
          │              ┌────────┴────────┐               │
          │              │ Gemini Service  │               │
          │              │ (Google Search) │               │
          │              └────────┬────────┘               │
          │                       │                        │
          └───────────────────────┼────────────────────────┘
                                  │
                                  ▼
                       ┌──────────────────┐
                       │ Result Merger &  │
                       │ Ranking Engine   │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Response Builder │
                       │ (Unified Format) │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Cache Layer    │
                       │ (TTL + Invalidation)│
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Client (UI)    │
                       │ Streaming Results│
                       └──────────────────┘
```

### 2.2 Query Routing Logic

```typescript
type SearchCategory = 'AGRI' | 'DEPLOY' | 'MARKET';

interface SearchRequest {
  query: string;
  category?: SearchCategory; // Optional override
  options?: SearchOptions;
}

interface SearchOptions {
  enableCache?: boolean;
  timeout?: number;
  maxResults?: number;
  streamResponse?: boolean;
  district?: string;
}

const routeQuery = async (request: SearchRequest): Promise<SearchResponse> => {
  // Step 1: Classify if category not provided
  const classification = request.category 
    ? { category: request.category, confidence: 1.0, detectedKeywords: [] }
    : classifyQuery(request.query);
  
  // Step 2: Check cache first
  const cacheKey = generateCacheKey(request);
  const cached = getCachedResult(cacheKey);
  if (cached && request.options?.enableCache !== false) {
    return { ...cached, fromCache: true };
  }
  
  // Step 3: Route to appropriate handler
  let result: SearchResponse;
  
  switch (classification.category) {
    case 'MARKET':
      result = await handleMarketQuery(request);
      break;
    case 'DEPLOY':
      result = await handleDeploymentQuery(request);
      break;
    case 'AGRI':
    default:
      result = await handleAgriculturalQuery(request);
      break;
  }
  
  // Step 4: Cache result
  if (result.success) {
    setCachedResult(cacheKey, result);
  }
  
  return {
    ...result,
    classification,
  };
};
```

### 2.3 Unified Search API Interface

```typescript
// ============================================================
// CORE TYPES - Unified Search API
// ============================================================

/** Search category types */
export type SearchCategory = 'AGRI' | 'DEPLOY' | 'MARKET';

/** Search mode for UI */
export type SearchMode = 'market' | 'ai' | 'deploy';

/** Classification confidence level */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Search result source */
export type ResultSource = 'local' | 'ai' | 'knowledge_base' | 'mixed';

/** Classification result from query analyzer */
export interface QueryClassification {
  category: SearchCategory;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  detectedKeywords: string[];
  subCategory?: string;
}

/** Unified search request */
export interface UnifiedSearchRequest {
  query: string;
  category?: SearchCategory;
  options?: SearchOptions;
  signal?: AbortSignal;
}

/** Search options */
export interface SearchOptions {
  enableCache?: boolean;
  timeout?: number;
  maxResults?: number;
  streamResponse?: boolean;
  district?: string;
  language?: 'bn' | 'en';
}

/** Single search result item */
export interface SearchResultItem {
  id: string;
  title: string;
  content: string;
  source: ResultSource;
  sourceName?: string;
  url?: string;
  relevanceScore: number;
  metadata?: Record<string, unknown>;
}

/** Grounding metadata for AI results */
export interface GroundingMetadata {
  chunks: GroundingChunk[];
  searchQueries?: string[];
}

/** Unified search response */
export interface UnifiedSearchResponse {
  success: boolean;
  query: string;
  classification: QueryClassification;
  results: SearchResultItem[];
  totalResults: number;
  responseTime: number;
  fromCache: boolean;
  grounding?: GroundingMetadata;
  error?: string;
  streamId?: string;
}

/** Streaming chunk for real-time results */
export interface StreamChunk {
  type: 'chunk' | 'complete' | 'error';
  content?: string;
  results?: SearchResultItem[];
  error?: string;
  progress?: number;
}

/** Deployment-specific result */
export interface DeploymentResult {
  issue: string;
  category: 'build' | 'runtime' | 'config' | 'network' | 'performance';
  solutions: DeploymentSolution[];
  documentation?: string;
  relatedErrors?: string[];
}

export interface DeploymentSolution {
  step: number;
  instruction: string;
  command?: string;
  files?: string[];
  links?: string[];
}

/** Market price result */
export interface MarketPriceResult {
  commodity: string;
  prices: CommodityPrice[];
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface CommodityPrice {
  district: string;
  wholesale: { min: number; max: number };
  retail: { min: number; max: number };
  unit: string;
}
```

### 2.4 Handler Interfaces

```typescript
// ============================================================
// HANDLER INTERFACES
// ============================================================

/** Base handler interface */
interface SearchHandler {
  readonly category: SearchCategory;
  canHandle(query: string, classification: QueryClassification): boolean;
  execute(request: UnifiedSearchRequest): Promise<UnifiedSearchResponse>;
}

/** Market data handler (local commodities) */
interface MarketHandler extends SearchHandler {
  readonly category: 'MARKET';
  
  /** Filter by district */
  filterByDistrict(district: string): Promise<MarketPriceResult[]>;
  
  /** Filter by commodity */
  filterByCommodity(commodity: string): Promise<MarketPriceResult[]>;
  
  /** Get all prices */
  getAllPrices(): Promise<MarketPriceResult[]>;
}

/** Agricultural AI handler (Gemini + Google Search) */
interface AgriHandler extends SearchHandler {
  readonly category: 'AGRI';
  
  /** Search with grounding */
  searchWithGrounding(query: string): Promise<UnifiedSearchResponse>;
  
  /** Analyze crop image */
  analyzeCropImage(imageData: string, query: string): Promise<AnalysisResult>;
}

/** Deployment troubleshooting handler */
interface DeploymentHandler extends SearchHandler {
  readonly category: 'DEPLOY';
  
  /** Search knowledge base */
  searchKnowledgeBase(query: string): Promise<DeploymentResult[]>;
  
  /** Get error-specific solutions */
  getSolutionsForError(errorCode: string): Promise<DeploymentResult>;
  
  /** Get all deployment FAQs */
  getDeploymentFAQs(): Promise<DeploymentFAQ[]>;
}
```

---

## 3. Multi-Source Integration

### 3.1 Source Priority Matrix

| Query Type | Primary Source | Secondary Source | Fallback |
|------------|----------------|-------------------|----------|
| Market Prices | Local COMMODITIES_DATA | - | Empty result |
| Agri (Crop) | Gemini + Search | Local CSV | Fallback prompt |
| Agri (Disease) | Gemini + Search | CABI Database | Rule-based |
| Deployment | Knowledge Base | Gemini (Dev prompt) | Generic error help |
| Mixed | Gemini + Search | All sources | Combined |

### 3.2 Result Merging Strategy

```typescript
interface MergedResult {
  primary: SearchResultItem[];
  secondary: SearchResultItem[];
  ranked: SearchResultItem[];
}

const mergeResults = (
  marketResults: SearchResultItem[],
  aiResults: SearchResultItem[],
  deployResults: SearchResultItem[],
  category: SearchCategory
): MergedResult => {
  const allResults = [...marketResults, ...aiResults, ...deployResults];
  
  // Score and rank results
  const scored = allResults.map(result => {
    let score = result.relevanceScore;
    
    // Boost score based on category match
    if (category === 'MARKET' && result.source === 'local') {
      score *= 1.5;
    } else if (category === 'DEPLOY' && result.source === 'knowledge_base') {
      score *= 1.5;
    } else if (category === 'AGRI' && result.source === 'ai') {
      score *= 1.3;
    }
    
    // Boost results with grounding
    if (result.metadata?.hasGrounding) {
      score *= 1.2;
    }
    
    return { ...result, relevanceScore: score };
  });
  
  // Sort by score descending
  const ranked = scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  return {
    primary: ranked.slice(0, 5),
    secondary: ranked.slice(5, 10),
    ranked,
  };
};
```

### 3.3 Parallel vs Sequential Fetching

```typescript
/** Fetch strategy based on query type */
const getFetchStrategy = (category: SearchCategory): FetchStrategy => {
  switch (category) {
    case 'MARKET':
      // Market is local - instant
      return { mode: 'local', parallel: false };
    
    case 'DEPLOY':
      // Try knowledge base first (fast), then AI
      return { mode: 'fallback', parallel: false };
    
    case 'AGRI':
      // For agriculture, we can parallelize for better UX
      return { 
        mode: 'parallel', 
        sources: ['local', 'ai'],
        parallel: true,
        timeout: 10000,
      };
    
    default:
      return { mode: 'sequential', parallel: false };
  }
};

/** Execute search with appropriate strategy */
const executeSearch = async (
  request: UnifiedSearchRequest,
  strategy: FetchStrategy
): Promise<UnifiedSearchResponse> => {
  if (strategy.mode === 'local') {
    return handleMarketQuery(request);
  }
  
  if (strategy.mode === 'fallback') {
    // Try fast source first
    const kbResult = await handleDeploymentQuery(request);
    if (kbResult.success && kbResult.results.length > 0) {
      return kbResult;
    }
    // Fallback to AI
    return handleAgriculturalQuery({ ...request, systemPrompt: DEPLOY_SYSTEM_PROMPT });
  }
  
  if (strategy.mode === 'parallel' && strategy.parallel) {
    // Execute multiple sources in parallel
    const [localResult, aiResult] = await Promise.all([
      handleMarketQuery(request),
      handleAgriculturalQuery(request),
    ]);
    
    // Merge results
    return mergeSearchResults(localResult, aiResult, request.category);
  }
  
  // Default sequential
  return handleAgriculturalQuery(request);
};
```

---

## 4. Caching Layer Design

### 4.1 Cache Structure

```typescript
// ============================================================
// CACHE LAYER
// ============================================================

/** Cache entry with TTL */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
  lastAccessed: number;
}

/** Cache configuration */
interface CacheConfig {
  /** Time-to-live in milliseconds (default: 15 minutes) */
  defaultTTL: number;
  /** Maximum cache size (entries) */
  maxSize: number;
  /** Maximum memory usage (bytes) */
  maxMemoryBytes: number;
  /** Enable cache stats tracking */
  enableStats: boolean;
}

/** Cache statistics */
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  memoryUsage: number;
  hitRate: number;
}

/** Unified search cache */
class SearchCache {
  private cache: Map<string, CacheEntry<UnifiedSearchResponse>>;
  private config: CacheConfig;
  private stats: CacheStats;
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 15 * 60 * 1000, // 15 minutes
      maxSize: 500,
      maxMemoryBytes: 50 * 1024 * 1024, // 50MB
      enableStats: true,
      ...config,
    };
    
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, evictions: 0, memoryUsage: 0, hitRate: 0 };
  }
  
  /** Generate cache key from request */
  private generateKey(request: UnifiedSearchRequest): string {
    const normalized = request.query.toLowerCase().trim();
    const category = request.category || 'AUTO';
    const district = request.options?.district || 'ALL';
    return `search:${category}:${district}:${this.hash(normalized)}`;
  }
  
  /** Simple hash function */
  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  /** Get cached result if valid */
  get(request: UnifiedSearchRequest): UnifiedSearchResponse | null {
    const key = this.generateKey(request);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
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
  
  /** Set cache entry */
  set(request: UnifiedSearchRequest, response: UnifiedSearchResponse): void {
    const key = this.generateKey(request);
    const ttl = this.config.defaultTTL;
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
  }
  
  /** Evict least recently used entry */
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
  
  /** Invalidate cache by pattern */
  invalidate(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }
  
  /** Clear all cache */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, memoryUsage: 0, hitRate: 0 };
  }
  
  /** Get cache statistics */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// Default cache instance
export const searchCache = new SearchCache();
```

### 4.2 Cache Invalidation Strategy

```typescript
/** Cache invalidation rules */
const CACHE_INVALIDATION_RULES = {
  /** Invalidate on deployment-related queries after build */
  DEPLOY: {
    pattern: 'search:DEPLOY:*',
    trigger: 'after_build',
    ttl: 5 * 60 * 1000, // 5 minutes for deployment
  },
  
  /** Invalidate market data every 30 minutes */
  MARKET: {
    pattern: 'search:MARKET:*',
    trigger: 'time',
    ttl: 30 * 60 * 1000,
  },
  
  /** Invalidate agricultural queries every 15 minutes */
  AGRI: {
    pattern: 'search:AGRI:*',
    trigger: 'time',
    ttl: 15 * 60 * 1000,
  },
} as const;

/** Invalidate cache based on events */
export const handleCacheInvalidation = (event: CacheInvalidationEvent): void => {
  switch (event.type) {
    case 'deployment_complete':
      // Invalidate deployment cache after successful deploy
      searchCache.invalidate('search:DEPLOY:');
      break;
      
    case 'new_market_data':
      // Invalidate market cache when new data available
      searchCache.invalidate('search:MARKET:');
      break;
      
    case 'manual_clear':
      // Manual cache clear
      searchCache.clear();
      break;
      
    case 'memory_pressure':
      // Clear oldest entries under memory pressure
      const stats = searchCache.getStats();
      if (stats.memoryUsage > 40 * 1024 * 1024) {
        searchCache.invalidate('search:AGRI:'); // Clear agri first
      }
      break;
  }
};
```

---

## 5. Performance Optimization

### 5.1 Debouncing Strategy

```typescript
// ============================================================
// PERFORMANCE OPTIMIZATION
// ============================================================

/** Debounce configuration */
interface DebounceConfig {
  delay: number;
  leading: boolean;
  trailing: boolean;
  maxWait?: number;
}

/** Create debounced function */
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  config: number | DebounceConfig
): T {
  const { delay, leading, trailing, maxWait } = typeof config === 'number'
    ? { delay: config, leading: false, trailing: true }
    : config;
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime: number | null = null;
  
  const invokeFn = () => {
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };
  
  return ((...args: Parameters<T>) => {
    lastArgs = args;
    const now = Date.now();
    
    if (leading && !timeoutId) {
      invokeFn();
    }
    
    if (maxWait && lastCallTime && now - lastCallTime >= maxWait) {
      invokeFn();
      lastCallTime = now;
    }
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (trailing && lastArgs) {
        invokeFn();
      }
    }, delay);
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  }) as T;
}

/** Search-specific debounce hook */
export const useSearchDebounce = (
  callback: (value: string) => void,
  delay: number = 300
) => {
  return useMemo(
    () => debounce(callback, { delay, leading: false, trailing: true }),
    [callback, delay]
  );
};
```

### 5.2 Request Deduplication

```typescript
/** Request deduplication map */
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<UnifiedSearchResponse>>;
  private requestQueue: Map<string, AbortController>;
  
  constructor() {
    this.pendingRequests = new Map();
    this.requestQueue = new Map();
  }
  
  /** Execute request with deduplication */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check if request is already pending
    const existingPromise = this.pendingRequests.get(key);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }
    
    // Create new request
    const promise = requestFn();
    this.pendingRequests.set(key, promise as Promise<UnifiedSearchResponse>);
    
    try {
      return await promise;
    } finally {
      this.pendingRequests.delete(key);
    }
  }
  
  /** Cancel pending request */
  cancel(key: string): void {
    const controller = this.requestQueue.get(key);
    if (controller) {
      controller.abort();
      this.requestQueue.delete(key);
    }
  }
  
  /** Cancel all pending requests */
  cancelAll(): void {
    for (const controller of this.requestQueue.values()) {
      controller.abort();
    }
    this.requestQueue.clear();
    this.pendingRequests.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();
```

### 5.3 Response Streaming

```typescript
/** Streaming response handler */
class SearchStreamHandler {
  private streams: Map<string, ReadableStream<StreamChunk>>;
  
  constructor() {
    this.streams = new Map();
  }
  
  /** Create streaming response */
  createStream(
    request: UnifiedSearchRequest,
    onChunk: (chunk: StreamChunk) => void
  ): { stream: ReadableStream<StreamChunk>; abort: () => void } {
    const controller = new AbortController();
    const streamId = this.generateStreamId();
    
    const stream = new ReadableStream<StreamChunk>({
      start: async (source) => {
        try {
          // Send initial chunk
          source.enqueue({
            type: 'chunk',
            content: '',
            progress: 0,
          });
          
          // Execute search with progress callbacks
          const result = await this.executeWithProgress(
            request,
            (progress, content, results) => {
              source.enqueue({
                type: 'chunk',
                content,
                results,
                progress,
              });
            },
            controller.signal
          );
          
          // Send final result
          source.enqueue({
            type: 'complete',
            results: result.results,
            content: result.response?.text,
            progress: 100,
          });
          
          source.close();
        } catch (error) {
          if (error.name !== 'AbortError') {
            source.enqueue({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
          source.cancel();
        }
      },
      cancel() {
        controller.abort();
      },
    });
    
    return { stream, abort: () => controller.abort() };
  }
  
  private async executeWithProgress(
    request: UnifiedSearchRequest,
    onProgress: (progress: number, content?: string, results?: SearchResultItem[]) => void,
    signal: AbortSignal
  ): Promise<{ results: SearchResultItem[]; response?: UnifiedSearchResponse }> {
    // This would integrate with the search handlers
    // and provide progress updates
    return { results: [] };
  }
  
  private generateStreamId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const streamHandler = new SearchStreamHandler();
```

---

## 6. File Structure

### 6.1 New Files to Create

```
services/
├── search/
│   ├── index.ts                    # Main export
│   ├── unifiedSearch.ts            # Unified search service
│   ├── queryClassifier.ts           # Query classification
│   ├── cache/
│   │   ├── searchCache.ts           # Cache implementation
│   │   └── cacheConfig.ts           # Cache configuration
│   ├── handlers/
│   │   ├── marketHandler.ts         # Market data handler
│   │   ├── agriHandler.ts           # Agricultural AI handler
│   │   └── deployHandler.ts         # Deployment handler
│   ├── types/
│   │   └── searchTypes.ts           # TypeScript interfaces
│   └── knowledgeBase/
│       └── deploymentFAQs.ts        # Deployment FAQ data
└── geminiService.ts                 # [MODIFIED] Add unified search export

components/
└── SearchTool.tsx                   # [MODIFIED] Add deploy mode, debouncing

types.ts                             # [MODIFIED] Add search types
```

### 6.2 Modified Files

| File | Changes |
|------|---------|
| `types.ts` | Add `SearchCategory`, `SearchResult`, `UnifiedSearchResponse` |
| `services/geminiService.ts` | Export new unified search function |
| `components/SearchTool.tsx` | Add deploy mode toggle, debouncing, unified search integration |
| `vite.config.ts` | Fix chunk splitting configuration |

---

## 7. API Signatures

### 7.1 Main Unified Search Function

```typescript
/**
 * Unified search function that automatically classifies and routes queries
 * 
 * @param request - Search request with query and options
 * @returns Unified search response with categorized results
 * 
 * @example
 * ```typescript
 * const result = await unifiedSearch({
 *   query: "ধানের দাম আজ কত?",
 *   options: {
 *     enableCache: true,
 *     district: 'ঢাকা',
 *     language: 'bn'
 *   }
 * });
 * 
 * // Or with explicit category
 * const deployResult = await unifiedSearch({
 *   query: "build failed with error",
 *   category: 'DEPLOY',
 *   options: { enableCache: true }
 * });
 * ```
 */
export declare function unifiedSearch(
  request: UnifiedSearchRequest
): Promise<UnifiedSearchResponse>;

/**
 * Streaming version of unified search
 * 
 * @param request - Search request
 * @param onChunk - Callback for each chunk of results
 * @returns AbortController to cancel stream
 */
export declare function unifiedSearchStream(
  request: UnifiedSearchRequest,
  onChunk: (chunk: StreamChunk) => void
): { abort: () => void };
```

### 7.2 Handler Functions

```typescript
// Market Handler
export declare function searchMarketPrices(
  query: string,
  district?: string
): Promise<MarketPriceResult[]>;

// Agricultural Handler
export declare function searchAgriculturalInfo(
  query: string,
  options?: {
    enableGrounding?: boolean;
    systemPrompt?: string;
  }
): Promise<UnifiedSearchResponse>;

// Deployment Handler
export declare function searchDeploymentIssues(
  query: string,
  options?: {
    errorCode?: string;
    includeRelated?: boolean;
  }
): Promise<DeploymentResult[]>;
```

### 7.3 Utility Functions

```typescript
// Query Classification
export declare function classifyQuery(
  query: string
): QueryClassification;

// Cache Management
export declare function getCachedSearch(
  query: string,
  category?: SearchCategory
): UnifiedSearchResponse | null;

export declare function invalidateSearchCache(
  pattern?: string
): void;

// Performance
export declare function createSearchDebounce(
  callback: (value: string) => void,
  delay?: number
): (value: string) => void;
```

---

## 8. Implementation Priority

### Phase 1: Core Infrastructure (Week 1)

1. Create TypeScript interfaces (`searchTypes.ts`)
2. Implement query classifier (`queryClassifier.ts`)
3. Create cache layer (`searchCache.ts`)
4. Implement unified search entry point (`unifiedSearch.ts`)

### Phase 2: Handlers (Week 2)

1. Create deployment handler with knowledge base
2. Create market handler with local data
3. Update agricultural handler to use unified format
4. Implement result merging

### Phase 3: UI Integration (Week 3)

1. Update SearchTool with deploy mode toggle
2. Add debouncing to search input
3. Integrate caching with SearchTool
4. Add loading states for streaming

### Phase 4: Optimization (Week 4)

1. Fix Vite chunk splitting
2. Add request deduplication
3. Implement response streaming
4. Add cache invalidation webhooks

---

## 9. Summary

This architecture provides:

| Feature | Description |
|---------|-------------|
| **Query Classification** | Automatic detection of query type with confidence scoring |
| **Unified API** | Single entry point for all search types |
| **Multi-Source** | Local data, AI, and knowledge base integration |
| **Caching** | TTL-based in-memory cache with LRU eviction |
| **Performance** | Debouncing, deduplication, and streaming support |
| **Developer UX** | Deployment troubleshooting directly in the app |

The design is modular, extensible, and optimized for both agricultural queries and deployment issues.
