#!/usr/bin/env python3
"""
Debug script to test Phase 0 endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8000"
PRODUCTION_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6IjE5MzEwYTM2LTc5N2MtNDQ2NC05NDViLWE0YTA2YTVlMTdjMiIsImFwcGxpY2F0aW9uX2lkIjpudWxsLCJ0b2tlbl90eXBlIjoib25ib2FyZGluZyIsImlhdCI6MTc1NzgxMjIxNSwiZXhwIjoxNzU4MDcxNDE1LCJqdGkiOiJUZS1NdTBFcVJHRTEzaDd6VlYtVll3In0.gg1XPTd2oTFSd7bVVcXo_Tpd1GISJYb4P51Yj_QVL2c"

print("Testing Phase 0 endpoints...")
print("=" * 60)

# Test 1: Validate token
print("\n1. Testing /api/onboarding/validate-token")
print("-" * 40)

try:
    response = requests.post(
        f"{BASE_URL}/api/onboarding/validate-token",
        json={"token": PRODUCTION_TOKEN},
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("Response:")
        print(json.dumps(data, indent=2))
        
        # Extract session ID if available
        if "data" in data:
            actual_data = data["data"]
            session_id = actual_data.get("session", {}).get("id") if actual_data.get("session") else None
            employee_id = actual_data.get("employee_id")
            print(f"\nExtracted Session ID: {session_id}")
            print(f"Extracted Employee ID: {employee_id}")
        else:
            print("No 'data' field in response")
    else:
        print(f"Error Response: {response.text}")
        
except Exception as e:
    print(f"Request failed with error: {e}")
    import traceback
    traceback.print_exc()

# Test 2: Refresh token
print("\n\n2. Testing /api/onboarding/refresh-token")
print("-" * 40)

try:
    response = requests.post(
        f"{BASE_URL}/api/onboarding/refresh-token",
        json={"token": PRODUCTION_TOKEN},
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("Response:")
        print(json.dumps(data, indent=2))
    else:
        print(f"Error Response: {response.text}")
        
except Exception as e:
    print(f"Request failed with error: {e}")
    import traceback
    traceback.print_exc()

# Test 3: Try with Bearer header (old format)
print("\n\n3. Testing with Bearer header (for comparison)")
print("-" * 40)

try:
    response = requests.post(
        f"{BASE_URL}/api/onboarding/validate-token",
        json={},
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {PRODUCTION_TOKEN}"
        }
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text[:200]}...")
        
except Exception as e:
    print(f"Request failed with error: {e}")

print("\n" + "=" * 60)
print("Testing complete!")