# Krishi AI Hybrid Backend Migration Guide

This guide explains how to migrate the existing Krishi AI application to use the new hybrid backend architecture that combines Firebase for users, chat, and alerts with Supabase for crop diagnosis data.

## Overview of Changes

### Backend Architecture
- **Firebase**: Handles user authentication, real-time chat, and push notifications
- **Supabase**: Continues to handle crop diagnosis data and user profiles
- **Backend API**: Coordinates between both services, providing a unified interface

### Frontend Changes
- Updated authentication flow to use Firebase
- Added real-time chat capabilities
- Implemented push notifications for alerts
- Enhanced user profile synchronization between services

## Migration Steps

### Step 1: Backend Setup

1. **Set up Firebase Project**
   - Create a new Firebase project at https://console.firebase.google.com
   - Enable Authentication, Firestore Database, and Cloud Messaging
   - Generate service account credentials
   - Configure security rules

2. **Update Supabase Database**
   - Ensure your tables have the necessary columns
   - Set up Row Level Security policies
   - Verify connection with the backend

3. **Configure Environment Variables**
   ```
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_role_key
   
   # Firebase Configuration
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_CREDENTIALS_PATH=path/to/serviceAccountKey.json
   ```

4. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

5. **Run the Backend**
   ```bash
   uvicorn main:app --reload
   ```

### Step 2: Frontend Setup

1. **Update package.json**
   Ensure the following dependencies are installed:
   ```json
   {
     "dependencies": {
       "firebase": "^10.7.0",
       "@supabase/supabase-js": "^2.39.0",
       "axios": "^1.6.0"
     }
   }
   ```

2. **Create Service Files**
   - `src/firebase/config.js` - Firebase configuration
   - `src/services/api.js` - API service layer
   - `src/services/auth.js` - Authentication service
   - `src/services/chat.js` - Chat service
   - `src/services/alerts.js` - Push notification service
   - `src/services/diagnosis.js` - Crop diagnosis service

3. **Update Environment Variables**
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

4. **Update App Component**
   Replace the existing App.tsx with the new App_hybrid.tsx or update your current App.tsx to integrate with the hybrid backend.

### Step 3: Data Migration

1. **Existing User Profiles**
   - Your existing Supabase user profiles will continue to work
   - New users will be created with both Firebase and Supabase profiles
   - For existing users, you'll need to migrate them to Firebase authentication

2. **Existing Diagnosis Data**
   - All existing diagnosis data in Supabase remains unchanged
   - The new API endpoints will work with existing data

3. **Migration Script (Optional)**
   If you need to migrate existing users to Firebase, you can use this approach:
   ```python
   # backend/migrate_users.py
   import asyncio
   from supabase import create_client, Client
   from app_config import settings
   from firebase_service.auth.service import FirebaseAuthService
   
   async def migrate_users():
       supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
       firebase_auth = FirebaseAuthService()
       
       # Get all users from Supabase
       users = supabase.table("profiles").select("*").execute()
       
       for user in users.data:
           try:
               # Create Firebase user with a temporary password
               temp_password = f"temp_{user['id'][:8]}"
               firebase_user = firebase_auth.create_user(
                   email=user["email"],
                   password=temp_password,
                   display_name=user.get("display_name", user["email"].split("@")[0])
               )
               
               print(f"Migrated user: {user['email']}")
               # You would then notify users to update their password
           except Exception as e:
               print(f"Failed to migrate user {user['email']}: {str(e)}")
   
   if __name__ == "__main__":
       asyncio.run(migrate_users())
   ```

### Step 4: Testing the Migration

1. **Backend Health Check**
   ```bash
   curl http://localhost:8000/
   ```
   Expected response:
   ```json
   {
     "status": "online",
     "service": "Krishi AI Backend - Hybrid",
     "version": "3.0.0"
   }
   ```

2. **Test User Registration**
   ```bash
   curl -X POST "http://localhost:8000/api/v1/auth/register" \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password123", "display_name": "Test User"}'
   ```

3. **Test User Login**
   ```bash
   curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password123"}'
   ```

4. **Test Diagnosis Save**
   ```bash
   curl -X POST "http://localhost:8000/api/v1/diagnosis/save" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "user_id_here",
       "crop_type": "wheat",
       "image_url": "https://example.com/image.jpg",
       "disease": "rust",
       "confidence": 0.95,
       "recommendations": ["Use fungicide", "Adjust irrigation"]
     }'
   ```

## New Features Available After Migration

1. **Real-time Chat**
   - Multi-user chat rooms
   - Message history
   - Real-time updates

2. **Push Notifications**
   - Crop diagnosis alerts
   - Market price notifications
   - Weather alerts

3. **Enhanced Authentication**
   - Email/password authentication
   - Password reset functionality
   - Token-based authentication

4. **Improved User Profiles**
   - Synchronization between Firebase and Supabase
   - Enhanced progress tracking

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure your backend allows requests from your frontend URL
   - Check the CORS configuration in the backend

2. **Firebase Authentication Errors**
   - Verify your Firebase configuration
   - Check that Authentication is enabled in Firebase Console
   - Ensure API keys are correctly configured

3. **Supabase Connection Issues**
   - Verify your Supabase URL and keys
   - Check that the database is active
   - Ensure Row Level Security policies are correctly configured

4. **Push Notification Issues**
   - Ensure your VAPID key is configured
   - Check that messaging is enabled in Firebase
   - Verify notification permissions in the browser

### Debugging Tips

1. Check browser console for JavaScript errors
2. Use the browser Network tab to inspect API requests
3. Verify environment variables are correctly loaded
4. Check Firebase and Supabase dashboards for any service issues

## Rollback Plan

If you need to rollback to the original architecture:

1. **Backend**
   - Revert `main.py` to use the original `routes.py`
   - Remove Firebase service files
   - Restore original `app_config.py`

2. **Frontend**
   - Restore original `App.tsx`
   - Remove Firebase-related service files
   - Revert environment variables

## Conclusion

The hybrid backend architecture provides the best of both platforms - Firebase's real-time capabilities and authentication for user-facing features, and Supabase's simplicity for structured crop diagnosis data. This migration enables new features while maintaining compatibility with existing data.

For more detailed information, refer to:
- Backend setup guide: `backend/setup_guide.md`
- Frontend integration guide: `krishiai-frontend/FIREBASE_INTEGRATION.md`
- API documentation: Available at http://localhost:8000/docs