#!/usr/bin/env python3
"""
Comprehensive test for job application data flow - all 87 fields
Tests submission, backend storage, and manager view retrieval
"""

import asyncio
import json
import sys
from datetime import datetime, date
import httpx
from typing import Dict, Any, List
import os
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv('.env', override=True)

# Constants
BASE_URL = "http://localhost:8000"
TEST_PROPERTY_ID = "550e8400-e29b-41d4-a716-446655440001"  # Fixed UUID for test property

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test_header(test_name: str):
    """Print formatted test header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}TEST: {test_name}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

def print_success(message: str):
    """Print success message"""
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message: str):
    """Print error message"""
    print(f"{RED}✗ {message}{RESET}")

def print_warning(message: str):
    """Print warning message"""
    print(f"{YELLOW}⚠ {message}{RESET}")

def print_info(message: str):
    """Print info message"""
    print(f"  {message}")

def create_complete_test_application() -> Dict[str, Any]:
    """Create a complete test application with all 87 fields populated"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    return {
        # Personal Information (16 fields)
        "first_name": "John",
        "middle_initial": "Q",
        "last_name": f"TestCandidate_{timestamp}",
        "email": f"john.test.{timestamp}@example.com",
        "phone": "555-123-4567",
        "phone_is_cell": True,
        "phone_is_home": False,
        "secondary_phone": "555-987-6543",
        "secondary_phone_is_cell": False,
        "secondary_phone_is_home": True,
        "address": "123 Test Street",
        "apartment_unit": "Apt 5B",
        "city": "Test City",
        "state": "TX",
        "zip_code": "12345",
        
        # Position Information (3 fields)
        "department": "Food & Beverage",
        "position": "Server",
        "salary_desired": "$45,000",
        
        # Work Authorization & Legal (5 fields)
        "work_authorized": "yes",
        "sponsorship_required": "no",
        "age_verification": True,
        "conviction_record": {
            "has_conviction": True,
            "explanation": "Minor traffic violation in 2015 - paid fine and completed defensive driving course"
        },
        
        # Availability (5 fields)
        "start_date": "2025-02-01",
        "shift_preference": "flexible",
        "employment_type": "full_time",
        "seasonal_start_date": "2025-06-01",
        "seasonal_end_date": "2025-09-01",
        
        # Previous Hotel Employment (2 fields)
        "previous_hotel_employment": True,
        "previous_hotel_details": "Worked at Marriott Downtown 2018-2020 as Front Desk Agent",
        
        # How did you hear about us? (2 fields)
        "how_heard": "employee_referral",
        "how_heard_detailed": "Sarah Johnson - Current Employee in Housekeeping",
        
        # Personal Reference (4 fields in object = 4 fields)
        "personal_reference": {
            "name": "Dr. Robert Smith",
            "years_known": "10",
            "phone": "555-456-7890",
            "relationship": "Family friend and mentor"
        },
        
        # Military Service (6 fields in object = 6 fields)
        "military_service": {
            "branch": "United States Army",
            "from_date": "01/2010",
            "to_date": "01/2014",
            "rank_at_discharge": "Sergeant (E-5)",
            "type_of_discharge": "Honorable",
            "disabilities_related": "None"
        },
        
        # Education History (2 entries × 5 fields = 10 fields)
        "education_history": [
            {
                "school_name": "Texas State University",
                "location": "Austin, TX",
                "years_attended": "2014-2018",
                "graduated": True,
                "degree_received": "Bachelor of Science in Hospitality Management"
            },
            {
                "school_name": "Austin Community College",
                "location": "Austin, TX",
                "years_attended": "2012-2014",
                "graduated": True,
                "degree_received": "Associate Degree in Business Administration"
            }
        ],
        
        # Employment History (3 entries × 11 fields = 33 fields)
        "employment_history": [
            {
                "company_name": "Hilton Downtown",
                "phone": "512-555-1234",
                "address": "456 Main St, Austin, TX 78701",
                "supervisor": "Mary Johnson",
                "job_title": "Guest Services Manager",
                "starting_salary": "$35,000",
                "ending_salary": "$42,000",
                "from_date": "2020-03",
                "to_date": "2024-12",
                "reason_for_leaving": "Seeking growth opportunities",
                "may_contact": True
            },
            {
                "company_name": "Marriott Waterfront",
                "phone": "512-555-5678",
                "address": "789 River Rd, Austin, TX 78702",
                "supervisor": "James Wilson",
                "job_title": "Front Desk Supervisor",
                "starting_salary": "$28,000",
                "ending_salary": "$35,000",
                "from_date": "2018-06",
                "to_date": "2020-02",
                "reason_for_leaving": "Promotion opportunity at Hilton",
                "may_contact": True
            },
            {
                "company_name": "Holiday Inn Express",
                "phone": "512-555-9012",
                "address": "321 Airport Blvd, Austin, TX 78703",
                "supervisor": "Lisa Brown",
                "job_title": "Front Desk Agent",
                "starting_salary": "$24,000",
                "ending_salary": "$28,000",
                "from_date": "2016-08",
                "to_date": "2018-05",
                "reason_for_leaving": "Better position at Marriott",
                "may_contact": False
            }
        ],
        
        # Skills, Languages, and Certifications (1 field)
        "skills_languages_certifications": "Fluent in English and Spanish, Certified in ServSafe Food Handler, CPR/First Aid certified, Proficient in Opera PMS and Micros POS systems",
        
        # Voluntary Self-Identification (4 fields in object = 4 fields)
        "voluntary_self_identification": {
            "gender": "male",
            "ethnicity": "hispanic_or_latino",
            "veteran_status": "protected_veteran",
            "disability_status": "no_disability"
        },
        
        # Experience (2 fields)
        "experience_years": "6-10",
        "hotel_experience": "yes",
        
        # Additional Information (1 field)
        "additional_comments": "I am passionate about hospitality and have received multiple awards for customer service excellence. I am also available for overtime and holiday shifts when needed."
    }

def create_minimal_test_application() -> Dict[str, Any]:
    """Create a minimal test application with only required fields"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    return {
        # Required Personal Information
        "first_name": "Jane",
        "last_name": f"MinimalTest_{timestamp}",
        "email": f"jane.minimal.{timestamp}@example.com",
        "phone": "555-000-1111",
        "address": "456 Simple St",
        "city": "Basic City",
        "state": "CA",
        "zip_code": "90210",
        
        # Required Position Information
        "department": "Housekeeping",
        "position": "Room Attendant",
        
        # Required Work Authorization
        "work_authorized": "yes",
        "sponsorship_required": "no",
        "age_verification": True,
        "conviction_record": {
            "has_conviction": False,
            "explanation": None
        },
        
        # Required Availability
        "employment_type": "part_time",
        "shift_preference": "morning",
        
        # Required Previous Employment
        "previous_hotel_employment": False,
        
        # Required How Heard
        "how_heard": "online",
        
        # Required Reference
        "personal_reference": {
            "name": "Alice Johnson",
            "years_known": "5",
            "phone": "555-222-3333",
            "relationship": "Former colleague"
        },
        
        # Required Military (empty)
        "military_service": {},
        
        # Required Education (at least one)
        "education_history": [
            {
                "school_name": "Local High School",
                "location": "Hometown, CA",
                "years_attended": "2015-2019",
                "graduated": True,
                "degree_received": "High School Diploma"
            }
        ],
        
        # Required Employment History (at least one)
        "employment_history": [
            {
                "company_name": "Previous Employer",
                "phone": "555-444-5555",
                "address": "789 Work St",
                "supervisor": "Bob Manager",
                "job_title": "Cleaner",
                "starting_salary": "$20,000",
                "ending_salary": "$22,000",
                "from_date": "2020-01",
                "to_date": "2024-12",
                "reason_for_leaving": "Better opportunity",
                "may_contact": True
            }
        ],
        
        # Required Experience
        "experience_years": "2-5",
        "hotel_experience": "no"
    }

def count_fields(application: Dict[str, Any]) -> int:
    """Count the total number of fields in the application"""
    count = 0
    
    def count_recursive(obj: Any, prefix: str = "") -> int:
        nonlocal count
        if isinstance(obj, dict):
            for key, value in obj.items():
                if isinstance(value, (dict, list)):
                    count_recursive(value, f"{prefix}{key}.")
                else:
                    count += 1
                    # print(f"  Field {count}: {prefix}{key} = {value}")
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                count_recursive(item, f"{prefix}[{i}].")
        else:
            count += 1
    
    count_recursive(application)
    return count

async def test_submit_application(application_data: Dict[str, Any], test_name: str) -> Dict[str, Any]:
    """Test submitting a job application"""
    print_test_header(f"Submit Application - {test_name}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Count fields
            field_count = count_fields(application_data)
            print_info(f"Submitting application with {field_count} fields")
            
            # Submit application
            response = await client.post(
                f"{BASE_URL}/api/apply/{TEST_PROPERTY_ID}",
                json=application_data
            )
            
            if response.status_code == 200:
                result = response.json()
                print_success(f"Application submitted successfully!")
                print_info(f"Application ID: {result.get('application_id')}")
                print_info(f"Position: {result.get('position_applied')}")
                return result
            else:
                print_error(f"Failed to submit application: {response.status_code}")
                print_error(f"Response: {response.text}")
                return None
                
        except Exception as e:
            print_error(f"Error submitting application: {str(e)}")
            return None

async def test_manager_login() -> str:
    """Login as a manager and get token"""
    print_test_header("Manager Login")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{BASE_URL}/api/auth/login",
                json={
                    "email": "manager@demo.com",
                    "password": "ManagerDemo123!"
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                # The response has 'data' which contains 'token'
                data = result.get('data', {})
                token = data.get('token')
                user = data.get('user', {})
                print_success("Manager login successful")
                print_info(f"Role: {user.get('role')}")
                print_info(f"Property ID: {user.get('property_id', 'Not specified')}")
                return token
            else:
                print_error(f"Login failed: {response.status_code}")
                print_error(f"Response: {response.text}")
                return None
                
        except Exception as e:
            print_error(f"Error during login: {str(e)}")
            return None

async def test_retrieve_applications(token: str) -> List[Dict[str, Any]]:
    """Retrieve applications as a manager"""
    print_test_header("Retrieve Applications as Manager")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{BASE_URL}/api/manager/applications",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                result = response.json()
                applications = result.get('data', [])
                print_success(f"Retrieved {len(applications)} applications")
                return applications
            else:
                print_error(f"Failed to retrieve applications: {response.status_code}")
                print_error(f"Response: {response.text}")
                return []
                
        except Exception as e:
            print_error(f"Error retrieving applications: {str(e)}")
            return []

def verify_application_fields(submitted: Dict[str, Any], retrieved: Dict[str, Any]) -> Dict[str, Any]:
    """Verify that all submitted fields are present in retrieved application"""
    print_test_header("Field Verification")
    
    applicant_data = retrieved.get('applicant_data', {})
    missing_fields = []
    mismatched_fields = []
    verified_fields = []
    
    def verify_recursive(submitted_obj: Any, retrieved_obj: Any, path: str = ""):
        """Recursively verify fields"""
        if isinstance(submitted_obj, dict):
            if not isinstance(retrieved_obj, dict):
                missing_fields.append(f"{path} (expected dict, got {type(retrieved_obj).__name__})")
                return
                
            for key, value in submitted_obj.items():
                field_path = f"{path}.{key}" if path else key
                if key not in retrieved_obj:
                    missing_fields.append(field_path)
                else:
                    verify_recursive(value, retrieved_obj[key], field_path)
                    
        elif isinstance(submitted_obj, list):
            if not isinstance(retrieved_obj, list):
                missing_fields.append(f"{path} (expected list, got {type(retrieved_obj).__name__})")
                return
                
            if len(submitted_obj) != len(retrieved_obj):
                mismatched_fields.append(f"{path} (list length: expected {len(submitted_obj)}, got {len(retrieved_obj)})")
                
            for i, item in enumerate(submitted_obj):
                if i < len(retrieved_obj):
                    verify_recursive(item, retrieved_obj[i], f"{path}[{i}]")
                    
        else:
            # Leaf field - verify value
            if submitted_obj != retrieved_obj:
                # Check for common transformations
                if isinstance(submitted_obj, str) and isinstance(retrieved_obj, str):
                    if submitted_obj.lower() == retrieved_obj.lower():
                        verified_fields.append(f"{path} (case difference)")
                    else:
                        mismatched_fields.append(f"{path}: expected '{submitted_obj}', got '{retrieved_obj}'")
                else:
                    mismatched_fields.append(f"{path}: expected '{submitted_obj}', got '{retrieved_obj}'")
            else:
                verified_fields.append(path)
    
    # Verify all fields
    verify_recursive(submitted, applicant_data)
    
    # Print results
    total_fields = len(verified_fields) + len(missing_fields) + len(mismatched_fields)
    
    print_info(f"Total fields checked: {total_fields}")
    print_success(f"Verified fields: {len(verified_fields)}")
    
    if missing_fields:
        print_error(f"Missing fields: {len(missing_fields)}")
        for field in missing_fields[:10]:  # Show first 10
            print_info(f"  - {field}")
        if len(missing_fields) > 10:
            print_info(f"  ... and {len(missing_fields) - 10} more")
    
    if mismatched_fields:
        print_warning(f"Mismatched fields: {len(mismatched_fields)}")
        for field in mismatched_fields[:10]:  # Show first 10
            print_info(f"  - {field}")
        if len(mismatched_fields) > 10:
            print_info(f"  ... and {len(mismatched_fields) - 10} more")
    
    return {
        "total": total_fields,
        "verified": len(verified_fields),
        "missing": len(missing_fields),
        "mismatched": len(mismatched_fields),
        "missing_fields": missing_fields,
        "mismatched_fields": mismatched_fields
    }

async def test_special_characters():
    """Test application with special characters"""
    print_test_header("Special Characters Test")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    special_app = create_minimal_test_application()
    
    # Add special characters to various fields
    special_app["first_name"] = "José"
    special_app["last_name"] = f"O'Brien-Smith_{timestamp}"
    special_app["address"] = "123 Café & Restaurant Blvd #456"
    special_app["additional_comments"] = "I speak français & español! I've worked at \"The Plaza\" hotel."
    special_app["personal_reference"]["name"] = "María García-López"
    
    result = await test_submit_application(special_app, "Special Characters")
    return result

async def test_max_length_inputs():
    """Test application with maximum length inputs"""
    print_test_header("Maximum Length Test")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    max_app = create_minimal_test_application()
    
    # Create long strings (but reasonable for database)
    long_text = "A" * 500  # 500 characters
    
    max_app["additional_comments"] = long_text
    max_app["skills_languages_certifications"] = long_text
    max_app["conviction_record"]["explanation"] = long_text[:200]  # Shorter for this field
    max_app["email"] = f"very.long.email.address.{timestamp}@example.com"
    
    result = await test_submit_application(max_app, "Maximum Length")
    return result

async def run_all_tests():
    """Run all comprehensive tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}JOB APPLICATION DATA FLOW TEST SUITE{RESET}")
    print(f"{BLUE}Testing all 87 fields from submission to manager view{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    results = {
        "complete_app": None,
        "minimal_app": None,
        "special_chars": None,
        "max_length": None,
        "verification": None
    }
    
    try:
        # Test 1: Submit complete application with all fields
        complete_app = create_complete_test_application()
        complete_result = await test_submit_application(complete_app, "Complete Application")
        results["complete_app"] = complete_result
        
        # Test 2: Submit minimal application
        minimal_app = create_minimal_test_application()
        minimal_result = await test_submit_application(minimal_app, "Minimal Application")
        results["minimal_app"] = minimal_result
        
        # Test 3: Special characters
        special_result = await test_special_characters()
        results["special_chars"] = special_result
        
        # Test 4: Maximum length inputs
        max_result = await test_max_length_inputs()
        results["max_length"] = max_result
        
        # Wait a moment for data to propagate
        print_info("\nWaiting 2 seconds for data propagation...")
        await asyncio.sleep(2)
        
        # Test 5: Login as manager
        token = await test_manager_login()
        if not token:
            print_error("Cannot continue without manager token")
            return results
        
        # Test 6: Retrieve applications
        applications = await test_retrieve_applications(token)
        
        # Test 7: Verify the complete application
        if complete_result and applications:
            app_id = complete_result.get('application_id')
            
            # Find our submitted application
            our_app = None
            for app in applications:
                if app.get('id') == app_id:
                    our_app = app
                    break
            
            if our_app:
                print_success(f"Found our submitted application: {app_id}")
                
                # Verify all fields
                verification = verify_application_fields(complete_app, our_app)
                results["verification"] = verification
                
                # Display specific fields for manual verification
                print_test_header("Sample Field Display")
                applicant_data = our_app.get('applicant_data', {})
                
                print_info("Personal Information:")
                print_info(f"  Name: {applicant_data.get('first_name')} {applicant_data.get('middle_initial', '')} {applicant_data.get('last_name')}")
                print_info(f"  Email: {applicant_data.get('email')}")
                print_info(f"  Phone: {applicant_data.get('phone')} (Cell: {applicant_data.get('phone_is_cell')}, Home: {applicant_data.get('phone_is_home')})")
                print_info(f"  Address: {applicant_data.get('address')} {applicant_data.get('apartment_unit', '')}")
                print_info(f"  City/State/Zip: {applicant_data.get('city')}, {applicant_data.get('state')} {applicant_data.get('zip_code')}")
                
                print_info("\nPosition Information:")
                print_info(f"  Department: {applicant_data.get('department')}")
                print_info(f"  Position: {applicant_data.get('position')}")
                print_info(f"  Salary Desired: {applicant_data.get('salary_desired')}")
                
                print_info("\nMilitary Service:")
                military = applicant_data.get('military_service', {})
                if military:
                    print_info(f"  Branch: {military.get('branch')}")
                    print_info(f"  Service Period: {military.get('from_date')} to {military.get('to_date')}")
                    print_info(f"  Rank at Discharge: {military.get('rank_at_discharge')}")
                
                print_info("\nEducation History:")
                education = applicant_data.get('education_history', [])
                for i, edu in enumerate(education, 1):
                    print_info(f"  Education {i}: {edu.get('school_name')} - {edu.get('degree_received')}")
                
                print_info("\nEmployment History:")
                employment = applicant_data.get('employment_history', [])
                for i, emp in enumerate(employment, 1):
                    print_info(f"  Job {i}: {emp.get('company_name')} - {emp.get('job_title')}")
                    print_info(f"    Period: {emp.get('from_date')} to {emp.get('to_date')}")
                    print_info(f"    Salary: {emp.get('starting_salary')} to {emp.get('ending_salary')}")
                
                print_info("\nAdditional Information:")
                print_info(f"  Skills/Languages: {applicant_data.get('skills_languages_certifications', 'None')[:100]}...")
                print_info(f"  Comments: {applicant_data.get('additional_comments', 'None')[:100]}...")
                
            else:
                print_error(f"Could not find application {app_id} in retrieved list")
        
    except Exception as e:
        print_error(f"Test suite error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Final summary
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    if results["complete_app"]:
        print_success("✓ Complete application submitted successfully")
    else:
        print_error("✗ Complete application submission failed")
    
    if results["minimal_app"]:
        print_success("✓ Minimal application submitted successfully")
    else:
        print_error("✗ Minimal application submission failed")
    
    if results["special_chars"]:
        print_success("✓ Special characters handled correctly")
    else:
        print_error("✗ Special characters test failed")
    
    if results["max_length"]:
        print_success("✓ Maximum length inputs handled correctly")
    else:
        print_error("✗ Maximum length test failed")
    
    if results["verification"]:
        v = results["verification"]
        if v["missing"] == 0 and v["mismatched"] == 0:
            print_success(f"✓ All {v['total']} fields verified successfully!")
        else:
            print_warning(f"⚠ Field verification: {v['verified']}/{v['total']} passed")
            if v["missing"] > 0:
                print_error(f"  {v['missing']} fields missing")
            if v["mismatched"] > 0:
                print_warning(f"  {v['mismatched']} fields mismatched")
    
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}TEST COMPLETE{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    return results

if __name__ == "__main__":
    # Check if server is running
    try:
        import httpx
        response = httpx.get(f"{BASE_URL}/health", timeout=5.0)
        if response.status_code != 200:
            print_error("Backend server is not responding at http://localhost:8000")
            print_info("Please start the backend server first:")
            print_info("  cd hotel-onboarding-backend")
            print_info("  python3 -m uvicorn app.main_enhanced:app --reload")
            sys.exit(1)
    except Exception:
        print_error("Cannot connect to backend server at http://localhost:8000")
        print_info("Please start the backend server first:")
        print_info("  cd hotel-onboarding-backend")
        print_info("  python3 -m uvicorn app.main_enhanced:app --reload")
        sys.exit(1)
    
    # Run tests
    asyncio.run(run_all_tests())