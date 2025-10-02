#!/usr/bin/env python3
"""
Setup test data using Supabase directly
"""

import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client
import uuid
from datetime import datetime

# Load environment variables
load_dotenv('.env.test')

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

def get_supabase() -> Client:
    """Get Supabase client"""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

async def setup_test_data():
    """Setup test data in Supabase"""
    supabase = get_supabase()
    
    print("Setting up test data in Supabase...")
    
    try:
        # 1. Create test property with UUID
        print("\n1. Creating test property...")
        property_id = str(uuid.uuid4())
        
        property_data = {
            "id": property_id,
            "name": "Demo Hotel",
            "address": "123 Demo Street, Demo City, DC 12345",
            "phone": "555-0001",
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Check if Demo Hotel already exists
        existing = supabase.table("properties").select("*").eq("name", "Demo Hotel").execute()
        
        if existing.data:
            property_id = existing.data[0]["id"]
            print(f"ℹ️  Property already exists with ID: {property_id}")
        else:
            result = supabase.table("properties").insert(property_data).execute()
            if result.data:
                print(f"✅ Property created with ID: {property_id}")
            else:
                print("❌ Failed to create property")
                return
        
        # 2. Create admin user using Supabase Auth
        print("\n2. Creating admin user...")
        try:
            # Sign up admin
            auth_result = supabase.auth.sign_up({
                "email": "admin@hotelonboard.com",
                "password": "admin123",
                "options": {
                    "data": {
                        "first_name": "System",
                        "last_name": "Admin",
                        "role": "admin"
                    }
                }
            })
            
            if auth_result.user:
                print(f"✅ Admin created with ID: {auth_result.user.id}")
                admin_id = auth_result.user.id
                
                # Update users table with admin role
                supabase.table("users").upsert({
                    "id": admin_id,
                    "email": "admin@hotelonboard.com",
                    "first_name": "System",
                    "last_name": "Admin",
                    "role": "admin",
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            else:
                print("ℹ️  Admin might already exist")
                # Try to sign in
                signin = supabase.auth.sign_in_with_password({
                    "email": "admin@hotelonboard.com",
                    "password": "admin123"
                })
                if signin.user:
                    admin_id = signin.user.id
                    print(f"   Found existing admin ID: {admin_id}")
                else:
                    admin_id = None
        except Exception as e:
            print(f"   Admin auth error: {str(e)}")
            admin_id = None
        
        # 3. Create manager user
        print("\n3. Creating manager user...")
        try:
            # Sign up manager
            manager_result = supabase.auth.sign_up({
                "email": "manager@demo.com",
                "password": "demo123",
                "options": {
                    "data": {
                        "first_name": "Demo",
                        "last_name": "Manager",
                        "role": "manager"
                    }
                }
            })
            
            if manager_result.user:
                print(f"✅ Manager created with ID: {manager_result.user.id}")
                manager_id = manager_result.user.id
                
                # Update users table with manager details
                supabase.table("users").upsert({
                    "id": manager_id,
                    "email": "manager@demo.com",
                    "first_name": "Demo",
                    "last_name": "Manager",
                    "role": "manager",
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            else:
                print("ℹ️  Manager might already exist")
                # Try to sign in
                signin = supabase.auth.sign_in_with_password({
                    "email": "manager@demo.com",
                    "password": "demo123"
                })
                if signin.user:
                    manager_id = signin.user.id
                    print(f"   Found existing manager ID: {manager_id}")
                else:
                    manager_id = None
        except Exception as e:
            print(f"   Manager auth error: {str(e)}")
            # Check if manager exists in users table
            existing_manager = supabase.table("users").select("*").eq("email", "manager@demo.com").execute()
            if existing_manager.data:
                manager_id = existing_manager.data[0]["id"]
                print(f"   Found manager in users table: {manager_id}")
            else:
                manager_id = None
        
        # 4. Assign manager to property
        if manager_id:
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
                print("ℹ️  Manager already assigned to property")
            else:
                assignment_data = {
                    "id": str(uuid.uuid4()),
                    "manager_id": manager_id,
                    "property_id": property_id,
                    "created_at": datetime.utcnow().isoformat()
                }
                
                result = supabase.table("property_managers").insert(assignment_data).execute()
                if result.data:
                    print("✅ Manager assigned to Demo Hotel")
                else:
                    print("❌ Failed to assign manager")
        
        # 5. Create test applications
        print("\n5. Creating test applications...")
        test_applications = [
            {
                "id": str(uuid.uuid4()),
                "property_id": property_id,
                "first_name": "John",
                "last_name": "Smith",
                "email": "john.smith@example.com",
                "phone": "555-1001",
                "position": "Front Desk",
                "status": "pending",
                "personal_info": {
                    "address": "456 Test Ave",
                    "city": "Demo City",
                    "state": "DC",
                    "zip": "12345"
                },
                "submitted_at": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "property_id": property_id,
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "jane.doe@example.com",
                "phone": "555-1002",
                "position": "Housekeeping",
                "status": "pending",
                "personal_info": {
                    "address": "789 Sample St",
                    "city": "Demo City",
                    "state": "DC",
                    "zip": "12345"
                },
                "submitted_at": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat()
            }
        ]
        
        for app in test_applications:
            # Check if application exists
            existing = (
                supabase.table("job_applications")
                .select("*")
                .eq("email", app["email"])
                .eq("property_id", property_id)
                .execute()
            )
            
            if not existing.data:
                result = supabase.table("job_applications").insert(app).execute()
                if result.data:
                    print(f"   ✅ Created application for {app['first_name']} {app['last_name']}")
                else:
                    print(f"   ❌ Failed to create application for {app['first_name']}")
            else:
                print(f"   ℹ️  Application already exists for {app['first_name']} {app['last_name']}")
        
        # 6. Create test employee
        print("\n6. Creating test employee...")
        employee_data = {
            "id": str(uuid.uuid4()),
            "property_id": property_id,
            "first_name": "Test",
            "last_name": "Employee",
            "email": "test.employee@example.com",
            "phone": "555-2001",
            "position": "Server",
            "status": "active",
            "onboarding_status": "completed",
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Check if employee exists
        existing_emp = (
            supabase.table("employees")
            .select("*")
            .eq("email", employee_data["email"])
            .eq("property_id", property_id)
            .execute()
        )
        
        if not existing_emp.data:
            result = supabase.table("employees").insert(employee_data).execute()
            if result.data:
                print("✅ Test employee created")
            else:
                print("❌ Failed to create employee")
        else:
            print("ℹ️  Employee already exists")
        
        # 7. Verify the setup
        print("\n7. Verifying setup...")
        
        # Check property
        prop = supabase.table("properties").select("*").eq("id", property_id).execute()
        if prop.data:
            print(f"✅ Property: {prop.data[0]['name']}")
        
        # Check manager
        if manager_id:
            manager = supabase.table("users").select("*").eq("id", manager_id).execute()
            if manager.data:
                print(f"✅ Manager: {manager.data[0]['email']} (role: {manager.data[0].get('role', 'unknown')})")
            
            # Check assignment
            assignment = (
                supabase.table("property_managers")
                .select("*, properties(*)")
                .eq("manager_id", manager_id)
                .execute()
            )
            if assignment.data:
                print(f"✅ Manager assigned to: {assignment.data[0]['properties']['name']}")
        
        # Check applications
        apps = supabase.table("job_applications").select("*").eq("property_id", property_id).execute()
        print(f"✅ Applications: {len(apps.data) if apps.data else 0} found")
        
        # Check employees
        emps = supabase.table("employees").select("*").eq("property_id", property_id).execute()
        print(f"✅ Employees: {len(emps.data) if emps.data else 0} found")
        
        print("\n" + "=" * 60)
        print("✅ TEST DATA SETUP COMPLETE!")
        print("=" * 60)
        print("\nTest Credentials:")
        print("  Admin: admin@hotelonboard.com / admin123")
        print("  Manager: manager@demo.com / demo123")
        print(f"  Property: Demo Hotel (ID: {property_id})")
        print("\nYou can now run the manager login and isolation tests.")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

def main():
    asyncio.run(setup_test_data())

if __name__ == "__main__":
    main()