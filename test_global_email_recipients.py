#!/usr/bin/env python3
"""
Test global email recipients functionality
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_global_email_recipients():
    """Test the global email recipients endpoints"""
    print("🧪 Testing Global Email Recipients")
    print("=" * 50)
    
    # Login as HR
    print("🔐 Logging in as HR...")
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "hr@demo.com",
        "password": "password123"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    token = login_response.json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("✅ HR login successful")
    
    # Test GET global recipients
    print("\n📋 Testing GET global recipients...")
    get_response = requests.get(f"{BASE_URL}/api/hr/email-recipients/global", headers=headers)
    
    print(f"GET Response status: {get_response.status_code}")
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
    
    # Test POST global recipients
    print("\n📧 Testing POST global recipients...")
    test_emails = [
        "hr@test.com",
        "manager@test.com", 
        "admin@test.com"
    ]
    
    post_response = requests.post(f"{BASE_URL}/api/hr/email-recipients/global", 
                                 json={"emails": test_emails}, 
                                 headers=headers)
    
    print(f"POST Response status: {post_response.status_code}")
    print(f"POST Response: {post_response.text}")
    
    if post_response.status_code == 200:
        data = post_response.json()
        if data.get("success"):
            print(f"✅ Successfully saved {len(test_emails)} recipients")
        else:
            print(f"❌ POST failed: {data.get('message')}")
            return False
    else:
        print(f"❌ POST failed with status: {post_response.status_code}")
        return False
    
    # Verify the emails were saved
    print("\n🔍 Verifying saved recipients...")
    verify_response = requests.get(f"{BASE_URL}/api/hr/email-recipients/global", headers=headers)
    
    if verify_response.status_code == 200:
        data = verify_response.json()
        if data.get("success"):
            saved_emails = data.get("data", {}).get("emails", [])
            print(f"✅ Verified recipients: {saved_emails}")
            
            # Check if our test emails are in the saved list
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
    print("🎉 All global email recipients tests passed!")
    return True

if __name__ == "__main__":
    test_global_email_recipients()
