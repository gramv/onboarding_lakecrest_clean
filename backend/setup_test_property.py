#!/usr/bin/env python3
"""
Setup test property and manager for testing
"""

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
from dotenv import load_dotenv
load_dotenv('.env', override=True)

from app.supabase_service_enhanced import EnhancedSupabaseService
from app.models import Property, User, UserRole
from app.auth import PasswordManager
import uuid

def setup_test_data():
    """Create test property and manager"""
    print("Setting up test data...")
    
    # Initialize Supabase service
    supabase = EnhancedSupabaseService()
    password_manager = PasswordManager()
    
    try:
        # 1. Create test property
        test_property_id = "550e8400-e29b-41d4-a716-446655440001"  # Fixed UUID for testing
        
        # Check if property already exists
        existing = supabase.client.table('properties').select('*').eq('id', test_property_id).execute()
        
        if not existing.data:
            property_data = {
                'id': test_property_id,
                'name': 'Test Hotel Property',
                'address': '123 Test Street',
                'city': 'Test City',
                'state': 'TX',
                'zip_code': '12345',
                'phone': '555-0100',
                'is_active': True,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            
            result = supabase.client.table('properties').insert(property_data).execute()
            print(f"✅ Created test property: {test_property_id}")
        else:
            print(f"ℹ️ Test property already exists: {test_property_id}")
        
        # 2. Create or update test manager
        manager_email = "manager@demo.com"
        
        # Check if user exists
        existing_user = supabase.client.table('users').select('*').eq('email', manager_email).execute()
        
        if not existing_user.data:
            # Create new manager
            manager_id = str(uuid.uuid4())
            password_hash = password_manager.hash_password("ManagerDemo123!")
            
            user_data = {
                'id': manager_id,
                'email': manager_email,
                'role': 'manager',
                'first_name': 'Test',
                'last_name': 'Manager',
                'property_id': test_property_id,
                'password_hash': password_hash,
                'is_active': True,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            
            result = supabase.client.table('users').insert(user_data).execute()
            print(f"✅ Created test manager: {manager_email}")
        else:
            # Update existing manager to ensure correct property assignment
            manager_id = existing_user.data[0]['id']
            password_hash = password_manager.hash_password("ManagerDemo123!")
            
            update_data = {
                'property_id': test_property_id,
                'password_hash': password_hash,
                'is_active': True,
                'role': 'manager'
            }
            
            result = supabase.client.table('users').update(update_data).eq('id', manager_id).execute()
            print(f"✅ Updated test manager: {manager_email}")
        
        # 3. Manager assignment is handled through the users table property_id field
        print(f"✅ Manager assigned to property via users.property_id field")
        
        # 4. Create HR user for testing (optional)
        hr_email = "hr@demo.com"
        existing_hr = supabase.client.table('users').select('*').eq('email', hr_email).execute()
        
        if not existing_hr.data:
            hr_id = str(uuid.uuid4())
            hr_password_hash = password_manager.hash_password("HRDemo123!")
            
            hr_data = {
                'id': hr_id,
                'email': hr_email,
                'role': 'hr',
                'first_name': 'Test',
                'last_name': 'HR',
                'password_hash': hr_password_hash,
                'is_active': True,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            
            result = supabase.client.table('users').insert(hr_data).execute()
            print(f"✅ Created test HR user: {hr_email}")
        else:
            print(f"ℹ️ HR user already exists: {hr_email}")
        
        print("\n✅ Test data setup complete!")
        print("\nTest Credentials:")
        print(f"  Property ID: {test_property_id}")
        print("  Manager: manager@demo.com / ManagerDemo123!")
        print("  HR: hr@demo.com / HRDemo123!")
        
    except Exception as e:
        print(f"❌ Error setting up test data: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = setup_test_data()
    sys.exit(0 if success else 1)