#!/usr/bin/env python3
"""
Comprehensive test script for Health Insurance PDF generation
Tests nested personalInfo structure (new format) and flat structure (backwards compatibility)
"""

import asyncio
import aiohttp
import base64
import json
from datetime import datetime
from typing import Dict, Any
import os

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_OUTPUT_DIR = "test_health_insurance_pdfs"

# Ensure output directory exists
os.makedirs(TEST_OUTPUT_DIR, exist_ok=True)

def create_test_data_nested_uhc() -> Dict[str, Any]:
    """Create test data with nested personalInfo structure for UHC HRA"""
    return {
        "planType": "UHC HRA",
        "personalInfo": {
            "firstName": "John",
            "middleName": "Michael",
            "lastName": "Smith",
            "dateOfBirth": "1985-06-15",
            "ssn": "123-45-6789",
            "address": "123 Main Street",
            "city": "Austin",
            "state": "TX",
            "zipCode": "78701",
            "phoneNumber": "(512) 555-1234",
            "email": "john.smith@example.com"
        },
        "dependents": [
            {
                "name": "Jane Smith",
                "relationship": "Spouse",
                "dateOfBirth": "1987-03-22",
                "ssn": "987-65-4321"
            },
            {
                "name": "Tommy Smith",
                "relationship": "Child",
                "dateOfBirth": "2015-09-10",
                "ssn": "456-78-9012"
            }
        ],
        "planOptions": {
            "planName": "UHC HRA",
            "effectiveDate": "2025-02-01",
            "monthlyPremium": 350.00,
            "deductible": 2500,
            "outOfPocketMax": 5000
        },
        "beneficiaries": [
            {
                "name": "Jane Smith",
                "relationship": "Spouse",
                "percentage": 50
            },
            {
                "name": "Tommy Smith",
                "relationship": "Child",
                "percentage": 50
            }
        ]
    }

def create_test_data_nested_aci() -> Dict[str, Any]:
    """Create test data with nested personalInfo structure for ACI Limited Medical"""
    return {
        "planType": "ACI Limited Medical",
        "personalInfo": {
            "firstName": "Maria",
            "middleName": "Elena",
            "lastName": "Rodriguez",
            "dateOfBirth": "1990-11-20",
            "ssn": "234-56-7890",
            "address": "456 Oak Avenue",
            "city": "Houston",
            "state": "TX",
            "zipCode": "77001",
            "phoneNumber": "(713) 555-5678",
            "email": "maria.rodriguez@example.com"
        },
        "dependents": [
            {
                "name": "Carlos Rodriguez",
                "relationship": "Spouse",
                "dateOfBirth": "1988-07-15",
                "ssn": "876-54-3210"
            }
        ],
        "planOptions": {
            "planName": "ACI Limited Medical",
            "effectiveDate": "2025-02-01",
            "monthlyPremium": 200.00,
            "deductible": 1000,
            "outOfPocketMax": 3000
        },
        "beneficiaries": [
            {
                "name": "Carlos Rodriguez",
                "relationship": "Spouse",
                "percentage": 100
            }
        ]
    }

def create_test_data_flat_structure() -> Dict[str, Any]:
    """Create test data with flat structure for backwards compatibility"""
    return {
        "planType": "UHC HRA",
        "firstName": "Robert",
        "middleName": "James",
        "lastName": "Johnson",
        "dateOfBirth": "1975-04-08",
        "ssn": "345-67-8901",
        "address": "789 Pine Street",
        "city": "Dallas",
        "state": "TX",
        "zipCode": "75201",
        "phoneNumber": "(214) 555-9012",
        "email": "robert.johnson@example.com",
        "dependents": [
            {
                "name": "Sarah Johnson",
                "relationship": "Spouse",
                "dateOfBirth": "1977-12-03",
                "ssn": "765-43-2109"
            }
        ],
        "planOptions": {
            "planName": "UHC HRA",
            "effectiveDate": "2025-02-01",
            "monthlyPremium": 400.00,
            "deductible": 3000,
            "outOfPocketMax": 6000
        },
        "beneficiaries": [
            {
                "name": "Sarah Johnson",
                "relationship": "Spouse",
                "percentage": 100
            }
        ]
    }

def create_test_data_missing_ssn() -> Dict[str, Any]:
    """Create test data with missing SSN"""
    return {
        "planType": "UHC HRA",
        "personalInfo": {
            "firstName": "Emily",
            "lastName": "Davis",
            "dateOfBirth": "1992-08-30",
            # SSN intentionally missing
            "address": "321 Elm Court",
            "city": "San Antonio",
            "state": "TX",
            "zipCode": "78201",
            "phoneNumber": "(210) 555-3456",
            "email": "emily.davis@example.com"
        },
        "dependents": [],
        "planOptions": {
            "planName": "UHC HRA",
            "effectiveDate": "2025-02-01",
            "monthlyPremium": 250.00,
            "deductible": 2000,
            "outOfPocketMax": 4000
        },
        "beneficiaries": []
    }

def create_test_data_no_middle_name() -> Dict[str, Any]:
    """Create test data without middle name"""
    return {
        "planType": "ACI Limited Medical",
        "personalInfo": {
            "firstName": "David",
            "lastName": "Lee",
            "dateOfBirth": "1988-02-14",
            "ssn": "456-78-9012",
            "address": "654 Maple Drive",
            "city": "Fort Worth",
            "state": "TX",
            "zipCode": "76101",
            "phoneNumber": "(817) 555-7890",
            "email": "david.lee@example.com"
        },
        "dependents": [
            {
                "name": "Lisa Lee",
                "relationship": "Spouse",
                "dateOfBirth": "1990-05-20",
                "ssn": "654-32-1098"
            },
            {
                "name": "Kevin Lee",
                "relationship": "Child",
                "dateOfBirth": "2018-11-15",
                "ssn": "789-01-2345"
            },
            {
                "name": "Amy Lee",
                "relationship": "Child",
                "dateOfBirth": "2020-07-08",
                "ssn": "890-12-3456"
            }
        ],
        "planOptions": {
            "planName": "ACI Limited Medical",
            "effectiveDate": "2025-02-01",
            "monthlyPremium": 275.00,
            "deductible": 1500,
            "outOfPocketMax": 3500
        },
        "beneficiaries": [
            {
                "name": "Lisa Lee",
                "relationship": "Spouse",
                "percentage": 100
            }
        ]
    }

async def test_health_insurance_preview(test_name: str, test_data: Dict[str, Any], employee_id: str = "test-employee-001") -> bool:
    """Test health insurance preview endpoint"""
    try:
        print(f"\n{'='*60}")
        print(f"Testing: {test_name}")
        print(f"{'='*60}")
        
        # Extract personal info for display
        if "personalInfo" in test_data:
            personal_info = test_data["personalInfo"]
            print(f"Format: Nested personalInfo structure")
        else:
            personal_info = {k: v for k, v in test_data.items() 
                           if k in ["firstName", "middleName", "lastName", "ssn", "dateOfBirth"]}
            print(f"Format: Flat structure (backwards compatibility)")
        
        # Display test data summary
        print(f"Employee: {personal_info.get('firstName', '')} {personal_info.get('middleName', '')} {personal_info.get('lastName', '')}")
        print(f"DOB: {personal_info.get('dateOfBirth', 'N/A')}")
        print(f"SSN: {personal_info.get('ssn', 'NOT PROVIDED')}")
        print(f"Plan Type: {test_data.get('planType', 'N/A')}")
        print(f"Number of Dependents: {len(test_data.get('dependents', []))}")
        print(f"Employee ID: {employee_id}")
        
        async with aiohttp.ClientSession() as session:
            # Call the preview endpoint with employee_id in path
            async with session.post(
                f"{BASE_URL}/api/onboarding/{employee_id}/health-insurance/preview",
                json=test_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                print(f"\nAPI Response Status: {response.status}")
                
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Error: {error_text}")
                    return False
                
                result = await response.json()
                
                # Handle nested response structure
                if "data" in result and "pdf" in result["data"]:
                    pdf_base64 = result["data"]["pdf"]
                elif "pdf" in result:
                    pdf_base64 = result["pdf"]
                else:
                    print(f"❌ No PDF in response: {result}")
                    return False
                
                # Decode base64 PDF
                pdf_data = base64.b64decode(pdf_base64)
                
                # Generate filename
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                safe_name = test_name.replace(" ", "_").replace("/", "_")
                filename = f"{TEST_OUTPUT_DIR}/{timestamp}_{safe_name}.pdf"
                
                # Save PDF to file
                with open(filename, "wb") as f:
                    f.write(pdf_data)
                
                print(f"✅ PDF generated successfully")
                print(f"📄 Saved to: {filename}")
                print(f"📊 PDF size: {len(pdf_data):,} bytes")
                
                # Check if SSN was properly masked in the response metadata
                if "metadata" in result:
                    metadata = result["metadata"]
                    if "ssn_masked" in metadata:
                        print(f"🔒 SSN masked: {metadata['ssn_masked']}")
                
                return True
                
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def run_all_tests():
    """Run all test cases"""
    print("\n" + "="*80)
    print("HEALTH INSURANCE PDF GENERATION TEST SUITE")
    print("="*80)
    print(f"Output directory: {os.path.abspath(TEST_OUTPUT_DIR)}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    test_cases = [
        ("UHC HRA with Nested PersonalInfo", create_test_data_nested_uhc(), "test-emp-001"),
        ("ACI Limited Medical with Nested PersonalInfo", create_test_data_nested_aci(), "test-emp-002"),
        ("Flat Structure (Backwards Compatibility)", create_test_data_flat_structure(), "test-emp-003"),
        ("Missing SSN Handling", create_test_data_missing_ssn(), "test-emp-004"),
        ("No Middle Name with Multiple Dependents", create_test_data_no_middle_name(), "test-emp-005"),
    ]
    
    results = []
    for test_name, test_data, employee_id in test_cases:
        success = await test_health_insurance_preview(test_name, test_data, employee_id)
        results.append((test_name, success))
        await asyncio.sleep(0.5)  # Small delay between tests
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    total_tests = len(results)
    passed_tests = sum(1 for _, success in results if success)
    failed_tests = total_tests - passed_tests
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {total_tests} | Passed: {passed_tests} | Failed: {failed_tests}")
    
    if passed_tests == total_tests:
        print("\n🎉 All tests passed successfully!")
    else:
        print(f"\n⚠️  {failed_tests} test(s) failed. Please review the output above.")
    
    print(f"\n📁 PDF files saved in: {os.path.abspath(TEST_OUTPUT_DIR)}")
    print("\nPlease manually inspect the generated PDFs to verify:")
    print("  1. Personal information is correctly populated")
    print("  2. SSN is properly masked (XXX-XX-####)")
    print("  3. Dependent information is included")
    print("  4. Plan details are correct")
    print("  5. Signature lines are present")

async def main():
    """Main entry point"""
    try:
        # Check if server is running
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(f"{BASE_URL}/health") as response:
                    if response.status != 200:
                        print("⚠️  Warning: Server health check failed")
            except aiohttp.ClientConnectorError:
                print("❌ Error: Cannot connect to server at http://localhost:8000")
                print("Please ensure the backend server is running:")
                print("  cd hotel-onboarding-backend")
                print("  python3 -m uvicorn app.main_enhanced:app --reload")
                return
        
        await run_all_tests()
        
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())