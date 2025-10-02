#!/usr/bin/env python3
"""Debug health insurance with signature"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.pdf_forms import PDFFormFiller
import traceback

def test_with_signature():
    try:
        # Test data matching frontend structure
        employee_data = {
            "personal_info": {
                "firstName": "John",
                "lastName": "Doe",
                "ssn": "123-45-6789",
                "dateOfBirth": "1990-01-15"
            },
            "insurance_selections": {
                "medicalPlan": "plan_a",
                "dentalPlan": "yes",
                "visionPlan": "yes"
            },
            "dependents": [],
            "effective_date": "2025-01-01",
            "section125_acknowledged": True,
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        }
        
        pdf_filler = PDFFormFiller()
        print("Testing with signature...")
        pdf_bytes = pdf_filler.fill_health_insurance_form(employee_data)
        
        if pdf_bytes:
            print(f"✅ SUCCESS! PDF generated with signature. Size: {len(pdf_bytes)} bytes")
            with open("test_hi_signed.pdf", "wb") as f:
                f.write(pdf_bytes)
            print("Saved as test_hi_signed.pdf")
            return True
        else:
            print("❌ FAILED: No PDF bytes returned")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_with_signature()
    sys.exit(0 if success else 1)