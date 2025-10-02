#!/usr/bin/env python3
"""
Final test for Spanish job application submission
Using real property ID from the system
"""

import requests
import json
from datetime import datetime, timedelta

API_BASE_URL = "http://localhost:8000"

def login_and_get_property():
    """Login as manager and get their property ID"""
    print("Logging in as manager...")

    login_response = requests.post(
        f"{API_BASE_URL}/api/auth/login",
        json={
            "email": "gvemula@mail.yu.edu",
            "password": "Gouthi321@"
        }
    )

    if login_response.status_code != 200:
        print(f"Login failed: {login_response.json()}")
        return None, None

    auth_data = login_response.json()
    # Token is in data.token
    data = auth_data.get("data", {})
    token = data.get("token")
    user = data.get("user", {})
    property_id = user.get("property_id")

    print(f"✅ Logged in successfully")
    print(f"   Manager: {user.get('first_name')} {user.get('last_name')}")
    print(f"   Property ID: {property_id}")

    return token, property_id

def test_spanish_application(property_id):
    """Test Spanish job application submission"""
    print("\n" + "="*60)
    print("Testing Spanish Job Application Submission")
    print("="*60)

    # Create application with Spanish data
    application = {
        # Personal Information
        "first_name": "María",
        "middle_initial": "",
        "last_name": "González",
        "email": f"maria.gonzalez.{datetime.now().strftime('%Y%m%d%H%M%S')}@ejemplo.com",
        "phone": "+52 55 1234 5678",  # Mexican phone number
        "phone_is_cell": True,
        "phone_is_home": False,
        "secondary_phone": "",
        "secondary_phone_is_cell": False,
        "secondary_phone_is_home": False,
        "address": "Calle Principal 123",
        "apartment_unit": "Depto 4B",
        "city": "Ciudad de México",
        "state": "MX",
        "zip_code": "03100",

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
        "how_heard_detailed": "Búsqueda en Google",

        # References
        "personal_reference": {
            "name": "Juan Pérez",
            "years_known": "5",
            "phone": "+52 33 9876 5432",
            "relationship": "Amigo"
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
                "school_name": "Escuela Secundaria Nacional",
                "location": "Ciudad de México, México",
                "years_attended": "3",
                "graduated": True,
                "degree_received": "Certificado de Secundaria"
            }
        ],

        # Employment History
        "employment_history": [
            {
                "company_name": "Hotel Plaza México",
                "phone": "+52 55 5555 1234",
                "address": "Av. Reforma 123, CDMX",
                "supervisor": "Rosa Martínez",
                "job_title": "Camarista",
                "starting_salary": "8000",
                "ending_salary": "10000",
                "from_date": "2020-01",
                "to_date": "2023-12",
                "reason_for_leaving": "Mejor oportunidad",
                "may_contact": True
            }
        ],

        # Skills and Additional Info
        "skills_languages_certifications": "Español nativo, Inglés básico, Experiencia en limpieza de hoteles",
        "voluntary_self_identification": None,
        "experience_years": "2-5",
        "hotel_experience": "yes",
        "additional_comments": "Muy interesada en trabajar con su equipo. Tengo experiencia en hoteles de lujo."
    }

    print(f"\nSubmitting application:")
    print(f"   Applicant: {application['first_name']} {application['last_name']}")
    print(f"   Phone: {application['phone']}")
    print(f"   Email: {application['email']}")
    print(f"   Property ID: {property_id}")

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/apply/{property_id}",
            json=application,
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        print(f"\n📊 Response Status: {response.status_code}")

        if response.status_code == 200:
            print("\n✅ SUCCESS! Spanish application submitted successfully!")
            result = response.json()
            print(f"   Application ID: {result.get('application_id', 'N/A')}")
            print(f"   Property: {result.get('property_name', 'N/A')}")
            print(f"   Position: {result.get('position_applied', 'N/A')}")
            print(f"   Message: {result.get('message', 'N/A')}")
            return True
        else:
            print("\n❌ FAILED to submit application")
            print("Response:")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
            return False

    except Exception as e:
        print(f"\n❌ Exception occurred: {str(e)}")
        return False

def test_us_application(property_id):
    """Test US job application to ensure we didn't break it"""
    print("\n" + "="*60)
    print("Testing US Job Application (Regression Test)")
    print("="*60)

    application = {
        # Personal Information
        "first_name": "John",
        "middle_initial": "A",
        "last_name": "Smith",
        "email": f"john.smith.{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com",
        "phone": "(555) 123-4567",  # US phone number
        "phone_is_cell": True,
        "phone_is_home": False,
        "secondary_phone": "",
        "secondary_phone_is_cell": False,
        "secondary_phone_is_home": False,
        "address": "123 Main Street",
        "apartment_unit": "",
        "city": "Dallas",
        "state": "TX",
        "zip_code": "75001",

        # Position Information
        "department": "front_desk",
        "position": "receptionist",
        "salary_desired": "18",

        # Work Authorization & Legal
        "work_authorized": "yes",
        "sponsorship_required": "no",
        "age_verification": True,
        "conviction_record": {
            "has_conviction": False,
            "explanation": None
        },

        # Availability
        "start_date": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
        "shift_preference": "morning",
        "employment_type": "full_time",
        "seasonal_start_date": None,
        "seasonal_end_date": None,

        # Previous Hotel Employment
        "previous_hotel_employment": True,
        "previous_hotel_details": "Worked at Marriott for 2 years",

        # How did you hear about us?
        "how_heard": "indeed",
        "how_heard_detailed": None,

        # References
        "personal_reference": {
            "name": "Jane Doe",
            "years_known": "10",
            "phone": "(555) 987-6543",
            "relationship": "Former Colleague"
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
                "school_name": "Dallas High School",
                "location": "Dallas, TX",
                "years_attended": "4",
                "graduated": True,
                "degree_received": "High School Diploma"
            }
        ],

        # Employment History
        "employment_history": [
            {
                "company_name": "Marriott Hotel",
                "phone": "(214) 555-1234",
                "address": "456 Hotel Ave, Dallas, TX",
                "supervisor": "Mike Johnson",
                "job_title": "Front Desk Agent",
                "starting_salary": "15",
                "ending_salary": "17",
                "from_date": "2021-06",
                "to_date": "2023-06",
                "reason_for_leaving": "Career advancement",
                "may_contact": True
            }
        ],

        # Skills and Additional Info
        "skills_languages_certifications": "English fluent, Customer service certified",
        "voluntary_self_identification": None,
        "experience_years": "2-5",
        "hotel_experience": "yes",
        "additional_comments": "Experienced in hotel operations and guest relations"
    }

    print(f"\nSubmitting US application:")
    print(f"   Applicant: {application['first_name']} {application['last_name']}")
    print(f"   Phone: {application['phone']}")

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/apply/{property_id}",
            json=application,
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        if response.status_code == 200:
            print("✅ US application still works correctly")
            return True
        else:
            print(f"❌ US application failed with status {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

def main():
    """Run the complete test suite"""
    print("\n" + "="*70)
    print(" SPANISH JOB APPLICATION TEST SUITE ")
    print(" Testing International Phone Number Support ")
    print("="*70)

    # Step 1: Login and get property ID
    token, property_id = login_and_get_property()

    if not property_id:
        print("\n❌ Failed to get property ID. Cannot continue tests.")
        return 1

    # Step 2: Test Spanish application
    spanish_success = test_spanish_application(property_id)

    # Step 3: Test US application (regression test)
    us_success = test_us_application(property_id)

    # Final Summary
    print("\n" + "="*70)
    print(" TEST SUMMARY ")
    print("="*70)

    if spanish_success and us_success:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ Spanish applications with international phones are working")
        print("✅ US applications continue to work (no regression)")
        print("\nThe Spanish language job application issue has been RESOLVED!")
        return 0
    else:
        print("\n⚠️ Some tests failed:")
        if not spanish_success:
            print("❌ Spanish application test failed")
        if not us_success:
            print("❌ US application test failed")
        return 1

if __name__ == "__main__":
    exit(main())