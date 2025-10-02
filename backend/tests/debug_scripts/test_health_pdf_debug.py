#!/usr/bin/env python3
"""
Debug script to test health insurance PDF generation directly
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.pdf_forms import PDFFormFiller
from datetime import datetime

def test_pdf_generation():
    """Test PDF generation directly"""
    print("Testing Health Insurance PDF generation...")
    
    try:
        # Create test data
        employee_data = {
            "personal_info": {
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
            },
            "insurance_selections": {
                "medicalPlan": "plan_a",
                "dentalPlan": "yes",
                "visionPlan": "yes"
            },
            "dependents": [
                {
                    "name": "Jane Doe",
                    "relationship": "Spouse",
                    "dateOfBirth": "1992-03-20",
                    "ssn": "987-65-4321",
                    "gender": "Female",
                    "coverageTypes": ["Medical", "Dental", "Vision"]
                }
            ],
            "effective_date": "2025-01-01",
            "section125_acknowledged": True
        }
        
        # Initialize PDF filler
        pdf_filler = PDFFormFiller()
        
        # Test if the method exists
        if not hasattr(pdf_filler, 'fill_health_insurance_form'):
            print("❌ ERROR: fill_health_insurance_form method does not exist in PDFFormFiller")
            return False
            
        # Generate PDF
        print("Generating PDF...")
        pdf_bytes = pdf_filler.fill_health_insurance_form(employee_data)
        
        if pdf_bytes:
            print(f"✅ PDF generated successfully! Size: {len(pdf_bytes)} bytes")
            
            # Save to file for inspection
            with open("test_health_insurance_output.pdf", "wb") as f:
                f.write(pdf_bytes)
            print("PDF saved as test_health_insurance_output.pdf")
            return True
        else:
            print("❌ ERROR: PDF generation returned empty bytes")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_pdf_generation()
    sys.exit(0 if success else 1)