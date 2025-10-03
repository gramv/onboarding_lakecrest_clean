# 🚀 Deployment Guide - Hotel Employee Onboarding System

This guide covers deploying the backend to **Heroku** and the frontend to **Vercel** from separate repositories.

---

## 📋 Prerequisites

- ✅ Heroku CLI installed and configured
- ✅ Vercel CLI installed and configured  
- ✅ Two separate Git repositories (one for backend, one for frontend)
- ✅ Supabase project with database configured
- ✅ Gmail account for email notifications
- ✅ Google Cloud project with Document AI API enabled (for OCR)

---

## 🔧 Part 1: Backend Deployment to Heroku

### Step 1: Prepare Backend Repository

1. **Create a new Git repository for backend:**
```bash
cd /path/to/new/backend-repo
git init
```

2. **Copy backend files:**
```bash
# Copy all backend files EXCEPT:
# - venv/
# - __pycache__/
# - *.pyc
# - .env
# - backend.log
# - test files (test_*.py, *_test.py)
# - saved_documents/
# - document_storage/ (if contains test data)

cp -r /Users/gouthamvemula/onbfinaldev_clean/backend/* .
```

3. **Create `.gitignore`:**
```bash
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/

# Environment variables
.env
.env.local
.env.production

# Logs
*.log
backend.log
uvicorn.out

# Test files
test_*.py
*_test.py
test_*.pdf
test_output/
test_outputs/
saved_documents/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Database
*.db
*.sqlite

# Temporary files
*.tmp
*.bak
EOF
```

4. **Verify required files exist:**
```bash
ls -la Procfile runtime.txt requirements.txt app/main_enhanced.py
```

### Step 2: Create Heroku App

```bash
# Login to Heroku
heroku login

# Create new Heroku app
heroku create your-hotel-onboarding-api

# Add Python buildpack
heroku buildpacks:set heroku/python

# Verify buildpack
heroku buildpacks
```

### Step 3: Configure Environment Variables

```bash
# Supabase Configuration
heroku config:set SUPABASE_URL="https://your-project.supabase.co"
heroku config:set SUPABASE_KEY="your-supabase-service-role-key"

# JWT Secret (generate a strong random string)
heroku config:set JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# Email Configuration (Gmail)
heroku config:set SMTP_HOST="smtp.gmail.com"
heroku config:set SMTP_PORT="465"
heroku config:set SMTP_USERNAME="your-email@gmail.com"
heroku config:set SMTP_PASSWORD="your-gmail-app-password"
heroku config:set SMTP_FROM_EMAIL="your-email@gmail.com"
heroku config:set SMTP_FROM_NAME="Hotel Onboarding System"

# Frontend URL (will be updated after Vercel deployment)
heroku config:set FRONTEND_URL="https://your-app.vercel.app"

# Google Cloud Document AI (for OCR)
heroku config:set GOOGLE_CREDENTIALS_BASE64="your-base64-encoded-credentials"
heroku config:set GOOGLE_PROJECT_ID="your-google-project-id"
heroku config:set GOOGLE_PROCESSOR_ID="your-processor-id"

# Groq API (optional, for OCR fallback)
heroku config:set GROQ_API_KEY="your-groq-api-key"

# Environment
heroku config:set ENVIRONMENT="production"
heroku config:set PYTHON_ENV="production"

# Verify all config vars
heroku config
```

### Step 4: Deploy to Heroku

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial backend deployment"

# Add Heroku remote
heroku git:remote -a your-hotel-onboarding-api

# Deploy
git push heroku main

# Check logs
heroku logs --tail

# Open app
heroku open
```

### Step 5: Verify Backend Deployment

```bash
# Test health endpoint
curl https://your-hotel-onboarding-api.herokuapp.com/api/healthz

# Expected response:
# {"status":"healthy","database":"connected","timestamp":"..."}
```

---

## 🎨 Part 2: Frontend Deployment to Vercel

### Step 1: Prepare Frontend Repository

1. **Create a new Git repository for frontend:**
```bash
cd /path/to/new/frontend-repo
git init
```

2. **Copy frontend files:**
```bash
# Copy all frontend files EXCEPT:
# - node_modules/
# - dist/
# - .env
# - *.log

cp -r /Users/gouthamvemula/onbfinaldev_clean/frontend/hotel-onboarding-frontend/* .
```

3. **Create `.gitignore`:**
```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Production
dist/
build/

# Environment variables
.env
.env.local
.env.production
.env.development

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
frontend.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/

# Misc
.vercel
EOF
```

4. **Create `vercel.json` configuration:**
```bash
cat > vercel.json << 'EOF'
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
EOF
```

### Step 2: Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy (this will prompt for configuration)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? hotel-onboarding-frontend
# - Directory? ./
# - Override settings? No

# The deployment will start automatically
```

### Step 3: Configure Environment Variables in Vercel

**Option 1: Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add the following:

```
VITE_API_URL=https://your-hotel-onboarding-api.herokuapp.com/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Option 2: Via Vercel CLI**
```bash
vercel env add VITE_API_URL production
# Enter: https://your-hotel-onboarding-api.herokuapp.com/api

vercel env add VITE_SUPABASE_URL production
# Enter: https://your-project.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Enter: your-supabase-anon-key
```

### Step 4: Redeploy with Environment Variables

```bash
# Trigger a new deployment with env vars
vercel --prod
```

### Step 5: Update Backend FRONTEND_URL

```bash
# Update Heroku backend with the Vercel URL
heroku config:set FRONTEND_URL="https://your-app.vercel.app" -a your-hotel-onboarding-api

# Restart Heroku app
heroku restart -a your-hotel-onboarding-api
```

---

## ✅ Part 3: Post-Deployment Verification

### 1. Test Backend Health
```bash
curl https://your-hotel-onboarding-api.herokuapp.com/api/healthz
```

### 2. Test Frontend
```bash
# Open in browser
open https://your-app.vercel.app

# Should see the application landing page
```

### 3. Test Full Flow
1. Navigate to application page
2. Submit a test application
3. Check if email is received
4. Login as manager
5. Approve application
6. Complete onboarding as employee
7. Review as manager

---

## 🔄 Part 4: Continuous Deployment

### Backend (Heroku)
```bash
# Any push to main branch will auto-deploy
git add .
git commit -m "Update backend"
git push heroku main
```

### Frontend (Vercel)
```bash
# Any push to main branch will auto-deploy
git add .
git commit -m "Update frontend"
git push origin main
```

---

## 🐛 Troubleshooting

### Backend Issues

**1. App crashes on startup:**
```bash
heroku logs --tail -a your-hotel-onboarding-api
# Check for missing environment variables or import errors
```

**2. Database connection fails:**
```bash
# Verify Supabase credentials
heroku config:get SUPABASE_URL -a your-hotel-onboarding-api
heroku config:get SUPABASE_KEY -a your-hotel-onboarding-api
```

**3. Email not sending:**
```bash
# Check SMTP configuration
heroku config | grep SMTP
```

### Frontend Issues

**1. Build fails:**
```bash
# Check build logs in Vercel dashboard
# Common issues: missing dependencies, TypeScript errors
```

**2. API calls fail:**
```bash
# Verify VITE_API_URL is correct
vercel env ls
```

**3. Blank page:**
```bash
# Check browser console for errors
# Verify routing configuration in vercel.json
```

---

## 📊 Monitoring

### Heroku
```bash
# View logs
heroku logs --tail -a your-hotel-onboarding-api

# View metrics
heroku ps -a your-hotel-onboarding-api
```

### Vercel
- Dashboard: https://vercel.com/dashboard
- Analytics: Built-in analytics in Vercel dashboard
- Logs: Real-time logs in deployment details

---

## 🔐 Security Checklist

- [ ] All environment variables set correctly
- [ ] JWT_SECRET is strong and unique
- [ ] Supabase RLS policies enabled
- [ ] CORS configured properly
- [ ] HTTPS enforced on both frontend and backend
- [ ] Gmail app password used (not regular password)
- [ ] Google Cloud credentials secured
- [ ] No sensitive data in git repositories

---

## 📝 Notes

- **Heroku Free Tier:** App sleeps after 30 min of inactivity (first request may be slow)
- **Vercel Free Tier:** Unlimited bandwidth, 100GB/month
- **Database:** Hosted on Supabase (separate from Heroku/Vercel)
- **File Storage:** Supabase Storage for documents
- **Email:** Gmail SMTP (consider SendGrid for production)

---

## 🆘 Support

If you encounter issues:
1. Check logs (Heroku/Vercel dashboards)
2. Verify environment variables
3. Test API endpoints individually
4. Check Supabase database connectivity
5. Review CORS configuration

---

**Deployment Complete! 🎉**

