#!/usr/bin/env python3
"""Test HR property and manager endpoints to identify issues"""

import asyncio
import httpx
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
TEST_HR_EMAIL = "hr@demo.com"
TEST_HR_PASSWORD = "Test1234!"

async def login(client):
    """Login as HR user"""
    login_data = {
        "email": TEST_HR_EMAIL,  # Changed from username to email
        "password": TEST_HR_PASSWORD
    }
    response = await client.post(f"{BASE_URL}/api/auth/login", json=login_data)  # Changed from data to json
    if response.status_code == 200:
        data = response.json()
        # Handle different response formats
        if 'access_token' in data:
            return data['access_token']
        elif 'data' in data and 'token' in data['data']:
            return data['data']['token']
        elif 'data' in data and 'access_token' in data['data']:
            return data['data']['access_token']
        else:
            print(f"Unexpected response format: {data}")
            return None
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

async def test_create_property(client, token):
    """Test creating a property"""
    print("\n1. Testing POST /api/hr/properties...")
    
    property_data = {
        "name": f"Test Property {datetime.now().strftime('%Y%m%d%H%M%S')}",
        "address": "123 Test Street",
        "city": "Test City",
        "state": "CA",
        "zip_code": "12345",
        "phone": "555-0123"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = await client.post(
            f"{BASE_URL}/api/hr/properties",
            data=property_data,
            headers=headers
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            return data.get('property', {}).get('id')
        return None
    except Exception as e:
        print(f"   Error: {e}")
        return None

async def test_update_property(client, token, property_id):
    """Test updating a property"""
    print(f"\n2. Testing PUT /api/hr/properties/{property_id}...")
    
    update_data = {
        "name": f"Updated Property {datetime.now().strftime('%Y%m%d%H%M%S')}",
        "address": "456 Updated Street",
        "city": "Updated City",
        "state": "NY",
        "zip_code": "54321",
        "phone": "555-9999"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = await client.put(
            f"{BASE_URL}/api/hr/properties/{property_id}",
            data=update_data,
            headers=headers
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:500]}")
        return response.status_code == 200
    except Exception as e:
        print(f"   Error: {e}")
        return False

async def test_create_manager(client, token, property_id=None):
    """Test creating a manager"""
    print("\n3. Testing POST /api/hr/managers...")
    
    import secrets
    import string
    
    # Generate random email and password
    random_suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6))
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits + "!@#$%") for _ in range(12))
    
    manager_data = {
        "email": f"manager_{random_suffix}@test.com",
        "first_name": "Test",
        "last_name": "Manager",
        "password": temp_password
    }
    
    if property_id:
        manager_data["property_id"] = property_id
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = await client.post(
            f"{BASE_URL}/api/hr/managers",
            data=manager_data,
            headers=headers
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            manager_id = data.get('data', {}).get('id')
            print(f"   Manager ID: {manager_id}")
            print(f"   Email: {manager_data['email']}")
            print(f"   Temp Password: {temp_password}")
            return manager_id, manager_data['email'], temp_password
        return None, None, None
    except Exception as e:
        print(f"   Error: {e}")
        return None, None, None

async def test_manager_login(client, email, password):
    """Test that the created manager can login"""
    print(f"\n4. Testing manager login with {email}...")
    
    login_data = {
        "email": email,  # Changed from username to email
        "password": password
    }
    
    try:
        response = await client.post(f"{BASE_URL}/api/auth/login", json=login_data)  # Changed from data to json
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✓ Manager can login successfully")
            return True
        else:
            print(f"   ✗ Login failed: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   Error: {e}")
        return False

async def test_property_manager_assignment(client, token, property_id, manager_id):
    """Test assigning manager to property"""
    print(f"\n5. Testing POST /api/hr/properties/{property_id}/managers...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = await client.post(
            f"{BASE_URL}/api/hr/properties/{property_id}/managers",
            json={"manager_id": manager_id},
            headers=headers
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:500]}")
        return response.status_code == 200
    except Exception as e:
        print(f"   Error: {e}")
        return False

async def main():
    """Run all tests"""
    print("=" * 60)
    print("HR Property and Manager Endpoint Tests")
    print("=" * 60)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Login as HR
        print("\nLogging in as HR...")
        token = await login(client)
        
        if not token:
            print("Failed to login as HR. Cannot continue tests.")
            return
        
        print("✓ HR login successful")
        
        # Test property creation
        property_id = await test_create_property(client, token)
        
        if property_id:
            print(f"✓ Property created with ID: {property_id}")
            
            # Test property update
            if await test_update_property(client, token, property_id):
                print("✓ Property updated successfully")
            else:
                print("✗ Property update failed")
        else:
            print("✗ Property creation failed")
            # Create a test property ID for manager testing
            property_id = None
        
        # Test manager creation (with and without property)
        manager_id, manager_email, manager_password = await test_create_manager(client, token, property_id)
        
        if manager_id:
            print(f"✓ Manager created with ID: {manager_id}")
            
            # Test manager login
            if manager_email and manager_password:
                if await test_manager_login(client, manager_email, manager_password):
                    print("✓ Manager authentication working")
                else:
                    print("✗ Manager authentication failed")
            
            # Test property-manager assignment if we have both
            if property_id and manager_id:
                if await test_property_manager_assignment(client, token, property_id, manager_id):
                    print("✓ Manager assigned to property")
                else:
                    print("✗ Manager assignment failed")
        else:
            print("✗ Manager creation failed")
        
        print("\n" + "=" * 60)
        print("Test Summary:")
        print("Check the output above for specific errors to fix")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())