#!/usr/bin/env python3
"""
Quick test script to verify the new HR analytics endpoints
Run with: python3 test_analytics_endpoints.py
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000"
HR_TOKEN = None  # Will need to be set with actual HR token

def test_endpoint(endpoint, method="GET", data=None, params=None):
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    headers = {
        "Content-Type": "application/json"
    }

    # Add auth header if token is available
    if HR_TOKEN:
        headers["Authorization"] = f"Bearer {HR_TOKEN}"

    try:
        if method == "GET":
            response = requests.get(url, headers=headers, params=params)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)

        print(f"\n✓ {method} {endpoint}")
        print(f"  Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"  Success: {data.get('success', False)}")
            print(f"  Message: {data.get('message', 'No message')}")
            if 'data' in data:
                print(f"  Data keys: {list(data['data'].keys())}")
        else:
            print(f"  Error: {response.text[:200]}")

    except Exception as e:
        print(f"\n✗ {method} {endpoint}")
        print(f"  Error: {str(e)}")

def main():
    print("=" * 60)
    print("Testing HR Analytics Endpoints")
    print("=" * 60)

    # Test analytics overview
    test_endpoint("/api/hr/analytics/overview")

    # Test employee trends with default 30 days
    test_endpoint("/api/hr/analytics/employee-trends")

    # Test employee trends with custom days parameter
    test_endpoint("/api/hr/analytics/employee-trends", params={"days": 7})

    # Test property performance
    test_endpoint("/api/hr/analytics/property-performance")

    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print("\nNote: These endpoints require HR authentication.")
    print("To fully test, you need to:")
    print("1. Start the backend server: uvicorn app.main_enhanced:app --reload")
    print("2. Login as an HR user to get a valid token")
    print("3. Set the HR_TOKEN variable in this script")

if __name__ == "__main__":
    main()