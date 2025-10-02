#!/usr/bin/env python3
"""
Comprehensive test script for Health Insurance PDF generation with ALL scenarios.
Tests personal info propagation, dependent coverage types, and all form fields.
"""

import asyncio
import base64
import json
from datetime import datetime, timedelta
from pathlib import Path

# Add the app directory to the Python path
import sys
sys.path.insert(0, str(Path(__file__).parent))

from app.health_insurance_overlay import HealthInsuranceFormOverlay


def create_base_test_data():
    """Create base test data with personal info from PersonalInfoStep."""
    # Calculate effective date as first of next month
    today = datetime.now()
    if today.month == 12:
        next_month = datetime(today.year + 1, 1, 1)
    else:
        next_month = datetime(today.year, today.month + 1, 1)
    
    return {
        # Personal info from PersonalInfoStep (nested structure as frontend sends)
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
        # Default effective date
        "effectiveDate": next_month.strftime("%Y-%m-%d"),
        # Section 125 always acknowledged for valid enrollments
        "section125Acknowledgment": True,
    }


def save_pdf(pdf_bytes: bytes, filename: str):
    """Save PDF bytes to a file for inspection."""
    output_path = Path(f"test_{filename}.pdf")
    with open(output_path, 'wb') as f:
        f.write(pdf_bytes)
    print(f"✅ Saved: {output_path}")
    return output_path


def test_scenario_1_all_coverage_single():
    """Test 1: Single employee with all coverage (medical, dental, vision)."""
    overlay = HealthInsuranceFormOverlay()
    
    print("\n" + "=" * 70)
    print("🔍 Test 1: SINGLE EMPLOYEE - ALL COVERAGE")
    print("=" * 70)
    
    test_data = create_base_test_data()
    test_data.update({
        # Medical - UHC HRA $4K plan
        "medicalPlan": "hra_4k",
        "medicalTier": "employee",
        "medicalWaived": False,
        
        # Dental - ENROLLED
        "dentalCoverage": True,
        "dentalTier": "employee",
        "dentalWaived": False,
        
        # Vision - ENROLLED
        "visionCoverage": True,
        "visionTier": "employee",
        "visionWaived": False,
        
        # No dependents for single coverage
        "dependents": [],
        
        # Affirmations
        "irsDependentConfirmation": False,  # No dependents
        "hasStepchildren": False,
        "stepchildrenNames": "",
        "dependentsSupported": False,
        
        # Not waiving
        "isWaived": False,
        "waiveReason": "",
        "otherCoverageDetails": "",
        
        # Cost summary
        "totalBiweeklyCost": 136.84 + 15.50 + 5.20,  # Medical + Dental + Vision
        "totalMonthlyCost": (136.84 + 15.50 + 5.20) * 2.17,
        "totalAnnualCost": (136.84 + 15.50 + 5.20) * 26,
    })
    
    print("\n📋 Configuration:")
    print(f"  Medical: HRA $4K - Employee Only")
    print(f"  Dental: ✅ ENROLLED - Employee Only")
    print(f"  Vision: ✅ ENROLLED - Employee Only")
    print(f"  Effective Date: {test_data['effectiveDate']}")
    print(f"  Total Biweekly Cost: ${test_data['totalBiweeklyCost']:.2f}")
    
    try:
        pdf_bytes, warnings, actions = overlay.generate(
            form_data=test_data,
            employee_first=test_data['personalInfo']['firstName'],
            employee_last=test_data['personalInfo']['lastName'],
            preview=True,
            return_details=True
        )
        
        save_pdf(pdf_bytes, "hi_single_all_coverage")
        
        print("\n✅ Test Complete! Check PDF for:")
        print("  1. All personal info fields populated")
        print("  2. Medical HRA $4K employee tier checked")
        print("  3. Dental employee tier checked (NOT declined)")
        print("  4. Vision employee tier checked (NOT declined)")
        print("  5. Effective date displayed")
        print("  6. Section 125 acknowledgment marked")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


def test_scenario_2_family_mixed_coverage():
    """Test 2: Family with mixed dependent coverage."""
    overlay = HealthInsuranceFormOverlay()
    
    print("\n" + "=" * 70)
    print("🔍 Test 2: FAMILY - MIXED DEPENDENT COVERAGE")
    print("=" * 70)
    
    test_data = create_base_test_data()
    test_data.update({
        # Medical - UHC HRA $6K plan - Family
        "medicalPlan": "hra_6k",
        "medicalTier": "family",
        "medicalWaived": False,
        
        # Dental - ENROLLED - Family
        "dentalCoverage": True,
        "dentalTier": "family",
        "dentalWaived": False,
        
        # Vision - ENROLLED - Employee+Spouse only
        "visionCoverage": True,
        "visionTier": "employee_spouse",
        "visionWaived": False,
        
        # Dependents with different coverage
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
                    "vision": True  # Spouse has all coverage
                }
            },
            {
                "firstName": "Tommy",
                "lastName": "Smith",
                "middleInitial": "",
                "relationship": "Child",
                "dateOfBirth": "2015-08-10",
                "ssn": "456-78-9012",
                "gender": "M",
                "coverageType": {
                    "medical": True,
                    "dental": True,
                    "vision": False  # Child has no vision
                }
            },
            {
                "firstName": "Sarah",
                "lastName": "Smith",
                "middleInitial": "L",
                "relationship": "Child",
                "dateOfBirth": "2018-12-05",
                "ssn": "345-67-8901",
                "gender": "F",
                "coverageType": {
                    "medical": True,
                    "dental": True,
                    "vision": False  # Child has no vision
                }
            }
        ],
        
        # Affirmations
        "irsDependentConfirmation": True,
        "hasStepchildren": False,
        "stepchildrenNames": "",
        "dependentsSupported": True,
        
        # Not waiving
        "isWaived": False,
        "waiveReason": "",
        "otherCoverageDetails": "",
    })
    
    print("\n📋 Configuration:")
    print(f"  Medical: HRA $6K - Family")
    print(f"  Dental: ✅ ENROLLED - Family")
    print(f"  Vision: ✅ ENROLLED - Employee+Spouse only")
    print(f"  Dependents: 3 (Spouse + 2 Children)")
    print(f"  - Spouse: Medical, Dental, Vision")
    print(f"  - Child 1: Medical, Dental only")
    print(f"  - Child 2: Medical, Dental only")
    
    try:
        pdf_bytes, warnings, actions = overlay.generate(
            form_data=test_data,
            employee_first=test_data['personalInfo']['firstName'],
            employee_last=test_data['personalInfo']['lastName'],
            preview=True,
            return_details=True
        )
        
        save_pdf(pdf_bytes, "hi_family_mixed_coverage")
        
        print("\n✅ Test Complete! Check PDF for:")
        print("  1. All 3 dependents listed with relationships")
        print("  2. Coverage indicators [M/D/V] for spouse, [M/D] for children")
        print("  3. Family tier for medical and dental")
        print("  4. Employee+Spouse tier for vision")
        print("  5. IRS dependent confirmation checked")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


def test_scenario_3_limited_medical():
    """Test 3: ACI Limited Medical Coverage (MEC + Indemnity)."""
    overlay = HealthInsuranceFormOverlay()
    
    print("\n" + "=" * 70)
    print("🔍 Test 3: LIMITED MEDICAL (ACI Plans)")
    print("=" * 70)
    
    test_data = create_base_test_data()
    test_data.update({
        # Medical - ACI Minimum Essential Coverage
        "medicalPlan": "minimum_essential",
        "medicalTier": "employee_spouse",
        "medicalWaived": False,
        
        # Dental - WAIVED
        "dentalCoverage": False,
        "dentalTier": "employee",
        "dentalWaived": True,
        
        # Vision - ENROLLED
        "visionCoverage": True,
        "visionTier": "employee_spouse",
        "visionWaived": False,
        
        # Spouse only
        "dependents": [
            {
                "firstName": "Mary",
                "lastName": "Johnson",
                "middleInitial": "B",
                "relationship": "Spouse",
                "dateOfBirth": "1990-11-25",
                "ssn": "111-22-3333",
                "gender": "F",
                "coverageType": {
                    "medical": True,
                    "dental": False,
                    "vision": True
                }
            }
        ],
        
        # Affirmations
        "irsDependentConfirmation": True,
        "hasStepchildren": False,
        "dependentsSupported": True,
        
        "isWaived": False,
    })
    
    print("\n📋 Configuration:")
    print(f"  Medical: ACI Minimum Essential Coverage - Employee+Spouse")
    print(f"  Dental: ❌ WAIVED")
    print(f"  Vision: ✅ ENROLLED - Employee+Spouse")
    
    try:
        pdf_bytes, warnings, actions = overlay.generate(
            form_data=test_data,
            employee_first="David",
            employee_last="Johnson",
            preview=True,
            return_details=True
        )
        
        save_pdf(pdf_bytes, "hi_limited_medical")
        
        print("\n✅ Test Complete! Check PDF for:")
        print("  1. Limited Medical section MEC checkbox marked")
        print("  2. Dental decline box checked")
        print("  3. Vision employee+spouse tier checked")
        print("  4. Spouse listed with [M/V] coverage indicators")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


def test_scenario_4_stepchildren():
    """Test 4: Family with stepchildren."""
    overlay = HealthInsuranceFormOverlay()
    
    print("\n" + "=" * 70)
    print("🔍 Test 4: FAMILY WITH STEPCHILDREN")
    print("=" * 70)
    
    test_data = create_base_test_data()
    test_data['personalInfo']['firstName'] = "Michael"
    test_data['personalInfo']['lastName'] = "Williams"
    
    test_data.update({
        # Medical - HRA $2K - Family
        "medicalPlan": "hra_2k",
        "medicalTier": "family",
        "medicalWaived": False,
        
        # Full coverage
        "dentalCoverage": True,
        "dentalTier": "family",
        "dentalWaived": False,
        
        "visionCoverage": True,
        "visionTier": "family",
        "visionWaived": False,
        
        # Mixed family with stepchildren
        "dependents": [
            {
                "firstName": "Lisa",
                "lastName": "Williams",
                "middleInitial": "",
                "relationship": "Spouse",
                "dateOfBirth": "1988-07-14",
                "ssn": "222-33-4444",
                "gender": "F",
                "coverageType": {
                    "medical": True,
                    "dental": True,
                    "vision": True
                }
            },
            {
                "firstName": "Emma",
                "lastName": "Williams",
                "middleInitial": "",
                "relationship": "Child",
                "dateOfBirth": "2016-02-28",
                "ssn": "333-44-5555",
                "gender": "F",
                "coverageType": {
                    "medical": True,
                    "dental": True,
                    "vision": True
                }
            },
            {
                "firstName": "Jake",
                "lastName": "Thompson",
                "middleInitial": "",
                "relationship": "Stepchild",
                "dateOfBirth": "2014-09-15",
                "ssn": "444-55-6666",
                "gender": "M",
                "coverageType": {
                    "medical": True,
                    "dental": True,
                    "vision": True
                }
            },
            {
                "firstName": "Olivia",
                "lastName": "Thompson",
                "middleInitial": "",
                "relationship": "Stepchild",
                "dateOfBirth": "2017-04-22",
                "ssn": "555-66-7777",
                "gender": "F",
                "coverageType": {
                    "medical": True,
                    "dental": True,
                    "vision": True
                }
            }
        ],
        
        # Stepchildren information
        "hasStepchildren": True,
        "stepchildrenNames": "Jake Thompson, Olivia Thompson",
        "dependentsSupported": True,
        "irsDependentConfirmation": True,
        
        "isWaived": False,
    })
    
    print("\n📋 Configuration:")
    print(f"  Medical: HRA $2K - Family")
    print(f"  All dependents have full coverage")
    print(f"  Dependents: 1 Spouse, 1 Child, 2 Stepchildren")
    print(f"  Stepchildren names provided")
    
    try:
        pdf_bytes, warnings, actions = overlay.generate(
            form_data=test_data,
            employee_first=test_data['personalInfo']['firstName'],
            employee_last=test_data['personalInfo']['lastName'],
            preview=True,
            return_details=True
        )
        
        save_pdf(pdf_bytes, "hi_stepchildren")
        
        print("\n✅ Test Complete! Check PDF for:")
        print("  1. All 4 dependents listed (max capacity)")
        print("  2. Relationships shown: (Spouse), (Child), (Stepchild)")
        print("  3. Stepchildren checkbox marked YES")
        print("  4. Stepchildren names field populated")
        print("  5. All dependents show [M/D/V] coverage")
        
        if warnings:
            print(f"\n⚠️ Warnings: {', '.join(warnings)}")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


def test_scenario_5_waived_coverage():
    """Test 5: Completely waived coverage with reason."""
    overlay = HealthInsuranceFormOverlay()
    
    print("\n" + "=" * 70)
    print("🔍 Test 5: WAIVED COVERAGE")
    print("=" * 70)
    
    test_data = create_base_test_data()
    test_data.update({
        # All coverage waived
        "isWaived": True,
        "waiveReason": "spouse_coverage",
        "otherCoverageType": "Spouse's Employer Plan",
        "otherCoverageDetails": "Blue Cross Blue Shield through spouse's employer",
        
        # Even though waived, these might be set
        "medicalPlan": "",
        "medicalTier": "employee",
        "medicalWaived": True,
        
        "dentalCoverage": False,
        "dentalWaived": True,
        
        "visionCoverage": False,
        "visionWaived": True,
        
        "dependents": [],
        "section125Acknowledgment": False,  # Not needed when waiving
    })
    
    print("\n📋 Configuration:")
    print(f"  Coverage: COMPLETELY WAIVED")
    print(f"  Reason: Spouse's Coverage")
    print(f"  Other Coverage: {test_data['otherCoverageType']}")
    
    try:
        pdf_bytes, warnings, actions = overlay.generate(
            form_data=test_data,
            employee_first=test_data['personalInfo']['firstName'],
            employee_last=test_data['personalInfo']['lastName'],
            preview=True,
            return_details=True
        )
        
        save_pdf(pdf_bytes, "hi_waived")
        
        print("\n✅ Test Complete! Check PDF for:")
        print("  1. Medical decline box checked")
        print("  2. Dental decline box checked")
        print("  3. Vision decline box checked")
        print("  4. Waiver reason text displayed")
        print("  5. Personal info still populated")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


def test_scenario_6_overflow_dependents():
    """Test 6: More than 4 dependents (overflow handling)."""
    overlay = HealthInsuranceFormOverlay()
    
    print("\n" + "=" * 70)
    print("🔍 Test 6: OVERFLOW DEPENDENTS (>4)")
    print("=" * 70)
    
    test_data = create_base_test_data()
    test_data.update({
        "medicalPlan": "hra_4k",
        "medicalTier": "family",
        "medicalWaived": False,
        
        "dentalCoverage": True,
        "dentalTier": "family",
        "dentalWaived": False,
        
        "visionCoverage": True,
        "visionTier": "family",
        "visionWaived": False,
        
        # 6 dependents (more than PDF can handle)
        "dependents": [
            {
                "firstName": f"Dependent{i}",
                "lastName": "TestFamily",
                "middleInitial": chr(65 + i),  # A, B, C, etc.
                "relationship": "Spouse" if i == 0 else "Child",
                "dateOfBirth": f"200{i}-0{i+1}-15",
                "ssn": f"{i+1}{i+1}{i+1}-{i+2}{i+2}-{i+3}{i+3}{i+3}{i+3}",
                "gender": "F" if i % 2 == 0 else "M",
                "coverageType": {
                    "medical": True,
                    "dental": True,
                    "vision": i < 3  # First 3 have vision
                }
            }
            for i in range(6)
        ],
        
        "irsDependentConfirmation": True,
        "dependentsSupported": True,
        "isWaived": False,
    })
    
    print("\n📋 Configuration:")
    print(f"  Medical: HRA $4K - Family")
    print(f"  Dependents: 6 total (PDF shows first 4)")
    print(f"  First 3 dependents have vision, last 3 don't")
    
    try:
        pdf_bytes, warnings, actions = overlay.generate(
            form_data=test_data,
            employee_first="Test",
            employee_last="Overflow",
            preview=True,
            return_details=True
        )
        
        save_pdf(pdf_bytes, "hi_overflow")
        
        print("\n✅ Test Complete! Check PDF for:")
        print("  1. First 4 dependents shown")
        print("  2. Coverage indicators vary per dependent")
        print("  3. Warning about overflow dependents")
        
        if warnings:
            print(f"\n⚠️ Warnings: {', '.join(warnings)}")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


if __name__ == "__main__":
    print("\n🚀 Comprehensive Health Insurance PDF Test Suite")
    print("This will test ALL scenarios including dependent coverage types")
    print("=" * 70)
    
    # Run all test scenarios
    test_scenario_1_all_coverage_single()
    test_scenario_2_family_mixed_coverage()
    test_scenario_3_limited_medical()
    test_scenario_4_stepchildren()
    test_scenario_5_waived_coverage()
    test_scenario_6_overflow_dependents()
    
    print("\n" + "=" * 70)
    print("📊 TEST SUITE COMPLETE")
    print("=" * 70)
    print("\nGenerated PDFs:")
    print("  1. test_hi_single_all_coverage.pdf - Single employee, all coverage")
    print("  2. test_hi_family_mixed_coverage.pdf - Family with different coverage per dependent")
    print("  3. test_hi_limited_medical.pdf - ACI limited medical plan")
    print("  4. test_hi_stepchildren.pdf - Family with stepchildren")
    print("  5. test_hi_waived.pdf - Completely waived coverage")
    print("  6. test_hi_overflow.pdf - More than 4 dependents")
    print("\n🔍 Please review each PDF to verify:")
    print("  - Personal information propagates correctly")
    print("  - Coverage selections match configuration")
    print("  - Dependent coverage types show correctly [M/D/V]")
    print("  - Effective date and Section 125 appear")
    print("  - All fields are properly filled")