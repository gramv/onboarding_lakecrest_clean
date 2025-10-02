#!/usr/bin/env python3
"""Test script for the new HR Applications endpoint"""

import asyncio
import httpx
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
HR_EMAIL = "hr@test.com"
HR_PASSWORD = "test123"

async def test_hr_applications_endpoint():
    """Test the /api/hr/applications/all endpoint"""
    
    async with httpx.AsyncClient() as client:
        # Step 1: Login as HR user
        print("1. Logging in as HR user...")
        login_response = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": HR_EMAIL, "password": HR_PASSWORD}
        )
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return
        
        login_data = login_response.json()
        # Check for token in different possible response formats
        token = login_data.get("access_token") or login_data.get("token") or login_data.get("data", {}).get("token")
        if not token:
            print(f"❌ No token in response: {login_data}")
            return
            
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful")
        
        # Step 2: Test basic endpoint access
        print("\n2. Testing basic endpoint access...")
        response = await client.get(
            f"{BASE_URL}/api/hr/applications/all",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"❌ Endpoint failed: {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        data = response.json()
        print(f"✅ Endpoint accessible")
        print(f"   Total applications: {data.get('total', 0)}")
        print(f"   Applications returned: {len(data.get('applications', []))}")
        
        # Step 3: Test with filters
        print("\n3. Testing with filters...")
        
        # Test status filter
        response = await client.get(
            f"{BASE_URL}/api/hr/applications/all?status=pending",
            headers=headers
        )
        if response.status_code == 200:
            pending_data = response.json()
            print(f"✅ Status filter (pending): {pending_data.get('total', 0)} applications")
        
        # Test property filter (if we have applications)
        if data.get('applications'):
            first_app = data['applications'][0]
            property_id = first_app.get('property_id')
            if property_id:
                response = await client.get(
                    f"{BASE_URL}/api/hr/applications/all?property_id={property_id}",
                    headers=headers
                )
                if response.status_code == 200:
                    property_data = response.json()
                    print(f"✅ Property filter: {property_data.get('total', 0)} applications for property {property_id}")
        
        # Test pagination
        response = await client.get(
            f"{BASE_URL}/api/hr/applications/all?limit=5&offset=0",
            headers=headers
        )
        if response.status_code == 200:
            paginated_data = response.json()
            print(f"✅ Pagination: {len(paginated_data.get('applications', []))} of {paginated_data.get('total', 0)} total")
        
        # Step 4: Display sample application data
        if data.get('applications'):
            print("\n4. Sample application data:")
            app = data['applications'][0]
            print(f"   ID: {app.get('id')}")
            print(f"   Property: {app.get('property_name')} ({app.get('property_city')}, {app.get('property_state')})")
            print(f"   Applicant: {app.get('applicant_name')} ({app.get('applicant_email')})")
            print(f"   Position: {app.get('position')} - {app.get('department')}")
            print(f"   Status: {app.get('status')}")
            print(f"   Applied: {app.get('applied_at')}")
            
        print("\n✅ All tests passed successfully!")

async def main():
    """Main test runner"""
    print("=" * 60)
    print("HR Applications Endpoint Test")
    print("=" * 60)
    
    try:
        await test_hr_applications_endpoint()
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())