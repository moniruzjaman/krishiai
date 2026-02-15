@echo off
REM Deployment script for Krishi AI

echo 🚀 Starting Krishi AI deployment...

REM Frontend deployment
echo 📦 Building frontend...
cd krishiai-frontend
npm run build

if %ERRORLEVEL% EQU 0 (
    echo ✅ Frontend build successful
    echo 🌐 Deploying frontend to Vercel...
    vercel --prod --force
) else (
    echo ❌ Frontend build failed
    exit /b 1
)

echo ✅ Frontend deployment completed

REM Backend deployment
echo 📦 Preparing backend for deployment...
cd ..\krishi-ai-backend

echo 🌐 Deploying backend to Vercel...
vercel --prod --force

if %ERRORLEVEL% EQU 0 (
    echo ✅ Backend deployment successful
    echo 🎉 Deployment completed successfully!
    echo 🔗 Check your Vercel dashboard for deployment URLs
) else (
    echo ❌ Backend deployment failed
    exit /b 1
)
