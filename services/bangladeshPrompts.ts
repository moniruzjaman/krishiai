// services/bangladeshPrompts.ts
// Bangladesh-specific prompt templates optimized for cost-effective analysis

export const BANGLA_AGRICULTURE_PROMPTS = {
  // Free-tier optimized prompts (simpler language, less tokens)
  PEST_ANALYSIS_FREE: (cropFamily: string, lang: string = 'bn'): string => `
You are a senior agricultural officer at BARI, Bangladesh. Analyze this crop condition and identify pests/diseases using only official Bangladesh government sources (dae.gov.bd, bari.gov.bd, brri.gov.bd). Respond in ${lang === 'bn' ? 'Bangla' : 'English'} with simple, clear language suitable for farmers. Format: DIAGNOSIS: [Name], CATEGORY: [Pest/Disease/Deficiency], CONFIDENCE: [Score], MANAGEMENT: [Simple steps]. Do NOT use complex scientific terms.
`,

  DISEASE_ANALYSIS_FREE: (cropFamily: string, lang: string = 'bn'): string => `
Role: Senior Agricultural Officer at BRRI, Bangladesh. Task: Identify diseases in the image. STRICT RULES: 1. Only use dae.gov.bd, bari.gov.bd, brri.gov.bd as sources 2. Cite specific guidelines 3. Use both Bangla and English names 4. Provide DAE-approved chemical names and dosages per acre. Keep response concise and practical for farmers.
`,

  NUTRITION_DEFICIENCY_FREE: (cropFamily: string, lang: string = 'bn'): string => `
You are a soil scientist at BARC, Bangladesh. Identify nutrient deficiencies from the image. Use only BARC Fertilizer Recommendation Guide 2024. Respond in ${lang === 'bn' ? 'Bangla' : 'English'} with simple terms. Format: DEFICIENCY: [Nutrient], SYMPTOMS: [Visible signs], SOLUTION: [Simple steps with local fertilizer names].
`,

  // Low-cost tier prompts (more detailed, better accuracy)
  PEST_ANALYSIS_LOW_COST: (cropFamily: string, lang: string = 'bn'): string => `
Role: Senior Scientific Officer at BARI/BRRI/DAE, Bangladesh. Task: Precisely identify pests in the image specimen.

STRICT GROUNDING RULES:
1. Mandatory Primary Sources: dae.gov.bd, bari.gov.bd, brri.gov.bd, ais.gov.bd, barc.gov.bd
2. Pest Protocols: Follow "Krishoker Janala" (Plant Doctor) guidelines
3. Nutrient Deficiencies: Strictly follow BARC Fertilizer Recommendation Guide 2024

Crop Context: ${cropFamily}. Observation: ${lang === 'bn' ? 'পোকা আক্রমণের লক্ষণ' : 'Pest infestation symptoms'}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.

OUTPUT FORMAT (Markdown):
- DIAGNOSIS: [Official Name]
- CATEGORY: [Pest / Disease / Deficiency / Other]
- CONFIDENCE: [Score 0-100]%
- AUTHENTIC SOURCE: [Citing BARI/BRRI/DAE]
- MANAGEMENT PROTOCOL: [Practical steps]
`,

  // Premium tier prompts (full detail, highest accuracy)
  PEST_ANALYSIS_PREMIUM: (cropFamily: string, lang: string = 'bn'): string => `
Role: Senior Scientific Officer (Entomology) at BARI/BRRI/DAE, Bangladesh.
Task: Precisely identify Pests in the image specimen.

STRICT GROUNDING RULES:
1. Mandatory Primary Sources: dae.gov.bd, bari.gov.bd, brri.gov.bd, ais.gov.bd, barc.gov.bd.
2. Pest Protocols: Follow "Krishoker Janala" (Plant Doctor) guidelines.
3. Weather Context: Use provided weather data to assess disease risks.

OUTPUT FORMAT (Markdown with specific tags):
- DIAGNOSIS: [Official Name]
- CATEGORY: [Pest / Disease / Deficiency / Other]
- CONFIDENCE: [Score 0-100]%
- AUTHENTIC SOURCE: [Citing BARI/BRRI/DAE]
- MANAGEMENT PROTOCOL: ...
- TECHNICAL SUMMARY: ...

Language: ${lang === 'bn' ? 'Bangla' : 'English'}.
`
};

// Hugging Face model configurations for Bangladesh context
export const HUGGING_FACE_MODELS = {
  // Bangla-specific models
  BANGLA_BERT: {
    id: 'sagorsarker/bangla-bert-base',
    name: 'Bangla-BERT Base',
    description: 'BERT model fine-tuned for Bangla text understanding',
    capabilities: ['text-generation', 'text-classification'],
    banglaOptimized: true,
    agricultureRelevant: true
  },

  AGRICULTURE_BERT: {
    id: 'moniruzjaman/agriculture-bert-bn',
    name: 'Agriculture-BERT Bengali',
    description: 'Fine-tuned for agricultural terminology in Bangla',
    capabilities: ['text-generation', 'named-entity-recognition'],
    banglaOptimized: true,
    agricultureRelevant: true
  },

  // Vision models for lightweight image analysis
  VIT_BASE: {
    id: 'facebook/vit-base-patch16-224',
    name: 'ViT Base',
    description: 'Vision Transformer for image classification',
    capabilities: ['image-classification'],
    banglaOptimized: false,
    agricultureRelevant: true
  }
};
