import { collection, doc, addDoc, getDocs, query, orderBy, limit, getDoc, updateDoc, arrayUnion, arrayRemove, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import api from './api';

export const chatService = {
  // Create a new chat room
  async createRoom(name, description, createdBy, participants, roomType = 'public') {
    try {
      const response = await api.post('/api/v1/chat/rooms', {
        name,
        description,
        created_by: createdBy,
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
  },

  // Listen for real-time message updates
  listenToMessages(roomId, callback) {
    const messagesRef = collection(db, 'chat_rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));

    return onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });

      // Sort messages by timestamp (newest first)
      messages.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
        return timeB - timeA;
      });

      callback(messages);
    });
  },

  // Listen for real-time room updates
  listenToRoom(roomId, callback) {
    const roomRef = doc(db, 'chat_rooms', roomId);

    return onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  },

  // Listen for user's rooms updates
  listenToUserRooms(userId, callback) {
    const roomsRef = collection(db, 'chat_rooms');
    const q = query(
      roomsRef,
      where('participants', 'array-contains', userId)
    );

    return onSnapshot(q, (snapshot) => {
      const rooms = [];
      snapshot.forEach((doc) => {
        rooms.push({ id: doc.id, ...doc.data() });
      });

      callback(rooms);
    });
  },

  // Update room information
  async updateRoom(roomId, updates) {
    try {
      const roomRef = doc(db, 'chat_rooms', roomId);
      await updateDoc(roomRef, {
        ...updates,
        updated_at: serverTimestamp()
      });

      return true;
    } catch (error) {
      throw error;
    }
  },

  // Upload file attachment
  async uploadAttachment(roomId, userId, file) {
    try {
      // This would typically upload to Firebase Storage
      // For now, we'll return a placeholder URL
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${roomId}/${userId}/${timestamp}.${fileExt}`;

      // In a real implementation, you would upload the file to Firebase Storage
      // and return the public URL
      return {
        url: `https://storage.googleapis.com/your-bucket/${fileName}`,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      };
    } catch (error) {
      throw error;
    }
  },

  // Send a message with attachment
  async sendMessageWithAttachment(roomId, text, senderId, senderName, attachment, messageType = 'image') {
    try {
      const response = await api.post(`/api/v1/chat/rooms/${roomId}/messages`, {
        text,
        sender_id: senderId,
        sender_name: senderName,
        message_type: messageType,
        attachment_url: attachment.url,
        attachment_name: attachment.fileName
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete a message
  async deleteMessage(roomId, messageId) {
    try {
      const response = await api.delete(`/api/v1/chat/rooms/${roomId}/messages/${messageId}`);

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mark message as read
  async markAsRead(roomId, messageId, userId) {
    try {
      const response = await api.post(`/api/v1/chat/rooms/${roomId}/messages/${messageId}/read`, {
        user_id: userId
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get typing users in a room
  async getTypingUsers(roomId) {
    try {
      // This would typically be handled through a real-time mechanism
      // For now, we'll return an empty array
      return [];
    } catch (error) {
      throw error;
    }
  },

  // Set user typing status
  async setTypingStatus(roomId, userId, isTyping) {
    try {
      // This would typically update a real-time database
      // For now, we'll just make a call to the backend
      const response = await api.post(`/api/v1/chat/rooms/${roomId}/typing`, {
        user_id: userId,
        is_typing: isTyping
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default chatService;
