import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  getIdToken,
  getAuth
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
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
        await updateProfile(user, { displayName });
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

      // Also store user in Firestore for client-side operations
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email,
        displayName: displayName || email.split('@')[0],
        createdAt: new Date(),
        fcmTokens: []
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

      // Update user data in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        await setDoc(userRef, {
          ...userSnap.data(),
          lastLogin: new Date()
        }, { merge: true });
      } else {
        // Create Firestore document if it doesn't exist
        await setDoc(userRef, {
          uid: user.uid,
          email,
          displayName: response.data.user.display_name,
          createdAt: new Date(),
          lastLogin: new Date(),
          fcmTokens: []
        });
      }

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
  },

  // Get current Firebase user
  getCurrentUser() {
    return auth.currentUser;
  },

  // Listen for auth state changes
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  },

  // Refresh ID token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('firebase_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token found');
      }

      const response = await api.post('/api/v1/auth/refresh', {
        refresh_token: refreshToken
      });

      const newToken = response.data.tokens.id_token;
      const newRefreshToken = response.data.tokens.refresh_token;

      // Update tokens
      localStorage.setItem('firebase_id_token', newToken);
      localStorage.setItem('firebase_refresh_token', newRefreshToken);

      return {
        idToken: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw error;
    }
  },

  // Update user profile
  async updateProfile(data) {
    try {
      const token = localStorage.getItem('firebase_id_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await api.post('/api/v1/auth/update-profile', {
        id_token: token,
        ...data
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update user profile in Supabase
  async updateSupabaseProfile(userId, profileData) {
    try {
      const token = localStorage.getItem('firebase_id_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await api.put(`/api/v1/profiles/${userId}`, profileData);

      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default authService;
