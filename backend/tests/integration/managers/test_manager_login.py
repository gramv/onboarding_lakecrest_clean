#!/usr/bin/env python3
"""
Test Manager Login and Access
"""

import requests
import json

def test_manager_access():
    """Test manager login and dashboard access"""
    
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Manager Access After Fixes")
    print("=" * 60)
    
    # Test with HR user first to verify system is working
    print("\n1️⃣ Testing with HR user first...")
    hr_response = requests.post(
        f"{base_url}/api/auth/login",
        json={"email": "freshhr@test.com", "password": "test123"}
    )
    
    if hr_response.status_code == 200:
        print("   ✅ HR login works - system is functioning")
        hr_data = hr_response.json()
        print(f"   Role: {hr_data.get('user', {}).get('role')}")
    else:
        print(f"   ❌ HR login failed - check system")
    
    # Test manager credentials
    print("\n2️⃣ Testing manager logins...")
    test_managers = [
        {"email": "goutamramv@gmail.com", "password": "Test123!"},
        {"email": "manager@test.com", "password": "manager123"}
    ]
    
    for creds in test_managers:
        print(f"\n   Testing: {creds['email']}")
        login_response = requests.post(
            f"{base_url}/api/auth/login",
            json=creds
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get('token')
            user = data.get('user', {})
            
            print(f"      ✅ Login successful!")
            print(f"      Role: {user.get('role')}")
            print(f"      Property: {user.get('property_id')}")
            
            # Test manager endpoints
            if token:
                headers = {"Authorization": f"Bearer {token}"}
                
                # Test dashboard stats
                stats_response = requests.get(
                    f"{base_url}/api/manager/dashboard-stats",
                    headers=headers
                )
                
                if stats_response.status_code == 200:
                    print(f"      ✅ Can access dashboard stats")
                else:
                    print(f"      ❌ Dashboard stats: {stats_response.status_code}")
                    if stats_response.status_code == 403:
                        print(f"         {stats_response.json().get('detail', '')}")
        else:
            print(f"      ❌ Login failed: {login_response.status_code}")
            try:
                print(f"         {login_response.json().get('detail', '')}")
            except:
                pass

if __name__ == "__main__":
    test_manager_access()
