import { supabase } from '../supabase/config';
import api from './api';

export const diagnosisService = {
  // Save a diagnosis report
  async saveDiagnosis(userId, cropType, imageUrl, disease, confidence, recommendations, timestamp = null) {
    try {
      const response = await api.post('/api/v1/diagnosis/save', {
        user_id: userId,
        crop_type: cropType,
        image_url: imageUrl,
        disease,
        confidence,
        recommendations,
        timestamp
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get user diagnoses
  async getUserDiagnoses(userId, limit = 10) {
    try {
      const response = await api.get(`/api/v1/diagnosis/user/${userId}`, {
        params: { limit }
      });

      return response.data.diagnoses;
    } catch (error) {
      throw error;
    }
  },

  // Get a specific diagnosis
  async getDiagnosis(diagnosisId) {
    try {
      const response = await api.get(`/api/v1/diagnosis/${diagnosisId}`);

      return response.data.diagnosis;
    } catch (error) {
      throw error;
    }
  },

  // Upload image to Supabase storage
  async uploadImage(userId, file) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('diagnosis-images')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('diagnosis-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      throw error;
    }
  },

  // Analyze crop image using AI
  async analyzeImage(imageFile) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await api.post('/api/v1/ai/analyze-crop', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get diagnosis statistics for user dashboard
  async getDiagnosisStats(userId) {
    try {
      const response = await api.get(`/api/v1/diagnosis/stats/${userId}`);

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Search diagnoses by crop type or disease
  async searchDiagnoses(query, userId = null) {
    try {
      const params = { query };
      if (userId) params.user_id = userId;

      const response = await api.get('/api/v1/diagnosis/search', { params });

      return response.data.diagnoses;
    } catch (error) {
      throw error;
    }
  },

  // Update diagnosis report
  async updateDiagnosis(diagnosisId, updates) {
    try {
      const response = await api.put(`/api/v1/diagnosis/${diagnosisId}`, updates);

      return response.data.diagnosis;
    } catch (error) {
      throw error;
    }
  },

  // Delete diagnosis report
  async deleteDiagnosis(diagnosisId) {
    try {
      await api.delete(`/api/v1/diagnosis/${diagnosisId}`);

      return true;
    } catch (error) {
      throw error;
    }
  }
};

export default diagnosisService;
