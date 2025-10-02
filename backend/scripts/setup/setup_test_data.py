#!/usr/bin/env python3
"""
Setup test data for Hotel Employee Onboarding System
Creates HR account, test property, and manager account as specified
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4
import hashlib
from pathlib import Path

# Add the backend app to path
sys.path.insert(0, str(Path(__file__).parent / "hotel-onboarding-backend"))

from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / "hotel-onboarding-backend" / ".env"
load_dotenv(env_path)

from app.supabase_service_enhanced import EnhancedSupabaseService
from app.models import User, Property, UserRole

# Test credentials
TEST_HR_EMAIL = "hr@demo.com"
TEST_HR_PASSWORD = "Demo123!"
TEST_MANAGER_EMAIL = "manager@demo.com"
TEST_MANAGER_PASSWORD = "Demo123!"
TEST_PROPERTY_NAME = "Demo Hotel"


def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


async def setup_test_data():
    """Main function to set up all test data"""
    service = EnhancedSupabaseService()
    
    print("🚀 Setting up test data for Hotel Employee Onboarding System...")
    print("=" * 60)
    
    # Step 1: Create test property first
    print("\n📍 Step 1: Creating test property...")
    property_id = str(uuid4())
    property_data = {
        "id": property_id,
        "name": TEST_PROPERTY_NAME,
        "address": "123 Test Street",
        "city": "Demo City",
        "state": "CA",
        "zip_code": "90210",
        "phone": "555-0100",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        # Create property using admin client for initial setup
        result = service.admin_client.table('properties').insert(property_data).execute()
        if result.data:
            print(f"✅ Property created successfully!")
            print(f"   - Name: {TEST_PROPERTY_NAME}")
            print(f"   - ID: {property_id}")
            print(f"   - Address: {property_data['address']}, {property_data['city']}, {property_data['state']} {property_data['zip_code']}")
        else:
            print(f"❌ Failed to create property")
            return
    except Exception as e:
        print(f"❌ Error creating property: {e}")
        # Check if property already exists
        existing = service.admin_client.table('properties').select("*").eq('name', TEST_PROPERTY_NAME).execute()
        if existing.data:
            property_id = existing.data[0]['id']
            print(f"ℹ️  Using existing property: {property_id}")
        else:
            return
    
    # Step 2: Create HR account
    print("\n👤 Step 2: Creating HR account...")
    hr_user_id = str(uuid4())
    hr_user_data = {
        "id": hr_user_id,
        "email": TEST_HR_EMAIL,
        "first_name": "System",
        "last_name": "Admin",
        "role": UserRole.HR.value,
        "property_id": None,  # HR users don't belong to specific properties
        "is_active": True,
        "password_hash": hash_password(TEST_HR_PASSWORD),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        # Check if user already exists
        existing_hr = service.admin_client.table('users').select("*").eq('email', TEST_HR_EMAIL).execute()
        if existing_hr.data:
            print(f"ℹ️  HR user already exists, updating...")
            result = service.admin_client.table('users').update({
                "password_hash": hash_password(TEST_HR_PASSWORD),
                "role": UserRole.HR.value,
                "is_active": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq('email', TEST_HR_EMAIL).execute()
            hr_user_id = existing_hr.data[0]['id']
        else:
            result = service.admin_client.table('users').insert(hr_user_data).execute()
        
        if result.data:
            print(f"✅ HR account created/updated successfully!")
            print(f"   - Email: {TEST_HR_EMAIL}")
            print(f"   - Password: {TEST_HR_PASSWORD}")
            print(f"   - Role: HR (Full system access)")
    except Exception as e:
        print(f"❌ Error creating HR account: {e}")
    
    # Step 3: Create Manager account
    print("\n👤 Step 3: Creating Manager account...")
    manager_user_id = str(uuid4())
    manager_user_data = {
        "id": manager_user_id,
        "email": TEST_MANAGER_EMAIL,
        "first_name": "Test",
        "last_name": "Manager",
        "role": UserRole.MANAGER.value,
        "property_id": property_id,  # Link to test property
        "is_active": True,
        "password_hash": hash_password(TEST_MANAGER_PASSWORD),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        # Check if user already exists
        existing_manager = service.admin_client.table('users').select("*").eq('email', TEST_MANAGER_EMAIL).execute()
        if existing_manager.data:
            print(f"ℹ️  Manager user already exists, updating...")
            result = service.admin_client.table('users').update({
                "password_hash": hash_password(TEST_MANAGER_PASSWORD),
                "role": UserRole.MANAGER.value,
                "property_id": property_id,
                "is_active": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq('email', TEST_MANAGER_EMAIL).execute()
            manager_user_id = existing_manager.data[0]['id']
        else:
            result = service.admin_client.table('users').insert(manager_user_data).execute()
        
        if result.data:
            print(f"✅ Manager account created/updated successfully!")
            print(f"   - Email: {TEST_MANAGER_EMAIL}")
            print(f"   - Password: {TEST_MANAGER_PASSWORD}")
            print(f"   - Role: Manager")
            print(f"   - Assigned Property: {TEST_PROPERTY_NAME}")
    except Exception as e:
        print(f"❌ Error creating Manager account: {e}")
    
    # Step 4: Create property_managers association
    print("\n🔗 Step 4: Linking Manager to Property...")
    try:
        # Check if association already exists
        existing_link = service.admin_client.table('property_managers').select("*").eq('manager_id', manager_user_id).eq('property_id', property_id).execute()
        
        if not existing_link.data:
            property_manager_data = {
                "id": str(uuid4()),
                "property_id": property_id,
                "manager_id": manager_user_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            result = service.admin_client.table('property_managers').insert(property_manager_data).execute()
            if result.data:
                print(f"✅ Manager linked to property successfully!")
        else:
            print(f"ℹ️  Manager already linked to property")
    except Exception as e:
        print(f"❌ Error linking manager to property: {e}")
    
    # Step 5: Verify the setup
    print("\n🔍 Step 5: Verifying test data setup...")
    print("-" * 40)
    
    # Test HR login
    print("\nTesting HR login...")
    try:
        hr_user = service.admin_client.table('users').select("*").eq('email', TEST_HR_EMAIL).execute()
        if hr_user.data and hr_user.data[0]['password_hash'] == hash_password(TEST_HR_PASSWORD):
            print(f"✅ HR account login verified")
            print(f"   - Can access: All properties and system-wide data")
        else:
            print(f"❌ HR account login failed")
    except Exception as e:
        print(f"❌ Error verifying HR account: {e}")
    
    # Test Manager login
    print("\nTesting Manager login...")
    try:
        manager_user = service.admin_client.table('users').select("*").eq('email', TEST_MANAGER_EMAIL).execute()
        if manager_user.data and manager_user.data[0]['password_hash'] == hash_password(TEST_MANAGER_PASSWORD):
            print(f"✅ Manager account login verified")
            print(f"   - Can access: {TEST_PROPERTY_NAME} data only")
            
            # Verify property assignment
            if manager_user.data[0]['property_id'] == property_id:
                print(f"✅ Property assignment verified")
            else:
                print(f"❌ Property assignment incorrect")
        else:
            print(f"❌ Manager account login failed")
    except Exception as e:
        print(f"❌ Error verifying Manager account: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Test data setup complete!")
    print("\nYou can now login with:")
    print(f"  HR Account: {TEST_HR_EMAIL} / {TEST_HR_PASSWORD}")
    print(f"  Manager Account: {TEST_MANAGER_EMAIL} / {TEST_MANAGER_PASSWORD}")
    print(f"\nTest Property: {TEST_PROPERTY_NAME}")
    print("\nAccess the application at:")
    print("  Frontend: http://localhost:3000")
    print("  Backend API: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(setup_test_data())