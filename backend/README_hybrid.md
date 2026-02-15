# Krishi AI Backend - Hybrid Architecture

A FastAPI-based backend that uses a hybrid architecture combining Firebase for user management, chat, and alerts with Supabase for crop diagnosis data.

## Architecture Overview

### Firebase Services
- **Authentication**: User registration, login, and profile management
- **Cloud Firestore**: Real-time chat rooms and messaging
- **Cloud Messaging**: Push notifications and alerts

### Supabase Services
- **PostgreSQL Database**: Crop diagnosis data storage
- **User Profiles**: Farmer-specific data and progress tracking
- **Diagnostic Reports**: Crop disease history and recommendations

## API Endpoints

### Authentication (Firebase)
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Sign in a user
- `POST /api/v1/auth/verify` - Verify ID token
- `POST /api/v1/auth/refresh` - Refresh ID token
- `POST /api/v1/auth/reset-password` - Send password reset email

### Chat (Firebase Firestore)
- `POST /api/v1/chat/rooms` - Create a chat room
- `POST /api/v1/chat/rooms/{room_id}/messages` - Send a message
- `GET /api/v1/chat/rooms/{room_id}/messages` - Get chat messages
- `GET /api/v1/chat/users/{user_id}/rooms` - Get user rooms
- `POST /api/v1/chat/rooms/{room_id}/join` - Join a room
- `POST /api/v1/chat/rooms/{room_id}/leave` - Leave a room

### Alerts (Firebase Cloud Messaging)
- `POST /api/v1/alerts/send` - Send notification to device
- `POST /api/v1/alerts/topic` - Send notification to topic
- `POST /api/v1/alerts/subscribe` - Subscribe to topic
- `POST /api/v1/alerts/unsubscribe` - Unsubscribe from topic
- `POST /api/v1/alerts/crop-diagnosis` - Send crop diagnosis alert
- `POST /api/v1/alerts/market-price` - Send market price alert
- `POST /api/v1/alerts/weather` - Send weather alert

### Crop Diagnosis (Supabase)
- `POST /api/v1/diagnosis/save` - Save diagnostic report
- `GET /api/v1/diagnosis/user/{user_id}` - Get user diagnoses
- `GET /api/v1/diagnosis/{diagnosis_id}` - Get specific diagnosis

## Setup

### Prerequisites
- Python 3.8+
- Firebase project with Authentication, Firestore, and Cloud Messaging enabled
- Supabase project with database and API keys

### Installation

1. Clone the repository
2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file with your Firebase and Supabase credentials.

5. Run the server:
   ```
   uvicorn main:app --reload
   ```

## Configuration

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication, Firestore Database, and Cloud Messaging
3. Generate a service account key and save it as `serviceAccountKey.json`
4. Add the following to your `.env` file:
   ```
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_CREDENTIALS_PATH=path/to/serviceAccountKey.json
   ```

### Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Create the following tables:
   - `profiles` (id, email, display_name, created_at, progress)
   - `reports` (id, user_id, crop_type, image_url, disease, confidence, recommendations, timestamp)
3. Add the following to your `.env` file:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_role_key
   ```

## API Documentation

Once the server is running, you can access the interactive API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Deployment

The backend can be deployed to various platforms such as Vercel, Railway, or Render. The `vercel.json` file is pre-configured for Vercel deployment.

## Testing

You can test the API endpoints using the built-in Swagger UI or tools like Postman or cURL.