#!/usr/bin/env python3
"""Test complete flow: application submission, approval, and onboarding link."""

import json
import requests
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000"

def submit_application():
    """Submit a job application for Goutam"""
    application_data = {
        "first_name": "Goutam",
        "middle_initial": "",
        "last_name": "Vemula",
        "email": "goutamramv@gmail.com",
        "phone": "555-0123",
        "phone_is_cell": True,
        "phone_is_home": False,
        "secondary_phone": "",
        "secondary_phone_is_cell": False,
        "secondary_phone_is_home": False,
        "address": "123 Main Street",
        "apartment_unit": "",
        "city": "San Francisco",
        "state": "CA",
        "zip_code": "94105",
        "department": "Engineering",
        "position": "Software Engineer",
        "salary_desired": "100000",
        "work_authorized": "yes",
        "sponsorship_required": "no",
        "age_verification": True,
        "conviction_record": {
            "has_conviction": False,
            "explanation": None
        },
        "start_date": "2025-01-15",
        "shift_preference": "flexible",
        "employment_type": "full_time",
        "seasonal_start_date": None,
        "seasonal_end_date": None,
        "previous_hotel_employment": False,
        "previous_hotel_details": None,
        "how_heard": "website",
        "how_heard_detailed": "Company website",
        "personal_reference": {
            "name": "John Smith",
            "years_known": "5",
            "phone": "555-9999",
            "relationship": "Professional colleague"
        },
        "military_service": {
            "branch": None,
            "from_date": None,
            "to_date": None,
            "rank_at_discharge": None,
            "type_of_discharge": None,
            "disabilities_related": None
        },
        "education_history": [
            {
                "school_name": "University of California",
                "location": "Berkeley, CA",
                "years_attended": "2015-2019",
                "graduated": True,
                "degree_received": "Bachelor of Science in Computer Science"
            }
        ],
        "employment_history": [
            {
                "company_name": "Tech Company",
                "phone": "555-8888",
                "address": "456 Tech Way, San Francisco, CA",
                "supervisor": "Jane Doe",
                "job_title": "Junior Developer",
                "starting_salary": "80000",
                "ending_salary": "95000",
                "from_date": "2019-06",
                "to_date": "2024-12",
                "responsibilities": "Full stack development",
                "reason_for_leaving": "Career growth",
                "may_contact": True
            }
        ],
        "skills_languages_certifications": "Python, JavaScript, React, AWS Certified",
        "voluntary_self_identification": None,
        "experience_years": "2-5",
        "hotel_experience": "no",
        "additional_comments": ""
    }
    
    response = requests.post(
        f"{BASE_URL}/apply/test-prop-001",
        json=application_data
    )
    
    if response.status_code == 200:
        data = response.json()
        logger.info(f"✅ Application submitted successfully!")
        logger.info(f"   Application ID: {data.get('application_id')}")
        return data.get('application_id')
    else:
        logger.error(f"❌ Failed to submit application: {response.status_code}")
        logger.error(f"   Response: {response.text}")
        return None

def login_as_manager():
    """Login as manager"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": "manager@demo.com",
            "password": "Password123!"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        logger.info("✅ Logged in as manager")
        return data.get('access_token')
    else:
        logger.error(f"❌ Failed to login: {response.text}")
        return None

def get_applications(token):
    """Get all applications for the property"""
    response = requests.get(
        f"{BASE_URL}/api/hr/applications",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        applications = data.get('applications', [])
        logger.info(f"✅ Found {len(applications)} applications")
        
        # Find Goutam's application
        for app in applications:
            if app.get('first_name') == 'Goutam' and app.get('last_name') == 'Vemula':
                logger.info(f"   Found Goutam's application: {app.get('id')}")
                return app.get('id')
        return None
    else:
        logger.error(f"❌ Failed to get applications: {response.text}")
        return None

def approve_application(token, app_id):
    """Approve the application"""
    response = requests.post(
        f"{BASE_URL}/applications/{app_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
        json={"send_email": True}
    )
    
    if response.status_code == 200:
        data = response.json()
        logger.info("✅ Application approved successfully!")
        
        # Extract the onboarding token
        onboarding_token = data.get('onboarding_token')
        if onboarding_token:
            logger.info(f"   Onboarding token: {onboarding_token}")
            logger.info(f"   Onboarding URL: http://localhost:3000/onboard?token={onboarding_token}")
        else:
            logger.warning("   No onboarding token in response")
        
        return onboarding_token
    else:
        logger.error(f"❌ Failed to approve application: {response.text}")
        return None

def test_onboarding_welcome(token):
    """Test the onboarding welcome endpoint"""
    response = requests.get(
        f"{BASE_URL}/api/onboarding/welcome?token={token}"
    )
    
    if response.status_code == 200:
        data = response.json()
        logger.info("✅ Welcome endpoint working!")
        logger.info(f"   Welcome message: {data.get('message')}")
        logger.info(f"   Employee name: {data.get('employee_name')}")
        logger.info(f"   Property: {data.get('property_name')}")
        return True
    else:
        logger.error(f"❌ Failed to get welcome data: {response.text}")
        return False

def main():
    """Run the complete test flow"""
    logger.info("Starting complete flow test...")
    logger.info("=" * 60)
    
    # Step 1: Submit application
    logger.info("\n1. Submitting job application for Goutam Vemula...")
    app_id = submit_application()
    if not app_id:
        logger.error("Failed to submit application. Exiting.")
        return
    
    # Step 2: Login as manager
    logger.info("\n2. Logging in as manager...")
    token = login_as_manager()
    if not token:
        logger.error("Failed to login. Exiting.")
        return
    
    # Step 3: Get applications (in case we need to find the ID)
    logger.info("\n3. Getting applications...")
    if not app_id:
        app_id = get_applications(token)
        if not app_id:
            logger.error("Could not find Goutam's application. Exiting.")
            return
    
    # Step 4: Approve the application
    logger.info(f"\n4. Approving application {app_id}...")
    onboarding_token = approve_application(token, app_id)
    if not onboarding_token:
        logger.error("Failed to approve application. Exiting.")
        return
    
    # Step 5: Test the onboarding welcome
    logger.info(f"\n5. Testing onboarding welcome endpoint...")
    if test_onboarding_welcome(onboarding_token):
        logger.info("\n" + "=" * 60)
        logger.info("✅ ALL TESTS PASSED!")
        logger.info(f"\n📧 Email should be logged in console (check backend logs)")
        logger.info(f"🔗 Onboarding URL: http://localhost:3000/onboard?token={onboarding_token}")
        logger.info(f"👤 Should display: 'Welcome Goutam!'")
    else:
        logger.error("\n❌ Welcome endpoint test failed")

if __name__ == "__main__":
    main()