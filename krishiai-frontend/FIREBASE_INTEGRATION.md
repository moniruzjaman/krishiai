# Frontend Integration Guide for Hybrid Backend

This guide explains how to update the Krishi AI frontend to work with the hybrid backend architecture that combines Firebase for users, chat, and alerts with Supabase for crop diagnosis data.

## Prerequisites

- React frontend project
- Firebase SDK for web
- Supabase client library
- Axios for HTTP requests

## Part 1: Install Dependencies

```bash
cd krishiai-frontend
npm install firebase @supabase/supabase-js axios
```

## Part 2: Firebase Configuration

### 2.1 Create Firebase Configuration File

Create `src/firebase/config.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

export default app;
```

### 2.2 Update Environment Variables

Create or update `.env.local`:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend API
VITE_BACKEND_URL=http://localhost:8000
```

## Part 3: Supabase Configuration

Create `src/supabase/config.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
```

## Part 4: API Service Layer

Create `src/services/api.js`:

```javascript
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
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

## Part 5: Authentication Service

Create `src/services/auth.js`:

```javascript
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import api from './api';

export const authService = {
  // Register a new user
  async register(email, password, displayName) {
    try {
      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name if provided
      if (displayName) {
        await user.updateProfile({ displayName });
      }
      
      // Get ID token
      const idToken = await user.getIdToken();
      const refreshToken = user.refreshToken;
      
      // Store tokens
      localStorage.setItem('firebase_id_token', idToken);
      localStorage.setItem('firebase_refresh_token', refreshToken);
      
      // Call backend to create user profile
      const response = await api.post('/api/v1/auth/register', {
        email,
        password,
        displayName
      });
      
      return {
        user: response.data.user,
        tokens: {
          idToken,
          refreshToken
        }
      };
    } catch (error) {
      throw error;
    }
  },
  
  // Sign in a user
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get ID token
      const idToken = await user.getIdToken();
      const refreshToken = user.refreshToken;
      
      // Store tokens
      localStorage.setItem('firebase_id_token', idToken);
      localStorage.setItem('firebase_refresh_token', refreshToken);
      
      // Call backend to sign in and get user profile
      const response = await api.post('/api/v1/auth/login', {
        email,
        password
      });
      
      return {
        user: response.data.user,
        tokens: response.data.tokens
      };
    } catch (error) {
      throw error;
    }
  },
  
  // Sign out the current user
  async signOut() {
    try {
      await signOut(auth);
      
      // Remove tokens from local storage
      localStorage.removeItem('firebase_id_token');
      localStorage.removeItem('firebase_refresh_token');
      
      return true;
    } catch (error) {
      throw error;
    }
  },
  
  // Send password reset email
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      
      // Call backend to send password reset email
      await api.post('/api/v1/auth/reset-password', { email });
      
      return true;
    } catch (error) {
      throw error;
    }
  },
  
  // Verify current user
  async verifyUser() {
    try {
      const token = localStorage.getItem('firebase_id_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await api.post('/api/v1/auth/verify', {
        id_token: token
      });
      
      return response.data.user;
    } catch (error) {
      throw error;
    }
  }
};

export default authService;
```

## Part 6: Chat Service

Create `src/services/chat.js`:

```javascript
import { collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import api from './api';

export const chatService = {
  // Create a new chat room
  async createRoom(name, description, participants, roomType = 'public') {
    try {
      const response = await api.post('/api/v1/chat/rooms', {
        name,
        description,
        created_by: participants[0], // Assume first participant is creator
        participants,
        room_type: roomType
      });
      
      return response.data.room;
    } catch (error) {
      throw error;
    }
  },
  
  // Send a message
  async sendMessage(roomId, text, senderId, senderName, messageType = 'text') {
    try {
      const response = await api.post(`/api/v1/chat/rooms/${roomId}/messages`, {
        text,
        sender_id: senderId,
        sender_name: senderName,
        message_type: messageType
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get messages for a room
  async getMessages(roomId, limitCount = 50, startAfter = null) {
    try {
      const params = { limit: limitCount };
      if (startAfter) {
        params.start_after = startAfter;
      }
      
      const response = await api.get(`/api/v1/chat/rooms/${roomId}/messages`, { params });
      
      return response.data.messages;
    } catch (error) {
      throw error;
    }
  },
  
  // Get rooms for a user
  async getUserRooms(userId) {
    try {
      const response = await api.get(`/api/v1/chat/users/${userId}/rooms`);
      
      return response.data.rooms;
    } catch (error) {
      throw error;
    }
  },
  
  // Join a room
  async joinRoom(roomId, userId) {
    try {
      const response = await api.post(`/api/v1/chat/rooms/${roomId}/join`, {
        user_id: userId
      });
      
      return response.data.room;
    } catch (error) {
      throw error;
    }
  },
  
  // Leave a room
  async leaveRoom(roomId, userId) {
    try {
      const response = await api.post(`/api/v1/chat/rooms/${roomId}/leave`, {
        user_id: userId
      });
      
      return response.data.room;
    } catch (error) {
      throw error;
    }
  }
};

export default chatService;
```

## Part 7: Alerts Service

Create `src/services/alerts.js`:

```javascript
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase/config';
import api from './api';

export const alertsService = {
  // Request notification permission
  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  },
  
  // Get FCM token
  async getFCMToken() {
    try {
      const token = await getToken(messaging);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  },
  
  // Save FCM token to user profile
  async saveFCMToken(userId, token) {
    try {
      // This would typically save to Firestore
      // For now, we'll use the backend
      await api.post('/api/v1/users/fcm-token', {
        user_id: userId,
        token
      });
      
      return true;
    } catch (error) {
      console.error('Error saving FCM token:', error);
      return false;
    }
  },
  
  // Subscribe to topic
  async subscribeToTopic(tokens, topic) {
    try {
      const response = await api.post('/api/v1/alerts/subscribe', {
        tokens,
        topic
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Unsubscribe from topic
  async unsubscribeFromTopic(tokens, topic) {
    try {
      const response = await api.post('/api/v1/alerts/unsubscribe', {
        tokens,
        topic
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Send crop diagnosis alert
  async sendCropDiagnosisAlert(userId, cropType, disease, confidence, recommendations) {
    try {
      const response = await api.post('/api/v1/alerts/crop-diagnosis', {
        user_id: userId,
        crop_type: cropType,
        disease,
        confidence,
        recommendations
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Send market price alert
  async sendMarketPriceAlert(userId, crop, currentPrice, previousPrice, change, changePercent, market) {
    try {
      const response = await api.post('/api/v1/alerts/market-price', {
        user_id: userId,
        crop,
        current_price: currentPrice,
        previous_price: previousPrice,
        change,
        change_percent: changePercent,
        market
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Send weather alert
  async sendWeatherAlert(userId, event, severity, startTime, duration, description) {
    try {
      const response = await api.post('/api/v1/alerts/weather', {
        user_id: userId,
        event,
        severity,
        start_time: startTime,
        duration,
        description
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Listen for foreground messages
  onMessage(callback) {
    return onMessage(messaging, callback);
  }
};

export default alertsService;
```

## Part 8: Crop Diagnosis Service

Create `src/services/diagnosis.js`:

```javascript
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
  }
};

export default diagnosisService;
```

## Part 9: Context Providers

Create `src/contexts/AuthContext.js`:

```javascript
import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const user = await authService.verifyUser();
        setCurrentUser(user);
      } catch (error) {
        // User is not authenticated
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    verifyUser();
  }, []);
  
  const login = async (email, password) => {
    try {
      const { user } = await authService.signIn(email, password);
      setCurrentUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };
  
  const register = async (email, password, displayName) => {
    try {
      const { user } = await authService.register(email, password, displayName);
      setCurrentUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      await authService.signOut();
      setCurrentUser(null);
    } catch (error) {
      throw error;
    }
  };
  
  const resetPassword = async (email) => {
    try {
      await authService.resetPassword(email);
    } catch (error) {
      throw error;
    }
  };
  
  const value = {
    currentUser,
    loading,
    login,
    register,
    logout,
    resetPassword
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
```

## Part 10: Update App Component

Update your main App component to use the context providers:

```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
```

## Part 11: Example Usage

### Login Component Example

```javascript
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      // Navigate to dashboard
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
};

export default Login;
```

### Chat Component Example

```javascript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import chatService from '../services/chat';

const ChatRoom = ({ roomId }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const { currentUser } = useAuth();
  
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const messages = await chatService.getMessages(roomId);
        setMessages(messages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    
    fetchMessages();
  }, [roomId]);
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    try {
      await chatService.sendMessage(
        roomId,
        text,
        currentUser.id,
        currentUser.display_name
      );
      
      setText('');
      // Refresh messages
      const messages = await chatService.getMessages(roomId);
      setMessages(messages);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  return (
    <div>
      <div className="messages">
        {messages.map(message => (
          <div key={message.id}>
            <strong>{message.sender_name}:</strong> {message.text}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ChatRoom;
```

## Part 12: Testing the Integration

1. Start the backend server:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. Start the frontend development server:
   ```bash
   cd krishiai-frontend
   npm run dev
   ```

3. Test authentication by registering a new user
4. Test chat functionality by creating and joining rooms
5. Test crop diagnosis by uploading images and saving results
6. Test notifications by checking browser notification permissions

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your backend allows requests from your frontend URL
2. **Firebase Authentication Errors**: Check your Firebase project configuration
3. **Supabase Connection Issues**: Verify your Supabase URL and keys
4. **Token Refresh Failures**: Implement proper error handling for token expiration

### Debugging Tips

1. Check browser console for JavaScript errors
2. Use the browser Network tab to inspect API requests
3. Verify environment variables are correctly loaded
4. Check Firebase and Supabase dashboards for any service issues

## Next Steps

1. Implement real-time message updates using Firebase listeners
2. Add proper error boundaries to handle service failures
3. Implement offline support for critical features
4. Add proper loading states for all API calls
5. Implement proper form validation
6. Add unit tests for all service functions