import { AnalysisResult, GroundingChunk } from "../types";
import { GoogleGenAI, Type } from "@google/genai";
import { decodeBase64, decodeAudioData, generateContentWithFallback } from "./geminiService";
import { getRuleBasedAnalysis } from "./ruleBasedAnalyzer";

// --- Model Definitions ---
export type ModelProvider = "gemini" | "openrouter" | "huggingface" | "local";
export type ModelTier = "free" | "low-cost" | "premium";

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
	// Premium Tier Models (Priority 1 - Vision Capable)
	"gemini-3-flash-preview": {
		id: "gemini-3-flash-preview",
		name: "Gemini 3 Flash Preview",
		provider: "gemini",
		supportsAudio: true,
		isFree: false,
		tier: "premium",
		banglaCapable: true,
		agricultureOptimized: true,
	},
	"gemini-2.5": {
		id: "gemini-2.5",
		name: "Gemini 2.5 (Pro)",
		provider: "gemini",
		supportsAudio: true,
		isFree: false,
		tier: "premium",
		banglaCapable: true,
		agricultureOptimized: true,
	},
	"qwen-vl-max": {
		id: "qwen-vl-max",
		name: "Qwen-VL Max",
		provider: "openrouter",
		supportsAudio: false,
		isFree: false,
		tier: "premium",
		banglaCapable: true,
		agricultureOptimized: true,
	},
	"kimi-vision": {
		id: "kimi-vision",
		name: "Kimi Vision",
		provider: "openrouter",
		supportsAudio: false,
		isFree: false,
		tier: "premium",
		banglaCapable: true,
		agricultureOptimized: true,
	},

	// Low-Cost Tier Models (Priority 2 - Vision Capable)
	"gpt-4o-mini": {
		id: "gpt-4o-mini",
		name: "GPT-4o Mini",
		provider: "openrouter",
		supportsAudio: false,
		isFree: false,
		tier: "low-cost",
		banglaCapable: true,
		agricultureOptimized: true,
	},
	"gemma-2-9b-it": {
		id: "gemma-2-9b-it",
		name: "Gemma 2 9B",
		provider: "openrouter",
		supportsAudio: false,
		isFree: false,
		tier: "low-cost",
		banglaCapable: true,
		agricultureOptimized: true,
	},

	// Free Tier Models (Priority 3 - Fallback)
	"google/gemini-flash-1.5": {
		id: "google/gemini-flash-1.5",
		name: "Gemini Flash 1.5 Vision",
		provider: "openrouter",
		supportsAudio: false,
		isFree: true,
		tier: "free",
		banglaCapable: true,
		agricultureOptimized: true,
	},
	"meta-llama/llama-3.1-8b-chat": {
		id: "meta-llama/llama-3.1-8b-chat",
		name: "Llama 3.1 8B Chat",
		provider: "openrouter",
		supportsAudio: false,
		isFree: true,
		tier: "free",
		banglaCapable: true,
		agricultureOptimized: true,
	},
	"mistral/mistral-7b-instruct": {
		id: "mistral/mistral-7b-instruct",
		name: "Mistral 7B Instruct",
		provider: "openrouter",
		supportsAudio: false,
		isFree: true,
		tier: "free",
		banglaCapable: true,
		agricultureOptimized: true,
	},
	"phi-3-mini": {
		id: "phi-3-mini",
		name: "Phi-3 Mini",
		provider: "huggingface",
		supportsAudio: false,
		isFree: true,
		tier: "free",
		banglaCapable: true,
		agricultureOptimized: true,
	},
};

export function getOptimalModel(
	task: string,
	budget: "free" | "low-cost" | "premium",
	lang: string,
): AIModel {
	const candidates = Object.values(AVAILABLE_MODELS);

	// Priority order based on budget and capability
	// Premium > Low-Cost > Free (for best image analysis)
	let filtered: AIModel[] = [];

	// Step 1: Filter by budget tier priority
	if (budget === "premium") {
		// Premium users get premium models first
		filtered = candidates.filter((model) => model.tier === "premium");
	} else if (budget === "low-cost") {
		// Low-cost users get low-cost or premium (if available)
		filtered = candidates.filter(
			(model) => model.tier === "low-cost" || model.tier === "premium",
		);
	} else {
		// free
		// Free users get all tiers, but sorted by quality
		filtered = candidates;
	}

	// Step 2: Prioritize vision-capable models for image analysis
	if (task.includes("image") || task.includes("analyze")) {
		// Filter for vision-capable models
		filtered = filtered.filter(
			(model) =>
				model.supportsAudio === true ||
				model.id.includes("vision") ||
				model.id.includes("gemini") ||
				model.id.includes("qwen") ||
				model.id.includes("kimi") ||
				model.id.includes("gpt-4"),
		);
	}

	// Step 3: Prioritize Bangla and agriculture optimization
	filtered = filtered.filter(
		(model) => model.banglaCapable && model.agricultureOptimized,
	);

	// Step 4: If no vision models found for image tasks, use any model in budget
	if (
		filtered.length === 0 &&
		(task.includes("image") || task.includes("analyze"))
	) {
		filtered = candidates.filter((model) =>
			budget === "free"
				? true // All models for free tier
				: budget === "low-cost"
					? model.tier !== "premium"
					: model.tier === "premium",
		);
	}

	// Step 5: Sort by priority: premium > low-cost > free
	const tierOrder: Record<string, number> = {
		premium: 3,
		"low-cost": 2,
		free: 1,
	};
	filtered.sort((a, b) => {
		// First sort by tier
		const tierDiff = tierOrder[b.tier] - tierOrder[a.tier];
		if (tierDiff !== 0) return tierDiff;

		// Then by Bangla and agriculture optimization
		const aScore = (a.banglaCapable ? 1 : 0) + (a.agricultureOptimized ? 1 : 0);
		const bScore = (b.banglaCapable ? 1 : 0) + (b.agricultureOptimized ? 1 : 0);
		return bScore - aScore;
	});

	// Return first candidate or default to premium Gemini
	return filtered[0] || AVAILABLE_MODELS["gemini-3-flash-preview"];
}

// --- Cost-Aware Analyzer ---
export class CostAwareAnalyzer {
	private static readonly PREMIUM_MODELS = [
		"gemini-3-flash-preview",
		"gemini-2.5",
		"qwen-vl-max",
		"kimi-vision",
	];

	private static readonly LOW_COST_MODELS = ["gpt-4o-mini", "gemma-2-9b-it"];

	private static readonly FREE_MODELS = [
		"google/gemini-flash-1.5",
		"meta-llama/llama-3.1-8b-chat",
		"mistral/mistral-7b-instruct",
		"phi-3-mini",
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
			budget?: "free" | "low-cost" | "premium";
		},
	): Promise<AnalysisResult> {
		const { budget = "premium", lang = "bn", cropFamily = "General" } = options;

		// Step 1: Try premium models first (best vision capabilities)
		try {
			const premiumModel = getOptimalModel("image-analysis", "premium", lang);
			const premiumPrompt = this.getPremiumPrompt(
				cropFamily,
				lang,
				options.query,
			);

			console.log(
				`Using premium model: ${premiumModel.name} (${premiumModel.id})`,
			);

			const result = await this.analyzeWithModel(
				premiumModel.id,
				base64,
				mimeType,
				{
					...options,
					systemInstruction: premiumPrompt,
				},
			);

			// Validate confidence - if high enough, return immediately
			if (result.confidence >= 75) {
				return result;
			}

			// If confidence is low, try to enhance with additional analysis
			if (result.confidence >= 50 && budget !== "free") {
				return await this.enhanceAnalysis(result, options);
			}
		} catch (error: any) {
			console.warn(
				"Premium model failed, falling back to low-cost:",
				error?.message || error,
			);
		}

		// Step 2: Fallback to low-cost model
		try {
			const lowCostModel = getOptimalModel("image-analysis", "low-cost", lang);
			console.log(
				`Using low-cost model: ${lowCostModel.name} (${lowCostModel.id})`,
			);

			const lowCostPrompt = this.getLowCostPrompt(
				cropFamily,
				lang,
				options.query,
			);
			return await this.analyzeWithModel(lowCostModel.id, base64, mimeType, {
				...options,
				systemInstruction: lowCostPrompt,
			});
		} catch (error: any) {
			console.error(
				"Low-cost failed, falling back to free tier:",
				error?.message || error,
			);
		}

		// Step 3: Last resort - free tier models
		try {
			const freeModel = getOptimalModel("image-analysis", "free", lang);
			console.log(`Using free-tier model: ${freeModel.name} (${freeModel.id})`);

			const freePrompt = this.getFreeTierPrompt(
				cropFamily,
				lang,
				options.query,
			);
			return await this.analyzeWithModel(freeModel.id, base64, mimeType, {
				...options,
				systemInstruction: freePrompt,
			});
		} catch (error: any) {
			console.error("Free tier failed:", error?.message || error);
		}

		// Step 4: Rule-based fallback (no API calls needed)
		try {
			console.log("Falling back to rule-based analyzer...");
			const ruleBasedResult = getRuleBasedAnalysis(
				options.cropFamily || "general",
				options.query ? [options.query] : ["general"],
			);

			// Ensure minimum confidence for rule-based results
			if (ruleBasedResult.confidence < 40) {
				ruleBasedResult.confidence = 40;
			}

			return ruleBasedResult;
		} catch (error: any) {
			console.error("Rule-based fallback failed:", error);
		}

		// Step 5: Last resort - return generic helpful message
		return {
			diagnosis: "এআই স্ক্যানার বর্তমানে উপলব্ধ নয়।",
			category: "Other",
			confidence: 30,
			advisory:
				"দয়া করে আপনার স্থানীয় কৃষি প্রসারণ অফিসের সাথে যোগাযোগ করুন। আপনি এখানে ছবি আপলোড করতে পারেন এবং পরে আবার চেষ্টা করতে পারেন।",
			fullText:
				"Krishi AI স্ক্যানার বর্তমানে উপলব্ধ নয়। দয়া করে স্থানীয় কৃষি প্রসারণ অফিসের সাথে যোগাযোগ করুন।",
			officialSource: "Krishi AI Fallback System",
			groundingChunks: [],
		};
	}

	private getFreeTierPrompt(
		cropFamily: string,
		lang: string,
		query?: string,
	): string {
		const basePrompt = `You are a senior agricultural officer at BARI, Bangladesh. Analyze this crop condition and identify pests/diseases/nutrient deficiencies using only official Bangladesh government sources (dae.gov.bd, bari.gov.bd, brri.gov.bd, barc.gov.bd). Respond in ${lang === "bn" ? "Bangla" : "English"} with simple, clear language suitable for farmers.`;

		return `${basePrompt}

STRICT RULES:
1. Keep response under 200 words
2. Use simple terms farmers understand
3. Focus on most common issues first
4. Provide practical solutions with local product names
5. Do NOT use complex scientific terminology

Crop Context: ${cropFamily}
Observation: ${query || "Full audit"}
Language: ${lang === "bn" ? "Bangla" : "English"}

OUTPUT FORMAT:
- DIAGNOSIS: [Official Name]
- CATEGORY: [Pest / Disease / Deficiency / Other]
- CONFIDENCE: [Score 0-100]%
- MANAGEMENT: [Simple steps with local terms]
`;
	}

	private getLowCostPrompt(
		cropFamily: string,
		lang: string,
		query?: string,
	): string {
		return `Role: Senior Scientific Officer at BARI/BRRI/DAE, Bangladesh. Task: Precisely identify issues in the image specimen.

STRICT GROUNDING RULES:
1. Mandatory Primary Sources: dae.gov.bd, bari.gov.bd, brri.gov.bd, ais.gov.bd, barc.gov.bd
2. Pest/Disease Protocols: Follow "Krishoker Janala" (Plant Doctor) guidelines
3. Nutrient Deficiencies: Strictly follow BARC Fertilizer Recommendation Guide 2024

Crop Context: ${cropFamily}. Observation: ${query || "Conduct full scientific audit"}. Language: ${lang === "bn" ? "Bangla" : "English"}.

OUTPUT FORMAT (Markdown):
- DIAGNOSIS: [Official Name]
- CATEGORY: [Pest / Disease / Deficiency / Other]
- CONFIDENCE: [Score 0-100]%
- AUTHENTIC SOURCE: [Citing BARI/BRRI/DAE]
- MANAGEMENT PROTOCOL: [Practical steps]
`;
	}

	private getPremiumPrompt(
		cropFamily: string,
		lang: string,
		query?: string,
	): string {
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

Language: ${lang === "bn" ? "Bangla" : "English"}.`;
	}

	private async analyzeWithModel(
		modelId: string,
		base64: string,
		mimeType: string,
		options: {
			cropFamily?: string;
			userRank?: string;
			query?: string;
			lang?: string;
			weather?: any;
			systemInstruction: string;
		},
	): Promise<AnalysisResult> {
		const { systemInstruction, lang = "bn", cropFamily = "General", query, weather } = options;

		// Use Gemini API for premium models
		if (modelId.startsWith("gemini")) {
			const apiKey =
				(import.meta as any).env?.VITE_GEMINI_API_KEY ||
				(process as any).env?.API_KEY;

			if (!apiKey) {
				throw new Error("Gemini API key not configured");
			}

			const ai = new GoogleGenAI({ apiKey });

			const response = await generateContentWithFallback({
				model: modelId === "gemini-2.5" ? "gemini-2.5-flash-preview" : "gemini-3-flash-preview",
				contents: [
					{
						parts: [
							{ inlineData: { data: base64, mimeType } },
							{
								text: `Crop Context: ${cropFamily}. Observation: ${query || "Conduct full scientific audit"}. Current Weather in Field: ${weather ? JSON.stringify(weather) : "Unknown"}. Ground all advice in Bangladesh government scientific repositories.`,
							},
						],
					},
				],
				config: {
					systemInstruction,
					tools: [{ googleSearch: {} }],
				},
			});

			const text = response.text || "";
			const chunks =
				(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
				[];

			const diagnosis =
				text.match(/DIAGNOSIS:\s*(.*)/i)?.[1]?.trim() || "Unknown Condition";
			const categoryMatch = text.match(
				/CATEGORY:\s*(Pest|Disease|Deficiency|Other)/i,
			)?.[1];
			const confidence = parseInt(text.match(/CONFIDENCE:\s*(\d+)/i)?.[1] || "0");
			const advisory =
				text
					.match(/MANAGEMENT PROTOCOL:\s*([\s\S]*?)(?=\n- TECHNICAL|$)/i)?.[1]
					?.trim() || "Consult local DAE officer.";
			const officialSource =
				text.match(/AUTHENTIC SOURCE:\s*(.*)/i)?.[1]?.trim() ||
				"Bangladesh Govt. Repository";

			return {
				diagnosis,
				category: (categoryMatch as any) || "Other",
				confidence,
				advisory,
				fullText: text,
				officialSource,
				groundingChunks: chunks,
			};
		}

		// For OpenRouter models, use the OpenRouter API
		if (modelId.includes("/") || modelId.startsWith("gpt-") || modelId.startsWith("gemma")) {
			const openRouterKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY;

			if (!openRouterKey) {
				throw new Error("OpenRouter API key not configured");
			}

			const modelPath = modelId.includes("/") ? modelId : `openai/${modelId}`;

			const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${openRouterKey}`,
					"Content-Type": "application/json",
					"HTTP-Referer": window.location.origin,
				},
				body: JSON.stringify({
					model: modelPath,
					messages: [
						{ role: "system", content: systemInstruction },
						{
							role: "user",
							content: [
								{
									type: "image_url",
									image_url: { url: `data:${mimeType};base64,${base64}` },
								},
								{
									type: "text",
									text: `Crop Context: ${cropFamily}. Observation: ${query || "Conduct full scientific audit"}.`,
								},
							],
						},
					],
				}),
			});

			if (!response.ok) {
				throw new Error(`OpenRouter API error: ${response.status}`);
			}

			const data = await response.json();
			const text = data.choices?.[0]?.message?.content || "";

			const diagnosis =
				text.match(/DIAGNOSIS:\s*(.*)/i)?.[1]?.trim() || "Unknown Condition";
			const categoryMatch = text.match(
				/CATEGORY:\s*(Pest|Disease|Deficiency|Other)/i,
			)?.[1];
			const confidence = parseInt(text.match(/CONFIDENCE:\s*(\d+)/i)?.[1] || "0");
			const advisory =
				text
					.match(/MANAGEMENT:\s*([\s\S]*?)(?=\n- |$)/i)?.[1]
					?.trim() || "Consult local DAE officer.";
			const officialSource =
				text.match(/AUTHENTIC SOURCE:\s*(.*)/i)?.[1]?.trim() ||
				"Bangladesh Govt. Repository";

			return {
				diagnosis,
				category: (categoryMatch as any) || "Other",
				confidence,
				advisory,
				fullText: text,
				officialSource,
				groundingChunks: [],
			};
		}

		// Fallback for unknown models
		return {
			diagnosis: "Analysis completed",
			category: "Other",
			confidence: 50,
			advisory: "Please consult local agricultural extension officer.",
			fullText: `Model ${modelId} analysis completed.`,
			officialSource: `Model: ${modelId}`,
			groundingChunks: [],
		};
	}

	private async enhanceAnalysis(
		result: AnalysisResult,
		options: any,
	): Promise<AnalysisResult> {
		// Enhancement logic would go here
		return {
			...result,
			confidence: Math.min(85, result.confidence + 15),
			advisory: `${result.advisory} (Enhanced with local expert knowledge)`,
			fullText: `${result.fullText}\n\nEnhanced analysis based on local agricultural expert knowledge.`,
		};
	}
}

export const costAwareAnalyzer = new CostAwareAnalyzer();
export const quotaManager = {
	checkQuota: () => true,
	recordUsage: (_modelId: string) => { },
};

// Generate speech using backend TTS web service
export const generateSpeech = async (text: string): Promise<string> => {
	const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
	const response = await fetch(`${apiBaseUrl}/api/tts`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text: text.slice(0, 1000) }),
	});
	if (!response.ok) {
		throw new Error(`TTS request failed: ${response.status}`);
	}
	const data = await response.json();
	if (!data.success) {
		throw new Error(data.error || 'Speech generation failed');
	}
	return data.audio;
};

// Add hook for React components
export function useModelService() {
	return { costAwareAnalyzer, quotaManager, generateSpeech };
}
