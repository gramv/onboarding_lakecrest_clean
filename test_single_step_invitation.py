#!/usr/bin/env python3
"""
Test single-step invitation functionality after schema fixes
"""

import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:8000"

def test_hr_login():
    """Test HR login to get a valid token"""
    print("🔐 Testing HR login...")
    
    # Try known HR credentials from database
    hr_credentials = [
        {"email": "hr@demo.com", "password": "password123"}
    ]
    
    for creds in hr_credentials:
        try:
            response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("data", {}).get("user", {}).get("role") == "hr":
                    token = data["data"]["token"]
                    print(f"✅ HR login successful with {creds['email']}")
                    return token
                else:
                    print(f"❌ Login successful but not HR role: {creds['email']}")
            else:
                print(f"❌ Login failed for {creds['email']}: {response.status_code}")
        except Exception as e:
            print(f"❌ Login error for {creds['email']}: {e}")
    
    print("❌ No valid HR credentials found")
    return None

def test_send_invitation(token):
    """Test sending a single-step invitation"""
    print("\n📧 Testing single-step invitation...")
    
    invitation_data = {
        "step_id": "personal-info",
        "recipient_email": "test@example.com",
        "recipient_name": "Test Employee",
        "property_id": "5cf12190-242a-4ac2-91dc-b43035b7aa2e"  # mci property
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/hr/send-step-invitation", 
                               json=invitation_data, headers=headers)
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ Single-step invitation sent successfully!")
                return True
            else:
                print(f"❌ Invitation failed: {data.get('message')}")
                return False
        else:
            print(f"❌ HTTP error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Request error: {e}")
        return False

def test_get_invitations(token):
    """Test getting list of invitations"""
    print("\n📋 Testing invitation list...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/api/hr/step-invitations", headers=headers)
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                invitations = data.get("data", [])
                print(f"✅ Retrieved {len(invitations)} invitations")
                return True
            else:
                print(f"❌ Failed to get invitations: {data.get('message')}")
                return False
        else:
            print(f"❌ HTTP error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request error: {e}")
        return False

def main():
    print("🧪 Single-Step Invitation Test Suite")
    print("=" * 50)
    
    # Test HR login
    token = test_hr_login()
    if not token:
        print("\n❌ Cannot proceed without HR token")
        return
    
    # Test sending invitation
    send_success = test_send_invitation(token)
    
    # Test getting invitations
    get_success = test_get_invitations(token)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"  HR Login: ✅")
    print(f"  Send Invitation: {'✅' if send_success else '❌'}")
    print(f"  Get Invitations: {'✅' if get_success else '❌'}")
    
    if send_success and get_success:
        print("\n🎉 All tests passed! Single-step invitations are working!")
    else:
        print("\n⚠️ Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    main()
