# Krishi AI Backend

A FastAPI-based backend service for the Krishi AI agricultural assistant application. This service provides Text-to-Speech (TTS) capabilities using Google Gemini's TTS API.

## 🚀 Features

- **Text-to-Speech (TTS)**: Convert text to natural speech using Google Gemini TTS
  - Model: `gemini-2.5-flash-preview-tts`
  - Voice: Kore (prebuilt)
  - Audio format: PCM (24kHz, mono)
  - Max text length: 1000 characters

- **FastAPI Framework**: Modern, fast web framework for building APIs
- **CORS Support**: Configured for cross-origin requests
- **Health Checks**: Built-in health check endpoints
- **Auto-scaling**: Ready for Cloud Run deployment

## 📁 Project Structure

```
krishi-ai-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── routes/
│   │   ├── __init__.py
│   │   └── tts.py           # TTS API routes
│   └── services/
│       ├── __init__.py
│       └── tts_service.py   # TTS business logic
├── Dockerfile               # Container configuration
├── cloudbuild.yaml          # Google Cloud Build CI/CD
├── requirements.txt         # Python dependencies
├── .env.example             # Environment variables template
└── README.md                # This file
```

## 🛠️ Local Development

### Prerequisites

- Python 3.11+
- Google Gemini API key

### Setup

1. **Clone the repository**
   ```bash
   cd krishi-ai-backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/macOS
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   # Copy example file
   copy .env.example .env
   
   # Edit .env and add your API key
   # GEMINI_API_KEY=your_api_key_here
   ```

5. **Run the server**
   ```bash
   # Development mode with auto-reload
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Or run directly
   python -m app.main
   ```

6. **Access the API**
   - API: http://localhost:8000
   - Documentation: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API information |
| `/health` | GET | Health check |
| `/api/tts` | POST | Convert text to speech |
| `/api/tts/health` | GET | TTS service health |

### TTS Endpoint Example

```bash
curl -X POST "http://localhost:8000/api/tts" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test message."}'
```

Response:
```json
{
  "success": true,
  "audio_data": "base64_encoded_audio...",
  "format": "pcm",
  "sample_rate": 24000
}
```

## ☁️ Deployment to Google Cloud Run

### Prerequisites

1. Google Cloud account with billing enabled
2. Google Cloud SDK installed
3. Gemini API key

### One-Time Setup

1. **Enable required APIs**
   ```bash
   gcloud services enable \
     run.googleapis.com \
     cloudbuild.googleapis.com \
     secretmanager.googleapis.com \
     containerregistry.googleapis.com
   ```

2. **Create secret for API key**
   ```bash
   echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
   ```

3. **Grant Cloud Run access to secrets**
   ```bash
   PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
   
   gcloud secrets add-iam-policy-binding gemini-api-key \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

### Deploy Options

#### Option 1: Manual Deployment (Quick Start)

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy in one command
gcloud run deploy krishi-ai-backend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars="APP_NAME=Krishi AI Backend,DEBUG=False" \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest"
```

#### Option 2: Using Cloud Build (CI/CD)

1. **Create a Cloud Build trigger**
   - Go to Cloud Build > Triggers
   - Connect your repository
   - Create trigger for main branch

2. **Trigger deployment**
   ```bash
   # Manual trigger
   gcloud builds submit --config cloudbuild.yaml .
   ```

#### Option 3: Using Docker

```bash
# Build the image
docker build -t gcr.io/YOUR_PROJECT_ID/krishi-ai-backend .

# Push to Container Registry
docker push gcr.io/YOUR_PROJECT_ID/krishi-ai-backend

# Deploy to Cloud Run
gcloud run deploy krishi-ai-backend \
  --image gcr.io/YOUR_PROJECT_ID/krishi-ai-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `APP_NAME` | Application name | No | Krishi AI Backend |
| `APP_VERSION` | Application version | No | 4.0.0 |
| `DEBUG` | Enable debug mode | No | False |
| `ALLOWED_ORIGINS` | CORS allowed origins | No | localhost origins |
| `PORT` | Server port | No | 8080 |
| `HOST` | Server host | No | 0.0.0.0 |

## 💰 Cost Optimization

Cloud Run offers a generous free tier:

| Resource | Free Tier (per month) |
|----------|----------------------|
| Requests | 2 million |
| vCPU-seconds | 360,000 |
| GB-seconds | 180,000 |
| Network egress | 5 GB |

### Tips to minimize costs:

1. **Set `--min-instances 0`** - Scale to zero when not in use
2. **Use appropriate memory** - 512Mi is usually sufficient
3. **Set request timeout** - Default 60s is usually enough
4. **Monitor usage** - Set up billing alerts

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use Secret Manager** - Store sensitive data securely
3. **Enable authentication** - For production, add API authentication
4. **Limit CORS origins** - Specify exact domains in production
5. **Use HTTPS only** - Cloud Run provides this automatically

## 🧪 Testing

```bash
# Run health check
curl https://your-cloud-run-url/health

# Test TTS endpoint
curl -X POST "https://your-cloud-run-url/api/tts" \
  -H "Content-Type: application/json" \
  -d '{"text": "Testing TTS from Cloud Run"}'
```

## 📝 License

This project is part of the Krishi AI application.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

For more information about the Krishi AI project, see the main [README](../README.md).
