#!/usr/bin/env python3
"""
Quick test script to send HR invitations and test property name display
"""

import asyncio
import os
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

# Test recipient details
TEST_RECIPIENT_EMAIL = "vgoutamram@gmail.com"
TEST_RECIPIENT_NAME = "Goutham Vemula"

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

async def send_step_invitation(token, property_id, property_name, step_id, step_name):
    """Send an invitation for a specific step"""
    headers = {"Authorization": f"Bearer {token}"}
    invitation_data = {
        "step_id": step_id,
        "recipient_email": TEST_RECIPIENT_EMAIL,
        "recipient_name": TEST_RECIPIENT_NAME,
        "property_id": property_id
    }
    
    print(f"\n📧 Sending {step_name} invitation...")
    print(f"📍 Property: {property_name} (ID: {property_id})")
    print(f"Data: {json.dumps(invitation_data, indent=2)}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{API_BASE_URL}/hr/send-step-invitation",
            headers=headers,
            json=invitation_data
        )
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Successfully sent {step_name} invitation!")
            if result.get('invitation_url'):
                print(f"📎 URL: {result.get('invitation_url')}")
            return result
        else:
            print(f"❌ Failed to send {step_name} invitation: {response.status_code}")
            print(f"Response: {response.text}")
            return None

async def main():
    """Main test function"""
    print("=" * 60)
    print("HR INVITATION PROPERTY NAME TEST")
    print("Testing property name display in PDF documents")
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
    
    print(f"✅ Found {len(properties)} properties")
    
    # Display all properties for selection
    print("\n📋 Available Properties:")
    for i, prop in enumerate(properties):
        print(f"   {i+1}. {prop['name']} (ID: {prop['id']})")
    
    # Use the first property for testing
    test_property = properties[0]
    print(f"\n📍 Using property for test: {test_property['name']}")
    
    # Test steps that generate PDFs with property names
    test_steps = [
        ("weapons-policy", "Weapons Policy"),
        ("trafficking-awareness", "Human Trafficking Awareness"),
        ("company-policies", "Company Policies"),
        ("direct-deposit", "Direct Deposit")
    ]
    
    print(f"\n3️⃣ Testing property name '{test_property['name']}' in HR invitation PDFs...")
    
    for step_id, step_name in test_steps:
        result = await send_step_invitation(
            token, 
            test_property['id'], 
            test_property['name'],
            step_id,
            step_name
        )
        
        if result:
            print(f"   ✅ {step_name} invitation sent successfully")
        else:
            print(f"   ❌ {step_name} invitation failed")
    
    print("\n✅ Test complete! Please check:")
    print(f"1. Open the invitation links in your email")
    print(f"2. Complete each form to generate PDFs")
    print(f"3. Verify that PDFs show '{test_property['name']}' instead of 'Hotel' or 'Test Hotel'")
    print(f"4. Check both preview and signed PDFs for correct property name")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())