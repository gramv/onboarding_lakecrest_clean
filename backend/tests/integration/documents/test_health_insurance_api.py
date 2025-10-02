#!/usr/bin/env python3
"""Test Health Insurance API endpoint with real data."""

import asyncio
import httpx
import json
import base64

API_BASE = "http://localhost:8000/api"

async def test_health_insurance_preview():
    """Test the health insurance preview endpoint."""
    
    # Test data with ACI plan
    test_data = {
        "personalInfo": {
            "firstName": "Jane",
            "lastName": "Smith",
            "middleInitial": "A",
            "socialSecurity": "123-45-6789",
            "birthDate": "1985-06-15",
            "email": "jane.smith@test.com",
            "phone": "555-123-4567",
            "address": "456 Oak Street",
            "city": "Chicago",
            "state": "IL",
            "zip": "60601",
            "gender": "female"
        },
        "healthInsurance": {
            # ACI Limited Medical Plan
            "medicalPlan": "minimum_indemnity",
            "medicalTier": "family",
            "dentalOn": True,
            "dentalTier": "family",
            "visionOn": True,
            "visionTier": "family",
            "dependents": [
                {
                    "name": "John Smith",
                    "dob": "1983-03-20",
                    "ssn": "987-65-4321"
                },
                {
                    "name": "Emma Smith",
                    "dob": "2015-08-10",
                    "ssn": "111-22-3333"
                }
            ]
        }
    }
    
    async with httpx.AsyncClient() as client:
        print("Testing Health Insurance Preview Endpoint...")
        print(f"Medical Plan: {test_data['healthInsurance']['medicalPlan']} (ACI Limited)")
        print(f"Tier: {test_data['healthInsurance']['medicalTier']}")
        
        response = await client.post(
            f"{API_BASE}/preview-health-insurance",
            json=test_data
        )
        
        if response.status_code == 200:
            result = response.json()
            
            if "pdf" in result:
                # Save the preview PDF
                pdf_bytes = base64.b64decode(result["pdf"])
                with open("test_api_health_insurance.pdf", "wb") as f:
                    f.write(pdf_bytes)
                print("✓ Preview PDF generated successfully")
                print("  Saved as: test_api_health_insurance.pdf")
                
                # Check warnings if any
                if "warnings" in result and result["warnings"]:
                    print(f"  Warnings: {result['warnings']}")
                    
                # Verify the correct plan was selected
                if "debug" in result:
                    print(f"  Debug info: {result['debug']}")
                    
            else:
                print("✗ No PDF in response")
                print(f"  Response: {result}")
        else:
            print(f"✗ API request failed with status {response.status_code}")
            print(f"  Error: {response.text}")

async def test_health_insurance_generate():
    """Test the full health insurance generation with signature."""
    
    test_data = {
        "formData": {
            "firstName": "Bob",
            "lastName": "Johnson",
            "socialSecurity": "444-55-6666",
            "birthDate": "1990-01-15",
            "email": "bob.johnson@test.com",
            "phone": "555-999-8888",
            "address": "789 Pine Road",
            "city": "Boston",
            "state": "MA",
            "zip": "02101",
            "gender": "male",
            # UHC HRA Plan
            "medicalPlan": "hra_6k",
            "medicalTier": "employee",
            "dentalOn": False,
            "dentalWaived": True,
            "visionOn": False,
            "visionWaived": True
        },
        "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "signedDate": "2025-08-29"
    }
    
    async with httpx.AsyncClient() as client:
        print("\nTesting Health Insurance Generation Endpoint...")
        print(f"Medical Plan: {test_data['formData']['medicalPlan']} (UHC HRA)")
        print(f"Tier: {test_data['formData']['medicalTier']}")
        
        response = await client.post(
            f"{API_BASE}/generate-health-insurance",
            json=test_data
        )
        
        if response.status_code == 200:
            result = response.json()
            
            if "pdf" in result:
                pdf_bytes = base64.b64decode(result["pdf"])
                with open("test_api_health_insurance_signed.pdf", "wb") as f:
                    f.write(pdf_bytes)
                print("✓ Signed PDF generated successfully")
                print("  Saved as: test_api_health_insurance_signed.pdf")
            else:
                print("✗ No PDF in response")
                print(f"  Response: {result}")
        else:
            print(f"✗ API request failed with status {response.status_code}")
            print(f"  Error: {response.text}")

async def main():
    print("=" * 60)
    print("Health Insurance API Test Suite")
    print("=" * 60)
    
    await test_health_insurance_preview()
    await test_health_insurance_generate()
    
    print("\n" + "=" * 60)
    print("API tests complete! Check the generated PDF files.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())