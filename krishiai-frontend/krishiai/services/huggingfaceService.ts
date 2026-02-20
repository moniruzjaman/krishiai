
/**
 * This service is deprecated. 
 * Vision classification is now handled directly by the Gemini API.
 */
export interface HFClassificationResult {
  label: string;
  score: number;
}

export const classifyPlantDiseaseHF = async (base64Data: string): Promise<HFClassificationResult[] | null> => {
  return null;
};
