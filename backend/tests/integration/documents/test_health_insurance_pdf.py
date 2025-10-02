#!/usr/bin/env python3
"""
Test script to verify Health Insurance PDF generation with correct field mappings.
Tests various plan and tier combinations to ensure accurate checkbox placement.
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


def create_test_data(plan_type: str, tier: str, dental: bool = True, vision: bool = True):
    """Create test data for different plan and tier combinations."""
    return {
        "personalInfo": {
            "firstName": "John",
            "lastName": "Doe",
            "middleInitial": "M",
            "ssn": "123-45-6789",
            "dateOfBirth": "1990-01-15",
            "address": "123 Test Street",
            "city": "Test City",
            "state": "TX",
            "zip": "75001",
            "phone": "555-123-4567",
            "email": "john.doe@example.com",
            "gender": "M"
        },
        "medicalPlan": plan_type,
        "medicalTier": tier,
        "medicalWaived": False,
        "dentalCoverage": dental,
        "dentalTier": tier if dental else "",
        "visionCoverage": vision,
        "visionTier": tier if vision else "",
        "dependents": [
            {
                "firstName": "Jane",
                "lastName": "Doe",
                "middleInitial": "A",
                "relationship": "Spouse",
                "dateOfBirth": "1992-03-20",
                "ssn": "987-65-4321",
                "gender": "F"
            }
        ] if tier != "employee" else [],
        "irsDependentConfirmation": True,
        "hasStepchildren": False,
        "dependentsSupported": True,
        "section125Acknowledgment": True,
        "effectiveDate": datetime.now().strftime("%Y-%m-%d")
    }


def save_pdf(pdf_bytes: bytes, filename: str):
    """Save PDF bytes to a file for manual inspection."""
    output_path = Path(f"test_output_{filename}.pdf")
    with open(output_path, 'wb') as f:
        f.write(pdf_bytes)
    print(f"✅ Saved: {output_path}")
    return output_path


def test_plan_mapping():
    """Test different plan and tier combinations."""
    overlay = HealthInsuranceFormOverlay()
    
    test_cases = [
        # UHC HRA Plans
        ("hra_6k", "employee", "UHC HRA $6K - Employee Only"),
        ("hra_4k", "employee_spouse", "UHC HRA $4K - Employee + Spouse"),
        ("hra_2k", "employee_children", "UHC HRA $2K - Employee + Children"),
        ("hra_6k", "family", "UHC HRA $6K - Family"),
        
        # ACI Plans
        ("minimum_essential", "employee", "ACI MEC - Employee Only"),
        ("indemnity", "employee_spouse", "ACI Indemnity - Employee + Spouse"),
        ("minimum_indemnity", "family", "ACI MEC+Indemnity - Family"),
    ]
    
    print("\n🔍 Testing Health Insurance PDF Field Mappings")
    print("=" * 60)
    
    for plan, tier, description in test_cases:
        print(f"\n📋 Testing: {description}")
        print(f"   Plan: {plan}, Tier: {tier}")
        
        try:
            # Create test data
            test_data = create_test_data(plan, tier)
            
            # Generate PDF (preview mode)
            pdf_bytes, warnings, actions = overlay.generate(
                form_data=test_data,
                employee_first="John",
                employee_last="Doe",
                preview=True,
                return_details=True
            )
            
            # Save PDF for inspection
            filename = f"{plan}_{tier}".replace('+', '_')
            save_pdf(pdf_bytes, filename)
            
            # Analyze actions taken
            print(f"   Actions taken:")
            medical_actions = [a for a in actions if 'medical' in a.get('field', '') or 'limited_medical' in a.get('field', '')]
            dental_actions = [a for a in actions if 'dental' in a.get('field', '')]
            vision_actions = [a for a in actions if 'vision' in a.get('field', '')]
            
            if medical_actions:
                for action in medical_actions:
                    print(f"     - Medical: {action['field']} ({action['action']}) on page {action['pg']}")
            if dental_actions:
                for action in dental_actions:
                    print(f"     - Dental: {action['field']} ({action['action']}) on page {action['pg']}")
            if vision_actions:
                for action in vision_actions:
                    print(f"     - Vision: {action['field']} ({action['action']}) on page {action['pg']}")
            
            if warnings:
                print(f"   ⚠️ Warnings: {', '.join(warnings)}")
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("✅ Test complete! Check the generated PDFs to verify checkbox placement.")
    print("\nExpected checkbox positions:")
    print("  - UHC Plans: Top section (3 rows)")
    print("    Row 1: HRA $6K")
    print("    Row 2: HRA $4K")
    print("    Row 3: HRA $2K")
    print("  - ACI Plans: Middle section (3 rows)")
    print("    Row 1: Minimum Essential Coverage")
    print("    Row 2: Indemnity")
    print("    Row 3: MEC + Indemnity Bundle")
    print("  - Tiers: 4 columns across")
    print("    Col 1: Employee Only")
    print("    Col 2: Employee + Spouse")
    print("    Col 3: Employee + Children")
    print("    Col 4: Employee + Family")


def test_waived_coverage():
    """Test waived coverage scenario."""
    overlay = HealthInsuranceFormOverlay()
    
    print("\n🔍 Testing Waived Coverage")
    print("=" * 60)
    
    test_data = {
        "personalInfo": {
            "firstName": "John",
            "lastName": "Doe",
            "ssn": "123-45-6789",
            "dateOfBirth": "1990-01-15",
            "email": "john.doe@example.com"
        },
        "isWaived": True,
        "waiveReason": "other",
        "otherCoverageDetails": "Covered under spouse's plan",
        "dentalCoverage": False,
        "visionCoverage": False
    }
    
    try:
        pdf_bytes, warnings, actions = overlay.generate(
            form_data=test_data,
            employee_first="John",
            employee_last="Doe",
            preview=True,
            return_details=True
        )
        
        save_pdf(pdf_bytes, "waived_coverage")
        
        print("   Actions taken:")
        decline_actions = [a for a in actions if 'decline' in a.get('field', '')]
        for action in decline_actions:
            print(f"     - {action['field']} ({action['action']}) on page {action['pg']}")
        
        print("✅ Waived coverage test complete!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


if __name__ == "__main__":
    # Run tests
    test_plan_mapping()
    test_waived_coverage()
    
    print("\n📝 Summary:")
    print("Generated PDFs have been saved to the current directory.")
    print("Please open each PDF to verify that checkboxes are marked correctly.")
    print("Look for 'X' marks in the appropriate checkbox positions.")
