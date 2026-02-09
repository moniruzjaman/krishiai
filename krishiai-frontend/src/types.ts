
export type Language = 'bn' | 'en';
export type UserRole = 'farmer_entrepreneur' | 'policy_maker' | 'extension_provider' | 'input_seller' | 'others';

export enum View {
  HOME = 'HOME',
  TOOLS = 'TOOLS',
  CHAT = 'CHAT',
  SEARCH = 'SEARCH',
  ANALYZER = 'ANALYZER',
  WEATHER = 'WEATHER',
  NUTRIENT_CALC = 'NUTRIENT_CALC',
  BIOCONTROL = 'BIOCONTROL',
  SOIL_GUIDE = 'SOIL_GUIDE',
  DEFENSE_GUIDE = 'DEFENSE_GUIDE',
  PEST_EXPERT = 'PEST_EXPERT',
  SOIL_EXPERT = 'SOIL_EXPERT',
  YIELD_CALCULATOR = 'YIELD_CALCULATOR',
  AI_YIELD_PREDICTION = 'AI_YIELD_PREDICTION',
  CROP_DISEASE_LIBRARY = 'CROP_DISEASE_LIBRARY',
  QR_GENERATOR = 'QR_GENERATOR',
  MONITORING = 'MONITORING',
  LEAF_COLOR_CHART = 'LEAF_COLOR_CHART',
  LEARNING_CENTER = 'LEARNING_CENTER',
  PROFILE = 'PROFILE',
  ABOUT = 'ABOUT',
  FLASHCARDS = 'FLASHCARDS',
  TASK_SCHEDULER = 'TASK_SCHEDULER',
  FAQ = 'FAQ',
  CROP_CALENDAR = 'CROP_CALENDAR',
  PODCAST = 'PODCAST',
  CABI_TRAINING = 'CABI_TRAINING',
  MAPS = 'MAPS',
  ANALYTICS = 'ANALYTICS'
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  groundingChunks?: GroundingChunk[];
}

export interface HFClassificationResult {
  label: string;
  score: number;
}

export type AIModel = 'gemini-2.5-flash' | 'gemini-2.0-flash' | 'kimi-2.5' | 'qwen-vl' | 'ollama-llama2' | 'gemini-kimi-consensus';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SourceReference {
  source: 'CABI_PLANTWISE' | 'BRRI' | 'BARI' | 'WEB_SEARCH';
  title: string;
  url?: string;
  relevanceScore: number;
  excerpt: string;
}

export interface ManagementAdvice {
  immediate: string[];
  chemical: {
    product: string;
    concentration: string;
    interval: string;
  }[];
  organic: {
    product: string;
    concentration: string;
    interval: string;
  }[];
  preventive: string[];
  sprayTiming: string;
}

export interface AnalysisResult {
  diagnosis: string;
  symptoms: string[];
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  model: AIModel;
  reasoning: string[];
  sources: SourceReference[];
  management: ManagementAdvice;
  timestamp: Date;
  needsSecondOpinion: boolean;
  // Metadata/Legacy fields for backward compatibility
  category?: 'Pest' | 'Disease' | 'Deficiency' | 'Other';
  advisory?: string;
  fullText?: string;
  officialSource?: string;
  groundingChunks?: GroundingChunk[];
  hfResults?: HFClassificationResult[];
}

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  category?: string;
}

export interface AgriTask {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string;
  completed: boolean;
  category: 'planting' | 'fertilizer' | 'irrigation' | 'pesticide' | 'harvest' | 'other';
  crop?: string;
  notes?: string;
}

export interface UserCrop {
  id: string;
  name: string;
  variety: string;
  sowingDate: string;
  location: string;
  lat?: number;
  lng?: number;
}

export interface UserProgress {
  rank: string;
  level: number;
  xp: number;
  streak: number;
  skills: {
    soil: number;
    protection: number;
    technology: number;
  };
}

export interface SavedReport {
  id: string;
  timestamp: number;
  type: string;
  title: string;
  content: string;
  audioBase64?: string;
  imageUrl?: string;
  icon?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  notifications: {
    weather: boolean;
    market: boolean;
    cropHealth: boolean;
  };
  modelProvider?: string;
  aiStrategy?: string;
}

export interface User {
  uid?: string;
  displayName?: string;
  photoURL?: string;
  mobile?: string;
  role: UserRole;
  farmLocation?: {
    district: string;
    upazila: string;
    aez?: string;
  };
  progress: UserProgress;
  myCrops: UserCrop[];
  savedReports: SavedReport[];
  preferredCategories: string[];
  settings?: UserSettings;
}

export interface ForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  condition: string;
}

export interface WeatherData {
  city?: string;
  upazila: string;
  district: string;
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  evapotranspiration?: number;
  soilTemperature?: number;
  solarRadiation?: number;
  gdd?: number;
  diseaseRisk?: string;
  forecast?: ForecastDay[];
}

export interface CropDiseaseReport {
  cropName: string;
  summary: string;
  varieties: Array<{
    name: string;
    description: string;
  }>;
  diseases: Array<{
    name: string;
    symptoms: string;
    imageDescription: string;
    favorableEnvironment: string;
    bioControl: string;
    chemControl: string;
    severity: string;
  }>;
  pests: Array<{
    name: string;
    damageSymptoms: string;
    imageDescription: string;
    favorableEnvironment: string;
    bioControl: string;
    chemControl: string;
    severity: string;
  }>;
}

export interface QuotaStatus {
  gemini: {
    used: number;
    limit: number;
    remaining: number;
    percentageUsed: number;
    resetDate: Date;
  };
  kimi: {
    used: number;
    limit: number;
    remaining: number;
    percentageUsed: number;
    resetDate: Date;
  };
  canUseGemini: boolean;
  canUseKimi: boolean;
  currentTier: AIModel;
}

export interface OrchestrationConfig {
  cropType: string;
  region?: string;
  userId?: string;
  lang?: Language;
  weather?: WeatherData;
  userQuery?: string;
  precisionData?: Record<string, string>;
}

export interface AgriQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}