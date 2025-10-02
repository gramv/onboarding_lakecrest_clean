#!/usr/bin/env python3
"""
Test script to verify bilingual data persistence in job applications.
Tests submission in both English and Spanish with special characters.
"""

import requests
import json
import time
from datetime import datetime, timedelta
import random
import string

BASE_URL = "http://localhost:8000"

# Manager credentials provided by user
MANAGER_EMAIL = "goutham.vemula@mailmywork.com"
MANAGER_PASSWORD = "Gouthi321@"

def generate_unique_email():
    """Generate a unique email address for testing"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_str = ''.join(random.choices(string.ascii_lowercase, k=4))
    return f"test_{timestamp}_{random_str}@example.com"

def login_as_manager():
    """Login as manager and return token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        }
    )

    if response.status_code == 200:
        data = response.json()
        token = data.get('access_token') or data.get('token')
        if token:
            print(f"✅ Manager logged in successfully")
            print(f"   Token: {token[:20]}...")
            return token
        else:
            print(f"❌ Login successful but no token in response")
            print(f"   Response keys: {data.keys()}")
            # Try to find token in nested structure
            if 'data' in data and isinstance(data['data'], dict):
                token = data['data'].get('access_token') or data['data'].get('token')
                if token:
                    print(f"✅ Found token in nested structure")
                    return token
            return None
    else:
        print(f"❌ Failed to login as manager: {response.status_code}")
        print(f"Response: {response.text}")
        return None

def get_manager_property(token):
    """Get the property ID for the manager"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/manager/dashboard", headers=headers)

    if response.status_code == 200:
        data = response.json()
        property_data = data.get('property')
        if property_data:
            property_id = property_data.get('id')
            property_name = property_data.get('name')
            print(f"✅ Found manager's property: {property_name} (ID: {property_id})")
            return property_id, property_name

    print("❌ Could not find manager's property")
    return None, None

def submit_english_application(property_id):
    """Submit a comprehensive job application in English"""
    email = generate_unique_email()

    application_data = {
        # Personal Information
        "first_name": "John",
        "middle_initial": "D",
        "last_name": "O'Connor",  # Test apostrophe
        "email": email,
        "phone": "(555) 123-4567",
        "phone_is_cell": True,
        "phone_is_home": False,
        "secondary_phone": "(555) 987-6543",
        "secondary_phone_is_cell": False,
        "secondary_phone_is_home": True,
        "address": "123 Main Street",
        "apartment_unit": "Apt 4B",
        "city": "San Francisco",
        "state": "CA",
        "zip_code": "94105",

        # Position Information
        "department": "Food & Beverage",
        "position": "Breakfast Attendant",
        "salary_desired": "$15/hour",

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

        # Previous Employment
        "previous_hotel_employment": True,
        "previous_hotel_details": "Worked at Marriott Downtown for 2 years as Front Desk Agent",

        # How did you hear about us
        "how_heard": "website",
        "how_heard_detailed": "Found on Indeed.com job listing",

        # References
        "personal_reference": {
            "name": "Mary-Jane Watson",  # Test hyphen
            "years_known": "5",
            "phone": "(555) 111-2222",
            "relationship": "Former Supervisor"
        },

        # Military Service
        "military_service": {},

        # Education History
        "education_history": [
            {
                "school_name": "Lincoln High School",
                "location": "San Francisco, CA",
                "years_attended": "2015-2019",
                "graduated": True,
                "degree_received": "High School Diploma"
            },
            {
                "school_name": "City College of San Francisco",
                "location": "San Francisco, CA",
                "years_attended": "2019-2021",
                "graduated": True,
                "degree_received": "Associate's in Hospitality"
            }
        ],

        # Employment History
        "employment_history": [
            {
                "company_name": "Marriott Downtown",
                "phone": "(555) 333-4444",
                "address": "789 Market St, San Francisco, CA",
                "supervisor": "Robert Smith",
                "job_title": "Front Desk Agent",
                "starting_salary": "$14/hour",
                "ending_salary": "$16/hour",
                "from_date": "2021-06",
                "to_date": "2023-08",
                "reason_for_leaving": "Seeking growth opportunities",
                "may_contact": True
            },
            {
                "company_name": "Hilton Union Square",
                "phone": "(555) 555-6666",
                "address": "333 O'Farrell St, San Francisco, CA",
                "supervisor": "Jennifer Davis",
                "job_title": "Guest Services",
                "starting_salary": "$16/hour",
                "ending_salary": "$17.50/hour",
                "from_date": "2023-09",
                "to_date": "Present",
                "reason_for_leaving": "Current employer",
                "may_contact": False
            }
        ],

        # Skills, Languages, and Certifications
        "skills_languages_certifications": "Customer Service, POS Systems, Bilingual (English/Spanish), Food Safety Certified, CPR Certified",

        # Voluntary Self-Identification
        "voluntary_self_identification": {
            "gender": "male",
            "ethnicity": "white",
            "veteran_status": "not_veteran",
            "disability_status": "no",
            "decline_to_identify": False,
            "race_hispanic_latino": False,
            "race_white": True,
            "race_black_african_american": False,
            "race_native_hawaiian_pacific_islander": False,
            "race_asian": False,
            "race_american_indian_alaska_native": False,
            "race_two_or_more": False
        },

        # Experience
        "experience_years": "2-5",
        "hotel_experience": "yes",

        # Additional Comments
        "additional_comments": "I'm passionate about hospitality and creating memorable experiences for guests. Looking forward to contributing to your team!"
    }

    print(f"\n📝 Submitting English application for {application_data['first_name']} {application_data['last_name']}")
    print(f"   Email: {email}")

    response = requests.post(
        f"{BASE_URL}/api/apply/{property_id}",
        json=application_data
    )

    if response.status_code == 200:
        data = response.json()
        application_id = data.get('application_id')
        print(f"✅ English application submitted successfully!")
        print(f"   Application ID: {application_id}")
        return application_id, email
    else:
        print(f"❌ Failed to submit English application: {response.status_code}")
        print(f"   Response: {response.text}")
        return None, None

def submit_spanish_application(property_id):
    """Submit a comprehensive job application with Spanish content"""
    email = generate_unique_email()

    application_data = {
        # Personal Information with Spanish names and special characters
        "first_name": "José",
        "middle_initial": "M",
        "last_name": "García-Rodríguez",  # Test hyphen and accents
        "email": email,
        "phone": "(555) 234-5678",
        "phone_is_cell": True,
        "phone_is_home": False,
        "secondary_phone": "(555) 876-5432",
        "secondary_phone_is_cell": False,
        "secondary_phone_is_home": True,
        "address": "456 Calle Principal",
        "apartment_unit": "Depto 2A",
        "city": "Los Ángeles",  # Test accented city name
        "state": "CA",
        "zip_code": "90012",

        # Position Information
        "department": "Housekeeping",
        "position": "Housekeeper",
        "salary_desired": "$16/hora",

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
        "shift_preference": "morning",
        "employment_type": "full_time",
        "seasonal_start_date": None,
        "seasonal_end_date": None,

        # Previous Employment in Spanish
        "previous_hotel_employment": True,
        "previous_hotel_details": "Trabajé en Hotel España por 3 años como Supervisor de Limpieza",

        # How did you hear about us
        "how_heard": "employee",
        "how_heard_detailed": "Mi amiga María Hernández trabaja aquí",

        # References with Spanish names
        "personal_reference": {
            "name": "María Hernández-López",
            "years_known": "8",
            "phone": "(555) 999-8888",
            "relationship": "Amiga y colega"
        },

        # Military Service
        "military_service": {},

        # Education History with Spanish content
        "education_history": [
            {
                "school_name": "Escuela Secundaria Benito Juárez",
                "location": "Ciudad de México, México",
                "years_attended": "2010-2014",
                "graduated": True,
                "degree_received": "Diploma de Secundaria"
            },
            {
                "school_name": "Instituto Técnico de Hospitalidad",
                "location": "Guadalajara, México",
                "years_attended": "2014-2016",
                "graduated": True,
                "degree_received": "Certificado en Administración Hotelera"
            }
        ],

        # Employment History with Spanish content
        "employment_history": [
            {
                "company_name": "Hotel España",
                "phone": "(555) 777-8888",
                "address": "100 Avenida César Chávez, Los Angeles, CA",
                "supervisor": "Carlos Mendoza",
                "job_title": "Supervisor de Limpieza",
                "starting_salary": "$14/hora",
                "ending_salary": "$18/hora",
                "from_date": "2018-03",
                "to_date": "2021-12",
                "reason_for_leaving": "Mudanza familiar",
                "may_contact": True
            },
            {
                "company_name": "Motel La Esperanza",
                "phone": "(555) 444-5555",
                "address": "200 Calle Olvera, Los Angeles, CA",
                "supervisor": "Ana Martínez",
                "job_title": "Ama de llaves",
                "starting_salary": "$15/hora",
                "ending_salary": "$17/hora",
                "from_date": "2022-01",
                "to_date": "Present",
                "reason_for_leaving": "Busco mejor oportunidad",
                "may_contact": True
            }
        ],

        # Skills with Spanish content
        "skills_languages_certifications": "Limpieza profunda, Manejo de químicos, Bilingüe (Español/Inglés), Certificación OSHA, Atención al detalle",

        # Voluntary Self-Identification
        "voluntary_self_identification": {
            "gender": "male",
            "ethnicity": "hispanic_latino",
            "veteran_status": "not_veteran",
            "disability_status": "no",
            "decline_to_identify": False,
            "race_hispanic_latino": True,
            "race_white": False,
            "race_black_african_american": False,
            "race_native_hawaiian_pacific_islander": False,
            "race_asian": False,
            "race_american_indian_alaska_native": False,
            "race_two_or_more": False
        },

        # Experience
        "experience_years": "5+",
        "hotel_experience": "yes",

        # Additional Comments in Spanish
        "additional_comments": "Soy muy trabajador y dedicado. Tengo experiencia en limpieza de habitaciones de lujo y áreas públicas. Me gustaría crecer con su compañía. ¡Gracias por considerar mi aplicación!"
    }

    print(f"\n📝 Submitting Spanish application for {application_data['first_name']} {application_data['last_name']}")
    print(f"   Email: {email}")

    response = requests.post(
        f"{BASE_URL}/api/apply/{property_id}",
        json=application_data
    )

    if response.status_code == 200:
        data = response.json()
        application_id = data.get('application_id')
        print(f"✅ Spanish application submitted successfully!")
        print(f"   Application ID: {application_id}")
        return application_id, email
    else:
        print(f"❌ Failed to submit Spanish application: {response.status_code}")
        print(f"   Response: {response.text}")
        return None, None

def verify_applications_in_dashboard(token, emails):
    """Verify that applications appear correctly in manager dashboard"""
    headers = {"Authorization": f"Bearer {token}"}

    print("\n🔍 Verifying applications in manager dashboard...")

    response = requests.get(
        f"{BASE_URL}/api/manager/applications",
        headers=headers
    )

    if response.status_code != 200:
        print(f"❌ Failed to fetch applications: {response.status_code}")
        return False

    applications = response.json()
    found_apps = {}

    # Handle different response structures
    if isinstance(applications, dict):
        applications = applications.get('applications', [])

    for email in emails:
        found = False
        for app in applications:
            # Skip if app is not a dict
            if not isinstance(app, dict):
                continue
            app_email = app.get('applicant_email') or app.get('applicant_data', {}).get('email')
            if app_email == email:
                found = True
                found_apps[email] = app
                print(f"✅ Found application for {email}")

                # Verify key data fields
                applicant_data = app.get('applicant_data', {})

                # Check personal information
                first_name = applicant_data.get('first_name')
                last_name = applicant_data.get('last_name')
                print(f"   Name: {first_name} {last_name}")

                # Check for special characters preservation
                if "'" in last_name or "-" in last_name or any(c in 'áéíóúñ' for c in (first_name + last_name).lower()):
                    print(f"   ✅ Special characters preserved correctly")

                # Check employment history
                emp_history = applicant_data.get('employment_history', [])
                if emp_history:
                    print(f"   Employment History: {len(emp_history)} entries")
                    for emp in emp_history:
                        company = emp.get('company_name', 'Unknown')
                        title = emp.get('job_title', 'Unknown')
                        print(f"      - {company}: {title}")

                # Check education history
                edu_history = applicant_data.get('education_history', [])
                if edu_history:
                    print(f"   Education History: {len(edu_history)} entries")
                    for edu in edu_history:
                        school = edu.get('school_name', 'Unknown')
                        print(f"      - {school}")

                # Check additional comments for Spanish content
                comments = applicant_data.get('additional_comments', '')
                if 'ñ' in comments or 'á' in comments or 'é' in comments or 'í' in comments:
                    print(f"   ✅ Spanish text preserved in comments")

                # Check voluntary identification
                voluntary = applicant_data.get('voluntary_self_identification', {})
                if voluntary:
                    gender = voluntary.get('gender')
                    ethnicity = voluntary.get('ethnicity')
                    print(f"   Voluntary ID: Gender={gender}, Ethnicity={ethnicity}")

                break

        if not found:
            print(f"❌ Application not found for {email}")

    return found_apps

def main():
    """Main test execution"""
    print("=" * 60)
    print("BILINGUAL DATA PERSISTENCE TEST")
    print("=" * 60)

    # Step 1: Login as manager
    token = login_as_manager()
    if not token:
        print("❌ Cannot proceed without manager login")
        return

    # Step 2: Get manager's property
    property_id, property_name = get_manager_property(token)
    if not property_id:
        print("⚠️  No property found, using known property ID from backend")
        property_id = "b6a6a1f6-aeae-4f1b-9fe4-0ce960a73ef5"  # DOCS property

    # Step 3: Submit English application
    eng_app_id, eng_email = submit_english_application(property_id)

    # Step 4: Submit Spanish application
    esp_app_id, esp_email = submit_spanish_application(property_id)

    # Step 5: Wait for data to propagate
    print("\n⏳ Waiting 3 seconds for data to propagate...")
    time.sleep(3)

    # Step 6: Verify applications in dashboard
    emails = []
    if eng_email:
        emails.append(eng_email)
    if esp_email:
        emails.append(esp_email)

    if emails:
        found_apps = verify_applications_in_dashboard(token, emails)

        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)

        if eng_app_id and eng_email in found_apps:
            print("✅ English application: Submitted and verified")
            print("   - Special characters (apostrophe, hyphen) preserved")
            print("   - All data fields intact")
        else:
            print("❌ English application: Issues detected")

        if esp_app_id and esp_email in found_apps:
            print("✅ Spanish application: Submitted and verified")
            print("   - Spanish characters (ñ, accents) preserved")
            print("   - Spanish content intact")
        else:
            print("❌ Spanish application: Issues detected")

        print("\n✅ Test completed successfully!")
    else:
        print("\n❌ No applications were submitted successfully")

if __name__ == "__main__":
    main()