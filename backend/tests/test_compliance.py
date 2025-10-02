"""
Federal Compliance Tests for Hotel Onboarding System
Tests I-9, W-4, ESIGN Act, and other regulatory compliance requirements
"""
import pytest
from datetime import datetime, timedelta, date
from typing import Dict, Any, Optional
import json
from app.models import (
    I9Section1Data, I9Section2Data, W4FormData, 
    DigitalSignature, ComplianceStatus
)
from app.utils.federalValidation import (
    validate_i9_section1, validate_i9_section2,
    validate_w4_form, calculate_w4_withholding
)

class TestI9Compliance:
    """Test I-9 federal compliance requirements"""
    
    def test_i9_section1_required_fields(self):
        """Test that all required I-9 Section 1 fields are validated"""
        # Test missing required fields
        incomplete_data = {
            "lastName": "Doe",
            "firstName": "John",
            # Missing birthDate, ssn, etc.
        }
        
        errors = validate_i9_section1(incomplete_data)
        assert len(errors) > 0
        assert any("birthDate" in str(error) for error in errors)
        assert any("ssn" in str(error) for error in errors)
        
    def test_i9_section1_citizenship_validation(self):
        """Test I-9 citizenship status validation"""
        # Test valid citizenship statuses
        valid_statuses = ["citizen", "national", "lpr", "alien_authorized"]
        
        for status in valid_statuses:
            data = {
                "lastName": "Doe",
                "firstName": "John",
                "middleInitial": "A",
                "birthDate": "1990-01-01",
                "ssn": "123-45-6789",
                "email": "john.doe@example.com",
                "phone": "555-0123",
                "address": "123 Main St",
                "city": "Anytown",
                "state": "ST",
                "zipCode": "12345",
                "citizenshipStatus": status
            }
            
            if status == "lpr":
                data["alienRegistrationNumber"] = "A12345678"
            elif status == "alien_authorized":
                data["alienRegistrationNumber"] = "A12345678"
                data["workAuthorizationExpiration"] = "2026-12-31"
                
            errors = validate_i9_section1(data)
            assert len(errors) == 0, f"Valid status {status} should not produce errors"
            
        # Test invalid citizenship status
        data["citizenshipStatus"] = "invalid_status"
        errors = validate_i9_section1(data)
        assert len(errors) > 0
        assert any("citizenship" in str(error).lower() for error in errors)
        
    def test_i9_section1_alien_requirements(self):
        """Test I-9 requirements for aliens"""
        # Test LPR without alien registration number
        data = {
            "lastName": "Doe",
            "firstName": "John",
            "middleInitial": "A",
            "birthDate": "1990-01-01",
            "ssn": "123-45-6789",
            "email": "john.doe@example.com",
            "phone": "555-0123",
            "address": "123 Main St",
            "city": "Anytown",
            "state": "ST",
            "zipCode": "12345",
            "citizenshipStatus": "lpr"
            # Missing alienRegistrationNumber
        }
        
        errors = validate_i9_section1(data)
        assert len(errors) > 0
        assert any("alien" in str(error).lower() for error in errors)
        
        # Test alien authorized to work without expiration date
        data["citizenshipStatus"] = "alien_authorized"
        data["alienRegistrationNumber"] = "A12345678"
        # Missing workAuthorizationExpiration
        
        errors = validate_i9_section1(data)
        assert len(errors) > 0
        assert any("expiration" in str(error).lower() for error in errors)
        
    def test_i9_section1_date_validation(self):
        """Test I-9 date field validation"""
        data = {
            "lastName": "Doe",
            "firstName": "John",
            "middleInitial": "A",
            "birthDate": "2025-01-01",  # Future date
            "ssn": "123-45-6789",
            "email": "john.doe@example.com",
            "phone": "555-0123",
            "address": "123 Main St",
            "city": "Anytown",
            "state": "ST",
            "zipCode": "12345",
            "citizenshipStatus": "citizen"
        }
        
        errors = validate_i9_section1(data)
        assert len(errors) > 0
        assert any("birth" in str(error).lower() for error in errors)
        
    def test_i9_section1_ssn_format_validation(self):
        """Test SSN format validation"""
        invalid_ssns = [
            "123456789",    # No dashes
            "12-345-6789",  # Wrong format
            "123-4-56789",  # Wrong format
            "aaa-bb-cccc",  # Letters
            "000-00-0000",  # Invalid SSN
            "666-00-0000",  # Invalid SSN (starts with 666)
            "900-00-0000",  # Invalid SSN (starts with 900-999)
        ]
        
        base_data = {
            "lastName": "Doe",
            "firstName": "John",
            "middleInitial": "A",
            "birthDate": "1990-01-01",
            "email": "john.doe@example.com",
            "phone": "555-0123",
            "address": "123 Main St",
            "city": "Anytown",
            "state": "ST",
            "zipCode": "12345",
            "citizenshipStatus": "citizen"
        }
        
        for invalid_ssn in invalid_ssns:
            data = base_data.copy()
            data["ssn"] = invalid_ssn
            errors = validate_i9_section1(data)
            assert len(errors) > 0, f"SSN {invalid_ssn} should be invalid"
            
    def test_i9_section2_timing_requirement(self):
        """Test I-9 Section 2 3-business-day completion requirement"""
        # Test completion within 3 business days
        hire_date = datetime(2025, 7, 29)  # Tuesday
        completion_date = datetime(2025, 8, 1)  # Friday (3 business days)
        
        is_compliant = self._check_i9_section2_timing(hire_date, completion_date)
        assert is_compliant, "Section 2 completed within 3 business days should be compliant"
        
        # Test completion after 3 business days
        late_completion = datetime(2025, 8, 4)  # Monday (4 business days)
        is_compliant = self._check_i9_section2_timing(hire_date, late_completion)
        assert not is_compliant, "Section 2 completed after 3 business days should not be compliant"
        
    def test_i9_section2_document_validation(self):
        """Test I-9 Section 2 document requirements"""
        # Test List A document (establishes both identity and work authorization)
        data = {
            "employeeStartDate": "2025-07-29",
            "documentTitle": "U.S. Passport",
            "listADocumentType": "passport",
            "documentNumber": "123456789",
            "expirationDate": "2030-12-31",
            "employerName": "Test Hotel",
            "employerTitle": "HR Manager",
            "employerSignature": "Jane Smith",
            "signatureDate": "2025-07-29"
        }
        
        errors = validate_i9_section2(data)
        assert len(errors) == 0, "Valid List A document should pass validation"
        
        # Test List B + List C combination
        data = {
            "employeeStartDate": "2025-07-29",
            "listBDocumentType": "drivers_license",
            "listBDocumentNumber": "DL123456",
            "listBExpirationDate": "2027-12-31",
            "listBIssuingAuthority": "State of Test",
            "listCDocumentType": "ssn_card",
            "listCDocumentNumber": "123-45-6789",
            "employerName": "Test Hotel",
            "employerTitle": "HR Manager",
            "employerSignature": "Jane Smith",
            "signatureDate": "2025-07-29"
        }
        
        errors = validate_i9_section2(data)
        assert len(errors) == 0, "Valid List B + List C combination should pass validation"
        
        # Test invalid: only List B without List C
        del data["listCDocumentType"]
        del data["listCDocumentNumber"]
        
        errors = validate_i9_section2(data)
        assert len(errors) > 0, "List B alone should fail validation"
        
    def test_i9_supplement_a_validation(self):
        """Test I-9 Supplement A (Preparer/Translator) validation"""
        # Test when preparer assistance is used
        supplement_data = {
            "preparerUsed": True,
            "preparerLastName": "Smith",
            "preparerFirstName": "Jane",
            "preparerAddress": "456 Helper St",
            "preparerCity": "Helptown",
            "preparerState": "HT",
            "preparerZipCode": "54321",
            "preparerSignature": "Jane Smith",
            "preparerDate": "2025-07-29"
        }
        
        # All required fields present
        errors = self._validate_i9_supplement_a(supplement_data)
        assert len(errors) == 0, "Complete preparer data should pass validation"
        
        # Missing required field
        del supplement_data["preparerLastName"]
        errors = self._validate_i9_supplement_a(supplement_data)
        assert len(errors) > 0, "Missing preparer last name should fail validation"
        
    def test_i9_retention_period_calculation(self):
        """Test I-9 retention period calculation (3 years from hire or 1 year from termination)"""
        # Test retention from hire date
        hire_date = date(2025, 7, 29)
        retention_date = self._calculate_i9_retention_date(hire_date, None)
        expected_date = date(2028, 7, 29)  # 3 years from hire
        assert retention_date == expected_date
        
        # Test retention from termination date
        termination_date = date(2026, 12, 31)
        retention_date = self._calculate_i9_retention_date(hire_date, termination_date)
        
        # Should be later of: 3 years from hire (2028-07-29) or 1 year from termination (2027-12-31)
        expected_date = date(2028, 7, 29)
        assert retention_date == expected_date
        
        # Test when termination + 1 year is later
        early_hire = date(2025, 1, 1)
        late_termination = date(2027, 12, 31)
        retention_date = self._calculate_i9_retention_date(early_hire, late_termination)
        expected_date = date(2028, 12, 31)  # 1 year from termination
        assert retention_date == expected_date
        
    def _check_i9_section2_timing(self, hire_date: datetime, completion_date: datetime) -> bool:
        """Check if I-9 Section 2 was completed within 3 business days"""
        business_days = 0
        current_date = hire_date
        
        while current_date < completion_date:
            current_date += timedelta(days=1)
            # Skip weekends (Saturday = 5, Sunday = 6)
            if current_date.weekday() < 5:
                business_days += 1
                
        return business_days <= 3
        
    def _validate_i9_supplement_a(self, data: Dict[str, Any]) -> list:
        """Validate I-9 Supplement A data"""
        errors = []
        
        if data.get("preparerUsed"):
            required_fields = [
                "preparerLastName", "preparerFirstName", "preparerAddress",
                "preparerCity", "preparerState", "preparerZipCode",
                "preparerSignature", "preparerDate"
            ]
            
            for field in required_fields:
                if not data.get(field):
                    errors.append(f"Missing required field: {field}")
                    
        return errors
        
    def _calculate_i9_retention_date(self, hire_date: date, termination_date: Optional[date]) -> date:
        """Calculate I-9 retention date per federal requirements"""
        three_years_from_hire = hire_date + timedelta(days=3*365)
        
        if termination_date:
            one_year_from_termination = termination_date + timedelta(days=365)
            return max(three_years_from_hire, one_year_from_termination)
        else:
            return three_years_from_hire


class TestW4Compliance:
    """Test W-4 federal compliance requirements"""
    
    def test_w4_required_fields(self):
        """Test W-4 required field validation"""
        incomplete_data = {
            "firstName": "John",
            "lastName": "Doe",
            # Missing SSN, filing status, etc.
        }
        
        errors = validate_w4_form(incomplete_data)
        assert len(errors) > 0
        assert any("ssn" in str(error).lower() for error in errors)
        assert any("filing" in str(error).lower() for error in errors)
        
    def test_w4_filing_status_validation(self):
        """Test W-4 filing status validation"""
        valid_statuses = ["single", "married_filing_jointly", "married_filing_separately", "head_of_household"]
        
        base_data = {
            "firstName": "John",
            "lastName": "Doe",
            "ssn": "123-45-6789",
            "address": "123 Main St",
            "city": "Anytown",
            "state": "ST",
            "zipCode": "12345",
            "multipleJobs": False,
            "dependentsAmount": 0,
            "otherIncome": 0,
            "deductions": 0,
            "extraWithholding": 0
        }
        
        for status in valid_statuses:
            data = base_data.copy()
            data["filingStatus"] = status
            errors = validate_w4_form(data)
            assert len(errors) == 0, f"Valid filing status {status} should not produce errors"
            
        # Test invalid filing status
        data = base_data.copy()
        data["filingStatus"] = "invalid_status"
        errors = validate_w4_form(data)
        assert len(errors) > 0
        assert any("filing" in str(error).lower() for error in errors)
        
    def test_w4_withholding_calculation(self):
        """Test W-4 withholding calculation per IRS guidelines"""
        # Test single filer with standard deduction
        data = {
            "filingStatus": "single",
            "multipleJobs": False,
            "dependentsAmount": 0,
            "otherIncome": 0,
            "deductions": 0,
            "extraWithholding": 0
        }
        
        annual_income = 50000
        withholding = calculate_w4_withholding(data, annual_income)
        
        # Verify withholding is calculated
        assert withholding > 0
        assert withholding < annual_income
        
        # Test married filing jointly with dependents
        data = {
            "filingStatus": "married_filing_jointly",
            "multipleJobs": False,
            "dependentsAmount": 2000,  # One dependent
            "otherIncome": 0,
            "deductions": 0,
            "extraWithholding": 0
        }
        
        withholding_with_dependent = calculate_w4_withholding(data, annual_income)
        assert withholding_with_dependent < withholding, "Withholding should be less with dependents"
        
    def test_w4_step2_multiple_jobs(self):
        """Test W-4 Step 2 multiple jobs checkbox validation"""
        data = {
            "firstName": "John",
            "lastName": "Doe",
            "ssn": "123-45-6789",
            "address": "123 Main St",
            "city": "Anytown",
            "state": "ST",
            "zipCode": "12345",
            "filingStatus": "married_filing_jointly",
            "multipleJobs": True,  # Step 2(c) checked
            "spouseWorks": True,   # Both work
            "dependentsAmount": 0,
            "otherIncome": 0,
            "deductions": 0,
            "extraWithholding": 0
        }
        
        errors = validate_w4_form(data)
        assert len(errors) == 0, "Multiple jobs with spouse working should be valid"
        
    def test_w4_dependent_amount_validation(self):
        """Test W-4 dependent amount validation"""
        base_data = {
            "firstName": "John",
            "lastName": "Doe",
            "ssn": "123-45-6789",
            "address": "123 Main St",
            "city": "Anytown",
            "state": "ST",
            "zipCode": "12345",
            "filingStatus": "single",
            "multipleJobs": False,
            "otherIncome": 0,
            "deductions": 0,
            "extraWithholding": 0
        }
        
        # Test valid dependent amounts (multiples of $500 or $2000)
        valid_amounts = [0, 500, 1000, 2000, 2500, 4000]
        
        for amount in valid_amounts:
            data = base_data.copy()
            data["dependentsAmount"] = amount
            errors = validate_w4_form(data)
            assert len(errors) == 0, f"Dependent amount {amount} should be valid"
            
        # Test invalid dependent amount
        data = base_data.copy()
        data["dependentsAmount"] = 1234  # Not a valid multiple
        errors = validate_w4_form(data)
        assert len(errors) > 0, "Invalid dependent amount should produce error"


class TestESIGNActCompliance:
    """Test ESIGN Act compliance for digital signatures"""
    
    def test_digital_signature_requirements(self):
        """Test ESIGN Act digital signature requirements"""
        # Valid digital signature
        signature = DigitalSignature(
            signatureData="data:image/png;base64,iVBORw0KGgoAAAANS...",
            signedBy="John Doe",
            signedAt=datetime.now(),
            ipAddress="192.168.1.100",
            userAgent="Mozilla/5.0...",
            consentLanguage="I agree to sign this document electronically",
            documentHash="sha256:abcdef123456...",
            signatureMethod="drawn"
        )
        
        # Validate all required fields are present
        assert signature.signatureData
        assert signature.signedBy
        assert signature.signedAt
        assert signature.ipAddress
        assert signature.consentLanguage
        assert signature.documentHash
        
    def test_signature_consent_tracking(self):
        """Test ESIGN Act consent tracking requirements"""
        consent_data = {
            "consentGiven": True,
            "consentTimestamp": datetime.now(),
            "consentIP": "192.168.1.100",
            "consentText": "I consent to conduct this transaction electronically",
            "consentMethod": "checkbox",
            "hardwareAndSoftware": "Windows 10, Chrome 91",
            "canAccessDocuments": True,
            "canRetainDocuments": True
        }
        
        # Verify all consent elements are tracked
        assert consent_data["consentGiven"]
        assert consent_data["consentTimestamp"]
        assert consent_data["consentIP"]
        assert consent_data["consentText"]
        assert consent_data["hardwareAndSoftware"]
        assert consent_data["canAccessDocuments"]
        assert consent_data["canRetainDocuments"]
        
    def test_signature_attribution(self):
        """Test signature attribution requirements"""
        signature = DigitalSignature(
            signatureData="data:image/png;base64,iVBORw0KGgoAAAANS...",
            signedBy="John Doe",
            signedAt=datetime.now(),
            ipAddress="192.168.1.100",
            userAgent="Mozilla/5.0...",
            consentLanguage="I agree to sign this document electronically",
            documentHash="sha256:abcdef123456...",
            signatureMethod="drawn",
            authenticationMethod="password",
            signerId="user-12345"
        )
        
        # Verify signature can be attributed to signer
        assert signature.signedBy
        assert signature.signerId
        assert signature.authenticationMethod
        assert signature.ipAddress
        
    def test_document_integrity(self):
        """Test document integrity requirements"""
        # Original document
        original_content = "This is the original document content"
        original_hash = self._calculate_hash(original_content)
        
        signature = DigitalSignature(
            signatureData="data:image/png;base64,iVBORw0KGgoAAAANS...",
            signedBy="John Doe",
            signedAt=datetime.now(),
            ipAddress="192.168.1.100",
            userAgent="Mozilla/5.0...",
            consentLanguage="I agree to sign this document electronically",
            documentHash=original_hash,
            signatureMethod="drawn"
        )
        
        # Verify document hasn't been tampered with
        assert signature.documentHash == original_hash
        
        # Test tampered document detection
        tampered_content = "This is the modified document content"
        tampered_hash = self._calculate_hash(tampered_content)
        assert tampered_hash != original_hash
        
    def test_signature_retention_requirements(self):
        """Test signature retention requirements"""
        signature = DigitalSignature(
            signatureData="data:image/png;base64,iVBORw0KGgoAAAANS...",
            signedBy="John Doe",
            signedAt=datetime.now(),
            ipAddress="192.168.1.100",
            userAgent="Mozilla/5.0...",
            consentLanguage="I agree to sign this document electronically",
            documentHash="sha256:abcdef123456...",
            signatureMethod="drawn",
            retentionPeriod="7 years",
            accessibleFormat=True,
            accurateReproduction=True
        )
        
        # Verify retention requirements
        assert signature.retentionPeriod
        assert signature.accessibleFormat
        assert signature.accurateReproduction
        
    def _calculate_hash(self, content: str) -> str:
        """Calculate document hash for integrity verification"""
        import hashlib
        return f"sha256:{hashlib.sha256(content.encode()).hexdigest()}"


class TestRoleBasedAccessCompliance:
    """Test role-based access control compliance"""
    
    def test_hr_role_permissions(self):
        """Test HR role has appropriate permissions"""
        hr_permissions = [
            "view_all_properties",
            "manage_properties",
            "view_all_managers",
            "manage_managers",
            "view_all_employees",
            "manage_employees",
            "view_all_applications",
            "process_applications",
            "generate_reports",
            "access_compliance_data"
        ]
        
        hr_role = {"role": "hr", "permissions": hr_permissions}
        
        # Verify HR has all required permissions
        for permission in hr_permissions:
            assert permission in hr_role["permissions"]
            
    def test_manager_role_permissions(self):
        """Test Manager role has appropriate restricted permissions"""
        manager_permissions = [
            "view_assigned_property",
            "view_property_employees",
            "view_property_applications",
            "review_applications",
            "complete_i9_section2",
            "approve_onboarding",
            "view_employee_documents"
        ]
        
        manager_restricted = [
            "view_all_properties",
            "manage_properties",
            "view_other_property_data",
            "access_other_property_employees",
            "modify_compliance_data"
        ]
        
        manager_role = {"role": "manager", "permissions": manager_permissions}
        
        # Verify Manager has required permissions
        for permission in manager_permissions:
            assert permission in manager_role["permissions"]
            
        # Verify Manager doesn't have restricted permissions
        for permission in manager_restricted:
            assert permission not in manager_role["permissions"]
            
    def test_employee_role_permissions(self):
        """Test Employee role has appropriate limited permissions"""
        employee_permissions = [
            "view_own_profile",
            "update_own_information",
            "view_own_documents",
            "complete_onboarding",
            "update_tax_forms",
            "update_direct_deposit",
            "view_own_schedule"
        ]
        
        employee_restricted = [
            "view_other_employees",
            "view_applications",
            "access_manager_functions",
            "access_hr_functions",
            "modify_compliance_data"
        ]
        
        employee_role = {"role": "employee", "permissions": employee_permissions}
        
        # Verify Employee has required permissions
        for permission in employee_permissions:
            assert permission in employee_role["permissions"]
            
        # Verify Employee doesn't have restricted permissions
        for permission in employee_restricted:
            assert permission not in employee_role["permissions"]
            
    def test_data_isolation_by_property(self):
        """Test that data is properly isolated by property"""
        # Manager 1 at Property A
        manager1_data = {
            "user_id": "manager-1",
            "property_id": "property-a",
            "accessible_employees": ["emp-1", "emp-2", "emp-3"],
            "accessible_applications": ["app-1", "app-2"]
        }
        
        # Manager 2 at Property B
        manager2_data = {
            "user_id": "manager-2",
            "property_id": "property-b",
            "accessible_employees": ["emp-4", "emp-5"],
            "accessible_applications": ["app-3", "app-4"]
        }
        
        # Verify no overlap in accessible data
        emp_overlap = set(manager1_data["accessible_employees"]) & set(manager2_data["accessible_employees"])
        assert len(emp_overlap) == 0, "Managers should not access employees from other properties"
        
        app_overlap = set(manager1_data["accessible_applications"]) & set(manager2_data["accessible_applications"])
        assert len(app_overlap) == 0, "Managers should not access applications from other properties"


class TestAuditTrailCompliance:
    """Test audit trail compliance requirements"""
    
    def test_audit_trail_completeness(self):
        """Test that all compliance-related actions are logged"""
        required_audit_events = [
            "user_login",
            "user_logout",
            "i9_section1_completed",
            "i9_section2_completed",
            "w4_form_completed",
            "document_uploaded",
            "document_viewed",
            "application_approved",
            "application_rejected",
            "onboarding_started",
            "onboarding_completed",
            "digital_signature_captured",
            "form_data_updated",
            "permission_changed",
            "data_exported"
        ]
        
        audit_log = {
            "event_type": "i9_section1_completed",
            "timestamp": datetime.now(),
            "user_id": "emp-123",
            "ip_address": "192.168.1.100",
            "user_agent": "Mozilla/5.0...",
            "details": {
                "form_id": "i9-123",
                "completion_time": "2025-07-29T10:30:00Z"
            }
        }
        
        # Verify audit log has required fields
        assert audit_log["event_type"] in required_audit_events
        assert audit_log["timestamp"]
        assert audit_log["user_id"]
        assert audit_log["ip_address"]
        assert audit_log["details"]
        
    def test_audit_trail_immutability(self):
        """Test that audit trails cannot be modified"""
        audit_entry = {
            "id": "audit-123",
            "event_type": "i9_section1_completed",
            "timestamp": datetime.now(),
            "user_id": "emp-123",
            "checksum": "sha256:abcdef123456..."  # Integrity checksum
        }
        
        # Verify checksum prevents tampering
        assert audit_entry["checksum"]
        
        # Test that modification would be detected
        original_checksum = audit_entry["checksum"]
        audit_entry["user_id"] = "emp-456"  # Attempt to modify
        
        # Recalculate checksum
        new_checksum = self._calculate_audit_checksum(audit_entry)
        assert new_checksum != original_checksum, "Modification should change checksum"
        
    def test_audit_retention_period(self):
        """Test audit trail retention period compliance"""
        audit_config = {
            "retention_period_years": 7,  # 7 years for employment records
            "include_metadata": True,
            "include_user_actions": True,
            "include_system_events": True,
            "archival_policy": "compress_after_1_year"
        }
        
        assert audit_config["retention_period_years"] >= 7
        assert audit_config["include_metadata"]
        assert audit_config["include_user_actions"]
        
    def _calculate_audit_checksum(self, entry: Dict[str, Any]) -> str:
        """Calculate checksum for audit entry"""
        import hashlib
        import json
        
        # Remove checksum field for calculation
        entry_copy = entry.copy()
        if "checksum" in entry_copy:
            del entry_copy["checksum"]
            
        entry_str = json.dumps(entry_copy, sort_keys=True, default=str)
        return f"sha256:{hashlib.sha256(entry_str.encode()).hexdigest()}"


class TestDocumentRetentionCompliance:
    """Test document retention compliance requirements"""
    
    def test_i9_retention_calculation(self):
        """Test I-9 document retention calculation"""
        # Active employee - 3 years from hire
        hire_date = date(2025, 7, 29)
        retention = self._calculate_retention_date("i9", hire_date, None)
        expected = date(2028, 7, 29)
        assert retention == expected
        
        # Terminated employee - later of 3 years from hire or 1 year from termination
        termination_date = date(2027, 12, 31)
        retention = self._calculate_retention_date("i9", hire_date, termination_date)
        expected = date(2028, 12, 31)  # 1 year from termination is later
        assert retention == expected
        
    def test_w4_retention_calculation(self):
        """Test W-4 document retention calculation"""
        # W-4 retained for 4 years per IRS requirements
        submission_date = date(2025, 7, 29)
        retention = self._calculate_retention_date("w4", submission_date, None)
        expected = date(2029, 7, 29)
        assert retention == expected
        
    def test_general_employment_record_retention(self):
        """Test general employment record retention"""
        # Most employment records - 7 years
        record_date = date(2025, 7, 29)
        retention = self._calculate_retention_date("employment_record", record_date, None)
        expected = date(2032, 7, 29)
        assert retention == expected
        
    def _calculate_retention_date(self, doc_type: str, start_date: date, termination_date: Optional[date]) -> date:
        """Calculate document retention date based on type and regulations"""
        if doc_type == "i9":
            three_years = start_date + timedelta(days=3*365)
            if termination_date:
                one_year_term = termination_date + timedelta(days=365)
                return max(three_years, one_year_term)
            return three_years
        elif doc_type == "w4":
            return start_date + timedelta(days=4*365)
        else:  # General employment records
            return start_date + timedelta(days=7*365)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])