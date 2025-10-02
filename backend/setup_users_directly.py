#!/usr/bin/env python3
"""
Setup users directly in the users table with bcrypt passwords
"""

import os
import uuid
from dotenv import load_dotenv
from supabase import create_client
import bcrypt
from datetime import datetime

# Load environment variables
load_dotenv('.env.test')

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

def setup_users():
    """Setup users directly in users table"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Setting up users directly in database...")
    
    # 1. Setup admin user
    print("\n1. Setting up admin user...")
    admin_id = str(uuid.uuid4())
    admin_password_hash = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
    
    # Check if admin exists
    existing_admin = supabase.table("users").select("*").eq("email", "admin@hotelonboard.com").execute()
    
    if existing_admin.data:
        admin_id = existing_admin.data[0]["id"]
        print(f"   Admin exists with ID: {admin_id}")
        # Update password
        supabase.table("users").update({
            "password_hash": admin_password_hash
        }).eq("id", admin_id).execute()
        print("   Password updated")
    else:
        result = supabase.table("users").insert({
            "id": admin_id,
            "email": "admin@hotelonboard.com",
            "first_name": "System",
            "last_name": "Admin",
            "role": "hr",  # Using 'hr' instead of 'admin' based on the check constraint
            "password_hash": admin_password_hash,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        if result.data:
            print(f"   ✅ Admin created with ID: {admin_id}")
        else:
            print("   ❌ Failed to create admin")
    
    # 2. Setup manager user
    print("\n2. Setting up manager user...")
    manager_id = str(uuid.uuid4())
    manager_password_hash = bcrypt.hashpw("demo123".encode(), bcrypt.gensalt()).decode()
    
    # Check if manager exists
    existing_manager = supabase.table("users").select("*").eq("email", "manager@demo.com").execute()
    
    if existing_manager.data:
        manager_id = existing_manager.data[0]["id"]
        print(f"   Manager exists with ID: {manager_id}")
        # Update password
        supabase.table("users").update({
            "password_hash": manager_password_hash,
            "role": "manager"
        }).eq("id", manager_id).execute()
        print("   Password and role updated")
    else:
        result = supabase.table("users").insert({
            "id": manager_id,
            "email": "manager@demo.com",
            "first_name": "Demo",
            "last_name": "Manager",
            "role": "manager",
            "password_hash": manager_password_hash,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        if result.data:
            print(f"   ✅ Manager created with ID: {manager_id}")
        else:
            print("   ❌ Failed to create manager")
    
    # 3. Setup property
    print("\n3. Setting up Demo Hotel property...")
    
    # Check if Demo Hotel exists
    existing_prop = supabase.table("properties").select("*").eq("name", "Demo Hotel").execute()
    
    if existing_prop.data:
        property_id = existing_prop.data[0]["id"]
        print(f"   Property exists with ID: {property_id}")
    else:
        property_id = str(uuid.uuid4())
        result = supabase.table("properties").insert({
            "id": property_id,
            "name": "Demo Hotel",
            "address": "123 Demo Street, Demo City, DC 12345",
            "phone": "555-0001",
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        if result.data:
            print(f"   ✅ Property created with ID: {property_id}")
        else:
            print("   ❌ Failed to create property")
            return
    
    # 4. Assign manager to property
    print("\n4. Assigning manager to property...")
    
    # Check if assignment exists
    existing_assignment = (
        supabase.table("property_managers")
        .select("*")
        .eq("manager_id", manager_id)
        .eq("property_id", property_id)
        .execute()
    )
    
    if existing_assignment.data:
        print("   ✅ Manager already assigned to property")
    else:
        result = supabase.table("property_managers").insert({
            "id": str(uuid.uuid4()),
            "manager_id": manager_id,
            "property_id": property_id,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        if result.data:
            print("   ✅ Manager assigned to Demo Hotel")
        else:
            print("   ❌ Failed to assign manager")
    
    # 5. Create test applications
    print("\n5. Creating test applications...")
    
    test_apps = [
        {
            "first_name": "John",
            "last_name": "Smith",
            "phone": "555-1001",
            "position": "Front Desk"
        },
        {
            "first_name": "Jane",
            "last_name": "Doe",
            "phone": "555-1002",
            "position": "Housekeeping"
        }
    ]
    
    for app_data in test_apps:
        # Check if application exists
        existing_app = (
            supabase.table("job_applications")
            .select("*")
            .eq("property_id", property_id)
            .eq("first_name", app_data["first_name"])
            .eq("last_name", app_data["last_name"])
            .execute()
        )
        
        if not existing_app.data:
            result = supabase.table("job_applications").insert({
                "id": str(uuid.uuid4()),
                "property_id": property_id,
                "first_name": app_data["first_name"],
                "last_name": app_data["last_name"],
                "phone": app_data["phone"],
                "position": app_data["position"],
                "status": "pending",
                "personal_info": {
                    "address": "123 Test St",
                    "city": "Demo City",
                    "state": "DC",
                    "zip": "12345"
                },
                "submitted_at": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            
            if result.data:
                print(f"   ✅ Created application for {app_data['first_name']} {app_data['last_name']}")
            else:
                print(f"   ❌ Failed to create application for {app_data['first_name']}")
        else:
            print(f"   ℹ️  Application already exists for {app_data['first_name']} {app_data['last_name']}")
    
    # 6. Verify setup
    print("\n6. Verifying setup...")
    
    # Check manager
    manager = supabase.table("users").select("*").eq("email", "manager@demo.com").execute()
    if manager.data:
        print(f"   ✅ Manager: {manager.data[0]['email']} (role: {manager.data[0]['role']})")
        print(f"      Password hash exists: {bool(manager.data[0].get('password_hash'))}")
    
    # Check property assignment
    assignment = (
        supabase.table("property_managers")
        .select("*, properties(*)")
        .eq("manager_id", manager_id)
        .execute()
    )
    if assignment.data:
        print(f"   ✅ Manager assigned to: {assignment.data[0]['properties']['name']}")
    
    # Check applications
    apps = supabase.table("job_applications").select("*").eq("property_id", property_id).execute()
    print(f"   ✅ Applications: {len(apps.data) if apps.data else 0} found")
    
    print("\n" + "=" * 60)
    print("✅ SETUP COMPLETE!")
    print("=" * 60)
    print("\nTest Credentials:")
    print("  Admin: admin@hotelonboard.com / admin123")
    print("  Manager: manager@demo.com / demo123")
    print(f"  Property: Demo Hotel (ID: {property_id})")
    print("\nThese users use bcrypt passwords in the users table.")
    print("They should work with the backend authentication.")

if __name__ == "__main__":
    setup_users()