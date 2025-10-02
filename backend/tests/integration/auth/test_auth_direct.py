#!/usr/bin/env python3
"""
Test authentication directly with Supabase Auth
"""

import os
import httpx
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.test')

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

async def test_supabase_auth():
    """Test authentication directly with Supabase"""
    async with httpx.AsyncClient() as client:
        print("Testing Supabase Auth directly...")
        
        # Try to sign in with manager@demo.com
        print("\n1. Testing manager@demo.com login via Supabase Auth...")
        auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        
        response = await client.post(
            auth_url,
            json={
                "email": "manager@demo.com",
                "password": "demo123"
            },
            headers={
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json"
            }
        )
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Auth successful!")
            print(f"   User ID: {data.get('user', {}).get('id')}")
            print(f"   Email: {data.get('user', {}).get('email')}")
            return data.get('user', {}).get('id')
        else:
            print(f"   ❌ Auth failed: {response.text}")
            return None

async def test_backend_auth(use_auth_user_id: str = None):
    """Test backend authentication"""
    async with httpx.AsyncClient() as client:
        print("\n2. Testing backend /auth/login endpoint...")
        
        response = await client.post(
            "http://localhost:8000/auth/login",
            json={
                "email": "manager@demo.com",
                "password": "demo123"
            }
        )
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Login successful!")
            print(f"   Response: {data}")
            return data
        else:
            print(f"   ❌ Login failed: {response.text}")
            
            # If we have a Supabase auth user ID, try to fix the users table
            if use_auth_user_id:
                print("\n3. Attempting to fix users table...")
                await fix_users_table(use_auth_user_id)
            
            return None

async def fix_users_table(auth_user_id: str):
    """Fix the users table to match Supabase Auth"""
    from supabase import create_client
    import bcrypt
    
    print(f"   Fixing users table for auth ID: {auth_user_id}")
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Check if user exists in users table
    existing = supabase.table("users").select("*").eq("id", auth_user_id).execute()
    
    if existing.data:
        print(f"   User already in users table")
    else:
        print(f"   Adding user to users table...")
        # Create bcrypt hash for the password
        password_hash = bcrypt.hashpw("demo123".encode(), bcrypt.gensalt()).decode()
        
        result = supabase.table("users").upsert({
            "id": auth_user_id,
            "email": "manager@demo.com", 
            "first_name": "Demo",
            "last_name": "Manager",
            "role": "manager",
            "password_hash": password_hash
        }).execute()
        
        if result.data:
            print(f"   ✅ User added to users table")
        else:
            print(f"   ❌ Failed to add user")
    
    # Ensure property assignment exists
    print(f"   Checking property assignment...")
    
    # Get Demo Hotel property
    prop = supabase.table("properties").select("*").eq("name", "Demo Hotel").execute()
    if prop.data:
        property_id = prop.data[0]["id"]
        print(f"   Found property: {property_id}")
        
        # Check assignment
        assignment = (
            supabase.table("property_managers")
            .select("*")
            .eq("manager_id", auth_user_id)
            .eq("property_id", property_id)
            .execute()
        )
        
        if not assignment.data:
            print(f"   Creating property assignment...")
            import uuid
            result = supabase.table("property_managers").insert({
                "id": str(uuid.uuid4()),
                "manager_id": auth_user_id,
                "property_id": property_id
            }).execute()
            
            if result.data:
                print(f"   ✅ Property assignment created")
            else:
                print(f"   ❌ Failed to create assignment")
        else:
            print(f"   ✅ Property assignment exists")

async def main():
    print("=" * 60)
    print("AUTHENTICATION DEBUGGING")
    print("=" * 60)
    
    # Test Supabase Auth first
    auth_user_id = await test_supabase_auth()
    
    # Test backend auth
    await test_backend_auth(auth_user_id)
    
    # Try backend auth again if it was fixed
    if auth_user_id:
        print("\n4. Retrying backend auth after fixes...")
        result = await test_backend_auth()
        
        if result:
            print("\n" + "=" * 60)
            print("✅ AUTHENTICATION FIXED!")
            print("Manager can now login with: manager@demo.com / demo123")
            print("=" * 60)
        else:
            print("\n⚠️  Backend auth still failing - check password verification logic")

if __name__ == "__main__":
    asyncio.run(main())