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
      const token = await getToken(messaging, {
        vapidKey: process.env.VITE_FIREBASE_VAPID_KEY || 'your-vapid-key'
      });
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  },

  // Save FCM token to user profile
  async saveFCMToken(userId, token) {
    try {
      // Save to Firestore
      import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
      import { db } from '../firebase/config';

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const fcmTokens = userData.fcmTokens || [];

        // Add token if it doesn't already exist
        if (!fcmTokens.includes(token)) {
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token)
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving FCM token:', error);
      return false;
    }
  },

  // Remove FCM token from user profile
  async removeFCMToken(userId, token) {
    try {
      // Remove from Firestore
      import { doc, getDoc, updateDoc } from 'firebase/firestore';
      import { db } from '../firebase/config';

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const fcmTokens = userData.fcmTokens || [];

        // Remove token if it exists
        if (fcmTokens.includes(token)) {
          await updateDoc(userRef, {
            fcmTokens: fcmTokens.filter(t => t !== token)
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error removing FCM token:', error);
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

  // Send custom notification to a specific user
  async sendNotification(userId, title, body, data = null, imageUrl = null) {
    try {
      // Get user's FCM tokens
      import { doc, getDoc } from 'firebase/firestore';
      import { db } from '../firebase/config';

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const userData = userSnap.data();
      const fcmTokens = userData.fcmTokens || [];

      if (fcmTokens.length === 0) {
        throw new Error('No FCM tokens found for user');
      }

      // Send notification to all user tokens
      const results = [];
      for (const token of fcmTokens) {
        try {
          const response = await api.post('/api/v1/alerts/send', {
            token,
            title,
            body,
            data,
            image_url: imageUrl
          });
          results.push(response.data);
        } catch (error) {
          results.push({ error: error.message });
        }
      }

      return results;
    } catch (error) {
      throw error;
    }
  },

  // Send notification to a topic
  async sendTopicNotification(topic, title, body, data = null, imageUrl = null) {
    try {
      const response = await api.post('/api/v1/alerts/topic', {
        topic,
        title,
        body,
        data,
        image_url: imageUrl
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Listen for foreground messages
  onMessage(callback) {
    return onMessage(messaging, callback);
  },

  // Initialize notifications for a user
  async initializeNotifications(userId) {
    try {
      // Request permission
      const hasPermission = await this.requestPermission();

      if (!hasPermission) {
        console.log('Notification permission denied');
        return false;
      }

      // Get FCM token
      const token = await this.getFCMToken();

      if (!token) {
        console.log('Failed to get FCM token');
        return false;
      }

      // Save token to user profile
      await this.saveFCMToken(userId, token);

      // Subscribe to default topics based on user preferences
      // These would be determined by the user's preferences in their profile
      await this.subscribeToTopic([token], 'all-users');

      // Set up message listener for foreground notifications
      this.onMessage((payload) => {
        // Show notification when app is in foreground
        const { notification, data } = payload;

        if (notification) {
          const browserNotification = new Notification(notification.title, {
            body: notification.body,
            icon: '/favicon.ico',
            data: data || {}
          });

          // Handle notification click
          browserNotification.onclick = () => {
            // Focus on the window
            window.focus();

            // Navigate based on notification type
            if (data?.type === 'crop_diagnosis') {
              window.location.href = '/diagnosis';
            } else if (data?.type === 'market_price') {
              window.location.href = '/market';
            } else if (data?.type === 'weather') {
              window.location.href = '/weather';
            }
          };
        }
      });

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  },

  // Clean up notifications when user logs out
  async cleanupNotifications(userId) {
    try {
      const token = await this.getFCMToken();

      if (token) {
        await this.removeFCMToken(userId, token);
      }

      return true;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      return false;
    }
  },

  // Get notification history for a user
  async getNotificationHistory(userId, limit = 20) {
    try {
      const response = await api.get(`/api/v1/alerts/history/${userId}`, {
        params: { limit }
      });

      return response.data.notifications || [];
    } catch (error) {
      throw error;
    }
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    try {
      const response = await api.put(`/api/v1/alerts/read/${notificationId}`);

      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default alertsService;
