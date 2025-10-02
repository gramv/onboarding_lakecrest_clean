#!/usr/bin/env python3
"""
Create a new job application for Goutam
"""

import asyncio
import httpx
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

async def main():
    async with httpx.AsyncClient() as client:
        print("Creating job application for Goutam Vemula...")
        
        # Submit application (no auth needed for public submission)
        application_data = {
            "first_name": "Goutam",
            "last_name": "Vemula",
            "email": "goutamramv@gmail.com",
            "phone": "555-0123",
            "address": "123 Main St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
            "position": "Software Engineer",
            "department": "IT",
            "start_date": "2025-02-01",
            "desired_pay": "30",
            "employment_type": "full_time",
            "how_did_you_hear": "Online",
            "employment_history": []
        }
        
        response = await client.post(
            f"{BASE_URL}/apply/test-prop-001",  # Property ID in the URL
            json=application_data
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Application created successfully!")
            print(f"   Application ID: {result['data']['application_id']}")
            print(f"   Name: Goutam Vemula")
            print(f"   Email: goutamramv@gmail.com")
            print(f"   Position: Software Engineer")
            print(f"   Status: pending")
        else:
            print(f"❌ Failed to create application: {response.text}")

if __name__ == "__main__":
    asyncio.run(main())