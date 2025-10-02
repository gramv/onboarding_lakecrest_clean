#!/usr/bin/env python3
"""
Comprehensive test suite for Spanish job application phone validation - V2 API
Tests the complete V2 job application with all required fields
"""

import json
import requests
import sys
from typing import Dict, List
from datetime import datetime, timedelta

# Test configuration
API_BASE_URL = "http://localhost:8000"
TEST_PROPERTY_ID = "test-property-001"

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test_header(test_name: str):
    """Print a formatted test header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Testing: {test_name}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

def print_result(success: bool, message: str):
    """Print colored test result"""
    if success:
        print(f"{GREEN}✅ PASS:{RESET} {message}")
    else:
        print(f"{RED}❌ FAIL:{RESET} {message}")

def create_complete_v2_application(phone: str, first_name: str = "Test", last_name: str = "User", email: str = None) -> Dict:
    """Create a complete V2 job application with all required fields"""
    if email is None:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        email = f"test_{timestamp}@example.com"

    return {
        # Personal Information
        "first_name": first_name,
        "middle_initial": "",
        "last_name": last_name,
        "email": email,
        "phone": phone,
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
                "did_graduate": True,
                "degree": "High School Diploma"
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

def test_spanish_application_complete():
    """Test complete Spanish language application with Mexican phone"""
    print_test_header("Complete Spanish Application - V2 API")

    spanish_app = create_complete_v2_application(
        phone="+52 55 1234 5678",
        first_name="María",
        last_name="González",
        email=f"maria.gonzalez.{datetime.now().strftime('%Y%m%d%H%M%S')}@ejemplo.com"
    )

    # Update with Spanish-specific data
    spanish_app.update({
        "address": "Calle Principal 123",
        "apartment_unit": "Depto 4B",
        "city": "Ciudad de México",
        "state": "MX",
        "zip_code": "03100",
        "secondary_phone": "+52 33 9876 5432",
        "personal_reference": {
            "name": "Juan Pérez",
            "years_known": "10",
            "phone": "+52 55 8765 4321",
            "relationship": "Amigo"
        },
        "skills_languages_certifications": "Español nativo, Inglés básico",
        "additional_comments": "Muy interesada en trabajar con su equipo"
    })

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/apply/{TEST_PROPERTY_ID}",
            json=spanish_app,
            headers={"Content-Type": "application/json"},
            timeout=5
        )

        if response.status_code == 200:
            print_result(True, f"Spanish application with phone {spanish_app['phone']} submitted successfully!")
            result = response.json()
            print(f"  Application ID: {result.get('application_id', 'N/A')}")
            return True
        else:
            print_result(False, f"Failed with status {response.status_code}")
            print(f"  Response: {json.dumps(response.json(), indent=2)}")
            return False

    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_international_phones_v2():
    """Test various international phone formats with complete V2 data"""
    print_test_header("International Phone Numbers - V2 API")

    test_cases = [
        # US Numbers
        ("(555) 123-4567", "US standard format"),
        ("+1 555 123 4567", "US with country code"),

        # Latin America
        ("+52 55 1234 5678", "Mexico City"),
        ("+54 11 4123 4567", "Argentina Buenos Aires"),
        ("+55 11 91234 5678", "Brazil São Paulo"),

        # Europe
        ("+34 612 345 678", "Spain mobile"),
        ("+33 6 12 34 56 78", "France mobile"),
        ("+44 20 7946 0958", "UK London"),

        # Asia
        ("+86 138 0000 0000", "China mobile"),
        ("+91 98765 43210", "India mobile"),

        # Edge cases
        ("1234567", "Minimum 7 digits"),
        ("123456789012345", "Maximum 15 digits"),
    ]

    passed = 0
    failed = 0

    for phone, description in test_cases:
        application = create_complete_v2_application(phone)

        try:
            response = requests.post(
                f"{API_BASE_URL}/api/apply/{TEST_PROPERTY_ID}",
                json=application,
                headers={"Content-Type": "application/json"},
                timeout=5
            )

            if response.status_code == 200:
                print_result(True, f"{description}: {phone}")
                passed += 1
            else:
                print_result(False, f"{description}: {phone} - Status {response.status_code}")
                if response.status_code == 422:
                    # Show validation error details
                    error_data = response.json()
                    if 'detail' in error_data:
                        print(f"    Validation error: {error_data['detail']}")
                failed += 1

        except Exception as e:
            print_result(False, f"{description}: {phone} - Exception: {str(e)}")
            failed += 1

    print(f"\n{BLUE}Summary: {GREEN}{passed} passed{RESET}, {RED if failed > 0 else GREEN}{failed} failed{RESET}")
    return failed == 0

def test_invalid_phones_v2():
    """Test that invalid phone numbers are properly rejected"""
    print_test_header("Invalid Phone Numbers - V2 API")

    test_cases = [
        ("123456", "Too short - 6 digits"),
        ("1234567890123456", "Too long - 16 digits"),
        ("", "Empty phone"),
        ("abc", "Letters only"),
        ("12345", "5 digits - below minimum"),
    ]

    passed = 0
    failed = 0

    for phone, description in test_cases:
        application = create_complete_v2_application(phone)

        try:
            response = requests.post(
                f"{API_BASE_URL}/api/apply/{TEST_PROPERTY_ID}",
                json=application,
                headers={"Content-Type": "application/json"},
                timeout=5
            )

            if response.status_code != 200:
                print_result(True, f"{description}: {phone} - Correctly rejected")
                passed += 1
            else:
                print_result(False, f"{description}: {phone} - Should have been rejected")
                failed += 1

        except Exception as e:
            print_result(False, f"{description}: {phone} - Exception: {str(e)}")
            failed += 1

    print(f"\n{BLUE}Summary: {GREEN}{passed} passed{RESET}, {RED if failed > 0 else GREEN}{failed} failed{RESET}")
    return failed == 0

def test_us_formats_still_work():
    """Verify US phone formats continue to work"""
    print_test_header("US Phone Format Compatibility - V2 API")

    us_formats = [
        ("(555) 123-4567", "Parentheses and dash"),
        ("555-123-4567", "Dashes only"),
        ("555.123.4567", "Dots"),
        ("555 123 4567", "Spaces"),
        ("5551234567", "No formatting"),
        ("+1 (555) 123-4567", "Full US format"),
    ]

    passed = 0
    failed = 0

    for phone, description in us_formats:
        application = create_complete_v2_application(phone)

        try:
            response = requests.post(
                f"{API_BASE_URL}/api/apply/{TEST_PROPERTY_ID}",
                json=application,
                headers={"Content-Type": "application/json"},
                timeout=5
            )

            if response.status_code == 200:
                print_result(True, f"{description}: {phone}")
                passed += 1
            else:
                print_result(False, f"{description}: {phone} - Status {response.status_code}")
                failed += 1

        except Exception as e:
            print_result(False, f"{description}: {phone} - Exception: {str(e)}")
            failed += 1

    print(f"\n{BLUE}Summary: {GREEN}{passed} passed{RESET}, {RED if failed > 0 else GREEN}{failed} failed{RESET}")
    return failed == 0

def test_multiple_spanish_speakers():
    """Test multiple Spanish-speaking applicants with different phone formats"""
    print_test_header("Multiple Spanish Speakers - Different Countries")

    applicants = [
        ("María", "González", "+52 55 1234 5678", "Mexico"),
        ("Carlos", "Rodríguez", "+34 612 345 678", "Spain"),
        ("Ana", "Silva", "+54 11 4123 4567", "Argentina"),
        ("Pedro", "Santos", "+55 11 91234 5678", "Brazil"),
        ("Luis", "Fernández", "+57 1 234 5678", "Colombia"),
    ]

    passed = 0
    failed = 0

    for first_name, last_name, phone, country in applicants:
        email = f"{first_name.lower()}.{last_name.lower()}.{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"
        application = create_complete_v2_application(phone, first_name, last_name, email)

        try:
            response = requests.post(
                f"{API_BASE_URL}/api/apply/{TEST_PROPERTY_ID}",
                json=application,
                headers={"Content-Type": "application/json"},
                timeout=5
            )

            if response.status_code == 200:
                print_result(True, f"{first_name} {last_name} from {country} - Phone: {phone}")
                passed += 1
            else:
                print_result(False, f"{first_name} {last_name} from {country} - Status {response.status_code}")
                failed += 1

        except Exception as e:
            print_result(False, f"{first_name} {last_name} - Exception: {str(e)}")
            failed += 1

    print(f"\n{BLUE}Summary: {GREEN}{passed} passed{RESET}, {RED if failed > 0 else GREEN}{failed} failed{RESET}")
    return failed == 0

def main():
    """Run all V2 API tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Spanish Job Application V2 API Test Suite{RESET}")
    print(f"{BLUE}Testing Complete V2 Application with International Phones{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"Testing API at: {API_BASE_URL}")
    print(f"Property ID: {TEST_PROPERTY_ID}")

    # Check if API is running
    try:
        health_response = requests.get(f"{API_BASE_URL}/api/healthz", timeout=2)
        if health_response.status_code == 200:
            print(f"{GREEN}✅ API is running{RESET}")
        else:
            print(f"{RED}❌ API health check failed{RESET}")
            return 1
    except:
        print(f"{RED}❌ Cannot connect to API at {API_BASE_URL}{RESET}")
        print(f"{YELLOW}Make sure the backend is running on port 8000{RESET}")
        return 1

    # Run test suites
    test_results = []

    # Critical tests
    test_results.append(("Spanish Application Complete", test_spanish_application_complete()))
    test_results.append(("International Phones V2", test_international_phones_v2()))
    test_results.append(("Invalid Phones V2", test_invalid_phones_v2()))
    test_results.append(("US Format Compatibility", test_us_formats_still_work()))
    test_results.append(("Multiple Spanish Speakers", test_multiple_spanish_speakers()))

    # Print final summary
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}FINAL TEST SUMMARY - V2 API{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

    all_passed = True
    for test_name, passed in test_results:
        status = f"{GREEN}PASSED{RESET}" if passed else f"{RED}FAILED{RESET}"
        print(f"{test_name}: {status}")
        if not passed:
            all_passed = False

    if all_passed:
        print(f"\n{GREEN}🎉 ALL V2 API TESTS PASSED!{RESET}")
        print(f"{GREEN}Spanish language job applications with international phones are working correctly.{RESET}")
        return 0
    else:
        print(f"\n{RED}⚠️  Some tests failed. Please review the output above.{RESET}")
        return 1

if __name__ == "__main__":
    sys.exit(main())