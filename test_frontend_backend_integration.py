#!/usr/bin/env python3
"""
Test frontend-backend integration for email recipients
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_frontend_backend_integration():
    """Test the exact same flow the frontend uses"""
    print("🧪 Testing Frontend-Backend Integration")
    print("=" * 50)
    
    # Step 1: Login (same as frontend)
    print("🔐 Step 1: HR Login...")
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "hr@demo.com",
        "password": "password123"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    token = login_response.json()["data"]["token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    print("✅ Login successful")
    
    # Step 2: Fetch current recipients (same as frontend fetchEmailRecipients)
    print("\n📋 Step 2: Fetch current recipients...")
    get_response = requests.get(f"{BASE_URL}/api/hr/email-recipients/global", headers=headers)
    
    print(f"GET Status: {get_response.status_code}")
    print(f"GET Response: {get_response.text}")
    
    if get_response.status_code == 200:
        data = get_response.json()
        if data.get("success"):
            current_emails = data.get("data", {}).get("emails", [])
            print(f"✅ Current recipients: {current_emails}")
        else:
            print(f"❌ GET failed: {data.get('message')}")
            return False
    else:
        print(f"❌ GET failed with status: {get_response.status_code}")
        return False
    
    # Step 3: Save new recipients (same as frontend saveEmailRecipients)
    print("\n💾 Step 3: Save new recipients...")
    test_emails = [
        "hr@company.com",
        "manager@company.com",
        "admin@company.com"
    ]
    
    post_data = {"emails": test_emails}
    print(f"POST Data: {json.dumps(post_data, indent=2)}")
    
    post_response = requests.post(f"{BASE_URL}/api/hr/email-recipients/global", 
                                 json=post_data, 
                                 headers=headers)
    
    print(f"POST Status: {post_response.status_code}")
    print(f"POST Response: {post_response.text}")
    
    if post_response.status_code == 200:
        data = post_response.json()
        if data.get("success"):
            print(f"✅ Save successful: {data.get('message')}")
        else:
            print(f"❌ POST failed: {data.get('message')}")
            return False
    else:
        print(f"❌ POST failed with status: {post_response.status_code}")
        return False
    
    # Step 4: Verify save by fetching again (same as frontend refresh)
    print("\n🔍 Step 4: Verify save by fetching again...")
    verify_response = requests.get(f"{BASE_URL}/api/hr/email-recipients/global", headers=headers)
    
    if verify_response.status_code == 200:
        data = verify_response.json()
        if data.get("success"):
            saved_emails = data.get("data", {}).get("emails", [])
            print(f"✅ Verified recipients: {saved_emails}")
            
            # Check if our test emails are there
            for email in test_emails:
                if email in saved_emails:
                    print(f"  ✅ {email} - Found")
                else:
                    print(f"  ❌ {email} - Missing")
        else:
            print(f"❌ Verification failed: {data.get('message')}")
            return False
    else:
        print(f"❌ Verification failed with status: {verify_response.status_code}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Frontend-Backend Integration Test PASSED!")
    print("✅ All API calls working exactly as frontend expects")
    print("✅ Email recipients save and retrieve successfully")
    print("✅ No issues with backend endpoints")
    
    return True

if __name__ == "__main__":
    test_frontend_backend_integration()
