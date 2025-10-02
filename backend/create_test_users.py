#!/usr/bin/env python3
"""Create test users for password reset testing."""

import os
import sys
from dotenv import load_dotenv

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

from app.supabase_service_enhanced import SupabaseServiceEnhanced

def create_test_users():
    """Create test users in the database."""
    service = SupabaseServiceEnhanced()
    
    # Test users to create
    test_users = [
        {
            "email": "manager@demo.com",
            "password": "test123",
            "role": "manager",
            "first_name": "Test",
            "last_name": "Manager"
        },
        {
            "email": "hr@demo.com", 
            "password": "test123",
            "role": "hr",
            "first_name": "Test",
            "last_name": "HR"
        }
    ]
    
    for user_data in test_users:
        # Check if user already exists
        existing = service.get_user_by_email_sync(user_data["email"])
        
        if existing:
            print(f"✓ User {user_data['email']} already exists")
            # Update password if needed
            hashed_password = service.hash_password(user_data["password"])
            result = service.client.table("users").update({
                "password_hash": hashed_password
            }).eq("email", user_data["email"]).execute()
            print(f"  → Updated password for {user_data['email']}")
        else:
            # Create new user
            hashed_password = service.hash_password(user_data["password"])
            result = service.client.table("users").insert({
                "email": user_data["email"],
                "password_hash": hashed_password,
                "role": user_data["role"],
                "first_name": user_data["first_name"],
                "last_name": user_data["last_name"]
            }).execute()
            print(f"✓ Created user {user_data['email']}")
            
            # If manager, create property assignment
            if user_data["role"] == "manager" and result.data:
                user_id = result.data[0]["id"]
                
                # Get or create test property
                properties = service.client.table("properties").select("*").execute()
                if properties.data:
                    property_id = properties.data[0]["id"]
                else:
                    # Create test property
                    prop_result = service.client.table("properties").insert({
                        "name": "Demo Hotel",
                        "address": "123 Demo Street",
                        "city": "Demo City",
                        "state": "CA",
                        "zip_code": "90210",
                        "phone": "555-0100"
                    }).execute()
                    property_id = prop_result.data[0]["id"]
                    print(f"  → Created test property: Demo Hotel")
                
                # Assign manager to property
                service.client.table("property_managers").insert({
                    "manager_id": user_id,
                    "property_id": property_id
                }).execute()
                print(f"  → Assigned manager to property")
    
    print("\n✅ Test users ready!")
    print("Login credentials:")
    print("  manager@demo.com / test123")
    print("  hr@demo.com / test123")

if __name__ == "__main__":
    create_test_users()