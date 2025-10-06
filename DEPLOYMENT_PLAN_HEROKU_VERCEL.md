# Deployment Plan: Heroku (Backend) + Vercel (Frontend)

## 📋 **Current Status**

### **Git Repository:**
- ✅ Branch: `main`
- ⚠️ **85 commits ahead of origin/main** (need to push)
- ⚠️ 2 untracked files (need to commit)
- ✅ Remote: `https://github.com/gramv/onboarding_lakecrest_clean.git`

### **Heroku:**
- ✅ CLI installed: `/opt/homebrew/bin/heroku`
- ✅ Logged in: `vgoutamram@gmail.com`
- ⚠️ **No Heroku app configured for this project**
- ℹ️ Existing app: `ordermanagement` (different project)

### **Vercel:**
- ✅ CLI installed: `/Users/gouthamvemula/.npm-global/bin/vercel`
- ✅ Project exists: `hotel-onboarding-frontend`
- ✅ Recent deployments: 3 days ago (6 successful, 4 errors)
- ✅ Configuration: `vercel.json` exists

### **Backend:**
- ✅ Procfile exists: `web: uvicorn app.main_enhanced:app --host 0.0.0.0 --port $PORT`
- ✅ Location: `backend/`
- ✅ Running locally: `http://localhost:8000`

### **Frontend:**
- ✅ Build configuration: `vercel.json`
- ✅ Location: `frontend/hotel-onboarding-frontend/`
- ✅ Running locally: `http://localhost:3000`
- ✅ Dist folder exists (built)

---

## 🚨 **Pre-Deployment Checklist**

### **Critical Issues to Address:**

1. **⚠️ No Heroku App for Backend**
   - Need to create new Heroku app OR
   - Link to existing Heroku app

2. **⚠️ Untracked Files**
   - `CONTEXTUAL_MANAGER_REVIEW_IMPLEMENTATION_PLAN.md`
   - `MANAGER_REVIEW_BUCKET_STRUCTURE_IMPLEMENTATION_PLAN.md`

3. **⚠️ 85 Unpushed Commits**
   - Need to push to GitHub first
   - Then deploy from GitHub

4. **⚠️ Environment Variables**
   - Need to verify all env vars are set in Heroku
   - Need to verify all env vars are set in Vercel

---

## 📝 **Deployment Plan**

### **Phase 1: Prepare Repository** (5 minutes)

#### **Step 1.1: Commit Untracked Files**
```bash
git add CONTEXTUAL_MANAGER_REVIEW_IMPLEMENTATION_PLAN.md
git add MANAGER_REVIEW_BUCKET_STRUCTURE_IMPLEMENTATION_PLAN.md
git commit -m "Add remaining implementation plan documents"
```

#### **Step 1.2: Push to GitHub**
```bash
git push origin main
```

**Expected Result:**
- ✅ All 86 commits pushed to GitHub
- ✅ Repository up to date

---

### **Phase 2: Deploy Backend to Heroku** (15 minutes)

#### **Step 2.1: Check for Existing Heroku App**

**Option A: If backend app already exists:**
```bash
# Check if heroku remote exists
git remote -v | grep heroku

# If exists, check app name
heroku apps:info
```

**Option B: If no backend app exists (LIKELY):**
```bash
# Create new Heroku app
heroku create hotel-onboarding-backend

# This will add heroku remote automatically
```

#### **Step 2.2: Set Environment Variables**

**Required Environment Variables:**
```bash
# Supabase
heroku config:set SUPABASE_URL="your_supabase_url"
heroku config:set SUPABASE_KEY="your_supabase_service_key"

# JWT
heroku config:set JWT_SECRET="your_jwt_secret"

# Email (Gmail SMTP)
heroku config:set SMTP_HOST="smtp.gmail.com"
heroku config:set SMTP_PORT="465"
heroku config:set SMTP_USER="your_email@gmail.com"
heroku config:set SMTP_PASSWORD="your_app_password"
heroku config:set FROM_EMAIL="your_email@gmail.com"

# Groq API (for OCR)
heroku config:set GROQ_API_KEY="your_groq_api_key"

# Google Credentials (for Document AI)
heroku config:set GOOGLE_CREDENTIALS_BASE64="your_base64_credentials"

# Frontend URL
heroku config:set FRONTEND_URL="https://hotel-onboarding-frontend.vercel.app"

# Environment
heroku config:set ENVIRONMENT="production"
```

**⚠️ IMPORTANT:** Get these values from your local `.env` file!

#### **Step 2.3: Configure Buildpack**

```bash
# Set Python buildpack
heroku buildpacks:set heroku/python
```

#### **Step 2.4: Create requirements.txt (if not exists)**

Check if `backend/requirements.txt` exists and is up to date.

#### **Step 2.5: Deploy Backend**

```bash
# Deploy backend subdirectory to Heroku
git subtree push --prefix backend heroku main
```

**Alternative (if subtree fails):**
```bash
# Create a separate branch for backend deployment
git subtree split --prefix backend -b backend-deploy
git push heroku backend-deploy:main
git branch -D backend-deploy
```

#### **Step 2.6: Verify Backend Deployment**

```bash
# Check logs
heroku logs --tail

# Open app in browser
heroku open

# Test health endpoint
curl https://your-app-name.herokuapp.com/api/healthz
```

**Expected Result:**
- ✅ Backend deployed successfully
- ✅ Health endpoint returns 200
- ✅ No errors in logs

---

### **Phase 3: Deploy Frontend to Vercel** (10 minutes)

#### **Step 3.1: Update Environment Variables**

**Check current env vars:**
```bash
cd frontend/hotel-onboarding-frontend
vercel env ls
```

**Add/Update required env vars:**
```bash
# Backend API URL (Heroku URL)
vercel env add VITE_API_URL production
# Enter: https://your-backend-app.herokuapp.com

# Supabase (for client-side auth)
vercel env add VITE_SUPABASE_URL production
# Enter: your_supabase_url

vercel env add VITE_SUPABASE_ANON_KEY production
# Enter: your_supabase_anon_key
```

#### **Step 3.2: Build Frontend Locally (Test)**

```bash
cd frontend/hotel-onboarding-frontend
npm run build
```

**Expected Result:**
- ✅ Build completes without errors
- ✅ `dist/` folder created

#### **Step 3.3: Deploy to Vercel**

```bash
cd frontend/hotel-onboarding-frontend
vercel --prod
```

**Follow prompts:**
- Link to existing project? **Yes**
- Which project? **hotel-onboarding-frontend**
- Deploy to production? **Yes**

**Alternative (if already linked):**
```bash
vercel deploy --prod
```

#### **Step 3.4: Verify Frontend Deployment**

```bash
# Get deployment URL
vercel ls

# Open in browser
vercel open
```

**Expected Result:**
- ✅ Frontend deployed successfully
- ✅ No build errors
- ✅ App loads in browser

---

### **Phase 4: Integration Testing** (15 minutes)

#### **Step 4.1: Test Backend Endpoints**

```bash
# Health check
curl https://your-backend-app.herokuapp.com/api/healthz

# Test CORS
curl -H "Origin: https://hotel-onboarding-frontend.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-backend-app.herokuapp.com/api/healthz
```

#### **Step 4.2: Test Frontend-Backend Integration**

1. **Open frontend in browser:**
   - Go to: `https://hotel-onboarding-frontend.vercel.app`

2. **Test login:**
   - Try logging in with test credentials
   - Check browser console for errors
   - Verify API calls go to Heroku backend

3. **Test onboarding flow:**
   - Start a new onboarding session
   - Complete a few steps
   - Verify data saves correctly

4. **Test single-step invitation:**
   - Send a single-step direct deposit invite
   - Open invitation link
   - Verify modal appears
   - Complete form
   - Check email notifications

#### **Step 4.3: Monitor Logs**

**Backend logs:**
```bash
heroku logs --tail
```

**Frontend logs:**
```bash
vercel logs
```

---

## 🔧 **Troubleshooting**

### **Backend Issues:**

**Problem: Build fails**
```bash
# Check buildpack
heroku buildpacks

# Check requirements.txt
cat backend/requirements.txt

# Check Python version
cat backend/runtime.txt  # Should specify Python version
```

**Problem: App crashes**
```bash
# Check logs
heroku logs --tail

# Check config vars
heroku config

# Restart app
heroku restart
```

**Problem: Database connection fails**
```bash
# Verify Supabase credentials
heroku config:get SUPABASE_URL
heroku config:get SUPABASE_KEY

# Test connection
heroku run python -c "from app.supabase_service_enhanced import supabase_service; print(supabase_service.client)"
```

### **Frontend Issues:**

**Problem: Build fails**
```bash
# Check build logs
vercel logs

# Build locally
cd frontend/hotel-onboarding-frontend
npm run build

# Check for TypeScript errors
npm run type-check
```

**Problem: API calls fail**
```bash
# Check environment variables
vercel env ls

# Verify VITE_API_URL is correct
vercel env pull .env.production.local
cat .env.production.local
```

**Problem: CORS errors**
- Verify backend CORS settings allow Vercel domain
- Check `FRONTEND_URL` in Heroku config

---

## ✅ **Success Criteria**

### **Backend (Heroku):**
- ✅ App deployed and running
- ✅ Health endpoint returns 200
- ✅ Database connection works
- ✅ Email service configured
- ✅ No errors in logs

### **Frontend (Vercel):**
- ✅ App deployed and accessible
- ✅ Build completes without errors
- ✅ Environment variables set
- ✅ API calls reach backend
- ✅ No console errors

### **Integration:**
- ✅ Login works
- ✅ Onboarding flow works
- ✅ Single-step invitations work
- ✅ Email notifications sent
- ✅ PDF generation works
- ✅ Document upload works

---

## 📊 **Deployment Timeline**

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Prepare Repository | 5 min | ⏳ Pending |
| 2 | Deploy Backend (Heroku) | 15 min | ⏳ Pending |
| 3 | Deploy Frontend (Vercel) | 10 min | ⏳ Pending |
| 4 | Integration Testing | 15 min | ⏳ Pending |
| **Total** | | **45 min** | |

---

## 🚀 **Ready to Deploy?**

### **Before you start:**

1. ✅ Commit untracked files
2. ✅ Push to GitHub
3. ✅ Have all environment variables ready
4. ✅ Backend is working locally
5. ✅ Frontend is working locally
6. ✅ Both servers stopped (to avoid conflicts)

### **Execute deployment:**

```bash
# Phase 1: Prepare
git add -A
git commit -m "Add remaining documentation"
git push origin main

# Phase 2: Backend
heroku create hotel-onboarding-backend  # or link existing
heroku config:set [ALL_ENV_VARS]
git subtree push --prefix backend heroku main

# Phase 3: Frontend
cd frontend/hotel-onboarding-frontend
vercel env add VITE_API_URL production
vercel --prod

# Phase 4: Test
# Open frontend URL and test all features
```

---

**Ready to proceed with deployment!** 🎉

