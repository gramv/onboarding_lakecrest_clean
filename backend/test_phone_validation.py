#!/usr/bin/env python3
"""
Comprehensive test suite for Spanish job application phone validation
Tests both backend validation and API submission
"""

import json
import requests
import sys
from typing import Dict, List, Tuple
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

def create_base_application(phone: str, email: str = None) -> Dict:
    """Create a base job application with the given phone number"""
    if email is None:
        # Generate unique email for each test
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        email = f"test_{timestamp}@example.com"

    return {
        "first_name": "Test",
        "last_name": "User",
        "middle_name": "",
        "phone": phone,
        "secondary_phone": "",
        "email": email,
        "address": "123 Test Street",
        "apartment_unit": "",
        "city": "Test City",
        "state": "TX",
        "zip_code": "12345",
        "work_authorized": "yes",
        "sponsorship_required": "no",
        "age_verification": True,
        "reliable_transportation": "yes",
        "transportation_method": "own_vehicle",
        "department": "housekeeping",
        "position": "housekeeper",
        "employment_type": "full_time",
        "desired_hourly_rate": "15",
        "start_date": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
        "weekends_available": True,
        "holidays_available": True,
        "shift_preference": "morning",
        "referral_source": "website",
        "currently_employed": False,
        "may_contact_employer": False,
        "previously_employed_here": False,
        "previous_employment_details": "",
        "relatives_employed_here": ""
    }

def test_api_submission(phone: str, test_name: str, should_pass: bool = True) -> bool:
    """Test submitting an application with the given phone number"""
    application = create_base_application(phone)

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/apply/{TEST_PROPERTY_ID}",
            json=application,
            headers={"Content-Type": "application/json"},
            timeout=5
        )

        success = response.status_code == 200

        if should_pass and success:
            print_result(True, f"{test_name}: {phone}")
            return True
        elif not should_pass and not success:
            print_result(True, f"{test_name}: {phone} (correctly rejected)")
            return True
        else:
            error_msg = response.json().get('error', 'Unknown error') if response.status_code != 200 else 'Unexpected success'
            print_result(False, f"{test_name}: {phone} - {error_msg}")
            if response.status_code != 200:
                print(f"  Response: {json.dumps(response.json(), indent=2)}")
            return False

    except Exception as e:
        print_result(False, f"{test_name}: {phone} - Exception: {str(e)}")
        return False

def test_phone_validation_unit():
    """Test phone validation logic directly"""
    print_test_header("Unit Tests - Phone Validation Logic")

    # Import the validation module
    try:
        from app.models import JobApplicationData

        test_cases = [
            # Valid US numbers
            ("(555) 123-4567", True, "US format with parentheses"),
            ("555-123-4567", True, "US format with dashes"),
            ("5551234567", True, "US format plain"),
            ("+1 555 123 4567", True, "US with country code"),
            ("1 555 123 4567", True, "US with 1 prefix"),

            # Valid international numbers
            ("+52 55 1234 5678", True, "Mexico mobile"),
            ("+34 612 345 678", True, "Spain mobile"),
            ("+44 20 7946 0958", True, "UK landline"),
            ("+86 138 0000 0000", True, "China mobile"),
            ("+33 6 12 34 56 78", True, "France mobile"),

            # Edge cases
            ("1234567", True, "Minimum 7 digits"),
            ("123456789012345", True, "Maximum 15 digits"),

            # Invalid cases
            ("123456", False, "Too short - 6 digits"),
            ("1234567890123456", False, "Too long - 16 digits"),
            ("", False, "Empty string"),
            ("abc", False, "Letters only"),
        ]

        passed = 0
        failed = 0

        for phone, should_pass, description in test_cases:
            try:
                # Create a test application data
                test_data = {
                    "first_name": "Test",
                    "last_name": "User",
                    "email": "test@example.com",
                    "phone": phone,
                    "address": "123 Test St",
                    "city": "Test City",
                    "state": "TX",
                    "zip_code": "12345",
                    "work_authorized": "yes",
                    "sponsorship_required": "no"
                }

                # Try to create the model
                app_data = JobApplicationData(**test_data)

                if should_pass:
                    print_result(True, description)
                    passed += 1
                else:
                    print_result(False, f"{description} - Should have failed but passed")
                    failed += 1

            except Exception as e:
                if not should_pass:
                    print_result(True, f"{description} - Correctly rejected")
                    passed += 1
                else:
                    print_result(False, f"{description} - {str(e)}")
                    failed += 1

        print(f"\n{BLUE}Unit Test Summary: {GREEN}{passed} passed{RESET}, {RED if failed > 0 else GREEN}{failed} failed{RESET}")
        return failed == 0

    except ImportError as e:
        print(f"{YELLOW}Warning: Could not import models for unit testing: {e}{RESET}")
        return None

def test_international_phones():
    """Test various international phone formats"""
    print_test_header("International Phone Number Tests")

    test_phones = [
        # North America
        ("+1 555 123 4567", "US with country code"),
        ("+1 416 555 0123", "Canada"),

        # Latin America
        ("+52 55 1234 5678", "Mexico City"),
        ("+52 33 1234 5678", "Mexico Guadalajara"),
        ("+54 11 4123 4567", "Argentina Buenos Aires"),
        ("+55 11 91234 5678", "Brazil São Paulo"),
        ("+57 1 234 5678", "Colombia Bogotá"),

        # Europe
        ("+34 612 345 678", "Spain mobile"),
        ("+33 6 12 34 56 78", "France mobile"),
        ("+49 30 12345678", "Germany Berlin"),
        ("+39 06 1234567", "Italy Rome"),
        ("+44 20 7946 0958", "UK London"),

        # Asia
        ("+86 138 0000 0000", "China mobile"),
        ("+91 98765 43210", "India mobile"),
        ("+81 3 1234 5678", "Japan Tokyo"),
        ("+82 2 1234 5678", "South Korea Seoul"),

        # Edge cases
        ("1234567", "Minimum 7 digits"),
        ("12345678901234", "14 digits"),
        ("123456789012345", "Maximum 15 digits"),
    ]

    passed = 0
    failed = 0

    for phone, description in test_phones:
        if test_api_submission(phone, description, should_pass=True):
            passed += 1
        else:
            failed += 1

    print(f"\n{BLUE}International Test Summary: {GREEN}{passed} passed{RESET}, {RED if failed > 0 else GREEN}{failed} failed{RESET}")
    return failed == 0

def test_invalid_phones():
    """Test invalid phone numbers that should be rejected"""
    print_test_header("Invalid Phone Number Tests")

    invalid_phones = [
        ("123456", "Too short - 6 digits"),
        ("1234567890123456", "Too long - 16 digits"),
        ("", "Empty phone"),
        ("abc", "Letters only"),
        ("12345", "5 digits - below minimum"),
        ("12345678901234567", "17 digits - above maximum"),
    ]

    passed = 0
    failed = 0

    for phone, description in invalid_phones:
        if test_api_submission(phone, description, should_pass=False):
            passed += 1
        else:
            failed += 1

    print(f"\n{BLUE}Invalid Phone Test Summary: {GREEN}{passed} passed{RESET}, {RED if failed > 0 else GREEN}{failed} failed{RESET}")
    return failed == 0

def test_spanish_application():
    """Test complete Spanish language application submission"""
    print_test_header("Spanish Language Application Test")

    spanish_application = {
        "first_name": "María",
        "last_name": "González",
        "middle_name": "Isabel",
        "phone": "+52 55 1234 5678",
        "secondary_phone": "+52 55 9876 5432",
        "email": f"maria.gonzalez.{datetime.now().strftime('%Y%m%d%H%M%S')}@ejemplo.com",
        "address": "Calle Principal 123",
        "apartment_unit": "Depto 4B",
        "city": "Ciudad de México",
        "state": "MX",
        "zip_code": "03100",
        "work_authorized": "yes",
        "sponsorship_required": "no",
        "age_verification": True,
        "reliable_transportation": "yes",
        "transportation_method": "public_transport",
        "department": "housekeeping",
        "position": "housekeeper",
        "employment_type": "full_time",
        "desired_hourly_rate": "15",
        "start_date": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
        "weekends_available": True,
        "holidays_available": False,
        "shift_preference": "morning",
        "referral_source": "employee",
        "employee_referral_name": "Juan Pérez",
        "currently_employed": True,
        "may_contact_employer": False,
        "previously_employed_here": False,
        "previous_employment_details": "",
        "relatives_employed_here": "Mi primo Juan trabaja en mantenimiento"
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/apply/{TEST_PROPERTY_ID}",
            json=spanish_application,
            headers={"Content-Type": "application/json"},
            timeout=5
        )

        if response.status_code == 200:
            print_result(True, "Spanish application submitted successfully")
            result = response.json()
            print(f"  Application ID: {result.get('application_id', 'N/A')}")
            return True
        else:
            print_result(False, f"Spanish application failed: {response.json().get('error', 'Unknown error')}")
            print(f"  Response: {json.dumps(response.json(), indent=2)}")
            return False

    except Exception as e:
        print_result(False, f"Spanish application exception: {str(e)}")
        return False

def test_phone_formatting():
    """Test that various phone formats are accepted"""
    print_test_header("Phone Format Variations Test")

    base_number = "5551234567"
    format_variations = [
        ("(555) 123-4567", "Parentheses and dash"),
        ("555-123-4567", "Dashes only"),
        ("555.123.4567", "Dots"),
        ("555 123 4567", "Spaces"),
        ("5551234567", "No formatting"),
        ("+1 (555) 123-4567", "Full US format"),
        ("+1.555.123.4567", "Dots with country code"),
    ]

    passed = 0
    failed = 0

    for phone, description in format_variations:
        if test_api_submission(phone, description, should_pass=True):
            passed += 1
        else:
            failed += 1

    print(f"\n{BLUE}Format Test Summary: {GREEN}{passed} passed{RESET}, {RED if failed > 0 else GREEN}{failed} failed{RESET}")
    return failed == 0

def main():
    """Run all tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Spanish Job Application Phone Validation Test Suite{RESET}")
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

    # Unit tests (if models can be imported)
    unit_result = test_phone_validation_unit()
    if unit_result is not None:
        test_results.append(("Unit Tests", unit_result))

    # API tests
    test_results.append(("International Phones", test_international_phones()))
    test_results.append(("Invalid Phones", test_invalid_phones()))
    test_results.append(("Spanish Application", test_spanish_application()))
    test_results.append(("Format Variations", test_phone_formatting()))

    # Print final summary
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}FINAL TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

    all_passed = True
    for test_name, passed in test_results:
        status = f"{GREEN}PASSED{RESET}" if passed else f"{RED}FAILED{RESET}"
        print(f"{test_name}: {status}")
        if not passed:
            all_passed = False

    if all_passed:
        print(f"\n{GREEN}🎉 ALL TESTS PASSED! Spanish language job applications are working correctly.{RESET}")
        return 0
    else:
        print(f"\n{RED}⚠️  Some tests failed. Please review the output above.{RESET}")
        return 1

if __name__ == "__main__":
    sys.exit(main())