# 📋 Deployment Checklist

Use this checklist to ensure a smooth deployment process.

---

## 🔧 Pre-Deployment Preparation

### Backend Repository Setup
- [ ] Create new Git repository for backend
- [ ] Copy backend files (exclude venv, __pycache__, .env, test files)
- [ ] Create `.gitignore` file
- [ ] Verify `Procfile` exists and is correct
- [ ] Verify `runtime.txt` exists (python-3.12.8)
- [ ] Verify `requirements.txt` is complete
- [ ] Create `.env.example` from template
- [ ] Test locally: `uvicorn app.main_enhanced:app --reload`

### Frontend Repository Setup
- [ ] Create new Git repository for frontend
- [ ] Copy frontend files (exclude node_modules, dist, .env)
- [ ] Create `.gitignore` file
- [ ] Create `vercel.json` configuration
- [ ] Create `.env.example` from template
- [ ] Test locally: `npm run dev`
- [ ] Test build: `npm run build`

---

## 🔐 Environment Variables Collection

### Supabase
- [ ] Get Supabase URL from Project Settings → API
- [ ] Get Supabase Service Role Key (for backend)
- [ ] Get Supabase Anon Key (for frontend)
- [ ] Verify database tables exist
- [ ] Verify RLS policies are enabled

### Email (Gmail)
- [ ] Gmail account email address
- [ ] Generate Gmail App Password: https://myaccount.google.com/apppasswords
- [ ] Test SMTP connection

### Google Cloud (OCR)
- [ ] Google Cloud project created
- [ ] Document AI API enabled
- [ ] Service account created with Document AI permissions
- [ ] Service account JSON key downloaded
- [ ] Convert JSON to base64: `cat key.json | base64`
- [ ] Get Project ID
- [ ] Get Processor ID

### JWT Secret
- [ ] Generate strong random string: `openssl rand -hex 32`

---

## 🚀 Backend Deployment (Heroku)

### Heroku Setup
- [ ] Heroku CLI installed: `heroku --version`
- [ ] Logged in to Heroku: `heroku login`
- [ ] Create Heroku app: `heroku create your-app-name`
- [ ] Add Python buildpack: `heroku buildpacks:set heroku/python`

### Environment Variables
- [ ] Set SUPABASE_URL
- [ ] Set SUPABASE_KEY
- [ ] Set JWT_SECRET
- [ ] Set SMTP_HOST
- [ ] Set SMTP_PORT
- [ ] Set SMTP_USERNAME
- [ ] Set SMTP_PASSWORD
- [ ] Set SMTP_FROM_EMAIL
- [ ] Set SMTP_FROM_NAME
- [ ] Set FRONTEND_URL (temporary, update later)
- [ ] Set GOOGLE_CREDENTIALS_BASE64
- [ ] Set GOOGLE_PROJECT_ID
- [ ] Set GOOGLE_PROCESSOR_ID
- [ ] Set GROQ_API_KEY (optional)
- [ ] Set ENVIRONMENT=production
- [ ] Verify all: `heroku config`

### Deploy
- [ ] Initialize git: `git init`
- [ ] Add files: `git add .`
- [ ] Commit: `git commit -m "Initial deployment"`
- [ ] Add Heroku remote: `heroku git:remote -a your-app-name`
- [ ] Push to Heroku: `git push heroku main`
- [ ] Check logs: `heroku logs --tail`

### Verify Backend
- [ ] Test health endpoint: `curl https://your-app.herokuapp.com/api/healthz`
- [ ] Response shows "healthy" status
- [ ] Database connection successful
- [ ] No errors in logs

---

## 🎨 Frontend Deployment (Vercel)

### Vercel Setup
- [ ] Vercel CLI installed: `vercel --version`
- [ ] Logged in to Vercel: `vercel login`

### Environment Variables
- [ ] Set VITE_API_URL (Heroku backend URL)
- [ ] Set VITE_SUPABASE_URL
- [ ] Set VITE_SUPABASE_ANON_KEY

### Deploy
- [ ] Run: `vercel`
- [ ] Follow prompts (project name, settings)
- [ ] Add environment variables via dashboard or CLI
- [ ] Deploy to production: `vercel --prod`
- [ ] Note the deployment URL

### Verify Frontend
- [ ] Open Vercel URL in browser
- [ ] Application loads without errors
- [ ] Check browser console for errors
- [ ] Test navigation between pages

---

## 🔄 Post-Deployment Configuration

### Update Backend with Frontend URL
- [ ] Update FRONTEND_URL: `heroku config:set FRONTEND_URL=https://your-app.vercel.app`
- [ ] Restart backend: `heroku restart`

### CORS Configuration
- [ ] Verify CORS allows Vercel domain
- [ ] Test API calls from frontend
- [ ] Check browser network tab for CORS errors

---

## ✅ End-to-End Testing

### Application Flow
- [ ] Navigate to application page
- [ ] Fill out job application form
- [ ] Submit application
- [ ] Verify email received

### Manager Flow
- [ ] Login as manager
- [ ] View applications dashboard
- [ ] Approve an application
- [ ] Verify approval email sent

### Employee Onboarding
- [ ] Access onboarding link from email
- [ ] Complete all onboarding steps
- [ ] Upload required documents
- [ ] Sign all forms
- [ ] Submit final review

### Manager Review
- [ ] Login as manager
- [ ] View pending reviews
- [ ] Review employee documents
- [ ] Complete I-9 Section 2
- [ ] Approve onboarding

---

## 🐛 Troubleshooting

### Backend Issues
- [ ] Check Heroku logs: `heroku logs --tail`
- [ ] Verify environment variables: `heroku config`
- [ ] Test database connection
- [ ] Check email SMTP settings
- [ ] Verify Google Cloud credentials

### Frontend Issues
- [ ] Check Vercel deployment logs
- [ ] Verify environment variables in Vercel dashboard
- [ ] Check browser console for errors
- [ ] Test API endpoint connectivity
- [ ] Verify CORS configuration

### Database Issues
- [ ] Check Supabase dashboard for errors
- [ ] Verify RLS policies
- [ ] Check table permissions
- [ ] Test database queries

---

## 📊 Monitoring Setup

### Heroku
- [ ] Enable logging add-on (optional)
- [ ] Set up uptime monitoring
- [ ] Configure alerts for errors

### Vercel
- [ ] Enable analytics
- [ ] Set up error tracking
- [ ] Configure deployment notifications

### Supabase
- [ ] Monitor database usage
- [ ] Check storage usage
- [ ] Review API usage

---

## 🔐 Security Final Checks

- [ ] All environment variables secured
- [ ] No secrets in git repositories
- [ ] HTTPS enforced on both domains
- [ ] Supabase RLS policies active
- [ ] CORS properly configured
- [ ] JWT secret is strong and unique
- [ ] Gmail app password used (not regular password)
- [ ] Google Cloud credentials secured
- [ ] Database backups enabled
- [ ] Error messages don't expose sensitive data

---

## 📝 Documentation

- [ ] Update README with deployment URLs
- [ ] Document environment variables
- [ ] Create runbook for common issues
- [ ] Document backup/restore procedures
- [ ] Create user guide for managers
- [ ] Create user guide for employees

---

## 🎉 Launch

- [ ] All tests passing
- [ ] No critical errors in logs
- [ ] Performance acceptable
- [ ] Email notifications working
- [ ] Document uploads working
- [ ] PDF generation working
- [ ] All user flows tested
- [ ] Stakeholders notified
- [ ] Support team briefed

---

**Deployment Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

**Deployed By:** _______________

**Date:** _______________

**Backend URL:** _______________

**Frontend URL:** _______________

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

