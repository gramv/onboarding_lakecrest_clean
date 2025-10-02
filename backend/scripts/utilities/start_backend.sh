#!/bin/bash
cd hotel-onboarding-backend
export PYTHONPATH=$PWD:$PYTHONPATH
nohup python3 -m app.main_enhanced > backend.log 2>&1 &
echo "Backend started in background"
sleep 3
echo "Checking backend status..."
curl -s http://localhost:8000/healthz | head -1