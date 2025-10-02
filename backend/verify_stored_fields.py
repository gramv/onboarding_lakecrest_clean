#!/usr/bin/env python3
"""
Verify that all fields from a job application are properly stored in the database.
"""

import sys
import os
from pathlib import Path
import asyncio

# Add backend path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

# Load environment variables
from dotenv import load_dotenv
env_path = backend_path / '.env'
if env_path.exists():
    load_dotenv(env_path)

from app.supabase_service_enhanced import EnhancedSupabaseService

async def verify_latest_application():
    """Verify the latest application has all fields stored"""
    
    print("=" * 60)
    print("VERIFYING STORED APPLICATION FIELDS")
    print("=" * 60)
    
    # Initialize service
    supabase = EnhancedSupabaseService()
    
    # Get the latest application
    print("\n📋 Fetching latest application from database...")
    
    try:
        # Get latest application for our test property
        property_id = "ae926aac-eb0f-4616-8629-87898e8b0d70"
        applications = await supabase.get_applications_by_property(property_id)
        
        if not applications:
            print("❌ No applications found")
            return
        
        # Sort by applied_at to get the latest
        latest_app = sorted(applications, key=lambda x: x.applied_at, reverse=True)[0]
        
        print(f"\n✅ Found latest application:")
        print(f"   ID: {latest_app.id}")
        print(f"   Applied: {latest_app.applied_at}")
        print(f"   Position: {latest_app.position} - {latest_app.department}")
        
        # Check applicant_data fields
        applicant_data = latest_app.applicant_data
        
        print(f"\n📊 ANALYZING STORED FIELDS:")
        
        # Check main categories
        categories = {
            "Personal Information": [
                "first_name", "middle_initial", "last_name", "email", "phone",
                "phone_is_cell", "phone_is_home", "secondary_phone", 
                "secondary_phone_is_cell", "secondary_phone_is_home",
                "address", "apartment_unit", "city", "state", "zip_code"
            ],
            "Position Information": [
                "department", "position", "salary_desired"
            ],
            "Work Authorization": [
                "work_authorized", "sponsorship_required", "age_verification", "conviction_record"
            ],
            "Availability": [
                "start_date", "shift_preference", "employment_type", 
                "seasonal_start_date", "seasonal_end_date"
            ],
            "Previous Hotel": [
                "previous_hotel_employment", "previous_hotel_details"
            ],
            "How Heard": [
                "how_heard", "how_heard_detailed"
            ],
            "References": ["personal_reference"],
            "Military": ["military_service"],
            "Education": ["education_history"],
            "Employment": ["employment_history"],
            "Skills": ["skills_languages_certifications"],
            "Self-Identification": ["voluntary_self_identification"],
            "Experience": ["experience_years", "hotel_experience"],
            "Comments": ["additional_comments"]
        }
        
        total_fields = 0
        missing_fields = []
        
        for category, fields in categories.items():
            present = []
            absent = []
            
            for field in fields:
                if field in applicant_data:
                    present.append(field)
                    total_fields += 1
                    
                    # Count nested fields
                    value = applicant_data[field]
                    if isinstance(value, dict):
                        total_fields += len([k for k in value.keys() if value[k] is not None])
                    elif isinstance(value, list) and value:
                        for item in value:
                            if isinstance(item, dict):
                                total_fields += len(item.keys())
                else:
                    absent.append(field)
                    missing_fields.append(field)
            
            if present:
                print(f"\n   ✅ {category}: {len(present)}/{len(fields)} fields stored")
                if absent:
                    print(f"      ⚠️  Missing: {', '.join(absent)}")
        
        # Check specific nested objects
        print("\n📦 NESTED OBJECTS:")
        
        if "conviction_record" in applicant_data:
            conviction = applicant_data["conviction_record"]
            if isinstance(conviction, dict):
                print(f"   ✅ conviction_record: {len(conviction)} fields")
                print(f"      - has_conviction: {conviction.get('has_conviction')}")
                print(f"      - explanation: {conviction.get('explanation', 'None')}")
        
        if "personal_reference" in applicant_data:
            ref = applicant_data["personal_reference"]
            if isinstance(ref, dict):
                print(f"   ✅ personal_reference: {len(ref)} fields")
                for key in ["name", "years_known", "phone", "relationship"]:
                    if key in ref:
                        print(f"      - {key}: ✓")
        
        if "military_service" in applicant_data:
            military = applicant_data["military_service"]
            if isinstance(military, dict):
                print(f"   ✅ military_service: {len([k for k in military if military[k] is not None])} fields")
        
        if "voluntary_self_identification" in applicant_data:
            vol_id = applicant_data["voluntary_self_identification"]
            if isinstance(vol_id, dict):
                print(f"   ✅ voluntary_self_identification: {len([k for k in vol_id if vol_id[k] is not None])} fields")
        
        if "education_history" in applicant_data:
            edu = applicant_data["education_history"]
            if isinstance(edu, list):
                print(f"   ✅ education_history: {len(edu)} entries")
        
        if "employment_history" in applicant_data:
            emp = applicant_data["employment_history"]
            if isinstance(emp, list):
                print(f"   ✅ employment_history: {len(emp)} entries")
        
        print(f"\n" + "=" * 60)
        print(f"📈 SUMMARY:")
        print(f"   Total fields stored: {total_fields}")
        print(f"   Missing fields: {len(missing_fields)}")
        
        if missing_fields:
            print(f"\n⚠️  Missing fields: {', '.join(missing_fields)}")
        else:
            print(f"\n✅ ALL FIELDS SUCCESSFULLY STORED!")
        
        print("=" * 60)
        
        return total_fields
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 0

async def main():
    fields_count = await verify_latest_application()
    
    if fields_count > 50:
        print(f"\n🎉 SUCCESS: {fields_count} fields verified in database!")
    else:
        print(f"\n⚠️  Only {fields_count} fields found. Expected 50+")

if __name__ == "__main__":
    asyncio.run(main())