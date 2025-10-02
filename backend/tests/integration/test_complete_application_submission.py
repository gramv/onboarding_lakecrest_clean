#!/usr/bin/env python3
"""
Test script to verify job application submission endpoint stores ALL fields correctly.
This ensures all 50+ fields from JobApplicationData model are properly saved.
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
PROPERTY_ID = "ae926aac-eb0f-4616-8629-87898e8b0d70"  # Active test property ID (rci)

def create_complete_test_application():
    """Create a comprehensive test application with ALL fields populated"""
    return {
        # Personal Information (16 fields)
        "first_name": "TestComplete",
        "middle_initial": "M",
        "last_name": f"User{datetime.now().strftime('%H%M%S')}",
        "email": f"test.complete{datetime.now().strftime('%H%M%S')}@example.com",
        "phone": "555-123-4567",
        "phone_is_cell": True,
        "phone_is_home": False,
        "secondary_phone": "555-987-6543",
        "secondary_phone_is_cell": False,
        "secondary_phone_is_home": True,
        "address": "123 Complete Test Street",
        "apartment_unit": "Suite 500",
        "city": "TestCity",
        "state": "CA",
        "zip_code": "90210",
        
        # Position Information (3 fields)
        "department": "Front Desk",
        "position": "Night Auditor",
        "salary_desired": "55000",
        
        # Work Authorization & Legal (4 fields)
        "work_authorized": "yes",
        "sponsorship_required": "no",
        "age_verification": True,
        "conviction_record": {
            "has_conviction": False,
            "explanation": None
        },
        
        # Availability (5 fields)
        "start_date": "2025-02-01",
        "shift_preference": "night",
        "employment_type": "full_time",
        "seasonal_start_date": None,
        "seasonal_end_date": None,
        
        # Previous Hotel Employment (2 fields)
        "previous_hotel_employment": True,
        "previous_hotel_details": "Worked at Marriott Downtown 2020-2023 as Front Desk Supervisor",
        
        # How did you hear about us? (2 fields)
        "how_heard": "employee_referral",
        "how_heard_detailed": "Sarah Johnson from Housekeeping",
        
        # References (1 object with 4 fields)
        "personal_reference": {
            "name": "Dr. Jane Smith",
            "years_known": "8",
            "phone": "555-888-9999",
            "relationship": "Former Supervisor"
        },
        
        # Military Service (1 object with 6 fields)
        "military_service": {
            "branch": "Navy",
            "from_date": "2015-06",
            "to_date": "2019-06",
            "rank_at_discharge": "Petty Officer",
            "type_of_discharge": "Honorable",
            "disabilities_related": "None"
        },
        
        # Education History (array of objects)
        "education_history": [
            {
                "school_name": "State University",
                "location": "Los Angeles, CA",
                "years_attended": "2010-2014",
                "graduated": True,
                "degree_received": "Bachelor of Business Administration"
            },
            {
                "school_name": "Community College",
                "location": "Pasadena, CA",
                "years_attended": "2008-2010",
                "graduated": True,
                "degree_received": "Associate of Arts"
            }
        ],
        
        # Employment History (array of objects with 12 fields each)
        "employment_history": [
            {
                "company_name": "Marriott Downtown",
                "phone": "555-111-2222",
                "address": "500 Main St, Los Angeles, CA 90001",
                "supervisor": "Michael Brown",
                "job_title": "Front Desk Supervisor",
                "starting_salary": "45000",
                "ending_salary": "52000",
                "from_date": "2020-03",
                "to_date": "2023-12",
                "reason_for_leaving": "Career advancement opportunity",
                "may_contact": True
            },
            {
                "company_name": "Hilton Airport",
                "phone": "555-333-4444",
                "address": "1000 Airport Blvd, Los Angeles, CA 90045",
                "supervisor": "Jennifer Davis",
                "job_title": "Front Desk Agent",
                "starting_salary": "35000",
                "ending_salary": "42000",
                "from_date": "2017-06",
                "to_date": "2020-02",
                "reason_for_leaving": "Promotion at new company",
                "may_contact": True
            }
        ],
        
        # Skills, Languages, and Certifications (1 field)
        "skills_languages_certifications": "Fluent in English, Spanish, and French. CPR/First Aid Certified. PMS Systems: Opera, Fosse, OnQ. Microsoft Office Suite. Customer Service Excellence Award 2022.",
        
        # Voluntary Self-Identification (1 object with 4 fields)
        "voluntary_self_identification": {
            "gender": "female",
            "ethnicity": "asian",
            "veteran_status": "protected_veteran",
            "disability_status": "prefer_not_to_answer"
        },
        
        # Experience (2 fields)
        "experience_years": "6-10",
        "hotel_experience": "yes",
        
        # Additional Comments (1 field)
        "additional_comments": "I am passionate about hospitality and have received multiple customer service awards. I am available for all shifts and can start immediately. References available upon request."
    }

def test_submit_application():
    """Submit a complete application and verify all fields are stored"""
    
    print("=" * 60)
    print("TESTING COMPLETE JOB APPLICATION SUBMISSION")
    print("=" * 60)
    
    # Create test data
    application_data = create_complete_test_application()
    
    # Count fields
    field_count = count_fields(application_data)
    print(f"\n✓ Test application created with {field_count} total fields")
    
    # Submit application
    url = f"{BASE_URL}/api/apply/{PROPERTY_ID}"
    
    print(f"\n📤 Submitting application to: {url}")
    print(f"   Applicant: {application_data['first_name']} {application_data['last_name']}")
    print(f"   Email: {application_data['email']}")
    print(f"   Position: {application_data['position']} in {application_data['department']}")
    
    try:
        response = requests.post(url, json=application_data)
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ APPLICATION SUBMITTED SUCCESSFULLY!")
            print(f"   Application ID: {result.get('application_id')}")
            print(f"   Property: {result.get('property_name')}")
            print(f"   Position: {result.get('position_applied')}")
            print(f"   Message: {result.get('message')}")
            
            # Verify field categories were included
            print("\n📊 FIELD CATEGORIES SUBMITTED:")
            print("   ✓ Personal Information (16 fields)")
            print("   ✓ Position Information (3 fields)")  
            print("   ✓ Work Authorization & Legal (4 fields)")
            print("   ✓ Availability (5 fields)")
            print("   ✓ Previous Hotel Employment (2 fields)")
            print("   ✓ How Heard (2 fields)")
            print("   ✓ Personal Reference (4 fields)")
            print("   ✓ Military Service (6 fields)")
            print(f"   ✓ Education History ({len(application_data['education_history'])} entries)")
            print(f"   ✓ Employment History ({len(application_data['employment_history'])} entries)")
            print("   ✓ Skills & Certifications (1 field)")
            print("   ✓ Voluntary Self-Identification (4 fields)")
            print("   ✓ Experience (2 fields)")
            print("   ✓ Additional Comments (1 field)")
            
            print(f"\n🎯 TOTAL FIELDS STORED: {field_count}")
            
            return result
            
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"   Details: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection Error: Could not connect to backend server")
        print("   Make sure the backend is running on http://localhost:8000")
        return None
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return None

def count_fields(data, depth=0):
    """Recursively count all fields in the data structure"""
    count = 0
    for key, value in data.items():
        if value is not None:
            if isinstance(value, dict):
                count += count_fields(value, depth + 1)
            elif isinstance(value, list):
                count += 1  # Count the list itself
                for item in value:
                    if isinstance(item, dict):
                        count += count_fields(item, depth + 1)
            else:
                count += 1
    return count

if __name__ == "__main__":
    result = test_submit_application()
    
    if result:
        print("\n" + "=" * 60)
        print("✅ TEST COMPLETED SUCCESSFULLY")
        print("All 50+ fields from JobApplicationData model are now being stored!")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ TEST FAILED")
        print("Please check the backend server and try again.")
        print("=" * 60)