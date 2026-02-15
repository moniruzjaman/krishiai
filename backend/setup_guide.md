# Krishi AI Backend - Hybrid Architecture Setup Guide

This guide will walk you through setting up the hybrid backend that combines Firebase for user management, chat, and alerts with Supabase for crop diagnosis data.

## Prerequisites

- Python 3.8+
- Node.js (for frontend)
- Firebase account
- Supabase account

## Part 1: Firebase Setup

### 1.1 Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter a project name (e.g., "krishi-ai-hybrid")
4. Follow the setup steps and enable Google Analytics if desired

### 1.2 Enable Firebase Services

1. In the Firebase Console, go to "Build" section
2. Enable **Authentication**:
   - Click "Authentication" → "Get started"
   - Enable "Email/Password" sign-in method
   - Save changes

3. Enable **Firestore Database**:
   - Click "Firestore Database" → "Create database"
   - Choose "Start in test mode" (for development)
   - Select a location closest to your users
   - Create database

4. Enable **Cloud Messaging**:
   - Click "Cloud Messaging" (under "Engage")
   - Review the settings and note your server key

### 1.3 Get Firebase Credentials

1. In Firebase Console, go to Project Settings (gear icon)
2. In the "General" tab, note your:
   - Project ID
   - Web API Key

3. In the "Service accounts" tab:
   - Click "Generate new private key"
   - Save the JSON file as `serviceAccountKey.json` in your backend directory

### 1.4 Configure Firebase Security Rules

For Firestore, go to "Rules" tab and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Chat room access rules
    match /chat_rooms/{roomId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      
      // Message access within rooms
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Part 2: Supabase Setup

### 2.1 Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Enter organization and project details
4. Create a strong database password (save it securely)
5. Wait for the project to be provisioned

### 2.2 Create Database Tables

1. In Supabase, go to "Table Editor"
2. Create the following tables:

#### Profiles Table

```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  progress JSONB DEFAULT '{"xp": 0, "level": 1, "streak": 0, "skills": {"soil": 0, "protection": 0, "technology": 0}}'
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

#### Reports Table

```sql
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  crop_type TEXT NOT NULL,
  image_url TEXT,
  disease TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  recommendations TEXT[],
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reports" ON reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reports" ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reports" ON reports FOR UPDATE USING (auth.uid() = user_id);
```

### 2.3 Set Up Authentication

1. In Supabase, go to "Authentication" → "Settings"
2. Enable "Enable email confirmations"
3. Configure your site URL (your frontend URL)
4. Set up your email provider or use the default one

### 2.4 Get Supabase Credentials

1. In Supabase, go to "Project Settings" → "API"
2. Note your:
   - Project URL
   - Service role key (secret)

## Part 3: Backend Configuration

### 3.1 Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3.2 Configure Environment Variables

1. Create a `.env` file in the backend directory:
```env
# Supabase Configuration (for crop diagnosis data)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key

# Firebase Configuration (for users, chat, and alerts)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Application Configuration
ENVIRONMENT=development
LOG_LEVEL=INFO
```

2. Replace the placeholder values with your actual credentials

### 3.3 Run the Backend

```bash
uvicorn main:app --reload
```

## Part 4: Test the Setup

### 4.1 Test Backend Health

Open http://localhost:8000 in your browser or use:

```bash
curl http://localhost:8000/
```

You should see:
```json
{
  "status": "online",
  "service": "Krishi AI Backend - Hybrid",
  "version": "3.0.0"
}
```

### 4.2 Test API Documentation

Visit http://localhost:8000/docs to view the Swagger UI documentation

### 4.3 Test User Registration

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "display_name": "Test User"}'
```

### 4.4 Test User Login

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

## Part 5: Common Issues and Solutions

### Issue 1: Firebase Authentication Error

**Problem**: "Failed to create user: INVALID_EMAIL"

**Solution**: Ensure the email is in a valid format and that Email/Password authentication is enabled in Firebase.

### Issue 2: Supabase Connection Error

**Problem**: "Failed to connect to Supabase"

**Solution**: Check your SUPABASE_URL and SUPABASE_KEY in the .env file. Ensure the keys are correct and the project is active.

### Issue 3: Firestore Permission Denied

**Problem**: "Missing or insufficient permissions"

**Solution**: Update your Firestore security rules as described in section 1.4.

### Issue 4: Import Error in Backend

**Problem**: "ModuleNotFoundError: No module named 'firebase_service'"

**Solution**: Ensure all the firebase_service directories and files are created properly in the backend directory.

## Part 6: Production Deployment Considerations

1. **Firebase Security**: Update Firestore rules for production environment
2. **Supabase Security**: Configure proper Row Level Security policies
3. **Environment Variables**: Never commit .env files to version control
4. **HTTPS**: Always use HTTPS in production
5. **Monitoring**: Set up logging and monitoring for both services

## Part 7: Next Steps

1. Update your frontend to use the new hybrid backend endpoints
2. Implement error handling for API failures
3. Add user profile synchronization between Firebase and Supabase
4. Set up automated testing for all endpoints
5. Implement offline functionality for mobile apps

## Support

If you encounter any issues:

1. Check the Firebase and Supabase documentation
2. Review the API logs in both consoles
3. Verify your environment variables
4. Check the backend error logs

For specific issues related to this implementation, review the code in the respective service files in the `firebase_service` directory.