#!/usr/bin/env python3
"""
Comprehensive test and fix for email notification system
"""

import os
import sys
import json
import asyncio
import hashlib
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')

if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY")
    sys.exit(1)

print(f"🔧 Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def hash_password(password: str) -> str:
    """Hash password using SHA256 (matches backend)"""
    return hashlib.sha256(password.encode()).hexdigest()

async def main():
    try:
        print("\n📋 Step 1: Check existing manager account")
        # Check for existing manager
        result = supabase.table('users').select('*').eq('email', 'manager@test.com').execute()
        
        if result.data:
            print(f"  ✓ Found existing manager: {result.data[0]['email']}")
            manager_id = result.data[0]['id']
        else:
            print("  - Creating new manager account...")
            # Create manager account
            manager_data = {
                'email': 'manager@test.com',
                'password_hash': hash_password('test123'),
                'first_name': 'Test',
                'last_name': 'Manager',
                'role': 'manager',
                'is_active': True,
                'created_at': datetime.now().isoformat()
            }
            result = supabase.table('users').insert(manager_data).execute()
            manager_id = result.data[0]['id']
            print(f"  ✓ Created manager with ID: {manager_id}")
        
        print("\n📋 Step 2: Check property assignment")
        # Check if manager has property
        result = supabase.table('property_managers').select('*').eq('manager_id', manager_id).execute()
        
        if result.data:
            print(f"  ✓ Manager assigned to property: {result.data[0]['property_id']}")
            property_id = result.data[0]['property_id']
        else:
            print("  - Assigning manager to property...")
            # Get or create a property
            prop_result = supabase.table('properties').select('*').limit(1).execute()
            if prop_result.data:
                property_id = prop_result.data[0]['id']
            else:
                # Create a test property
                prop_data = {
                    'name': 'Test Hotel',
                    'code': 'TEST001',
                    'is_active': True,
                    'created_at': datetime.now().isoformat()
                }
                prop_result = supabase.table('properties').insert(prop_data).execute()
                property_id = prop_result.data[0]['id']
            
            # Assign manager to property
            assignment_data = {
                'manager_id': manager_id,
                'property_id': property_id,
                'created_at': datetime.now().isoformat()
            }
            supabase.table('property_managers').insert(assignment_data).execute()
            print(f"  ✓ Assigned manager to property: {property_id}")
        
        print("\n📋 Step 3: Test authentication")
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            # Test login
            login_data = {
                'email': 'manager@test.com',
                'password': 'test123'
            }
            
            async with session.post('http://localhost:8000/api/auth/login', json=login_data) as resp:
                if resp.status == 200:
                    response = await resp.json()
                    if response.get('success'):
                        token = response['data']['token']
                        print(f"  ✓ Login successful! Token: {token[:20]}...")
                        
                        # Test email endpoints with token
                        headers = {'Authorization': f'Bearer {token}'}
                        
                        print("\n📋 Step 4: Test email endpoints")
                        
                        # Test GET notification preferences
                        print("  - Testing GET /api/manager/notification-preferences")
                        async with session.get(
                            'http://localhost:8000/api/manager/notification-preferences',
                            headers=headers
                        ) as resp:
                            print(f"    Response status: {resp.status}")
                            if resp.status != 200:
                                text = await resp.text()
                                print(f"    Error: {text[:200]}")
                        
                        # Test GET email recipients
                        print("  - Testing GET /api/manager/email-recipients")
                        async with session.get(
                            'http://localhost:8000/api/manager/email-recipients',
                            headers=headers
                        ) as resp:
                            print(f"    Response status: {resp.status}")
                            if resp.status != 200:
                                text = await resp.text()
                                print(f"    Error: {text[:200]}")
                        
                        # Test POST email recipient
                        print("  - Testing POST /api/manager/email-recipients")
                        recipient_data = {
                            'email': 'test@example.com',
                            'name': 'Test Recipient'
                        }
                        async with session.post(
                            'http://localhost:8000/api/manager/email-recipients',
                            headers=headers,
                            json=recipient_data
                        ) as resp:
                            print(f"    Response status: {resp.status}")
                            if resp.status != 200:
                                text = await resp.text()
                                print(f"    Error: {text[:200]}")
                        
                        # Test send test email
                        print("  - Testing POST /api/manager/test-email")
                        test_email_data = {
                            'recipient_email': 'test@example.com'
                        }
                        async with session.post(
                            'http://localhost:8000/api/manager/test-email',
                            headers=headers,
                            json=test_email_data
                        ) as resp:
                            print(f"    Response status: {resp.status}")
                            if resp.status != 200:
                                text = await resp.text()
                                print(f"    Error: {text[:200]}")
                    else:
                        print(f"  ❌ Login failed: {response.get('error')}")
                else:
                    text = await resp.text()
                    print(f"  ❌ Login failed with status {resp.status}: {text[:200]}")
        
        print("\n📋 Step 5: Database schema check")
        # Check for missing tables/columns
        print("  - Checking for property_email_recipients table...")
        try:
            result = supabase.table('property_email_recipients').select('*').limit(1).execute()
            print("    ✓ Table exists")
        except Exception as e:
            print(f"    ❌ Table missing: {str(e)[:100]}")
            print("\n⚠️  MIGRATION NEEDED!")
            print("Please run the following SQL in Supabase SQL Editor:")
            print("-" * 60)
            with open('email_schema_migration.sql', 'r') as f:
                print(f.read())
            print("-" * 60)
        
        print("\n✅ Test complete!")
        print("\n📝 Summary:")
        print("  - Manager account: manager@test.com / test123")
        print(f"  - Property ID: {property_id}")
        print(f"  - Manager ID: {manager_id}")
        print("\n  If there are still errors, please:")
        print("  1. Run the migration SQL in Supabase SQL Editor")
        print("  2. Restart the backend server")
        print("  3. Try logging in again with the credentials above")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())