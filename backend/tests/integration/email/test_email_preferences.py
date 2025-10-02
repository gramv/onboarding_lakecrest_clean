#!/usr/bin/env python3
"""
Test Email Preferences API
"""

import requests
import json
import sys
from typing import Dict, Any

BASE_URL = "http://localhost:8000"
EMAIL = "gvemula@mail.yu.edu"
PASSWORD = "Gouthi321@"

def get_auth_token() -> str:
    """Login and get JWT token"""
    print("\n🔐 Logging in as manager...")
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": EMAIL, "password": PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        print(f"Debug - Full login response: {data}")
        
        # Check different possible token locations
        token = data.get('token') or data.get('access_token') or data.get('data', {}).get('token')
        
        if token:
            print(f"✅ Successfully logged in as {EMAIL}")
            print(f"Token: {token[:20]}...")  # Show first 20 chars
            return token
        else:
            print(f"❌ Login successful but no token found in response")
            print(f"Response structure: {data}")
            sys.exit(1)
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(f"Response: {response.text}")
        sys.exit(1)

def get_preferences(token: str) -> Dict[str, Any]:
    """Get current notification preferences"""
    print("\n📋 Fetching current preferences...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/api/manager/notification-preferences",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        prefs = data.get('data', {})
        print(f"Current preferences:")
        print(f"  - Applications: {prefs.get('applications', 'N/A')}")
        print(f"  - Approvals: {prefs.get('approvals', 'N/A')}")
        print(f"  - Reminders: {prefs.get('reminders', 'N/A')}")
        return prefs
    else:
        print(f"❌ Failed to get preferences: {response.status_code}")
        print(f"Response: {response.text}")
        return {}

def update_preferences(token: str, preferences: Dict[str, bool]) -> bool:
    """Update notification preferences"""
    print(f"\n🔄 Updating preferences to: {preferences}")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.put(
        f"{BASE_URL}/api/manager/notification-preferences",
        headers=headers,
        json=preferences
    )
    
    if response.status_code == 200:
        print(f"✅ Successfully updated preferences")
        return True
    else:
        print(f"❌ Failed to update preferences: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def verify_in_database(token: str) -> bool:
    """Verify preferences are stored correctly in database"""
    print("\n🔍 Verifying database storage...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Make a direct query through the auth/me endpoint to see user data
    response = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        user = data.get('user', {})
        print(f"User email_preferences field: {user.get('email_preferences', 'N/A')}")
        print(f"User receive_application_emails field: {user.get('receive_application_emails', 'N/A')}")
        
        # Check if it's stored as JSONB or string
        email_prefs = user.get('email_preferences')
        if isinstance(email_prefs, str):
            print("⚠️  WARNING: email_preferences is stored as STRING instead of JSONB")
            try:
                parsed = json.loads(email_prefs)
                print(f"   Parsed value: {parsed}")
            except:
                print(f"   Cannot parse: {email_prefs}")
        elif isinstance(email_prefs, dict):
            print("✅ email_preferences is correctly stored as JSONB")
        
        return True
    else:
        print(f"❌ Failed to verify: {response.status_code}")
        return False

def main():
    print("=" * 50)
    print("EMAIL PREFERENCE TESTING")
    print("=" * 50)
    
    # Get auth token
    token = get_auth_token()
    
    # Test 1: Get initial preferences
    print("\n📊 TEST 1: Get Initial Preferences")
    initial_prefs = get_preferences(token)
    
    # Test 2: Toggle applications off
    print("\n📊 TEST 2: Toggle Applications OFF")
    success = update_preferences(token, {
        "applications": False,
        "approvals": True,
        "reminders": True
    })
    
    if success:
        # Verify the change persisted
        new_prefs = get_preferences(token)
        if new_prefs.get('applications') == False:
            print("✅ Toggle OFF persisted correctly")
        else:
            print("❌ Toggle OFF did not persist")
    
    # Test 3: Toggle applications back on
    print("\n📊 TEST 3: Toggle Applications ON")
    success = update_preferences(token, {
        "applications": True,
        "approvals": True,
        "reminders": True
    })
    
    if success:
        # Verify the change persisted
        new_prefs = get_preferences(token)
        if new_prefs.get('applications') == True:
            print("✅ Toggle ON persisted correctly")
        else:
            print("❌ Toggle ON did not persist")
    
    # Test 4: Verify database storage
    print("\n📊 TEST 4: Database Storage Verification")
    verify_in_database(token)
    
    # Test 5: Test persistence after multiple refreshes
    print("\n📊 TEST 5: Persistence After Refresh")
    print("Setting preferences to specific values...")
    update_preferences(token, {
        "applications": False,
        "approvals": False,
        "reminders": True
    })
    
    print("Fetching preferences 3 times to simulate refreshes...")
    for i in range(3):
        print(f"\nRefresh {i+1}:")
        prefs = get_preferences(token)
        if (prefs.get('applications') == False and 
            prefs.get('approvals') == False and 
            prefs.get('reminders') == True):
            print("✅ Preferences persisted correctly")
        else:
            print("❌ Preferences changed unexpectedly")
            
    print("\n" + "=" * 50)
    print("TESTING COMPLETE")
    print("=" * 50)

if __name__ == "__main__":
    main()