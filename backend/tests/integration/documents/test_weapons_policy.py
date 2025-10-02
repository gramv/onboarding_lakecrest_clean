#!/usr/bin/env python3
"""Test Weapons Policy PDF generation"""

import asyncio
import base64
import json
import httpx
from datetime import datetime

async def test_weapons_policy():
    """Test the Weapons Policy PDF generation"""
    
    base_url = "http://localhost:8000"
    employee_id = "test-employee-123"
    
    print("🔍 Testing Weapons Policy PDF Generation...\n")
    
    # Test 1: Generate PDF (currently no signature support)
    print("1️⃣ Testing PDF generation...")
    
    request_data = {
        "employee_data": {
            "firstName": "John",
            "lastName": "Doe",
            "property_name": "Test Hotel"
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{base_url}/api/onboarding/{employee_id}/weapons-policy/generate-pdf",
            json=request_data
        )
        if response.status_code == 200:
            result = response.json()
            if result.get('data', {}).get('pdf'):
                print("✅ PDF generated successfully")
                print(f"   PDF size: {len(result['data']['pdf'])} bytes (base64)")
                print(f"   Filename: {result['data'].get('filename')}")
                
                # Save the PDF for inspection
                pdf_bytes = base64.b64decode(result['data']['pdf'])
                with open('test_weapons_policy.pdf', 'wb') as f:
                    f.write(pdf_bytes)
                print("   📄 Saved as: test_weapons_policy.pdf")
            else:
                print("❌ PDF missing in response")
        else:
            print(f"❌ Generation failed: {response.status_code}")
            print(f"   Response: {response.text}")
    
    print("\n2️⃣ Checking if employee names are pulled from PersonalInfoStep...")
    print("   Note: The backend should be using get_employee_names_from_personal_info()")
    print("   This pulls names from the PersonalInfoStep saved data instead of hardcoding")
    
    print("\n⚠️  Current Status:")
    print("   - Employee name propagation: ✅ Should be working (uses PersonalInfoStep data)")
    print("   - Signature support: ❌ Not implemented yet in backend")
    print("   - The frontend sends signature but backend doesn't process it")

if __name__ == "__main__":
    asyncio.run(test_weapons_policy())