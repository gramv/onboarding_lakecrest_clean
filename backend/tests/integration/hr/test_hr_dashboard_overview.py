#!/usr/bin/env python3
"""Test HR Dashboard Overview functionality"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
HR_EMAIL = "hr@demo.com"
HR_PASSWORD = "hrpass123"

def login_as_hr():
    """Login as HR user and get token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"email": HR_EMAIL, "password": HR_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    else:
        print(f"Login failed: {response.status_code}")
        print(response.json())
        return None

def test_hr_dashboard_stats(token):
    """Test HR dashboard stats endpoint"""
    print("\n=== Testing HR Dashboard Stats ===")
    response = requests.get(
        f"{BASE_URL}/hr/dashboard-stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2))
    else:
        print(f"Error: {response.text}")

def test_properties_list(token):
    """Test properties list endpoint"""
    print("\n=== Testing Properties List ===")
    response = requests.get(
        f"{BASE_URL}/hr/properties",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        if 'data' in data:
            properties = data['data']
            print(f"Found {len(properties)} properties")
            for prop in properties[:3]:  # Show first 3
                print(f"  - {prop.get('name', 'Unknown')} (ID: {prop.get('id', 'N/A')[:8]}...)")
        else:
            print("No data field in response")
    else:
        print(f"Error: {response.text}")

def test_property_stats(token, property_id):
    """Test property-specific stats endpoint"""
    print(f"\n=== Testing Property Stats for {property_id[:8]}... ===")
    response = requests.get(
        f"{BASE_URL}/hr/properties/{property_id}/stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2))
    else:
        print(f"Error: {response.text}")

def test_managers_list(token):
    """Test managers list endpoint"""
    print("\n=== Testing Managers List ===")
    response = requests.get(
        f"{BASE_URL}/hr/managers",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        if 'data' in data:
            managers = data['data']
            print(f"Found {len(managers)} managers")
            for mgr in managers[:3]:  # Show first 3
                print(f"  - {mgr.get('email', 'Unknown')} (Property: {mgr.get('property_id', 'None')[:8] if mgr.get('property_id') else 'None'}...)")
        else:
            print("No data field in response")
    else:
        print(f"Error: {response.text}")

def main():
    print("Testing HR Dashboard Overview Functionality")
    print("=" * 50)
    
    # Login
    print("\nLogging in as HR...")
    token = login_as_hr()
    if not token:
        print("Failed to login. Exiting.")
        return
    
    print(f"Successfully logged in. Token: {token[:20]}...")
    
    # Test dashboard stats
    test_hr_dashboard_stats(token)
    
    # Test properties list
    test_properties_list(token)
    
    # Get first property and test its stats
    response = requests.get(
        f"{BASE_URL}/hr/properties",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code == 200:
        data = response.json()
        if 'data' in data and len(data['data']) > 0:
            first_property_id = data['data'][0]['id']
            test_property_stats(token, first_property_id)
    
    # Test managers list
    test_managers_list(token)
    
    print("\n" + "=" * 50)
    print("HR Dashboard Overview Test Complete!")

if __name__ == "__main__":
    main()