#!/bin/bash

# =====================================================
# Frontend Deployment Script for Vercel
# =====================================================
# This script helps deploy the frontend to Vercel
# Make sure you have Vercel CLI installed and configured

set -e  # Exit on error

echo "🚀 Hotel Onboarding System - Frontend Deployment to Vercel"
echo "==========================================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Error: Vercel CLI is not installed"
    echo "Install it with: npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Vercel"
    echo "Run: vercel login"
    exit 1
fi

echo "✅ Logged in to Vercel as: $(vercel whoami)"
echo ""

# Check for required files
echo "📂 Checking required files..."

REQUIRED_FILES=("package.json" "vite.config.ts" "index.html" "src/main.tsx")
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
    echo "Make sure you're in the frontend directory"
    exit 1
fi

# Check if vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo ""
    echo "⚠️  vercel.json not found, creating it..."
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
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
EOF
    echo "✅ vercel.json created"
fi

echo ""
echo "🔐 Environment Variables Setup"
echo ""
echo "You'll need the following environment variables:"
echo "  1. VITE_API_URL - Your Heroku backend URL"
echo "  2. VITE_SUPABASE_URL - Your Supabase project URL"
echo "  3. VITE_SUPABASE_ANON_KEY - Your Supabase anon key"
echo ""

read -p "Do you want to set environment variables now? (y/n): " SET_ENV

if [ "$SET_ENV" = "y" ] || [ "$SET_ENV" = "Y" ]; then
    echo ""
    read -p "VITE_API_URL (e.g., https://your-app.herokuapp.com/api): " VITE_API_URL
    read -p "VITE_SUPABASE_URL: " VITE_SUPABASE_URL
    read -p "VITE_SUPABASE_ANON_KEY: " VITE_SUPABASE_ANON_KEY
    
    echo ""
    echo "📝 Environment variables will be set after deployment"
fi

echo ""
echo "🧪 Testing build locally..."
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Test build
echo "Running build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed - fix errors before deploying"
    exit 1
fi

echo ""
read -p "Ready to deploy to Vercel? (y/n): " DEPLOY

if [ "$DEPLOY" != "y" ] && [ "$DEPLOY" != "Y" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "🚀 Deploying to Vercel..."
echo ""

# Deploy to Vercel
vercel --prod

echo ""
echo "✅ Deployment initiated!"
echo ""

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --prod 2>/dev/null | grep -o 'https://[^ ]*' | head -1)

if [ -n "$DEPLOYMENT_URL" ]; then
    echo "📍 Deployment URL: $DEPLOYMENT_URL"
else
    echo "⚠️  Could not automatically detect deployment URL"
    echo "Check Vercel dashboard: https://vercel.com/dashboard"
fi

# Set environment variables if requested
if [ "$SET_ENV" = "y" ] || [ "$SET_ENV" = "Y" ]; then
    echo ""
    echo "🔐 Setting environment variables..."
    
    # Get project name from vercel.json or package.json
    PROJECT_NAME=$(vercel ls 2>/dev/null | head -1 | awk '{print $1}')
    
    if [ -n "$PROJECT_NAME" ]; then
        echo "Setting variables for project: $PROJECT_NAME"
        
        echo "$VITE_API_URL" | vercel env add VITE_API_URL production
        echo "$VITE_SUPABASE_URL" | vercel env add VITE_SUPABASE_URL production
        echo "$VITE_SUPABASE_ANON_KEY" | vercel env add VITE_SUPABASE_ANON_KEY production
        
        echo ""
        echo "✅ Environment variables set"
        echo "⚠️  Redeploying to apply environment variables..."
        vercel --prod
    else
        echo "⚠️  Could not detect project name"
        echo "Set environment variables manually in Vercel dashboard"
    fi
fi

echo ""
echo "=========================================================="
echo "🎉 Deployment Complete!"
echo "=========================================================="
echo ""
echo "Frontend URL: $DEPLOYMENT_URL"
echo ""
echo "Next steps:"
echo "  1. Test the frontend in your browser"
echo "  2. Update FRONTEND_URL in Heroku backend config"
echo "  3. Test the complete application flow"
echo ""
echo "Useful commands:"
echo "  View deployments: vercel ls"
echo "  View logs:        vercel logs"
echo "  View env vars:    vercel env ls"
echo ""
echo "Vercel Dashboard: https://vercel.com/dashboard"
echo ""

