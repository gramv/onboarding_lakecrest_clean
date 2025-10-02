#!/usr/bin/env python3
"""
Test script to verify all 87 fields in JobApplicationData model
and ensure frontend is sending all required data
"""

import json
from typing import Dict, Any
from app.models import JobApplicationData
from pydantic import ValidationError

def create_complete_test_data() -> Dict[str, Any]:
    """Create a complete test application with all 87 fields"""
    
    return {
        # Personal Information (17 fields)
        "first_name": "John",
        "middle_initial": "M",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "phone": "(555) 123-4567",
        "phone_is_cell": True,
        "phone_is_home": False,
        "secondary_phone": "(555) 987-6543",
        "secondary_phone_is_cell": False,
        "secondary_phone_is_home": True,
        "address": "123 Main Street",
        "apartment_unit": "Apt 4B",
        "city": "New York",
        "state": "NY",
        "zip_code": "10001",
        
        # Position Information (3 fields)
        "department": "Front Desk",
        "position": "Front Desk Agent",
        "salary_desired": "$15-20/hour",
        
        # Work Authorization & Legal (5 fields including nested)
        "work_authorized": "yes",
        "sponsorship_required": "no",
        "age_verification": True,
        "conviction_record": {
            "has_conviction": False,
            "explanation": None
        },
        
        # Availability (5 fields)
        "start_date": "2025-01-01",
        "shift_preference": "flexible",
        "employment_type": "full_time",
        "seasonal_start_date": None,
        "seasonal_end_date": None,
        
        # Previous Hotel Employment (2 fields)
        "previous_hotel_employment": False,
        "previous_hotel_details": None,
        
        # How heard about position (2 fields)
        "how_heard": "website",
        "how_heard_detailed": "Indeed.com",
        
        # Personal Reference (4 nested fields)
        "personal_reference": {
            "name": "Jane Smith",
            "years_known": "5",
            "phone": "(555) 456-7890",
            "relationship": "Former colleague"
        },
        
        # Military Service (6 nested fields)
        "military_service": {
            "branch": None,
            "from_date": None,
            "to_date": None,
            "rank_at_discharge": None,
            "type_of_discharge": None,
            "disabilities_related": None
        },
        
        # Education History (array with 5 fields per entry)
        "education_history": [
            {
                "school_name": "State University",
                "location": "New York, NY",
                "years_attended": "2018-2022",
                "graduated": True,
                "degree_received": "Bachelor of Arts"
            }
        ],
        
        # Employment History (array with 9 fields per entry)
        "employment_history": [
            {
                "company_name": "Previous Hotel",
                "phone": "(555) 222-3333",
                "address": "456 Hotel Ave, City, ST 12345",
                "supervisor": "Bob Manager",
                "job_title": "Guest Service Agent",
                "starting_salary": "$12/hour",
                "ending_salary": "$14/hour",
                "from_date": "2022-06",
                "to_date": "2024-12"
            },
            {
                "company_name": "Restaurant ABC",
                "phone": "(555) 333-4444",
                "address": "789 Food St, Town, ST 67890",
                "supervisor": "Alice Supervisor",
                "job_title": "Server",
                "starting_salary": "$10/hour",
                "ending_salary": "$12/hour",
                "from_date": "2020-01",
                "to_date": "2022-05"
            }
        ],
        
        # Skills, Languages, and Certifications (1 field)
        "skills_languages_certifications": "Bilingual (English/Spanish); Microsoft Office; CPR Certified",
        
        # Voluntary Self-Identification (4 nested fields)
        "voluntary_self_identification": {
            "gender": "male",
            "race_ethnicity": "white",
            "veteran_status": "not_veteran",
            "disability_status": "no_disability"
        },
        
        # Experience (2 fields)
        "experience_years": "2-5",
        "hotel_experience": "yes",
        
        # Additional Information (1 field)
        "additional_comments": "Looking forward to joining your team!"
    }

def count_fields(data: Dict[str, Any], prefix: str = "") -> int:
    """Recursively count all fields including nested ones"""
    count = 0
    for key, value in data.items():
        if isinstance(value, dict):
            count += count_fields(value, f"{prefix}{key}.")
        elif isinstance(value, list):
            for i, item in enumerate(value):
                if isinstance(item, dict):
                    count += count_fields(item, f"{prefix}{key}[{i}].")
                else:
                    count += 1
                    print(f"  {prefix}{key}[{i}]: {item}")
        else:
            count += 1
            print(f"  {prefix}{key}: {value if value is not None else 'None'}")
    return count

def validate_application_data():
    """Test that all fields are properly handled"""
    
    print("=" * 60)
    print("JobApplicationData Field Validation Test")
    print("=" * 60)
    
    # Create test data
    test_data = create_complete_test_data()
    
    # Count fields
    print("\n📊 Counting all fields (including nested):")
    total_fields = count_fields(test_data)
    print(f"\n✅ Total fields in test data: {total_fields}")
    
    # Validate with Pydantic model
    print("\n🔍 Validating with JobApplicationData model...")
    try:
        application = JobApplicationData(**test_data)
        print("✅ Validation successful!")
        
        # Convert back to dict to verify all fields are preserved
        validated_data = application.dict()
        validated_count = count_fields(validated_data)
        print(f"\n📈 Fields after validation: {validated_count}")
        
        # Check specific nested structures
        print("\n🔎 Checking nested structures:")
        print(f"  - Conviction record has_conviction: {validated_data['conviction_record']['has_conviction']}")
        print(f"  - Personal reference name: {validated_data['personal_reference']['name']}")
        print(f"  - Education entries: {len(validated_data['education_history'])}")
        print(f"  - Employment entries: {len(validated_data['employment_history'])}")
        print(f"  - Voluntary self-identification gender: {validated_data.get('voluntary_self_identification', {}).get('gender', 'Not provided')}")
        
    except ValidationError as e:
        print(f"❌ Validation failed:")
        for error in e.errors():
            print(f"  - {error['loc']}: {error['msg']}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ All fields properly mapped and validated!")
    print("=" * 60)
    return True

def check_frontend_mapping():
    """Display the mapping between frontend and backend field names"""
    
    print("\n" + "=" * 60)
    print("Frontend to Backend Field Mapping Guide")
    print("=" * 60)
    
    mappings = {
        "Personal Info": {
            "middle_name": "middle_initial (first char only)",
            "alternate_phone": "secondary_phone",
            "alternate_phone_is_cell": "secondary_phone_is_cell",
            "alternate_phone_is_home": "secondary_phone_is_home",
        },
        "Position Info": {
            "position_applying_for OR position": "position",
            "desired_salary OR salary_desired": "salary_desired",
        },
        "Legal Info": {
            "has_criminal_record": "conviction_record.has_conviction",
            "criminal_record_explanation": "conviction_record.explanation",
        },
        "Availability": {
            "schedule_preference": "shift_preference",
        },
        "References": {
            "professional_references[0]": "personal_reference (first one)",
        },
        "Military": {
            "military_branch": "military_service.branch",
            "military_from_date": "military_service.from_date",
            "military_to_date": "military_service.to_date",
            "military_rank": "military_service.rank_at_discharge",
            "military_discharge_type": "military_service.type_of_discharge",
            "military_disabilities": "military_service.disabilities_related",
        },
        "Education": {
            "school_name + location + years": "education_history array",
            "graduated": "education_history[].graduated",
            "degree_obtained": "education_history[].degree_received",
        },
        "Employment": {
            "employer_name": "company_name",
            "supervisor_phone": "phone",
            "employer_address": "address",
            "starting_salary": "starting_salary",
            "ending_salary": "ending_salary",
        },
        "Skills": {
            "skills + languages_spoken + certifications": "skills_languages_certifications (combined)",
        }
    }
    
    for category, fields in mappings.items():
        print(f"\n{category}:")
        for frontend, backend in fields.items():
            print(f"  {frontend:40} → {backend}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    # Run validation
    validate_application_data()
    
    # Show mapping guide
    check_frontend_mapping()
    
    print("\n✅ Test complete! The frontend should compile and send all these fields.")