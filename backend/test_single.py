#!/usr/bin/env python3
"""
Quick single test to check API with logging
"""

import requests
import json
from datetime import datetime, timedelta

API_BASE_URL = "http://localhost:8000"
TEST_PROPERTY_ID = "test-property-001"

def create_test_application():
    """Create a test application with Spanish phone"""
    return {
        # Personal Information
        "first_name": "María",
        "middle_initial": "",
        "last_name": "González",
        "email": f"test_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com",
        "phone": "+52 55 1234 5678",  # Mexican phone
        "phone_is_cell": True,
        "phone_is_home": False,
        "secondary_phone": "",
        "secondary_phone_is_cell": False,
        "secondary_phone_is_home": False,
        "address": "123 Test Street",
        "apartment_unit": "",
        "city": "Test City",
        "state": "TX",
        "zip_code": "12345",

        # Position Information
        "department": "housekeeping",
        "position": "housekeeper",
        "salary_desired": "15",

        # Work Authorization & Legal
        "work_authorized": "yes",
        "sponsorship_required": "no",
        "age_verification": True,
        "conviction_record": {
            "has_conviction": False,
            "explanation": None
        },

        # Availability
        "start_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
        "shift_preference": "flexible",
        "employment_type": "full_time",
        "seasonal_start_date": None,
        "seasonal_end_date": None,

        # Previous Hotel Employment
        "previous_hotel_employment": False,
        "previous_hotel_details": None,

        # How did you hear about us?
        "how_heard": "website",
        "how_heard_detailed": "Google search",

        # References
        "personal_reference": {
            "name": "John Smith",
            "years_known": "5",
            "phone": "(555) 987-6543",
            "relationship": "Friend"
        },

        # Military Service
        "military_service": {
            "branch": None,
            "from_date": None,
            "to_date": None,
            "rank_at_discharge": None,
            "type_of_discharge": None,
            "disabilities_related": None
        },

        # Education History
        "education_history": [
            {
                "school_name": "Test High School",
                "location": "Test City, TX",
                "years_attended": "4",
                "graduated": True,
                "degree_received": "High School Diploma"
            }
        ],

        # Employment History
        "employment_history": [
            {
                "company_name": "Previous Company",
                "phone": "(555) 111-2222",
                "address": "456 Previous St",
                "supervisor": "Jane Manager",
                "job_title": "Cleaner",
                "starting_salary": "12",
                "ending_salary": "14",
                "from_date": "2020-01",
                "to_date": "2023-12",
                "reason_for_leaving": "Better opportunity",
                "may_contact": True
            }
        ],

        # Skills and Additional Info
        "skills_languages_certifications": "English, Basic Spanish",
        "voluntary_self_identification": None,
        "experience_years": "2-5",
        "hotel_experience": "no",
        "additional_comments": "Eager to learn and grow with the team"
    }

def main():
    """Run single test"""
    print("Testing API with Spanish phone number...")
    print("="*60)

    application = create_test_application()
    print(f"Testing phone: {application['phone']}")
    print(f"Applicant: {application['first_name']} {application['last_name']}")

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/apply/{TEST_PROPERTY_ID}",
            json=application,
            headers={"Content-Type": "application/json"},
            timeout=5
        )

        print(f"\nStatus Code: {response.status_code}")

        if response.status_code == 200:
            print("✅ SUCCESS!")
            result = response.json()
            print(f"Application ID: {result.get('application_id', 'N/A')}")
        else:
            print("❌ FAILED")
            print("Response:")
            print(json.dumps(response.json(), indent=2))

    except Exception as e:
        print(f"❌ Exception: {str(e)}")

if __name__ == "__main__":
    main()