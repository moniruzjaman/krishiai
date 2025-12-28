
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AnalysisResult, GroundingChunk, FlashCard, AgriTask, UserCrop, User, WeatherData, CropDiseaseReport, AgriQuizQuestion } from "../types";
import { AEZInfo } from "./locationService";

const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.error?.code || (error?.message?.includes('503') ? 503 : 0);
      if (status === 503 || status === 500 || status === 429) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
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
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
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
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

export const getLiveWeather = async (lat: number, lng: number, forceRefresh: boolean = false): Promise<WeatherData> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Using Google Search, fetch the absolute latest localized real-time weather metrics and a 7-day forecast for the location at coordinates (${lat}, ${lng}) in Bangladesh.
    GROUNDING: You MUST prioritize "Google Weather" data for current temperature, humidity, wind speed, and rain probability. 
    Use this data to calculate agricultural metrics like GDD and Evapotranspiration (ET0).
    Return the response strictly as JSON in professional Bangla.
    Include:
    1. Current stats (temp, upazila, district, humidity, windSpeed, rainProbability, ET0, soilTemp, solarRadiation, GDD).
    2. A full 7-day forecast.
    All descriptive strings must be in Bangla.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            city: { type: Type.STRING },
            upazila: { type: Type.STRING },
            district: { type: Type.STRING },
            temp: { type: Type.NUMBER },
            condition: { type: Type.STRING },
            description: { type: Type.STRING },
            humidity: { type: Type.NUMBER },
            windSpeed: { type: Type.NUMBER },
            rainProbability: { type: Type.NUMBER },
            evapotranspiration: { type: Type.NUMBER },
            soilTemperature: { type: Type.NUMBER },
            solarRadiation: { type: Type.NUMBER },
            gdd: { type: Type.NUMBER },
            forecast: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  condition: { type: Type.STRING },
                  maxTemp: { type: Type.NUMBER },
                  minTemp: { type: Type.NUMBER },
                  rainProbability: { type: Type.NUMBER }
                },
                required: ["date", "condition", "maxTemp", "minTemp", "rainProbability"]
              }
            }
          },
          required: ["city", "upazila", "district", "temp", "condition", "description", "humidity", "windSpeed", "rainProbability", "evapotranspiration", "soilTemperature", "solarRadiation", "gdd", "forecast"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const getTrendingMarketPrices = async (): Promise<any[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Using Google Search, find the absolute latest retail and wholesale prices for key agricultural commodities (Rice, Potato, Onion, Green Chili, Egg, Beef) in Dhaka markets today. 
    GROUNDING: Prioritize data from dam.gov.bd and reliable news sources. 
    Return strictly as a JSON array of objects.
    Schema: [{ name: string, category: string, unit: string, price: number, trend: 'up'|'down'|'stable', change: string }].
    Output in professional Bangla.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              unit: { type: Type.STRING },
              price: { type: Type.NUMBER },
              trend: { type: Type.STRING, enum: ['up', 'down', 'stable'] },
              change: { type: Type.STRING }
            },
            required: ["name", "category", "unit", "price", "trend", "change"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  });
};

export const generateGroundedWeatherReport = async (location: string): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `As a Senior Agro-Meteorologist, integrate current "Google Weather" data for ${location} with official agricultural advisories and meteorological alerts from the BAMIS (Bangladesh Agricultural Meteorological Information System) portal.
    Provide an "Official Agriculture Impact Report" in professional Bangla.
    Include: 
    1. Pest/Disease risk associations based on moisture and heat (BAMIS guidelines).
    2. Specific crop-wise advisories (e.g., Rice, Potato, Mustard).
    3. Grounded source links specifically mentioning BAMIS and BMD.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return {
      text: response.text || "",
      groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
    };
  });
};

export const analyzeCropImage = async (base64Image: string, mimeType: string, options?: { focus?: string, cropFamily?: string, userRank?: string, userCrops?: UserCrop[], query?: string }): Promise<AnalysisResult & { groundingChunks?: GroundingChunk[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `You are a Senior Agriculture Scientist specializing in Bangladesh crops. 
    Your mission is to provide precision diagnostics and professional advisory grounded in official standards.
    
    STRICT PROTOCOLS:
    1. DIAGNOSIS: Follow CABI Plantwise Knowledge Bank field diagnosis guide standards.
    2. ADVISORY: Ground recommendations strictly in official BARC (Bangladesh Agricultural Research Council), BRRI (Rice), BARI (Other crops), DAE, and SRDI (Soil) guidelines.
    3. STANDARDS HIGHLIGHT: Explicitly mention the government standard used (e.g., "BARC ২০২৪ সার নির্দেশিকা অনুযায়ী...").
    4. LANGUAGE: All output must be in professional, clear Bangla.
    5. FOCUS: Accurately identify Pests, Diseases, and Nutrient Deficiencies from images.`;

    const prompt = `বিশ্লেষণ করুন:
    ফসল: ${options?.cropFamily || 'অনির্ধারিত'}
    বিশ্লেষণের ক্ষেত্র: ${options?.focus || 'সামগ্রিক স্বাস্থ্য'}
    ব্যবহারকারীর প্রশ্ন/মন্তব্য: ${options?.query || 'কোনটি নির্দিষ্ট করা নেই'}
    ব্যবহারকারীর স্তর: ${options?.userRank || 'নবিশ কৃষক'}

    CABI ও সরকারি (BARC/BARI/BRRI/DAE/SRDI) মানদণ্ড অনুযায়ী লক্ষণ শনাক্ত করুন এবং প্রতিকার দিন। ব্যবহারকারীর প্রশ্নের উত্তর গুরুত্বের সাথে দিন।`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ inlineData: { data: base64Image, mimeType } }, { text: prompt }] },
      config: { 
        systemInstruction,
        tools: [{ googleSearch: {} }] 
      }
    });
    return { 
      diagnosis: "সফলভাবে শনাক্তকৃত", 
      advisory: "বিজ্ঞানী নির্ধারিত সমাধান", 
      fullText: response.text || "", 
      groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] 
    };
  });
};

export const performSoilHealthAudit = async (data: any, aez?: AEZInfo) => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `আপনি একজন জ্যেষ্ঠ মৃত্তিকা বিজ্ঞানী। BARC এবং SRDI এর মানদণ্ড অনুযায়ী মৃত্তিকা অডিট করুন। ডাটা: pH:${data.ph}, OC:${data.oc}, N:${data.n}, P:${data.p}, K:${data.k}। ভাষা: বাংলা।`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
  });
};

export const sendChatMessage = async (history: any[], newMessage: string, userRank: string = 'নবিশ কৃষক', weatherContext?: WeatherData, userCrops: UserCrop[] = []) => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `আপনি Krishi AI এর সিনিয়র এগ্রোনোমিস্ট, মৃত্তিকা বিজ্ঞানী এবং বাজার বিশ্লেষক।
    
    আপনার প্রধান কাজগুলো হলো:
    ১. কৃষি পরামর্শের জন্য অবশ্যই BARC, BARI, BRRI এবং DAE এর অফিসিয়াল নির্দেশিকা এবং আধুনিক গবেষণা ফলাফল অনুসরণ করুন।
    ২. মৃত্তিকা স্বাস্থ্য এবং সারের মাত্রার জন্য SRDI এর মানদণ্ড ও AEZ ম্যাপ ব্যবহার করুন।
    ৩. বাংলাদেশের বর্তমান বাজার দরের (Retail/Wholesale) জন্য 'dam.gov.bd' এবং 'BAMIS' পোর্টাল থেকে সর্বশেষ তথ্য অনুসন্ধান করুন।
    ৪. আবহাওয়া সম্পর্কিত তথ্যের জন্য Google Weather এবং BAMIS এর ওপর নির্ভর করুন।
    ৫. সকল উত্তর অত্যন্ত পেশাদার বাংলায় দিন এবং তথ্যসূত্র (Verified Sources) উল্লেখ করুন।
    ৬. আপনি বাংলাদেশের কৃষি মন্ত্রণালয় এবং এর অধীনস্থ সকল সরকারি সংস্থার এআই প্রতিনিধি হিসেবে কাজ করছেন।
    
    আপনার বর্তমান ব্যবহারকারীর স্তর: ${userRank}।
    অতিরিক্ত প্রেক্ষাপট:
    - চাষকৃত ফসল: ${userCrops.map(c => c.name).join(', ') || 'এখনো যোগ করা হয়নি'}
    - এলাকা: ${weatherContext ? weatherContext.upazila + ', ' + weatherContext.district : 'শনাক্ত হয়নি'}
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [...history, { role: 'user', parts: [{ text: newMessage }] }],
      config: { 
        tools: [{ googleSearch: {} }], 
        systemInstruction 
      }
    });
    
    return {
      text: response.text || "",
      groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
    };
  });
};

export const getHomeQuickTip = async (crops: UserCrop[], weather?: WeatherData): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cropsStr = crops.map(c => c.name).join(', ');
    const prompt = `আমার ফসল: ${cropsStr}। বর্তমানে জরুরি কৃষি টিপস বাংলায় দিন। BARC/BARI/BRRI/DAE এর নির্দেশিকা অনুসরণ করুন। বর্তমান আবহাওয়া (Google Weather ভিত্তিক): ${weather ? weather.condition : 'অজানা'}।`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
  });
};

export const generateAgriImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ text: prompt }],
  });
  return `data:image/png;base64,${response.candidates[0].content.parts.find(p => p.inlineData)?.inlineData?.data}`;
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } }
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const searchAgriculturalInfo = async (query: string): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: { tools: [{ googleSearch: {} }] }
  });
  return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
};

export const getAICropSchedule = async (crop: string, date: string, season: string): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Schedule for ${crop} based on DAE and BARC guides. JSON Bangla.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, dueDate: { type: Type.STRING }, category: { type: Type.STRING }, notes: { type: Type.STRING } } }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const getAgriQuiz = async (topic: string): Promise<AgriQuizQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `MCQ for ${topic} based on BARI/BRRI curriculum. JSON Bangla.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.INTEGER }, explanation: { type: Type.STRING } } }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const getAgriPodcastSummary = async (topic: string): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Podcast script for "${topic}" in Bangla using official agri news.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
};

export const getAIYieldPrediction = async (crop: string, aez: string, soilStatus: string, farmingPractice: string, waterManagement: string, additionalNotes: string, userRank: string = 'নবিশ কৃষক', traits: Record<string, string> = {}): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Predict yield for ${crop} in ${aez} using BARC models. Soil: ${soilStatus}. Practice: ${farmingPractice}. Bangla.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
};

export const getLCCAnalysisSummary = async (lcc: number, tsr: number, dose: string, lang: 'en' | 'bn'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `LCC Value ${lcc}, Dose ${dose} based on BRRI LCC Guide. Summary in ${lang}.`,
  });
  return response.text || "";
};

export const identifyPlantSpecimen = async (base64Image: string, mimeType: string): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ inlineData: { data: base64Image, mimeType } }, { text: "এই উদ্ভিদটি শনাক্ত করুন। CABI এবং স্থানীয় উদ্ভিদ ডাটাবেস ব্যবহার করে বিস্তারিত বৈজ্ঞানিক নাম, পরিবার এবং এর গুরুত্ব অত্যন্ত পেশাদার বাংলায় লিখুন। উত্তরটি অবশ্যই সম্পূর্ণ বাংলায় হতে হবে।" }] },
    config: { tools: [{ googleSearch: {} }] }
  });
  return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
};

export const getPersonalizedAgriAdvice = async (crops: UserCrop[], rank?: string, categories?: string[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Advice for crops: ${crops.map(c => c.name).join(', ')} following BARC guidelines. User rank: ${rank}. Bangla.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "";
};

export const getAgriFlashCards = async (topic: string): Promise<FlashCard[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Flashcards for ${topic}. JSON Bangla.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, front: { type: Type.STRING }, back: { type: Type.STRING }, hint: { type: Type.STRING }, category: { type: Type.STRING } } }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const getAgriMetaExplanation = async (query: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
  });
  return response.text || "";
};

export const getPesticideRotationAdvice = async (query: string): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Rotation guide for: "${query}" using IRAC/FRAC and DAE standards. Bangla.`;
    config: { tools: [{ googleSearch: {} }] }
  });
  return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
};

export const analyzePesticideMixing = async (items: any[], weather?: WeatherData): Promise<{ text: string; groundingChunks: GroundingChunk[]; compatibility: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts = items.map(i => i.data ? { inlineData: { data: i.data, mimeType: i.mimeType } } : { text: i.text });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [...parts, { text: "Analyze mixing safety using official DAE compatibility charts. Bangla." }] },
    config: { tools: [{ googleSearch: {} }] }
  });
  return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [], compatibility: response.text?.includes('নিরাপদ') ? 'Safe' : 'Warning' };
};

export const getPesticideExpertAdvice = async (prompt: string): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  return { text: response.text || "", groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] };
};

export const getBiocontrolExpertAdvice = async (query: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Biocontrol for: "${query}" based on BARI IPM Lab reports. Bangla.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "";
};

export const interpretSoilReportAI = async (inputs: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Soil report using SRDI critical limits: pH=${inputs.ph}, N=${inputs.n}. Bangla.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "";
};

export const getCropDiseaseInfo = async (crop: string): Promise<{ data: CropDiseaseReport }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Disease report for ${crop} based on BARC digital library. JSON format.`,
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cropName: { type: Type.STRING },
          summary: { type: Type.STRING },
          diseases: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, symptoms: { type: Type.STRING }, bioControl: { type: Type.STRING }, chemControl: { type: Type.STRING }, severity: { type: Type.STRING } } } },
          pests: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, damageSymptoms: { type: Type.STRING }, bioControl: { type: Type.STRING }, chemControl: { type: Type.STRING }, severity: { type: Type.STRING } } } }
        }
      }
    }
  });
  return { data: JSON.parse(response.text || "{}") };
};

export const getFieldMonitoringData = async (lat: number, lng: number, aezName: string): Promise<{ text: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Field monitoring at (${lat}, ${lng}) using BAMIS satellite data. Bangla.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return { text: response.text || "" };
};

export const getAIPlantNutrientAdvice = async (crop: string, aez: string, soil: string, area: number, unit: string, userRank: string = 'নবিশ কৃষক') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Nutrient advice for ${crop} in ${aez} based on BARC-2024 guide. Bangla.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "";
};

export const generateAgriVideo = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  });
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }
  return `${operation.response?.generatedVideos?.[0]?.video?.uri}&key=${process.env.API_KEY}`;
};
