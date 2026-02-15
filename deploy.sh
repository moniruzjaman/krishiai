#!/bin/bash
# Deployment script for Krishi AI

echo "🚀 Starting Krishi AI deployment..."

# Frontend deployment
echo "📦 Building frontend..."
cd krishiai-frontend
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful"
    echo "🌐 Deploying frontend to Vercel..."
    vercel --prod --force
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Frontend deployment completed"

# Backend deployment
echo "📦 Preparing backend for deployment..."
cd ../krishi-ai-backend

echo "🌐 Deploying backend to Vercel..."
vercel --prod --force

if [ $? -eq 0 ]; then
    echo "✅ Backend deployment successful"
    echo "🎉 Deployment completed successfully!"
    echo "🔗 Your frontend is live at: $(vercel --cwd krishiai-frontend url)"
    echo "🔗 Your backend is live at: $(vercel --cwd krishi-ai-backend url)"
else
    echo "❌ Backend deployment failed"
    exit 1
fi
