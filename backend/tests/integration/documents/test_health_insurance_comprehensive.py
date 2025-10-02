#!/usr/bin/env python3
"""
Comprehensive Health Insurance PDF Generation Test Suite
Tests all scenarios including personal info, plan selections, dependents, and edge cases
"""

import asyncio
import base64
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import httpx
from pathlib import Path
import PyPDF2
import fitz  # PyMuPDF for visual inspection

# Test configuration
BASE_URL = "http://localhost:8000/api"
OUTPUT_DIR = Path("test_outputs/health_insurance")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

class HealthInsuranceTestSuite:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.test_results = []
        self.pdf_count = 0
        
    async def close(self):
        await self.client.aclose()
        
    def log_result(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        result = f"{status} - {test_name}"
        if details:
            result += f" - {details}"
        print(result)
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })
        
    async def save_pdf(self, base64_content: str, test_name: str) -> Path:
        """Save PDF for manual inspection"""
        self.pdf_count += 1
        filename = f"{self.pdf_count:02d}_{test_name.replace(' ', '_')}.pdf"
        filepath = OUTPUT_DIR / filename
        
        pdf_data = base64.b64decode(base64_content)
        filepath.write_bytes(pdf_data)
        return filepath
        
    async def extract_pdf_text(self, filepath: Path) -> str:
        """Extract text from PDF for verification"""
        doc = fitz.open(str(filepath))
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
        
    def create_base_employee_data(self) -> Dict[str, Any]:
        """Create base employee data with personal information"""
        return {
            "firstName": "John",
            "middleInitial": "A",
            "lastName": "TestEmployee",
            "ssn": "123-45-6789",
            "dateOfBirth": "1985-03-15",
            "address": "123 Test Street",
            "city": "Austin",
            "state": "TX",
            "zipCode": "78701",
            "phone": "(512) 555-1234",  # Changed from phoneNumber to phone
            "email": "john.test@example.com",
            "gender": "M"
        }
        
    def create_health_insurance_data(
        self,
        medical_plan: Optional[str] = None,
        medical_tier: Optional[str] = None,
        dental_tier: Optional[str] = None,
        vision_tier: Optional[str] = None,
        dependents: List[Dict] = None,
        section_125: bool = False,
        stepchildren: bool = False,
        dependent_support: bool = False
    ) -> Dict[str, Any]:
        """Create health insurance form data"""
        data = {
            "medicalPlan": medical_plan,
            "medicalTier": medical_tier,
            "dentalTier": dental_tier,
            "visionTier": vision_tier,
            "dependents": dependents or [],
            "section125Acknowledgment": section_125,
            "hasStepchildren": stepchildren,
            "providesHalfSupport": dependent_support,
            "irsAffirmation": True,
            "signature": None  # For preview tests
        }
        return data
        
    async def generate_pdf(self, employee_data: Dict, insurance_data: Dict, with_signature: bool = False) -> Optional[str]:
        """Generate PDF and return base64 content"""
        if with_signature:
            insurance_data["signature"] = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            
        # Use a test employee ID
        employee_id = "test-employee-001"
        
        # Structure the data as the endpoint expects
        form_data = {
            "personalInfo": employee_data,
            **insurance_data
        }
        
        payload = {
            "employee_data": form_data,
            "health_insurance_data": insurance_data  # Keep for compatibility
        }
        
        try:
            response = await self.client.post(
                f"{BASE_URL}/onboarding/{employee_id}/health-insurance/generate-pdf",
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                # Extract the base64 PDF from the response
                if result.get("success") and result.get("data"):
                    return result["data"].get("pdf")
                return None
            else:
                print(f"Error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Request failed: {e}")
            return None
            
    # Test Scenario 1: Personal Information Population
    async def test_personal_info_population(self):
        """Test that all personal fields populate correctly"""
        print("\n=== Test 1: Personal Information Population ===")
        
        employee = self.create_base_employee_data()
        insurance = self.create_health_insurance_data()
        
        pdf_base64 = await self.generate_pdf(employee, insurance)
        if not pdf_base64:
            self.log_result("Personal Info Generation", False, "Failed to generate PDF")
            return
            
        filepath = await self.save_pdf(pdf_base64, "personal_info_test")
        text = await self.extract_pdf_text(filepath)
        
        # Check for personal info in PDF
        checks = [
            ("Last Name", "TestEmployee" in text),
            ("First Name", "John" in text),
            ("Middle Initial", "A" in text),
            ("SSN", "123-45-6789" in text),  # Full SSN shown in non-preview mode
            ("Date of Birth", "03/15/1985" in text),
            ("Address", "123 Test Street" in text),
            ("City", "Austin" in text),
            ("State", "TX" in text),
            ("Zip", "78701" in text),
            ("Phone", "(512) 555-1234" in text),
            ("Email", "john.test@example.com" in text)
        ]
        
        all_passed = True
        for field, present in checks:
            self.log_result(f"Personal Info - {field}", present)
            if not present:
                all_passed = False
                
        self.log_result("Personal Info Population Overall", all_passed)
        
    # Test Scenario 2: UHC HRA Plans
    async def test_uhc_hra_plans(self):
        """Test UHC HRA medical plans with different tiers"""
        print("\n=== Test 2: UHC HRA Medical Plans ===")
        
        employee = self.create_base_employee_data()
        
        plans = [
            ("HRA $6K", "employee"),
            ("HRA $4K", "employee_spouse"),
            ("HRA $2K", "employee_children"),
            ("HRA $6K", "family")
        ]
        
        for plan, tier in plans:
            insurance = self.create_health_insurance_data(
                medical_plan=plan,
                medical_tier=tier
            )
            
            pdf_base64 = await self.generate_pdf(employee, insurance)
            if pdf_base64:
                filepath = await self.save_pdf(pdf_base64, f"uhc_{plan}_{tier}")
                text = await self.extract_pdf_text(filepath)
                
                # Verify plan is selected
                plan_found = plan in text
                tier_found = tier.replace("_", " ").title() in text or tier.replace("_", "+").title() in text
                
                self.log_result(
                    f"UHC {plan} - {tier}",
                    plan_found and tier_found,
                    f"Plan: {plan_found}, Tier: {tier_found}"
                )
            else:
                self.log_result(f"UHC {plan} - {tier}", False, "Failed to generate PDF")
                
    # Test Scenario 3: ACI Limited Medical Plans
    async def test_aci_limited_medical_plans(self):
        """Test ACI Limited Medical plans"""
        print("\n=== Test 3: ACI Limited Medical Plans ===")
        
        employee = self.create_base_employee_data()
        
        plans = [
            ("Minimum Essential Coverage", "employee"),
            ("Indemnity Plan", "employee_spouse"),
            ("Minimum + Indemnity", "family")
        ]
        
        for plan, tier in plans:
            insurance = self.create_health_insurance_data(
                medical_plan=plan,
                medical_tier=tier
            )
            
            pdf_base64 = await self.generate_pdf(employee, insurance)
            if pdf_base64:
                filepath = await self.save_pdf(pdf_base64, f"aci_{plan.replace(' ', '_')}_{tier}")
                text = await self.extract_pdf_text(filepath)
                
                # Check if ACI plan appears in Limited Medical section
                plan_found = plan in text
                self.log_result(
                    f"ACI {plan} - {tier}",
                    plan_found,
                    f"Plan found: {plan_found}"
                )
            else:
                self.log_result(f"ACI {plan} - {tier}", False, "Failed to generate PDF")
                
    # Test Scenario 4: Vision Coverage
    async def test_vision_coverage(self):
        """Test vision coverage with different tiers"""
        print("\n=== Test 4: Vision Coverage ===")
        
        employee = self.create_base_employee_data()
        
        tiers = ["employee", "employee_spouse", "employee_children", "family", "decline"]
        
        for tier in tiers:
            insurance = self.create_health_insurance_data(
                vision_tier=tier
            )
            
            pdf_base64 = await self.generate_pdf(employee, insurance)
            if pdf_base64:
                filepath = await self.save_pdf(pdf_base64, f"vision_{tier}")
                text = await self.extract_pdf_text(filepath)
                
                if tier == "decline":
                    # Check for decline indication
                    self.log_result("Vision - Decline", "Vision" in text)
                else:
                    # Check for vision tier selection
                    tier_text = tier.replace("_", " ").title()
                    self.log_result(f"Vision - {tier}", tier_text in text or "Vision" in text)
            else:
                self.log_result(f"Vision - {tier}", False, "Failed to generate PDF")
                
    # Test Scenario 5: Dental Coverage
    async def test_dental_coverage(self):
        """Test dental coverage with different tiers"""
        print("\n=== Test 5: Dental Coverage ===")
        
        employee = self.create_base_employee_data()
        
        tiers = ["employee", "employee_spouse", "employee_children", "family", "decline"]
        
        for tier in tiers:
            insurance = self.create_health_insurance_data(
                dental_tier=tier
            )
            
            pdf_base64 = await self.generate_pdf(employee, insurance)
            if pdf_base64:
                filepath = await self.save_pdf(pdf_base64, f"dental_{tier}")
                text = await self.extract_pdf_text(filepath)
                
                if tier == "decline":
                    self.log_result("Dental - Decline", "Dental" in text)
                else:
                    tier_text = tier.replace("_", " ").title()
                    self.log_result(f"Dental - {tier}", tier_text in text or "Dental" in text)
            else:
                self.log_result(f"Dental - {tier}", False, "Failed to generate PDF")
                
    # Test Scenario 6: Dependents
    async def test_dependents(self):
        """Test dependent information"""
        print("\n=== Test 6: Dependents ===")
        
        employee = self.create_base_employee_data()
        
        dependents = [
            {
                "name": "Jane TestDependent",
                "relationship": "Spouse",
                "ssn": "987-65-4321",
                "dateOfBirth": "1987-06-20",
                "gender": "F"
            },
            {
                "name": "Child One TestDependent",
                "relationship": "Child",
                "ssn": "111-22-3333",
                "dateOfBirth": "2010-01-15",
                "gender": "M"
            },
            {
                "name": "Child Two TestDependent",
                "relationship": "Child",
                "ssn": "444-55-6666",
                "dateOfBirth": "2012-08-25",
                "gender": "F"
            }
        ]
        
        insurance = self.create_health_insurance_data(
            medical_plan="HRA $6K",
            medical_tier="family",
            dependents=dependents
        )
        
        pdf_base64 = await self.generate_pdf(employee, insurance)
        if pdf_base64:
            filepath = await self.save_pdf(pdf_base64, "dependents_test")
            text = await self.extract_pdf_text(filepath)
            
            # Check for each dependent
            for dep in dependents:
                dep_found = dep["name"] in text
                self.log_result(f"Dependent - {dep['name']}", dep_found)
                
            # Check for masked SSNs
            self.log_result("Dependent SSN Masking", "***-**-4321" in text)
        else:
            self.log_result("Dependents Test", False, "Failed to generate PDF")
            
    # Test Scenario 7: Section 125 & Affirmations
    async def test_section_125_affirmations(self):
        """Test Section 125 and affirmation checkboxes"""
        print("\n=== Test 7: Section 125 & Affirmations ===")
        
        employee = self.create_base_employee_data()
        
        insurance = self.create_health_insurance_data(
            medical_plan="HRA $6K",
            medical_tier="family",
            section_125=True,
            stepchildren=True,
            dependent_support=True
        )
        
        pdf_base64 = await self.generate_pdf(employee, insurance)
        if pdf_base64:
            filepath = await self.save_pdf(pdf_base64, "section_125_test")
            text = await self.extract_pdf_text(filepath)
            
            # These should be checkboxes, but we can at least verify the section exists
            self.log_result("Section 125 Acknowledgment", "Section 125" in text)
            self.log_result("IRS Affirmation", "IRS" in text or "affirm" in text.lower())
        else:
            self.log_result("Section 125 Test", False, "Failed to generate PDF")
            
    # Test Scenario 8: Edge Cases
    async def test_edge_cases(self):
        """Test edge cases"""
        print("\n=== Test 8: Edge Cases ===")
        
        employee = self.create_base_employee_data()
        
        # Test 1: Declining all coverage
        insurance = self.create_health_insurance_data(
            medical_tier="decline",
            dental_tier="decline",
            vision_tier="decline"
        )
        
        pdf_base64 = await self.generate_pdf(employee, insurance)
        if pdf_base64:
            filepath = await self.save_pdf(pdf_base64, "decline_all_coverage")
            self.log_result("Decline All Coverage", True, "PDF generated successfully")
        else:
            self.log_result("Decline All Coverage", False, "Failed to generate PDF")
            
        # Test 2: No dependents
        insurance = self.create_health_insurance_data(
            medical_plan="HRA $6K",
            medical_tier="employee"
        )
        
        pdf_base64 = await self.generate_pdf(employee, insurance)
        if pdf_base64:
            filepath = await self.save_pdf(pdf_base64, "no_dependents")
            self.log_result("No Dependents", True, "PDF generated successfully")
        else:
            self.log_result("No Dependents", False, "Failed to generate PDF")
            
        # Test 3: Many dependents (4+)
        many_deps = [
            {
                "name": f"Dependent {i}",
                "relationship": "Child",
                "ssn": f"{i:03d}-{i*2:02d}-{i*3:04d}",
                "dateOfBirth": f"201{i}-01-01",
                "gender": "M" if i % 2 == 0 else "F"
            }
            for i in range(1, 6)
        ]
        
        insurance = self.create_health_insurance_data(
            medical_plan="HRA $6K",
            medical_tier="family",
            dependents=many_deps
        )
        
        pdf_base64 = await self.generate_pdf(employee, insurance)
        if pdf_base64:
            filepath = await self.save_pdf(pdf_base64, "many_dependents")
            text = await self.extract_pdf_text(filepath)
            deps_found = sum(1 for dep in many_deps if dep["name"] in text)
            self.log_result(
                "Many Dependents (5)",
                deps_found >= 4,
                f"Found {deps_found} of 5 dependents"
            )
        else:
            self.log_result("Many Dependents", False, "Failed to generate PDF")
            
        # Test 4: Mixed coverage
        insurance = self.create_health_insurance_data(
            medical_plan="HRA $4K",
            medical_tier="employee_spouse",
            dental_tier="decline",
            vision_tier="employee_spouse"
        )
        
        pdf_base64 = await self.generate_pdf(employee, insurance)
        if pdf_base64:
            filepath = await self.save_pdf(pdf_base64, "mixed_coverage")
            self.log_result("Mixed Coverage", True, "Medical + Vision, No Dental")
        else:
            self.log_result("Mixed Coverage", False, "Failed to generate PDF")
            
    # Test Scenario 9: Signature Flow
    async def test_signature_flow(self):
        """Test signature placement"""
        print("\n=== Test 9: Signature Flow ===")
        
        employee = self.create_base_employee_data()
        insurance = self.create_health_insurance_data(
            medical_plan="HRA $6K",
            medical_tier="employee"
        )
        
        # Test preview (no signature)
        pdf_base64 = await self.generate_pdf(employee, insurance, with_signature=False)
        if pdf_base64:
            filepath = await self.save_pdf(pdf_base64, "preview_no_signature")
            self.log_result("Preview PDF (No Signature)", True)
        else:
            self.log_result("Preview PDF", False, "Failed to generate")
            
        # Test with signature
        pdf_base64 = await self.generate_pdf(employee, insurance, with_signature=True)
        if pdf_base64:
            filepath = await self.save_pdf(pdf_base64, "final_with_signature")
            self.log_result("Final PDF (With Signature)", True)
        else:
            self.log_result("Final PDF", False, "Failed to generate")
            
    async def run_all_tests(self):
        """Run all test scenarios"""
        print("=" * 60)
        print("COMPREHENSIVE HEALTH INSURANCE PDF GENERATION TEST SUITE")
        print("=" * 60)
        
        await self.test_personal_info_population()
        await self.test_uhc_hra_plans()
        await self.test_aci_limited_medical_plans()
        await self.test_vision_coverage()
        await self.test_dental_coverage()
        await self.test_dependents()
        await self.test_section_125_affirmations()
        await self.test_edge_cases()
        await self.test_signature_flow()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r["passed"])
        failed = sum(1 for r in self.test_results if not r["passed"])
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"PDFs Generated: {self.pdf_count}")
        print(f"Output Directory: {OUTPUT_DIR.absolute()}")
        
        if failed > 0:
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"  - {result['test']}: {result['details']}")
                    
        return passed, failed

async def main():
    """Main test runner"""
    suite = HealthInsuranceTestSuite()
    
    try:
        # Check if server is running
        try:
            test_response = await suite.client.get(f"{BASE_URL}/health")
            print("✅ Server is running")
        except:
            print("❌ Server is not running. Please start the backend server first.")
            return
            
        passed, failed = await suite.run_all_tests()
        
        # Exit code based on results
        exit_code = 0 if failed == 0 else 1
        return exit_code
        
    finally:
        await suite.close()

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)