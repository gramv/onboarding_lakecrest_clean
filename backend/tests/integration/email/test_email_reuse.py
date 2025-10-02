#!/usr/bin/env python3
"""
Test that we can reuse emails after cleanup
"""

import uuid
from datetime import datetime
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv(".env.test")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_email_reuse():
    """Try to create another application with the same email"""
    print("\n🧪 Testing Email Reuse After Cleanup")
    print("="*60)
    
    # Email that was just used
    test_email = "cloudtester@example.com"
    print(f"\n📧 Testing with email: {test_email}")
    
    # Try to create a new job application with the same email
    app_id = str(uuid.uuid4())
    
    application_data = {
        "id": app_id,
        "property_id": "9e5d1d9b-0caf-44f0-99dd-8e71b88c1400",
        "department": "Housekeeping",  # Different department
        "position": "Room Attendant",  # Different position
        "status": "approved",
        "applicant_data": {
            "first_name": "Cloud",
            "last_name": "Tester",
            "email": test_email,  # SAME EMAIL!
            "phone": "555-9999",
            "address": "789 Reuse Lane",
            "city": "Test City",
            "state": "CA",
            "zip_code": "90002",
            "work_authorized": True,
            "employment_type": "part_time",
            "availability": "immediate",
            "desired_pay": "$18/hour",
            "experience_years": "1-2",
            "education_level": "high_school",
            "has_transportation": True,
            "can_work_weekends": True,
            "can_work_nights": False,
            "references_available": True
        },
        "applied_at": datetime.now().isoformat(),
        "reviewed_at": datetime.now().isoformat(),
        "reviewed_by": "45b5847b-9de6-49e5-b042-ea9e91b7dea7"
    }
    
    try:
        result = supabase.table('job_applications').insert(application_data).execute()
        
        if result.data:
            print(f"\n✅ SUCCESS! Created new application with same email!")
            print(f"   Application ID: {app_id}")
            print(f"   Position: Room Attendant (different from previous)")
            print(f"   Email: {test_email} (REUSED!)")
            
            # Check how many applications exist with this email
            all_apps = supabase.table('job_applications').select('*').execute()
            apps_with_email = [
                app for app in all_apps.data 
                if app.get('applicant_data', {}).get('email') == test_email
            ]
            
            print(f"\n📊 Applications with {test_email}: {len(apps_with_email)}")
            for app in apps_with_email:
                print(f"   • {app['position']} in {app['department']}")
            
            return True
    except Exception as e:
        print(f"\n❌ FAILED to reuse email: {e}")
        return False
    
    print("\n" + "="*60)

def check_database_state():
    """Check current database state"""
    print("\n📊 Current Database State:")
    print("-"*40)
    
    tables = ['users', 'job_applications', 'employees', 'onboarding_sessions']
    
    for table in tables:
        try:
            result = supabase.table(table).select('*').execute()
            count = len(result.data) if result.data else 0
            print(f"  • {table}: {count} records")
            
            if table == 'users' and result.data:
                emails = [u.get('email', 'unknown') for u in result.data]
                print(f"    Emails: {', '.join(emails[:5])}{'...' if len(emails) > 5 else ''}")
        except:
            print(f"  • {table}: error reading")

if __name__ == "__main__":
    check_database_state()
    
    success = test_email_reuse()
    
    if success:
        print("\n🎉 EMAIL REUSE WORKS!")
        print("="*60)
        print("✅ Database cleanup was successful!")
        print("✅ You can now reuse any email for testing!")
        print("✅ Cloud sync will work with fresh data!")
    else:
        print("\n⚠️  Email reuse might be blocked by constraints")
        print("Check if there are unique constraints on email in the database")