#!/usr/bin/env python3
"""
Comprehensive test script for health insurance flow
Tests all scenarios mentioned in the requirements
"""

import requests
import json
import base64
from datetime import datetime
import time

BASE_URL = "http://localhost:8000/api"

def print_test(test_name):
    """Print test header"""
    print(f"\n{'='*60}")
    print(f"TEST: {test_name}")
    print('='*60)

def check_response(response, test_name):
    """Check and print response details"""
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print(f"✅ {test_name} PASSED")
        try:
            data = response.json()
            if 'pdf_base64' in data:
                print("PDF generated successfully (base64 data present)")
                # Optionally decode and save for manual inspection
                pdf_data = base64.b64decode(data['pdf_base64'])
                filename = f"test_output_{test_name.replace(' ', '_').lower()}.pdf"
                with open(filename, 'wb') as f:
                    f.write(pdf_data)
                print(f"PDF saved as {filename}")
            else:
                print(json.dumps(data, indent=2))
        except:
            print("Response:", response.text[:500])
    else:
        print(f"❌ {test_name} FAILED")
        print("Error:", response.text)
    return response.status_code == 200

def test_data_flow():
    """Test 1: Data Flow Test"""
    print_test("Data Flow Test")
    
    employee_id = "test-employee-123"  # Use test- prefix
    
    # Simulate personal info data
    personal_info = {
        "firstName": "John",
        "lastName": "Doe",
        "ssn": "123-45-6789",
        "dateOfBirth": "1990-01-15",
        "address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "phoneNumber": "(555) 123-4567",
        "email": "john.doe@example.com"
    }
    
    # Test health insurance endpoint with personal info
    health_data = {
        "personalInfo": personal_info,
        "insuranceSelections": {
            "medicalPlan": "plan_a",
            "dentalPlan": "yes",
            "visionPlan": "yes"
        },
        "effectiveDate": "2025-01-01",
        "section125Acknowledged": True,
        "dependents": []
    }
    
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id}/health-insurance",
        json=health_data
    )
    
    return check_response(response, "Data Flow with Personal Info")

def test_section_125():
    """Test 2: Section 125 Acknowledgment Test"""
    print_test("Section 125 Acknowledgment Test")
    
    employee_id = "test-employee-124"  # Use test- prefix
    
    # Test without acknowledgment
    health_data = {
        "personalInfo": {
            "firstName": "Jane",
            "lastName": "Smith",
            "ssn": "987-65-4321",
            "dateOfBirth": "1985-05-20",
            "address": "456 Oak Ave",
            "city": "Los Angeles",
            "state": "CA",
            "zipCode": "90001"
        },
        "insuranceSelections": {
            "medicalPlan": "plan_b"
        },
        "section125Acknowledged": False,  # Not acknowledged
        "dependents": []
    }
    
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id}/health-insurance",
        json=health_data
    )
    
    # Should still save but mark as incomplete
    success = check_response(response, "Section 125 Not Acknowledged")
    
    # Now test with acknowledgment
    health_data["section125Acknowledged"] = True
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id}/health-insurance",
        json=health_data
    )
    
    return check_response(response, "Section 125 Acknowledged")

def test_dependent_info():
    """Test 3: Dependent Information Test"""
    print_test("Dependent Information Test")
    
    employee_id = "test-employee-125"  # Use test- prefix
    
    health_data = {
        "personalInfo": {
            "firstName": "Robert",
            "lastName": "Johnson",
            "ssn": "555-55-5555",
            "dateOfBirth": "1988-03-10",
            "address": "789 Pine St",
            "city": "Chicago",
            "state": "IL",
            "zipCode": "60601"
        },
        "insuranceSelections": {
            "medicalPlan": "plan_c",
            "dentalPlan": "yes",
            "visionPlan": "yes"
        },
        "section125Acknowledged": True,
        "dependents": [
            {
                "name": "Sarah Johnson",
                "relationship": "Spouse",
                "dateOfBirth": "1990-07-15",
                "ssn": "111-11-1111",
                "gender": "Female",
                "coverageTypes": ["Medical", "Dental", "Vision"]
            },
            {
                "name": "Tommy Johnson",
                "relationship": "Child",
                "dateOfBirth": "2015-04-20",
                "ssn": "222-22-2222",
                "gender": "Male",
                "coverageTypes": ["Medical", "Vision"]
            },
            {
                "name": "Emma Johnson",
                "relationship": "Child",
                "dateOfBirth": "2018-09-05",
                "ssn": "333-33-3333",
                "gender": "Female",
                "coverageTypes": ["Medical"]
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id}/health-insurance",
        json=health_data
    )
    
    return check_response(response, "Multiple Dependents with Different Coverage")

def test_pdf_generation():
    """Test 4: PDF Generation Test"""
    print_test("PDF Generation Test")
    
    employee_id = "test-employee-126"  # Use test- prefix
    
    # Complete health insurance data
    health_data = {
        "personalInfo": {
            "firstName": "Michael",
            "lastName": "Williams",
            "ssn": "444-44-4444",
            "dateOfBirth": "1992-12-25",
            "address": "321 Elm Street, Apt 5B",
            "city": "Boston",
            "state": "MA",
            "zipCode": "02101",
            "phoneNumber": "(617) 555-1234",
            "email": "m.williams@example.com"
        },
        "insuranceSelections": {
            "medicalPlan": "plan_b",
            "dentalPlan": "yes",
            "visionPlan": "no",
            "declineAllCoverage": False
        },
        "effectiveDate": "2025-02-01",
        "section125Acknowledged": True,
        "dependents": [
            {
                "name": "Lisa Williams",
                "relationship": "Spouse",
                "dateOfBirth": "1993-06-15",
                "ssn": "666-66-6666",
                "gender": "Female",
                "coverageTypes": ["Medical", "Dental"]
            }
        ]
    }
    
    # Test preview generation
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id}/health-insurance/preview",
        json=health_data
    )
    
    preview_success = check_response(response, "PDF Preview Generation")
    
    # Test final PDF with signature
    health_data["signatureData"] = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id}/health-insurance/generate-pdf",
        json=health_data
    )
    
    final_success = check_response(response, "Final PDF with Signature")
    
    return preview_success and final_success

def test_backend_api():
    """Test 5: Backend API Test"""
    print_test("Backend API Test")
    
    employee_id = "test-employee-127"  # Use test- prefix
    
    # Test with missing personal info
    incomplete_data = {
        "insuranceSelections": {
            "medicalPlan": "plan_a"
        },
        "dependents": []
    }
    
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id}/health-insurance",
        json=incomplete_data
    )
    
    print("Testing with missing personal info:")
    missing_info_handled = response.status_code in [200, 400]  # Either saved partially or validation error
    print(f"Status: {response.status_code} - {'Handled correctly' if missing_info_handled else 'Not handled'}")
    
    # Test with invalid data structure
    employee_id2 = "test-employee-128"  # Use test- prefix
    invalid_data = {
        "wrong_field": "invalid"
    }
    
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id2}/health-insurance",
        json=invalid_data
    )
    
    print("\nTesting with invalid data structure:")
    invalid_handled = response.status_code in [400, 422]  # Validation error expected
    print(f"Status: {response.status_code} - {'Handled correctly' if invalid_handled else 'Not handled'}")
    
    return missing_info_handled and invalid_handled

def test_end_to_end():
    """Test 6: End-to-End Flow Test"""
    print_test("End-to-End Flow Test")
    
    employee_id = f"test-e2e-{int(time.time())}"
    
    # Step 1: Save personal info (simulated)
    personal_info = {
        "firstName": "Complete",
        "lastName": "TestUser",
        "ssn": "999-99-9999",
        "dateOfBirth": "1995-08-30",
        "address": "999 Test Lane",
        "city": "TestCity",
        "state": "TX",
        "zipCode": "75001",
        "phoneNumber": "(214) 555-9999",
        "email": "complete.test@example.com"
    }
    
    # Step 2: Complete health insurance with all data
    health_data = {
        "personalInfo": personal_info,
        "insuranceSelections": {
            "medicalPlan": "plan_c",
            "dentalPlan": "yes",
            "visionPlan": "yes",
            "declineAllCoverage": False
        },
        "effectiveDate": "2025-03-01",
        "section125Acknowledged": True,
        "dependents": [
            {
                "name": "Test Dependent",
                "relationship": "Spouse",
                "dateOfBirth": "1996-01-01",
                "ssn": "888-88-8888",
                "gender": "Other",
                "coverageTypes": ["Medical", "Dental", "Vision"]
            }
        ]
    }
    
    # Save the data
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id}/health-insurance",
        json=health_data
    )
    
    save_success = check_response(response, "Save Complete Data")
    
    # Generate preview
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id}/health-insurance/preview",
        json=health_data
    )
    
    preview_success = check_response(response, "Generate Preview")
    
    # Sign and submit
    health_data["signatureData"] = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id}/health-insurance/generate-pdf",
        json=health_data
    )
    
    final_success = check_response(response, "Sign and Generate Final PDF")
    
    # Verify data persistence (simulate by re-fetching)
    # In a real scenario, we'd have a GET endpoint to verify
    print("\n✅ Data persistence test would require GET endpoint")
    
    return save_success and preview_success and final_success

def test_edge_cases():
    """Test Edge Cases"""
    print_test("Edge Cases")
    
    # Test 1: No personal info at all
    print("\n1. No Personal Info:")
    employee_id1 = "test-edge-1"
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id1}/health-insurance/preview",
        json={
            "insuranceSelections": {"medicalPlan": "plan_a"},
            "dependents": []
        }
    )
    no_info_handled = response.status_code in [400, 422, 200]
    print(f"Status: {response.status_code} - {'Handled' if no_info_handled else 'Failed'}")
    
    # Test 2: Invalid SSN format
    print("\n2. Invalid SSN Format:")
    employee_id2 = "test-edge-2"
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id2}/health-insurance",
        json={
            "personalInfo": {
                "firstName": "Test",
                "lastName": "User",
                "ssn": "invalid-ssn",
                "dateOfBirth": "1990-01-01"
            },
            "insuranceSelections": {"medicalPlan": "plan_a"},
            "dependents": []
        }
    )
    invalid_ssn_handled = response.status_code in [200, 400, 422]  # May accept and validate later
    print(f"Status: {response.status_code} - {'Handled' if invalid_ssn_handled else 'Failed'}")
    
    # Test 3: Too many dependents
    print("\n3. Many Dependents (10):")
    many_dependents = [
        {
            "name": f"Dependent {i}",
            "relationship": "Child",
            "dateOfBirth": f"201{i}-01-01",
            "ssn": f"{i}{i}{i}-{i}{i}-{i}{i}{i}{i}",
            "gender": ["Male", "Female", "Other"][i % 3],
            "coverageTypes": ["Medical"]
        }
        for i in range(10)
    ]
    
    employee_id3 = "test-edge-3"
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id3}/health-insurance",
        json={
            "personalInfo": {
                "firstName": "Test",
                "lastName": "ManyDeps",
                "ssn": "777-77-7777",
                "dateOfBirth": "1980-01-01"
            },
            "insuranceSelections": {"medicalPlan": "plan_a"},
            "section125Acknowledged": True,
            "dependents": many_dependents
        }
    )
    many_deps_handled = check_response(response, "Many Dependents")
    
    # Test 4: Decline all coverage
    print("\n4. Decline All Coverage:")
    employee_id4 = "test-edge-4"
    response = requests.post(
        f"{BASE_URL}/onboarding/{employee_id4}/health-insurance",
        json={
            "personalInfo": {
                "firstName": "No",
                "lastName": "Coverage",
                "ssn": "000-00-0000",
                "dateOfBirth": "1990-01-01"
            },
            "insuranceSelections": {
                "declineAllCoverage": True,
                "medicalPlan": None,
                "dentalPlan": "no",
                "visionPlan": "no"
            },
            "section125Acknowledged": True,
            "dependents": []
        }
    )
    decline_handled = check_response(response, "Decline All Coverage")
    
    return all([no_info_handled, invalid_ssn_handled, many_deps_handled, decline_handled])

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("HEALTH INSURANCE FLOW COMPREHENSIVE TEST SUITE")
    print("="*60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    # Run all test suites
    results.append(("Data Flow", test_data_flow()))
    results.append(("Section 125 Acknowledgment", test_section_125()))
    results.append(("Dependent Information", test_dependent_info()))
    results.append(("PDF Generation", test_pdf_generation()))
    results.append(("Backend API", test_backend_api()))
    results.append(("End-to-End Flow", test_end_to_end()))
    results.append(("Edge Cases", test_edge_cases()))
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:30} {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! The health insurance flow is working correctly.")
    else:
        print("\n⚠️ Some tests failed. Please review the output above for details.")

if __name__ == "__main__":
    main()