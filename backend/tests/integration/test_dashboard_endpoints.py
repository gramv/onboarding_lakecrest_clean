#!/usr/bin/env python3
"""Test script for HR and Manager dashboard endpoints"""

import asyncio
import httpx
import json
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
HR_EMAIL = "hr@hotelgroup.com"
HR_PASSWORD = "hr123456"
MANAGER_EMAIL = "manager@demo.com"
MANAGER_PASSWORD = "manager123"

async def login(email: str, password: str) -> str:
    """Login and get JWT token"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            # Check different possible response formats
            if "data" in data and "access_token" in data["data"]:
                return data["data"]["access_token"]
            elif "access_token" in data:
                return data["access_token"]
            elif "data" in data and "token" in data["data"]:
                return data["data"]["token"]
            elif "token" in data:
                return data["token"]
            else:
                print(f"Login succeeded but could not find token in response: {data}")
                return None
        else:
            print(f"Login failed for {email}: {response.status_code} - {response.text}")
            return None

async def test_hr_dashboard_stats(token: str):
    """Test HR dashboard stats endpoints"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n=== Testing HR Dashboard Stats Endpoints ===")
    
    # Test both endpoint versions
    endpoints = ["/hr/dashboard-stats", "/api/hr/dashboard-stats"]
    
    for endpoint in endpoints:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}{endpoint}",
                headers=headers
            )
            
            print(f"\nEndpoint: {endpoint}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Success: {data.get('success', False)}")
                print(f"Message: {data.get('message', 'N/A')}")
                
                if 'data' in data:
                    stats = data['data']
                    print("\nSystem-wide Statistics:")
                    print(f"  - Total Properties: {stats.get('totalProperties', 'N/A')}")
                    print(f"  - Total Managers: {stats.get('totalManagers', 'N/A')}")
                    print(f"  - Total Employees: {stats.get('totalEmployees', 'N/A')}")
                    print(f"  - Total Applications: {stats.get('totalApplications', 'N/A')}")
                    print(f"  - Pending Applications: {stats.get('pendingApplications', 'N/A')}")
                    print(f"  - Approved Applications: {stats.get('approvedApplications', 'N/A')}")
                    print(f"  - Active Employees: {stats.get('activeEmployees', 'N/A')}")
                    print(f"  - Onboarding in Progress: {stats.get('onboardingInProgress', 'N/A')}")
            else:
                print(f"Error: {response.text}")

async def test_manager_endpoints(token: str):
    """Test Manager dashboard stats and property endpoints"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n=== Testing Manager Dashboard Stats Endpoints ===")
    
    # Test dashboard stats endpoints
    stats_endpoints = ["/manager/dashboard-stats", "/api/manager/dashboard-stats"]
    
    for endpoint in stats_endpoints:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}{endpoint}",
                headers=headers
            )
            
            print(f"\nEndpoint: {endpoint}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Success: {data.get('success', False)}")
                print(f"Message: {data.get('message', 'N/A')}")
                
                if 'data' in data:
                    stats = data['data']
                    print("\nManager's Property Statistics:")
                    print(f"  - Property Employees: {stats.get('property_employees', 'N/A')}")
                    print(f"  - Property Applications: {stats.get('property_applications', 'N/A')}")
                    print(f"  - Pending Applications: {stats.get('pendingApplications', 'N/A')}")
                    print(f"  - Approved Applications: {stats.get('approvedApplications', 'N/A')}")
                    print(f"  - Total Applications: {stats.get('totalApplications', 'N/A')}")
                    print(f"  - Total Employees: {stats.get('totalEmployees', 'N/A')}")
                    print(f"  - Active Employees: {stats.get('activeEmployees', 'N/A')}")
                    print(f"  - Onboarding in Progress: {stats.get('onboardingInProgress', 'N/A')}")
            else:
                print(f"Error: {response.text}")
    
    print("\n=== Testing Manager Property Endpoints ===")
    
    # Test property endpoints
    property_endpoints = ["/manager/property", "/api/manager/property"]
    
    for endpoint in property_endpoints:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}{endpoint}",
                headers=headers
            )
            
            print(f"\nEndpoint: {endpoint}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Success: {data.get('success', False)}")
                print(f"Message: {data.get('message', 'N/A')}")
                
                if 'data' in data and data['data']:
                    prop = data['data']
                    print("\nManager's Property Details:")
                    print(f"  - Property ID: {prop.get('id', 'N/A')}")
                    print(f"  - Property Name: {prop.get('name', 'N/A')}")
                    print(f"  - Address: {prop.get('address', 'N/A')}")
                    print(f"  - Manager Email: {prop.get('manager_email', 'N/A')}")
                    print(f"  - Contact Phone: {prop.get('contact_phone', 'N/A')}")
            else:
                print(f"Error: {response.text}")

async def main():
    """Run all tests"""
    print("=" * 60)
    print("Testing Dashboard Endpoints")
    print("=" * 60)
    
    # Test HR endpoints
    print("\nLogging in as HR...")
    hr_token = await login(HR_EMAIL, HR_PASSWORD)
    if hr_token:
        await test_hr_dashboard_stats(hr_token)
    else:
        print("Failed to login as HR")
    
    # Test Manager endpoints
    print("\nLogging in as Manager...")
    manager_token = await login(MANAGER_EMAIL, MANAGER_PASSWORD)
    if manager_token:
        await test_manager_endpoints(manager_token)
    else:
        print("Failed to login as Manager")
    
    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())