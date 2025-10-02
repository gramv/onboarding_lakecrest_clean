#!/usr/bin/env python3
"""
Create test users for WebSocket testing
"""

import asyncio
import os
import uuid
from dotenv import load_dotenv

# Load environment variables from .env.test
load_dotenv('.env.test')

from app.supabase_service_enhanced import get_enhanced_supabase_service
from app.models import User, UserRole
import bcrypt

async def create_test_users():
    """Create test manager and HR users"""
    service = get_enhanced_supabase_service()
    
    # Password for all test users
    password = "test123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Test users data
    users = [
        {
            "id": str(uuid.uuid4()),
            "email": "test-manager@demo.com",
            "password_hash": hashed_password,
            "first_name": "Test",
            "last_name": "Manager",
            "role": "manager",
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "email": "test-hr@demo.com",
            "password_hash": hashed_password,
            "first_name": "Test",
            "last_name": "HR",
            "role": "hr",
            "is_active": True
        }
    ]
    
    for user_data in users:
        try:
            # Check if user exists
            existing = service.client.table('users').select('*').eq('email', user_data['email']).execute()
            
            if existing.data:
                print(f"User {user_data['email']} already exists")
                # Update password
                service.client.table('users').update({"password_hash": hashed_password}).eq('email', user_data['email']).execute()
                print(f"Updated password for {user_data['email']}")
            else:
                # Create user
                result = service.client.table('users').insert(user_data).execute()
                print(f"Created user: {user_data['email']}")
                
                # If manager, assign to test property
                if user_data['role'] == 'manager':
                    # Get the created user ID from result
                    created_user_id = result.data[0]['id'] if result.data else user_data['id']
                    manager_property = {
                        "manager_id": created_user_id,
                        "property_id": "903ed05b-5990-4ecf-b1b2-7592cf2923df",  # Test property
                        "is_primary": True
                    }
                    service.client.table('property_managers').insert(manager_property).execute()
                    print(f"Assigned manager to test property")
                    
        except Exception as e:
            print(f"Error creating user {user_data['email']}: {e}")
    
    print("\nTest users created/updated successfully!")
    print("Credentials:")
    print("- test-manager@demo.com / test123")
    print("- test-hr@demo.com / test123")

if __name__ == "__main__":
    asyncio.run(create_test_users())