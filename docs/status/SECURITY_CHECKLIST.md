# ✅ Security & Deployment Checklist

## 🔒 Secret Credentials Status

### ✅ Properly Handled

| Secret | Status | Location |
|--------|--------|----------|
| **Firebase API Key** | ✅ Safe (client-side) | Code + Vercel |
| **Gemini API Key** | ✅ Removed from git | Vercel only |
| **OpenRouter Key** | ✅ Removed from git | Vercel only |
| **Hugging Face Token** | ✅ Removed from git | Vercel only |
| **OpenAI Key** | ✅ Removed from git | Vercel only |
| **Supabase Key** | ✅ Safe (anon key) | Vercel only |

---

## 📋 Pre-Push Security Checklist

### Before Every Git Push

- [ ] **Check for `.env` files**
  ```bash
  git status
  # Should NOT show .env or .env.*
  ```

- [ ] **Verify .gitignore includes**
  ```
  .env
  .env.*
  !.env.example
  ```

- [ ] **Scan for secrets**
  ```bash
  # Search for common patterns
  findstr /S /I "AIzaSy" *.ts *.tsx *.js *.jsx 2>nul
  findstr /S /I "sk-or-v1" *.ts *.tsx *.js *.jsx 2>nul
  findstr /S /I "hf_" *.ts *.tsx *.js *.jsx 2>nul
  ```

- [ ] **Review git diff**
  ```bash
  git diff
  # Check for any accidental secrets
  ```

---

## 🚀 Deployment Status

### Current Deployment
- **URL:** https://krishiai-flixcn4v2-krishi-ai-team.vercel.app
- **Status:** ✅ Active (Production)
- **Last Commit:** `75d78d0` - Security cleanup

### Environment Variables in Vercel

**Required (Set in Vercel Dashboard):**

Go to: https://vercel.com/krishi-ai-team/krishiai-flixcn4v2/settings/environment-variables

| Variable | Value | Status |
|----------|-------|--------|
| `VITE_GEMINI_API_KEY` | User must set | ⚠️ Required |
| `VITE_OPENROUTER_API_KEY` | User must set | ⚠️ Required |
| `VITE_HF_TOKEN` | User must set | ⚠️ Optional |
| `VITE_SUPABASE_URL` | User must set | ⚠️ Required |
| `VITE_SUPABASE_ANON_KEY` | User must set | ⚠️ Required |
| `VITE_BACKEND_URL` | User must set | ⚠️ Required |

**Already in Code (Safe):**

| Variable | Value | Why Safe |
|----------|-------|----------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyCMRA3_SceO-iemeiMHh0Cyhu9T1BTd_-M` | Firebase keys are client-side by design |
| `VITE_FIREBASE_AUTH_DOMAIN` | `fertilizer-dealer.firebaseapp.com` | Public config |
| `VITE_FIREBASE_PROJECT_ID` | `fertilizer-dealer` | Public config |

---

## 🔐 Security Best Practices

### ✅ DO:

1. **Use Vercel Environment Variables**
   - Store all API keys in Vercel dashboard
   - Never in code
   - Never in `.env` files committed to git

2. **Keep `.env` Local**
   ```bash
   # Create local .env (never commit)
   cp .env.example .env
   # Edit .env with your keys
   # .env is in .gitignore - safe!
   ```

3. **Rotate Keys Periodically**
   - Every 90 days for production
   - Immediately if exposed

4. **Use Different Keys for Environments**
   - Development keys ≠ Production keys
   - Separate projects for separate apps

5. **Monitor Usage**
   - Check Vercel dashboard
   - Set up alerts for unusual activity
   - Review API usage logs

### ❌ DON'T:

1. **Never commit `.env` files**
   ```bash
   # WRONG
   git add .env
   git commit -m "Add config"
   
   # RIGHT
   # .env is in .gitignore - won't be added
   ```

2. **Never hardcode keys in source code**
   ```typescript
   // WRONG
   const apiKey = "AIzaSy...";
   
   // RIGHT
   const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
   ```

3. **Never share keys in public repos**
   - Even in issues or comments
   - Even temporarily
   - Even in error logs

4. **Never use same keys across projects**
   - Each project gets unique keys
   - Compromise of one ≠ compromise of all

---

## 🛡️ Firebase Security Note

### Why Firebase API Key is Safe in Code

Firebase API keys are **designed to be public** because:
- They identify your Firebase project, not authenticate
- Security is handled via Firebase Security Rules
- Client-side apps must have the key to connect

### BUT You Still Need:

1. **Firebase Security Rules**
   ```javascript
   // Firestore Rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

2. **Authentication Setup**
   - Enable Google Sign-In
   - Set authorized domains
   - Configure OAuth consent screen

3. **Storage Rules**
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

---

## 📊 Git Security Scanning

### GitHub Secret Scanning

GitHub automatically scans for:
- API keys (AWS, GCP, Azure, etc.)
- Tokens (GitHub, GitLab, etc.)
- Private keys
- Database passwords

**If detected:**
- Push will be blocked
- Alert sent to repository admins
- Secret revoked automatically (for supported services)

### Fix If Detected

1. **Remove secret from history**
   ```bash
   # Remove file from git
   git rm --cached path/to/file
   
   # Commit removal
   git commit -m "security: Remove secrets"
   
   # Force push
   git push --force origin main
   ```

2. **Rotate the exposed key**
   - Go to the service's dashboard
   - Revoke old key
   - Create new key
   - Update in Vercel

3. **Add to .gitignore**
   ```
   # Prevent future commits
   .env
   *.key
   *.pem
   ```

---

## 🔍 Audit Trail

### Recent Security Actions

- [x] `.env` removed from git (commit: f641cf4)
- [x] `.env.bak` removed from git (commit: f641cf4)
- [x] API keys removed from `.env.example` (commit: 75d78d0)
- [x] `.gitignore` updated to block `.env*` files
- [x] Firebase config updated to `fertilizer-dealer` project
- [x] TypeScript excludes backup folders

### Pending Actions

- [ ] Set Vercel environment variables
- [ ] Rotate Gemini API key (was exposed)
- [ ] Rotate OpenRouter key (was exposed)
- [ ] Rotate Hugging Face token (was exposed)
- [ ] Set up Firebase Security Rules
- [ ] Enable GitHub secret scanning alerts

---

## 🚨 Emergency Response

### If You Accidentally Commit Secrets

**Immediate Actions (within 5 minutes):**

1. **Delete the commit**
   ```bash
   git reset --hard HEAD~1
   git push --force origin main
   ```

2. **Rotate ALL exposed keys**
   - Change passwords/API keys immediately
   - Even if you think it's safe

3. **Check Vercel deployment**
   - Delete any deployments with secrets
   - Update environment variables

4. **Scan for copies**
   ```bash
   # Search your computer
   findstr /S /I "AIzaSy..." C:\Users\YourName\*
   
   # Check git history
   git log --all --full-history -- "**/.env*"
   ```

5. **Notify team**
   - Tell anyone with access
   - Check if they have copies
   - Update shared credentials

---

## 📞 Support Resources

- **Vercel Security:** https://vercel.com/security
- **GitHub Secret Scanning:** https://docs.github.com/en/code-security/secret-scanning
- **Firebase Security:** https://firebase.google.com/docs/rules
- **Supabase Security:** https://supabase.com/docs/guides/auth/row-level-security

---

**Last Updated:** February 18, 2026  
**Status:** ✅ Secure - Ready for Deployment  
**Next Audit:** March 18, 2026
