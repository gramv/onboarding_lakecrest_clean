#!/usr/bin/env python3
"""
Quick debug script for manager property assignment issue
"""

import requests
import json

def test_manager_login():
    """Test login flow for gvemula@mail.yu.edu"""
    
    base_url = "http://localhost:8000"  # Adjust if different
    email = "gvemula@mail.yu.edu"
    
    print(f"🔍 Testing manager login for: {email}")
    print("=" * 50)
    
    # Test login endpoint
    try:
        login_response = requests.post(
            f"{base_url}/api/auth/login",
            json={
                "email": email,
                "password": "your_password_here"  # Replace with actual password
            }
        )
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            print("✅ Login successful")
            print(f"User data: {json.dumps(login_data.get('user', {}), indent=2)}")
            
            token = login_data.get('access_token')
            if token:
                # Test /api/auth/me endpoint
                headers = {"Authorization": f"Bearer {token}"}
                me_response = requests.get(f"{base_url}/api/auth/me", headers=headers)
                
                if me_response.status_code == 200:
                    me_data = me_response.json()
                    print("\n✅ /api/auth/me successful")
                    print(f"Auth me data: {json.dumps(me_data, indent=2)}")
                else:
                    print(f"\n❌ /api/auth/me failed: {me_response.status_code}")
                    print(f"Response: {me_response.text}")
                
                # Test manager property endpoint
                property_response = requests.get(f"{base_url}/api/manager/property", headers=headers)
                
                if property_response.status_code == 200:
                    property_data = property_response.json()
                    print("\n✅ Manager property endpoint successful")
                    print(f"Property data: {json.dumps(property_data, indent=2)}")
                else:
                    print(f"\n❌ Manager property endpoint failed: {property_response.status_code}")
                    print(f"Response: {property_response.text}")
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend. Is it running on port 8000?")
        print("\nTo start backend:")
        print("cd backend && uvicorn app.main_enhanced:app --reload --port 8000")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_manager_login()