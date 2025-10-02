#!/usr/bin/env python3
"""
Test script for HR step invitations with Weapons Policy
Tests the complete workflow including personal info collection modal
"""

import asyncio
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
import httpx
import json

# Load environment variables
load_dotenv()

# API Configuration
API_BASE_URL = "http://localhost:8000/api"
HR_EMAIL = "hr@demo.com"
HR_PASSWORD = "Test1234!"

async def get_hr_token():
    """Authenticate as HR user and get JWT token"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": HR_EMAIL, "password": HR_PASSWORD}
        )
        print(f"Login response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            # The token is nested in data.data.token
            token = data.get("data", {}).get("token")
            if not token:
                # Fallback to other possible locations
                token = data.get("access_token") or data.get("token")
            if not token:
                print(f"Could not find token in response: {data}")
            return token
        else:
            print(f"❌ Failed to login as HR: {response.status_code}")
            print(f"Response: {response.text}")
            return None

async def send_weapons_policy_invitation(token, property_id):
    """Send a test weapons policy invitation"""
    headers = {"Authorization": f"Bearer {token}"}
    invitation_data = {
        "step_id": "weapons-policy",
        "recipient_email": "vgoutamram@gmail.com",
        "recipient_name": "Goutham Vemula",
        "property_id": property_id
    }
    
    print(f"\n📧 Sending weapons policy invitation with data: {json.dumps(invitation_data, indent=2)}")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_BASE_URL}/hr/send-step-invitation",
            headers=headers,
            json=invitation_data
        )
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Successfully sent invitation!")
            if result.get('invitation_url'):
                print(f"📎 Invitation URL: {result.get('invitation_url')}")
            return result
        else:
            print(f"❌ Failed to send invitation: {response.status_code}")
            print(f"Response: {response.text}")
            return None

async def get_hr_properties(token):
    """Get properties accessible to HR user"""
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_BASE_URL}/hr/properties",
            headers=headers
        )
        if response.status_code == 200:
            return response.json().get("data", [])
        else:
            print(f"❌ Failed to get properties: {response.status_code}")
            print(f"Response: {response.text}")
            return []

async def main():
    """Main test function"""
    print("=" * 60)
    print("WEAPONS POLICY INVITATION TEST")
    print("Testing personal info collection modal in single-step mode")
    print("=" * 60)
    
    # Step 1: Authenticate as HR
    print("\n1️⃣ Authenticating as HR user...")
    token = await get_hr_token()
    if not token:
        print("❌ Authentication failed. Exiting.")
        return
    print("✅ Successfully authenticated as HR")
    
    # Step 2: Get available properties
    print("\n2️⃣ Getting HR properties...")
    properties = await get_hr_properties(token)
    if not properties:
        print("❌ No properties found. Please ensure test data exists.")
        return
    
    print(f"✅ Found {len(properties)} properties:")
    for prop in properties[:3]:  # Show first 3
        print(f"   - {prop['name']} (ID: {prop['id']})")
    
    # Use the first property for testing
    test_property = properties[0]
    print(f"\n📍 Using property: {test_property['name']}")
    
    # Step 3: Send weapons policy invitation
    print("\n3️⃣ Sending weapons policy invitation...")
    invitation_result = await send_weapons_policy_invitation(token, test_property['id'])
    
    if invitation_result:
        print("\n✅ Invitation sent successfully!")
        print("\n📝 Next Steps:")
        print("1. Check email for invitation link")
        print("2. Click the link to open the weapons policy form")
        print("3. The PersonalInfoModal should appear asking for your name")
        print("4. After entering name, the weapons policy form should load")
        print("5. Complete the form and generate the PDF with your name")
    else:
        print("\n❌ Failed to send invitation")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())