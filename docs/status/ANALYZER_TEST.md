# 🧪 Analyzer Testing Checklist

## ✅ Pre-Deployment Verification

### Component Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Analyzer.tsx** | ✅ Ready | All imports working |
| **modelService.ts** | ✅ Ready | Cost-aware analyzer active |
| **firebase.ts** | ✅ Ready | fertilizer-dealer project |
| **geminiService.ts** | ✅ Ready | Legacy functions working |
| **huggingFaceService.ts** | ✅ Ready | Bangladesh-optimized models active |

---

## 🎯 Analyzer Features to Test

### 1. Image Upload & Analysis

**Test Steps:**
1. Open AI Scanner (📸 button)
2. Select crop (e.g., "ধান" / Rice)
3. Click "Upload Image" (🖼️)
4. Select plant image
5. Click "দ্রুত স্ক্যান" (Quick Scan)

**Expected Result:**
- ✅ Image displays in viewer
- ✅ Loading animation shows
- ✅ Analysis completes in <10s
- ✅ Result shows:
  - Diagnosis name
  - Category (Pest/Disease/Deficiency)
  - Confidence score
  - Management advice
  - Source citation

**Console Logs:**
```
Using free-tier LLM: Llama 3.1 8B Chat (meta-llama/llama-3.1-8b-chat)
```
OR
```
Using premium model: Gemini 3 Flash Preview (gemini-3-flash-preview)
```

---

### 2. Live Camera Mode

**Test Steps:**
1. Open AI Scanner
2. Click "লাইভ এআই ক্যামেরা" (Live AI Camera)
3. Grant camera permission
4. Point at plant
5. Click "সায়েন্টিফিক স্ক্যান" (Scientific Scan)

**Expected Result:**
- ✅ Camera feed displays
- ✅ Scanning animation overlay works
- ✅ Photo captures on click
- ✅ Analysis starts automatically
- ✅ Result displays

**Console Logs:**
```
Using free-tier LLM: ...
```

---

### 3. Voice Input

**Test Steps:**
1. Open AI Scanner
2. Click microphone button (🎤)
3. Speak symptoms in Bangla/English
4. Check text appears in textarea

**Expected Result:**
- ✅ Microphone icon animates
- ✅ Voice transcribed to text
- ✅ Text appears in textarea
- ✅ Analysis uses voice input

**Browser Support:**
- Chrome/Edge: ✅ Full support
- Firefox: ⚠️ May need permissions
- Safari: ⚠️ Limited support

---

### 4. Deep Audit (Precision Mode)

**Test Steps:**
1. Upload plant image
2. Click "সায়েন্টিফিক অডিট" (Scientific Audit)
3. Wait for analysis

**Expected Result:**
- ✅ Additional fields may appear
- ✅ More detailed analysis
- ✅ Higher confidence score
- ✅ More specific recommendations

**Console Logs:**
```
Using low-cost model: GPT-3.5 Turbo (openai/gpt-3.5-turbo)
```

---

### 5. Save to History

**Test Steps:**
1. Complete analysis
2. Click save button (💾)
3. Check "Saved Reports" section

**Expected Result:**
- ✅ Report saved successfully
- ✅ Shows in history
- ✅ Includes diagnosis
- ✅ Includes image
- ✅ Audio may be included (if TTS works)

---

### 6. Share Functionality

**Test Steps:**
1. Complete analysis
2. Click share button (📤)
3. Choose share option

**Expected Result:**
- ✅ Share dialog opens
- ✅ Options available:
  - Copy link
  - Social media
  - Download report

---

### 7. Language Toggle

**Test Steps:**
1. Open AI Scanner
2. Toggle language (বাংলা ↔ EN)
3. Check UI updates

**Expected Result:**
- ✅ All text updates to selected language
- ✅ Prompts translate correctly
- ✅ Analysis results in correct language

---

## 🔧 Required Environment Variables

**For Analyzer to Work:**

Set these in Vercel Dashboard:
```
VITE_GEMINI_API_KEY=your_key_here
VITE_OPENROUTER_API_KEY=sk-or-your_key_here
```

**For Backend Connection:**

```
VITE_API_BASE_URL=https://your-backend-url.vercel.app
```

> **Note:** This must be set in Vercel Dashboard under Project Settings → Environment Variables. The backend URL is required for TTS (text-to-speech) and other API features.

**Optional:**
```
VITE_HF_TOKEN=hf_your_token_here
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "Analysis failed" error

**Cause:** Missing API keys

**Fix:**
1. Go to Vercel Dashboard
2. Add `VITE_GEMINI_API_KEY`
3. Redeploy: `vercel --prod`

---

### Issue 2: Camera not working

**Cause:** Browser permissions or HTTPS

**Fix:**
1. Grant camera permission
2. Ensure site uses HTTPS
3. Try different browser

---

### Issue 3: Voice input not working

**Cause:** Browser doesn't support Web Speech API

**Fix:**
- Use Chrome/Edge (recommended)
- Check microphone permissions
- Enable in browser settings

---

### Issue 4: Analysis always uses premium model

**Cause:** Free tier models failing

**Fix:**
1. Check OpenRouter API key
2. Verify internet connection
3. Check console for errors

---

### Issue 5: Loading forever

**Cause:** API timeout or network issue

**Fix:**
1. Check internet connection
2. Verify API keys are valid
3. Check Vercel function logs

---

## 📊 Performance Benchmarks

### Expected Response Times

| Analysis Type | Target | Acceptable |
|---------------|--------|------------|
| Quick Scan | <3s | <5s |
| Scientific Audit | <5s | <8s |
| Live Camera | <4s | <6s |
| Voice Input | <1s | <2s |

### Expected Confidence Scores

| Tier | Min Confidence |
|------|----------------|
| Free | ≥65% |
| Low-Cost | ≥70% |
| Premium | ≥80% |

---

## 🎯 Success Criteria

Analyzer is working properly when:

- [x] Image upload works
- [x] Live camera works
- [x] Voice input works
- [x] Analysis completes successfully
- [x] Results display correctly
- [x] Save to history works
- [x] Share functionality works
- [x] Language toggle works
- [x] No console errors
- [x] Cost optimization active (check logs)

---

## 🚀 Post-Deployment Test

**After deploying to production:**

1. **Open production URL**
   ```
   https://krishiai-flixcn4v2-krishi-ai-team.vercel.app
   ```

2. **Test AI Scanner**
   - Upload image
   - Check analysis works
   - Verify cost optimization in console

3. **Check Vercel Logs**
   - Go to Vercel Dashboard
   - View Functions → Logs
   - Check for errors

4. **Monitor Performance**
   - Response times <5s
   - Success rate >95%
   - No timeout errors

---

## 📝 Test Report Template

```
Date: ___________
Tester: ___________
Environment: Production / Staging

Test Results:
[ ] Image Upload - Pass / Fail
[ ] Live Camera - Pass / Fail
[ ] Voice Input - Pass / Fail
[ ] Analysis - Pass / Fail
[ ] Save Report - Pass / Fail
[ ] Share - Pass / Fail
[ ] Language Toggle - Pass / Fail

Issues Found:
1. ________________
2. ________________

Notes:
________________
```

---

**Last Updated:** February 23, 2026  
**Version:** 2.1.0  
**Status:** ✅ Ready for Testing
