# Krishi AI - Vercel Deployment Guide

## Quick Deploy

### Option 1: Deploy via Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to project
cd C:\Users\SERVICING GURU\Desktop\krishiai

# Deploy to production
vercel --prod
```

### Option 2: Deploy via GitHub Integration

1. Push your code to GitHub:
```bash
git add .
git commit -m "Update deployment configuration"
git push origin main
```

2. Go to [vercel.com](https://vercel.com) and:
   - Click "Add New Project"
   - Import your GitHub repository: `moniruzjaman/krishiai`
   - Configure project:
     - **Framework Preset**: Vite
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`
   - Add Environment Variables (see below)
   - Click "Deploy"

## Environment Variables

Add these in Vercel Dashboard → Project Settings → Environment Variables:

```bash
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
VITE_BACKEND_URL=https://backend-ey0ythaje-krishi-ai-team.vercel.app

# AI Services
VITE_OPENROUTER_API_KEY=Sk-or-v1-ada00323a80263def17dfee2765a4ed169e343a8dcfaf2f09fa30fff67f28511
VITE_GEMINI_API_KEY=AIzaSyDSpQu9cSsAta4ItqubTxkVzYS3dEhA-8k
```

## Troubleshooting 401 Errors

If you see "401 Unauthorized" on your Vercel deployment:

### Solution 1: Check Vercel Authentication
1. Go to Vercel Dashboard → Project Settings → Authentication
2. Ensure "Password Protection" is **DISABLED** for Production
3. Or add your domain to allowed list

### Solution 2: Verify Environment Variables
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Ensure all variables from above are added
3. Redeploy after adding variables: `vercel --prod`

### Solution 3: Check Team Permissions
1. Go to Vercel Dashboard → Team Settings → Members
2. Ensure your account has deployment permissions
3. Check if project is assigned to correct team: `krishi-ai-team`

### Solution 4: Re-link Vercel Project
```bash
# In your project directory
vercel link
# Select existing project: krishiai-rbvdpdhfg-krishi-ai-team
vercel --prod
```

## Build Locally

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview production build
npm run preview
```

## Custom Domain (Optional)

To add a custom domain:
1. Vercel Dashboard → Project Settings → Domains
2. Add your domain (e.g., `krishi-ai.org`)
3. Update DNS records as instructed

## Post-Deployment Checklist

- [ ] All environment variables are set
- [ ] Build completes without errors
- [ ] App loads without 401 error
- [ ] Camera/image upload works
- [ ] AI analysis functions correctly
- [ ] PWA manifest loads properly
- [ ] Service worker registers successfully

## Support

For issues, check:
- Vercel Functions logs in Dashboard
- Browser console for client-side errors
- Network tab for failed API requests
