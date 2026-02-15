# Krishi AI - Agricultural Intelligence Platform

Krishi AI is a comprehensive agricultural intelligence platform that leverages artificial intelligence to provide crop disease diagnosis, agricultural advisory services, weather information, and market price tracking. The application supports both Bangla and English languages to serve farmers effectively.

## 🌾 Features

- Crop disease diagnosis using AI
- Agricultural advisory services
- Weather information
- Market price tracking
- Multilingual support (Bangla/English)
- User authentication via Firebase
- Real-time chat functionality
- Push notifications
- Nutrient calculator
- Pesticide expert guidance
- Soil expert advice
- Yield prediction

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python
- **AI/ML**: Google GenAI, Hugging Face Transformers
- **Authentication**: Firebase Auth
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Firebase Realtime Database
- **Hosting**: Vercel (Frontend), Vercel/Render/Heroku (Backend)
- **Push Notifications**: Firebase Cloud Messaging

## 🚀 Deployment with Vercel

### Prerequisites

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Install project dependencies:
```bash
# Frontend
cd krishiai-frontend
npm install

# Backend
cd ../krishi-ai-backend
pip install -r requirements.txt
```

### Environment Configuration

#### Frontend Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyCSjp8WdJYoomXdgleRiACwn-D2p3j1pQM
VITE_FIREBASE_AUTH_DOMAIN=agriadvisoryai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=agriadvisoryai
VITE_FIREBASE_STORAGE_BUCKET=agriadvisoryai.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=498163867458
VITE_FIREBASE_APP_ID=1:498163867458:web:d53de085f0f56acbc472db

# Supabase Configuration
VITE_SUPABASE_URL=https://nmngzjrrysjzuxfcklrk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmd6anJyeXNqenV4ZmNrbHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY3MDA4MTUsImV4cCI6MjAyMjI3NjgxNX0.SLDiC6uj7f8U-MTS4kqNgd650n4w7rLz4J7wL7wL7wL

# Backend API
VITE_BACKEND_URL=https://your-backend-url.vercel.app
```

#### Backend Environment Variables

For the backend, you'll need:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key

# Google AI
GEMINI_API_KEY=your_gemini_api_key

# Firebase (for backend services)
FIREBASE_CREDENTIALS_PATH=/path/to/serviceAccountKey.json
# OR
FIREBASE_CONFIG='{"type": "service_account", ...}' # JSON string of service account

# App Configuration
DEBUG=False
HOST=0.0.0.0
PORT=8000
</env>

### Deploy Frontend to Vercel

1. Navigate to the frontend directory:
```bash
cd krishiai-frontend
```

2. Deploy to Vercel:
```bash
vercel --prod
```

3. Follow the prompts to configure your project settings

### Deploy Backend to Vercel

1. Navigate to the backend directory:
```bash
cd krishi-ai-backend
```

2. Deploy to Vercel:
```bash
vercel --prod
```

3. Set the required environment variables in the Vercel dashboard

4. **IMPORTANT**: After deployment, you need to disable Vercel's deployment protection:
   - Go to your Vercel dashboard (https://vercel.com/dashboard)
   - Select the "krishi-ai-backend" project
   - Navigate to Settings → General → Deployment Protection
   - Turn OFF "Enable Protection" to make the API publicly accessible
   - This is required for the frontend to communicate with the backend API

## 🏗️ Development Setup

To run the application locally:

1. Start the backend:
```bash
cd krishi-ai-backend
uvicorn app.main:app --reload
```

2. Start the frontend:
```bash
cd krishiai-frontend
npm run dev
```

## 🔧 Architecture

The application follows a hybrid backend architecture:
- **Firebase**: Handles user authentication, real-time features, and push notifications
- **Supabase**: Manages structured data like crop diagnosis reports and user profiles
- **Google GenAI**: Powers the AI-driven agricultural insights

## 📱 Production Build

To create a production build of the frontend:

```bash
cd krishiai-frontend
npm run build
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License.