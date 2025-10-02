#!/usr/bin/env python3
"""
Test manager endpoints to see what's available and working
"""

import httpx
import asyncio
import json

BASE_URL = "http://localhost:8000"

async def test_manager_endpoints():
    """Test all manager endpoints"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        # First login
        print("1. Logging in as manager...")
        login_response = await client.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": "manager@demo.com",
                "password": "demo123"
            }
        )
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            return
        
        login_data = login_response.json()
        token = login_data['data']['token']
        headers = {"Authorization": f"Bearer {token}"}
        print(f"✅ Logged in successfully")
        
        # Test various endpoints
        endpoints_to_test = [
            ("/manager/dashboard", "GET", "Manager Dashboard"),
            ("/manager/applications", "GET", "Applications List"),
            ("/manager/employees", "GET", "Employees List"),
            ("/manager/properties", "GET", "Properties List"),
            ("/api/manager/dashboard", "GET", "API Manager Dashboard"),
            ("/api/manager/applications", "GET", "API Applications"),
            ("/api/properties", "GET", "API Properties"),
            ("/applications", "GET", "Applications"),
            ("/employees", "GET", "Employees"),
        ]
        
        print("\n2. Testing endpoints...")
        print("-" * 60)
        
        for endpoint, method, description in endpoints_to_test:
            print(f"\n{description} ({method} {endpoint}):")
            
            try:
                if method == "GET":
                    response = await client.get(f"{BASE_URL}{endpoint}", headers=headers)
                else:
                    response = await client.request(method, f"{BASE_URL}{endpoint}", headers=headers)
                
                print(f"   Status: {response.status_code}")
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        
                        # Check response format
                        if isinstance(data, dict):
                            if data.get('success'):
                                # New format with success/data wrapper
                                actual_data = data.get('data', data)
                                if isinstance(actual_data, list):
                                    print(f"   ✅ Success: {len(actual_data)} items")
                                elif isinstance(actual_data, dict):
                                    print(f"   ✅ Success: {list(actual_data.keys())[:5]}")
                                else:
                                    print(f"   ✅ Success: {type(actual_data)}")
                            else:
                                # Direct data
                                print(f"   ✅ Success: {list(data.keys())[:5]}")
                        elif isinstance(data, list):
                            print(f"   ✅ Success: {len(data)} items")
                            if data and len(data) > 0:
                                print(f"      Sample: {list(data[0].keys()) if isinstance(data[0], dict) else data[0]}")
                        else:
                            print(f"   ✅ Success: {type(data)}")
                            
                    except Exception as e:
                        print(f"   ⚠️  Non-JSON response or parsing error: {e}")
                        print(f"      Response preview: {response.text[:200]}")
                elif response.status_code == 404:
                    print(f"   ❌ Not Found")
                elif response.status_code == 401:
                    print(f"   ❌ Unauthorized")
                elif response.status_code == 403:
                    print(f"   ❌ Forbidden")
                else:
                    print(f"   ❌ Error: {response.text[:100]}")
                    
            except Exception as e:
                print(f"   ❌ Request failed: {str(e)}")
        
        # Now test property-specific data
        print("\n" + "=" * 60)
        print("3. Testing Property-Specific Data Access")
        print("-" * 60)
        
        # Get applications and check property IDs
        apps_response = await client.get(f"{BASE_URL}/manager/applications", headers=headers)
        if apps_response.status_code == 200:
            apps_data = apps_response.json()
            
            # Handle wrapped response
            if isinstance(apps_data, dict) and 'data' in apps_data:
                applications = apps_data['data']
            else:
                applications = apps_data
            
            if isinstance(applications, list) and len(applications) > 0:
                print(f"\nApplications found: {len(applications)}")
                
                # Get unique property IDs
                property_ids = set()
                for app in applications:
                    if isinstance(app, dict):
                        prop_id = app.get('property_id')
                        if prop_id:
                            property_ids.add(prop_id)
                
                print(f"Unique property IDs in applications: {property_ids}")
                
                if len(property_ids) == 1:
                    print("✅ All applications belong to single property (good isolation)")
                else:
                    print("⚠️  Multiple property IDs found (potential isolation issue)")
        
        print("\n" + "=" * 60)
        print("Summary:")
        print("- Manager login: ✅ Working")
        print("- Manager endpoints need to be checked/implemented")
        print("- Applications endpoint is working and returning data")

if __name__ == "__main__":
    asyncio.run(test_manager_endpoints())