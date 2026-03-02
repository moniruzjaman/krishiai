# Render Deployment Guide

This guide explains how to deploy the Krishi AI Backend to Render.

## Quick Deploy (Manual)

### Option 1: From Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `krishi-ai-backend`
   - **Region**: Oregon (or closest to you)
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables (see below)
6. Click **"Create Web Service"**

### Option 2: From CLI

```bash
# Install Render CLI
npm install -g render-cli

# Login
render login

# Create service
render create web \
  --name=krishi-ai-backend \
  --region=oregon \
  --runtime=python \
  --build-command="pip install -r requirements.txt" \
  --start-command="uvicorn app.main:app --host 0.0.0.0 --port $PORT" \
  --env=GEMINI_API_KEY=your_api_key_here
```

## Environment Variables

Set these in Render Dashboard → Your Service → Environment:

| Key | Value | Notes |
|-----|-------|-------|
| `APP_NAME` | Krishi AI Backend | |
| `APP_VERSION` | 4.0.0 | |
| `DEBUG` | false | |
| `ENVIRONMENT` | production | |
| `HOST` | 0.0.0.0 | |
| `PORT` | 10000 | |
| `GEMINI_API_KEY` | (your API key) | **Required** - Get from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `HF_TOKEN` | (your HuggingFace token) | Optional |
| `OPENAI_API_KEY` | (your OpenAI key) | Optional |
| `OPENROUTER_API_KEY` | (your OpenRouter key) | Optional |
| `SECURE_PASSWORD` | (generate a secure password) | For API authentication |
| `ALLOWED_ORIGINS` | https://krishiai-rbvdpdhfg-krishi-ai-team.vercel.app,https://www.krishiai.live,https://krishiai.live | |
| `SUPABASE_URL` | https://nmngzjrrysjzuxfcklrk.supabase.co | |
| `SUPABASE_KEY` | (your Supabase key) | |

## Get API Keys

### Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy and add to Render environment variables

### HuggingFace Token (Optional - for 99% cost savings)
1. Go to [HuggingFace Settings](https://huggingface.co/settings/tokens)
2. Create a new token (read permission)
3. Add to Render

## After Deployment

1. Note your Render service URL (e.g., `https://krish-ai-backend.onrender.com`)
2. Update your frontend to call this backend URL
3. Test the health endpoint:
   ```
   curl https://your-render-url.onrender.com/health
   ```

## Troubleshooting

### Health Check Fails
- Ensure the `PORT` environment variable is set to `10000`
- Check the start command includes `--port $PORT`

### CORS Errors
- Update `ALLOWED_ORIGINS` to include your frontend domain
- Redeploy after changing

### 500 Internal Server Error
- Check Render logs for details
- Ensure `GEMINI_API_KEY` is set correctly
- Verify API key is valid at [Google AI Studio](https://aistudio.google.com/app/apikey)

## Auto-Deploy with Blueprint

This repo includes `render.yaml` for Blueprint deployments:

1. Push to GitHub
2. Go to Render → Blueprints
3. Connect repository
4. Render will auto-create the service

## Files for Render

- `render.yaml` - Blueprint configuration
- `Procfile` - Alternative start command
- `requirements.txt` - Python dependencies
- `app/main.py` - FastAPI application
