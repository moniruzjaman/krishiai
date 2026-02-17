// services/huggingFaceService.ts
// Hugging Face integration for cost-effective Bangladesh agriculture analysis

import { HfInference } from '@huggingface/inference';
import { AnalysisResult } from '../types';

// Bangladesh-optimized Hugging Face models
export const HF_BANGLA_MODELS = {
  // Text models for Bangla understanding
  BANGLA_BERT: {
    id: 'sagorsarker/bangla-bert-base',
    name: 'Bangla-BERT Base',
    description: 'BERT model fine-tuned for Bangla text understanding',
    capabilities: ['text-classification', 'fill-mask'],
    banglaOptimized: true,
    agricultureRelevant: true
  },

  BANGLA_NER: {
    id: 'csebuetnlp/banglaner',
    name: 'Bangla NER',
    description: 'Named Entity Recognition for Bangla agricultural text',
    capabilities: ['token-classification'],
    banglaOptimized: true,
    agricultureRelevant: true
  },

  // Vision models for lightweight image analysis
  VIT_BASE: {
    id: 'google/vit-base-patch16-224',
    name: 'ViT Base',
    description: 'Vision Transformer for general image classification',
    capabilities: ['image-classification'],
    banglaOptimized: false,
    agricultureRelevant: true
  },

  RESNET_PLANT: {
    id: 'microsoft/resnet-50',
    name: 'ResNet-50',
    description: 'General image classification, good for plant features',
    capabilities: ['image-classification'],
    banglaOptimized: false,
    agricultureRelevant: true
  },

  // Specialized agriculture models
  PLANT_DISEASE: {
    id: 'nateraw/plant-disease',
    name: 'Plant Disease Classifier',
    description: 'Specialized model for plant disease detection',
    capabilities: ['image-classification'],
    banglaOptimized: false,
    agricultureRelevant: true
  }
};

export class HuggingFaceService {
  private hf: HfInference | null = null;
  private token: string | null = null;

  constructor() {
    this.token = import.meta.env.VITE_HF_TOKEN || process.env.HF_TOKEN;
    if (this.token) {
      this.hf = new HfInference(this.token);
    }
  }

  /**
   * Check if Hugging Face service is available
   */
  isAvailable(): boolean {
    return !!this.token && !!this.hf;
  }

  /**
   * Classify Bangla text for agricultural intent
   */
  async classifyBanglaText(text: string): Promise<{ label: string; score: number }[]> {
    if (!this.hf) {
      throw new Error('Hugging Face token not configured');
    }

    try {
      const result = await this.hf.textClassification({
        model: HF_BANGLA_MODELS.BANGLA_BERT.id,
        inputs: text,
      });

      return Array.isArray(result) ? result[0] : [result];
    } catch (error) {
      console.warn('Bangla text classification failed:', error);
      return [];
    }
  }

  /**
   * Extract named entities from Bangla agricultural text
   */
  async extractBanglaEntities(text: string): Promise<Array<{ entity: string; word: string; score: number }>> {
    if (!this.hf) {
      throw new Error('Hugging Face token not configured');
    }

    try {
      const result = await this.hf.tokenClassification({
        model: HF_BANGLA_MODELS.BANGLA_NER.id,
        inputs: text,
      });

      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.warn('Bangla NER failed:', error);
      return [];
    }
  }

  /**
   * Classify plant image using lightweight vision models
   * Returns top predictions with confidence scores
   */
  async classifyPlantImage(base64: string): Promise<Array<{ label: string; score: number }>> {
    if (!this.hf) {
      throw new Error('Hugging Face token not configured');
    }

    try {
      // Convert base64 to blob
      const blob = await this.base64ToBlob(base64, 'image/jpeg');

      // Try specialized plant disease model first
      try {
        const result = await this.hf.imageClassification({
          model: HF_BANGLA_MODELS.PLANT_DISEASE.id,
          data: blob,
        });
        return Array.isArray(result) ? result : [result];
      } catch (plantErr) {
        console.warn('Plant disease model failed, trying ViT:', plantErr);

        // Fallback to general ViT
        const result = await this.hf.imageClassification({
          model: HF_BANGLA_MODELS.VIT_BASE.id,
          data: blob,
        });
        return Array.isArray(result) ? result : [result];
      }
    } catch (error) {
      console.warn('Image classification failed:', error);
      return [];
    }
  }

  /**
   * Pre-analysis using Hugging Face models
   * Provides initial classification before using expensive LLMs
   */
  async preAnalyzeImage(base64: string, mimeType: string): Promise<{
    plantHealth?: string;
    possibleIssues?: string[];
    confidence?: number;
  } | null> {
    try {
      const classifications = await this.classifyPlantImage(base64);

      if (classifications.length === 0) {
        return null;
      }

      // Map image classifications to agricultural categories
      const healthMap: Record<string, string> = {
        'healthy': 'সুস্থ',
        'disease': 'রোগাক্রান্ত',
        'pest': 'পোকা আক্রান্ত',
        'deficiency': 'পুষ্টির অভাব',
      };

      const topPrediction = classifications[0];
      const healthStatus = this.mapToHealthStatus(topPrediction.label);

      return {
        plantHealth: healthStatus,
        possibleIssues: classifications.slice(0, 3).map(c => c.label),
        confidence: topPrediction.score * 100
      };
    } catch (error) {
      console.warn('Pre-analysis failed:', error);
      return null;
    }
  }

  /**
   * Generate Bangla text for agricultural queries
   * Uses fill-mask for completing agricultural sentences
   */
  async completeBanglaSentence(partialSentence: string): Promise<string> {
    if (!this.hf) {
      return partialSentence;
    }

    try {
      const result = await this.hf.fillMask({
        model: HF_BANGLA_MODELS.BANGLA_BERT.id,
        inputs: partialSentence,
      });

      const predictions = Array.isArray(result) ? result : [result];
      return predictions[0]?.sequence || partialSentence;
    } catch (error) {
      console.warn('Bangla sentence completion failed:', error);
      return partialSentence;
    }
  }

  /**
   * Convert Hugging Face classification to AnalysisResult format
   * Integrates with existing cost-aware analyzer
   */
  async analyzeWithHF(
    base64: string,
    mimeType: string,
    options: {
      cropFamily?: string;
      lang?: string;
    }
  ): Promise<AnalysisResult | null> {
    try {
      // Get image classification from HF
      const classifications = await this.classifyPlantImage(base64);

      if (classifications.length === 0) {
        return null;
      }

      const topPrediction = classifications[0];
      const healthStatus = this.mapToHealthStatus(topPrediction.label);

      // Generate simple advisory based on classification
      const advisory = this.generateSimpleAdvisory(
        topPrediction.label,
        options.cropFamily || 'ধান',
        options.lang || 'bn'
      );

      return {
        diagnosis: topPrediction.label,
        category: this.mapToCategory(topPrediction.label),
        confidence: Math.round(topPrediction.score * 100),
        advisory,
        fullText: `${topPrediction.label}\n\n${advisory}`,
        officialSource: `Hugging Face: ${HF_BANGLA_MODELS.PLANT_DISEASE.name}`,
        groundingChunks: []
      };
    } catch (error) {
      console.warn('HF analysis failed:', error);
      return null;
    }
  }

  /**
   * Helper: Map image labels to health status in Bangla
   */
  private mapToHealthStatus(label: string): string {
    const healthMap: Record<string, string> = {
      'healthy': 'সুস্থ',
      'disease': 'রোগাক্রান্ত',
      'pest': 'পোকা আক্রান্ত',
      'deficiency': 'পুষ্টির অভাব',
      'yellow': 'হলুদ পাতা',
      'brown_spot': 'বাদামী দাগ',
      'blast': 'ব্লাস্ট রোগ',
      'blight': 'ব্লাইট রোগ',
    };

    // Check for exact matches first
    if (healthMap[label.toLowerCase()]) {
      return healthMap[label.toLowerCase()];
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(healthMap)) {
      if (label.toLowerCase().includes(key)) {
        return value;
      }
    }

    return label;
  }

  /**
   * Helper: Map labels to analysis categories
   */
  private mapToCategory(label: string): 'Pest' | 'Disease' | 'Deficiency' | 'Other' {
    const lowerLabel = label.toLowerCase();

    if (lowerLabel.includes('pest') || lowerLabel.includes('insect') || lowerLabel.includes('bug')) {
      return 'Pest';
    }

    if (lowerLabel.includes('disease') || lowerLabel.includes('fungus') ||
        lowerLabel.includes('blast') || lowerLabel.includes('blight') ||
        lowerLabel.includes('spot') || lowerLabel.includes('rot')) {
      return 'Disease';
    }

    if (lowerLabel.includes('deficiency') || lowerLabel.includes('nitrogen') ||
        lowerLabel.includes('phosphorus') || lowerLabel.includes('potassium') ||
        lowerLabel.includes('yellow')) {
      return 'Deficiency';
    }

    return 'Other';
  }

  /**
   * Helper: Generate simple advisory in Bangla/English
   */
  private generateSimpleAdvisory(
    issue: string,
    cropFamily: string,
    lang: string = 'bn'
  ): string {
    const advisories: Record<string, { bn: string; en: string }> = {
      'healthy': {
        bn: `您的 ${cropFamily} 作物看起来健康。继续良好的护理实践。定期浇水并使用有机肥料。`,
        en: `Your ${cropFamily} crop looks healthy. Continue good care practices. Water regularly and use organic fertilizers.`
      },
      'blast': {
        bn: `ধানের ব্লাস্ট রোগ শনাক্ত হয়েছে। DAE অনুমোদিত ছত্রাকনাশক স্প্রে করুন। আক্রান্ত গাপ আলাদা করুন।`,
        en: `Rice blast disease detected. Spray DAE-approved fungicide. Remove infected plants.`
      },
      'blight': {
        bn: `ব্লাইট রোগ শনাক্ত হয়েছে। তামা ভিত্তিক ছত্রাকনাশক ব্যবহার করুন। ক্ষেত শুকনো রাখুন।`,
        en: `Blight disease detected. Use copper-based fungicide. Keep field dry.`
      },
      'deficiency': {
        bn: `পুষ্টির অভাব দেখা যাচ্ছে। BARC 2024 গাইড অনুযায়ী সার প্রয়োগ করুন।`,
        en: `Nutrient deficiency detected. Apply fertilizer according to BARC 2024 guide.`
      },
      'pest': {
        bn: `পোকা আক্রমণ শনাক্ত হয়েছে। জৈব বালাইনাশক বা নিম তেল ব্যবহার করুন।`,
        en: `Pest infestation detected. Use organic pesticide or neem oil.`
      }
    };

    // Find matching advisory
    for (const [key, value] of Object.entries(advisories)) {
      if (issue.toLowerCase().includes(key)) {
        return lang === 'bn' ? value.bn : value.en;
      }
    }

    // Default advisory
    return lang === 'bn'
      ? `সমস্যা শনাক্ত হয়েছে। স্থানীয় DAE অফিসারের পরামর্শ নিন।`
      : `Issue detected. Consult local DAE officer.`;
  }

  /**
   * Helper: Convert base64 to blob
   */
  private async base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
    const response = await fetch(`data:${mimeType};base64,${base64}`);
    return await response.blob();
  }
}

// Export singleton instance
export const hfService = new HuggingFaceService();
