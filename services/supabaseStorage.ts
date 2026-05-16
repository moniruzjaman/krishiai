// services/supabaseStorage.ts
import { supabase } from './supabase';
import { AnalysisResult } from '../types';

/**
 * Supabase Storage Service for Krishi AI
 * Handles image storage for diagnosis, gallery, and training data
 */

export const supabaseStorage = {
  /**
   * Upload file to Supabase Storage
   * @param bucketName - Storage bucket name (e.g., 'Gallary')
   * @param filePath - File path within bucket (e.g., 'diagnosis/12345.jpg')
   * @param file - File object or ArrayBuffer
   * @param options - Additional options
   */
  uploadFile: async (
    bucketName: string,
    filePath: string,
    file: File | ArrayBuffer,
    options: {
      contentType?: string;
      cacheControl?: string;
    } = {}
  ) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Determine content type if not provided
      const contentType = options.contentType ||
        (file instanceof File ? file.type : 'application/octet-stream');

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: options.cacheControl || '3600',
          upsert: false,
          contentType
        });

      if (error) {
        console.error('Supabase Storage Upload Error:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Upload failed:', err);
      throw err;
    }
  },

  /**
   * Get public URL for a file in Supabase Storage
   * @param bucketName - Storage bucket name
   * @param filePath - File path within bucket
   */
  getPublicUrl: (bucketName: string, filePath: string): string => {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    return supabase.storage.from(bucketName).getPublicUrl(filePath).data.publicUrl;
  },

  /**
   * List files in a bucket
   * @param bucketName - Storage bucket name
   * @param options - Filtering options
   */
  listFiles: async (
    bucketName: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: { column: string; order: 'asc' | 'desc' };
    } = {}
  ) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase.storage
        .from(bucketName)
        .list('', {
          limit: options.limit || 100,
          offset: options.offset || 0,
          sortBy: options.sortBy
        });

      if (error) {
        console.error('Supabase Storage List Error:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('List files failed:', err);
      throw err;
    }
  },

  /**
   * Delete file from Supabase Storage
   * @param bucketName - Storage bucket name
   * @param filePath - File path within bucket
   */
  deleteFile: async (bucketName: string, filePath: string) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Supabase Storage Delete Error:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Delete file failed:', err);
      throw err;
    }
  },

  /**
   * Get diagnosis images for CABI training
   * @param cropType - Crop type (e.g., 'rice', 'wheat')
   * @param symptomType - Symptom type (e.g., 'yellowing', 'spots')
   */
  getDiagnosisImages: async (
    cropType: string,
    symptomType: string
  ): Promise<{ url: string; metadata: any }[]> => {
    try {
      const bucketName = 'Gallary';

      // Search for images matching crop and symptom
      const searchPattern = `${cropType}/${symptomType}`;

      const files = await this.listFiles(bucketName);

      // Filter files that match the pattern
      const matchingFiles = files
        .filter(file =>
          file.name.toLowerCase().includes(cropType.toLowerCase()) &&
          file.name.toLowerCase().includes(symptomType.toLowerCase())
        )
        .map(file => ({
          url: this.getPublicUrl(bucketName, file.name),
          metadata: {
            name: file.name,
            size: file.metadata?.size,
            created_at: file.created_at,
            updated_at: file.updated_at
          }
        }));

      return matchingFiles;
    } catch (err) {
      console.error('Get diagnosis images failed:', err);
      return [];
    }
  },

  /**
   * Save analysis result with associated images
   * @param userId - User ID
   * @param analysisResult - Analysis result to save
   * @param imageFiles - Image files to associate
   */
  saveAnalysisWithImages: async (
    userId: string,
    analysisResult: AnalysisResult,
    imageFiles: File[]
  ) => {
    try {
      const bucketName = 'Gallary';
      const timestamp = Date.now();
      const analysisId = `analysis_${userId}_${timestamp}`;

      // Upload images first
      const uploadedImages: { path: string; url: string }[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const filePath = `diagnosis/${userId}/${analysisId}/image_${i + 1}.${file.name.split('.').pop()}`;

        await this.uploadFile(bucketName, filePath, file);
        const url = this.getPublicUrl(bucketName, filePath);

        uploadedImages.push({ path: filePath, url });
      }

      // Update analysis result with image URLs
      const enhancedResult = {
        ...analysisResult,
        imageUrls: uploadedImages.map(img => img.url),
        imagePaths: uploadedImages.map(img => img.path)
      };

      // Save to database
      await saveReportToSupabase(userId, {
        type: 'Diagnosis Report',
        title: `AI Diagnosis - ${analysisResult.diagnosis}`,
        content: JSON.stringify(enhancedResult),
        icon: '🔍',
        timestamp: Date.now()
      });

      return { enhancedResult, uploadedImages };
    } catch (err) {
      console.error('Save analysis with images failed:', err);
      throw err;
    }
  }
};

// Export convenience functions
export const {
  uploadFile,
  getPublicUrl,
  listFiles,
  deleteFile,
  getDiagnosisImages,
  saveAnalysisWithImages
} = supabaseStorage;
