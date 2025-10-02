#!/usr/bin/env python3
"""
Test Health Insurance UI Integration - Family Scenario
Tests complex family with mixed dependent coverage
"""

import httpx
import json

# Test configuration
API_BASE = "http://localhost:8000"

def test_family_scenario():
    """Test family with mixed dependent coverage"""
    
    print("🔍 Testing Health Insurance - FAMILY SCENARIO")
    print("=" * 60)
    
    # Complex family scenario with mixed coverage
    ui_payload = {
        "stepId": "health-insurance",
        "data": {
            # Personal info
            "personalInfo": {
                "firstName": "Michael",
                "middleInitial": "J",
                "lastName": "Johnson",
                "ssn": "987-65-4321",
                "dateOfBirth": "1980-03-22",
                "address": "789 Oak Drive",
                "city": "Houston",
                "state": "TX",
                "zip": "77001",
                "phone": "713-555-9876",
                "email": "michael.johnson@example.com",
                "gender": "M"
            },
            
            # Coverage selections - Family
            "coverageSelection": "enrolled",
            "waiverReason": "",
            "otherCoverageType": "",
            
            # Medical coverage - HRA $6K Family
            "medicalPlan": "hra6k",
            "medicalTier": "family",
            
            # Dental and Vision - Mixed
            "dentalEnrolled": True,
            "dentalTier": "family",
            "visionEnrolled": True,
            "visionTier": "employee_spouse",  # Only spouse has vision
            
            # Effective date
            "effectiveDate": "2025-10-01",
            
            # Complex dependent structure
            "dependents": [
                {
                    "firstName": "Sarah",
                    "middleInitial": "L",
                    "lastName": "Johnson",
                    "relationship": "Spouse",
                    "ssn": "987-65-5555",
                    "dateOfBirth": "1982-07-15",
                    "gender": "F",
                    # Spouse has all coverage
                    "hasMedical": True,
                    "hasDental": True,
                    "hasVision": True
                },
                {
                    "firstName": "Emma",
                    "middleInitial": "",
                    "lastName": "Johnson",
                    "relationship": "Child",
                    "ssn": "987-65-6666",
                    "dateOfBirth": "2015-09-10",
                    "gender": "F",
                    # Child 1 - medical and dental only
                    "hasMedical": True,
                    "hasDental": True,
                    "hasVision": False
                },
                {
                    "firstName": "James",
                    "middleInitial": "T",
                    "lastName": "Johnson",
                    "relationship": "Child",
                    "ssn": "987-65-7777",
                    "dateOfBirth": "2018-12-25",
                    "gender": "M",
                    # Child 2 - medical and dental only
                    "hasMedical": True,
                    "hasDental": True,
                    "hasVision": False
                }
            ],
            
            # Affirmations
            "section125Acknowledgment": True,
            "confirmDependentsIRS": True,
            "hasStepChildren": False,
            "stepChildrenNames": "",
            
            # Costs
            "totalBiweeklyCost": 425.75,
            "totalMonthlyCost": 922.46,
            "totalAnnualCost": 11069.50
        }
    }
    
    # Submit to API
    client = httpx.Client(base_url=API_BASE)
    
    try:
        print("\n📤 Submitting Family Health Insurance data...")
        print(f"   Medical: HRA $6K - Family")
        print(f"   Dental: Family coverage")
        print(f"   Vision: Employee+Spouse only")
        print(f"   Dependents: {len(ui_payload['data']['dependents'])}")
        for i, dep in enumerate(ui_payload['data']['dependents'], 1):
            coverage = []
            if dep.get('hasMedical'): coverage.append('M')
            if dep.get('hasDental'): coverage.append('D')
            if dep.get('hasVision'): coverage.append('V')
            print(f"     {i}. {dep['firstName']} ({dep['relationship']}): [{'/'.join(coverage)}]")
        
        # Generate the PDF
        employee_id = "test-family-456"
        response = client.post(
            f"/api/onboarding/{employee_id}/health-insurance/generate-pdf",
            json=ui_payload['data']
        )
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ Family PDF Generated Successfully!")
            
            # Extract and save PDF
            if 'data' in result and 'pdf' in result['data']:
                import base64
                pdf_data = result['data']['pdf']
                if ',' in pdf_data:
                    pdf_data = pdf_data.split(',')[1]
                pdf_bytes = base64.b64decode(pdf_data)
                
                with open('test_family_ui_output.pdf', 'wb') as f:
                    f.write(pdf_bytes)
                print("   📄 Saved as: test_family_ui_output.pdf")
                
                # Verify the PDF content
                import fitz
                pdf = fitz.open('test_family_ui_output.pdf')
                
                # Check page 1 for coverage tiers
                page1 = pdf[0]
                print("\n🔍 Page 1 - Coverage Tiers:")
                tier_count = 0
                for widget in page1.widgets():
                    if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX and widget.field_value:
                        if 'Family' in widget.field_name or 'Spouse' in widget.field_name:
                            print(f"   ✅ {widget.field_name}")
                            tier_count += 1
                
                # Check page 2 for dependents
                if len(pdf) > 1:
                    page2 = pdf[1]
                    print("\n🔍 Page 2 - Dependent Information:")
                    dep_count = 0
                    for widget in page2.widgets():
                        if widget.field_type == fitz.PDF_WIDGET_TYPE_TEXT and widget.field_value:
                            if 'Last Name' in widget.field_name and '(' in str(widget.field_value):
                                print(f"   ✅ {widget.field_value}")
                                dep_count += 1
                    
                    print(f"\n📊 Summary:")
                    print(f"   Coverage tiers selected: {tier_count}")
                    print(f"   Dependents listed: {dep_count}")
                
                pdf.close()
                
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"\n❌ Error during test: {e}")
    finally:
        client.close()
    
    print("\n" + "=" * 60)
    print("✅ Family scenario test complete!")
    print("Please verify test_family_ui_output.pdf for:")
    print("  1. Family tier selected for medical and dental")
    print("  2. Employee+Spouse tier for vision")
    print("  3. All 3 dependents listed with correct coverage indicators")
    print("  4. Spouse shows [M/D/V], children show [M/D] only")

if __name__ == "__main__":
    test_family_scenario()