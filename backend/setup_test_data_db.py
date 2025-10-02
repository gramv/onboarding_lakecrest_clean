#!/usr/bin/env python3
"""
Setup test data directly in database
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import bcrypt

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
load_dotenv('.env.test')

from app.supabase_service_enhanced import EnhancedSupabaseService

async def setup_test_data():
    """Setup test data directly in database"""
    supabase = EnhancedSupabaseService()
    
    print("Setting up test data in database...")
    
    try:
        # 1. Create test property
        print("\n1. Creating test property...")
        property_data = {
            "id": "test-prop-001",
            "name": "Demo Hotel",
            "address": "123 Demo Street, Demo City, DC 12345",
            "phone": "555-0001"
        }
        
        result = await supabase.create_property(property_data)
        if result:
            print("✅ Property created/exists")
        else:
            print("ℹ️  Property might already exist")
        
        # 2. Create admin user
        print("\n2. Creating admin user...")
        admin_password = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
        
        admin_data = {
            "email": "admin@hotelonboard.com",
            "password_hash": admin_password,
            "first_name": "System",
            "last_name": "Admin",
            "role": "admin"
        }
        
        admin_result = await supabase.create_user(admin_data)
        if admin_result:
            print(f"✅ Admin created with ID: {admin_result}")
        else:
            print("ℹ️  Admin might already exist")
            # Try to get existing admin
            existing = await supabase.get_user_by_email("admin@hotelonboard.com")
            if existing:
                print(f"   Found existing admin ID: {existing.get('id')}")
        
        # 3. Create manager user
        print("\n3. Creating manager user...")
        manager_password = bcrypt.hashpw("demo123".encode(), bcrypt.gensalt()).decode()
        
        manager_data = {
            "email": "manager@demo.com",
            "password_hash": manager_password,
            "first_name": "Demo",
            "last_name": "Manager",
            "role": "manager"
        }
        
        manager_result = await supabase.create_user(manager_data)
        if manager_result:
            print(f"✅ Manager created with ID: {manager_result}")
            manager_id = manager_result
        else:
            print("ℹ️  Manager might already exist")
            # Try to get existing manager
            existing = await supabase.get_user_by_email("manager@demo.com")
            if existing:
                manager_id = existing.get('id')
                print(f"   Found existing manager ID: {manager_id}")
                
                # Update password if needed
                update_result = await supabase.update_user(
                    manager_id,
                    {"password_hash": manager_password}
                )
                if update_result:
                    print("   ✅ Password updated")
            else:
                manager_id = None
        
        # 4. Assign manager to property
        if manager_id:
            print("\n4. Assigning manager to property...")
            assignment_result = await supabase.assign_manager_to_property(
                manager_id, "test-prop-001"
            )
            
            if assignment_result:
                print("✅ Manager assigned to Demo Hotel")
            else:
                print("ℹ️  Assignment might already exist")
        
        # 5. Create some test applications for the property
        print("\n5. Creating test applications...")
        test_applications = [
            {
                "id": f"app-demo-001",
                "property_id": "test-prop-001",
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
                }
            },
            {
                "id": f"app-demo-002",
                "property_id": "test-prop-001",
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
                }
            }
        ]
        
        for app in test_applications:
            result = await supabase.create_job_application(app)
            if result:
                print(f"   ✅ Created application for {app['first_name']} {app['last_name']}")
            else:
                print(f"   ℹ️  Application might already exist for {app['first_name']} {app['last_name']}")
        
        # 6. Create test employee
        print("\n6. Creating test employee...")
        employee_data = {
            "id": "emp-demo-001",
            "property_id": "test-prop-001",
            "first_name": "Test",
            "last_name": "Employee",
            "email": "test.employee@example.com",
            "phone": "555-2001",
            "position": "Server",
            "status": "active",
            "onboarding_status": "completed"
        }
        
        emp_result = await supabase.create_employee(employee_data)
        if emp_result:
            print("✅ Test employee created")
        else:
            print("ℹ️  Employee might already exist")
        
        # 7. Verify the setup
        print("\n7. Verifying setup...")
        
        # Check manager can be retrieved
        manager = await supabase.get_user_by_email("manager@demo.com")
        if manager:
            print(f"✅ Manager found: {manager.get('email')}")
            
            # Check property assignment
            properties = await supabase.get_manager_properties(manager.get('id'))
            if properties:
                print(f"✅ Manager assigned to: {[p.get('name') for p in properties]}")
            else:
                print("⚠️  No properties assigned to manager")
        else:
            print("❌ Manager not found in database")
        
        # Check applications
        apps = await supabase.get_applications_by_property("test-prop-001")
        print(f"✅ Found {len(apps) if apps else 0} applications for Demo Hotel")
        
        # Check employees
        emps = await supabase.get_employees_by_property("test-prop-001")
        print(f"✅ Found {len(emps) if emps else 0} employees for Demo Hotel")
        
        print("\n✅ Test data setup complete!")
        print("\nTest Credentials:")
        print("  Admin: admin@hotelonboard.com / admin123")
        print("  Manager: manager@demo.com / demo123")
        print("  Property: Demo Hotel (test-prop-001)")
        
    except Exception as e:
        print(f"\n❌ Error setting up test data: {str(e)}")
        import traceback
        traceback.print_exc()

async def main():
    await setup_test_data()

if __name__ == "__main__":
    asyncio.run(main())