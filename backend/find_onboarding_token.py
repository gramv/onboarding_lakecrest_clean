#!/usr/bin/env python3
"""
Script to find onboarding token for a specific email address
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Using service key for admin access

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def find_onboarding_info(email: str):
    """Find onboarding information for a given email"""

    print(f"Searching for onboarding information for: {email}")
    print("-" * 50)

    # 1. Check job_applications table - using personal_information JSON field
    print("\n1. Checking job_applications table...")
    applications_data = []
    try:
        # First get all applications and check the personal_information field
        all_applications = supabase.table('job_applications').select('*').execute()
        for app in all_applications.data:
            personal_info = app.get('personal_information', {})
            if isinstance(personal_info, dict) and personal_info.get('email') == email:
                applications_data.append(app)

        if applications_data:
            print(f"Found {len(applications_data)} job application(s)")
            for app in applications_data:
                print(f"  - Application ID: {app.get('id')}")
                print(f"    Status: {app.get('status')}")
                print(f"    Property: {app.get('property_id')}")
                print(f"    First Name: {app.get('personal_information', {}).get('firstName')}")
                print(f"    Last Name: {app.get('personal_information', {}).get('lastName')}")
                print(f"    Created: {app.get('created_at')}")
        else:
            print("  No job applications found")
    except Exception as e:
        print(f"  Error querying job_applications: {e}")

    # 2. Check employees table
    print("\n2. Checking employees table...")
    employees_data = []
    try:
        # Get all employees and check personal_information field
        all_employees = supabase.table('employees').select('*').execute()
        for emp in all_employees.data:
            # Check if email matches in personal_information
            personal_info = emp.get('personal_information', {})
            if isinstance(personal_info, dict) and personal_info.get('email') == email:
                employees_data.append(emp)

        if employees_data:
            print(f"Found {len(employees_data)} employee record(s)")
            for emp in employees_data:
                print(f"  - Employee ID: {emp.get('id')}")
                print(f"    Name: {emp.get('first_name')} {emp.get('last_name')}")
                print(f"    Status: {emp.get('status')}")
                print(f"    Property: {emp.get('property_id')}")
                print(f"    Created: {emp.get('created_at')}")
        else:
            print("  No employee records found")
    except Exception as e:
        print(f"  Error querying employees: {e}")

    # 3. Check onboarding_sessions table
    print("\n3. Checking onboarding_sessions table...")
    try:
        all_sessions = []

        # First try to find by employee ID if we found employees
        if employees_data:
            for emp in employees_data:
                sessions = supabase.table('onboarding_sessions').select('*').eq('employee_id', emp['id']).execute()
                if sessions.data:
                    all_sessions.extend(sessions.data)

        # Also check all onboarding sessions directly
        all_onboarding_sessions = supabase.table('onboarding_sessions').select('*').execute()

        # Remove duplicates based on token
        unique_sessions = {s['token']: s for s in all_sessions}.values() if all_sessions else []

        if unique_sessions:
            print(f"Found {len(unique_sessions)} onboarding session(s)")
            for session in unique_sessions:
                print(f"\n  Session Details:")
                print(f"    Token: {session.get('token')}")
                print(f"    Status: {session.get('status')}")
                print(f"    Employee ID: {session.get('employee_id')}")
                print(f"    Expires: {session.get('expires_at')}")
                print(f"    Created: {session.get('created_at')}")
                print(f"\n  🔗 Onboarding URL:")
                print(f"    http://localhost:3000/onboard?token={session.get('token')}")
                print("-" * 50)
        else:
            print("  No onboarding sessions found for this email")

            # If we have an employee but no session, we might need to create one
            if employees_data:
                print("\n  Note: Employee exists but no onboarding session found.")
                print("  You may need to create a new onboarding session for this employee.")

        # Display all recent onboarding sessions for context
        print("\n  Recent onboarding sessions (all):")
        if all_onboarding_sessions.data:
            # Sort by created_at and show last 5
            sorted_sessions = sorted(all_onboarding_sessions.data,
                                   key=lambda x: x.get('created_at', ''),
                                   reverse=True)[:5]
            for session in sorted_sessions:
                employee_id = session.get('employee_id')
                token = session.get('token')
                # Try to get employee info
                emp_info = ""
                if employee_id:
                    emp = supabase.table('employees').select('*').eq('id', employee_id).execute()
                    if emp.data:
                        personal_info = emp.data[0].get('personal_information', {})
                        if personal_info:
                            emp_info = f" ({personal_info.get('firstName', '')} {personal_info.get('lastName', '')} - {personal_info.get('email', 'no email')})"

                if token:
                    print(f"    - Token length: {len(token)}, Token: {token[:50]}... Employee: {employee_id}{emp_info}")
                else:
                    print(f"    - Token: NONE! Employee: {employee_id}{emp_info}")
                print(f"      Status: {session.get('status')} | Created: {session.get('created_at')}")
                if token:
                    print(f"      🔗 URL: http://localhost:3000/onboard?token={token}")

    except Exception as e:
        print(f"  Error querying onboarding_sessions: {e}")

if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "gthmvemula@gmail.com"
    find_onboarding_info(email)

    # Also search for similar emails
    print("\n" + "="*50)
    print("Searching for similar emails containing 'gouthm' or 'vemula':")
    print("="*50)

    try:
        # Check job applications
        all_apps = supabase.table('job_applications').select('*').execute()
        similar_emails = []
        for app in all_apps.data:
            personal_info = app.get('personal_information', {})
            if personal_info and isinstance(personal_info, dict):
                app_email = personal_info.get('email', '')
                if app_email and ('gouthm' in app_email.lower() or 'vemula' in app_email.lower() or 'gthm' in app_email.lower()):
                    similar_emails.append((app_email, 'job_application', app.get('id')))

        # Check employees
        all_emps = supabase.table('employees').select('*').execute()
        for emp in all_emps.data:
            personal_info = emp.get('personal_information', {})
            if personal_info and isinstance(personal_info, dict):
                emp_email = personal_info.get('email', '')
                if emp_email and ('gouthm' in emp_email.lower() or 'vemula' in emp_email.lower() or 'gthm' in emp_email.lower()):
                    similar_emails.append((emp_email, 'employee', emp.get('id')))

        if similar_emails:
            print("\nFound similar emails:")
            for email, source, record_id in similar_emails:
                print(f"  - {email} (from {source}, ID: {record_id})")
        else:
            print("\nNo similar emails found")

    except Exception as e:
        print(f"Error searching for similar emails: {e}")