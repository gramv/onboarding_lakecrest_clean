#!/usr/bin/env python3
"""
Test Email Notification Scenarios
"""

import requests
import json

BASE_URL = "http://localhost:8000"
EMAIL = "gvemula@mail.yu.edu"
PASSWORD = "Gouthi321@"

def get_auth_token() -> str:
    """Login and get JWT token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": EMAIL, "password": PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        token = data.get('data', {}).get('token')
        return token
    return None

def test_scenario(token: str, scenario_name: str, manager_enabled: bool):
    """Test a specific scenario"""
    print(f"\n📧 {scenario_name}")
    print("=" * 50)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Set manager preference
    pref_value = "ON" if manager_enabled else "OFF"
    print(f"1. Setting manager preference: {pref_value}")
    response = requests.put(
        f"{BASE_URL}/api/manager/notification-preferences",
        headers=headers,
        json={
            "applications": manager_enabled,
            "approvals": True,
            "reminders": True
        }
    )
    if response.status_code == 200:
        print(f"   ✅ Manager preference set to {pref_value}")
    else:
        print(f"   ❌ Failed to set preference")
    
    # Get email recipients
    response = requests.get(
        f"{BASE_URL}/api/manager/email-recipients",
        headers=headers
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n2. Recipients who will receive emails:")
        
        manager_included = False
        additional_recipients = []
        
        for r in result.get('data', []):
            email = r.get('email')
            r_type = r.get('type')
            
            if r_type == 'manager' and email == EMAIL:
                manager_included = True
                print(f"   ✅ Manager: {email}")
            elif r_type == 'recipient':
                additional_recipients.append(email)
                print(f"   📧 Additional: {email}")
        
        if not manager_included and not manager_enabled:
            print(f"   ✓ Manager NOT included (preference OFF)")
        elif not manager_included and manager_enabled:
            print(f"   ❌ ERROR: Manager should be included but isn't!")
        
        if not additional_recipients:
            print(f"   ℹ️ No additional recipients configured")
        
        # Verify the logic
        print(f"\n3. Verification:")
        if manager_enabled:
            if manager_included:
                print(f"   ✅ CORRECT: Manager preference ON → Manager receives emails")
            else:
                print(f"   ❌ ERROR: Manager preference ON but manager NOT in recipient list")
        else:
            if not manager_included:
                print(f"   ✅ CORRECT: Manager preference OFF → Manager does NOT receive emails")
            else:
                print(f"   ❌ ERROR: Manager preference OFF but manager IS in recipient list")
        
        if additional_recipients:
            print(f"   ✅ Additional recipients always receive emails: {len(additional_recipients)} recipients")

def main():
    print("=" * 60)
    print("EMAIL NOTIFICATION SCENARIO TESTING")
    print("=" * 60)
    
    token = get_auth_token()
    if not token:
        print("❌ Failed to authenticate")
        return
    
    print(f"✅ Authenticated as {EMAIL}")
    
    # Test Scenario 1: Manager ON, with additional recipients
    test_scenario(token, "Scenario 1: Manager ON + Additional Recipients", True)
    
    # Test Scenario 2: Manager OFF, with additional recipients
    test_scenario(token, "Scenario 2: Manager OFF + Additional Recipients", False)
    
    # Test Scenario 3: Manager ON again (test persistence)
    test_scenario(token, "Scenario 3: Manager ON again (persistence test)", True)
    
    print("\n" + "=" * 60)
    print("✅ SCENARIO TESTING COMPLETE")
    print("=" * 60)
    print("\nSummary:")
    print("• Manager toggle controls ONLY the manager's email")
    print("• Additional recipients ALWAYS receive emails")
    print("• When manager ON: Manager + Additional recipients get emails")
    print("• When manager OFF: Only Additional recipients get emails")

if __name__ == "__main__":
    main()