import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(async (config) => {
  // Get Firebase auth token from local storage or context
  const token = localStorage.getItem('firebase_id_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const refreshToken = localStorage.getItem('firebase_refresh_token');
        if (refreshToken) {
          const response = await api.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
          const newToken = response.data.tokens.id_token;

          // Store the new token
          localStorage.setItem('firebase_id_token', newToken);

          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('firebase_id_token');
        localStorage.removeItem('firebase_refresh_token');
        window.location.href = '/profile';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
