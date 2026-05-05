// services/csvLoader.ts
import { AnalysisResult } from '../types';

/**
 * CSV Data Loader for Krishi AI Diagnosis System
 * Loads crop diagnosis data and maps to Supabase storage paths
 */

export interface CropDiagnosisData {
  crop: string;
  symptom: string;
  diagnosis: string;
  category: string;
  source_url: string;
  management: string;
  bangla_management: string;
  image_path: string;
  confidence: number;
}

export interface CABITrainingImageData {
  image_id: string;
  crop: string;
  symptom: string;
  diagnosis: string;
  category: string;
  training_module: string;
  image_path: string;
  public_url: string;
  description: string;
  bangla_description: string;
}

export class CSVDataLoader {
  private static readonly BASE_URL = 'https://nmngzjrrysjzuxfcklrk.supabase.co/storage/v1/object/public/';

  /**
   * Load crop diagnosis data from CSV format
   * @returns Array of crop diagnosis data
   */
  static async loadCropDiagnosisData(): Promise<CropDiagnosisData[]> {
    // In production, this would load from actual CSV files
    // For now, return mock data that matches our CSV structure
    return [
      {
        crop: "rice",
        symptom: "yellowing_leaves",
        diagnosis: "Brown Plant Hopper (BPH) Infestation",
        category: "Pest",
        source_url: "https://dae.gov.bd/krishi-janala-2024",
        management: "Apply neem oil (নিম তেল) at 5ml/liter water; Use Trichoderma (ট্রাইকোডার্মা) as biocontrol agent",
        bangla_management: "নিম তেল 5ml/লিটার পানিতে ছিটিয়ে দিন; ট্রাইকোডার্মা বায়োকন্ট্রোল এজেন্ট হিসেবে ব্যবহার করুন",
        image_path: "Gallary/rice/yellowing_bph.jpg",
        confidence: 85
      },
      {
        crop: "rice",
        symptom: "stunted_growth",
        diagnosis: "Zinc Deficiency",
        category: "Deficiency",
        source_url: "https://barc.gov.bd/fertilizer-guide-2024",
        management: "Apply Zinc sulfate (জিংক সালফেট) at 10 kg/ha; Foliar spray with 0.5% ZnSO₄ solution",
        bangla_management: "জিংক সালফেট 10 কেজি/হেক্টর প্রয়োগ করুন; 0.5% ZnSO₄ দ্রবণে ফোলিয়ার স্প্রে করুন",
        image_path: "Gallary/rice/stunted_zinc.jpg",
        confidence: 80
      },
      // Add more entries as needed...
    ];
  }

  /**
   * Get public URL for an image in Supabase storage
   * @param imagePath - Path within the Gallary bucket
   * @returns Public URL
   */
  static getPublicImageUrl(imagePath: string): string {
    return `${this.BASE_URL}${imagePath}`;
  }

  /**
   * Get analysis result from diagnosis data
   * @param diagnosisData - Crop diagnosis data
   * @param lang - Language preference ('bn' or 'en')
   * @returns AnalysisResult object
   */
  static createAnalysisResult(diagnosisData: CropDiagnosisData, lang: string = 'bn'): AnalysisResult {
    return {
      id: `csv-${Date.now()}-${diagnosisData.crop}-${diagnosisData.symptom}`,
      timestamp: Date.now(),
      confidence: diagnosisData.confidence,
      diagnosis: diagnosisData.diagnosis,
      category: diagnosisData.category,
      management: lang === 'bn' ? diagnosisData.bangla_management : diagnosisData.management,
      source: diagnosisData.source_url,
      audioBase64: null,
      groundingChunks: [{
        web: {
          title: diagnosisData.source_url.split('/').pop() || 'Official Agricultural Guide',
          uri: diagnosisData.source_url
        }
      }]
    };
  }

  /**
   * Get training images for CABI modules
   * @param cropType - Crop type (e.g., 'rice', 'wheat')
   * @param symptomType - Symptom type (e.g., 'yellowing', 'spots')
   * @returns Array of training images
   */
  static async getTrainingImages(cropType?: string, symptomType?: string): Promise<CABITrainingImageData[]> {
    const allImages: CABITrainingImageData[] = [
      {
        image_id: "img_001",
        crop: "rice",
        symptom: "yellowing_leaves",
        diagnosis: "Brown Plant Hopper",
        category: "Pest",
        training_module: "1",
        image_path: "Gallary/rice/yellowing_bph.jpg",
        public_url: "https://nmngzjrrysjzuxfcklrk.supabase.co/storage/v1/object/public/Gallary/rice/yellowing_bph.jpg",
        description: "Rice leaves with yellowing and brown spots - BPH infestation",
        bangla_description: "ধানের পাতায় হলুদ ও বাদামি ছোপ - মাজরা পোকা আক্রমণ"
      },
      // More images...
    ];

    if (cropType && symptomType) {
      return allImages.filter(img =>
        img.crop.toLowerCase() === cropType.toLowerCase() &&
        img.symptom.toLowerCase().includes(symptomType.toLowerCase())
      );
    }

    return allImages;
  }
}

export const csvLoader = new CSVDataLoader();
