#!/usr/bin/env python3
"""
Test cross-browser synchronization for the onboarding system
This simulates completing steps in one browser and checking if they appear in another
"""

import requests
import json
import time
from datetime import datetime

# API base URL
API_URL = "http://localhost:8000/api"

# Test data
TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6IjE5MzEwYTM2LTc5N2MtNDQ2NC05NDViLWE0YTA2YTVlMTdjMiIsImFwcGxpY2F0aW9uX2lkIjpudWxsLCJ0b2tlbl90eXBlIjoib25ib2FyZGluZyIsImlhdCI6MTc1NzgxMjIxNSwiZXhwIjoxNzU4MDcxNDE1LCJqdGkiOiJUZS1NdTBFcVJHRTEzaDd6VlYtVll3In0.gg1XPTd2oTFSd7bVVcXo_Tpd1GISJYb4P51Yj_QVL2c"
TEST_EMPLOYEE_ID = "19310a36-797c-4464-945b-a4a06a5e17c2"

def test_save_progress():
    """Simulate saving progress in 'Browser 1'"""
    print("\n🌐 BROWSER 1: Saving progress for personal-info step...")
    
    # Test data for personal info
    test_data = {
        "employee_id": TEST_EMPLOYEE_ID,
        "step_id": "personal-info",
        "data": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@test.com",
            "phone": "555-0123",
            "address": "123 Test St",
            "city": "Test City",
            "state": "TS",
            "zipCode": "12345",
            "ssn": "123-45-6789",
            "dateOfBirth": "1990-01-01",
            "emergencyContacts": [{
                "name": "Jane Doe",
                "relationship": "Spouse",
                "phone": "555-0124"
            }],
            "timestamp": datetime.now().isoformat()
        },
        "token": TEST_TOKEN
    }
    
    try:
        response = requests.post(
            f"{API_URL}/onboarding/save-progress",
            json=test_data,
            headers={"Authorization": f"Bearer {TEST_TOKEN}"}
        )
        
        if response.status_code == 200:
            print("✅ Progress saved successfully!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Failed to save progress: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error saving progress: {e}")
        return False

def test_load_progress_new_browser():
    """Simulate loading the same session in 'Browser 2'"""
    print("\n🌐 BROWSER 2: Loading onboarding session with same token...")
    
    try:
        # Get welcome data (which should include saved progress)
        response = requests.get(
            f"{API_URL}/onboarding/welcome/{TEST_TOKEN}",
            headers={"Authorization": f"Bearer {TEST_TOKEN}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if we have saved form data
            if 'data' in data and 'savedFormData' in data['data']:
                saved_data = data['data']['savedFormData']
                if saved_data and 'personal-info' in saved_data:
                    print("✅ Progress loaded successfully from cloud!")
                    print(f"   Found saved data for step: personal-info")
                    print(f"   Data preview: {json.dumps(saved_data['personal-info'], indent=2)[:200]}...")
                    return True
                else:
                    print("⚠️  No saved form data found in response")
                    print(f"   savedFormData: {saved_data}")
            
            # Check new savedProgress field
            if 'data' in data and 'savedProgress' in data['data']:
                saved_progress = data['data']['savedProgress']
                if saved_progress and 'personal-info' in saved_progress:
                    print("✅ Found progress in new savedProgress field!")
                    print(f"   Step completion status: {saved_progress['personal-info'].get('completed', False)}")
                    return True
            
            print("❌ No progress data found in response")
            return False
        else:
            print(f"❌ Failed to load welcome data: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error loading progress: {e}")
        return False

def test_recovery_endpoint():
    """Test the dedicated recovery endpoint"""
    print("\n🔄 Testing dedicated recovery endpoint...")
    
    try:
        response = requests.get(
            f"{API_URL}/onboarding/recover-progress/{TEST_EMPLOYEE_ID}",
            params={"token": TEST_TOKEN},
            headers={"Authorization": f"Bearer {TEST_TOKEN}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'data' in data and 'savedProgress' in data['data']:
                saved_progress = data['data']['savedProgress']
                if saved_progress:
                    print("✅ Recovery endpoint working!")
                    print(f"   Found {len(saved_progress)} steps with saved data")
                    for step_id, progress in saved_progress.items():
                        print(f"   - {step_id}: completed={progress.get('completed', False)}")
                    return True
            print("⚠️  Recovery endpoint returned no data")
            return False
        else:
            print(f"❌ Recovery endpoint failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error calling recovery endpoint: {e}")
        return False

def main():
    """Run cross-browser synchronization tests"""
    print("=" * 60)
    print("CROSS-BROWSER SYNCHRONIZATION TEST")
    print("=" * 60)
    print(f"Using Employee ID: {TEST_EMPLOYEE_ID}")
    print(f"API URL: {API_URL}")
    
    # Test 1: Save progress in "Browser 1"
    save_success = test_save_progress()
    
    if save_success:
        # Wait a moment for database to sync
        print("\n⏳ Waiting 2 seconds for database sync...")
        time.sleep(2)
        
        # Test 2: Load progress in "Browser 2"
        load_success = test_load_progress_new_browser()
        
        # Test 3: Try recovery endpoint
        recovery_success = test_recovery_endpoint()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Save Progress (Browser 1): {'PASSED' if save_success else 'FAILED'}")
        print(f"✅ Load Progress (Browser 2): {'PASSED' if load_success else 'FAILED'}")
        print(f"✅ Recovery Endpoint: {'PASSED' if recovery_success else 'FAILED'}")
        
        if save_success and load_success:
            print("\n🎉 CROSS-BROWSER SYNC IS WORKING!")
            print("Progress saved in one browser is successfully loaded in another!")
        else:
            print("\n⚠️  Cross-browser sync needs attention")
    else:
        print("\n❌ Could not test cross-browser sync - save operation failed")

if __name__ == "__main__":
    main()