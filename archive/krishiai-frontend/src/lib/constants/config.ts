// Modular configuration constants
export const API_CONFIG = {
  GEMINI_API_KEY: import.meta.env.VITE_GOOGLE_GENAI_API_KEY,
  KIMI_API_KEY: import.meta.env.VITE_KIMI_API_KEY,
  HF_TOKEN: import.meta.env.VITE_HF_TOKEN,
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_KEY,
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL
};

export const QUOTA_CONFIG = {
  DAILY_LIMITS: {
    gemini: 16667, // ~500K tokens / 30 days
    kimi: 333333 // ~10M tokens / 30 days
  },
  RESET_HOUR: 0, // Reset at midnight
  HEAVY_USER: {
    analysesPerDay: 30,
    analysesPerWeek: 100,
    tokensPerDay: 100000
  }
};

export const MODEL_CONFIG = {
  TIERS: {
    PRIMARY: 'gemini-2.5-flash',
    FALLBACK: 'kimi-2.5',
    LOCAL: 'qwen-vl',
    OFFLINE: 'ollama-llama2'
  },
  CONFIDENCE_THRESHOLDS: {
    HIGH: 0.80,
    MEDIUM: 0.60,
    LOW: 0.40
  }
};

export const DATA_CONFIG = {
  SOURCES: {
    CABI: {
      enabled: true,
      path: './data/cabi',
      records: 412,
      images: 124
    },
    BRRI: {
      enabled: true,
      path: './data/brri',
      records: 40,
      images: 80
    },
    BARI: {
      enabled: true,
      path: './data/bari',
      records: 80,
      images: 100
    }
  },
  STORAGE_LIMITS: {
    localStorage: 1000, // Training data records
    indexedDB: 50 * 1024 * 1024 // 50MB for offline RAG
  }
};

export const UI_CONFIG = {
  LANGUAGES: ['bn', 'en'],
  DEFAULT_LANGUAGE: 'bn',
  THEME: {
    LIGHT: 'light',
    DARK: 'dark'
  }
};

export const DEBUG_CONFIG = {
  ENABLED: import.meta.env.DEV,
  LOG_LEVEL: 'info',
  ERROR_REPORTING: true
};