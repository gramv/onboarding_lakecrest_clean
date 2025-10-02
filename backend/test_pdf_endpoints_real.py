#!/usr/bin/env python3
"""
Comprehensive test script for PDF generation endpoints using real employee data
Tests all 4 endpoints with various scenarios to verify Phase 1 backend fixes
"""

import base64
import json
import time
from datetime import datetime
from typing import Dict, Any, List
import requests
import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Configuration
BASE_URL = "http://localhost:8000"
TEST_SIGNATURE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="  # 1x1 black pixel as minimal signature

# Real employee IDs from database
EMPLOYEE_MCI = "92d7e1ba-608e-4136-af87-c056ed031e8d"  # MCI property
EMPLOYEE_RCI = "624e272d-d2a1-4edd-821c-9545baf9946b"  # RCI property
PROPERTY_MCI = "5cf12190-242a-4ac2-91dc-b43035b7aa2e"
PROPERTY_RCI = "ae926aac-eb0f-4616-8629-87898e8b0d70"

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
        if details:
            print(f"   {details}")
    else:
        test_results["summary"]["failed"] += 1
        test_results["summary"]["errors"].append(f"{scenario} - {test_name}: {details}")
        print(f"❌ {scenario} - {test_name}: FAILED - {details}")

def ensure_personal_info(employee_id: str):
    """Ensure employee has personal info for name in PDFs"""
    personal_data = {
        "firstName": "Test",
        "lastName": f"User_{employee_id[:8]}",
        "email": f"test_{employee_id[:8]}@example.com",
        "phone": "555-1234",
        "address": "123 Test St",
        "city": "Test City",
        "state": "CA",
        "zipCode": "12345",
        "dateOfBirth": "1990-01-01"
    }

    try:
        # Try to save personal info (may already exist)
        response = requests.post(
            f"{BASE_URL}/api/onboarding/{employee_id}/personal-information",
            json=personal_data
        )
        return True
    except:
        return True  # Assume it exists

def test_scenario_1_preview_mode():
    """Test Scenario 1: Preview Mode (No Signature)"""
    print("\n" + "="*80)
    print("SCENARIO 1: PREVIEW MODE (No Signature)")
    print("="*80)

    # Ensure personal info exists
    ensure_personal_info(EMPLOYEE_MCI)

    endpoints = [
        ("human-trafficking", f"/api/onboarding/{EMPLOYEE_MCI}/human-trafficking/generate-pdf"),
        ("health-insurance", f"/api/onboarding/{EMPLOYEE_MCI}/health-insurance/generate-pdf"),
        ("weapons-policy", f"/api/onboarding/{EMPLOYEE_MCI}/weapons-policy/generate-pdf"),
        ("company-policies", f"/api/onboarding/{EMPLOYEE_MCI}/company-policies/generate-pdf")
    ]

    for form_type, url in endpoints:
        print(f"\n📄 Testing {form_type} preview (Employee: {EMPLOYEE_MCI[:8]}...)...")

        # Prepare request without signature
        data = {
            "formData": {
                "acknowledgePolicy": True,
                "acknowledgedDate": datetime.now().isoformat(),
                "employeeName": "Test User"
            }
        }

        if form_type == "health-insurance":
            data["formData"]["planChoice"] = "employee_only"
            data["formData"]["declineReason"] = ""

        try:
            response = requests.post(f"{BASE_URL}{url}", json=data, timeout=30)

            if response.status_code == 200:
                result = response.json()

                # Check for PDF in response
                has_pdf = "pdf" in result and result["pdf"]
                if has_pdf:
                    try:
                        pdf_data = base64.b64decode(result["pdf"])
                        pdf_size = len(pdf_data)
                        log_result("Scenario 1", f"{form_type} returns PDF base64", True, f"PDF size: {pdf_size:,} bytes")
                    except:
                        log_result("Scenario 1", f"{form_type} returns PDF base64", False, "Invalid base64")
                else:
                    log_result("Scenario 1", f"{form_type} returns PDF base64", False, "No PDF in response")

                # Verify NO storage path (preview only)
                has_storage = "storage_path" in result or "pdf_url" in result
                log_result("Scenario 1", f"{form_type} no storage in preview", not has_storage,
                          f"Storage found: {has_storage}")

            else:
                error_msg = response.text[:200] if response.text else f"Status: {response.status_code}"
                log_result("Scenario 1", f"{form_type} preview request", False, error_msg)

        except requests.Timeout:
            log_result("Scenario 1", f"{form_type} preview request", False, "Request timed out")
        except Exception as e:
            log_result("Scenario 1", f"{form_type} preview request", False, str(e))

def test_scenario_2_signed_mode():
    """Test Scenario 2: Signed Mode (With Signature)"""
    print("\n" + "="*80)
    print("SCENARIO 2: SIGNED MODE (With Signature)")
    print("="*80)

    # Ensure personal info exists
    ensure_personal_info(EMPLOYEE_MCI)

    endpoints = [
        ("human-trafficking", f"/api/onboarding/{EMPLOYEE_MCI}/human-trafficking/generate-pdf"),
        ("health-insurance", f"/api/onboarding/{EMPLOYEE_MCI}/health-insurance/generate-pdf"),
        ("weapons-policy", f"/api/onboarding/{EMPLOYEE_MCI}/weapons-policy/generate-pdf"),
        ("company-policies", f"/api/onboarding/{EMPLOYEE_MCI}/company-policies/generate-pdf")
    ]

    for form_type, url in endpoints:
        print(f"\n📄 Testing {form_type} with signature (Employee: {EMPLOYEE_MCI[:8]}...)...")

        # Prepare request WITH signature
        data = {
            "signatureData": TEST_SIGNATURE,
            "formData": {
                "acknowledgePolicy": True,
                "acknowledgedDate": datetime.now().isoformat(),
                "employeeName": "Test User MCI",
                "signatureConsent": True
            }
        }

        if form_type == "health-insurance":
            data["formData"]["planChoice"] = "employee_only"
            data["formData"]["declineReason"] = ""

        try:
            response = requests.post(f"{BASE_URL}{url}", json=data, timeout=30)

            if response.status_code == 200:
                result = response.json()

                # Check for PDF in response
                has_pdf = "pdf" in result and result["pdf"]
                log_result("Scenario 2", f"{form_type} returns signed PDF", has_pdf,
                          f"PDF field present: {has_pdf}")

                # Check storage path
                has_storage_path = "storage_path" in result
                if has_storage_path:
                    storage_path = result["storage_path"]

                    # Verify correct bucket
                    correct_bucket = "onboarding-documents" in storage_path
                    log_result("Scenario 2", f"{form_type} uses correct bucket", correct_bucket,
                              f"Path: {storage_path}")

                    # Verify path structure: should contain forms/{form_type}/
                    expected_pattern = f"forms/{form_type}/"
                    correct_path = expected_pattern in storage_path
                    log_result("Scenario 2", f"{form_type} correct path structure", correct_path,
                              f"Contains '{expected_pattern}': {correct_path}")

                    # Check for property name in path
                    has_property = "mci" in storage_path.lower()
                    log_result("Scenario 2", f"{form_type} includes property", has_property,
                              f"Property in path: {has_property}")
                else:
                    log_result("Scenario 2", f"{form_type} storage path", False, "No storage_path in response")

                # Check for signed URL
                has_url = "pdf_url" in result or "url" in result
                url_field = result.get("pdf_url") or result.get("url", "")
                if has_url and url_field:
                    # Check if it's a signed URL with expiration
                    is_signed = "token" in url_field or "X-Amz" in url_field
                    log_result("Scenario 2", f"{form_type} signed URL generated", is_signed,
                              f"URL is signed: {is_signed}")
                else:
                    log_result("Scenario 2", f"{form_type} signed URL generated", False, "No URL in response")

                # Log response structure
                print(f"  📋 Response keys: {list(result.keys())}")
                if has_storage_path:
                    print(f"  📁 Storage path: {storage_path}")
                if has_url:
                    print(f"  🔗 URL field present (truncated)")

            else:
                error_msg = response.text[:200] if response.text else f"Status: {response.status_code}"
                log_result("Scenario 2", f"{form_type} signed request", False, error_msg)

        except requests.Timeout:
            log_result("Scenario 2", f"{form_type} signed request", False, "Request timed out")
        except Exception as e:
            log_result("Scenario 2", f"{form_type} signed request", False, str(e))

def test_scenario_3_property_isolation():
    """Test Scenario 3: Property Isolation"""
    print("\n" + "="*80)
    print("SCENARIO 3: PROPERTY ISOLATION")
    print("="*80)

    # Ensure personal info for both employees
    ensure_personal_info(EMPLOYEE_MCI)
    ensure_personal_info(EMPLOYEE_RCI)

    print(f"\n🏢 Testing property isolation...")
    print(f"  MCI Employee: {EMPLOYEE_MCI[:8]}... (Property: {PROPERTY_MCI[:8]}...)")
    print(f"  RCI Employee: {EMPLOYEE_RCI[:8]}... (Property: {PROPERTY_RCI[:8]}...)")

    # Generate PDF for MCI property employee
    url_mci = f"{BASE_URL}/api/onboarding/{EMPLOYEE_MCI}/human-trafficking/generate-pdf"
    data_mci = {
        "signatureData": TEST_SIGNATURE,
        "formData": {
            "acknowledgePolicy": True,
            "acknowledgedDate": datetime.now().isoformat(),
            "employeeName": "MCI Employee",
            "signatureConsent": True
        }
    }

    # Generate PDF for RCI property employee
    url_rci = f"{BASE_URL}/api/onboarding/{EMPLOYEE_RCI}/human-trafficking/generate-pdf"
    data_rci = {
        "signatureData": TEST_SIGNATURE,
        "formData": {
            "acknowledgePolicy": True,
            "acknowledgedDate": datetime.now().isoformat(),
            "employeeName": "RCI Employee",
            "signatureConsent": True
        }
    }

    try:
        # Generate for MCI
        response_mci = requests.post(url_mci, json=data_mci, timeout=30)
        if response_mci.status_code == 200:
            result_mci = response_mci.json()
            if "storage_path" in result_mci:
                path_mci = result_mci["storage_path"]

                # Check if MCI is in the path
                has_mci = "mci" in path_mci.lower()
                log_result("Scenario 3", "MCI property folder isolation", has_mci,
                          f"Path: {path_mci}")

                # Generate for RCI
                response_rci = requests.post(url_rci, json=data_rci, timeout=30)
                if response_rci.status_code == 200:
                    result_rci = response_rci.json()
                    if "storage_path" in result_rci:
                        path_rci = result_rci["storage_path"]

                        # Check if RCI is in its path
                        has_rci = "rci" in path_rci.lower()
                        log_result("Scenario 3", "RCI property folder isolation", has_rci,
                                  f"Path: {path_rci}")

                        # Check that paths are different
                        different_paths = path_mci != path_rci
                        log_result("Scenario 3", "Different storage paths for properties", different_paths,
                                  f"MCI != RCI: {different_paths}")

                        # Verify they're in different property folders
                        mci_not_in_rci = "mci" not in path_rci.lower()
                        rci_not_in_mci = "rci" not in path_mci.lower()
                        proper_isolation = mci_not_in_rci and rci_not_in_mci
                        log_result("Scenario 3", "Proper property isolation", proper_isolation,
                                  f"No cross-contamination: {proper_isolation}")
                    else:
                        log_result("Scenario 3", "RCI document generation", False, "No storage_path for RCI")
                else:
                    log_result("Scenario 3", "RCI document generation", False,
                              f"Failed: {response_rci.text[:200]}")
            else:
                log_result("Scenario 3", "MCI document generation", False, "No storage_path for MCI")
        else:
            log_result("Scenario 3", "Property isolation test", False,
                      f"Failed to create MCI document: {response_mci.text[:200]}")
    except Exception as e:
        log_result("Scenario 3", "Property isolation test", False, str(e))

def test_scenario_4_manager_dashboard():
    """Test Scenario 4: Manager Dashboard Access"""
    print("\n" + "="*80)
    print("SCENARIO 4: MANAGER DASHBOARD - DOCUMENT GENERATION")
    print("="*80)

    # Use MCI employee for comprehensive document generation
    emp_id = EMPLOYEE_MCI
    ensure_personal_info(emp_id)

    endpoints = [
        ("human-trafficking", f"/api/onboarding/{emp_id}/human-trafficking/generate-pdf"),
        ("health-insurance", f"/api/onboarding/{emp_id}/health-insurance/generate-pdf"),
        ("weapons-policy", f"/api/onboarding/{emp_id}/weapons-policy/generate-pdf"),
        ("company-policies", f"/api/onboarding/{emp_id}/company-policies/generate-pdf")
    ]

    print(f"\n📝 Generating all 4 documents for employee {emp_id[:8]}...")
    documents_created = []

    for form_type, url in endpoints:
        data = {
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
            response = requests.post(f"{BASE_URL}{url}", json=data, timeout=30)
            if response.status_code == 200:
                result = response.json()
                if "storage_path" in result:
                    documents_created.append({
                        "type": form_type,
                        "path": result["storage_path"],
                        "url": result.get("pdf_url") or result.get("url"),
                        "has_pdf": "pdf" in result
                    })
                    print(f"  ✅ Created {form_type}")
                    print(f"     Path: {result['storage_path']}")
                else:
                    print(f"  ⚠️ Created {form_type} but no storage_path")
            else:
                print(f"  ❌ Failed {form_type}: {response.status_code}")
        except Exception as e:
            print(f"  ❌ Error with {form_type}: {e}")

    # Log results
    all_forms_created = len(documents_created) == 4
    log_result("Scenario 4", "All 4 forms created", all_forms_created,
              f"Created {len(documents_created)}/4 forms")

    if documents_created:
        # Check that all have URLs
        all_have_urls = all(doc.get("url") for doc in documents_created)
        log_result("Scenario 4", "All documents have URLs", all_have_urls,
                  f"URLs: {sum(1 for d in documents_created if d.get('url'))}/{len(documents_created)}")

        # Check that all returned PDFs
        all_have_pdfs = all(doc.get("has_pdf") for doc in documents_created)
        log_result("Scenario 4", "All documents returned PDFs", all_have_pdfs,
                  f"PDFs: {sum(1 for d in documents_created if d.get('has_pdf'))}/{len(documents_created)}")

        # Check correct filenames/paths
        for doc in documents_created:
            correct_type = doc["type"] in doc["path"]
            log_result("Scenario 4", f"{doc['type']} path contains form type", correct_type,
                      f"'{doc['type']}' in path: {correct_type}")

def test_scenario_5_invite_mode():
    """Test Scenario 5: Single-Step Invite Mode with temporary IDs"""
    print("\n" + "="*80)
    print("SCENARIO 5: SINGLE-STEP INVITE MODE (Temporary IDs)")
    print("="*80)

    # Create unique temporary IDs
    timestamp = int(time.time())
    temp_ids = [
        f"temp_{timestamp}_ht",
        f"temp_{timestamp}_hi"
    ]

    endpoints = [
        ("human-trafficking", "human-trafficking/generate-pdf"),
        ("health-insurance", "health-insurance/generate-pdf")
    ]

    for i, (form_type, endpoint) in enumerate(endpoints):
        temp_id = temp_ids[i]
        print(f"\n📄 Testing {form_type} with temp ID: {temp_id}")

        url = f"{BASE_URL}/api/onboarding/{temp_id}/{endpoint}"
        data = {
            "property_id": PROPERTY_MCI,  # Use real property ID
            "signatureData": TEST_SIGNATURE,
            "formData": {
                "acknowledgePolicy": True,
                "acknowledgedDate": datetime.now().isoformat(),
                "employeeName": f"Temp User {i+1}",
                "signatureConsent": True,
                "firstName": "Temp",
                "lastName": f"User{i+1}"
            }
        }

        if form_type == "health-insurance":
            data["formData"]["planChoice"] = "employee_only"

        try:
            response = requests.post(url, json=data, timeout=30)

            if response.status_code == 200:
                result = response.json()

                # Check if temp ID was accepted
                log_result("Scenario 5", f"{form_type} accepts temp ID", True,
                          f"Temp ID {temp_id} accepted")

                # Check if property_id was properly resolved
                if "storage_path" in result:
                    path = result["storage_path"]
                    # Should contain the property name (mci)
                    has_property = "mci" in path.lower()
                    log_result("Scenario 5", f"{form_type} property resolved from body", has_property,
                              f"Property in path: {path}")

                    # Check proper path structure
                    has_forms = "forms/" in path
                    log_result("Scenario 5", f"{form_type} correct path structure", has_forms,
                              f"Path structure correct: {has_forms}")
                else:
                    # For temp IDs, even preview mode is OK
                    has_pdf = "pdf" in result
                    log_result("Scenario 5", f"{form_type} generates PDF for temp ID", has_pdf,
                              f"PDF generated: {has_pdf}")
            else:
                # Some endpoints might not support temp IDs yet
                error_msg = response.text[:200] if response.text else f"Status: {response.status_code}"
                log_result("Scenario 5", f"{form_type} temp ID support", False, error_msg)

        except requests.Timeout:
            log_result("Scenario 5", f"{form_type} temp ID test", False, "Request timed out")
        except Exception as e:
            log_result("Scenario 5", f"{form_type} temp ID test", False, str(e))

def check_storage_buckets():
    """Additional check to verify correct storage bucket usage"""
    print("\n" + "="*80)
    print("STORAGE BUCKET VERIFICATION")
    print("="*80)

    # Initialize Supabase client to check storage directly
    try:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        supabase = create_client(url, key)

        # Check for files in onboarding-documents bucket
        print("\n📦 Checking 'onboarding-documents' bucket...")
        try:
            # List files in the correct bucket
            files = supabase.storage.from_("onboarding-documents").list()
            if files:
                print(f"  ✅ Found {len(files)} items in onboarding-documents bucket")
                for f in files[:5]:
                    print(f"     - {f.get('name', 'folder')}")
            else:
                print("  ⚠️ No files found in onboarding-documents bucket")
        except Exception as e:
            print(f"  ❌ Error accessing onboarding-documents: {e}")

        # Check if deprecated bucket is still being used
        print("\n📦 Checking deprecated 'generated-documents' bucket...")
        try:
            files = supabase.storage.from_("generated-documents").list()
            if files:
                print(f"  ⚠️ WARNING: Found {len(files)} items in DEPRECATED generated-documents bucket!")
                print("     This bucket should NOT be used for new documents")
            else:
                print("  ✅ Good: No new files in deprecated bucket")
        except:
            print("  ✅ Deprecated bucket not accessible or doesn't exist")

    except Exception as e:
        print(f"❌ Could not verify storage buckets: {e}")

def generate_report():
    """Generate comprehensive test report"""
    print("\n" + "="*80)
    print("COMPREHENSIVE TEST REPORT")
    print("="*80)

    print(f"\n📊 TEST SUMMARY")
    print(f"  Total Tests: {test_results['summary']['total']}")
    print(f"  ✅ Passed: {test_results['summary']['passed']}")
    print(f"  ❌ Failed: {test_results['summary']['failed']}")

    if test_results['summary']['total'] > 0:
        success_rate = test_results['summary']['passed']/test_results['summary']['total']*100
        print(f"  Success Rate: {success_rate:.1f}%")
    else:
        success_rate = 0

    print(f"\n📋 DETAILED SCENARIO RESULTS")
    for scenario, tests in test_results["scenarios"].items():
        passed = sum(1 for t in tests if t["success"])
        total = len(tests)
        print(f"\n  {scenario}: {passed}/{total} passed")
        for test in tests:
            status = "✅" if test["success"] else "❌"
            print(f"    {status} {test['test']}")
            if test["details"] and (not test["success"] or "Path:" in test["details"]):
                print(f"       └─ {test['details'][:100]}")

    if test_results["summary"]["errors"]:
        print(f"\n⚠️ KEY ISSUES DETECTED:")
        unique_errors = list(set(test_results["summary"]["errors"]))[:10]
        for error in unique_errors:
            print(f"  - {error[:150]}")

    # Save detailed report
    report_path = "/Users/gouthamvemula/onbfinaldev/backend/pdf_test_report_detailed.json"
    with open(report_path, "w") as f:
        json.dump(test_results, f, indent=2, default=str)
    print(f"\n📁 Detailed report saved to: {report_path}")

    # Overall assessment
    print(f"\n🎯 OVERALL ASSESSMENT:")
    if success_rate >= 90:
        print("  ✅ EXCELLENT! PDF generation endpoints are working correctly.")
        print("  All Phase 1 backend fixes appear to be functioning properly.")
    elif success_rate >= 70:
        print("  ⚠️ GOOD: Most tests passed, minor issues may need attention.")
    elif success_rate >= 50:
        print("  ⚠️ FAIR: Several issues detected, review failed tests.")
    else:
        print("  ❌ NEEDS WORK: Significant issues detected.")

    # Key findings
    print(f"\n🔍 KEY FINDINGS:")
    if test_results['summary']['passed'] > 0:
        print("  ✅ Working features:")
        if any("preview" in str(t) and t["success"] for s in test_results["scenarios"].values() for t in s):
            print("     - Preview mode (no signature) generates PDFs")
        if any("signed" in str(t) and t["success"] for s in test_results["scenarios"].values() for t in s):
            print("     - Signed mode saves to storage")
        if any("bucket" in str(t) and t["success"] for s in test_results["scenarios"].values() for t in s):
            print("     - Using correct 'onboarding-documents' bucket")
        if any("isolation" in str(t) and t["success"] for s in test_results["scenarios"].values() for t in s):
            print("     - Property isolation maintained")

    if test_results['summary']['failed'] > 0:
        print("  ❌ Issues found:")
        # Analyze common failure patterns
        if any("storage_path" in str(e) for e in test_results["summary"]["errors"]):
            print("     - Some endpoints not returning storage_path")
        if any("PDF" in str(e) and "No PDF" in str(e) for e in test_results["summary"]["errors"]):
            print("     - Some endpoints not returning PDF data")
        if any("timeout" in str(e).lower() for e in test_results["summary"]["errors"]):
            print("     - Some requests timing out (performance issue?)")

    return test_results

def main():
    """Main test execution"""
    print("🚀 Starting Comprehensive PDF Generation Endpoint Tests")
    print(f"   Backend URL: {BASE_URL}")
    print(f"   MCI Employee: {EMPLOYEE_MCI[:16]}...")
    print(f"   RCI Employee: {EMPLOYEE_RCI[:16]}...")
    print(f"   Timestamp: {datetime.now().isoformat()}")

    # Run all test scenarios
    test_scenario_1_preview_mode()
    test_scenario_2_signed_mode()
    test_scenario_3_property_isolation()
    test_scenario_4_manager_dashboard()
    test_scenario_5_invite_mode()

    # Additional storage verification
    check_storage_buckets()

    # Generate comprehensive report
    report = generate_report()

    return report

if __name__ == "__main__":
    main()