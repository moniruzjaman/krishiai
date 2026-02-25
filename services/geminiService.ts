import { GoogleGenAI, Type } from "@google/genai";
import {
	AnalysisResult,
	GroundingChunk,
	FlashCard,
	AgriTask,
	UserCrop,
	User,
	WeatherData,
	CropDiseaseReport,
	AgriQuizQuestion,
	Language,
	UserRole,
} from "../types";
import { AEZInfo } from "./locationService";

// Environment validation - warn if using placeholder values
const PLACEHOLDER_VALUES = [
	'your_gemini_api_key_here',
	'your_key_here',
	'sk-or-your_openrouter_key_here',
	'hf_your_huggingface_token_here',
	'sk-proj-your_openai_key_here',
];

/**
 * Validates environment variables and warns if placeholder values are detected.
 * Call this at application startup or before making API calls.
 */
export const validateEnvironment = (): { valid: boolean; warnings: string[] } => {
	const warnings: string[] = [];

	const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
	const openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
	const hfToken = import.meta.env.VITE_HF_TOKEN;
	const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

	if (!geminiKey || PLACEHOLDER_VALUES.some(p => geminiKey.includes(p.replace('_here', '')))) {
		warnings.push('VITE_GEMINI_API_KEY is not configured or using placeholder value. AI features may not work.');
	}

	if (!openrouterKey || PLACEHOLDER_VALUES.some(p => openrouterKey.includes('your_openrouter'))) {
		warnings.push('VITE_OPENROUTER_API_KEY is not configured or using placeholder value. Free-tier models may not work.');
	}

	if (!hfToken || PLACEHOLDER_VALUES.some(p => hfToken.includes('your_huggingface'))) {
		warnings.push('VITE_HF_TOKEN is not configured or using placeholder value. HuggingFace models may not work.');
	}

	if (openaiKey && PLACEHOLDER_VALUES.some(p => openaiKey.includes('your_openai'))) {
		warnings.push('VITE_OPENAI_API_KEY appears to be a placeholder value. OpenAI features may not work.');
	}

	// Log warnings in development
	if (warnings.length > 0 && import.meta.env.DEV) {
		console.warn('⚠️ Environment Configuration Warnings:');
		warnings.forEach(w => console.warn(`  - ${w}`));
		console.warn('Please update your .env file with valid API keys. See .env.example for reference.');
	}

	return {
		valid: warnings.length === 0,
		warnings
	};
};

// Run validation on module load in development mode
if (import.meta.env.DEV) {
	validateEnvironment();
}

const extractJSON = <T>(text: string, defaultValue: T): T => {
	if (!text) return defaultValue;
	try {
		const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
		return jsonMatch ? (JSON.parse(jsonMatch[0]) as T) : defaultValue;
	} catch (e) {
		console.error("JSON Parse Error:", e, "Raw text:", text);
		return defaultValue;
	}
};

const withRetry = async <T>(
	fn: () => Promise<T>,
	maxRetries = 3,
): Promise<T> => {
	let lastError: any;
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error: any) {
			lastError = error;
			const errorStatus = error?.status || error?.error?.code;
			if (errorStatus === 500 || errorStatus === 429 || errorStatus === 500) {
				const delay = Math.pow(2, i) * 1500;
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}
			throw error;
		}
	}
	throw lastError;
};

export const decodeBase64 = (base64: string): Uint8Array => {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++)
		bytes[i] = binaryString.charCodeAt(i);
	return bytes;
};

const getOpenRouterKey = () => (import.meta as any).env?.VITE_OPENROUTER_API_KEY || "";

const callOpenRouterFallback = async (options: any): Promise<any> => {
	const openRouterKey = getOpenRouterKey();
	if (!openRouterKey) throw new Error("No VITE_OPENROUTER_API_KEY provided for fallback.");

	let messages: any[] = [];
	const { contents, config } = options;

	if (config?.systemInstruction) {
		messages.push({ role: "system", content: config.systemInstruction });
	}

	if (typeof contents === "string") {
		messages.push({ role: "user", content: contents });
	} else if (Array.isArray(contents)) {
		if (contents[0]?.role) {
			for (const msg of contents) {
				const role = msg.role === "model" ? "assistant" : "user";
				const parts = msg.parts || [];
				let text = "";
				const openRouterContent: any[] = [];
				let hasImage = false;
				for (const part of parts) {
					if (part.text) {
						text += part.text;
						openRouterContent.push({ type: "text", text: part.text });
					} else if (part.inlineData) {
						hasImage = true;
						openRouterContent.push({
							type: "image_url",
							image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
						});
					}
				}
				messages.push({ role, content: hasImage ? openRouterContent : text });
			}
		} else if (contents[0]?.parts) {
			const openRouterContent: any[] = [];
			let hasImage = false;
			for (const part of contents[0].parts) {
				if (part.text) {
					openRouterContent.push({ type: "text", text: part.text });
				} else if (part.inlineData) {
					hasImage = true;
					openRouterContent.push({
						type: "image_url",
						image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
					});
				}
			}
			messages.push({ role: "user", content: hasImage ? openRouterContent : (openRouterContent[0]?.text || "Query") });
		}
	}

	const isVision = messages.some(m => Array.isArray(m.content) && m.content.some((c: any) => c.type === "image_url"));
	const fallbackModel = isVision ? "openai/gpt-4o-2024-11-20" : "openai/gpt-4o-mini";

	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${openRouterKey}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			model: fallbackModel,
			messages,
			response_format: config?.responseMimeType === "application/json" ? { type: "json_object" } : undefined
		})
	});

	if (!response.ok) {
		const err = await response.text();
		throw new Error(`OpenRouter Fallback Failed: ${response.status} ${err}`);
	}

	const data = await response.json();
	const text = data.choices?.[0]?.message?.content || "";

	return {
		text: text,
		candidates: [{
			content: { parts: [{ text }] },
			groundingMetadata: { groundingChunks: [] }
		}]
	};
};

const generateContentWithFallback = async (options: any): Promise<any> => {
	return await withRetry(async () => {
		try {
			const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.API_KEY;
			const ai = new GoogleGenAI({ apiKey });
			return await ai.models.generateContent(options);
		} catch (error: any) {
			const errorStatus = error?.status || error?.error?.code;
			if (errorStatus === 429 || errorStatus === 500 || errorStatus === 503 || error.message?.includes("quota")) {
				console.warn("Gemini API error (Quota/503). Falling back to OpenRouter...");
				if (options.model === 'gemini-2.5-flash-image' || options.model === 'imagen-3.0-generate-001') {
					throw error;
				}
				return await callOpenRouterFallback(options);
			}
			throw error;
		}
	});
};

export const decodeAudioData = async (
	data: Uint8Array,
	ctx: AudioContext,
	sampleRate: number,
	numChannels: number,
): Promise<AudioBuffer> => {
	const dataInt16 = new Int16Array(data.buffer);
	const frameCount = dataInt16.length / numChannels;
	const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
	for (let channel = 0; channel < numChannels; channel++) {
		const channelData = buffer.getChannelData(channel);
		for (let i = 0; i < frameCount; i++)
			channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
	}
	return buffer;
};

/**
 * High-precision identification using BARI/BRRI/DAE grounded search.
 * Strictly acting as a National Scientific Officer.
 */
export const analyzeCropImage = async (
	base64Data: string,
	mimeType: string,
	options?: {
		cropFamily?: string;
		userRank?: string;
		query?: string;
		lang?: Language;
		weather?: WeatherData;
	},
): Promise<AnalysisResult> => {
	const lang = options?.lang || "bn";

	return await withRetry(async () => {
		const apiKey =
			(import.meta as any).env?.VITE_GEMINI_API_KEY ||
			(process as any).env?.API_KEY;
		const ai = new GoogleGenAI({ apiKey });

		const systemInstruction = `Role: Senior Scientific Officer (Plant Pathology / Soil Science / Entomology) at BARI/BRRI/DAE, Bangladesh.
    Task: Precisely identify Pests, Diseases, or Nutrient Deficiencies in the image specimen.

    STRICT GROUNDING RULES:
    1. Mandatory Primary Sources: dae.gov.bd, bari.gov.bd, brri.gov.bd, ais.gov.bd, barc.gov.bd.
    2. Pest/Disease Protocols: Follow "Krishoker Janala" (Plant Doctor) guidelines.
    3. Nutrient Deficiencies: Strictly follow BARC Fertilizer Recommendation Guide 2024.
    4. Weather Context: Use the provided weather data (temp, humidity, rain) to assess disease risks (e.g., high humidity favors fungi like Late Blight or Blast).

    OUTPUT FORMAT (Markdown with specific tags):
    - DIAGNOSIS: [Official Name in Bangla and English]
    - CATEGORY: [Pest / Disease / Deficiency / Other]
    - CONFIDENCE: [Score 0-100]%
    - AUTHENTIC SOURCE: [Citing BARI/BRRI/DAE specifically]
    - MANAGEMENT PROTOCOL:
        - Cultural/Organic: [Actions to take]
        - Chemical: [Specific DAE-approved chemical name and dosage per Liter/Acre]
    - TECHNICAL SUMMARY: [Detailed scientific description of symptoms and MoA]

    Language: ${lang === "bn" ? "Bangla" : "English"}. Use Google Search tool to verify information and provide citations in grounding metadata.`;

		const response = await ai.models.generateContent({
			model: "gemini-3-flash-preview",
			contents: [
				{
					parts: [
						{ inlineData: { data: base64Data, mimeType } },
						{
							text: `Crop Context: ${options?.cropFamily || "General Agricultural Specimen"}. Observation: ${options?.query || "Conduct full scientific audit"}. Current Weather in Field: ${options?.weather ? JSON.stringify(options.weather) : "Unknown"}. Ground all advice in Bangladesh government scientific repositories.`,
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
	});
};

export const generateAgriImage = async (prompt: string): Promise<string> => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-2.5-flash-image",
		contents: [{ parts: [{ text: prompt }] }],
		config: { imageConfig: { aspectRatio: "16:9" } },
	});
	const candidates = response.candidates || [];
	if (
		candidates.length > 0 &&
		candidates[0].content &&
		candidates[0].content.parts
	) {
		for (const part of candidates[0].content.parts) {
			if (part.inlineData)
				return `data:image/png;base64,${part.inlineData.data}`;
		}
	}
	throw new Error("Image generation failed");
};

export const generateSpeech = async (text: string): Promise<string> => {
	const apiBaseUrl =
		(import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";
	const response = await fetch(`${apiBaseUrl}/api/tts`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ text: text.slice(0, 1000) }),
	});
	if (!response.ok) {
		throw new Error(`TTS request failed: ${response.status}`);
	}
	const data = await response.json();
	if (!data.success) {
		throw new Error(data.error || "Speech generation failed");
	}
	return data.audio;
};

export const getLiveWeather = async (
	lat: number,
	lng: number,
	force = false,
	lang: Language = "bn",
): Promise<WeatherData> => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Provide agricultural weather for Lat: ${lat}, Lng: ${lng}. Include temp, condition, humidity, windSpeed, rainProbability, evapotranspiration, soilTemperature, solarRadiation, gdd, diseaseRisk. JSON format. Lang: ${lang === "bn" ? "Bangla" : "English"}`,
		config: {
			tools: [{ googleSearch: {} }],
			responseMimeType: "application/json",
		},
	});
	return extractJSON<WeatherData>(response.text || "{}", {
		upazila: "Unknown",
		district: "Bangladesh",
		temp: 25,
		condition: "Sunny",
		description: "Good",
		humidity: 60,
		windSpeed: 10,
		rainProbability: 0,
	});
};

export const sendChatMessage = async (
	history: any[],
	message: string,
	persona: string,
	role: string,
	weather?: WeatherData,
	crops?: UserCrop[],
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const context = `User Role: ${role}. Persona: ${persona}. Current Weather: ${JSON.stringify(weather)}. User Crops: ${JSON.stringify(crops)}. Respond as a BD Govt Agri-Consultant. Ground advice in dae.gov.bd.`;
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: [
			...history,
			{ role: "user", parts: [{ text: `${context}\n\nQuestion: ${message}` }] },
		],
		config: { tools: [{ googleSearch: {} }] },
	});
	return {
		text: response.text || "উত্তর দিতে ব্যর্থ হয়েছি।",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const searchAgriculturalInfo = async (query: string) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Answer the following agri query using Bangladesh government official data: ${query}`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return {
		text: response.text || "",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const getAIPlantNutrientAdvice = async (
	crop: string,
	aez: string,
	soil: string,
	areaSize: number,
	unit: string,
	lang: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Calculate fertilizer requirements for ${crop} in ${aez}. Fertility: ${soil}. Area: ${areaSize} ${unit}. Follow BARC 2024. Lang: ${lang}.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return response.text;
};

export const getBiocontrolExpertAdvice = async (query: string) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Biological control methods for: ${query} in Bangladesh. Grounded in BARI research.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return response.text;
};

export const interpretSoilReportAI = async (inputs: any) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	try {
		const response = await ai.models.generateContent({
			model: "gemini-3-flash-preview",
			contents: `Interpret soil lab report: ${JSON.stringify(inputs)}. Use SRDI/BARC standards.`,
			config: { tools: [{ googleSearch: {} }] },
		});

		// Return safe fallback if response.text is undefined or empty
		return (
			response.text ||
			"মাটির পরীক্ষা রিপোর্ট বিশ্লেষণে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।"
		);
	} catch (error) {
		console.error("Soil report interpretation error:", error);
		return "মাটির পরীক্ষা রিপোর্ট বিশ্লেষণে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।";
	}
};

export const getPesticideExpertAdvice = async (
	query: string,
	lang: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `DAE Pesticide Dose and Safety for: ${query}. Site: dae.gov.bd. Lang: ${lang}.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return {
		text: response.text || "",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const analyzePesticideMixing = async (
	items: any[],
	weather?: WeatherData,
	lang?: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Can these chemicals be mixed? ${JSON.stringify(items)}. Follow IRAC/FRAC and DAE. Lang: ${lang}.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return {
		text: response.text || "",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const getPesticideRotationAdvice = async (
	query: string,
	lang: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Resistance management rotation for: ${query}. Use official DAE codes. Lang: ${lang}.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return {
		text: response.text || "",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const requestPesticidePrecisionParameters = async (
	query: string,
	lang: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `What field data is needed for 100% precision advisory for "${query}"? Return JSON list. Lang: ${lang}.`,
		config: { responseMimeType: "application/json" },
	});
	return extractJSON<any[]>(response.text || "[]", []);
};

export const performDeepPesticideAudit = async (
	query: string,
	dynamicData: any,
	lang: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Deep audit for "${query}" with parameters: ${JSON.stringify(dynamicData)}. Follow DAE protocols. Lang: ${lang}.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return {
		text: response.text || "",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const getAISprayAdvisory = async (
	crop: string,
	pest: string,
	weather: WeatherData,
	lang: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Generate spray guide for ${pest} in ${crop}. Weather: ${JSON.stringify(weather)}. Lang: ${lang}.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return {
		text: response.text || "",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const performSoilHealthAudit = async (
	inputs: any,
	aez?: AEZInfo,
	lang?: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Audit soil health: ${JSON.stringify(inputs)}. AEZ: ${aez?.name}. Use BARC-2024. Lang: ${lang}.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return response.text;
};

export const requestSoilPrecisionParameters = async (
	inputs: any,
	aezName: string,
	lang: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `What extra data is needed for soil audit in ${aezName}? Inputs: ${JSON.stringify(inputs)}. Return JSON. Lang: ${lang}.`,
		config: { responseMimeType: "application/json" },
	});
	return extractJSON<any[]>(response.text || "[]", []);
};

export const performDeepSoilAudit = async (
	inputs: any,
	aezName: string,
	dynamicData: any,
	lang: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Deep soil audit for ${aezName}. Extra data: ${JSON.stringify(dynamicData)}. Follow BARC. Lang: ${lang}.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return response.text;
};

export const getCropDiseaseInfo = async (crop: string) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Disease and pest info for: ${crop} in Bangladesh. Ground in AIS/BARI/BRRI. JSON format.`,
		config: { responseMimeType: "application/json" },
	});
	return {
		data: extractJSON<CropDiseaseReport>(response.text || "{}", {
			cropName: crop,
			summary: "",
			diseases: [],
			pests: [],
		}),
	};
};

export const getFieldMonitoringData = async (
	lat: number,
	lng: number,
	aezName: string,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Satellite simulation for Field at ${lat}, ${lng}. AEZ: ${aezName}. Biomass and NDVI estimates.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return {
		text: response.text || "",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const getLCCAnalysisSummary = async (
	lcc: number,
	tsr: number,
	dose: string,
	lang: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `LCC Value: ${lcc}, TSR: ${tsr}%, Dose: ${dose}. Rice N-management advice. Lang: ${lang}.`,
	});
	return response.text;
};

export const identifyPlantSpecimen = async (
	base64: string,
	mimeType: string,
	lang: Language = "bn",
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: [
			{
				parts: [
					{ inlineData: { data: base64, mimeType } },
					{
						text:
							"Identify plant specimen for a student. Cite scientific details. Lang: " +
							lang,
					},
				],
			},
		],
		config: { tools: [{ googleSearch: {} }] },
	});
	return {
		text: response.text || "",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const searchNearbySellers = async (
	lat: number,
	lng: number,
	type: string,
	lang: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-2.5-flash",
		contents: `Find ${type} near lat: ${lat}, lng: ${lng} in Bangladesh. Respond in ${lang}.`,
		config: {
			tools: [{ googleMaps: {} }],
			toolConfig: {
				retrievalConfig: { latLng: { latitude: lat, longitude: lng } },
			},
		},
	});
	return {
		text: response.text || "",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const getAgriFlashCards = async (topic: string) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `5 Agri Flashcards for: ${topic}. JSON format.`,
		config: { responseMimeType: "application/json" },
	});
	return extractJSON<FlashCard[]>(response.text || "[]", []);
};

export const getAICropSchedule = async (
	crop: string,
	today: string,
	season: string,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `5-step calendar for ${crop} starting ${today} in ${season}. JSON format.`,
		config: { responseMimeType: "application/json" },
	});
	return extractJSON<any[]>(response.text || "[]", []);
};

export const getAgriMetaExplanation = async (query: string) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Explain Krishi AI logic for: ${query}. Mention BARI/BRRI data usage.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return response.text;
};

export const generateAgriQuiz = async (topic: string, lang: Language) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `5 quiz questions for: ${topic}. Lang: ${lang}. JSON format.`,
		config: { responseMimeType: "application/json" },
	});
	return extractJSON<AgriQuizQuestion[]>(response.text || "[]", []);
};

export const searchEncyclopedia = async (query: string, lang: Language) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Define "${query}" for BD agriculture. Lang: ${lang}.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return {
		text: response.text || "",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const getPersonalizedAgriAdvice = async (
	crops: UserCrop[],
	rank: string,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Personalized guide for "${rank}" farmer growing: ${JSON.stringify(crops)}. Site: dae.gov.bd.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return response.text;
};

export const getAgriNews = async (lang: Language) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `5 agri news headlines for Bangladesh. Lang: ${lang}. JSON list.`,
		config: {
			tools: [{ googleSearch: {} }],
			responseMimeType: "application/json",
		},
	});
	return extractJSON<string[]>(response.text || "[]", ["News syncing..."]);
};

export const getTrendingMarketPrices = async (lang: Language) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Market prices from dam.gov.bd. 5 items. JSON. Lang: ${lang}.`,
		config: {
			tools: [{ googleSearch: {} }],
			responseMimeType: "application/json",
		},
	});
	return extractJSON<any[]>(response.text || "[]", []);
};

export const getAIYieldPrediction = async (
	crop: string,
	aez: string,
	soil: string,
	practice: string,
	water: string,
	notes: string,
	rank: string = "Basic",
	dynamicData: any,
	lang: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Predict yield: ${crop}, AEZ: ${aez}, Soil: ${soil}, Practice: ${practice}. Data: ${JSON.stringify(dynamicData)}. Lang: ${lang}.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return {
		text: response.text || "",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const getAgriPodcastSummary = async (topic: string) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `Podcast script briefing for: ${topic}. Bangladeshi context.`,
		config: { tools: [{ googleSearch: {} }] },
	});
	return {
		text: response.text || "",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};

export const requestPrecisionParameters = async (
	base64: string,
	mimeType: string,
	cropFamily: string,
	lang: Language,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: [
			{
				parts: [
					{ inlineData: { data: base64, mimeType } },
					{
						text: `Extra diagnostic fields for ${cropFamily}. JSON list. Lang: ${lang}.`,
					},
				],
			},
		],
		config: { responseMimeType: "application/json" },
	});
	return extractJSON<any[]>(response.text || "[]", []);
};

export const performDeepAudit = async (
	base64: string,
	mimeType: string,
	cropFamily: string,
	dynamicData: any,
	lang: Language,
	weather?: WeatherData,
) => {
	const apiKey =
		(import.meta as any).env?.VITE_GEMINI_API_KEY ||
		(process as any).env?.API_KEY;
	const ai = new GoogleGenAI({ apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: [
			{
				parts: [
					{ inlineData: { data: base64, mimeType } },
					{
						text: `Scientific Audit: ${cropFamily}. Params: ${JSON.stringify(dynamicData)}. Weather: ${JSON.stringify(weather)}. Cite Govt sources. Lang: ${lang}.`,
					},
				],
			},
		],
		config: { tools: [{ googleSearch: {} }] },
	});
	const text = response.text || "";
	const diagnosis =
		text.match(/DIAGNOSIS:\s*(.*)/i)?.[1]?.trim() || "Deep Audit Result";
	const categoryMatch = text.match(
		/CATEGORY:\s*(Pest|Disease|Deficiency|Other)/i,
	)?.[1];
	const confidence = parseInt(text.match(/CONFIDENCE:\s*(\d+)/i)?.[1] || "95");
	const advisory =
		text
			.match(/MANAGEMENT PROTOCOL:\s*([\s\S]*?)(?=\n- TECHNICAL|$)/i)?.[1]
			?.trim() || "";

	return {
		diagnosis,
		category: (categoryMatch as any) || "Other",
		confidence,
		advisory,
		fullText: text,
		officialSource: "Verified Scientific Deep Audit (BARI/BRRI)",
		groundingChunks:
			(response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) ||
			[],
	};
};
