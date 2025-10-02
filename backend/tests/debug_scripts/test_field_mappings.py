#!/usr/bin/env python3
"""
Test script to verify field mappings between frontend and backend for job applications.
This specifically tests the fixed field mappings for conviction_record, age_verification, 
sponsorship_required, and work_authorized.
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"
MANAGER_EMAIL = "testmanager@example.com"
MANAGER_PASSWORD = "password123"

# Test application data with correct field mappings
test_application = {
    # Personal Information
    "first_name": "Test",
    "middle_name": "Field",
    "last_name": "Mapping",
    "email": f"test.mapping.{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com",
    "phone": "(555) 123-4567",
    "address": "123 Test Street",
    "city": "Test City",
    "state": "NY",
    "zip_code": "12345",
    
    # Critical fields to test
    "age_verification": True,  # Boolean field
    "work_authorized": "yes",  # String field: "yes" or "no"
    "sponsorship_required": "no",  # String field: "yes" or "no"
    "conviction_record": {
        "has_conviction": True,  # Testing positive case
        "explanation": "Minor traffic violation 5 years ago, fully resolved"
    },
    
    # Position Information
    "position": "Front Desk Agent",
    "department": "Front Office",
    "employment_type": "full_time",
    "shift_preference": "morning",
    "salary_desired": "35000",
    
    # Availability
    "available_start_date": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
    
    # Other required fields
    "reliable_transportation": "yes",
    "hotel_experience": "no",
    "hear_about_position": "online",
    
    # References
    "personal_reference": {
        "name": "John Reference",
        "relationship": "Former Supervisor",
        "phone": "(555) 987-6543",
        "email": "john.ref@example.com"
    },
    
    # Military Service
    "military_service": {
        "served": False,
        "branch": None,
        "from_date": None,
        "to_date": None,
        "honorable_discharge": None
    },
    
    # Property ID (required)
    "property_id": "test-prop-001"
}

async def test_field_mappings():
    """Test the field mappings by submitting an application and verifying stored data."""
    
    async with aiohttp.ClientSession() as session:
        print("\n" + "="*60)
        print("FIELD MAPPING TEST FOR JOB APPLICATIONS")
        print("="*60)
        
        # Step 1: Get manager token
        print("\n1. Getting manager authentication token...")
        login_data = {
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        }
        
        async with session.post(f"{BASE_URL}/auth/login", json=login_data) as resp:
            if resp.status != 200:
                print(f"   ❌ Login failed: {resp.status}")
                print(f"   Response: {await resp.text()}")
                return
            
            auth_data = await resp.json()
            token = auth_data.get("token")
            print(f"   ✅ Authentication successful")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 2: Submit test application
        print("\n2. Submitting test application with mapped fields...")
        print(f"   - age_verification: {test_application['age_verification']} (boolean)")
        print(f"   - work_authorized: '{test_application['work_authorized']}' (string)")
        print(f"   - sponsorship_required: '{test_application['sponsorship_required']}' (string)")
        print(f"   - conviction_record.has_conviction: {test_application['conviction_record']['has_conviction']}")
        print(f"   - conviction_record.explanation: '{test_application['conviction_record']['explanation'][:50]}...'")
        
        async with session.post(
            f"{BASE_URL}/job-applications/submit",
            json=test_application
        ) as resp:
            if resp.status != 200:
                print(f"   ❌ Application submission failed: {resp.status}")
                error_text = await resp.text()
                print(f"   Error: {error_text}")
                
                # Try to parse validation errors
                try:
                    error_json = json.loads(error_text)
                    if "detail" in error_json:
                        print("\n   Validation errors:")
                        for error in error_json.get("detail", []):
                            if isinstance(error, dict):
                                print(f"   - {error.get('loc', [])[-1]}: {error.get('msg')}")
                except:
                    pass
                return
            
            app_data = await resp.json()
            app_id = app_data.get("id")
            print(f"   ✅ Application submitted successfully: {app_id}")
        
        # Step 3: Retrieve and verify the application
        print("\n3. Retrieving submitted application to verify field mappings...")
        
        async with session.get(
            f"{BASE_URL}/hr/applications",
            headers=headers
        ) as resp:
            if resp.status != 200:
                print(f"   ❌ Failed to retrieve applications: {resp.status}")
                return
            
            applications = await resp.json()
            
            # Find our test application
            test_app = None
            for app in applications:
                if app.get("id") == app_id:
                    test_app = app
                    break
            
            if not test_app:
                print(f"   ❌ Could not find submitted application")
                return
            
            print(f"   ✅ Retrieved application data")
            
            # Step 4: Verify field mappings
            print("\n4. Verifying field mappings...")
            applicant_data = test_app.get("applicant_data", {})
            
            # Test age_verification
            age_verification = applicant_data.get("age_verification")
            if age_verification == True:
                print(f"   ✅ age_verification: {age_verification} (correctly stored as boolean)")
            else:
                print(f"   ❌ age_verification: {age_verification} (expected True)")
            
            # Test work_authorized
            work_authorized = applicant_data.get("work_authorized")
            if work_authorized == "yes":
                print(f"   ✅ work_authorized: '{work_authorized}' (correctly stored as string)")
            else:
                print(f"   ❌ work_authorized: '{work_authorized}' (expected 'yes')")
            
            # Test sponsorship_required
            sponsorship_required = applicant_data.get("sponsorship_required")
            if sponsorship_required == "no":
                print(f"   ✅ sponsorship_required: '{sponsorship_required}' (correctly stored as string)")
            else:
                print(f"   ❌ sponsorship_required: '{sponsorship_required}' (expected 'no')")
            
            # Test conviction_record
            conviction_record = applicant_data.get("conviction_record", {})
            has_conviction = conviction_record.get("has_conviction")
            explanation = conviction_record.get("explanation")
            
            if has_conviction == True:
                print(f"   ✅ conviction_record.has_conviction: {has_conviction} (correctly stored)")
            else:
                print(f"   ❌ conviction_record.has_conviction: {has_conviction} (expected True)")
            
            if explanation and "traffic violation" in explanation:
                print(f"   ✅ conviction_record.explanation: '{explanation[:50]}...' (correctly stored)")
            else:
                print(f"   ❌ conviction_record.explanation: '{explanation}' (expected explanation text)")
            
            # Display how these would appear in the manager dashboard
            print("\n5. How fields would display in Manager Dashboard:")
            print(f"   - 18 Years or Older: {'Yes' if age_verification == True else 'No' if age_verification == False else 'Not provided'}")
            print(f"   - Work Authorization: {'Yes' if work_authorized == 'yes' else 'No' if work_authorized == 'no' else 'Not provided'}")
            print(f"   - Requires Sponsorship: {'Yes' if sponsorship_required == 'yes' else 'No' if sponsorship_required == 'no' else 'Not provided'}")
            print(f"   - Criminal Record: {'Yes - See explanation' if has_conviction == True else 'No' if has_conviction == False else 'Not provided'}")
            
            print("\n" + "="*60)
            print("FIELD MAPPING TEST COMPLETE")
            print("="*60)
            
            # Return success status
            all_passed = (
                age_verification == True and
                work_authorized == "yes" and
                sponsorship_required == "no" and
                has_conviction == True and
                explanation and "traffic violation" in explanation
            )
            
            if all_passed:
                print("\n✅ ALL FIELD MAPPINGS ARE WORKING CORRECTLY!")
            else:
                print("\n⚠️ Some field mappings need attention")
            
            return all_passed

if __name__ == "__main__":
    result = asyncio.run(test_field_mappings())
    exit(0 if result else 1)