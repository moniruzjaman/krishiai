@echo off
REM Krishi AI Backend - Render Deployment Script

echo ========================================
echo  Krishi AI Backend - Render Deploy
echo ========================================
echo.

REM Check if render-cli is installed
where render >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Render CLI...
    npm install -g render-cli
)

REM Login to Render
echo.
echo [1/3] Logging into Render...
render login
if %errorlevel% neq 0 (
    echo ERROR: Login failed
    exit /b 1
)

REM Set environment variables
echo.
echo [2/3] Setting environment variables...
echo Note: Set GEMINI_API_KEY in Render dashboard for security

REM Deploy to Render
echo.
echo [3/3] Deploying to Render...
echo.

render create web ^
  --name=krishi-ai-backend ^
  --region=oregon ^
  --runtime=python ^
  --build-command="pip install -r requirements.txt" ^
  --start-command="uvicorn app.main:app --host 0.0.0.0 --port $PORT" ^
  --env=APP_NAME="Krishi AI Backend" ^
  --env=APP_VERSION="4.0.0" ^
  --env=DEBUG="false" ^
  --env=ENVIRONMENT="production" ^
  --env=HOST="0.0.0.0" ^
  --env=PORT="10000"

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo  Deployment Failed!
    echo ========================================
    exit /b 1
)

echo.
echo ========================================
echo  Deployment Successful!
echo ========================================
echo.
echo Your backend is now live on Render
echo Add your API keys in the Render Dashboard:
echo 1. Go to https://dashboard.render.com
echo 2. Find krishi-ai-backend service
echo 3. Add Environment Variables:
echo    - GEMINI_API_KEY (required)
echo    - HF_TOKEN (optional)
echo    - OPENAI_API_KEY (optional)
echo.
