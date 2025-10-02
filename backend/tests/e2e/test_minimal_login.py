#!/usr/bin/env python3
"""
Test minimal login flow to identify the issue
"""

import asyncio
import sys
from pathlib import Path
import json

# Add the backend app to path  
sys.path.insert(0, str(Path(__file__).parent / "hotel-onboarding-backend"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / "hotel-onboarding-backend" / ".env")

from fastapi import FastAPI
from fastapi.testclient import TestClient
import uvicorn

# Create a minimal app
app = FastAPI()

@app.post("/test-login")
async def test_login():
    """Test endpoint that mimics login response structure"""
    from datetime import datetime, timedelta, timezone
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    
    # Build response similar to login endpoint
    response_data = {
        "token": "test-token-123",
        "user": {
            "id": "cfef047c-278c-4c40-8781-650f26fac993",
            "email": "hr@demo.com",
            "role": "hr",
            "first_name": "System",
            "last_name": "Admin"
        },
        "expires_at": expire.isoformat(),
        "token_type": "Bearer"
    }
    
    # Try to serialize it
    try:
        json_str = json.dumps(response_data)
        print(f"JSON serialization successful: {len(json_str)} chars")
        return response_data
    except Exception as e:
        print(f"JSON serialization error: {e}")
        return {"error": str(e)}

def test_endpoint():
    """Test the endpoint"""
    client = TestClient(app)
    
    print("Testing minimal login endpoint...")
    response = client.post("/test-login")
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
if __name__ == "__main__":
    test_endpoint()