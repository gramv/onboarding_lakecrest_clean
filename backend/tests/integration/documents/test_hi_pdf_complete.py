#!/usr/bin/env python3
"""
Comprehensive test script for Health Insurance PDF generation
Tests with actual selections including dental and vision coverage
"""

import asyncio
import base64
import json
from datetime import datetime
from pathlib import Path

# Add the app directory to the Python path
import sys
sys.path.insert(0, str(Path(__file__).parent))

from app.health_insurance_overlay import HealthInsuranceFormOverlay


def create_realistic_test_data():
    """Create test data that matches what the frontend actually sends."""
    return {
        # Personal info from PersonalInfoStep
        "personalInfo": {
            "firstName": "John",
            "lastName": "Smith",
            "middleInitial": "M",
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
        # Medical coverage selections
        "medicalPlan": "hra_4k",
        "medicalTier": "employee_spouse",
        "medicalWaived": False,
        
        # Dental coverage - ENROLLED
        "dentalCoverage": True,  # Selected
        "dentalTier": "employee_spouse",
        "dentalWaived": False,  # Not waived
        
        # Vision coverage - ENROLLED
        "visionCoverage": True,  # Selected
        "visionTier": "employee_spouse",
        "visionWaived": False,  # Not waived
        
        # Coverage waiver
        "isWaived": False,  # Not waiving entire form
        "waiveReason": "",
        "otherCoverageDetails": "",
        
        # Dependents
        "dependents": [
            {
                "firstName": "Jane",
                "lastName": "Smith",
                "middleInitial": "A",
                "relationship": "Spouse",
                "dateOfBirth": "1987-03-20",
                "ssn": "987-65-4321",
                "gender": "F",
                "coverageType": {
                    "medical": True,
                    "dental": True,
                    "vision": True
                }
            }
        ],
        
        # Affirmations
        "irsDependentConfirmation": True,
        "hasStepchildren": False,
        "stepchildrenNames": "",
        "dependentsSupported": True,
        "section125Acknowledgment": True,
        
        "effectiveDate": "2025-09-01"
    }


def save_pdf(pdf_bytes: bytes, filename: str):
    """Save PDF bytes to a file for inspection."""
    output_path = Path(f"test_{filename}.pdf")
    with open(output_path, 'wb') as f:
        f.write(pdf_bytes)
    print(f"✅ Saved: {output_path}")
    return output_path


def test_with_all_coverage():
    """Test with all coverage selected (medical, dental, vision)."""
    overlay = HealthInsuranceFormOverlay()
    
    print("\n" + "=" * 70)
    print("🔍 Testing Health Insurance PDF with ALL COVERAGE SELECTED")
    print("=" * 70)
    
    test_data = create_realistic_test_data()
    
    print("\n📋 Test Configuration:")
    print(f"  Medical: {test_data['medicalPlan']} - {test_data['medicalTier']}")
    print(f"  Dental: {'✅ ENROLLED' if test_data['dentalCoverage'] else '❌ DECLINED'} - {test_data['dentalTier']}")
    print(f"  Vision: {'✅ ENROLLED' if test_data['visionCoverage'] else '❌ DECLINED'} - {test_data['visionTier']}")
    print(f"  Personal Info: {test_data['personalInfo']['firstName']} {test_data['personalInfo']['lastName']}")
    print(f"  Address: {test_data['personalInfo']['address']}, {test_data['personalInfo']['city']}, {test_data['personalInfo']['state']} {test_data['personalInfo']['zip']}")
    
    try:
        # Generate PDF
        pdf_bytes, warnings, actions = overlay.generate(
            form_data=test_data,
            employee_first=test_data['personalInfo']['firstName'],
            employee_last=test_data['personalInfo']['lastName'],
            preview=True,
            return_details=True
        )
        
        # Save PDF
        save_pdf(pdf_bytes, "all_coverage_selected")
        
        # Analyze actions
        print("\n📝 PDF Generation Actions:")
        
        # Check for decline actions - should NOT have any!
        decline_actions = [a for a in actions if 'decline' in a.get('field', '')]
        if decline_actions:
            print("  ❌ ERROR: Found decline actions when coverage was selected:")
            for action in decline_actions:
                print(f"    - {action['field']}")
        else:
            print("  ✅ No decline boxes marked (correct!)")
        
        # Check for tier selections
        tier_actions = [a for a in actions if ':' in a.get('field', '') and 'decline' not in a.get('field', '')]
        print("\n  Selected Tiers:")
        for action in tier_actions:
            print(f"    - {action['field']}")
        
        # Check for personal info
        text_actions = [a for a in actions if a.get('action') == 'text']
        print("\n  Personal Info Fields:")
        for action in text_actions[:5]:  # Show first 5
            print(f"    - {action['field']}")
        
        if warnings:
            print(f"\n  ⚠️ Warnings: {', '.join(warnings)}")
        
        print("\n✅ Test Complete! Please open 'test_all_coverage_selected.pdf' to verify:")
        print("  1. Dental should NOT have decline marked")
        print("  2. Vision should NOT have decline marked")
        print("  3. Personal info should be populated")
        print("  4. Dependent info should be visible")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


def test_with_waived_coverage():
    """Test with dental and vision explicitly waived."""
    overlay = HealthInsuranceFormOverlay()
    
    print("\n" + "=" * 70)
    print("🔍 Testing Health Insurance PDF with WAIVED COVERAGE")
    print("=" * 70)
    
    test_data = create_realistic_test_data()
    # Waive dental and vision
    test_data['dentalCoverage'] = False
    test_data['dentalWaived'] = True
    test_data['visionCoverage'] = False
    test_data['visionWaived'] = True
    
    print("\n📋 Test Configuration:")
    print(f"  Medical: {test_data['medicalPlan']} - {test_data['medicalTier']}")
    print(f"  Dental: ❌ WAIVED")
    print(f"  Vision: ❌ WAIVED")
    
    try:
        pdf_bytes, warnings, actions = overlay.generate(
            form_data=test_data,
            employee_first=test_data['personalInfo']['firstName'],
            employee_last=test_data['personalInfo']['lastName'],
            preview=True,
            return_details=True
        )
        
        save_pdf(pdf_bytes, "coverage_waived")
        
        # Check for decline actions - should have dental and vision declines
        decline_actions = [a for a in actions if 'decline' in a.get('field', '')]
        print("\n📝 Decline Actions (should have dental and vision):")
        for action in decline_actions:
            print(f"    - {action['field']}")
        
        print("\n✅ Test Complete! Please open 'test_coverage_waived.pdf' to verify:")
        print("  1. Dental SHOULD have decline marked")
        print("  2. Vision SHOULD have decline marked")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


def test_mixed_coverage():
    """Test with dental selected but vision waived."""
    overlay = HealthInsuranceFormOverlay()
    
    print("\n" + "=" * 70)
    print("🔍 Testing Health Insurance PDF with MIXED COVERAGE")
    print("=" * 70)
    
    test_data = create_realistic_test_data()
    # Keep dental, waive vision
    test_data['dentalCoverage'] = True
    test_data['dentalWaived'] = False
    test_data['visionCoverage'] = False
    test_data['visionWaived'] = True
    
    print("\n📋 Test Configuration:")
    print(f"  Medical: {test_data['medicalPlan']} - {test_data['medicalTier']}")
    print(f"  Dental: ✅ ENROLLED - {test_data['dentalTier']}")
    print(f"  Vision: ❌ WAIVED")
    
    try:
        pdf_bytes, warnings, actions = overlay.generate(
            form_data=test_data,
            employee_first=test_data['personalInfo']['firstName'],
            employee_last=test_data['personalInfo']['lastName'],
            preview=True,
            return_details=True
        )
        
        save_pdf(pdf_bytes, "mixed_coverage")
        
        # Check actions
        decline_actions = [a for a in actions if 'decline' in a.get('field', '')]
        tier_actions = [a for a in actions if ':' in a.get('field', '') and 'decline' not in a.get('field', '')]
        
        print("\n📝 Coverage Actions:")
        print("  Decline boxes:")
        for action in decline_actions:
            print(f"    - {action['field']}")
        print("  Selected tiers:")
        for action in tier_actions:
            print(f"    - {action['field']}")
        
        print("\n✅ Test Complete! Please open 'test_mixed_coverage.pdf' to verify:")
        print("  1. Dental should NOT have decline marked (enrolled)")
        print("  2. Vision SHOULD have decline marked (waived)")
        print("  3. Dental tier should be selected")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


if __name__ == "__main__":
    print("\n🚀 Starting Comprehensive Health Insurance PDF Tests")
    print("This will generate several test PDFs to verify the fixes\n")
    
    # Run all tests
    test_with_all_coverage()
    test_with_waived_coverage()
    test_mixed_coverage()
    
    print("\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    print("Generated PDFs:")
    print("  1. test_all_coverage_selected.pdf - Should show NO decline boxes")
    print("  2. test_coverage_waived.pdf - Should show decline boxes")
    print("  3. test_mixed_coverage.pdf - Should show only vision declined")
    print("\nPlease open each PDF to verify the checkboxes are correctly marked!")
    print("Personal information should be visible in all PDFs.")