#!/usr/bin/env python3
"""Test manager login and show full response"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_login():
    """Test manager login"""
    print("Testing manager login at /auth/login...")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": "manager@demo.com",
            "password": "Manager123!"
        }
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Login successful!")
        print(f"Response structure:")
        print(json.dumps(data, indent=2))
        
        # Check if we can access manager endpoints
        if 'token' in data:
            token = data['token']
            print(f"\n✅ Got token: {token[:50]}...")
            
            # Test manager dashboard endpoint
            dash_response = requests.get(
                f"{BASE_URL}/manager/dashboard-stats",
                headers={"Authorization": f"Bearer {token}"}
            )
            print(f"\nManager dashboard test: {dash_response.status_code}")
            if dash_response.status_code == 200:
                print("✅ Manager can access dashboard!")
        
        return True
    else:
        print(f"❌ Login failed: {response.text}")
        return False

if __name__ == "__main__":
    test_login()
