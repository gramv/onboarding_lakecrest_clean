"""
Employee Data Models
Comprehensive data models for employee information with encryption support
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, date
from dataclasses import dataclass, asdict, field
from enum import Enum

@dataclass
class Address:
    """Address information model"""
    street: str
    apt: Optional[str] = None
    city: str = ""
    state: str = ""
    zip: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {k: v for k, v in asdict(self).items() if v is not None}
    
    def to_string(self) -> str:
        """Format as single line address"""
        parts = [self.street]
        if self.apt:
            parts.append(f"Apt {self.apt}")
        parts.extend([self.city, self.state, self.zip])
        return ", ".join(filter(None, parts))

@dataclass
class PersonalInfo:
    """Personal information model with encryption markers"""
    firstName: str
    lastName: str
    middleInitial: Optional[str] = None
    fullName: Optional[str] = None
    dateOfBirth: Optional[str] = None
    ssn: Optional[str] = None  # Encrypted field
    gender: Optional[str] = None
    maritalStatus: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[Address] = None
    
    def __post_init__(self):
        """Post-initialization processing"""
        # Generate full name if not provided
        if not self.fullName:
            parts = [self.firstName]
            if self.middleInitial:
                if len(self.middleInitial) == 1:
                    parts.append(f"{self.middleInitial}.")
                else:
                    parts.append(self.middleInitial)
            parts.append(self.lastName)
            self.fullName = " ".join(filter(None, parts))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        if self.address and isinstance(self.address, Address):
            data['address'] = self.address.to_dict()
        return {k: v for k, v in data.items() if v is not None}
    
    def get_masked_ssn(self) -> str:
        """Get masked SSN for display"""
        if not self.ssn or self.ssn == '***-**-****':
            return '***-**-****'
        if len(self.ssn) >= 4:
            return f"***-**-{self.ssn[-4:]}"
        return '***-**-****'

@dataclass
class DirectDepositInfo:
    """Direct deposit information model"""
    bankName: str
    accountType: str  # 'checking' or 'savings'
    accountNumber: str  # Encrypted field
    routingNumber: str  # Encrypted field
    accountHolderName: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {k: v for k, v in asdict(self).items() if v is not None}
    
    def get_masked_account(self) -> str:
        """Get masked account number for display"""
        if not self.accountNumber:
            return '****'
        if len(self.accountNumber) >= 4:
            return f"****{self.accountNumber[-4:]}"
        return '****'

@dataclass
class EmergencyContact:
    """Emergency contact information"""
    name: str
    relationship: str
    phone: str
    alternatePhone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[Address] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        if self.address and isinstance(self.address, Address):
            data['address'] = self.address.to_dict()
        return {k: v for k, v in data.items() if v is not None}

@dataclass 
class W4FormData:
    """W-4 tax form data model"""
    filingStatus: str  # 'single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'
    multipleJobs: bool = False
    qualifyingChildren: int = 0
    otherDependents: int = 0
    otherIncome: Optional[float] = None
    deductions: Optional[float] = None
    extraWithholding: Optional[float] = None
    claimExemption: bool = False
    signatureDate: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {k: v for k, v in asdict(self).items() if v is not None}

@dataclass
class I9FormData:
    """I-9 employment eligibility form data"""
    # Section 1
    citizenshipStatus: str  # 'citizen', 'noncitizen_national', 'permanent_resident', 'authorized_alien'
    alienNumber: Optional[str] = None  # Encrypted field
    uscisNumber: Optional[str] = None  # Encrypted field
    i94Number: Optional[str] = None  # Encrypted field
    passportNumber: Optional[str] = None  # Encrypted field
    passportCountry: Optional[str] = None
    workAuthorizationExpiration: Optional[str] = None
    employeeSignatureDate: Optional[str] = None
    
    # Section 2 (filled by employer)
    documentTitle: Optional[str] = None
    issuingAuthority: Optional[str] = None
    documentNumber: Optional[str] = None
    documentExpiration: Optional[str] = None
    additionalDocumentTitle: Optional[str] = None
    additionalDocumentNumber: Optional[str] = None
    additionalDocumentExpiration: Optional[str] = None
    employerSignatureDate: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {k: v for k, v in asdict(self).items() if v is not None}

@dataclass
class HealthInsuranceInfo:
    """Health insurance enrollment information"""
    enrollmentType: str  # 'employee_only', 'employee_spouse', 'employee_children', 'family'
    effectiveDate: str
    dependents: List[Dict[str, Any]] = field(default_factory=list)
    primaryCarePhysician: Optional[str] = None
    medicalConditions: Optional[List[str]] = None
    medications: Optional[List[str]] = None
    signatureDate: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {k: v for k, v in asdict(self).items() if v is not None}

@dataclass
class EmployeeCompleteData:
    """Complete employee data model aggregating all information"""
    employee_id: str
    employee_number: str
    property_id: str
    status: str
    
    # Core information
    personal_info: PersonalInfo
    
    # Form data
    w4_data: Optional[W4FormData] = None
    i9_data: Optional[I9FormData] = None
    direct_deposit: Optional[DirectDepositInfo] = None
    health_insurance: Optional[HealthInsuranceInfo] = None
    emergency_contacts: Optional[List[EmergencyContact]] = None
    
    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    onboarding_completed_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = {
            'employee_id': self.employee_id,
            'employee_number': self.employee_number,
            'property_id': self.property_id,
            'status': self.status,
            'personal_info': self.personal_info.to_dict() if self.personal_info else None
        }
        
        # Add optional form data
        if self.w4_data:
            data['w4_data'] = self.w4_data.to_dict()
        if self.i9_data:
            data['i9_data'] = self.i9_data.to_dict()
        if self.direct_deposit:
            data['direct_deposit'] = self.direct_deposit.to_dict()
        if self.health_insurance:
            data['health_insurance'] = self.health_insurance.to_dict()
        if self.emergency_contacts:
            data['emergency_contacts'] = [ec.to_dict() for ec in self.emergency_contacts]
        
        # Add metadata
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.updated_at:
            data['updated_at'] = self.updated_at.isoformat()
        if self.onboarding_completed_at:
            data['onboarding_completed_at'] = self.onboarding_completed_at.isoformat()
        
        return data
    
    def get_full_name(self) -> str:
        """Get formatted full name"""
        if self.personal_info:
            return self.personal_info.fullName or ""
        return ""
    
    def get_address_string(self) -> str:
        """Get formatted address string"""
        if self.personal_info and self.personal_info.address:
            return self.personal_info.address.to_string()
        return ""
    
    def is_onboarding_complete(self) -> bool:
        """Check if onboarding is complete"""
        required_forms = [
            self.w4_data is not None,
            self.i9_data is not None,
            self.direct_deposit is not None
        ]
        return all(required_forms) and self.onboarding_completed_at is not None

@dataclass
class PDFGenerationData:
    """Data model specifically for PDF generation"""
    employee_id: str
    employee_number: str
    
    # Name fields for PDFs
    first_name: str
    last_name: str
    middle_initial: Optional[str] = None
    full_name: Optional[str] = None
    
    # Personal details
    date_of_birth: Optional[str] = None
    ssn: Optional[str] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    
    # Contact
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Address
    address_street: Optional[str] = None
    address_apt: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    
    # Property info
    property_id: Optional[str] = None
    property_name: Optional[str] = None
    
    # Form-specific data
    form_data: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        """Post-initialization processing"""
        # Generate full name if not provided
        if not self.full_name:
            parts = [self.first_name]
            if self.middle_initial:
                if len(self.middle_initial) == 1:
                    parts.append(f"{self.middle_initial}.")
                else:
                    parts.append(self.middle_initial)
            parts.append(self.last_name)
            self.full_name = " ".join(filter(None, parts))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for PDF generation"""
        return {k: v for k, v in asdict(self).items() if v is not None}
    
    @classmethod
    def from_employee_data(cls, employee_data: Dict[str, Any]) -> 'PDFGenerationData':
        """Create from employee data service output"""
        personal_info = employee_data.get('personal_info', {})
        address = personal_info.get('address', {})
        
        return cls(
            employee_id=employee_data.get('employee_id', ''),
            employee_number=employee_data.get('employee_number', ''),
            first_name=personal_info.get('firstName', ''),
            last_name=personal_info.get('lastName', ''),
            middle_initial=personal_info.get('middleInitial'),
            full_name=personal_info.get('fullName'),
            date_of_birth=personal_info.get('dateOfBirth'),
            ssn=personal_info.get('ssn'),
            gender=personal_info.get('gender'),
            marital_status=personal_info.get('maritalStatus'),
            email=personal_info.get('email'),
            phone=personal_info.get('phone'),
            address_street=address.get('street'),
            address_apt=address.get('apt'),
            address_city=address.get('city'),
            address_state=address.get('state'),
            address_zip=address.get('zip'),
            property_id=employee_data.get('property_id'),
            form_data=employee_data.get('form_data', {})
        )