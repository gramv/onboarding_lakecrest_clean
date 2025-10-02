#!/usr/bin/env python3
"""Setup test users for real-time testing"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'hotel-onboarding-backend'))

from app.supabase_service_enhanced import get_enhanced_supabase_service

service = get_enhanced_supabase_service()
import hashlib

def hash_password(password: str) -> str:
    """Simple password hashing for test"""
    return hashlib.sha256(password.encode()).hexdigest()

def setup_test_users():
    """Create test users for real-time testing"""
    
    # service is already imported
    
    print("Setting up test users...")
    
    # 1. Create test property first
    property_data = {
        'id': 'test-property-001',
        'name': 'Demo Hotel',
        'address': '123 Demo St, Demo City, DC 12345',
        'created_at': 'NOW()'
    }
    
    # Check if property exists
    result = service.client.table('properties').select('*').eq('id', 'test-property-001').execute()
    if not result.data:
        result = service.client.table('properties').insert(property_data).execute()
        print("✅ Created test property")
    else:
        print("✅ Test property already exists")
    
    # 2. Create manager user
    manager_data = {
        'email': 'manager@demo.com',
        'password_hash': hash_password('Demo123!'),
        'role': 'manager',
        'first_name': 'Test',
        'last_name': 'Manager'
    }
    
    # Check if manager exists
    result = service.client.table('users').select('*').eq('email', 'manager@demo.com').execute()
    if not result.data:
        result = service.client.table('users').insert(manager_data).execute()
        if result.data:
            manager_id = result.data[0]['id']
            print(f"✅ Created manager user: {manager_id}")
            
            # Assign to property
            assignment = {
                'property_id': 'test-property-001',
                'manager_id': manager_id
            }
            service.client.table('property_managers').insert(assignment).execute()
            print("✅ Assigned manager to property")
    else:
        print("✅ Manager already exists")
    
    # 3. Create HR user
    hr_data = {
        'email': 'hr@demo.com',
        'password_hash': hash_password('Demo123!'),
        'role': 'hr',
        'first_name': 'Test',
        'last_name': 'HR'
    }
    
    # Check if HR exists
    result = service.client.table('users').select('*').eq('email', 'hr@demo.com').execute()
    if not result.data:
        result = service.client.table('users').insert(hr_data).execute()
        print("✅ Created HR user")
    else:
        print("✅ HR user already exists")
    
    print("\nTest users ready!")
    print("- Manager: manager@demo.com / Demo123!")
    print("- HR: hr@demo.com / Demo123!")

if __name__ == "__main__":
    setup_test_users()