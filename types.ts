
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
  PODCAST = 'PODCAST'
}

export interface UserCrop {
  id: string;
  name: string;
  variety: string;
  sowingDate: string;
  location: string;
}

export interface AgriTask {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string;
  completed: boolean;
  crop?: string;
  category: 'planting' | 'fertilizer' | 'irrigation' | 'pesticide' | 'harvest' | 'other';
  notes?: string;
}

export interface UserProgress {
  xp: number;
  level: number;
  rank: string;
  streak: number;
  lastActive: number;
  badges: string[];
  masteredTopics: string[];
  skills: {
    soil: number;
    protection: number;
    technology: number;
  };
}

export interface UserSettings {
  theme: 'light' | 'dark';
  notifications: {
    weather: boolean;
    market: boolean;
    cropHealth: boolean;
  };
}

export interface SavedReport {
  id: string;
  type: string;
  title: string;
  content: string;
  timestamp: number;
  icon?: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  mobile?: string;
  farmLocation?: {
    district: string;
    upazila: string;
  };
  preferredCategories?: string[];
  settings?: UserSettings;
  progress: UserProgress;
  myCrops: UserCrop[];
  savedReports: SavedReport[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  groundingChunks?: GroundingChunk[];
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface AnalysisResult {
  diagnosis: string;
  advisory: string;
  fullText: string;
  groundingChunks?: GroundingChunk[];
}

export interface SavedAnalysis {
  id: string;
  timestamp: number;
  image: string;
  mimeType: string;
  result: AnalysisResult;
  cropFamily?: string;
  focusArea?: string;
}

export interface AppConfig {
  apiKey: string;
}

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  category: string;
}

export interface ForecastDay {
  date: string;
  condition: string;
  maxTemp: number;
  minTemp: number;
  rainProbability: number;
}

export interface WeatherData {
  city: string;
  upazila: string;
  district: string;
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  evapotranspiration: number;
  soilTemperature: number;
  solarRadiation: number;
  gdd: number;
  forecast: ForecastDay[];
}

export interface CropDisease {
  name: string;
  symptoms: string;
  bioControl: string;
  chemControl: string;
  severity: string;
}

export interface CropPest {
  name: string;
  damageSymptoms: string;
  bioControl: string;
  chemControl: string;
  severity: string;
}

export interface CropDiseaseReport {
  cropName: string;
  summary: string;
  diseases: CropDisease[];
  pests: CropPest[];
}

export interface AgriQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}
