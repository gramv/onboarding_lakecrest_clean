#!/usr/bin/env python3
"""
Simple login test to see what the backend returns
"""

import httpx
import asyncio
import json

async def test_login():
    """Test manager login"""
    async with httpx.AsyncClient() as client:
        print("Testing manager login...")
        
        response = await client.post(
            "http://localhost:8000/auth/login",
            json={
                "email": "manager@demo.com",
                "password": "demo123"
            }
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        try:
            data = response.json()
            print(f"Response JSON: {json.dumps(data, indent=2)}")
            
            # Check if it's an error response
            if data.get("success") == False:
                print(f"\n❌ Login failed: {data.get('error')}")
            elif "access_token" in data:
                print(f"\n✅ Login successful!")
                print(f"   Token: {data['access_token'][:20]}...")
                print(f"   User: {data.get('user')}")
            else:
                print(f"\n⚠️  Unexpected response format")
                
        except Exception as e:
            print(f"Error parsing response: {e}")
            print(f"Raw response: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_login())