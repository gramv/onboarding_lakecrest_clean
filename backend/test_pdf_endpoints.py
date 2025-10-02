#!/usr/bin/env python3
"""
Comprehensive test script for PDF generation endpoints
Tests all 4 endpoints with various scenarios to verify Phase 1 backend fixes
"""

import base64
import json
import time
from datetime import datetime
from typing import Dict, Any, List
import requests
from io import BytesIO
from PIL import Image
import io

# Configuration
BASE_URL = "http://localhost:8000"
TEST_SIGNATURE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="  # 1x1 black pixel as minimal signature

# Test employee IDs (we'll use actual IDs from the system)
TEST_EMPLOYEE_ID = "test_emp_001"
TEMP_EMPLOYEE_ID = "temp_test_001"

# Test results storage
test_results = {
    "scenarios": {},
    "summary": {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "errors": []
    }
}

def log_result(scenario: str, test_name: str, success: bool, details: str = ""):
    """Log test results"""
    if scenario not in test_results["scenarios"]:
        test_results["scenarios"][scenario] = []

    test_results["scenarios"][scenario].append({
        "test": test_name,
        "success": success,
        "details": details,
        "timestamp": datetime.now().isoformat()
    })

    test_results["summary"]["total"] += 1
    if success:
        test_results["summary"]["passed"] += 1
        print(f"✅ {scenario} - {test_name}: PASSED")
    else:
        test_results["summary"]["failed"] += 1
        test_results["summary"]["errors"].append(f"{scenario} - {test_name}: {details}")
        print(f"❌ {scenario} - {test_name}: FAILED - {details}")

def create_test_employee(employee_id: str, property_id: str = "prop_001"):
    """Create a test employee with personal info"""
    print(f"\n📝 Creating test employee: {employee_id}")

    # First save personal info
    personal_data = {
        "firstName": "Test",
        "lastName": "User",
        "email": f"{employee_id}@example.com",
        "phone": "555-1234",
        "address": "123 Test St",
        "city": "Test City",
        "state": "CA",
        "zipCode": "12345",
        "dateOfBirth": "1990-01-01",
        "ssn": "123-45-6789"
    }

    # Try to save personal info
    try:
        response = requests.post(
            f"{BASE_URL}/api/onboarding/{employee_id}/personal-information",
            json=personal_data
        )
        if response.status_code == 200:
            print(f"✅ Created personal info for {employee_id}")
            return True
        else:
            print(f"⚠️ Could not create personal info: {response.text}")
            return False
    except Exception as e:
        print(f"⚠️ Error creating test employee: {e}")
        return False

def test_scenario_1_preview_mode():
    """Test Scenario 1: Preview Mode (No Signature)"""
    print("\n" + "="*80)
    print("SCENARIO 1: PREVIEW MODE (No Signature)")
    print("="*80)

    endpoints = [
        ("human-trafficking", "/api/onboarding/{employee_id}/human-trafficking/generate-pdf"),
        ("health-insurance", "/api/onboarding/{employee_id}/health-insurance/generate-pdf"),
        ("weapons-policy", "/api/onboarding/{employee_id}/weapons-policy/generate-pdf"),
        ("company-policies", "/api/onboarding/{employee_id}/company-policies/generate-pdf")
    ]

    for form_type, endpoint in endpoints:
        print(f"\n📄 Testing {form_type} preview...")

        # Prepare request without signature
        url = endpoint.format(employee_id=TEST_EMPLOYEE_ID)
        data = {
            "property_id": "prop_001",
            "formData": {
                "acknowledgePolicy": True,
                "acknowledgedDate": datetime.now().isoformat()
            }
        }

        if form_type == "health-insurance":
            data["formData"]["planChoice"] = "employee_only"
            data["formData"]["declineReason"] = ""

        try:
            response = requests.post(f"{BASE_URL}{url}", json=data)

            if response.status_code == 200:
                result = response.json()

                # Check for PDF in response
                has_pdf = "pdf" in result and result["pdf"]
                if has_pdf:
                    # Verify it's valid base64
                    try:
                        pdf_data = base64.b64decode(result["pdf"])
                        pdf_size = len(pdf_data)
                        log_result("Scenario 1", f"{form_type} returns PDF base64", True, f"PDF size: {pdf_size} bytes")
                    except:
                        log_result("Scenario 1", f"{form_type} returns PDF base64", False, "Invalid base64")
                else:
                    log_result("Scenario 1", f"{form_type} returns PDF base64", False, "No PDF in response")

                # Verify NO storage path (preview only)
                has_storage = "storage_path" in result or "pdf_url" in result
                log_result("Scenario 1", f"{form_type} no storage in preview", not has_storage,
                          f"Storage found: {has_storage}")

            else:
                log_result("Scenario 1", f"{form_type} preview request", False,
                          f"Status: {response.status_code}, Error: {response.text[:200]}")

        except Exception as e:
            log_result("Scenario 1", f"{form_type} preview request", False, str(e))

def test_scenario_2_signed_mode():
    """Test Scenario 2: Signed Mode (With Signature)"""
    print("\n" + "="*80)
    print("SCENARIO 2: SIGNED MODE (With Signature)")
    print("="*80)

    endpoints = [
        ("human-trafficking", "/api/onboarding/{employee_id}/human-trafficking/generate-pdf"),
        ("health-insurance", "/api/onboarding/{employee_id}/health-insurance/generate-pdf"),
        ("weapons-policy", "/api/onboarding/{employee_id}/weapons-policy/generate-pdf"),
        ("company-policies", "/api/onboarding/{employee_id}/company-policies/generate-pdf")
    ]

    for form_type, endpoint in endpoints:
        print(f"\n📄 Testing {form_type} with signature...")

        # Prepare request WITH signature
        url = endpoint.format(employee_id=TEST_EMPLOYEE_ID)
        data = {
            "property_id": "prop_001",
            "signatureData": TEST_SIGNATURE,
            "formData": {
                "acknowledgePolicy": True,
                "acknowledgedDate": datetime.now().isoformat(),
                "employeeName": "Test User",
                "signatureConsent": True
            }
        }

        if form_type == "health-insurance":
            data["formData"]["planChoice"] = "employee_only"
            data["formData"]["declineReason"] = ""

        try:
            response = requests.post(f"{BASE_URL}{url}", json=data)

            if response.status_code == 200:
                result = response.json()

                # Check for PDF in response
                has_pdf = "pdf" in result and result["pdf"]
                log_result("Scenario 2", f"{form_type} returns signed PDF", has_pdf,
                          f"PDF present: {has_pdf}")

                # Check storage path
                has_storage_path = "storage_path" in result
                if has_storage_path:
                    storage_path = result["storage_path"]

                    # Verify correct bucket
                    correct_bucket = "onboarding-documents" in storage_path
                    log_result("Scenario 2", f"{form_type} uses correct bucket", correct_bucket,
                              f"Path: {storage_path}")

                    # Verify path structure
                    expected_pattern = f"forms/{form_type}/"
                    correct_path = expected_pattern in storage_path
                    log_result("Scenario 2", f"{form_type} correct path structure", correct_path,
                              f"Path contains '{expected_pattern}': {correct_path}")
                else:
                    log_result("Scenario 2", f"{form_type} storage path", False, "No storage_path in response")

                # Check for signed URL
                has_url = "pdf_url" in result or "url" in result
                log_result("Scenario 2", f"{form_type} signed URL generated", has_url,
                          f"URL field present: {has_url}")

                # Log full response for debugging
                print(f"  📋 Response keys: {list(result.keys())}")
                if has_storage_path:
                    print(f"  📁 Storage path: {storage_path}")

            else:
                log_result("Scenario 2", f"{form_type} signed request", False,
                          f"Status: {response.status_code}, Error: {response.text[:200]}")

        except Exception as e:
            log_result("Scenario 2", f"{form_type} signed request", False, str(e))

def test_scenario_3_property_isolation():
    """Test Scenario 3: Property Isolation"""
    print("\n" + "="*80)
    print("SCENARIO 3: PROPERTY ISOLATION")
    print("="*80)

    # Create employee for Property A
    emp_a = "emp_prop_a_001"
    emp_b = "emp_prop_b_001"

    print(f"\n🏢 Testing property isolation...")

    # Generate PDF for Property A employee
    url = f"{BASE_URL}/api/onboarding/{emp_a}/human-trafficking/generate-pdf"
    data_a = {
        "property_id": "property_a",
        "signatureData": TEST_SIGNATURE,
        "formData": {
            "acknowledgePolicy": True,
            "acknowledgedDate": datetime.now().isoformat(),
            "employeeName": "Employee A",
            "signatureConsent": True
        }
    }

    try:
        response_a = requests.post(url, json=data_a)
        if response_a.status_code == 200:
            result_a = response_a.json()
            if "storage_path" in result_a:
                path_a = result_a["storage_path"]

                # Check if Property A is in the path
                has_property_a = "property_a" in path_a.lower() or "Property A" in path_a
                log_result("Scenario 3", "Property A folder isolation", has_property_a,
                          f"Path: {path_a}")

                # Now try to generate for Property B
                url_b = f"{BASE_URL}/api/onboarding/{emp_b}/human-trafficking/generate-pdf"
                data_b = {
                    "property_id": "property_b",
                    "signatureData": TEST_SIGNATURE,
                    "formData": {
                        "acknowledgePolicy": True,
                        "acknowledgedDate": datetime.now().isoformat(),
                        "employeeName": "Employee B",
                        "signatureConsent": True
                    }
                }

                response_b = requests.post(url_b, json=data_b)
                if response_b.status_code == 200:
                    result_b = response_b.json()
                    if "storage_path" in result_b:
                        path_b = result_b["storage_path"]

                        # Check if paths are different
                        different_paths = path_a != path_b
                        log_result("Scenario 3", "Different storage paths for properties", different_paths,
                                  f"A: {path_a}\nB: {path_b}")

                        # Check Property B is in its path
                        has_property_b = "property_b" in path_b.lower() or "Property B" in path_b
                        log_result("Scenario 3", "Property B folder isolation", has_property_b,
                                  f"Path: {path_b}")
        else:
            log_result("Scenario 3", "Property isolation test", False,
                      f"Failed to create Property A document: {response_a.text[:200]}")
    except Exception as e:
        log_result("Scenario 3", "Property isolation test", False, str(e))

def test_scenario_4_manager_dashboard():
    """Test Scenario 4: Manager Dashboard Access"""
    print("\n" + "="*80)
    print("SCENARIO 4: MANAGER DASHBOARD ACCESS")
    print("="*80)

    # First, complete all 4 forms with signatures for a test employee
    emp_id = "emp_dashboard_test"
    endpoints = [
        ("human-trafficking", "/api/onboarding/{employee_id}/human-trafficking/generate-pdf"),
        ("health-insurance", "/api/onboarding/{employee_id}/health-insurance/generate-pdf"),
        ("weapons-policy", "/api/onboarding/{employee_id}/weapons-policy/generate-pdf"),
        ("company-policies", "/api/onboarding/{employee_id}/company-policies/generate-pdf")
    ]

    print(f"\n📝 Generating all 4 documents for {emp_id}...")
    documents_created = []

    for form_type, endpoint in endpoints:
        url = endpoint.format(employee_id=emp_id)
        data = {
            "property_id": "test_property",
            "signatureData": TEST_SIGNATURE,
            "formData": {
                "acknowledgePolicy": True,
                "acknowledgedDate": datetime.now().isoformat(),
                "employeeName": "Dashboard Test User",
                "signatureConsent": True
            }
        }

        if form_type == "health-insurance":
            data["formData"]["planChoice"] = "employee_only"

        try:
            response = requests.post(f"{BASE_URL}{url}", json=data)
            if response.status_code == 200:
                result = response.json()
                if "storage_path" in result:
                    documents_created.append({
                        "type": form_type,
                        "path": result["storage_path"],
                        "url": result.get("pdf_url", result.get("url"))
                    })
                    print(f"  ✅ Created {form_type}")
        except Exception as e:
            print(f"  ❌ Failed to create {form_type}: {e}")

    # Log results
    all_forms_created = len(documents_created) == 4
    log_result("Scenario 4", "All 4 forms created", all_forms_created,
              f"Created {len(documents_created)}/4 forms")

    if documents_created:
        # Check that all have URLs
        all_have_urls = all(doc.get("url") for doc in documents_created)
        log_result("Scenario 4", "All documents have URLs", all_have_urls,
                  f"Documents with URLs: {sum(1 for d in documents_created if d.get('url'))}/{len(documents_created)}")

        # Check filenames
        for doc in documents_created:
            has_correct_name = doc["type"] in doc["path"]
            log_result("Scenario 4", f"{doc['type']} filename correct", has_correct_name,
                      f"Path: {doc['path']}")

def test_scenario_5_invite_mode():
    """Test Scenario 5: Single-Step Invite Mode"""
    print("\n" + "="*80)
    print("SCENARIO 5: SINGLE-STEP INVITE MODE")
    print("="*80)

    # Use temporary employee ID
    temp_id = f"temp_{int(time.time())}"

    endpoints = [
        ("human-trafficking", "/api/onboarding/{employee_id}/human-trafficking/generate-pdf"),
        ("health-insurance", "/api/onboarding/{employee_id}/health-insurance/generate-pdf")
    ]

    for form_type, endpoint in endpoints:
        print(f"\n📄 Testing {form_type} with temp ID: {temp_id}")

        url = endpoint.format(employee_id=temp_id)
        data = {
            "property_id": "invite_test_property",  # Property ID in body for temp employees
            "signatureData": TEST_SIGNATURE,
            "formData": {
                "acknowledgePolicy": True,
                "acknowledgedDate": datetime.now().isoformat(),
                "employeeName": "Invite Mode User",
                "signatureConsent": True
            }
        }

        if form_type == "health-insurance":
            data["formData"]["planChoice"] = "employee_only"

        try:
            response = requests.post(f"{BASE_URL}{url}", json=data)

            if response.status_code == 200:
                result = response.json()

                # Check if property_id was properly resolved
                if "storage_path" in result:
                    path = result["storage_path"]
                    # Should contain the property name
                    has_property = "invite_test_property" in path.lower() or "Invite Test Property" in path
                    log_result("Scenario 5", f"{form_type} temp ID property resolved", has_property,
                              f"Path: {path}")

                    # Check if temp ID works
                    log_result("Scenario 5", f"{form_type} temp ID accepted", True,
                              f"Temp ID {temp_id} worked")
                else:
                    log_result("Scenario 5", f"{form_type} temp ID processing", False,
                              "No storage_path in response")
            else:
                # This might be expected for temp IDs without proper setup
                log_result("Scenario 5", f"{form_type} temp ID handling", False,
                          f"Status: {response.status_code}, Response: {response.text[:200]}")

        except Exception as e:
            log_result("Scenario 5", f"{form_type} temp ID test", False, str(e))

def generate_report():
    """Generate comprehensive test report"""
    print("\n" + "="*80)
    print("TEST REPORT")
    print("="*80)

    print(f"\n📊 TEST SUMMARY")
    print(f"  Total Tests: {test_results['summary']['total']}")
    print(f"  ✅ Passed: {test_results['summary']['passed']}")
    print(f"  ❌ Failed: {test_results['summary']['failed']}")
    print(f"  Success Rate: {test_results['summary']['passed']/test_results['summary']['total']*100:.1f}%")

    print(f"\n📋 SCENARIO RESULTS")
    for scenario, tests in test_results["scenarios"].items():
        passed = sum(1 for t in tests if t["success"])
        total = len(tests)
        print(f"\n  {scenario}:")
        print(f"    Passed: {passed}/{total}")
        for test in tests:
            status = "✅" if test["success"] else "❌"
            print(f"    {status} {test['test']}")
            if not test["success"] and test["details"]:
                print(f"       └─ {test['details']}")

    if test_results["summary"]["errors"]:
        print(f"\n⚠️ ERRORS ENCOUNTERED:")
        for error in test_results["summary"]["errors"]:
            print(f"  - {error}")

    # Save detailed report to file
    report_path = "/Users/gouthamvemula/onbfinaldev/backend/pdf_test_report.json"
    with open(report_path, "w") as f:
        json.dump(test_results, f, indent=2, default=str)
    print(f"\n📁 Detailed report saved to: {report_path}")

    # Overall assessment
    print(f"\n🎯 OVERALL ASSESSMENT:")
    if test_results['summary']['passed'] == test_results['summary']['total']:
        print("  ✅ All tests PASSED! PDF generation endpoints are working correctly.")
    elif test_results['summary']['passed'] / test_results['summary']['total'] >= 0.8:
        print("  ⚠️ Most tests passed, but some issues need attention.")
    else:
        print("  ❌ Significant issues detected. Review failed tests above.")

    return test_results

def main():
    """Main test execution"""
    print("🚀 Starting PDF Generation Endpoint Tests")
    print(f"   Backend URL: {BASE_URL}")
    print(f"   Test Employee: {TEST_EMPLOYEE_ID}")
    print(f"   Timestamp: {datetime.now().isoformat()}")

    # Create test data
    create_test_employee(TEST_EMPLOYEE_ID)
    create_test_employee("emp_prop_a_001", "property_a")
    create_test_employee("emp_prop_b_001", "property_b")
    create_test_employee("emp_dashboard_test", "test_property")

    # Run all test scenarios
    test_scenario_1_preview_mode()
    test_scenario_2_signed_mode()
    test_scenario_3_property_isolation()
    test_scenario_4_manager_dashboard()
    test_scenario_5_invite_mode()

    # Generate report
    report = generate_report()

    return report

if __name__ == "__main__":
    main()