/**
 * Unified Search - Core TypeScript Interfaces
 * 
 * Type definitions for the Krishi AI unified search system.
 * Supports agricultural queries, deployment troubleshooting, and market data.
 */

// ============================================================
// SEARCH CATEGORY TYPES
// ============================================================

/** Search category types */
export type SearchCategory = 'AGRI' | 'DEPLOY' | 'MARKET';

/** Search mode for UI */
export type SearchMode = 'market' | 'ai' | 'deploy';

/** Classification confidence level */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Result source identifier */
export type ResultSource = 'local' | 'ai' | 'knowledge_base' | 'mixed';

// ============================================================
// CLASSIFICATION TYPES
// ============================================================

/** Classification result from query analyzer */
export interface QueryClassification {
  category: SearchCategory;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  detectedKeywords: string[];
  subCategory?: string;
}

// ============================================================
// REQUEST/RESPONSE TYPES
// ============================================================

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

/** Grounding chunk from Google Search */
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
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

// ============================================================
// STREAMING TYPES
// ============================================================

/** Streaming chunk for real-time results */
export interface StreamChunk {
  type: 'chunk' | 'complete' | 'error';
  content?: string;
  results?: SearchResultItem[];
  error?: string;
  progress?: number;
}

// ============================================================
// DEPLOYMENT RESULT TYPES
// ============================================================

/** Deployment result type */
export interface DeploymentResult {
  issue: string;
  category: DeploymentCategory;
  solutions: DeploymentSolution[];
  documentation?: string;
  relatedErrors?: string[];
  confidence: number;
}

export type DeploymentCategory = 'build' | 'runtime' | 'config' | 'network' | 'performance';

/** Solution step for deployment issues */
export interface DeploymentSolution {
  step: number;
  instruction: string;
  command?: string;
  files?: string[];
  links?: string[];
}

// ============================================================
// MARKET RESULT TYPES
// ============================================================

/** Market price result */
export interface MarketPriceResult {
  commodity: string;
  prices: CommodityPrice[];
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
  category: string;
}

/** Commodity price by district */
export interface CommodityPrice {
  district: string;
  wholesale: { min: number; max: number };
  retail: { min: number; max: number };
  unit: string;
}

// ============================================================
// CACHE TYPES
// ============================================================

/** Cache entry with TTL */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
  lastAccessed: number;
}

/** Cache configuration */
export interface CacheConfig {
  /** Time-to-live in milliseconds (default: 15 minutes) */
  defaultTTL: number;
  /** Maximum cache size (entries) */
  maxSize: number;
  /** Enable cache stats tracking */
  enableStats: boolean;
}

/** Cache statistics */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  size: number;
}

// ============================================================
// HANDLER INTERFACES
// ============================================================

/** Base handler interface */
export interface ISearchHandler {
  readonly category: SearchCategory;
  canHandle(query: string, classification: QueryClassification): boolean;
  execute(request: UnifiedSearchRequest): Promise<UnifiedSearchResponse>;
}

/** Market handler interface */
export interface IMarketHandler extends ISearchHandler {
  readonly category: 'MARKET';
  filterByDistrict(district: string): Promise<MarketPriceResult[]>;
  filterByCommodity(commodity: string): Promise<MarketPriceResult[]>;
  getAllPrices(): Promise<MarketPriceResult[]>;
}

/** Agricultural handler interface */
export interface IAgriHandler extends ISearchHandler {
  readonly category: 'AGRI';
  searchWithGrounding(query: string): Promise<UnifiedSearchResponse>;
}

/** Deployment handler interface */
export interface IDeploymentHandler extends ISearchHandler {
  readonly category: 'DEPLOY';
  searchKnowledgeBase(query: string): DeploymentResult[];
  getSolutionsForError(errorCode: string): DeploymentResult | null;
}

// ============================================================
// DEBOUNCE TYPES
// ============================================================

/** Debounce configuration */
export interface DebounceConfig {
  delay: number;
  leading: boolean;
  trailing: boolean;
  maxWait?: number;
}

/** Debounce cancel function */
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
}

// ============================================================
// SEARCH STATE TYPES
// ============================================================

/** Search state for UI */
export interface SearchState {
  query: string;
  mode: SearchMode;
  isLoading: boolean;
  results: SearchResultItem[] | null;
  error: string | null;
  classification: QueryClassification | null;
}

/** Search mode toggle options */
export interface SearchModeOption {
  value: SearchMode;
  label: string;
  labelBn: string;
  icon: string;
}

// ============================================================
// EXPORT DEFAULT SEARCH MODES
// ============================================================

/** Default search modes */
export const SEARCH_MODES: SearchModeOption[] = [
  { value: 'market', label: 'Market Prices', labelBn: 'বাজার দাম', icon: '📊' },
  { value: 'ai', label: 'AI Assistant', labelBn: 'কৃষি সহায়ক', icon: '🤖' },
  { value: 'deploy', label: 'Deployment Help', labelBn: 'ডিপ্লয় সাহায্য', icon: '🔧' },
];

/** Default search categories */
export const SEARCH_CATEGORIES: SearchCategory[] = ['AGRI', 'DEPLOY', 'MARKET'];

/** Confidence thresholds */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.7,
  MEDIUM: 0.4,
  LOW: 0,
} as const;
