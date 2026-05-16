// services/enhancedRuleBasedAnalyzer.ts
import { AnalysisResult } from '../types';

// Official Bangladesh Agricultural Sources (DAE, BARI, BRRI, BARC)
const OFFICIAL_SOURCES = {
  DAE: "Department of Agricultural Extension (DAE) - dae.gov.bd",
  BARI: "Bangladesh Agricultural Research Institute (BARI) - bari.gov.bd",
  BRRI: "Bangladesh Rice Research Institute (BRRI) - brri.gov.bd",
  BARC: "Bangladesh Agricultural Research Council (BARC) - barc.gov.bd",
  AIS: "Agricultural Information Service (AIS) - ais.gov.bd"
};

// Crop-specific symptom databases with official source references
const CROP_SYMPTOM_DB: Record<string, Record<string, { diagnosis: string; category: string; source: string; management: string[] }>> = {
  'rice': {
    'yellowing_leaves': {
      diagnosis: "Brown Plant Hopper (BPH) Infestation",
      category: "Pest",
      source: `${OFFICIAL_SOURCES.DAE} - Krishi Janala Guide 2024`,
      management: [
        "Apply neem oil (নিম তেল) at 5ml/liter water",
        "Use Trichoderma (ট্রাইকোডার্মা) as biocontrol agent",
        "Remove and destroy severely infected plants"
      ]
    },
    'stunted_growth': {
      diagnosis: "Zinc Deficiency",
      category: "Deficiency",
      source: `${OFFICIAL_SOURCES.BARC} - Fertilizer Recommendation Guide 2024`,
      management: [
        "Apply Zinc sulfate (জিংক সালফেট) at 10 kg/ha",
        "Foliar spray with 0.5% ZnSO₄ solution",
        "Improve soil organic matter with compost"
      ]
    },
    'brown_spots': {
      diagnosis: "Leaf Blast Disease",
      category: "Disease",
      source: `${OFFICIAL_SOURCES.BRRI} - Rice Disease Management Manual`,
      management: [
        "Spray with Carbendazim (কারবেনডাজিম) at 1g/liter water",
        "Maintain proper water management (avoid deep flooding)",
        "Use resistant varieties like BRRI dhan29"
      ]
    }
  },
  'wheat': {
    'yellow_stripes': {
      diagnosis: "Stripe Rust Disease",
      category: "Disease",
      source: `${OFFICIAL_SOURCES.BARI} - Wheat Disease Identification Guide`,
      management: [
        "Spray with Tebuconazole (টেবুকোনাজোল) at 0.5g/liter",
        "Plant rust-resistant varieties like BARI Gom 28",
        "Avoid excessive nitrogen application"
      ]
    },
    'white_heads': {
      diagnosis: "Fusarium Head Blight",
      category: "Disease",
      source: `${OFFICIAL_SOURCES.DAE} - Wheat Disease Management`,
      management: [
        "Crop rotation with non-host crops",
        "Seed treatment with carbendazim",
        "Harvest early to avoid spread"
      ]
    }
  },
  'potato': {
    'black_rot': {
      diagnosis: "Black Rot Disease",
      category: "Disease",
      source: `${OFFICIAL_SOURCES.BARI} - Potato Disease Guide`,
      management: [
        "Use certified disease-free seed tubers",
        "Apply copper oxychloride (কপার অক্সিক্লোরাইড) at 2g/liter",
        "Practice crop rotation with cereals"
      ]
    },
    'leaf_curling': {
      diagnosis: "Potato Leaf Roll Virus",
      category: "Disease",
      source: `${OFFICIAL_SOURCES.BRRI} - Viral Diseases in Potatoes`,
      management: [
        "Use virus-free seed potatoes",
        "Control aphid vectors with neem oil",
        "Remove and destroy infected plants immediately"
      ]
    }
  },
  'general': {
    'yellowing': {
      diagnosis: "Nitrogen Deficiency",
      category: "Deficiency",
      source: `${OFFICIAL_SOURCES.BARC} - Nutrient Deficiency Symptoms`,
      management: [
        "Apply urea (ইউরিয়া) at 50 kg/ha",
        "Foliar spray with 2% urea solution",
        "Incorporate green manure crops"
      ]
    },
    'wilting': {
      diagnosis: "Water Stress or Root Damage",
      category: "Abiotic",
      source: `${OFFICIAL_SOURCES.DAE} - Crop Water Management Guide`,
      management: [
        "Adjust irrigation schedule based on soil moisture",
        "Improve soil structure with organic matter",
        "Check for root-feeding pests like nematodes"
      ]
    },
    'spots': {
      diagnosis: "Fungal Leaf Spot",
      category: "Disease",
      source: `${OFFICIAL_SOURCES.BARI} - General Fungal Diseases`,
      management: [
        "Spray with Mancozeb (ম্যানকোজেব) at 2g/liter",
        "Ensure proper plant spacing for air circulation",
        "Remove and destroy infected leaves"
      ]
    }
  }
};

export const getEnhancedRuleBasedAnalysis = (cropFamily: string, symptoms: string[], lang: string = 'bn'): AnalysisResult => {
  // Normalize crop family
  const normalizedCrop = cropFamily.toLowerCase().replace(/\s+/g, '');

  // Find matching symptoms in database
  let bestMatch: { diagnosis: string; category: string; source: string; management: string[] } | null = null;
  let highestConfidence = 0;

  // Check specific crop first
  if (CROP_SYMPTOM_DB[normalizedCrop]) {
    symptoms.forEach(symptom => {
      const symptomKey = symptom.toLowerCase().replace(/\s+/g, '');
      if (CROP_SYMPTOM_DB[normalizedCrop][symptomKey]) {
        const match = CROP_SYMPTOM_DB[normalizedCrop][symptomKey];
        // Higher confidence for exact matches
        const confidence = 85;
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = match;
        }
      }
    });
  }

  // Check general symptoms if no specific matches
  if (!bestMatch) {
    symptoms.forEach(symptom => {
      const symptomKey = symptom.toLowerCase().replace(/\s+/g, '');
      if (CROP_SYMPTOM_DB.general[symptomKey]) {
        const match = CROP_SYMPTOM_DB.general[symptomKey];
        // Lower confidence for general matches
        const confidence = 70;
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = match;
        }
      }
    });
  }

  // Generate analysis result
  if (bestMatch) {
    return {
      id: `enhanced-rule-${Date.now()}`,
      timestamp: Date.now(),
      confidence: highestConfidence,
      diagnosis: bestMatch.diagnosis,
      category: bestMatch.category,
      management: bestMatch.management.join('\n• ') + '\n\nSource: ' + bestMatch.source,
      source: bestMatch.source,
      audioBase64: null,
      groundingChunks: [{
        web: {
          title: bestMatch.source.split(' - ')[0],
          uri: bestMatch.source.includes('dae.gov.bd') ? 'https://dae.gov.bd' :
               bestMatch.source.includes('bari.gov.bd') ? 'https://bari.gov.bd' :
               bestMatch.source.includes('brri.gov.bd') ? 'https://brri.gov.bd' :
               bestMatch.source.includes('barc.gov.bd') ? 'https://barc.gov.bd' : ''
        }
      }]
    };
  }

  // Fallback to generic response
  return {
    id: `fallback-${Date.now()}`,
    timestamp: Date.now(),
    confidence: 40,
    diagnosis: lang === 'bn' ? "এআই স্ক্যানার বর্তমানে উপলব্ধ নয়।" : "AI Scanner is currently unavailable.",
    category: "Other",
    management: lang === 'bn'
      ? "দয়া করে আপনার স্থানীয় কৃষি প্রসারণ অফিসের সাথে যোগাযোগ করুন। আপনি এখানে ছবি আপলোড করতে পারেন এবং পরে আবার চেষ্টা করতে পারেন।"
      : "Please contact your local agricultural extension office. You can upload images here and try again later.",
    source: "Krishi AI Enhanced Fallback System",
    audioBase64: null,
    groundingChunks: []
  };
};
