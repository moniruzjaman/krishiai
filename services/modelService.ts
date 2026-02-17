import { AnalysisResult } from '../types';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { decodeBase64, decodeAudioData } from './geminiService';

// --- Model Definitions ---
export type ModelProvider = 'gemini' | 'openrouter' | 'local';
export interface AIModel {
  id: string;
  name: string;
  provider: ModelProvider;
  supportsAudio?: boolean;
  maxTokens?: number;
  isFree?: boolean;
}

export const AVAILABLE_MODELS: Record<string, AIModel> = {
  // Gemini (requires API_KEY)
  'gemini-3-flash-preview': {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    provider: 'gemini',
    supportsAudio: true,
    isFree: false,
  },
  'gemini-2.5-flash-image': {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    provider: 'gemini',
    supportsAudio: false,
    isFree: false,
  },
  'gemini-2.5-flash-preview-tts': {
    id: 'gemini-2.5-flash-preview-tts',
    name: 'Gemini TTS',
    provider: 'gemini',
    supportsAudio: true,
    isFree: false,
  },

  // OpenRouter free models (require OPENROUTER_API_KEY)
  'openai/gpt-3.5-turbo': {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo (Free Tier)',
    provider: 'openrouter',
    supportsAudio: false,
    isFree: true,
  },
  'google/gemini-flash-1.5': {
    id: 'google/gemini-flash-1.5',
    name: 'Gemini Flash 1.5 (OpenRouter)',
    provider: 'openrouter',
    supportsAudio: false,
    isFree: true,
  },
  'meta-llama/llama-3.1-8b-chat': {
    id: 'meta-llama/llama-3.1-8b-chat',
    name: 'Llama 3.1 8B Chat',
    provider: 'openrouter',
    supportsAudio: false,
    isFree: true,
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
    }
  ): Promise<AnalysisResult>;

  getLiveWeather(lat: number, lng: number, lang: string): Promise<any>;
}

// --- Default Model Selection ---
const getDefaultModelId = (): string => {
  return import.meta.env.VITE_DEFAULT_MODEL ||
         process.env.DEFAULT_MODEL ||
         'gemini-3-flash-preview';
};

// --- Singleton Instance ---
let _modelService: AIService | null = null;

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
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
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
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
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

  async generateSpeech(text: string, options?: { modelId?: string }) {
    // OpenRouter does NOT support TTS natively → fallback to Gemini or skip
    // We'll throw to force fallback in caller
    throw new Error('OpenRouter does not support speech synthesis. Falling back to Gemini.');
  }

  async analyzeImage(base64: string, mimeType: string, options?: any) {
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
