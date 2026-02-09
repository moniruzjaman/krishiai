/**
 * Quota and Analytics Database Schema
 * For tracking API usage and user analytics
 */

export interface QuotaRecord {
  id: string;
  userId?: string;
  modelType: 'gemini' | 'kimi';
  tokensUsed: number;
  timestamp: Date;
  region?: string;
}

export interface UserAnalyticsRecord {
  userId: string;
  totalAnalyses: number;
  totalTokensUsed: number;
  averageConfidence: number;
  modelDistribution: {
    'gemini-2.5-flash': number;
    'kimi-2.5': number;
    'qwen-vl': number;
    'ollama-llama2': number;
  };
  cropDistribution: {
    [cropType: string]: number;
  };
  dailyAnalyses: Array<{
    date: string;
    count: number;
    averageConfidence: number;
  }>;
  isHeavyUser: boolean;
  lastAnalysisDate: Date;
  firstAnalysisDate: Date;
}

export interface TrainingDataRecord {
  id: string;
  userId: string;
  imageHash: string;
  diagnosis: string;
  symptoms: string[];
  confidence: number;
  model: string;
  cropType?: string;
  region?: string;
  season?: string;
  userCorrection?: {
    isCorrect: boolean;
    actualDiagnosis?: string;
    feedback?: string;
  };
  timestamp: Date;
}

export interface QuotaLimit {
  modelType: 'gemini' | 'kimi';
  dailyLimit: number;
  resetHour: number;
  usageTracking: QuotaRecord[];
}

// Initialize quota limits for models
export const QUOTA_LIMITS: Record<string, QuotaLimit> = {
  gemini: {
    modelType: 'gemini',
    dailyLimit: 16667, // ~500K tokens / 30 days
    resetHour: 0, // Reset at midnight
    usageTracking: []
  },
  kimi: {
    modelType: 'kimi',
    dailyLimit: 333333, // ~10M tokens / 30 days
    resetHour: 0,
    usageTracking: []
  }
};

export const HEAVY_USER_THRESHOLD = {
  analysesPerDay: 30,
  analysesPerWeek: 100,
  tokensPerDay: 100000
};
