#!/usr/bin/env python3
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

# Get employees with their onboarding progress
print("Checking for employees in database...")

try:
    # Get all employees
    employees_result = supabase.table('employees').select('*').execute()
    employees = employees_result.data if employees_result else []

    print(f"\nFound {len(employees)} employees:")
    for emp in employees[:5]:  # Show first 5
        print(f"  - ID: {emp.get('id')}, Email: {emp.get('email')}, Property: {emp.get('property_id')}")

    # Get all onboarding progress records
    progress_result = supabase.table('onboarding_progress').select('*').execute()
    progress = progress_result.data if progress_result else []

    print(f"\nFound {len(progress)} onboarding progress records")

    # Find an employee with some progress
    if employees:
        test_emp = employees[0]
        print(f"\n✅ Using test employee: {test_emp.get('id')} ({test_emp.get('email')})")
        print(f"   Property ID: {test_emp.get('property_id')}")
    else:
        print("\n❌ No employees found. Creating test employee...")

        # Create a test employee
        new_emp = {
            'id': 'test_pdf_001',
            'email': 'test.pdf@example.com',
            'first_name': 'Test',
            'last_name': 'PDFUser',
            'property_id': 'test_property',
            'status': 'onboarding'
        }

        result = supabase.table('employees').insert(new_emp).execute()
        if result.data:
            print(f"✅ Created test employee: {new_emp['id']}")
        else:
            print("❌ Failed to create test employee")

    # Also check properties
    props_result = supabase.table('properties').select('*').execute()
    properties = props_result.data if props_result else []

    print(f"\nFound {len(properties)} properties:")
    for prop in properties[:3]:
        print(f"  - ID: {prop.get('id')}, Name: {prop.get('name')}")

except Exception as e:
    print(f"❌ Error: {e}")