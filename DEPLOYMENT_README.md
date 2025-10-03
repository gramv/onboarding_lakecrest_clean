# 📚 Deployment Documentation

This directory contains all the files and documentation needed to deploy the Hotel Employee Onboarding System to production.

---

## 📁 Files Overview

### 📖 Documentation Files

| File | Purpose |
|------|---------|
| **DEPLOYMENT_SUMMARY.md** | Quick overview and deployment status |
| **DEPLOYMENT_GUIDE.md** | Complete step-by-step deployment instructions |
| **DEPLOYMENT_CHECKLIST.md** | Comprehensive checklist for deployment |
| **DEPLOYMENT_README.md** | This file - overview of deployment docs |

### 🔧 Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| **backend/.env.example** | Backend | Environment variables template for backend |
| **frontend/hotel-onboarding-frontend/.env.example** | Frontend | Environment variables template for frontend |
| **frontend/hotel-onboarding-frontend/vercel.json** | Frontend | Vercel deployment configuration |
| **backend/Procfile** | Backend | Heroku process configuration |
| **backend/runtime.txt** | Backend | Python version specification |

### 🚀 Deployment Scripts

| Script | Purpose |
|--------|---------|
| **deploy-backend-heroku.sh** | Automated backend deployment to Heroku |
| **deploy-frontend-vercel.sh** | Automated frontend deployment to Vercel |

---

## 🎯 Quick Start

### For First-Time Deployment

1. **Read the Summary**
   ```bash
   cat DEPLOYMENT_SUMMARY.md
   ```

2. **Follow the Guide**
   ```bash
   cat DEPLOYMENT_GUIDE.md
   ```

3. **Use the Checklist**
   ```bash
   cat DEPLOYMENT_CHECKLIST.md
   ```

### For Quick Deployment

If you already know what you're doing:

```bash
# Backend
cd /path/to/backend-repo
./deploy-backend-heroku.sh

# Frontend
cd /path/to/frontend-repo
./deploy-frontend-vercel.sh
```

---

## 📋 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Production Setup                      │
└─────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│   Backend    │────────▶│   Supabase   │
│   (Vercel)   │         │   (Heroku)   │         │  (Database)  │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                         │
       │                        │                         │
       ▼                        ▼                         ▼
  React + Vite          FastAPI + Python         PostgreSQL
  TypeScript            Uvicorn ASGI              + Storage
  Tailwind CSS          PDF Generation            + Auth
```

---

## 🔐 Required Credentials

Before deploying, gather these credentials:

### Supabase
- [ ] Project URL
- [ ] Service Role Key (backend)
- [ ] Anon Key (frontend)

### Email (Gmail)
- [ ] Email address
- [ ] App Password

### Google Cloud
- [ ] Project ID
- [ ] Processor ID
- [ ] Service account JSON

### Security
- [ ] JWT Secret (32+ characters)

---

## 📝 Deployment Workflow

```
1. Prepare Repositories
   ├── Create backend repo
   ├── Create frontend repo
   └── Copy files (exclude venv, node_modules, etc.)

2. Deploy Backend (Heroku)
   ├── Create Heroku app
   ├── Set environment variables
   ├── Push code
   └── Verify health check

3. Deploy Frontend (Vercel)
   ├── Deploy to Vercel
   ├── Set environment variables
   └── Verify frontend loads

4. Connect Services
   ├── Update FRONTEND_URL in backend
   └── Test end-to-end flow

5. Verify & Monitor
   ├── Test all features
   ├── Set up monitoring
   └── Configure alerts
```

---

## ✅ Pre-Deployment Checklist

### Backend Repository
- [ ] All backend files copied
- [ ] venv/ excluded
- [ ] __pycache__/ excluded
- [ ] .env excluded
- [ ] test files excluded
- [ ] .gitignore created
- [ ] Procfile exists
- [ ] runtime.txt exists
- [ ] requirements.txt complete

### Frontend Repository
- [ ] All frontend files copied
- [ ] node_modules/ excluded
- [ ] dist/ excluded
- [ ] .env excluded
- [ ] .gitignore created
- [ ] vercel.json created
- [ ] package.json correct
- [ ] Build tested locally

### Credentials
- [ ] Supabase credentials ready
- [ ] Gmail app password generated
- [ ] Google Cloud credentials ready
- [ ] JWT secret generated

---

## 🚀 Deployment Commands

### Backend to Heroku

**Automated:**
```bash
./deploy-backend-heroku.sh
```

**Manual:**
```bash
heroku create your-app-name
heroku buildpacks:set heroku/python
heroku config:set SUPABASE_URL="..."
heroku config:set SUPABASE_KEY="..."
# ... set all environment variables
git push heroku main
```

### Frontend to Vercel

**Automated:**
```bash
./deploy-frontend-vercel.sh
```

**Manual:**
```bash
vercel
# Follow prompts
vercel env add VITE_API_URL production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

---

## 🔍 Verification Steps

### 1. Backend Health Check
```bash
curl https://your-app.herokuapp.com/api/healthz
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-03T..."
}
```

### 2. Frontend Access
```bash
open https://your-app.vercel.app
```

Expected: Application loads without errors

### 3. End-to-End Test
1. Submit job application
2. Receive email
3. Manager approves
4. Employee completes onboarding
5. Manager reviews

---

## 🐛 Troubleshooting

### Backend Issues

**App won't start:**
```bash
heroku logs --tail -a your-app
# Check for missing environment variables
```

**Database connection fails:**
```bash
heroku config:get SUPABASE_URL -a your-app
heroku config:get SUPABASE_KEY -a your-app
```

### Frontend Issues

**Build fails:**
- Check Vercel deployment logs
- Verify all dependencies in package.json
- Test build locally: `npm run build`

**API calls fail:**
```bash
vercel env ls
# Verify VITE_API_URL is correct
```

---

## 📊 Monitoring

### Heroku
```bash
# Real-time logs
heroku logs --tail -a your-app

# App status
heroku ps -a your-app

# Open dashboard
heroku open -a your-app
```

### Vercel
- Dashboard: https://vercel.com/dashboard
- Click on project → Deployments
- View logs and analytics

---

## 🔄 Updates & Redeployment

### Backend Updates
```bash
git add .
git commit -m "Update backend"
git push heroku main
```

### Frontend Updates
```bash
git add .
git commit -m "Update frontend"
git push origin main  # Auto-deploys
```

---

## 📞 Support

### Documentation
- **Full Guide:** DEPLOYMENT_GUIDE.md
- **Checklist:** DEPLOYMENT_CHECKLIST.md
- **Summary:** DEPLOYMENT_SUMMARY.md

### External Resources
- Heroku: https://devcenter.heroku.com/
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs

---

## 🎉 Success Indicators

Your deployment is successful when:

✅ Backend health check passes  
✅ Frontend loads without errors  
✅ Applications can be submitted  
✅ Emails are sent  
✅ Manager workflow works  
✅ Employee onboarding completes  
✅ Documents upload successfully  
✅ PDFs generate correctly  

---

## 📝 Notes

- **Separate Repos:** Backend and frontend are in different repositories
- **Heroku:** Backend deployed to Heroku
- **Vercel:** Frontend deployed to Vercel
- **Database:** Hosted on Supabase (separate from Heroku/Vercel)
- **Storage:** Supabase Storage for documents
- **Email:** Gmail SMTP for notifications

---

**Ready to Deploy! 🚀**

Start with **DEPLOYMENT_SUMMARY.md** for a quick overview, then follow **DEPLOYMENT_GUIDE.md** for detailed instructions.

