#!/bin/bash

# =====================================================
# Backend Deployment Script for Heroku
# =====================================================
# This script helps deploy the backend to Heroku
# Make sure you have Heroku CLI installed and configured

set -e  # Exit on error

echo "🚀 Hotel Onboarding System - Backend Deployment to Heroku"
echo "=========================================================="
echo ""

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Error: Heroku CLI is not installed"
    echo "Install it from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

echo "✅ Heroku CLI found"
echo ""

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Heroku"
    echo "Run: heroku login"
    exit 1
fi

echo "✅ Logged in to Heroku as: $(heroku auth:whoami)"
echo ""

# Prompt for app name
read -p "Enter Heroku app name (e.g., hotel-onboarding-api): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "❌ Error: App name cannot be empty"
    exit 1
fi

echo ""
echo "📦 Creating Heroku app: $APP_NAME"
echo ""

# Create Heroku app (or use existing)
if heroku apps:info -a "$APP_NAME" &> /dev/null; then
    echo "ℹ️  App '$APP_NAME' already exists, using existing app"
else
    heroku create "$APP_NAME"
    echo "✅ App created successfully"
fi

echo ""
echo "🔧 Setting up buildpack..."
heroku buildpacks:set heroku/python -a "$APP_NAME"
echo "✅ Python buildpack configured"

echo ""
echo "🔐 Now you need to configure environment variables"
echo "You can do this in two ways:"
echo "  1. Manually via Heroku dashboard: https://dashboard.heroku.com/apps/$APP_NAME/settings"
echo "  2. Using heroku config:set commands (see DEPLOYMENT_GUIDE.md)"
echo ""

read -p "Do you want to set environment variables now? (y/n): " SET_ENV

if [ "$SET_ENV" = "y" ] || [ "$SET_ENV" = "Y" ]; then
    echo ""
    echo "📝 Setting environment variables..."
    echo ""
    
    read -p "SUPABASE_URL: " SUPABASE_URL
    heroku config:set SUPABASE_URL="$SUPABASE_URL" -a "$APP_NAME"
    
    read -p "SUPABASE_KEY: " SUPABASE_KEY
    heroku config:set SUPABASE_KEY="$SUPABASE_KEY" -a "$APP_NAME"
    
    read -p "JWT_SECRET (min 32 chars): " JWT_SECRET
    heroku config:set JWT_SECRET="$JWT_SECRET" -a "$APP_NAME"
    
    read -p "SMTP_USERNAME (Gmail): " SMTP_USERNAME
    heroku config:set SMTP_USERNAME="$SMTP_USERNAME" -a "$APP_NAME"
    
    read -p "SMTP_PASSWORD (Gmail App Password): " SMTP_PASSWORD
    heroku config:set SMTP_PASSWORD="$SMTP_PASSWORD" -a "$APP_NAME"
    
    read -p "SMTP_FROM_EMAIL: " SMTP_FROM_EMAIL
    heroku config:set SMTP_FROM_EMAIL="$SMTP_FROM_EMAIL" -a "$APP_NAME"
    
    read -p "FRONTEND_URL (e.g., https://your-app.vercel.app): " FRONTEND_URL
    heroku config:set FRONTEND_URL="$FRONTEND_URL" -a "$APP_NAME"
    
    # Set default SMTP settings
    heroku config:set SMTP_HOST="smtp.gmail.com" -a "$APP_NAME"
    heroku config:set SMTP_PORT="465" -a "$APP_NAME"
    heroku config:set SMTP_FROM_NAME="Hotel Onboarding System" -a "$APP_NAME"
    heroku config:set ENVIRONMENT="production" -a "$APP_NAME"
    heroku config:set PYTHON_ENV="production" -a "$APP_NAME"
    
    echo ""
    echo "✅ Basic environment variables set"
    echo "⚠️  Note: You still need to set Google Cloud credentials manually"
    echo "   Run: heroku config:set GOOGLE_CREDENTIALS_BASE64='...' -a $APP_NAME"
fi

echo ""
echo "📂 Checking required files..."

# Check for required files
REQUIRED_FILES=("Procfile" "runtime.txt" "requirements.txt" "app/main_enhanced.py")
ALL_PRESENT=true

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
        ALL_PRESENT=false
    fi
done

if [ "$ALL_PRESENT" = false ]; then
    echo ""
    echo "❌ Error: Some required files are missing"
    echo "Make sure you're in the backend directory"
    exit 1
fi

echo ""
read -p "Ready to deploy? (y/n): " DEPLOY

if [ "$DEPLOY" != "y" ] && [ "$DEPLOY" != "Y" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "🚀 Deploying to Heroku..."
echo ""

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for Heroku deployment"
fi

# Add Heroku remote
if git remote | grep -q "^heroku$"; then
    echo "Heroku remote already exists"
else
    heroku git:remote -a "$APP_NAME"
fi

# Deploy
echo "Pushing to Heroku..."
git push heroku main || git push heroku master

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Checking app status..."
heroku ps -a "$APP_NAME"

echo ""
echo "🔍 Testing health endpoint..."
sleep 5  # Wait for app to start
HEALTH_URL="https://$APP_NAME.herokuapp.com/api/healthz"
echo "Testing: $HEALTH_URL"

if curl -f -s "$HEALTH_URL" > /dev/null; then
    echo "✅ Health check passed!"
    echo ""
    echo "Response:"
    curl -s "$HEALTH_URL" | python3 -m json.tool || curl -s "$HEALTH_URL"
else
    echo "⚠️  Health check failed - check logs"
    echo "Run: heroku logs --tail -a $APP_NAME"
fi

echo ""
echo "=========================================================="
echo "🎉 Deployment Complete!"
echo "=========================================================="
echo ""
echo "App URL: https://$APP_NAME.herokuapp.com"
echo "API URL: https://$APP_NAME.herokuapp.com/api"
echo ""
echo "Useful commands:"
echo "  View logs:    heroku logs --tail -a $APP_NAME"
echo "  Restart app:  heroku restart -a $APP_NAME"
echo "  Open app:     heroku open -a $APP_NAME"
echo "  View config:  heroku config -a $APP_NAME"
echo ""
echo "Next steps:"
echo "  1. Deploy frontend to Vercel"
echo "  2. Update FRONTEND_URL in Heroku config"
echo "  3. Test the complete application flow"
echo ""

