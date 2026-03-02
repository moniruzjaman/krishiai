/**
 * Query Classifier Service
 * 
 * Automatically classifies search queries into categories:
 * - AGRI: Agricultural queries (crops, farming, weather, etc.)
 * - DEPLOY: Deployment troubleshooting (build errors, Vercel, etc.)
 * - MARKET: Market prices (commodity prices, districts)
 */

import {
  QueryClassification,
  SearchCategory,
  ConfidenceLevel,
  CONFIDENCE_THRESHOLDS,
} from './types/searchTypes';

// ============================================================
// KEYWORD DEFINITIONS
// ============================================================

/** Agriculture keywords (Bangla + English) */
const AGRI_KEYWORDS = {
  // Crops
  crops: [
    'ধান', 'ভুট্রা', 'গম', 'আলু', 'পেঁয়াজ', 'টমেটো', 'বেগুন', 'মরিচ', 'ডাল', 'তেল',
    'rice', 'wheat', 'potato', 'onion', 'tomato', 'brinjal', 'chili', 'pulse', 'oil',
  ],
  // Farming
  farming: [
    'চাষ', 'ফসল', 'বীজ', 'চারা', 'রোপণ', 'সেচ', 'সার', 'ধান', 'ফসল', 'চাষাবাদ',
    'cultivation', 'crop', 'seed', 'seedling', 'planting', 'irrigation', 'fertilizer',
  ],
  // Pests/Diseases
  pests: [
    'পোকা', 'রোগ', 'জাব', 'আগাছা', 'প্রতিকার', 'দমন',
    'disease', 'pest', 'insect', 'weed', 'control', 'treatment',
  ],
  // Weather
  weather: [
    'বৃষ্টি', 'তাপমাত্রা', 'আবহাওয়া', 'বন্যা', 'খরা', 'জলবায়ু',
    'rain', 'temperature', 'weather', 'flood', 'drought', 'climate',
  ],
  // Fertilizers
  fertilizer: [
    'সার', 'ইউরিয়া', 'টিএসপি', 'ডিএপি', 'পটাশ', 'জৈব সার',
    'fertilizer', 'urea', 'tsp', 'dap', 'potash', 'organic',
  ],
  // General agriculture
  general: [
    'কৃষি', 'কৃষক', 'মাঠ', 'জমি', 'ফলন', 'উৎপাদন', 'বীজতলা', 'ধান',
    'agriculture', 'farmer', 'field', 'land', 'yield', 'production', 'nursery', 'paddy',
  ],
  // Plant diseases
  plantDisease: [
    'ব্লাস্ট', 'ঝুঁকি', 'পাতা', 'গাছ', 'শিকড়', 'কাণ্ড',
    'blast', 'blight', 'leaf', 'plant', 'root', 'stem', 'rot',
  ],
} as const;

/** Deployment keywords (Bangla + English) */
const DEPLOY_KEYWORDS = {
  // Build errors
  build: [
    'build', 'failed', 'বিল্ড', 'ত্রুটি', 'npm', 'yarn', 'pnpm', 'বিল্ড ব্যর্থ',
    'compile', 'compilation', 'error', 'failed to build',
  ],
  // Vercel
  vercel: [
    'vercel', 'deployment', 'deploy', 'ডিপ্লয়', 'ভার্সেল',
    'vercel.app', 'production', 'preview',
  ],
  // Environment
  env: [
    'env', 'environment', 'variable', 'API key', 'পরিবেশ', 'কী',
    'process.env', 'VITE_', 'secret', 'configuration',
  ],
  // HTTP Errors
  errors: [
    'cors', '404', '500', '403', 'error', 'ত্রুটি', 'সমস্যা',
    'not found', 'forbidden', 'internal server', 'network', 'timeout',
  ],
  // Performance
  performance: [
    'bundle', 'size', 'optimize', 'slow', 'loading', 'পারফরম্যান্স',
    'minify', 'chunk', 'lazy', 'code splitting', 'performance',
  ],
  // Firebase
  firebase: [
    'firebase', 'auth', 'realtime', 'firestore', 'ফায়ারবেস',
    'authentication', 'firebase google',
  ],
  // Git
  git: [
    'git', 'commit', 'push', 'branch', 'merge', 'গিট',
    'pull', 'clone', 'repository', 'version control',
  ],
  // TypeScript
  typescript: [
    'typescript', 'tsc', 'type error', 'টাইপস্ক্রিপ্ট',
    'interface', 'type', 'generics', 'type safety',
  ],
  // React
  react: [
    'react', 'component', 'hook', 'state', 'props', 'রিঅ্যাক্ট',
    'useState', 'useEffect', 'useContext', 'jsx', 'tsx',
  ],
  // Debugging
  debug: [
    'debug', 'troubleshoot', 'fix', 'সমাধান', 'সমস্যা', 'ঠিক করা',
    'solving', 'issue', 'problem', 'solve', 'fix error',
  ],
  // Docker/Cloud
  cloud: [
    'docker', 'cloudflare', 'render', 'heroku', 'aws', 'netlify',
    'container', 'kubernetes', 'deployment',
  ],
} as const;

/** Market keywords (Bangla + English) */
const MARKET_KEYWORDS = {
  // Price
  price: [
    'দাম', 'মূল্য', 'price', 'rate', 'কত', 'টাকা', 'কোন',
    'cost', 'value', 'taka', 'bdt',
  ],
  // Buy/Sell
  trade: [
    'কেনা', 'বিক্রি', 'কিনতে', 'বিক্রি করতে', 'কিনব',
    'buy', 'sell', 'purchase', 'transaction',
  ],
  // Market
  market: [
    'বাজার', 'হাট', 'market', 'মার্কেট', 'দোকান',
    'bazar', 'shop', 'wholesale', 'retail',
  ],
  // Districts
  districts: [
    'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'সিলেট', 'বরিশাল', 'রংপুর', 'ময়মনসিংহ',
    'Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Sylhet', 'Barisal', 'Rangpur',
  ],
  // Commodities
  commodities: [
    'চাল', 'আলু', 'পেঁয়াজ', 'মরিচ', 'ডাল', 'তেল', 'ডিম', 'মাংস', 'মুগ', 'ছোলা',
    'rice', 'potato', 'onion', 'chili', 'pulse', 'oil', 'egg', 'meat', 'mustard',
  ],
} as const;

// ============================================================
// CLASSIFICATION LOGIC
// ============================================================

/**
 * Classify a search query into a category
 * 
 * @param query - The search query to classify
 * @returns Classification result with category and confidence
 */
export function classifyQuery(query: string): QueryClassification {
  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);
  
  // Score each category
  const scores: Record<SearchCategory, number> = {
    AGRI: 0,
    DEPLOY: 0,
    MARKET: 0,
  };
  
  const detectedKeywords: string[] = [];
  
  // Check agriculture keywords
  for (const [, keywords] of Object.entries(AGRI_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        scores.AGRI += 1;
        if (!detectedKeywords.includes(keyword)) {
          detectedKeywords.push(keyword);
        }
      }
    }
  }
  
  // Check deployment keywords (highest priority)
  for (const [, keywords] of Object.entries(DEPLOY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        scores.DEPLOY += 1.5; // Higher weight for deployment
        if (!detectedKeywords.includes(keyword)) {
          detectedKeywords.push(keyword);
        }
      }
    }
  }
  
  // Check market keywords
  for (const [, keywords] of Object.entries(MARKET_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        scores.MARKET += 1;
        if (!detectedKeywords.includes(keyword)) {
          detectedKeywords.push(keyword);
        }
      }
    }
  }
  
  // Calculate total and normalize
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  
  // Determine category based on highest score
  let category: SearchCategory;
  const maxScore = Math.max(...Object.values(scores));
  
  if (maxScore === 0) {
    // Default to AGRI if no keywords detected
    category = 'AGRI';
  } else if (maxScore === scores.DEPLOY) {
    category = 'DEPLOY';
  } else if (maxScore === scores.MARKET) {
    category = 'MARKET';
  } else {
    category = 'AGRI';
  }
  
  // Calculate confidence
  const confidence = totalScore > 0 ? maxScore / totalScore : 0.5;
  
  // Determine confidence level
  let confidenceLevel: ConfidenceLevel;
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    confidenceLevel = 'high';
  } else if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    confidenceLevel = 'medium';
  } else {
    confidenceLevel = 'low';
  }
  
  return {
    category,
    confidence,
    confidenceLevel,
    detectedKeywords: [...new Set(detectedKeywords)],
  };
}

/**
 * Check if query should be handled by a specific category
 * 
 * @param query - The search query
 * @param category - Category to check
 * @returns True if query belongs to category
 */
export function isQueryCategory(
  query: string,
  category: SearchCategory
): boolean {
  const classification = classifyQuery(query);
  return classification.category === category;
}

/**
 * Get subcategory for more specific routing
 * 
 * @param query - The search query
 * @returns Subcategory string or undefined
 */
export function getQuerySubCategory(query: string): string | undefined {
  const normalizedQuery = query.toLowerCase();
  
  // Check for specific subcategories
  if (DEPLOY_KEYWORDS.build.some(k => normalizedQuery.includes(k))) {
    return 'build';
  }
  if (DEPLOY_KEYWORDS.vercel.some(k => normalizedQuery.includes(k))) {
    return 'vercel';
  }
  if (DEPLOY_KEYWORDS.errors.some(k => normalizedQuery.includes(k))) {
    return 'http-error';
  }
  if (DEPLOY_KEYWORDS.firebase.some(k => normalizedQuery.includes(k))) {
    return 'firebase';
  }
  if (AGRI_KEYWORDS.pests.some(k => normalizedQuery.includes(k))) {
    return 'pest-disease';
  }
  if (AGRI_KEYWORDS.weather.some(k => normalizedQuery.includes(k))) {
    return 'weather';
  }
  if (MARKET_KEYWORDS.commodities.some(k => normalizedQuery.includes(k))) {
    return 'commodity';
  }
  
  return undefined;
}

/**
 * Get keywords for a specific category
 * 
 * @param category - Search category
 * @returns Array of keywords for the category
 */
export function getCategoryKeywords(category: SearchCategory): string[] {
  switch (category) {
    case 'AGRI':
      return Object.values(AGRI_KEYWORDS).flat();
    case 'DEPLOY':
      return Object.values(DEPLOY_KEYWORDS).flat();
    case 'MARKET':
      return Object.values(MARKET_KEYWORDS).flat();
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  classifyQuery,
  isQueryCategory,
  getQuerySubCategory,
  getCategoryKeywords,
};
