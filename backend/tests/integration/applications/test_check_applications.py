#!/usr/bin/env python3
"""
Check the structure of existing applications
"""

import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"
MANAGER_EMAIL = "manager@demo.com"
MANAGER_PASSWORD = "password123"

async def check_applications():
    """Check application structure"""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # Login
        login_response = await client.post("/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        
        result = login_response.json()
        token = result["data"]["token"]
        
        # Get applications
        apps_response = await client.get(
            "/manager/applications",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        apps_result = apps_response.json()
        print("Raw response structure:")
        print(json.dumps(apps_result, indent=2))
        
        # If there's data, show first application details
        if "data" in apps_result and apps_result["data"]:
            print("\n" + "="*60)
            print("First application details:")
            print(json.dumps(apps_result["data"][0], indent=2))

if __name__ == "__main__":
    asyncio.run(check_applications())