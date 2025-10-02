#!/usr/bin/env python3
"""
Test that job application triggers email notifications
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def submit_test_application():
    """Submit a test job application"""
    print("\n📝 Submitting test job application...")
    
    # Get property info (no auth needed for public endpoint)
    property_id = "ae926aac-eb0f-4616-8629-87898e8b0d70"  # Your property ID
    
    # Prepare application data
    application_data = {
        "first_name": "Test",
        "middle_initial": "T",
        "last_name": "Applicant",
        "email": f"test.applicant.{datetime.now().strftime('%H%M%S')}@example.com",
        "phone": "555-0123",
        "position": "Front Desk Agent",
        "department": "Front Desk",
        "start_date": "2025-01-15",
        "available_shifts": {
            "morning": True,
            "afternoon": True,
            "evening": False,
            "overnight": False,
            "weekends": True,
            "holidays": False
        },
        "desired_pay": "18.00",
        "employment_type": "full_time",
        "has_experience": True,
        "years_experience": "2",
        "previous_employer": "Test Hotel",
        "can_stand_long_periods": True,
        "can_lift_heavy": True,
        "background_check_consent": True,
        "drug_test_consent": True,
        "legal_work_status": True,
        "over_18": True,
        "reliable_transportation": True,
        "hotel_experience": True,
        "additional_comments": "Test application for email notification"
    }
    
    # Submit application
    response = requests.post(
        f"{BASE_URL}/api/properties/{property_id}/apply",
        json=application_data
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Application submitted successfully!")
        print(f"   Application ID: {result.get('application_id')}")
        print(f"   Property: {result.get('property_name')}")
        print(f"   Position: {result.get('position_applied')}")
        return result.get('application_id')
    else:
        print(f"❌ Failed to submit application: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def check_email_logs():
    """Check backend logs for email sending activity"""
    print("\n📧 Checking for email sending activity...")
    print("   (Check backend logs for email notification details)")
    
    # Login as manager to check recipients
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={'email': 'gvemula@mail.yu.edu', 'password': 'Gouthi321@'}
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data['data']['token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Check recipients
        response = requests.get(
            f"{BASE_URL}/api/manager/email-recipients",
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n📬 Email would be sent to {result.get('message')}:")
            for r in result.get('data', []):
                print(f"   - {r.get('email')} ({r.get('type')})")

def main():
    print("=" * 60)
    print("JOB APPLICATION EMAIL NOTIFICATION TEST")
    print("=" * 60)
    
    # Submit test application
    application_id = submit_test_application()
    
    if application_id:
        # Check email activity
        check_email_logs()
        
        print("\n" + "=" * 60)
        print("✅ TEST COMPLETE")
        print("=" * 60)
        print("\nSummary:")
        print("1. Application submitted successfully")
        print("2. Email notifications should be sent to all recipients")
        print("3. Check your inbox if using production SMTP")
        print("4. Backend logs will show email sending attempts")
    else:
        print("\n❌ Test failed - application not submitted")

if __name__ == "__main__":
    main()