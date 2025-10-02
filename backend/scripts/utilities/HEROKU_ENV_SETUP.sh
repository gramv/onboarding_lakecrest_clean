#!/bin/bash
# Heroku Environment Variable Setup Script for Google Document AI
# Run this script to configure Google Document AI on Heroku

echo "Setting up Google Document AI environment variables on Heroku..."

# Step 1: Create base64 encoded credentials
echo "Step 1: Encoding Google service account credentials..."
base64 -i gen-lang-client-0576186929-a311cca64d6a.json | tr -d '\n' > google-creds-base64.txt
echo "✅ Credentials encoded to google-creds-base64.txt"

# Step 2: Set Google Document AI variables
echo ""
echo "Step 2: Setting Google Document AI configuration..."
heroku config:set GOOGLE_PROJECT_ID="933544811759"
heroku config:set GOOGLE_PROCESSOR_ID="50c628033c5d5dde"  
heroku config:set GOOGLE_PROCESSOR_LOCATION="us"

# Step 3: Set the base64 credentials
echo ""
echo "Step 3: Setting Google credentials..."
heroku config:set GOOGLE_CREDENTIALS_BASE64="$(cat google-creds-base64.txt)"

# Step 4: Verify configuration
echo ""
echo "Step 4: Verifying configuration..."
heroku config:get GOOGLE_PROJECT_ID
heroku config:get GOOGLE_PROCESSOR_ID
heroku config:get GOOGLE_PROCESSOR_LOCATION
echo ""
echo "✅ Google Document AI environment variables configured!"

# Step 5: Restart the app
echo ""
echo "Step 5: Restarting Heroku app..."
heroku restart

# Step 6: Check logs
echo ""
echo "Step 6: Checking logs for Google Document AI initialization..."
echo "Running: heroku logs --tail | grep 'Google Document AI'"
echo ""
echo "You should see:"
echo "  ✅ Using Google Document AI for OCR processing"
echo "  Using base64-encoded credentials (production mode)"
echo ""
echo "Setup complete! Your app should now be using Google Document AI."