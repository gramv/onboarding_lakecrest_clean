#!/usr/bin/env python3
"""Test the health insurance PDF generation with personal info"""
import asyncio
import aiohttp
import json
import base64
from datetime import datetime

BASE_URL = "http://localhost:8000/api"

async def test_health_insurance_pdf():
    """Test health insurance PDF generation with personal info"""
    
    # Test data with personal info embedded
    test_data = {
        "employee_data": {
            "personalInfo": {
                "firstName": "John",
                "lastName": "Doe",
                "middleInitial": "A",
                "dateOfBirth": "1990-01-15",
                "ssn": "123-45-6789",
                "email": "john.doe@example.com",
                "phone": "(555) 123-4567",
                "address": "123 Main Street",
                "aptNumber": "4B",
                "city": "New York",
                "state": "NY",
                "zipCode": "10001",
                "gender": "male",
                "maritalStatus": "single"
            },
            "medicalPlan": "plan_a",
            "medicalTier": "employee",
            "medicalWaived": False,
            "dentalCoverage": True,
            "dentalEnrolled": True,
            "dentalTier": "employee",
            "dentalWaived": False,
            "visionCoverage": True,
            "visionEnrolled": True,
            "visionTier": "employee",
            "visionWaived": False,
            "isWaived": False,
            "waiveReason": "",
            "otherCoverageDetails": "",
            "dependents": [],
            "hasStepchildren": False,
            "stepchildrenNames": "",
            "dependentsSupported": False,
            "irsDependentConfirmation": False,
            "section125Acknowledged": True,
            "effectiveDate": "2025-10-01",
            "totalBiweeklyCost": 150.00,
            "totalMonthlyCost": 325.00,
            "totalAnnualCost": 3900.00
        }
    }
    
    # Test with a temporary employee ID
    employee_id = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    async with aiohttp.ClientSession() as session:
        # Test PDF generation
        print(f"\n{'='*60}")
        print(f"Testing Health Insurance PDF Generation")
        print(f"Employee ID: {employee_id}")
        print(f"{'='*60}\n")
        
        url = f"{BASE_URL}/onboarding/{employee_id}/health-insurance/generate-pdf"
        
        try:
            async with session.post(url, json=test_data) as response:
                print(f"Response Status: {response.status}")
                
                if response.status == 200:
                    result = await response.json()
                    
                    if result.get('success'):
                        print("✅ PDF Generation Successful!")
                        print(f"   - Operation ID: {result.get('data', {}).get('operation_id')}")
                        print(f"   - Filename: {result.get('data', {}).get('filename')}")
                        print(f"   - Generation Time: {result.get('data', {}).get('generation_time', 0):.2f}s")
                        
                        # Check if PDF data is present
                        pdf_data = result.get('data', {}).get('pdf')
                        if pdf_data:
                            # Decode and save the PDF for inspection
                            pdf_bytes = base64.b64decode(pdf_data)
                            pdf_file = f"test_health_insurance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                            with open(pdf_file, 'wb') as f:
                                f.write(pdf_bytes)
                            print(f"   - PDF saved to: {pdf_file}")
                            print(f"   - PDF size: {len(pdf_bytes):,} bytes")
                        else:
                            print("   ⚠️ No PDF data in response")
                    else:
                        print(f"❌ PDF Generation Failed:")
                        print(f"   - Message: {result.get('message')}")
                        print(f"   - Error: {result.get('error')}")
                else:
                    # Try to get error details
                    try:
                        error_data = await response.json()
                        print(f"❌ Error Response:")
                        print(f"   - Message: {error_data.get('message', 'Unknown error')}")
                        print(f"   - Error: {error_data.get('error', 'Unknown')}")
                        if 'detail' in error_data:
                            print(f"   - Details: {error_data['detail']}")
                    except:
                        text = await response.text()
                        print(f"❌ Error Response: {text[:500]}")
                        
        except aiohttp.ClientError as e:
            print(f"❌ Connection Error: {e}")
        except Exception as e:
            print(f"❌ Unexpected Error: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{'='*60}")
    print("Test Complete")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    asyncio.run(test_health_insurance_pdf())