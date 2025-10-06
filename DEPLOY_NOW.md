# 🚀 Quick Deployment Guide

## ⚡ **TL;DR - Deploy in 4 Steps**

```bash
# 1. Push to GitHub (2 min)
git push origin main

# 2. Deploy Backend to Heroku (10 min)
heroku create hotel-onboarding-backend
# Set env vars (see below)
git subtree push --prefix backend heroku main

# 3. Deploy Frontend to Vercel (5 min)
cd frontend/hotel-onboarding-frontend
vercel --prod

# 4. Test (5 min)
# Open frontend URL and test login
```

**Total Time: ~22 minutes**

---

## 📋 **Step-by-Step Commands**

### **Step 1: Push to GitHub**

```bash
# Check status
git status

# Push all commits
git push origin main
```

**Expected:** `85 commits pushed`

---

### **Step 2: Deploy Backend to Heroku**

#### **2.1: Create Heroku App**

```bash
# Create new app
heroku create hotel-onboarding-backend

# Verify
heroku apps:info
```

#### **2.2: Set Environment Variables**

**⚠️ IMPORTANT:** Replace with your actual values!

```bash
# Supabase
heroku config:set SUPABASE_URL="https://kzommszdhapvqpekpvnt.supabase.co"
heroku config:set SUPABASE_KEY="your_service_key_here"

# JWT
heroku config:set JWT_SECRET="your_jwt_secret_here"

# Email
heroku config:set SMTP_HOST="smtp.gmail.com"
heroku config:set SMTP_PORT="465"
heroku config:set SMTP_USER="your_email@gmail.com"
heroku config:set SMTP_PASSWORD="your_app_password"
heroku config:set FROM_EMAIL="your_email@gmail.com"

# Groq
heroku config:set GROQ_API_KEY="your_groq_key"

# Google
heroku config:set GOOGLE_CREDENTIALS_BASE64="your_base64_creds"

# Frontend URL (update after Vercel deploy)
heroku config:set FRONTEND_URL="https://hotel-onboarding-frontend.vercel.app"

# Environment
heroku config:set ENVIRONMENT="production"
```

**Get values from:**
```bash
cat backend/.env
```

#### **2.3: Deploy**

```bash
# Deploy backend folder
git subtree push --prefix backend heroku main
```

**If this fails, try:**
```bash
git subtree split --prefix backend -b backend-deploy
git push heroku backend-deploy:main
git branch -D backend-deploy
```

#### **2.4: Verify**

```bash
# Check logs
heroku logs --tail

# Test health endpoint
curl https://hotel-onboarding-backend.herokuapp.com/api/healthz
```

**Expected:** `{"status": "healthy"}`

---

### **Step 3: Deploy Frontend to Vercel**

#### **3.1: Set Environment Variables**

```bash
cd frontend/hotel-onboarding-frontend

# Add backend URL
vercel env add VITE_API_URL production
# Enter: https://hotel-onboarding-backend.herokuapp.com

# Add Supabase URL
vercel env add VITE_SUPABASE_URL production
# Enter: https://kzommszdhapvqpekpvnt.supabase.co

# Add Supabase Anon Key
vercel env add VITE_SUPABASE_ANON_KEY production
# Enter: your_anon_key
```

**Get values from:**
```bash
cat frontend/hotel-onboarding-frontend/.env
```

#### **3.2: Deploy**

```bash
# Deploy to production
vercel --prod
```

**Follow prompts:**
- Link to existing project? **Yes**
- Which project? **hotel-onboarding-frontend**

#### **3.3: Verify**

```bash
# Get URL
vercel ls

# Open in browser
vercel open
```

---

### **Step 4: Test Deployment**

#### **4.1: Test Backend**

```bash
# Health check
curl https://hotel-onboarding-backend.herokuapp.com/api/healthz

# Check logs
heroku logs --tail
```

#### **4.2: Test Frontend**

1. Open: `https://hotel-onboarding-frontend.vercel.app`
2. Try logging in
3. Check browser console for errors
4. Test onboarding flow

#### **4.3: Test Integration**

1. **Login:** Use test credentials
2. **Onboarding:** Start new session
3. **Single-Step:** Send direct deposit invite
4. **Email:** Check notifications sent
5. **PDF:** Verify generation works

---

## 🔧 **Quick Fixes**

### **Backend Not Starting?**

```bash
# Check logs
heroku logs --tail

# Check config
heroku config

# Restart
heroku restart
```

### **Frontend Build Fails?**

```bash
# Build locally first
cd frontend/hotel-onboarding-frontend
npm run build

# Check for errors
npm run type-check
```

### **API Calls Failing?**

```bash
# Check CORS
heroku config:get FRONTEND_URL

# Should match Vercel URL
vercel ls
```

---

## ✅ **Success Checklist**

- [ ] GitHub: All commits pushed
- [ ] Heroku: App created and deployed
- [ ] Heroku: All env vars set
- [ ] Heroku: Health endpoint returns 200
- [ ] Vercel: App deployed
- [ ] Vercel: All env vars set
- [ ] Vercel: App loads in browser
- [ ] Integration: Login works
- [ ] Integration: Onboarding works
- [ ] Integration: Emails sent

---

## 🆘 **Need Help?**

### **Check Detailed Plan:**
```bash
cat DEPLOYMENT_PLAN_HEROKU_VERCEL.md
```

### **Check Logs:**
```bash
# Backend
heroku logs --tail

# Frontend
vercel logs
```

### **Rollback:**
```bash
# Backend
heroku rollback

# Frontend
vercel rollback
```

---

## 📊 **Deployment URLs**

After deployment, you'll have:

- **Backend:** `https://hotel-onboarding-backend.herokuapp.com`
- **Frontend:** `https://hotel-onboarding-frontend.vercel.app`
- **API Docs:** `https://hotel-onboarding-backend.herokuapp.com/docs`

---

## 🎯 **Ready to Deploy?**

### **Pre-flight Check:**

```bash
# 1. Check git status
git status

# 2. Check local servers are stopped
lsof -ti:8000 && echo "Backend running - stop it first"
lsof -ti:3000 && echo "Frontend running - stop it first"

# 3. Check you have env vars ready
cat backend/.env
cat frontend/hotel-onboarding-frontend/.env
```

### **Execute:**

```bash
# 1. Push to GitHub
git push origin main

# 2. Deploy backend
heroku create hotel-onboarding-backend
# Set all env vars (see above)
git subtree push --prefix backend heroku main

# 3. Deploy frontend
cd frontend/hotel-onboarding-frontend
# Set all env vars (see above)
vercel --prod

# 4. Test
curl https://hotel-onboarding-backend.herokuapp.com/api/healthz
open https://hotel-onboarding-frontend.vercel.app
```

---

**Let's deploy! 🚀**

