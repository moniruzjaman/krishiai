# 🚀 Krishi AI - Deployment Test Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Variables
- [ ] `VITE_GEMINI_API_KEY` - Set and valid
- [ ] `VITE_OPENROUTER_API_KEY` - Set and valid  
- [ ] `VITE_HF_TOKEN` - Set (optional, for HF integration)
- [ ] `VITE_FIREBASE_*` - All Firebase config set
- [ ] `VITE_SUPABASE_*` - All Supabase config set

### 2. Dependencies
- [ ] `@huggingface/inference` installed
- [ ] `@google/genai` installed
- [ ] All dependencies in package.json present

### 3. Code Quality
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser
- [ ] Analyzer component imports work

### 4. Build Verification
- [ ] `npm run build` completes successfully
- [ ] `dist/` folder created
- [ ] `dist/index.html` exists

---

## 🧪 Testing Steps

### Local Build Test

**Run the test script:**
```bash
cd "C:\Users\SERVICING GURU\Desktop\krishiai"
test-deploy.bat
```

**Expected output:**
```
========================================
 Krishi AI Deployment Test
========================================

[1/6] Checking Node.js...
v20.x.x

[2/6] Checking .env configuration...
OK

[3/6] Checking dependencies...
Dependencies OK

[4/6] Checking TypeScript compilation...
OK

[5/6] Building application...
Build successful!

[6/6] Verifying build output...
Build output verified

========================================
 Build Test PASSED!
========================================
```

---

## 🔧 Manual Testing

### Test 1: Verify HF Integration
```bash
# Start dev server
npm run dev

# Open browser console (F12)
# Check for:
console.log('Testing HF integration...');
# Should see HF service initialization
```

### Test 2: Check Model Selection
1. Open AI Scanner (📸)
2. Upload plant image
3. Watch console logs for:
```
✅ Using Hugging Face for pre-analysis (FREE tier)
✅ HF analysis successful: [diagnosis] ([confidence]%)
```
OR (if HF unavailable):
```
✅ Using free-tier LLM: Llama 3.1 8B Chat
```

### Test 3: Verify Cost Optimization
Check that most analyses use FREE tier:
- HF usage: ~60% of requests
- Free LLM: ~25% of requests
- Low-cost: ~10% of requests
- Premium: ~5% of requests

---

## 🌐 Vercel Deployment

### Option A: Deploy via CLI

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Login**
```bash
vercel login
```

**Step 3: Link Project**
```bash
cd "C:\Users\SERVICING GURU\Desktop\krishiai"
vercel link
# Select: krishiai-rbvdpdhfg-krishi-ai-team
# Team: krishi-ai-team
```

**Step 4: Pull Environment Variables**
```bash
vercel env pull
# This downloads all env vars from Vercel
```

**Step 5: Deploy to Production**
```bash
vercel --prod
```

### Option B: Deploy via GitHub

**Step 1: Push to GitHub**
```bash
git add .
git commit -m "Ready for deployment: HF integration + cost optimization"
git push origin main
```

**Step 2: Trigger Vercel Build**
1. Go to [vercel.com](https://vercel.com)
2. Navigate to your project: `krishiai-rbvdpdhfg`
3. Click **Redeploy** on latest deployment
4. Wait for build to complete

---

## 🐛 Troubleshooting

### Build Fails with "Module not found"

**Error:**
```
Error: Cannot find module '@huggingface/inference'
```

**Solution:**
```bash
npm install @huggingface/inference
npm run build
```

### TypeScript Errors

**Error:**
```
TS2307: Cannot find module './huggingFaceService'
```

**Solution:**
```bash
# Check file exists
dir services\huggingFaceService.ts

# If missing, restore from git
git checkout services/huggingFaceService.ts
```

### Environment Variable Missing

**Error:**
```
VITE_GEMINI_API_KEY is not defined
```

**Solution:**
1. Check `.env` file exists
2. Verify all required variables are set
3. For Vercel: `vercel env pull`

### 401 Unauthorized on Vercel

**Solution:**
1. Go to Vercel Dashboard → Project Settings → Authentication
2. Ensure "Password Protection" is DISABLED for Production
3. Redeploy: `vercel --prod`

---

## 📊 Post-Deployment Verification

### 1. Check Deployment URL
```
https://krishiai-rbvdpdhfg-krishi-ai-team.vercel.app
```

### 2. Test Key Features
- [ ] App loads without errors
- [ ] AI Scanner opens
- [ ] Image upload works
- [ ] Analysis completes (<10s)
- [ ] Results display in Bangla
- [ ] Console shows cost-effective model selection

### 3. Monitor Performance
- [ ] Response time <5s (60% of requests)
- [ ] HF integration working (check logs)
- [ ] No 401 errors
- [ ] No CORS errors

---

## 🔐 Security Checklist

- [ ] `.env` file NOT committed to git
- [ ] API keys rotated (if compromised)
- [ ] Vercel environment variables encrypted
- [ ] Firebase rules configured
- [ ] Supabase RLS enabled

---

## 📈 Success Metrics

After deployment, verify:

| Metric | Target | Actual |
|--------|--------|--------|
| Build Time | <5 min | ___ |
| First Contentful Paint | <2s | ___ |
| Time to Interactive | <5s | ___ |
| Analysis Response Time | <5s | ___ |
| Free Tier Usage | >60% | ___ |
| Error Rate | <1% | ___ |

---

## 🎯 Rollback Plan

If deployment fails:

**Option 1: Quick Rollback**
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Vercel will auto-redeploy
```

**Option 2: Vercel Dashboard**
1. Go to Vercel → Deployments
2. Find last working deployment
3. Click **Promote to Production**

---

## 📞 Support

If issues persist:
- Check logs: Vercel Dashboard → Functions → Logs
- Review: `IMPLEMENTATION_COMPLETE.md`
- Contact: krishi-ai-team@vercel.app

---

**Last Updated:** February 18, 2026  
**Version:** 2.0.0  
**Status:** Ready for Deployment Test
