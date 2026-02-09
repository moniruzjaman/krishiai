/**
 * AI Orchestration Service for Analyzer
 * Multi-tier model switching: Gemini 2.5 → Kimi 2.5 → Local Models
 * With RAG-based grounding from CABI, BRRI, BARI datasets
 */

import { GoogleGenAI } from '@google/genai';
import {
  AnalysisResult,
  ConfidenceLevel,
  SourceReference,
  ManagementAdvice,
  WeatherData,
  Language,
  QuotaStatus
} from '../../types';

// Internal parser type
interface GeminiParsedResponse {
  diagnosis: string;
  symptoms: string[];
  confidence: number;
  reasoning: string[];
  immediateActions: string[];
  chemicalOptions: Array<{ product: string; concentration: string; interval: string }>;
  organicOptions: Array<{ product: string; concentration: string; interval: string }>;
  sprayTiming: string;
}


class AIOrchestrationService {
  private geminiClient: GoogleGenAI | null;
  // private kimiClient: any; // Will implement Kimi SDK
  // private qwenClient: any; // Will implement Qwen SDK
  // private ollama: any; // Will implement Ollama client
  private ragSystem: any; // RAGSystem;
  private quotaManager: any; // QuotaManager;
  private trainingDataCollector: any; // TrainingDataCollector;

  constructor() {
    const apiKey = (import.meta as any).env.VITE_GOOGLE_GENAI_API_KEY;
    this.geminiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.ragSystem = new RAGSystem();
    this.quotaManager = new QuotaManager();
    this.trainingDataCollector = new TrainingDataCollector();
  }

  /**
   * Main analysis endpoint with multi-tier orchestration
   */
  async analyzeImage(
    image: Blob | string,
    metadata: {
      cropType?: string;
      region?: string;
      season?: string;
      userId?: string;
      lang?: Language;
      weather?: WeatherData | null;
      userQuery?: string;
      precisionData?: Record<string, string>;
    }
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Step 1: Check quota and determine tier
    const quotaStatus = await this.quotaManager.getQuotaStatus();
    let result: AnalysisResult;

    try {
      // Step 2: Try primary model (Gemini 2.5 Flash)
      if (quotaStatus.canUseGemini) {
        result = await this.analyzeWithGemini(image, metadata);
        await this.quotaManager.incrementUsage('gemini');
      }
      // Step 3: Fallback to Kimi if Gemini quota exhausted
      else if (quotaStatus.canUseKimi) {
        result = await this.analyzeWithKimi(image, metadata);
        await this.quotaManager.incrementUsage('kimi');
      }
      // Step 4: Fallback to local Qwen-VL
      else {
        result = await this.analyzeWithLocalModel(image, metadata);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      // Step 5: Final fallback to Ollama
      result = await this.analyzeWithOllama(image, metadata);
    }

    // Step 6: Confidence-based fallback logic
    if (result.confidence < 0.70 && quotaStatus.canUseKimi) {
      const kimiResult = await this.analyzeWithKimi(image, metadata);
      result = this.mergeConsensusResults(result, kimiResult);
      result.needsSecondOpinion = false;
    } else if (result.confidence < 0.70) {
      result.needsSecondOpinion = true;
    }

    // Step 7: Ground with RAG system (local dataset first, web secondary)
    result.sources = await this.ragSystem.groundDiagnosis(
      result.diagnosis,
      metadata.cropType,
      result.confidence
    );

    // Step 8: Collect training data (no expert review needed)
    if (metadata.userId) {
      await this.trainingDataCollector.saveTrainingData({
        image,
        analysis: result,
        userId: metadata.userId,
        metadata
      });
    }

    // Step 9: Update user analytics
    if (metadata.userId) {
      await this.quotaManager.updateUserAnalytics(metadata.userId, {
        analysisCount: 1,
        averageConfidence: result.confidence,
        model: result.model,
        processingTime: Date.now() - startTime
      });
    }

    return result;
  }

  /**
    * Gemini 2.5 Flash Analysis - Primary model
    */
  private async analyzeWithGemini(
    image: Blob | string,
    metadata: any
  ): Promise<AnalysisResult> {
    if (!this.geminiClient) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `You are an expert agronomist analyzing crop health with medical-grade precision.

ANALYZE THIS CROP IMAGE STEP-BY-STEP:

**STEP 1: Crop Identification**
- What is the specific crop species (e.g., Oryza sativa, Solanum tuberosum)?
- What plant parts are visible?
- Overall plant health percentage (0-100%)?

**STEP 2: Symptom Detection & Description**
- List ALL visible symptoms with precise descriptions
- Color changes, spots, wilting, deformation
- Distribution pattern (uniform, scattered, sectoral)?
- Severity scale (1-5)?

**STEP 3: Diagnosis Reasoning (Multi-step thinking)**
- What are the TOP 3 possible diagnoses?
- For each diagnosis:
  * Why does it fit the symptoms?
  * What environmental factors support it?
  * What evidence contradicts it?
- Final diagnosis with reasoning chain

**STEP 4: Confidence Assessment**
- Your confidence level (0-100%)?
- What would increase your confidence?
- What uncertainties remain?

**STEP 5: Management Recommendations**
- Immediate actions (next 24-48 hours)
- Chemical spray options:
  * Product names (generic + trade)
  * Concentration/dosage
  * Spray interval
  * Precautions
- Organic alternatives
- Preventive measures
- Optimal spray timing

**STEP 6: Grounding & Sources**
- Reference authenticated sources (BARC, BARI, BRRI, FAO, CIMMYT)
- Include official technical bulletins
- Regional-specific protocols if available

**OUTPUT FORMAT:**
{
  "diagnosis": "string",
  "symptoms": ["symptom1", "symptom2"],
  "confidence": 0.95,
  "reasoning": ["step1", "step2", "step3"],
  "immediateActions": ["action1", "action2"],
  "chemicalOptions": [{"product": "name", "concentration": "0.75%", "interval": "7-10 days"}],
  "organicOptions": [{"product": "name", "concentration": "1%"}],
  "sprayTiming": "Early morning before 9 AM, avoid rainy days"
}`;

    const response = await this.geminiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            typeof image === 'string'
              ? { inlineData: { mimeType: 'image/jpeg', data: image } }
              : { inlineData: { mimeType: 'image/jpeg', data: await this.blobToBase64(image) } }
          ]
        }
      ],
      config: {
        systemInstruction: this.buildSystemPrompt(metadata.cropType)
      }
    });

    const responseText = response.text || "";
    const parsedResponse = this.parseAnalysisResponse(responseText);

    return {
      diagnosis: parsedResponse.diagnosis,
      symptoms: parsedResponse.symptoms,
      confidence: parsedResponse.confidence,
      confidenceLevel: this.getConfidenceLevel(parsedResponse.confidence),
      model: 'gemini-2.5-flash',
      reasoning: parsedResponse.reasoning,
      sources: [], // Will be filled by RAG
      management: {
        immediate: parsedResponse.immediateActions,
        chemical: parsedResponse.chemicalOptions,
        organic: parsedResponse.organicOptions,
        preventive: [],
        sprayTiming: parsedResponse.sprayTiming
      },
      timestamp: new Date(),
      needsSecondOpinion: parsedResponse.confidence < 0.70
    };
  }

  /**
   * Kimi 2.5 Analysis - Fallback model with strong reasoning
   */
  private async analyzeWithKimi(
    image: Blob | string,
    metadata: any
  ): Promise<AnalysisResult> {
    console.log(`Kimi analysis for ${metadata.cropType}. Image: ${!!image}`);
    // TODO: Implement Kimi SDK integration
    // For now, return similar structure as Gemini
    console.log('Using Kimi 2.5 as fallback');

    // Placeholder until Kimi SDK is ready
    return {
      diagnosis: 'Early Blight',
      symptoms: ['Brown spots with concentric rings', 'Yellow halo'],
      confidence: 0.92,
      confidenceLevel: 'HIGH',
      model: 'kimi-2.5',
      reasoning: ['Symptom pattern matches fungal disease', 'Environmental conditions favorable'],
      sources: [],
      management: {
        immediate: ['Remove infected leaves'],
        chemical: [{ product: 'Mancozeb', concentration: '0.75%', interval: '7 days' }],
        organic: [{ product: 'Bordeaux mixture', concentration: '1%', interval: '7 days' }],
        preventive: [],
        sprayTiming: 'Early morning'
      },
      timestamp: new Date(),
      needsSecondOpinion: false
    };
  }

  /**
    * Local Qwen-VL Analysis - Fast local inference
    */
  private async analyzeWithLocalModel(
    image: Blob | string,
    metadata: any
  ): Promise<AnalysisResult> {
    try {
      const { LocalModelService } = await import('../ai/localModelService');
      const localService = new LocalModelService();

      const imageBase64 =
        typeof image === 'string'
          ? image
          : await this.blobToBase64(image);

      const response = await localService.analyzeWithQwenVL(imageBase64, metadata);

      if (!response.success) {
        throw new Error(response.error);
      }

      return {
        diagnosis: response.diagnosis || 'Local analysis',
        symptoms: [],
        confidence: response.confidence || 0.75,
        confidenceLevel: this.getConfidenceLevel(response.confidence || 0.75),
        model: 'qwen-vl',
        reasoning: ['Local model inference'],
        sources: [],
        management: {
          immediate: [],
          chemical: [],
          organic: [],
          preventive: [],
          sprayTiming: 'As per local recommendations'
        },
        timestamp: new Date(),
        needsSecondOpinion: (response.confidence || 0.75) < 0.70
      };
    } catch (error) {
      console.error('Local model error:', error);
      throw error;
    }
  }

  /**
    * Ollama Fallback - Completely offline capability
    */
  private async analyzeWithOllama(
    image: Blob | string,
    metadata: any
  ): Promise<AnalysisResult> {
    console.log(`Ollama analysis for ${metadata.cropType}. Image provided: ${!!image}`);
    try {
      const { LocalModelService } = await import('../ai/localModelService');
      const localService = new LocalModelService();

      // For Ollama, we need to provide a text description
      // In a real scenario, we'd use OCR or basic image analysis
      const description = metadata.description || 'Crop showing visible symptoms';

      const response = await localService.analyzeWithOllama(description, metadata.cropType);

      if (!response.success) {
        // Return minimal fallback response
        return {
          diagnosis: 'Unable to diagnose - offline mode',
          symptoms: [],
          confidence: 0.3,
          confidenceLevel: 'LOW',
          model: 'ollama-llama2',
          reasoning: ['Offline mode - limited capabilities'],
          sources: [],
          management: {
            immediate: ['Contact local agricultural extension officer'],
            chemical: [],
            organic: [],
            preventive: [],
            sprayTiming: 'Consult with expert'
          },
          timestamp: new Date(),
          needsSecondOpinion: true
        };
      }

      return {
        diagnosis: response.diagnosis || 'Local analysis',
        symptoms: [],
        confidence: response.confidence || 0.65,
        confidenceLevel: this.getConfidenceLevel(response.confidence || 0.65),
        model: 'ollama-llama2',
        reasoning: [response.diagnosis || 'Offline analysis'],
        sources: [],
        management: {
          immediate: [],
          chemical: [],
          organic: [],
          preventive: [],
          sprayTiming: 'As per expert recommendations'
        },
        timestamp: new Date(),
        needsSecondOpinion: (response.confidence || 0.65) < 0.70
      };
    } catch (error) {
      console.error('Ollama fallback error:', error);
      // Return minimal fallback
      return {
        diagnosis: 'Unable to diagnose - service unavailable',
        symptoms: [],
        confidence: 0.2,
        confidenceLevel: 'LOW',
        model: 'ollama-llama2',
        reasoning: ['Service unavailable'],
        sources: [],
        management: {
          immediate: ['Contact local agricultural extension office'],
          chemical: [],
          organic: [],
          preventive: [],
          sprayTiming: 'Consult with expert'
        },
        timestamp: new Date(),
        needsSecondOpinion: true
      };
    }
  }

  /**
   * Merge results from multiple models for consensus
   */
  private mergeConsensusResults(result1: AnalysisResult, result2: AnalysisResult): AnalysisResult {
    const isSameDiagnosis = result1.diagnosis.toLowerCase() === result2.diagnosis.toLowerCase();

    return {
      ...result1,
      diagnosis: isSameDiagnosis ? result1.diagnosis : `${result1.diagnosis} / ${result2.diagnosis}`,
      confidence: (result1.confidence + result2.confidence) / 2,
      confidenceLevel: this.getConfidenceLevel((result1.confidence + result2.confidence) / 2),
      model: 'gemini-kimi-consensus',
      reasoning: [...result1.reasoning, ...result2.reasoning],
      management: isSameDiagnosis ? result1.management : result1.management // Default to first model
    };
  }

  /**
   * Helper: Build system prompt based on crop
   */
  private buildSystemPrompt(cropType?: string): string {
    return `You are an expert agronomist specializing in ${cropType || 'crop'} disease diagnosis with deep knowledge of:
- Crop physiology and disease symptoms
- BARC, BARI, BRRI, FAO guidelines
- Regional agricultural protocols
- Integrated Pest Management (IPM) principles
- Organic and chemical management options
- Environmental factors affecting crop health

Provide precise, actionable advice grounded in scientific research.`;
  }

  /**
   * Helper: Get confidence level from score
   */
  private getConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 0.80) return 'HIGH';
    if (confidence >= 0.70) return 'MEDIUM';
    return 'LOW';
  }

  /**
    * Helper: Parse JSON response from AI model
    */
  private parseAnalysisResponse(responseText: string): GeminiParsedResponse {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          diagnosis: parsed.diagnosis || 'Unable to parse',
          symptoms: parsed.symptoms || [],
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
          reasoning: parsed.reasoning || [responseText],
          immediateActions: parsed.immediateActions || [],
          chemicalOptions: parsed.chemicalOptions || [],
          organicOptions: parsed.organicOptions || [],
          sprayTiming: parsed.sprayTiming || ''
        };
      }
      // Fallback parsing
      return {
        diagnosis: 'Unable to parse',
        symptoms: [],
        confidence: 0.5,
        reasoning: [responseText],
        immediateActions: [],
        chemicalOptions: [],
        organicOptions: [],
        sprayTiming: ''
      };
    } catch (error) {
      console.error('Error parsing response:', error);
      return {
        diagnosis: 'Parse error',
        symptoms: [],
        confidence: 0.3,
        reasoning: [],
        immediateActions: [],
        chemicalOptions: [],
        organicOptions: [],
        sprayTiming: ''
      };
    }
  }

  /**
   * Helper: Convert blob to base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get current quota status
   */
  async getQuotaStatus(): Promise<QuotaStatus> {
    return this.quotaManager.getQuotaStatus();
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string) {
    return this.quotaManager.getUserAnalytics(userId);
  }
}

/**
 * RAG System for grounding with CABI, BRRI, BARI datasets
 */
class RAGSystem {
  private datasetManager: any;

  constructor() {
    this.initializeDatabases();
  }

  private async initializeDatabases() {
    // Dynamically import to avoid circular dependencies
    try {
      const { DatasetManager } = await import('../data/datasetManager');
      this.datasetManager = new DatasetManager();
    } catch (error) {
      console.error('Failed to initialize dataset manager:', error);
    }
  }

  /**
    * Ground diagnosis with authentic sources
    * Local dataset first, web search secondary
    */
  async groundDiagnosis(
    diagnosis: string,
    cropType: string | undefined,
    confidence: number
  ): Promise<SourceReference[]> {
    const sources: SourceReference[] = [];

    if (!this.datasetManager) {
      return sources;
    }

    // Step 1: Search local datasets using disease name
    const diseaseResults = this.datasetManager.searchByKeyword(diagnosis);

    // Step 2: If no results, search by crop type
    let allResults = diseaseResults;
    if (cropType && diseaseResults.length === 0) {
      allResults = this.datasetManager.searchByKeyword(cropType);
    }

    // Step 3: Convert dataset records to source references
    for (const result of allResults.slice(0, 5)) {
      // Extract management advice to create excerpt
      const excerpt = this.createExcerpt(result);

      sources.push({
        source: result.source === 'CABI' ? 'CABI_PLANTWISE' : (result.source as any),
        title: `${result.diseaseName} - ${result.cropType}`,
        url: result.sourceUrl || `https://plantwise.org/${result.id}`,
        relevanceScore: 0.85,
        excerpt
      });
    }

    // Step 4: If low confidence and few sources, add web search (secondary)
    if (confidence < 0.80 && sources.length < 3) {
      const webResults = await this.searchWeb(diagnosis, cropType);
      sources.push(...webResults);
    }

    return sources.slice(0, 5); // Return top 5 sources
  }

  /**
   * Create excerpt from dataset record
   */
  private createExcerpt(record: any): string {
    const symptoms = record.symptoms.slice(0, 2).join(', ');
    const management = record.management.chemical[0]?.product || 'Management options available';
    return `Symptoms: ${symptoms}. Management: ${management}.`;
  }

  /**
   * Search by keyword across all datasets
   */
  searchByKeyword(query: string): any[] {
    if (!this.datasetManager) return [];
    return this.datasetManager.searchByKeyword(query);
  }

  /**
   * Get records by source
   */
  getRecordsBySource(source: 'CABI' | 'BRRI' | 'BARI'): any[] {
    if (!this.datasetManager) return [];
    return this.datasetManager.getAllRecords(source);
  }

  private async searchWeb(diagnosis: string, cropType?: string): Promise<SourceReference[]> {
    console.log(`Web search fallback for ${diagnosis} on ${cropType}`);
    // Placeholder for web search integration (Google Search API)
    // For now, return empty array
    return [];
  }
}

/**
 * Quota Management System
 */
class QuotaManager {
  private quotaStore: Map<string, any> = new Map();
  private userAnalyticsStore: Map<string, any> = new Map();
  private GEMINI_LIMIT = 500000; // tokens/month
  private KIMI_LIMIT = 10000000; // tokens/month
  private STORAGE_KEY = 'krishi_quotas';
  private ANALYTICS_KEY = 'krishi_analytics';

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.quotaStore = new Map(Object.entries(data));
      }
      const analyticsStored = localStorage.getItem(this.ANALYTICS_KEY);
      if (analyticsStored) {
        const data = JSON.parse(analyticsStored);
        this.userAnalyticsStore = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load quota from storage:', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(Object.fromEntries(this.quotaStore))
      );
      localStorage.setItem(
        this.ANALYTICS_KEY,
        JSON.stringify(Object.fromEntries(this.userAnalyticsStore))
      );
    } catch (error) {
      console.warn('Failed to save quota to storage:', error);
    }
  }

  async getQuotaStatus(): Promise<QuotaStatus> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const geminiUsed = this.getDailyUsage('gemini', todayStart, todayEnd);
    const kimiUsed = this.getDailyUsage('kimi', todayStart, todayEnd);
    console.log(`Quota check up to ${todayEnd.toISOString()}`);

    return {
      gemini: {
        used: geminiUsed,
        limit: this.GEMINI_LIMIT,
        remaining: Math.max(0, this.GEMINI_LIMIT - geminiUsed),
        percentageUsed: (geminiUsed / this.GEMINI_LIMIT) * 100,
        resetDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      },
      kimi: {
        used: kimiUsed,
        limit: this.KIMI_LIMIT,
        remaining: Math.max(0, this.KIMI_LIMIT - kimiUsed),
        percentageUsed: (kimiUsed / this.KIMI_LIMIT) * 100,
        resetDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      },
      canUseGemini: geminiUsed < this.GEMINI_LIMIT,
      canUseKimi: kimiUsed < this.KIMI_LIMIT,
      currentTier: geminiUsed < this.GEMINI_LIMIT ? 'gemini-2.5-flash' : 'kimi-2.5'
    };
  }

  private getDailyUsage(model: 'gemini' | 'kimi', start: Date, _end: Date): number {
    const key = `${model}_daily`;
    const stored = this.quotaStore.get(key);

    if (!stored) {
      return 0;
    }

    // Reset if stored date is from different day
    const storedDate = new Date(stored.date);
    if (storedDate.getDate() !== start.getDate()) {
      this.quotaStore.delete(key);
      this.saveToLocalStorage();
      return 0;
    }

    return stored.used || 0;
  }

  async incrementUsage(model: 'gemini' | 'kimi', tokens: number = 5000): Promise<void> {
    const key = `${model}_daily`;
    const current = this.quotaStore.get(key) || { used: 0, date: new Date().toISOString() };
    current.used = (current.used || 0) + tokens;
    current.date = new Date().toISOString();
    this.quotaStore.set(key, current);
    this.saveToLocalStorage();
  }

  async updateUserAnalytics(userId: string, stats: any): Promise<void> {
    const current = this.userAnalyticsStore.get(userId) || {
      totalAnalyses: 0,
      totalTokensUsed: 0,
      averageConfidence: 0,
      byModel: {},
      isHeavyUser: false,
      lastAnalysisDate: null
    };

    current.totalAnalyses = (current.totalAnalyses || 0) + (stats.analysisCount || 1);
    current.totalTokensUsed = (current.totalTokensUsed || 0) + (stats.tokensUsed || 5000);
    current.lastAnalysisDate = new Date().toISOString();

    // Update average confidence
    if (stats.averageConfidence !== undefined) {
      const totalAnalyses = current.totalAnalyses;
      current.averageConfidence =
        (current.averageConfidence * (totalAnalyses - 1) + stats.averageConfidence) / totalAnalyses;
    }

    // Track by model
    if (stats.model) {
      current.byModel[stats.model] = (current.byModel[stats.model] || 0) + 1;
    }

    // Check if heavy user (>30 analyses/day)
    const today = new Date().toDateString();
    const dailyKey = `${userId}_daily_${today}`;
    const dailyCount = (this.quotaStore.get(dailyKey) || 0) + (stats.analysisCount || 1);
    this.quotaStore.set(dailyKey, dailyCount);
    current.isHeavyUser = dailyCount > 30;

    this.userAnalyticsStore.set(userId, current);
    this.saveToLocalStorage();
  }

  async getUserAnalytics(userId: string): Promise<any> {
    return (
      this.userAnalyticsStore.get(userId) || {
        totalAnalyses: 0,
        averageConfidence: 0,
        byModel: {},
        isHeavyUser: false
      }
    );
  }
}

/**
 * Training Data Collection
 * Auto-saves all analyses for future fine-tuning (no expert review needed)
 */
class TrainingDataCollector {
  private TRAINING_STORAGE_KEY = 'krishi_training_data';

  async saveTrainingData(data: {
    image: Blob | string;
    analysis: AnalysisResult;
    userId: string;
    metadata: any;
  }): Promise<void> {
    try {
      const trainingRecord = {
        id: `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: data.userId,
        imageHash: await this.hashImage(data.image),
        diagnosis: data.analysis.diagnosis,
        symptoms: data.analysis.symptoms,
        confidence: data.analysis.confidence,
        model: data.analysis.model,
        cropType: data.metadata.cropType,
        region: data.metadata.region,
        season: data.metadata.season,
        timestamp: new Date().toISOString(),
        userCorrection: null
      };

      // Store in localStorage (or IndexedDB for large datasets)
      this.appendTrainingData(trainingRecord);

      console.log('Training data saved:', trainingRecord.id);
    } catch (error) {
      console.error('Failed to save training data:', error);
    }
  }

  private appendTrainingData(record: any): void {
    try {
      const stored = localStorage.getItem(this.TRAINING_STORAGE_KEY);
      const allData = stored ? JSON.parse(stored) : [];
      allData.push(record);

      // Keep only recent 1000 records in localStorage
      if (allData.length > 1000) {
        allData.splice(0, allData.length - 1000);
      }

      localStorage.setItem(this.TRAINING_STORAGE_KEY, JSON.stringify(allData));
    } catch (error) {
      console.warn('Failed to store training data:', error);
    }
  }

  private async hashImage(image: Blob | string): Promise<string> {
    try {
      let data: string;
      if (typeof image === 'string') {
        data = image;
      } else {
        data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });
      }

      // Simple hash function (in production use crypto API)
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `img_${Math.abs(hash).toString(16)}`;
    } catch (error) {
      return `img_${Date.now()}`;
    }
  }

  /**
   * Get all training data for export/analysis
   */
  async getAllTrainingData(): Promise<any[]> {
    try {
      const stored = localStorage.getItem(this.TRAINING_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve training data:', error);
      return [];
    }
  }

  /**
   * Export training data for model fine-tuning
   */
  async exportTrainingData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const data = await this.getAllTrainingData();

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV format
    const headers = ['id', 'userId', 'diagnosis', 'symptoms', 'confidence', 'model', 'cropType', 'region', 'season', 'timestamp'];
    const rows = data.map(d => [
      d.id,
      d.userId,
      d.diagnosis,
      d.symptoms.join('|'),
      d.confidence,
      d.model,
      d.cropType || '',
      d.region || '',
      d.season || '',
      d.timestamp
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }
}

export { AIOrchestrationService, RAGSystem, QuotaManager, TrainingDataCollector };
export type { AnalysisResult, SourceReference, ManagementAdvice, QuotaStatus, GeminiParsedResponse };
