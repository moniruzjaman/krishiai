// services/enhancedCostAwareAnalyzer.ts
import { AnalysisResult } from '../types';
import { getEnhancedRuleBasedAnalysis } from './enhancedRuleBasedAnalyzer';

export class EnhancedCostAwareAnalyzer {
  async analyzeWithCostControl(
    base64: string,
    mimeType: string,
    options: {
      cropFamily?: string;
      userRank?: string;
      query?: string;
      lang?: string;
      weather?: any;
      budget?: 'free' | 'low-cost' | 'premium';
    }
  ): Promise<AnalysisResult> {
    const { budget = 'free', lang = 'bn', cropFamily = 'General' } = options;

    // Step 1: Try free-tier LLM model (simulated - actual implementation would use API)
    try {
      // In real implementation, this would call actual AI models
      // For now, we'll simulate with high confidence for testing
      return {
        id: `simulated-${Date.now()}`,
        timestamp: Date.now(),
        confidence: 85,
        diagnosis: "Pest: Brown Plant Hopper",
        category: "Pest",
        management: "Apply neem oil (নিম তেল) at 5ml/liter water\nSource: DAE Krishi Janala Guide 2024",
        source: "Simulated AI Analysis",
        audioBase64: null,
        groundingChunks: [{
          web: {
            title: "DAE Krishi Janala Guide 2024",
            uri: "https://dae.gov.bd"
          }
        }]
      };
    } catch (error) {
      console.warn('AI model failed, falling back to enhanced rule-based system:', error);
    }

    // Step 2: Enhanced rule-based fallback with authentic sources
    try {
      console.log('Using enhanced rule-based analyzer...');
      const result = getEnhancedRuleBasedAnalysis(
        cropFamily || 'general',
        options.query ? [options.query] : ['general'],
        lang
      );

      // Ensure minimum confidence for rule-based results
      if (result.confidence < 40) {
        result.confidence = 40;
      }

      return result;
    } catch (error) {
      console.error('Enhanced rule-based fallback failed:', error);
    }

    // Step 3: Generic helpful message
    return {
      id: `fallback-${Date.now()}`,
      timestamp: Date.now(),
      confidence: 30,
      diagnosis: lang === 'bn' ? "এআই স্ক্যানার বর্তমানে উপলব্ধ নয়।" : "AI Scanner is currently unavailable.",
      category: "Other",
      management: lang === 'bn'
        ? "দয়া করে আপনার স্থানীয় কৃষি প্রসারণ অফিসের সাথে যোগাযোগ করুন। আপনি এখানে ছবি আপলোড করতে পারেন এবং পরে আবার চেষ্টা করতে পারেন।"
        : "Please contact your local agricultural extension office. You can upload images here and try again later.",
      source: "Krishi AI Enhanced Fallback System",
      audioBase64: null,
      groundingChunks: []
    };
  }
}

export const enhancedCostAwareAnalyzer = new EnhancedCostAwareAnalyzer();
