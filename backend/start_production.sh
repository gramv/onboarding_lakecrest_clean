#!/bin/bash

echo "================================================"
echo "⚠️  PRODUCTION ENVIRONMENT ACTIVE ⚠️"
echo "================================================"
echo ""
echo "This will:"
echo "  ✅ Connect to PRODUCTION Supabase database"
echo "  ✅ Send REAL emails via tech.nj@lakecrest.com"
echo "  ✅ Affect LIVE production data"
echo ""
echo "Current configuration:"
echo "  Database: AWS Supabase (Production)"
echo "  SMTP: tech.nj@lakecrest.com"
echo "  Environment: PRODUCTION"
echo ""
read -p "Are you sure you want to start with PRODUCTION settings? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled. Use 'source venv/bin/activate && python3 -m uvicorn app.main_enhanced:app --port 8000' with .env.local for local testing."
    exit 1
fi

echo ""
echo "Starting production server..."
source venv/bin/activate
python3 -m uvicorn app.main_enhanced:app --host 0.0.0.0 --port 8000 --reload