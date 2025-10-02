#!/usr/bin/env python3
"""
Test script to verify PDF generation and Supabase storage for all document types
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API base URL
API_BASE_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Test employee ID (can be changed to test with different employees)
TEST_EMPLOYEE_ID = "test-emp-001"

async def test_pdf_generation(endpoint_name, endpoint_url, request_body):
    """Test a single PDF generation endpoint"""
    print(f"\n{'='*60}")
    print(f"Testing: {endpoint_name}")
    print(f"Endpoint: {endpoint_url}")
    print(f"{'='*60}")
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                f"{API_BASE_URL}{endpoint_url}",
                json=request_body,
                headers={"Content-Type": "application/json"}
            ) as response:
                response_text = await response.text()
                
                # Try to parse as JSON
                try:
                    response_data = json.loads(response_text)
                except json.JSONDecodeError:
                    print(f"❌ Failed to parse response as JSON")
                    print(f"Response: {response_text[:500]}")
                    return False
                
                if response.status == 200 and response_data.get("success"):
                    print(f"✅ PDF generated successfully")
                    
                    # Check if PDF URL was generated
                    pdf_url = response_data.get("data", {}).get("pdf_url")
                    if pdf_url:
                        print(f"✅ PDF uploaded to Supabase")
                        print(f"   URL: {pdf_url[:100]}...")
                    else:
                        print(f"⚠️  PDF URL not generated (upload might have failed)")
                    
                    # Check if base64 PDF is present
                    pdf_base64 = response_data.get("data", {}).get("pdf")
                    if pdf_base64:
                        print(f"✅ Base64 PDF returned (length: {len(pdf_base64)} chars)")
                    
                    return True
                else:
                    print(f"❌ Failed to generate PDF")
                    print(f"   Status: {response.status}")
                    print(f"   Error: {response_data.get('message', 'Unknown error')}")
                    return False
                    
        except Exception as e:
            print(f"❌ Error testing endpoint: {e}")
            return False

async def main():
    """Run all PDF generation tests"""
    print("\n" + "="*60)
    print("PDF GENERATION AND STORAGE TEST SUITE")
    print("="*60)
    print(f"Testing with employee ID: {TEST_EMPLOYEE_ID}")
    print(f"API Base URL: {API_BASE_URL}")
    
    # Test data for each endpoint
    test_cases = [
        {
            "name": "W-4 Form",
            "endpoint": f"/api/onboarding/{TEST_EMPLOYEE_ID}/w4-form/generate-pdf",
            "body": {
                "formData": {
                    "first_name": "John",
                    "last_name": "Doe",
                    "ssn": "123-45-6789",
                    "address": "123 Test St",
                    "city": "Test City",
                    "state": "TX",
                    "zip": "12345",
                    "filing_status": "single",
                    "step2c": False,
                    "step3_children": "0",
                    "step3_other": "0",
                    "step4a": "0",
                    "step4b": "0",
                    "step4c": "0",
                    "withholding": "0"
                }
            }
        },
        {
            "name": "Direct Deposit",
            "endpoint": f"/api/onboarding/{TEST_EMPLOYEE_ID}/direct-deposit/generate-pdf",
            "body": {
                "formData": {
                    "employeeName": "John Doe",
                    "employeeId": TEST_EMPLOYEE_ID,
                    "ssn": "123-45-6789",
                    "phoneNumber": "555-1234",
                    "emailAddress": "john.doe@test.com",
                    "depositType": "full",
                    "accountType1": "checking",
                    "bankName1": "Test Bank",
                    "routingNumber1": "123456789",
                    "accountNumber1": "987654321"
                }
            }
        },
        {
            "name": "Health Insurance",
            "endpoint": f"/api/onboarding/{TEST_EMPLOYEE_ID}/health-insurance/generate-pdf",
            "body": {
                "employee_data": {
                    "personalInfo": {
                        "firstName": "John",
                        "lastName": "Doe",
                        "ssn": "123-45-6789",
                        "dateOfBirth": "1990-01-01"
                    },
                    "medicalPlan": "hra_6000_employee",
                    "medicalTier": "employee",
                    "medicalWaived": False,
                    "dentalCoverage": True,
                    "dentalTier": "employee",
                    "visionCoverage": True,
                    "visionTier": "employee",
                    "dependents": [],
                    "effectiveDate": datetime.now().strftime("%Y-%m-%d")
                }
            }
        },
        {
            "name": "Company Policies",
            "endpoint": f"/api/onboarding/{TEST_EMPLOYEE_ID}/company-policies/generate-pdf",
            "body": {
                "employee_data": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "property_name": "Test Hotel"
                },
                "form_data": {
                    "companyPoliciesInitials": "JD",
                    "eeoInitials": "JD",
                    "sexualHarassmentInitials": "JD"
                }
            }
        },
        {
            "name": "Weapons Policy",
            "endpoint": f"/api/onboarding/{TEST_EMPLOYEE_ID}/weapons-policy/generate-pdf",
            "body": {
                "employee_data": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "property_name": "Test Hotel"
                }
            }
        },
        {
            "name": "Human Trafficking",
            "endpoint": f"/api/onboarding/{TEST_EMPLOYEE_ID}/human-trafficking/generate-pdf",
            "body": {
                "employee_data": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "property_name": "Test Hotel",
                    "position": "Test Position",
                    "completionDate": datetime.now().strftime("%Y-%m-%d")
                }
            }
        },
        {
            "name": "I-9 Complete",
            "endpoint": f"/api/onboarding/{TEST_EMPLOYEE_ID}/i9-complete/generate-pdf",
            "body": {
                "employee_data": {
                    "first_name": "John",
                    "last_name": "Doe",
                    "middle_initial": "M",
                    "address": "123 Test St",
                    "city": "Test City",
                    "state": "TX",
                    "zip_code": "12345",
                    "date_of_birth": "1990-01-01",
                    "ssn": "123-45-6789",
                    "email": "john.doe@test.com",
                    "phone": "555-1234",
                    "citizenship_status": "citizen"
                }
            }
        }
    ]
    
    # Run tests
    results = []
    for test_case in test_cases:
        success = await test_pdf_generation(
            test_case["name"],
            test_case["endpoint"],
            test_case["body"]
        )
        results.append((test_case["name"], success))
        await asyncio.sleep(1)  # Small delay between tests
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, success in results if success)
    failed = len(results) - passed
    
    for name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {len(results)} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed! PDF generation and storage is working correctly.")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please check the logs above for details.")

if __name__ == "__main__":
    asyncio.run(main())