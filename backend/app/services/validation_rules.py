"""
Validation Rules Engine
Defines and enforces validation rules for each onboarding step
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, date, timedelta
from app.federal_validation import FederalValidator

logger = logging.getLogger(__name__)

class ValidationRulesEngine:
    """
    Central validation engine for all onboarding steps
    """
    
    def __init__(self):
        self.federal_validator = FederalValidator()
        self.validation_cache = {}
        
    async def validate_step(
        self,
        step_id: str,
        data: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate data for a specific step
        Returns: (is_valid, errors, warnings)
        """
        validators = {
            "personal-info": self._validate_personal_info,
            "emergency-contact": self._validate_emergency_contact,
            "i9-section1": self._validate_i9_section1,
            "document-upload": self._validate_document_upload,
            "w4-info": self._validate_w4_info,
            "direct-deposit": self._validate_direct_deposit,
            "health-insurance": self._validate_health_insurance,
            "handbook-acknowledgment": self._validate_handbook_acknowledgment,
            "policies-review": self._validate_policies_review,
            "human-trafficking": self._validate_human_trafficking,
            "weapons-policy": self._validate_weapons_policy
        }
        
        if step_id not in validators:
            return False, [f"Unknown step: {step_id}"], []
        
        try:
            return await validators[step_id](data, context)
        except Exception as e:
            logger.error(f"Validation error for step {step_id}: {str(e)}")
            return False, [f"Validation error: {str(e)}"], []
    
    async def _validate_personal_info(
        self,
        data: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate personal information step
        """
        errors = []
        warnings = []
        
        # Required fields
        required_fields = [
            "firstName", "lastName", "email", "phone",
            "dateOfBirth", "ssn", "address"
        ]
        
        for field in required_fields:
            if not data.get(field):
                errors.append(f"Missing required field: {field}")
        
        # Email validation
        if data.get("email"):
            if not self._is_valid_email(data["email"]):
                errors.append("Invalid email format")
        
        # Phone validation
        if data.get("phone"):
            if not self._is_valid_phone(data["phone"]):
                errors.append("Invalid phone number format")
        
        # SSN validation
        if data.get("ssn"):
            if not self._is_valid_ssn(data["ssn"]):
                errors.append("Invalid SSN format (should be XXX-XX-XXXX or XXXXXXXXX)")
        
        # Date of birth validation
        if data.get("dateOfBirth"):
            dob_valid, dob_error = self._validate_date_of_birth(data["dateOfBirth"])
            if not dob_valid:
                errors.append(dob_error)
        
        # Address validation
        if data.get("address"):
            addr_errors = self._validate_address(data["address"])
            errors.extend(addr_errors)
        
        # Name validation
        if data.get("firstName"):
            if len(data["firstName"]) < 1 or len(data["firstName"]) > 50:
                errors.append("First name must be between 1 and 50 characters")
            if not re.match(r"^[a-zA-Z\s\-']+$", data["firstName"]):
                warnings.append("First name contains special characters")
        
        if data.get("lastName"):
            if len(data["lastName"]) < 1 or len(data["lastName"]) > 50:
                errors.append("Last name must be between 1 and 50 characters")
            if not re.match(r"^[a-zA-Z\s\-']+$", data["lastName"]):
                warnings.append("Last name contains special characters")
        
        return len(errors) == 0, errors, warnings
    
    async def _validate_emergency_contact(
        self,
        data: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate emergency contact information
        """
        errors = []
        warnings = []
        
        # Required fields
        required_fields = ["contactName", "contactPhone", "relationship"]
        
        for field in required_fields:
            if not data.get(field):
                errors.append(f"Missing required field: {field}")
        
        # Phone validation
        if data.get("contactPhone"):
            if not self._is_valid_phone(data["contactPhone"]):
                errors.append("Invalid emergency contact phone number")
        
        # Relationship validation
        valid_relationships = [
            "spouse", "parent", "child", "sibling", "friend",
            "partner", "relative", "other"
        ]
        if data.get("relationship"):
            if data["relationship"].lower() not in valid_relationships:
                warnings.append(f"Unusual relationship type: {data['relationship']}")
        
        # Name validation
        if data.get("contactName"):
            if len(data["contactName"]) < 2 or len(data["contactName"]) > 100:
                errors.append("Contact name must be between 2 and 100 characters")
        
        # Check if emergency contact is same as employee
        if context and context.get("employee_phone"):
            if data.get("contactPhone") == context["employee_phone"]:
                warnings.append("Emergency contact phone is same as employee phone")
        
        return len(errors) == 0, errors, warnings
    
    async def _validate_i9_section1(
        self,
        data: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate I-9 Section 1 with federal compliance
        """
        errors = []
        warnings = []
        
        # Use federal validator for I-9 compliance
        validation_result = await self.federal_validator.validate_i9_section1(data)
        
        if not validation_result["valid"]:
            errors.extend(validation_result.get("errors", []))
        
        warnings.extend(validation_result.get("warnings", []))
        
        # Additional business rules
        if data.get("citizenshipStatus"):
            status = data["citizenshipStatus"]
            
            # Check for required additional fields based on status
            if status == "authorized_alien":
                if not data.get("alienRegistrationNumber") and not data.get("uscisNumber"):
                    errors.append("Alien Registration Number or USCIS Number required for authorized aliens")
                if not data.get("workAuthorizationExpiration"):
                    errors.append("Work authorization expiration date required")
            
            elif status == "permanent_resident":
                if not data.get("alienRegistrationNumber") and not data.get("uscisNumber"):
                    errors.append("Alien Registration Number or USCIS Number required for permanent residents")
        
        # Check signature requirements
        if not data.get("signature") and not data.get("signatureData"):
            errors.append("Employee signature is required for I-9 Section 1")
        
        if not data.get("signatureDate"):
            errors.append("Signature date is required")
        elif context and context.get("start_date"):
            # Ensure signed on or before first day of work
            sig_date = datetime.fromisoformat(data["signatureDate"].replace('Z', '+00:00'))
            start_date = datetime.fromisoformat(context["start_date"].replace('Z', '+00:00'))
            if sig_date > start_date:
                errors.append("I-9 Section 1 must be completed on or before first day of work")
        
        return len(errors) == 0, errors, warnings
    
    async def _validate_document_upload(
        self,
        data: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate document upload for I-9 verification
        """
        errors = []
        warnings = []
        
        # Check document type selection
        if not data.get("documentType"):
            errors.append("Document type must be specified")
            return False, errors, warnings
        
        doc_type = data["documentType"]
        
        # Validate based on document list selection
        if doc_type == "list_a":
            # List A documents establish both identity and work authorization
            if not data.get("documentFiles") or len(data["documentFiles"]) == 0:
                errors.append("List A document file is required")
            
            valid_list_a = [
                "us_passport", "passport_card", "permanent_resident_card",
                "foreign_passport_with_i551", "employment_authorization_document"
            ]
            
            if data.get("documentSubType") and data["documentSubType"] not in valid_list_a:
                warnings.append(f"Unusual List A document type: {data['documentSubType']}")
        
        elif doc_type == "list_b_and_c":
            # Need one from List B (identity) and one from List C (work authorization)
            if not data.get("listBDocument"):
                errors.append("List B document (identity) is required")
            if not data.get("listCDocument"):
                errors.append("List C document (work authorization) is required")
            
            # Check for document files
            if not data.get("documentFiles") or len(data["documentFiles"]) < 2:
                errors.append("Both List B and List C document files are required")
        
        else:
            errors.append(f"Invalid document type: {doc_type}")
        
        # Validate file sizes and types
        if data.get("documentFiles"):
            for file_info in data["documentFiles"]:
                if file_info.get("size", 0) > 10 * 1024 * 1024:  # 10MB limit
                    errors.append(f"File {file_info.get('name', 'unknown')} exceeds 10MB limit")
                
                allowed_types = [".pdf", ".jpg", ".jpeg", ".png", ".gif"]
                file_ext = file_info.get("name", "").lower().split(".")[-1]
                if f".{file_ext}" not in allowed_types:
                    errors.append(f"Invalid file type: {file_ext}. Allowed: {', '.join(allowed_types)}")
        
        # Check expiration dates if provided
        if data.get("documentExpiration"):
            exp_date = datetime.fromisoformat(data["documentExpiration"].replace('Z', '+00:00'))
            if exp_date < datetime.now(exp_date.tzinfo):
                errors.append("Document has expired")
            elif (exp_date - datetime.now(exp_date.tzinfo)).days < 30:
                warnings.append("Document expires within 30 days")
        
        return len(errors) == 0, errors, warnings
    
    async def _validate_w4_info(
        self,
        data: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate W-4 tax information with IRS rules
        """
        errors = []
        warnings = []
        
        # Use federal validator for W-4 compliance
        validation_result = await self.federal_validator.validate_w4(data)
        
        if not validation_result["valid"]:
            errors.extend(validation_result.get("errors", []))
        
        warnings.extend(validation_result.get("warnings", []))
        
        # Additional validation
        required_fields = ["filingStatus"]
        
        for field in required_fields:
            if not data.get(field):
                errors.append(f"Missing required field: {field}")
        
        # Validate filing status
        valid_statuses = [
            "single", "married_filing_jointly", "married_filing_separately",
            "head_of_household"
        ]
        
        if data.get("filingStatus") and data["filingStatus"] not in valid_statuses:
            errors.append(f"Invalid filing status: {data['filingStatus']}")
        
        # Validate numeric fields
        numeric_fields = [
            "dependents", "otherIncome", "deductions", "extraWithholding"
        ]
        
        for field in numeric_fields:
            if field in data and data[field] is not None:
                try:
                    value = float(data[field])
                    if value < 0:
                        errors.append(f"{field} cannot be negative")
                except (ValueError, TypeError):
                    errors.append(f"{field} must be a valid number")
        
        # Check for unusually high values
        if data.get("extraWithholding"):
            try:
                extra = float(data["extraWithholding"])
                if extra > 1000:
                    warnings.append(f"Unusually high extra withholding: ${extra}")
            except:
                pass
        
        return len(errors) == 0, errors, warnings
    
    async def _validate_direct_deposit(
        self,
        data: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate direct deposit information
        """
        errors = []
        warnings = []
        
        # This step can be skipped
        if not data or data.get("skip_direct_deposit"):
            return True, [], ["Direct deposit skipped - paper checks will be issued"]
        
        # Required fields if not skipping
        required_fields = [
            "bankName", "accountNumber", "routingNumber", "accountType"
        ]
        
        for field in required_fields:
            if not data.get(field):
                errors.append(f"Missing required field: {field}")
        
        # Validate routing number
        if data.get("routingNumber"):
            if not self._validate_routing_number(data["routingNumber"]):
                errors.append("Invalid routing number")
        
        # Validate account number
        if data.get("accountNumber"):
            account = data["accountNumber"]
            if not re.match(r"^\d{4,17}$", account):
                errors.append("Account number must be 4-17 digits")
        
        # Validate account type
        if data.get("accountType"):
            valid_types = ["checking", "savings"]
            if data["accountType"].lower() not in valid_types:
                errors.append(f"Invalid account type. Must be: {', '.join(valid_types)}")
        
        # Bank name validation
        if data.get("bankName"):
            if len(data["bankName"]) < 2 or len(data["bankName"]) > 100:
                errors.append("Bank name must be between 2 and 100 characters")
        
        # Check for test/demo account numbers
        if data.get("accountNumber"):
            test_patterns = ["1234567890", "0000000000", "1111111111"]
            if data["accountNumber"] in test_patterns:
                warnings.append("Account number appears to be a test value")
        
        return len(errors) == 0, errors, warnings
    
    async def _validate_health_insurance(
        self,
        data: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate health insurance selection
        """
        errors = []
        warnings = []
        
        # This step can be skipped
        if not data or data.get("decline_coverage"):
            return True, [], ["Health insurance coverage declined"]
        
        # If enrolling, validate required fields
        if data.get("enroll"):
            required_fields = ["coverage_level", "plan_type"]
            
            for field in required_fields:
                if not data.get(field):
                    errors.append(f"Missing required field: {field}")
            
            # Validate coverage level
            valid_levels = ["employee", "employee_spouse", "employee_children", "family"]
            if data.get("coverage_level") and data["coverage_level"] not in valid_levels:
                errors.append(f"Invalid coverage level: {data['coverage_level']}")
            
            # Validate plan type
            valid_plans = ["basic", "standard", "premium"]
            if data.get("plan_type") and data["plan_type"] not in valid_plans:
                errors.append(f"Invalid plan type: {data['plan_type']}")
            
            # Validate dependent information if family coverage
            if data.get("coverage_level") in ["employee_spouse", "employee_children", "family"]:
                if not data.get("dependents") or len(data["dependents"]) == 0:
                    errors.append("Dependent information required for selected coverage level")
                
                # Validate each dependent
                for i, dep in enumerate(data.get("dependents", [])):
                    if not dep.get("name"):
                        errors.append(f"Dependent {i+1}: Name is required")
                    if not dep.get("relationship"):
                        errors.append(f"Dependent {i+1}: Relationship is required")
                    if not dep.get("dateOfBirth"):
                        errors.append(f"Dependent {i+1}: Date of birth is required")
                    elif dep.get("dateOfBirth"):
                        dob_valid, dob_error = self._validate_date_of_birth(dep["dateOfBirth"])
                        if not dob_valid:
                            errors.append(f"Dependent {i+1}: {dob_error}")
        
        return len(errors) == 0, errors, warnings
    
    async def _validate_handbook_acknowledgment(
        self,
        data: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate handbook acknowledgment
        """
        errors = []
        warnings = []
        
        # Required fields
        if not data.get("acknowledged"):
            errors.append("Handbook acknowledgment is required")
        
        if not data.get("signature") and not data.get("signatureData"):
            errors.append("Signature is required for handbook acknowledgment")
        
        if not data.get("signatureDate"):
            errors.append("Signature date is required")
        
        # Check if actually viewed the handbook
        if data.get("timeSpentReading"):
            try:
                time_spent = int(data["timeSpentReading"])
                if time_spent < 30:  # Less than 30 seconds
                    warnings.append("Handbook may not have been thoroughly reviewed (less than 30 seconds)")
            except:
                pass
        
        return len(errors) == 0, errors, warnings
    
    async def _validate_policies_review(
        self,
        data: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate company policies review
        """
        errors = []
        warnings = []
        
        # Required acknowledgments
        required_policies = [
            "code_of_conduct",
            "anti_harassment",
            "confidentiality",
            "safety_procedures"
        ]
        
        for policy in required_policies:
            if not data.get(f"{policy}_acknowledged"):
                errors.append(f"Must acknowledge {policy.replace('_', ' ').title()}")
        
        if not data.get("signature") and not data.get("signatureData"):
            errors.append("Signature is required for policy acknowledgment")
        
        if not data.get("signatureDate"):
            errors.append("Signature date is required")
        
        return len(errors) == 0, errors, warnings
    
    async def _validate_human_trafficking(
        self,
        data: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate human trafficking awareness training (California requirement)
        """
        errors = []
        warnings = []
        
        # Required for California properties
        if context and context.get("property_state") == "CA":
            if not data.get("training_completed"):
                errors.append("Human trafficking awareness training is required in California")
            
            if not data.get("signature") and not data.get("signatureData"):
                errors.append("Signature is required for training completion")
            
            if not data.get("signatureDate"):
                errors.append("Signature date is required")
            
            # Check training completion time
            if data.get("trainingDuration"):
                try:
                    duration = int(data["trainingDuration"])
                    if duration < 300:  # Less than 5 minutes
                        warnings.append("Training may not have been completed thoroughly (less than 5 minutes)")
                except:
                    pass
        
        return len(errors) == 0, errors, warnings
    
    async def _validate_weapons_policy(
        self,
        data: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate weapons policy acknowledgment
        """
        errors = []
        warnings = []
        
        # Required fields
        if not data.get("policy_acknowledged"):
            errors.append("Weapons policy acknowledgment is required")
        
        if not data.get("signature") and not data.get("signatureData"):
            errors.append("Signature is required for weapons policy")
        
        if not data.get("signatureDate"):
            errors.append("Signature date is required")
        
        # Check if user has any weapons permits (informational only)
        if data.get("has_concealed_carry"):
            warnings.append("Employee has concealed carry permit - policy still applies on property")
        
        return len(errors) == 0, errors, warnings
    
    # Helper validation methods
    def _is_valid_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def _is_valid_phone(self, phone: str) -> bool:
        """Validate phone number format"""
        # Remove common formatting characters
        cleaned = re.sub(r'[\s\-\(\)\.]', '', phone)
        # Check if it's a valid US phone number
        return bool(re.match(r'^\+?1?\d{10}$', cleaned))
    
    def _is_valid_ssn(self, ssn: str) -> bool:
        """Validate SSN format"""
        # Remove hyphens
        cleaned = ssn.replace('-', '')
        # Check format
        if not re.match(r'^\d{9}$', cleaned):
            return False
        # Check for invalid patterns
        if cleaned == '000000000' or cleaned == '999999999':
            return False
        if cleaned[:3] == '000' or cleaned[:3] == '666':
            return False
        if cleaned[3:5] == '00':
            return False
        if cleaned[5:] == '0000':
            return False
        return True
    
    def _validate_date_of_birth(self, dob_str: str) -> Tuple[bool, Optional[str]]:
        """Validate date of birth"""
        try:
            dob = datetime.fromisoformat(dob_str.replace('Z', '+00:00'))
            age = (datetime.now(dob.tzinfo) - dob).days / 365.25
            
            if age < 14:
                return False, "Employee must be at least 14 years old"
            elif age < 16:
                return True, "Minor employee - work permit may be required"
            elif age > 100:
                return False, "Invalid date of birth"
            
            return True, None
        except:
            return False, "Invalid date format"
    
    def _validate_address(self, address: Dict[str, Any]) -> List[str]:
        """Validate address fields"""
        errors = []
        
        required = ["street", "city", "state", "zip"]
        for field in required:
            if not address.get(field):
                errors.append(f"Address {field} is required")
        
        # State validation
        if address.get("state"):
            valid_states = [
                "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
                "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
                "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
                "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
                "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
                "DC", "PR", "VI", "GU", "AS"
            ]
            if address["state"].upper() not in valid_states:
                errors.append(f"Invalid state: {address['state']}")
        
        # ZIP code validation
        if address.get("zip"):
            if not re.match(r'^\d{5}(-\d{4})?$', address["zip"]):
                errors.append("Invalid ZIP code format")
        
        return errors
    
    def _validate_routing_number(self, routing_number: str) -> bool:
        """
        Validate bank routing number using ABA checksum
        """
        if not routing_number or len(routing_number) != 9:
            return False
        
        try:
            # ABA routing number checksum validation
            weights = [3, 7, 1, 3, 7, 1, 3, 7, 1]
            checksum = sum(int(routing_number[i]) * weights[i] for i in range(9))
            return checksum % 10 == 0
        except:
            return False