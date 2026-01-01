
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
      const errorMessage = error?.message || "";
      const errorBody = typeof error === 'string' ? error : JSON.stringify(error);
      
      const isReferrerBlocked = errorMessage.includes("API_KEY_HTTP_REFERRER_BLOCKED") || 
                                errorBody.includes("blocked") || 
                                errorBody.includes("PERMISSION_DENIED");
      
      const isEntityNotFound = errorMessage.includes("Requested entity was not found");

      if (isReferrerBlocked || isEntityNotFound) {
        window.dispatchEvent(new CustomEvent('agritech_api_key_invalid', { 
          detail: { message: isReferrerBlocked ? "REFERRER_BLOCKED" : "NOT_FOUND" } 
        }));
        throw error;
      }

      if (error?.status === 429 || error?.status === 500) {
        const delay = Math.pow(2, i) * 2000;
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

export const analyzeCropImage = async (base64Data: string, mimeType: string, options?: { cropFamily?: string, userRank?: string, query?: string, lang?: Language, weather?: WeatherData }): Promise<AnalysisResult> => {
  const lang = options?.lang || 'bn';
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `Role: Senior BARC/DAE Agronomist. 
    Task: Identify issue (Pest/Disease/Deficiency).
    SIGNBOARD DETECTION: If a government/research signboard is visible in the media, strictly extract:
    1. Variety Name (e.g. BRRI dhan89)
    2. Sowing/Planting Date
    3. Plot ID
    Incorporate this into the diagnosis.
    Weather Context: ${JSON.stringify(options?.weather)}.
    Source: DAE/BARC/BRRI standards.
    Language: ${lang === 'bn' ? 'Bangla' : 'English'}.
    JSON Output: { "diagnosis": string, "category": "Pest"|"Disease"|"Deficiency"|"Other", "confidence": number, "advisory": string, "fullText": string, "officialSource": string }`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ parts: [{ inlineData: { data: base64Data, mimeType } }, { text: `Analyze symptoms in ${options?.cropFamily}. User Query: ${options?.query}. Check for signboards.` }] }],
      config: { systemInstruction, responseMimeType: "application/json", tools: [{ googleSearch: {} }] }
    });
    
    const parsed = extractJSON<any>(response.text || "{}", {});
    return { ...parsed, groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const requestPrecisionParameters = async (base64Data: string, mimeType: string, crop: string, lang: Language = 'bn', previousAnswers?: Record<string, string>): Promise<any[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = previousAnswers ? `Previous context: ${JSON.stringify(previousAnswers)}.` : '';
    const prompt = `Review this ${crop} media. ${context} 
    To reach 100% precision for DAE protocols, generate 3-5 follow-up questions. 
    Support types: "select" (include options), "date", "text", "number".
    JSON Format: [{ "id": string, "label": "Question in ${lang}", "type": string, "options": [] if select, "hint": string }]`;

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
    const systemInstruction = `Role: Chief Scientist BARC. 
    Data: ${JSON.stringify(dynamicData)}. 
    Weather: ${JSON.stringify(weather)}. 
    Language: ${lang === 'bn' ? 'Bangla' : 'English'}.
    JSON Output: { "diagnosis": string, "category": string, "confidence": number, "advisory": string, "fullText": string, "officialSource": string }`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ parts: [{ inlineData: { data: base64Data, mimeType } }, { text: `Final Audit for ${crop} with all dynamic context.` }] }],
      config: { systemInstruction, responseMimeType: "application/json", tools: [{ googleSearch: {} }] }
    });

    const parsed = extractJSON<any>(response.text || "{}", {});
    return { ...parsed, groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const searchNearbySellers = async (lat: number, lng: number, type: string = 'Agri seed and pesticide store', lang: Language = 'bn') => {
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
    const systemInstruction = `Role: Krishi AI Consultant. Rank: ${userRank}. Role: ${userRole}. Weather: ${JSON.stringify(weather)}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}. Source: gov.bd only.`;
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
      contents: `Search BMD/BAMIS for current weather at ${lat}, ${lng} Bangladesh. 
      Required JSON Output keys: upazila, district, temp, condition, description, humidity, windSpeed, rainProbability, diseaseRisk, evapotranspiration, soilTemperature, solarRadiation, gdd. 
      Also include a 7-day forecast as an array of objects: forecast: [{date: string, maxTemp: number, minTemp: number, condition: string}]. 
      IMPORTANT: "diseaseRisk" should contain specific associations like "High blast risk for Rice" or "Blight risk for Potato" based on temp/humidity. 
      Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return extractJSON<WeatherData>(response.text || "{}", { 
      upazila: "অজানা", 
      district: "অজানা", 
      temp: 0, 
      condition: "অজানা", 
      description: "", 
      humidity: 0, 
      windSpeed: 0, 
      rainProbability: 0, 
      diseaseRisk: "",
      evapotranspiration: 0,
      soilTemperature: 0,
      solarRadiation: 0,
      gdd: 0,
      forecast: []
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
      config: { tools: [{ googleSearch: {} }] }
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
      contents: `Soil health audit for data ${JSON.stringify(data)} in AEZ ${aez?.name || 'Local'}. Weather: ${JSON.stringify(weather)}. Using BARC 2024 standards. Brief advisory in ${lang === 'bn' ? 'Bangla' : 'English'}.`,
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

export const generateAgriVideo = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let operation = await ai.models.generateVideos({ model: 'veo-3.1-fast-generate-preview', prompt: `Tutorial on ${prompt}`, config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' } });
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  return downloadLink ? `${downloadLink}&key=${process.env.API_KEY}` : "";
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
      contents: `Clarify soil audit for inputs ${JSON.stringify(inputs)} in ${region}. Generate 3-5 JSON questions. Types: "select", "number", "text", "date". Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
      config: { responseMimeType: "application/json" }
    });
    return extractJSON<any[]>(response.text || "[]", []);
  });
};

export const requestPesticidePrecisionParameters = async (query: string, lang: Language = 'bn'): Promise<any[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Pesticide Expert Query: "${query}". 
    To provide 100% precise DAE dosage and safety protocol, generate 3-5 follow-up questions. 
    Support types: "select" (include options), "date", "text", "number".
    JSON Format: [{ "id": string, "label": "Question in ${lang}", "type": string, "options": [] if select, "hint": string }]`;

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
    const prompt = `Deep Pesticide Audit for: "${query}".
    User context: ${JSON.stringify(dynamicData)}.
    Provide official DAE/IRAC compliant advice in ${lang === 'bn' ? 'Bangla' : 'English'}. Source: dae.gov.bd.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
  });
};

export const performDeepSoilAudit = async (inputs: any, region: string, dynamicData: Record<string, string>, lang: Language = 'bn'): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Deep Soil Health Audit. Inputs: ${JSON.stringify(inputs)}. Region: ${region}. Context: ${JSON.stringify(dynamicData)}.
    Using BARC 2024 standards, provide specialized advice in ${lang === 'bn' ? 'Bangla' : 'English'}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
      contents: `Generate 5 multiple choice questions on "${topic}" for farmers. Return JSON array of objects: {question, options: [4 strings], correctAnswer: number(0-3), explanation}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
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
      contents: `Explain "${term}" in the context of Bangladesh agriculture. Provide a detailed definition, usage, and importance. Respond in ${lang === 'bn' ? 'Bangla' : 'English'}.`,
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
      contents: `DAI/BARI info for "${crop}". JSON format: {cropName, summary, diseases:[], pests:[]}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
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
      contents: `Interpret soil lab data: ${JSON.stringify(inputs)}. BARC 2024 standards. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
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
