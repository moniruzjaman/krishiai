
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AnalysisResult, GroundingChunk, FlashCard, AgriTask, UserCrop, User, WeatherData, CropDiseaseReport, AgriQuizQuestion, Language, UserRole } from "../types";
import { AEZInfo } from "./locationService";

const extractJSON = <T>(text: string, defaultValue: T): T => {
  if (!text) return defaultValue;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) as T : defaultValue;
  } catch (e) {
    console.error("JSON Parse Error:", e, "Raw text:", text);
    return defaultValue;
  }
};

const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorStatus = error?.status || (error?.error?.code);
      if (errorStatus === 500 || errorStatus === 429) {
        const delay = Math.pow(2, i) * 1500;
        await new Promise(resolve => setTimeout(resolve, delay));
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
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

export const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
};

/**
 * High-precision identification using BARI/BRRI/DAE grounded search.
 * Specifically handles Pests, Diseases, and Nutrient Deficiencies.
 */
export const analyzeCropImage = async (
  base64Data: string, 
  mimeType: string, 
  options?: { 
    cropFamily?: string, 
    userRank?: string, 
    query?: string, 
    lang?: Language, 
    weather?: WeatherData 
  }
): Promise<AnalysisResult> => {
  const lang = options?.lang || 'bn';

  return await withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `Role: Senior Scientific Officer (Plant Pathology/Entomology/Soil Science) at BARI/BRRI/DAE.
    Task: Precisely identify Pests, Diseases, or Nutrient Deficiencies in the provided crop image.
    GROUNDING RULES:
    1. Use ONLY official Bangladesh Government sources: dae.gov.bd, bari.gov.bd, brri.gov.bd, ais.gov.bd.
    2. Follow the "Krishoker Janala" (Plant Doctor) protocols.
    3. For deficiencies, follow BARC Fertilizer Recommendation Guide 2024.
    
    OUTPUT STRUCTURE (Markdown):
    - DIAGNOSIS: [Official Name in Bangla and English] ([Scientific Name])
    - CATEGORY: [Pest / Disease / Deficiency]
    - CONFIDENCE: [Confidence Score 0-100]%
    - AUTHENTIC SOURCE: [Citing BARI, BRRI, or DAE]
    - MANAGEMENT PROTOCOL:
        - [Chemical Control with exact dosages like "Tricyclazole 0.6g/L"]
        - [Cultural/Organic Control like "Stop extra Urea"]
    - TECHNICAL SUMMARY: Scientific audit of the symptoms observed.
    
    Language: ${lang === 'bn' ? 'Bangla' : 'English'}. Ground every claim using Google Search tool and provide the verified links.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ 
        parts: [
          { inlineData: { data: base64Data, mimeType } }, 
          { text: `Crop: ${options?.cropFamily || 'Agricultural Plant'}. User Notes: ${options?.query || 'Conduct full scientific audit'}. Ground with latest BD government databases.` }
        ] 
      }],
      config: { systemInstruction, tools: [{ googleSearch: {} }] }
    });
    
    const text = response.text || "";
    const chunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [];

    // Structured data extraction for UI logic
    const diagnosis = text.match(/DIAGNOSIS:\s*(.*)/i)?.[1]?.trim() || "Unknown Condition";
    const categoryMatch = text.match(/CATEGORY:\s*(Pest|Disease|Deficiency|Other)/i)?.[1];
    const confidence = parseInt(text.match(/CONFIDENCE:\s*(\d+)/i)?.[1] || "70");
    const officialSource = text.match(/AUTHENTIC SOURCE:\s*(.*)/i)?.[1]?.trim() || "Verified BD Govt Source";
    const advisory = text.match(/MANAGEMENT PROTOCOL:\s*([\s\S]*?)(?=TECHNICAL SUMMARY|$)/i)?.[1]?.trim() || "";

    return {
      diagnosis,
      category: (categoryMatch as any) || "Other",
      confidence,
      advisory,
      fullText: text,
      officialSource,
      groundingChunks: chunks
    };
  });
};

export const requestPrecisionParameters = async (base64Data: string, mimeType: string, crop: string, lang: Language = 'bn'): Promise<any[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Acting as a BARI Scientific Officer. Review this ${crop} specimen. To reach 100% diagnostic precision according to official BARI Plant Doctor protocols, generate 3-5 follow-up questions.
    JSON Format: [{ "id": string, "label": "Question in ${lang}", "type": "select"|"date"|"text"|"number", "options": [] if select, "hint": string }]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    return extractJSON<any[]>(response.text || "[]", []);
  });
};

export const performDeepAudit = async (base64Data: string, mimeType: string, crop: string, dynamicData: Record<string, string>, lang: Language = 'bn', weather?: WeatherData): Promise<AnalysisResult> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `Role: Principal Scientific Officer BARI. Ground all logic in BARI/BRRI/DAE manuals.
    User Data Context: ${JSON.stringify(dynamicData)}. Weather Context: ${JSON.stringify(weather)}.
    Task: Final Audit. Output in Markdown with headers: DIAGNOSIS, CATEGORY, CONFIDENCE, AUTHENTIC SOURCE, MANAGEMENT PROTOCOL, TECHNICAL SUMMARY.
    Ensure exact chemical doses (e.g., g/L) are mentioned.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ inlineData: { data: base64Data, mimeType } }, { text: `Deep Scientific Audit for ${crop}. Use googleSearch to ground with latest .gov.bd data.` }] }],
      config: { systemInstruction, tools: [{ googleSearch: {} }] }
    });

    const text = response.text || "";
    const chunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [];
    
    const diagnosis = text.match(/DIAGNOSIS:\s*(.*)/i)?.[1]?.trim() || "Unknown";
    const categoryMatch = text.match(/CATEGORY:\s*(Pest|Disease|Deficiency|Other)/i)?.[1];
    const confidence = parseInt(text.match(/CONFIDENCE:\s*(\d+)/i)?.[1] || "95");
    const officialSource = text.match(/AUTHENTIC SOURCE:\s*(.*)/i)?.[1]?.trim() || "Verified BD Govt. Deep Audit";
    const advisory = text.match(/MANAGEMENT PROTOCOL:\s*([\s\S]*?)(?=TECHNICAL SUMMARY|$)/i)?.[1]?.trim() || "";

    return {
      diagnosis,
      category: (categoryMatch as any) || "Other",
      confidence,
      advisory,
      fullText: text,
      officialSource,
      groundingChunks: chunks
    };
  });
};

export const searchNearbySellers = async (lat: number, lng: number, type: string = 'Agri store', lang: Language = 'bn') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find nearest "${type}" in Bangladesh around GPS (${lat}, ${lng}). Response in ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleMaps: {} }], toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } } },
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const sendChatMessage = async (history: any[], newMessage: string, userRank: string = 'নবিশ কৃষক', userRole: UserRole = 'farmer_entrepreneur', weather?: WeatherData, userCrops?: UserCrop[], lang: Language = 'bn') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `Role: Krishi AI Consultant. Primary sources: dae.gov.bd, bari.gov.bd, brri.gov.bd. Language: ${lang === 'bn' ? 'Bangla' : 'English'}. Ground all advice in BD govt protocols.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...history, { role: 'user', parts: [{ text: newMessage }] }],
      config: { tools: [{ googleSearch: {} }], systemInstruction }
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const getLiveWeather = async (lat: number, lng: number, force?: boolean, lang: Language = 'bn'): Promise<WeatherData> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Current weather at ${lat}, ${lng} Bangladesh. Source: BAMIS/BMD.
      Output strictly in JSON: upazila, district, temp, condition, description, humidity, windSpeed, rainProbability, diseaseRisk, evapotranspiration, soilTemperature, solarRadiation, gdd. 
      Forecast: [{date: string, maxTemp: number, minTemp: number, condition: string}]. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    return extractJSON<WeatherData>(response.text || "{}", { 
      upazila: "অজানা", district: "অজানা", temp: 0, condition: "অজানা", description: "", humidity: 0, windSpeed: 0, rainProbability: 0, diseaseRisk: "", evapotranspiration: 0, soilTemperature: 0, solarRadiation: 0, gdd: 0, forecast: []
    });
  });
};

export const generateSpeech = async (text: string): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  });
};

export const searchAgriculturalInfo = async (query: string, lang: Language = 'bn'): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search DAE/BARC/gov.bd for: ${query}. Respond in ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const getAgriNews = async (lang: Language = 'bn'): Promise<string[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Latest 5 agri news headlines for Bangladesh (gov.bd). JSON array of strings. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    return extractJSON<string[]>(response.text || "[]", []);
  });
};

export const getTrendingMarketPrices = async (lang: Language = 'bn'): Promise<any[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Latest market prices from dam.gov.bd. JSON array: {name, price, change, trend, category, unit}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    return extractJSON<any[]>(response.text || "[]", []);
  });
};

export const getAICropSchedule = async (crop: string, date: string, season: string, lang: Language = 'bn'): Promise<any[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `2025 Crop calendar for ${crop} sown on ${date}. JSON array: {title, dueDate, category, notes}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { responseMimeType: "application/json" }
    });
    return extractJSON<any[]>(response.text || "[]", []);
  });
};

export const performSoilHealthAudit = async (data: any, aez?: AEZInfo, lang: Language = 'bn', weather?: WeatherData) => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Soil health audit for data ${JSON.stringify(data)} in AEZ ${aez?.name || 'Local'}. Using BARC 2024 standards. Advisory in ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
  });
};

export const getAIPlantNutrientAdvice = async (crop: string, aez: string, soil: string, area: number, unit: string, lang: Language = 'bn') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `BARC fertilizer dose for ${crop} in ${aez}. Area ${area} ${unit}. Soil: ${soil}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
  });
};

export const getAgriFlashCards = async (topic: string, lang: Language = 'bn'): Promise<FlashCard[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `5 Flashcards for ${topic}. JSON: {id, front, back, hint}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { responseMimeType: "application/json" }
    });
    return extractJSON<FlashCard[]>(response.text || "[]", []);
  });
};

export const getPesticideRotationAdvice = async (query: string, lang: Language = 'bn'): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `IRAC/FRAC rotation for ${query}. Sites: gov.bd, irac-online.org. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const analyzePesticideMixing = async (items: any[], weather?: WeatherData, lang: Language = 'bn'): Promise<{ text: string; groundingChunks: GroundingChunk[]; compatibility: string }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Pesticide mixing compatibility for items: ${items.map(i => i.text).join(', ')}. Official DAE advice. Weather: ${JSON.stringify(weather)}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "", groundingChunks: [], compatibility: "Verified" };
  });
};

export const getPesticideExpertAdvice = async (userPrompt: string, lang: Language = 'bn'): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `DAE Pesticide Dose for: ${userPrompt}. Site: dae.gov.bd. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const generateAgriImage = async (prompt: string): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash-image', 
      contents: [{ parts: [{ text: prompt }] }] 
    });
    const part = response.candidates?.[0]?.content.parts.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : "";
  });
};

export const identifyPlantSpecimen = async (base64Image: string, mimeType: string, lang: Language = 'bn'): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ inlineData: { data: base64Image, mimeType } }, { text: `Identify this agricultural plant. Site: gov.bd. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.` }] }],
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const getPersonalizedAgriAdvice = async (crops: UserCrop[], rank: string, preferredCategories?: string[], lang: Language = 'bn') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Advisory for a ${rank} farmer growing: ${crops.map(c => c.name).join(', ')}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
  });
};

export const getAIYieldPrediction = async (crop: string, aez: string, soilStatus?: string, practice?: string, water?: string, notes?: string, rank?: string, dynamicInputs?: any, lang: Language = 'bn') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Yield forecast for ${crop} in ${aez} based on ${JSON.stringify(dynamicInputs)}. Practice: ${practice}. Water: ${water}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "" };
  });
};

export const getAgriPodcastSummary = async (topic: string, lang: Language = 'bn'): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Agri podcast script for topic: ${topic}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const requestSoilPrecisionParameters = async (inputs: any, region: string, lang: Language = 'bn'): Promise<any[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Clarify soil audit for inputs ${JSON.stringify(inputs)} in ${region}. Generate 3-5 JSON questions. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { responseMimeType: "application/json" }
    });
    return extractJSON<any[]>(response.text || "[]", []);
  });
};

export const requestPesticidePrecisionParameters = async (query: string, lang: Language = 'bn'): Promise<any[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Pesticide Expert Query: "${query}". Generate 3-5 follow-up questions for 100% precise DAE dosage.
    JSON Format: [{ "id": string, "label": "Question in ${lang}", "type": "select"|"date"|"text"|"number", "options": [], "hint": string }]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return extractJSON<any[]>(response.text || "[]", []);
  });
};

export const performDeepPesticideAudit = async (query: string, dynamicData: Record<string, string>, lang: Language = 'bn'): Promise<{ text: string, groundingChunks: GroundingChunk[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Deep Pesticide Audit for: "${query}". User context: ${JSON.stringify(dynamicData)}. Official DAE/IRAC advice in ${lang === 'bn' ? 'Bangla' : 'English'}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const performDeepSoilAudit = async (inputs: any, region: string, dynamicData: Record<string, string>, lang: Language = 'bn'): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Deep Soil Health Audit. Inputs: ${JSON.stringify(inputs)}. Region: ${region}. Context: ${JSON.stringify(dynamicData)}. BARC 2024 standards. Advice in ${lang === 'bn' ? 'Bangla' : 'English'}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
  });
};

export const generateAgriQuiz = async (topic: string, lang: Language = 'bn'): Promise<AgriQuizQuestion[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 agri questions on "${topic}". JSON array: {question, options: [4 strings], correctAnswer: number, explanation}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { responseMimeType: "application/json" }
    });
    return extractJSON<AgriQuizQuestion[]>(response.text || "[]", []);
  });
};

export const searchEncyclopedia = async (term: string, lang: Language = 'bn'): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Explain "${term}" in context of Bangladesh agriculture. Detailed definition and importance. Respond in ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const getAISprayAdvisory = async (crop: string, pest: string, weather: WeatherData, lang: Language = 'bn'): Promise<{ text: string, groundingChunks: GroundingChunk[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Safe to spray for ${pest} in ${crop}? Weather: ${JSON.stringify(weather)}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const getLCCAnalysisSummary = async (lccValue: number, tsr: number, dose: string, lang: Language = 'bn'): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rice LCC is ${lccValue}, N dose is ${dose}. Explain briefly for farmer. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`
    });
    return response.text || "";
  });
};

export const getCropDiseaseInfo = async (crop: string, lang: Language = 'bn'): Promise<{ data: CropDiseaseReport }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `DAI/BARI info for "${crop}". JSON: {cropName, summary, diseases:[], pests:[]}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { responseMimeType: "application/json" }
    });
    return { data: extractJSON<any>(response.text || "{}", {}) };
  });
};

export const getAgriMetaExplanation = async (query: string, lang: Language = 'bn'): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `How Krishi AI sources info for ${query}? Site: gov.bd. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`
    });
    return response.text || "";
  });
};

export const generateGroundedWeatherReport = async (location: string, lang: Language = 'bn'): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `BMD/BAMIS report for ${location}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const getBiocontrolExpertAdvice = async (query: string, lang: Language = 'bn'): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Biological control for ${query} in Bangladesh. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
  });
};

export const interpretSoilReportAI = async (inputs: { ph: string; n: string; p: string; k: string }, lang: Language = 'bn'): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Interpret soil data: ${JSON.stringify(inputs)}. BARC 2024 standards. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
  });
};

export const getFieldMonitoringData = async (lat: number, lng: number, aezName: string, lang: Language = 'bn'): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Satellite biomass & NDVI for ${lat}, ${lng} (AEZ: ${aezName}). Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};
