# Krishi AI - Agricultural Intelligence Platform

## Deployment Instructions

### Prerequisites

1. Install Firebase CLI (for Firebase hosting):
```bash
npm install -g firebase-tools
```

2. Install Vercel CLI (for Vercel deployment):
```bash
npm install -g vercel
```

3. Login to your respective platforms:
```bash
# For Firebase
firebase login

# For Vercel
vercel login
```

4. Install project dependencies:
```bash
npm install
cd ../krishi-ai-backend
pip install -r requirements.txt
```

### Environment Configuration

Create a `.env` file in the frontend directory with the following variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=agriadvisoryai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=agriadvisoryai
VITE_FIREBASE_STORAGE_BUCKET=agriadvisoryai.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=498163867458
VITE_FIREBASE_APP_ID=1:498163867458:web:d53de085f0f56acbc472db

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend API
VITE_BACKEND_URL=http://localhost:8000
```

### Deployment Options

#### Option 1: Deploy to Firebase Hosting

1. Build the frontend:
```bash
cd krishiai-frontend
npm run build
```

2. Deploy to Firebase Hosting:
```bash
firebase deploy --only hosting
```

Or use the combined command:
```bash
npm run deploy
```

#### Option 2: Deploy to Vercel

1. From the frontend directory, run:
```bash
cd krishiai-frontend
vercel --prod
```

2. Follow the prompts to link to your Vercel project and set environment variables

3. **IMPORTANT**: After deployment, you need to disable Vercel's deployment protection:
   - Go to your Vercel dashboard (https://vercel.com/dashboard)
   - Select the "krishiai-frontend" project
   - Navigate to Settings → General → Deployment Protection
   - Turn OFF "Enable Protection" to make the frontend publicly accessible

4. Alternatively, you can link your GitHub repository to Vercel for automatic deployments

### Backend Deployment

The backend can be deployed separately to platforms like:

#### Deploy Backend to Vercel

1. From the backend directory, run:
```bash
cd krishi-ai-backend
vercel --prod
```

2. Follow the prompts to link to your Vercel project and set environment variables

3. The backend is configured with:
   - `vercel.json`: Contains Python runtime configuration
   - `requirements-vercel.txt`: Includes all necessary dependencies including Firebase
   - `runtime.txt`: Specifies Python 3.11.0

4. **IMPORTANT**: After deployment, you need to disable Vercel's deployment protection:
   - Go to your Vercel dashboard (https://vercel.com/dashboard)
   - Select the "krishi-ai-backend" project
   - Navigate to Settings → General → Deployment Protection
   - Turn OFF "Enable Protection" to make the API publicly accessible
   - This is required for the frontend to communicate with the backend API

5. The backend is configured with:

#### Alternative Platforms

- **Render**: Connect your GitHub repository and configure environment variables
- **Heroku**: Use the Heroku CLI or dashboard
- **AWS/GCP**: Using containers or serverless functions

Make sure to configure the same environment variables in your deployment platform.

### Development

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

## Vercel-Specific Configuration

The application is configured for Vercel deployment with:

- `vercel.json`: Contains routing rules and environment configuration
- Build command: `npm run build` (defined in package.json as `tsc && vite build`)
- Output directory: `dist` (automatically detected from build process)

### Environment Variables on Vercel

When deploying to Vercel, set these environment variables in your Vercel project settings:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BACKEND_URL`

## Features

- Crop disease diagnosis using AI
- Agricultural advisory services
- Weather information
- Market price tracking
- Multilingual support (Bangla/English)
- User authentication via Firebase
- Real-time chat functionality
- Push notifications