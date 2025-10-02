#!/usr/bin/env python3
"""
Test Health Insurance UI Integration
Simulates what the frontend sends to verify the backend processes it correctly
"""

import httpx
import json
from datetime import datetime

# Test configuration
API_BASE = "http://localhost:8000"

def test_ui_integration():
    """Test what the UI sends to the backend"""
    
    print("🔍 Testing Health Insurance UI Integration")
    print("=" * 60)
    
    # This is exactly what the frontend sends (from HealthInsuranceForm.tsx)
    ui_payload = {
        "stepId": "health-insurance",
        "data": {
            # Personal info from PersonalInfoStep
            "personalInfo": {
                "firstName": "John",
                "middleInitial": "M",
                "lastName": "Smith",
                "ssn": "123-45-6789",
                "dateOfBirth": "1985-06-15",
                "address": "456 Main Street",
                "city": "Dallas",
                "state": "TX",
                "zip": "75201",
                "phone": "214-555-1234",
                "email": "john.smith@example.com",
                "gender": "M"
            },
            
            # Coverage selections
            "coverageSelection": "enrolled",
            "waiverReason": "",
            "otherCoverageType": "",
            
            # Medical coverage
            "medicalPlan": "hra4k",
            "medicalTier": "employee",
            
            # Dental and Vision - Frontend sends dentalEnrolled/visionEnrolled
            "dentalEnrolled": True,
            "dentalTier": "employee",
            "dentalWaived": False,
            "visionEnrolled": True,
            "visionTier": "employee",
            "visionWaived": False,
            
            # Effective date
            "effectiveDate": "2025-09-01",
            
            # No dependents in this test
            "dependents": [],
            
            # Section 125 and costs
            "section125Acknowledgment": True,
            "totalBiweeklyCost": 157.54,
            "totalMonthlyCost": 341.33,
            "totalAnnualCost": 4095.96
        }
    }
    
    # Simulate the form submission
    client = httpx.Client(base_url=API_BASE)
    
    try:
        # First, let's check if the endpoint is accessible
        health_check = client.get("/healthz")
        print(f"✅ Server is running: {health_check.status_code}")
        
        # Now submit the health insurance data
        print("\n📤 Submitting Health Insurance data...")
        print(f"   Medical: {ui_payload['data']['medicalPlan']} - {ui_payload['data']['medicalTier']}")
        print(f"   Dental: {'Enrolled' if ui_payload['data']['dentalEnrolled'] else 'Waived'}")
        print(f"   Vision: {'Enrolled' if ui_payload['data']['visionEnrolled'] else 'Waived'}")
        
        # Generate the PDF (use test employee ID)
        employee_id = "test-employee-123"
        response = client.post(
            f"/api/onboarding/{employee_id}/health-insurance/generate-pdf",
            json=ui_payload['data']
        )
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ PDF Generated Successfully!")
            print(f"   Response keys: {list(result.keys())}")
            
            # Check if data contains the PDF
            if 'data' in result:
                data = result['data']
                if isinstance(data, dict):
                    print(f"   Data keys: {list(data.keys())}")
                    pdf_data = data.get('pdf_url') or data.get('pdfUrl') or data.get('pdf')
                else:
                    pdf_data = None
            else:
                pdf_data = result.get('pdf_url') or result.get('pdfUrl') or result.get('pdf')
            
            if pdf_data:
                print(f"   PDF data found (length: {len(str(pdf_data)[:50])}...)")
            
            # Save the PDF for inspection
            final_pdf_data = None
            if pdf_data:
                final_pdf_data = pdf_data
            elif 'data' in result and isinstance(result['data'], dict):
                # Look in the data field
                for key in ['pdf_url', 'pdfUrl', 'pdf']:
                    if key in result['data']:
                        final_pdf_data = result['data'][key]
                        break
            
            if final_pdf_data:
                import base64
                # Handle data URL format
                if ',' in str(final_pdf_data):
                    final_pdf_data = str(final_pdf_data).split(',')[1]
                pdf_bytes = base64.b64decode(final_pdf_data)
                
                with open('test_ui_integration_output.pdf', 'wb') as f:
                    f.write(pdf_bytes)
                print("   📄 Saved as: test_ui_integration_output.pdf")
                
                # Verify the PDF content
                import fitz
                pdf = fitz.open('test_ui_integration_output.pdf')
                page1 = pdf[0]
                
                print("\n🔍 Verifying PDF fields:")
                fields_found = 0
                for widget in page1.widgets():
                    if widget.field_value:
                        fields_found += 1
                        if fields_found <= 5:  # Show first 5 fields as examples
                            print(f"   ✅ {widget.field_name}: {widget.field_value}")
                
                print(f"\n📊 Total fields populated: {fields_found}")
                pdf.close()
                
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"\n❌ Error during test: {e}")
    finally:
        client.close()
    
    print("\n" + "=" * 60)
    print("Test complete! Check test_ui_integration_output.pdf")

if __name__ == "__main__":
    test_ui_integration()