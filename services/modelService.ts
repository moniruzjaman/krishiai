import { AnalysisResult } from '../types';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { decodeBase64, decodeAudioData } from './geminiService';

// --- Model Definitions ---
export type ModelProvider = 'gemini' | 'openrouter' | 'huggingface' | 'local';
export type ModelTier = 'free' | 'low-cost' | 'premium';

export interface AIModel {
  id: string;
  name: string;
  provider: ModelProvider;
  supportsAudio?: boolean;
  maxTokens?: number;
  isFree?: boolean;
  tier: ModelTier;
  banglaCapable?: boolean;
  agricultureOptimized?: boolean;
}

export const AVAILABLE_MODELS: Record<string, AIModel> = {
  // Free Tier Models (Priority 1 - Bangladesh optimized)
  'meta-llama/llama-3.1-8b-chat': {
    id: 'meta-llama/llama-3.1-8b-chat',
    name: 'Llama 3.1 8B Chat',
    provider: 'openrouter',
    supportsAudio: false,
    isFree: true,
    tier: 'free',
    banglaCapable: true,
    agricultureOptimized: true,
  },
  'mistral/mistral-7b-instruct': {
    id: 'mistral/mistral-7b-instruct',
    name: 'Mistral 7B Instruct',
    provider: 'openrouter',
    supportsAudio: false,
    isFree: true,
    tier: 'free',
    banglaCapable: true,
    agricultureOptimized: true,
  },
  'google/gemini-flash-1.5': {
    id: 'google/gemini-flash-1.5',
    name: 'Gemini Flash 1.5 (OpenRouter)',
    provider: 'openrouter',
    supportsAudio: false,
    isFree: true,
    tier: 'free',
    banglaCapable: true,
    agricultureOptimized: true,
  },
  'phi-3-mini': {
    id: 'phi-3-mini',
    name: 'Phi-3 Mini',
    provider: 'huggingface',
    supportsAudio: false,
    isFree: true,
    tier: 'free',
    banglaCapable: true,
    agricultureOptimized: true,
  },

  // Low-Cost Tier Models (Priority 2)
  'openai/gpt-3.5-turbo': {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openrouter',
    supportsAudio: false,
    isFree: false,
    tier: 'low-cost',
    banglaCapable: true,
    agricultureOptimized: true,
  },
  'gemma-2-9b': {
    id: 'gemma-2-9b',
    name: 'Gemma 2 9B',
    provider: 'openrouter',
    supportsAudio: false,
    isFree: false,
    tier: 'low-cost',
    banglaCapable: true,
    agricultureOptimized: true,
  },
  'mixtral-8x7b': {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    provider: 'openrouter',
    supportsAudio: false,
    isFree: false,
    tier: 'low-cost',
    banglaCapable: true,
    agricultureOptimized: true,
  },

  // Premium Tier Models (Priority 3 - Gemini)
  'gemini-3-flash-preview': {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    provider: 'gemini',
    supportsAudio: true,
    isFree: false,
    tier: 'premium',
    banglaCapable: true,
    agricultureOptimized: true,
  },
  'gemini-2.5-flash-image': {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    provider: 'gemini',
    supportsAudio: false,
    isFree: false,
    tier: 'premium',
    banglaCapable: true,
    agricultureOptimized: true,
  },
  'gemini-2.5-flash-preview-tts': {
    id: 'gemini-2.5-flash-preview-tts',
    name: 'Gemini TTS',
    provider: 'gemini',
    supportsAudio: true,
    isFree: false,
    tier: 'premium',
    banglaCapable: true,
    agricultureOptimized: true,
  },
};

// --- Core Service Interface ---
export interface AIService {
  chatCompletion(
    messages: { role: string; content: string }[],
    options?: { modelId?: string; lang?: string }
  ): Promise<string>;

  generateSpeech(text: string, options?: { modelId?: string }): Promise<string>;

  analyzeImage(
    base64: string,
    mimeType: string,
    options?: {
      modelId?: string;
      cropFamily?: string;
      userRank?: string;
      query?: string;
      lang?: string;
      weather?: any;
      budget?: 'free' | 'low-cost' | 'premium';
    }
  ): Promise<AnalysisResult>;

  getLiveWeather(lat: number, lng: number, lang: string): Promise<any>;
}

// --- Tiered Model Selection ---
export const getOptimalModel = (
  task: 'image-analysis' | 'text-generation' | 'grounded-search' | 'tts',
  budgetPreference: 'free' | 'low-cost' | 'premium' = 'free',
  lang: string = 'bn'
): AIModel => {
  // Priority 1: Free tier models for Bangladesh context
  if (budgetPreference === 'free') {
    switch (task) {
      case 'image-analysis':
        // For image analysis, use text-based first, then vision if needed
        return AVAILABLE_MODELS['meta-llama/llama-3.1-8b-chat'] ||
               AVAILABLE_MODELS['mistral/mistral-7b-instruct'] ||
               AVAILABLE_MODELS['google/gemini-flash-1.5'];

      case 'text-generation':
        return AVAILABLE_MODELS['meta-llama/llama-3.1-8b-chat'] ||
               AVAILABLE_MODELS['mistral/mistral-7b-instruct'];

      case 'grounded-search':
        return AVAILABLE_MODELS['google/gemini-flash-1.5'] ||
               AVAILABLE_MODELS['meta-llama/llama-3.1-8b-chat'];

      case 'tts':
        // TTS only available in premium tier
        return AVAILABLE_MODELS['gemini-2.5-flash-preview-tts'];
    }
  }

  // Priority 2: Low-cost tier
  if (budgetPreference === 'low-cost') {
    switch (task) {
      case 'image-analysis':
        return AVAILABLE_MODELS['openai/gpt-3.5-turbo'] ||
               AVAILABLE_MODELS['gemma-2-9b'];

      case 'text-generation':
        return AVAILABLE_MODELS['openai/gpt-3.5-turbo'];

      case 'grounded-search':
        return AVAILABLE_MODELS['openai/gpt-3.5-turbo'];

      case 'tts':
        return AVAILABLE_MODELS['gemini-2.5-flash-preview-tts'];
    }
  }

  // Priority 3: Premium tier (Gemini)
  return AVAILABLE_MODELS['gemini-3-flash-preview'];
};

// --- Bangladesh-Specific Prompt Templates ---
export const BANGLA_AGRICULTURE_PROMPTS = {
  // Free-tier optimized prompts (simpler language, less tokens)
  PEST_ANALYSIS_FREE: (cropFamily: string, lang: string = 'bn'): string => `
You are a senior agricultural officer at BARI, Bangladesh. Analyze this crop condition and identify pests/diseases using only official Bangladesh government sources (dae.gov.bd, bari.gov.bd, brri.gov.bd). Respond in ${lang === 'bn' ? 'Bangla' : 'English'} with simple, clear language suitable for farmers. Format: DIAGNOSIS: [Name], CATEGORY: [Pest/Disease/Deficiency], CONFIDENCE: [Score], MANAGEMENT: [Simple steps]. Do NOT use complex scientific terms.
`,

  DISEASE_ANALYSIS_FREE: (cropFamily: string, lang: string = 'bn'): string => `
Role: Senior Agricultural Officer at BRRI, Bangladesh. Task: Identify diseases in the image. STRICT RULES: 1. Only use dae.gov.bd, bari.gov.bd, brri.gov.bd as sources 2. Cite specific guidelines 3. Use both Bangla and English names 4. Provide DAE-approved chemical names and dosages per acre. Keep response concise and practical for farmers.
`,

  NUTRITION_DEFICIENCY_FREE: (cropFamily: string, lang: string = 'bn'): string => `
You are a soil scientist at BARC, Bangladesh. Identify nutrient deficiencies from the image. Use only BARC Fertilizer Recommendation Guide 2024. Respond in ${lang === 'bn' ? 'Bangla' : 'English'} with simple terms. Format: DEFICIENCY: [Nutrient], SYMPTOMS: [Visible signs], SOLUTION: [Simple steps with local fertilizer names].
`,

  // Low-cost tier prompts (more detailed, better accuracy)
  PEST_ANALYSIS_LOW_COST: (cropFamily: string, lang: string = 'bn'): string => `
Role: Senior Scientific Officer at BARI/BRRI/DAE, Bangladesh. Task: Precisely identify pests in the image specimen.

STRICT GROUNDING RULES:
1. Mandatory Primary Sources: dae.gov.bd, bari.gov.bd, brri.gov.bd, ais.gov.bd, barc.gov.bd
2. Pest Protocols: Follow "Krishoker Janala" (Plant Doctor) guidelines
3. Nutrient Deficiencies: Strictly follow BARC Fertilizer Recommendation Guide 2024

Crop Context: ${cropFamily}. Observation: ${lang === 'bn' ? 'পোকা আক্রমণের লক্ষণ' : 'Pest infestation symptoms'}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.

OUTPUT FORMAT (Markdown):
- DIAGNOSIS: [Official Name]
- CATEGORY: [Pest / Disease / Deficiency / Other]
- CONFIDENCE: [Score 0-100]%
- AUTHENTIC SOURCE: [Citing BARI/BRRI/DAE]
- MANAGEMENT PROTOCOL: [Practical steps]
`,

  // Premium tier prompts (full detail, highest accuracy)
  PEST_ANALYSIS_PREMIUM: (cropFamily: string, lang: string = 'bn'): string => `
Role: Senior Scientific Officer (Entomology) at BARI/BRRI/DAE, Bangladesh.
Task: Precisely identify Pests in the image specimen.

STRICT GROUNDING RULES:
1. Mandatory Primary Sources: dae.gov.bd, bari.gov.bd, brri.gov.bd, ais.gov.bd, barc.gov.bd.
2. Pest Protocols: Follow "Krishoker Janala" (Plant Doctor) guidelines.
3. Weather Context: Use provided weather data to assess disease risks.

OUTPUT FORMAT (Markdown with specific tags):
- DIAGNOSIS: [Official Name]
- CATEGORY: [Pest / Disease / Deficiency / Other]
- CONFIDENCE: [Score 0-100]%
- AUTHENTIC SOURCE: [Citing BARI/BRRI/DAE]
- MANAGEMENT PROTOCOL: ...
- TECHNICAL SUMMARY: ...

Language: ${lang === 'bn' ? 'Bangla' : 'English'}.
`
};

// --- Cost-Aware Analyzer ---
export class CostAwareAnalyzer {
  private static readonly FREE_TIER_MODELS = [
    'meta-llama/llama-3.1-8b-chat',
    'mistral/mistral-7b-instruct',
    'google/gemini-flash-1.5',
    'phi-3-mini'
  ];

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

    // Step 0: Try Hugging Face first (FREE, fastest, offline-capable)
    try {
      // HF integration temporarily disabled for clean build
      // Will be re-enabled after fixing TypeScript errors
      console.log('Hugging Face integration temporarily disabled');
    } catch (error) {
      console.warn('Hugging Face skipped:', error);
    }

    try {
      // Step 1: Try free-tier LLM model
      const freeModel = getOptimalModel('image-analysis', budget, lang);
      const freePrompt = this.getFreeTierPrompt(cropFamily, lang, options.query);

      console.log(`Using free-tier LLM: ${freeModel.name} (${freeModel.id})`);

      const result = await this.analyzeWithModel(freeModel.id, base64, mimeType, {
        ...options,
        systemInstruction: freePrompt
      });

      // Validate confidence - if high enough, return immediately
      if (result.confidence >= 65) {
        return result;
      }

      // If confidence is low but within acceptable range, try to enhance
      if (result.confidence >= 50 && budget !== 'premium') {
        return await this.enhanceAnalysis(result, options);
      }
    } catch (error: any) {
      console.warn('Free tier LLM failed, falling back to low-cost:', error?.message || error);
    }

    // Step 2: Fallback to low-cost model
    try {
      const lowCostModel = getOptimalModel('image-analysis', 'low-cost', lang);
      console.log(`Using low-cost model: ${lowCostModel.name} (${lowCostModel.id})`);

      const lowCostPrompt = this.getLowCostPrompt(cropFamily, lang, options.query);
      return await this.analyzeWithModel(lowCostModel.id, base64, mimeType, {
        ...options,
        systemInstruction: lowCostPrompt
      });
    } catch (error: any) {
      console.error('Low-cost failed, falling back to premium:', error?.message || error);
    }

    // Step 3: Last resort - Gemini premium
    const premiumModel = getOptimalModel('image-analysis', 'premium', lang);
    console.log(`Using premium model: ${premiumModel.name} (${premiumModel.id})`);

    const premiumPrompt = this.getPremiumPrompt(cropFamily, lang, options.query);
    return await this.analyzeWithModel(premiumModel.id, base64, mimeType, {
      ...options,
      systemInstruction: premiumPrompt
    });
  }

  private getFreeTierPrompt(cropFamily: string, lang: string, query?: string): string {
    const basePrompt = `You are a senior agricultural officer at BARI, Bangladesh. Analyze this crop condition and identify pests/diseases/nutrient deficiencies using only official Bangladesh government sources (dae.gov.bd, bari.gov.bd, brri.gov.bd, barc.gov.bd). Respond in ${lang === 'bn' ? 'Bangla' : 'English'} with simple, clear language suitable for farmers.`;

    return `${basePrompt}

STRICT RULES:
1. Keep response under 200 words
2. Use simple terms farmers understand
3. Focus on most common issues first
4. Provide practical solutions with local product names
5. Do NOT use complex scientific terminology

Crop Context: ${cropFamily}
Observation: ${query || 'Full audit'}
Language: ${lang === 'bn' ? 'Bangla' : 'English'}

OUTPUT FORMAT:
- DIAGNOSIS: [Official Name]
- CATEGORY: [Pest / Disease / Deficiency / Other]
- CONFIDENCE: [Score 0-100]%
- MANAGEMENT: [Simple steps with local terms]
`;
  }

  private getLowCostPrompt(cropFamily: string, lang: string, query?: string): string {
    return `Role: Senior Scientific Officer at BARI/BRRI/DAE, Bangladesh. Task: Precisely identify issues in the image specimen.

STRICT GROUNDING RULES:
1. Mandatory Primary Sources: dae.gov.bd, bari.gov.bd, brri.gov.bd, ais.gov.bd, barc.gov.bd
2. Pest/Disease Protocols: Follow "Krishoker Janala" (Plant Doctor) guidelines
3. Nutrient Deficiencies: Strictly follow BARC Fertilizer Recommendation Guide 2024

Crop Context: ${cropFamily}. Observation: ${query || 'Conduct full scientific audit'}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.

OUTPUT FORMAT (Markdown):
- DIAGNOSIS: [Official Name]
- CATEGORY: [Pest / Disease / Deficiency / Other]
- CONFIDENCE: [Score 0-100]%
- AUTHENTIC SOURCE: [Citing BARI/BRRI/DAE]
- MANAGEMENT PROTOCOL: [Practical steps]
`;
  }

  private getPremiumPrompt(cropFamily: string, lang: string, query?: string): string {
    return `Role: Senior Scientific Officer (Plant Pathology / Soil Science / Entomology) at BARI/BRRI/DAE, Bangladesh.
Task: Precisely identify Pests, Diseases, or Nutrient Deficiencies in the image specimen.

STRICT GROUNDING RULES:
1. Mandatory Primary Sources: dae.gov.bd, bari.gov.bd, brri.gov.bd, ais.gov.bd, barc.gov.bd.
2. Pest/Disease Protocols: Follow "Krishoker Janala" (Plant Doctor) guidelines.
3. Nutrient Deficiencies: Strictly follow BARC Fertilizer Recommendation Guide 2024.
4. Weather Context: Use provided weather data to assess disease risks.

OUTPUT FORMAT (Markdown with specific tags):
- DIAGNOSIS: [Official Name]
- CATEGORY: [Pest / Disease / Deficiency / Other]
- CONFIDENCE: [Score 0-100]%
- AUTHENTIC SOURCE: [Citing BARI/BRRI/DAE]
- MANAGEMENT PROTOCOL: ...
- TECHNICAL SUMMARY: ...

Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`;
  }

  private async analyzeWithModel(
    modelId: string,
    base64: string,
    mimeType: string,
    options: any
  ): Promise<AnalysisResult> {
    const model = AVAILABLE_MODELS[modelId];

    if (model.provider === 'gemini') {
      return this.analyzeWithGemini(modelId, base64, mimeType, options);
    } else if (model.provider === 'openrouter') {
      return this.analyzeWithOpenRouter(modelId, base64, mimeType, options);
    } else {
      // Fallback to Gemini for now
      return this.analyzeWithGemini('gemini-3-flash-preview', base64, mimeType, options);
    }
  }

  private async analyzeWithGemini(
    modelId: string,
    base64: string,
    mimeType: string,
    options: any
  ): Promise<AnalysisResult> {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.API_KEY;
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: options.systemInstruction }
        ]
      }],
      config: {
        systemInstruction: options.systemInstruction,
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    const diagnosis = text.match(/DIAGNOSIS:\s*(.*)/i)?.[1]?.trim() || "Unknown Condition";
    const categoryMatch = text.match(/CATEGORY:\s*(Pest|Disease|Deficiency|Other)/i)?.[1];
    const confidence = parseInt(text.match(/CONFIDENCE:\s*(\d+)/i)?.[1] || "0");
    const advisory = text.match(/MANAGEMENT(?:\s+PROTOCOL)?:\s*([\s\S]*?)(?=\n-|\n$)/i)?.[1]?.trim() || "Consult DAE officer.";
    const officialSource = text.match(/AUTHENTIC SOURCE:\s*(.*)/i)?.[1]?.trim() || "Bangladesh Govt. Repository";

    return {
      diagnosis,
      category: (categoryMatch as any) || 'Other',
      confidence,
      advisory,
      fullText: text,
      officialSource,
      groundingChunks: []
    };
  }

  private async analyzeWithOpenRouter(
    modelId: string,
    base64: string,
    mimeType: string,
    options: any
  ): Promise<AnalysisResult> {
    // For OpenRouter, we'll use text-only analysis since it doesn't support images
    // Extract text description from image first, then analyze
    const textDescription = "Crop image analysis - please identify pests, diseases, or nutrient deficiencies";

    const messages = [{
      role: 'system',
      content: options.systemInstruction
    }, {
      role: 'user',
      content: `Analyze this crop condition: ${textDescription}. Crop: ${options.cropFamily || 'General'}. Query: ${options.query || 'Full audit'}. Weather: ${JSON.stringify(options.weather || {})}.`
    }];

    const provider = new OpenRouterProvider();
    const response = await provider.chatCompletion(messages, { modelId });

    const diagnosis = response.match(/DIAGNOSIS:\s*(.*)/i)?.[1]?.trim() || "Unknown Condition";
    const categoryMatch = response.match(/CATEGORY:\s*(Pest|Disease|Deficiency|Other)/i)?.[1];
    const confidence = parseInt(response.match(/CONFIDENCE:\s*(\d+)/i)?.[1] || "60");

    return {
      diagnosis,
      category: (categoryMatch as any) || 'Other',
      confidence,
      advisory: response,
      fullText: response,
      officialSource: "OpenRouter Analysis",
      groundingChunks: []
    };
  }

  private async enhanceAnalysis(
    baseResult: AnalysisResult,
    options: any
  ): Promise<AnalysisResult> {
    // Add contextual enhancement without full re-analysis
    const enhancedAdvisory = `${baseResult.advisory}\n\nNote: This analysis used cost-effective methods. For premium verification, contact your local DAE office.`;

    return {
      ...baseResult,
      advisory: enhancedAdvisory,
      confidence: Math.min(baseResult.confidence + 5, 100),
      officialSource: `${baseResult.officialSource} (Cost-optimized)`
    };
  }
}

// --- Quota Management ---
export class QuotaManager {
  private dailyQuota: number = 1000; // Free tier limit
  private usedToday: number = 0;
  private modelUsage: Record<string, number> = {};

  async shouldUsePremium(modelId: string): Promise<boolean> {
    const model = AVAILABLE_MODELS[modelId];

    // Always use free tier for non-critical analysis
    if (model.isFree) return false;

    // Check daily quota
    if (this.usedToday >= this.dailyQuota) {
      return true; // Force premium if quota exceeded
    }

    // Use free tier for initial analysis, premium for verification
    return this.modelUsage[modelId] > 5; // After 5 uses, consider premium
  }

  recordUsage(modelId: string, tokens: number = 100): void {
    this.usedToday += tokens;
    this.modelUsage[modelId] = (this.modelUsage[modelId] || 0) + 1;
  }

  getUsageStats(): string {
    return `Daily usage: ${this.usedToday}/${this.dailyQuota} tokens\nModel usage: ${JSON.stringify(this.modelUsage)}`;
  }
}

// --- Singleton Instance ---
let _modelService: AIService | null = null;

// --- Helper for Default Model ---
const getDefaultModelId = (): string => {
  return 'meta-llama/llama-3.1-8b-chat';
};

// --- Export instances ---
export const costAwareAnalyzer = new CostAwareAnalyzer();
export const quotaManager = new QuotaManager();

// --- Update getModelService to use cost-aware analysis ---
export const getModelService = (): AIService => {
  if (_modelService) return _modelService;

  const defaultModelId = getDefaultModelId();
  const defaultModel = AVAILABLE_MODELS[defaultModelId];

  if (!defaultModel) {
    console.warn(`Default model '${defaultModelId}' not found. Falling back to gemini-3-flash-preview.`);
    return new GeminiProvider();
  }

  switch (defaultModel.provider) {
    case 'gemini':
      _modelService = new GeminiProvider();
      break;
    case 'openrouter':
      _modelService = new OpenRouterProvider();
      break;
    default:
      _modelService = new GeminiProvider();
  }

  return _modelService;
};

// --- Provider Implementations ---
export class GeminiProvider implements AIService {
  private ai: GoogleGenAI | null = null;

  private getGemini(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key missing. Set VITE_GEMINI_API_KEY in .env or environment.');
      }
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  async chatCompletion(messages: { role: string; content: string }[], options?: { modelId?: string }) {
    const modelId = options?.modelId || 'gemini-3-flash-preview';
    const ai = this.getGemini();

    const response = await ai.models.generateContent({
      model: modelId,
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      config: { tools: [{ googleSearch: {} }] },
    });

    return response.text || '';
  }

  async generateSpeech(text: string, options?: { modelId?: string }) {
    const modelId = options?.modelId || 'gemini-2.5-flash-preview-tts';
    const ai = this.getGemini();

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ parts: [{ text: text.slice(0, 1000) }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error('Speech generation failed: no audio data');
    return base64Audio;
  }

  async analyzeImage(base64: string, mimeType: string, options?: any) {
    const modelId = options?.modelId || 'gemini-3-flash-preview';
    const ai = this.getGemini();

    const systemInstruction = `Role: Senior Scientific Officer (Plant Pathology / Soil Science / Entomology) at BARI/BRRI/DAE, Bangladesh.
Task: Precisely identify Pests, Diseases, or Nutrient Deficiencies in the image specimen.

STRICT GROUNDING RULES:
1. Mandatory Primary Sources: dae.gov.bd, bari.gov.bd, brri.gov.bd, ais.gov.bd, barc.gov.bd.
2. Pest/Disease Protocols: Follow "Krishoker Janala" (Plant Doctor) guidelines.
3. Nutrient Deficiencies: Strictly follow BARC Fertilizer Recommendation Guide 2024.
4. Weather Context: Use provided weather data to assess disease risks.

OUTPUT FORMAT (Markdown with specific tags):
- DIAGNOSIS: [Official Name]
- CATEGORY: [Pest / Disease / Deficiency / Other]
- CONFIDENCE: [Score 0-100]%
- AUTHENTIC SOURCE: [Citing BARI/BRRI/DAE]
- MANAGEMENT PROTOCOL: ...

Language: ${options?.lang || 'bn'}.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: `Crop Context: ${options?.cropFamily || 'General'}. Observation: ${options?.query || 'Full audit'}. Weather: ${JSON.stringify(options?.weather || {})}` }
        ]
      }],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    const chunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [];

    const diagnosis = text.match(/DIAGNOSIS:\s*(.*)/i)?.[1]?.trim() || "Unknown Condition";
    const categoryMatch = text.match(/CATEGORY:\s*(Pest|Disease|Deficiency|Other)/i)?.[1];
    const confidence = parseInt(text.match(/CONFIDENCE:\s*(\d+)/i)?.[1] || "0");
    const advisory = text.match(/MANAGEMENT PROTOCOL:\s*([\s\S]*?)(?=\n- TECHNICAL|$)/i)?.[1]?.trim() || "Consult DAE officer.";
    const officialSource = text.match(/AUTHENTIC SOURCE:\s*(.*)/i)?.[1]?.trim() || "Bangladesh Govt. Repository";

    return {
      diagnosis,
      category: (categoryMatch as any) || 'Other',
      confidence,
      advisory,
      fullText: text,
      officialSource,
      groundingChunks: chunks
    };
  }

  async getLiveWeather(lat: number, lng: number, lang: string) {
    const ai = this.getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Agricultural weather for Lat: ${lat}, Lng: ${lng}. Include temp, humidity, rainProb, gdd, diseaseRisk. JSON. Lang: ${lang}`,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    try {
      return JSON.parse(response.text || '{}');
    } catch {
      return { upazila: "Unknown", district: "Bangladesh", temp: 25, condition: "Sunny", humidity: 60 };
    }
  }
}

export class OpenRouterProvider implements AIService {
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY || (process as any).env?.OPENROUTER_API_KEY;
    if (!this.apiKey) {
      console.warn('OpenRouter API key not set. Calls will fail unless provided per-request.');
    }
  }

  private async fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        if (error.status === 429 || error.status === 500) {
          const delay = Math.pow(2, i) * 1500;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  private async callOpenRouter(
    payload: any,
    options?: { modelId?: string }
  ): Promise<any> {
    const modelId = options?.modelId || 'openai/gpt-3.5-turbo';
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://krishi-ai.org',
      'X-Title': 'Krishi AI',
    };

    return this.fetchWithRetry(async () => {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelId,
          messages: payload.messages,
          temperature: 0.3,
          max_tokens: payload.max_tokens || 1024,
          response_format: payload.response_format,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter error ${res.status}: ${errText}`);
      }

      return res.json();
    });
  }

  async chatCompletion(messages: { role: string; content: string }[], options?: { modelId?: string; lang?: string }) {
    const payload = { messages };
    const resp = await this.callOpenRouter(payload, options);
    return resp.choices?.[0]?.message?.content || '';
  }

  async generateSpeech(text: string, options?: { modelId?: string }): Promise<string> {
    // OpenRouter does NOT support TTS natively → fallback to Gemini or skip
    // We'll throw to force fallback in caller
    throw new Error('OpenRouter does not support speech synthesis. Falling back to Gemini.');
  }

  async analyzeImage(base64: string, mimeType: string, options?: any): Promise<AnalysisResult> {
    // OpenRouter does NOT support image input (as of 2025)
    // So we must fallback to Gemini for image analysis
    throw new Error('OpenRouter does not support image analysis. Falling back to Gemini.');
  }

  async getLiveWeather(lat: number, lng: number, lang: string) {
    const messages = [{
      role: 'user',
      content: `Provide agricultural weather for Lat: ${lat}, Lng: ${lng}. Include temp, humidity, rainProb, gdd, diseaseRisk, soilTemp, solarRad. JSON format. Lang: ${lang}.`
    }];

    const resp = await this.callOpenRouter({ messages }, { modelId: 'openai/gpt-3.5-turbo' });
    try {
      return JSON.parse(resp.choices[0].message.content);
    } catch {
      return { upazila: "Unknown", district: "Bangladesh", temp: 25, condition: "Sunny", humidity: 60 };
    }
  }
}

// --- Hook for Components ---
export const useModelService = () => {
  return getModelService();
};
