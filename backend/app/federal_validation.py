"""
Federal Compliance Validation Service
Backend implementation of federal employment law compliance validation

CRITICAL: This module implements server-side federal employment law compliance
validations required to prevent legal liability in hotel employee onboarding.

All validations must meet federal standards exactly as specified by:
- U.S. Department of Labor (Fair Labor Standards Act)
- Internal Revenue Service (IRS)
- U.S. Citizenship and Immigration Services (USCIS)
- Equal Employment Opportunity Commission (EEOC)
"""

import re
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from .models import (
    FederalValidationError, FederalValidationResult, ComplianceAuditEntry,
    I9Section1Data, W4FormData, PersonalInfoValidationRequest
)

class FederalValidationService:
    """
    Central service for all federal compliance validations
    Ensures consistent validation across all backend endpoints
    """
    
    @staticmethod
    def validate_age(date_of_birth: str) -> FederalValidationResult:
        """
        Validate employee age meets federal requirements
        CRITICAL: Federal law prohibits employment of individuals under 18 in most hotel positions
        Reference: Fair Labor Standards Act (FLSA) 29 U.S.C. § 203
        """
        result = FederalValidationResult(is_valid=True)
        
        if not date_of_birth:
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='date_of_birth',
                message='Date of birth is required for federal employment eligibility verification',
                legal_code='FLSA-203',
                severity='error',
                compliance_note='Required under Fair Labor Standards Act for age verification'
            ))
            return result
        
        try:
            birth_date = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
            today = date.today()
            age = today.year - birth_date.year
            
            # Adjust age if birthday hasn't occurred this year
            if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
                age -= 1
            
            if age < 18:
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='date_of_birth',
                    message=f'FEDERAL COMPLIANCE VIOLATION: Employee must be at least 18 years old. Current age: {age}',
                    legal_code='FLSA-203-CHILD-LABOR',
                    severity='error',
                    compliance_note='Employment of individuals under 18 in hotel positions may violate federal child labor laws. Special work permits and restricted hours may be required. Consult legal counsel immediately.'
                ))
            elif age < 21:
                result.warnings.append(FederalValidationError(
                    field='date_of_birth',
                    message=f'Employee is {age} years old. Alcohol service restrictions may apply.',
                    legal_code='FLSA-203-MINOR',
                    severity='warning',
                    compliance_note='Employees under 21 cannot serve or handle alcoholic beverages in most jurisdictions'
                ))
            
            if result.is_valid:
                result.compliance_notes.append(f'Age verification completed: {age} years old. Meets federal minimum age requirements.')
                
        except ValueError:
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='date_of_birth',
                message='Invalid date format. Date of birth must be in YYYY-MM-DD format',
                legal_code='DATE-FORMAT-ERROR',
                severity='error'
            ))
        
        return result
    
    @staticmethod
    def validate_ssn(ssn: str) -> FederalValidationResult:
        """
        Validate Social Security Number meets federal requirements
        Reference: 26 U.S.C. § 3401 (IRS), 42 U.S.C. § 405 (SSA)
        """
        result = FederalValidationResult(is_valid=True)
        
        if not ssn:
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='Social Security Number is required for federal tax withholding and employment verification',
                legal_code='IRC-3401-SSN',
                severity='error',
                compliance_note='Required under Internal Revenue Code Section 3401 for payroll tax withholding'
            ))
            return result
        
        # Remove formatting characters
        clean_ssn = ssn.replace('-', '').replace(' ', '')
        
        # Must be exactly 9 digits
        if not re.match(r'^\d{9}$', clean_ssn):
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='SSN must be exactly 9 digits in format XXX-XX-XXXX',
                legal_code='SSA-405-FORMAT',
                severity='error',
                compliance_note='Social Security Administration requires 9-digit format'
            ))
            return result
        
        # Federal prohibited SSN patterns
        area = clean_ssn[:3]
        group = clean_ssn[3:5]
        serial = clean_ssn[5:9]
        
        # Invalid area numbers (000, 666, 900-999)
        if area == '000' or area == '666' or int(area) >= 900:
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message=f'Invalid SSN area number: {area}. This SSN format is not issued by the Social Security Administration',
                legal_code='SSA-405-INVALID-AREA',
                severity='error',
                compliance_note='SSN area numbers 000, 666, and 900-999 are never issued'
            ))
            return result
        
        # Invalid group number (00)
        if group == '00':
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='Invalid SSN group number: 00. Group number cannot be 00',
                legal_code='SSA-405-INVALID-GROUP',
                severity='error',
                compliance_note='SSN group number 00 is never issued'
            ))
            return result
        
        # Invalid serial number (0000)
        if serial == '0000':
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='Invalid SSN serial number: 0000. Serial number cannot be 0000',
                legal_code='SSA-405-INVALID-SERIAL',
                severity='error',
                compliance_note='SSN serial number 0000 is never issued'
            ))
            return result
        
        # Known advertising/placeholder SSNs
        known_invalid_ssns = [
            '123456789', '111111111', '222222222', '333333333', '444444444',
            '555555555', '777777777', '888888888', '999999999', '078051120',
            '219099999', '457555462'
        ]
        
        if clean_ssn in known_invalid_ssns:
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='This SSN is a known invalid/placeholder number and cannot be used for employment',
                legal_code='SSA-405-PLACEHOLDER',
                severity='error',
                compliance_note='Placeholder SSNs used in advertising or examples are not valid for employment'
            ))
            return result
        
        result.compliance_notes.append('SSN format validation passed - meets federal requirements')
        return result
    
    @staticmethod
    def validate_ssn_format(ssn: str) -> FederalValidationResult:
        """
        Enhanced SSN format validation for W-4 IRS compliance (2025)
        Valid format: XXX-XX-XXXX or XXXXXXXXX
        Cannot start with 9, Cannot be 000-XX-XXXX, XXX-00-XXXX, XXX-XX-0000
        Cannot be 666-XX-XXXX
        Reference: IRS Publication 15 (2025), SSA guidelines
        """
        result = FederalValidationResult(is_valid=True)
        
        if not ssn:
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='Social Security Number is required for W-4 federal tax withholding',
                legal_code='IRS-W4-2025-SSN',
                severity='error',
                compliance_note='2025 IRS W-4 requires valid SSN for tax withholding calculations'
            ))
            return result
        
        # Accept both formats: XXX-XX-XXXX or XXXXXXXXX
        clean_ssn = ssn.replace('-', '').replace(' ', '').strip()
        
        # Must be exactly 9 digits
        if not re.match(r'^\d{9}$', clean_ssn):
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='SSN must contain exactly 9 digits (XXX-XX-XXXX or XXXXXXXXX)',
                legal_code='IRS-W4-2025-FORMAT',
                severity='error',
                compliance_note='IRS requires 9-digit SSN format for 2025 W-4 forms'
            ))
            return result
        
        # Extract parts for validation
        area = clean_ssn[:3]
        group = clean_ssn[3:5]
        serial = clean_ssn[5:9]
        
        # Cannot start with 9 (ITINs start with 9, not SSNs)
        if area[0] == '9':
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='SSN cannot start with 9 (ITINs start with 9, not SSNs)',
                legal_code='IRS-W4-2025-ITIN',
                severity='error',
                compliance_note='Numbers starting with 9 are Individual Taxpayer Identification Numbers (ITINs), not SSNs'
            ))
            return result
        
        # Cannot be 000-XX-XXXX
        if area == '000':
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='Invalid SSN: Area number cannot be 000',
                legal_code='IRS-W4-2025-AREA-000',
                severity='error',
                compliance_note='SSA never issues SSNs with area number 000'
            ))
            return result
        
        # Cannot be 666-XX-XXXX
        if area == '666':
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='Invalid SSN: Area number 666 is not valid',
                legal_code='IRS-W4-2025-AREA-666',
                severity='error',
                compliance_note='SSA never issues SSNs with area number 666'
            ))
            return result
        
        # Cannot be XXX-00-XXXX
        if group == '00':
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='Invalid SSN: Group number cannot be 00',
                legal_code='IRS-W4-2025-GROUP-00',
                severity='error',
                compliance_note='SSA never issues SSNs with group number 00'
            ))
            return result
        
        # Cannot be XXX-XX-0000
        if serial == '0000':
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='Invalid SSN: Serial number cannot be 0000',
                legal_code='IRS-W4-2025-SERIAL-0000',
                severity='error',
                compliance_note='SSA never issues SSNs with serial number 0000'
            ))
            return result
        
        # Known test/invalid SSNs per IRS guidelines
        invalid_ssns = [
            '123456789', '111111111', '222222222', '333333333', '444444444',
            '555555555', '666666666', '777777777', '888888888', '999999999',
            '078051120', '219099999', '457555462', '123121234'
        ]
        
        if clean_ssn in invalid_ssns:
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='ssn',
                message='This SSN is a known test/placeholder number and cannot be used for W-4',
                legal_code='IRS-W4-2025-TEST-SSN',
                severity='error',
                compliance_note='IRS prohibits use of test SSNs on official W-4 forms'
            ))
            return result
        
        result.compliance_notes.append('SSN format validation passed - meets 2025 IRS W-4 requirements')
        return result
    
    @staticmethod
    def validate_w4_withholdings(data: dict) -> FederalValidationResult:
        """
        Validate W-4 withholding amounts meet 2025 IRS requirements
        Reference: IRS Form W-4 (2025), IRS Publication 15-T (2025)
        
        Validates:
        - Step 3: Claim dependents (must be non-negative integer × $2,000 or $500)
        - Step 4(a): Other income (must be numeric)
        - Step 4(b): Deductions (must be non-negative)
        - Step 4(c): Extra withholding (must be non-negative)
        - Filing status (must be valid IRS option)
        """
        result = FederalValidationResult(is_valid=True)
        
        # 2025 IRS standard deduction amounts
        STANDARD_DEDUCTIONS_2025 = {
            'Single': 14600,
            'Married filing jointly': 29200,
            'Head of household': 21900
        }
        
        # 2025 dependent credit amounts
        CHILD_TAX_CREDIT_2025 = 2000  # Per qualifying child under 17
        OTHER_DEPENDENT_CREDIT_2025 = 500  # Per other dependent
        
        # Validate filing status
        filing_status = data.get('filing_status') or data.get('filingStatus')
        valid_filing_statuses = ['Single', 'Married filing jointly', 'Head of household']
        
        if not filing_status:
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='filing_status',
                message='Filing status is required for W-4 tax calculations',
                legal_code='IRS-W4-2025-STATUS',
                severity='error',
                compliance_note='IRS requires selection of valid filing status for 2025 withholding calculations'
            ))
        elif filing_status not in valid_filing_statuses:
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='filing_status',
                message=f'Invalid filing status: {filing_status}. Must be one of: {", ".join(valid_filing_statuses)}',
                legal_code='IRS-W4-2025-STATUS-INVALID',
                severity='error',
                compliance_note='Only IRS-approved filing statuses are valid for 2025 W-4 forms'
            ))
        
        # Step 3: Validate dependent amounts
        # Qualifying children (under 17)
        qualifying_children = data.get('qualifying_children') or data.get('qualifyingChildren')
        if qualifying_children is not None:
            try:
                children_count = int(qualifying_children) if qualifying_children else 0
                if children_count < 0:
                    result.is_valid = False
                    result.errors.append(FederalValidationError(
                        field='qualifying_children',
                        message='Number of qualifying children cannot be negative',
                        legal_code='IRS-W4-2025-CHILDREN-NEGATIVE',
                        severity='error',
                        compliance_note='IRS requires non-negative integer for qualifying children count'
                    ))
                elif children_count > 10:
                    result.warnings.append(FederalValidationError(
                        field='qualifying_children',
                        message=f'Unusually high number of qualifying children: {children_count}. Please verify.',
                        legal_code='IRS-W4-2025-CHILDREN-HIGH',
                        severity='warning',
                        compliance_note='High dependent count may trigger IRS review'
                    ))
            except (ValueError, TypeError):
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='qualifying_children',
                    message='Number of qualifying children must be a valid integer',
                    legal_code='IRS-W4-2025-CHILDREN-FORMAT',
                    severity='error',
                    compliance_note='IRS requires integer value for qualifying children count'
                ))
        
        # Other dependents
        other_dependents = data.get('other_dependents') or data.get('otherDependents')
        if other_dependents is not None:
            try:
                dependents_count = int(other_dependents) if other_dependents else 0
                if dependents_count < 0:
                    result.is_valid = False
                    result.errors.append(FederalValidationError(
                        field='other_dependents',
                        message='Number of other dependents cannot be negative',
                        legal_code='IRS-W4-2025-DEPENDENTS-NEGATIVE',
                        severity='error',
                        compliance_note='IRS requires non-negative integer for other dependents count'
                    ))
            except (ValueError, TypeError):
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='other_dependents',
                    message='Number of other dependents must be a valid integer',
                    legal_code='IRS-W4-2025-DEPENDENTS-FORMAT',
                    severity='error',
                    compliance_note='IRS requires integer value for other dependents count'
                ))
        
        # Dependents amount (calculated field)
        dependents_amount = data.get('dependents_amount') or data.get('dependentsAmount')
        if dependents_amount is not None and dependents_amount != '':
            try:
                amount = float(dependents_amount)
                if amount < 0:
                    result.is_valid = False
                    result.errors.append(FederalValidationError(
                        field='dependents_amount',
                        message='Total dependents credit amount cannot be negative',
                        legal_code='IRS-W4-2025-DEPENDENTS-AMOUNT-NEGATIVE',
                        severity='error',
                        compliance_note='IRS requires non-negative amount for dependent credits'
                    ))
                # Validate it's a multiple of $500 (could be combination of $2000 and $500 credits)
                if amount > 0 and amount % 500 != 0:
                    result.warnings.append(FederalValidationError(
                        field='dependents_amount',
                        message=f'Dependent credit amount ${amount} is not a multiple of $500',
                        legal_code='IRS-W4-2025-DEPENDENTS-AMOUNT-ODD',
                        severity='warning',
                        compliance_note='Dependent credits should be multiples of $500 or $2,000'
                    ))
            except (ValueError, TypeError):
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='dependents_amount',
                    message='Dependents credit amount must be a valid number',
                    legal_code='IRS-W4-2025-DEPENDENTS-AMOUNT-FORMAT',
                    severity='error',
                    compliance_note='IRS requires numeric value for dependent credit amount'
                ))
        
        # Step 4(a): Other income
        other_income = data.get('other_income') or data.get('otherIncome')
        if other_income is not None and other_income != '':
            try:
                income = float(other_income)
                # Other income can be negative (for losses)
                if income > 1000000:
                    result.warnings.append(FederalValidationError(
                        field='other_income',
                        message=f'Unusually high other income amount: ${income:,.2f}',
                        legal_code='IRS-W4-2025-OTHER-INCOME-HIGH',
                        severity='warning',
                        compliance_note='High other income may require additional documentation'
                    ))
            except (ValueError, TypeError):
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='other_income',
                    message='Other income must be a valid number',
                    legal_code='IRS-W4-2025-OTHER-INCOME-FORMAT',
                    severity='error',
                    compliance_note='IRS requires numeric value for other income (Step 4a)'
                ))
        
        # Step 4(b): Deductions
        deductions = data.get('deductions')
        if deductions is not None and deductions != '':
            try:
                deduction_amount = float(deductions)
                if deduction_amount < 0:
                    result.is_valid = False
                    result.errors.append(FederalValidationError(
                        field='deductions',
                        message='Deductions amount cannot be negative',
                        legal_code='IRS-W4-2025-DEDUCTIONS-NEGATIVE',
                        severity='error',
                        compliance_note='IRS requires non-negative value for deductions (Step 4b)'
                    ))
                # Check if deductions exceed standard deduction
                if filing_status in STANDARD_DEDUCTIONS_2025:
                    standard = STANDARD_DEDUCTIONS_2025[filing_status]
                    if deduction_amount > 0 and deduction_amount < standard:
                        result.warnings.append(FederalValidationError(
                            field='deductions',
                            message=f'Deductions (${deduction_amount:,.2f}) less than 2025 standard deduction (${standard:,.2f})',
                            legal_code='IRS-W4-2025-DEDUCTIONS-LOW',
                            severity='warning',
                            compliance_note='Consider if itemizing deductions is beneficial'
                        ))
                    elif deduction_amount > standard * 3:
                        result.warnings.append(FederalValidationError(
                            field='deductions',
                            message=f'Unusually high deductions amount: ${deduction_amount:,.2f}',
                            legal_code='IRS-W4-2025-DEDUCTIONS-HIGH',
                            severity='warning',
                            compliance_note='High deductions may trigger IRS review'
                        ))
            except (ValueError, TypeError):
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='deductions',
                    message='Deductions must be a valid number',
                    legal_code='IRS-W4-2025-DEDUCTIONS-FORMAT',
                    severity='error',
                    compliance_note='IRS requires numeric value for deductions (Step 4b)'
                ))
        
        # Step 4(c): Extra withholding
        extra_withholding = data.get('extra_withholding') or data.get('extraWithholding')
        if extra_withholding is not None and extra_withholding != '':
            try:
                extra_amount = float(extra_withholding)
                if extra_amount < 0:
                    result.is_valid = False
                    result.errors.append(FederalValidationError(
                        field='extra_withholding',
                        message='Extra withholding amount cannot be negative',
                        legal_code='IRS-W4-2025-EXTRA-NEGATIVE',
                        severity='error',
                        compliance_note='IRS requires non-negative value for extra withholding (Step 4c)'
                    ))
                elif extra_amount > 5000:
                    result.warnings.append(FederalValidationError(
                        field='extra_withholding',
                        message=f'Unusually high extra withholding per pay period: ${extra_amount:,.2f}',
                        legal_code='IRS-W4-2025-EXTRA-HIGH',
                        severity='warning',
                        compliance_note='Very high extra withholding may indicate error or special circumstances'
                    ))
            except (ValueError, TypeError):
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='extra_withholding',
                    message='Extra withholding must be a valid number',
                    legal_code='IRS-W4-2025-EXTRA-FORMAT',
                    severity='error',
                    compliance_note='IRS requires numeric value for extra withholding (Step 4c)'
                ))
        
        # Multiple jobs checkbox validation
        multiple_jobs = data.get('multiple_jobs') or data.get('multipleJobs') or data.get('multipleJobsCheckbox')
        if filing_status == 'Married filing jointly':
            spouse_works = data.get('spouse_works') or data.get('spouseWorks') or data.get('spouseWorksCheckbox')
            if multiple_jobs and spouse_works:
                result.warnings.append(FederalValidationError(
                    field='multiple_jobs',
                    message='Both multiple jobs and spouse works are checked. Use worksheet for accurate withholding.',
                    legal_code='IRS-W4-2025-MULTIPLE-JOBS',
                    severity='warning',
                    compliance_note='IRS recommends using Multiple Jobs Worksheet for accurate withholding'
                ))
        
        if result.is_valid:
            result.compliance_notes.append('W-4 withholding validation completed - meets 2025 IRS requirements')
            result.compliance_notes.append(f'Filing status: {filing_status}, Standard deduction: ${STANDARD_DEDUCTIONS_2025.get(filing_status, 0):,.2f}')
        
        return result
    
    @staticmethod
    def validate_i9_section1(form_data: I9Section1Data) -> FederalValidationResult:
        """
        Validate I-9 Section 1 meets USCIS requirements
        Reference: 8 U.S.C. § 1324a, 8 CFR § 274a
        """
        result = FederalValidationResult(is_valid=True)
        
        # Required fields validation
        required_fields = [
            ('employee_last_name', 'Last name is required for I-9 compliance'),
            ('employee_first_name', 'First name is required for I-9 compliance'),
            ('address_street', 'Street address is required for I-9 compliance'),
            ('address_city', 'City is required for I-9 compliance'),
            ('address_state', 'State is required for I-9 compliance'),
            ('address_zip', 'ZIP code is required for I-9 compliance'),
            ('date_of_birth', 'Date of birth is required for I-9 compliance'),
            ('ssn', 'SSN is required for I-9 compliance'),
            ('email', 'Email is required for I-9 compliance'),
            ('phone', 'Phone number is required for I-9 compliance'),
            ('citizenship_status', 'Citizenship status is required for I-9 compliance')
        ]
        
        for field_name, message in required_fields:
            field_value = getattr(form_data, field_name, None)
            if not field_value or str(field_value).strip() == '':
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field=field_name,
                    message=message,
                    legal_code='INA-274A-REQUIRED',
                    severity='error',
                    compliance_note='Required under Immigration and Nationality Act Section 274A'
                ))
        
        # Citizenship status validation
        valid_citizenship_statuses = ['us_citizen', 'noncitizen_national', 'permanent_resident', 'authorized_alien']
        if form_data.citizenship_status and form_data.citizenship_status not in valid_citizenship_statuses:
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='citizenship_status',
                message='Invalid citizenship status selected',
                legal_code='INA-274A-STATUS',
                severity='error',
                compliance_note='Must select one of the four federal citizenship/work authorization categories'
            ))
        
        # Additional validation for non-citizens
        if form_data.citizenship_status == 'permanent_resident':
            if not form_data.uscis_number and not form_data.i94_admission_number:
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='uscis_number',
                    message='USCIS Number or I-94 Admission Number is required for permanent residents',
                    legal_code='INA-274A-DOCUMENT',
                    severity='error',
                    compliance_note='Permanent residents must provide USCIS Number or I-94 Admission Number'
                ))
        
        if form_data.citizenship_status == 'authorized_alien':
            if not form_data.uscis_number and not form_data.i94_admission_number and not form_data.passport_number:
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='uscis_number',
                    message='At least one identification number is required for authorized aliens',
                    legal_code='INA-274A-ALIEN-ID',
                    severity='error',
                    compliance_note='Must provide USCIS Number, I-94 Number, or Passport Number'
                ))
            
            if not form_data.work_authorization_expiration:
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='work_authorization_expiration',
                    message='Work authorization expiration date is required for authorized aliens',
                    legal_code='INA-274A-EXPIRATION',
                    severity='error',
                    compliance_note='Required to verify ongoing work authorization status'
                ))
            else:
                # Check if work authorization is expired
                try:
                    exp_date = datetime.strptime(form_data.work_authorization_expiration, '%Y-%m-%d').date()
                    today = date.today()
                    
                    if exp_date <= today:
                        result.is_valid = False
                        result.errors.append(FederalValidationError(
                            field='work_authorization_expiration',
                            message='Work authorization has expired. Cannot proceed with employment',
                            legal_code='INA-274A-EXPIRED',
                            severity='error',
                            compliance_note='Expired work authorization prohibits legal employment'
                        ))
                    elif exp_date <= date.fromordinal(today.toordinal() + 30):
                        result.warnings.append(FederalValidationError(
                            field='work_authorization_expiration',
                            message='Work authorization expires within 30 days. Renewal documentation may be needed',
                            legal_code='INA-274A-EXPIRING',
                            severity='warning',
                            compliance_note='Early renewal recommended to avoid employment interruption'
                        ))
                except ValueError:
                    result.is_valid = False
                    result.errors.append(FederalValidationError(
                        field='work_authorization_expiration',
                        message='Invalid work authorization expiration date format',
                        legal_code='INA-274A-DATE-FORMAT',
                        severity='error'
                    ))
        
        # Age validation
        if form_data.date_of_birth:
            age_validation = FederalValidationService.validate_age(form_data.date_of_birth)
            result.errors.extend(age_validation.errors)
            result.warnings.extend(age_validation.warnings)
            if not age_validation.is_valid:
                result.is_valid = False
        
        # SSN validation
        if form_data.ssn:
            ssn_validation = FederalValidationService.validate_ssn(form_data.ssn)
            result.errors.extend(ssn_validation.errors)
            result.warnings.extend(ssn_validation.warnings)
            if not ssn_validation.is_valid:
                result.is_valid = False
        
        # ZIP code validation
        if form_data.address_zip and not re.match(r'^\d{5}(-\d{4})?$', form_data.address_zip):
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='address_zip',
                message='ZIP code must be in format 12345 or 12345-6789',
                legal_code='USPS-ZIP-FORMAT',
                severity='error',
                compliance_note='Must use valid US Postal Service ZIP code format'
            ))
        
        # Email validation
        if form_data.email and not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', form_data.email):
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='email',
                message='Valid email address is required',
                legal_code='CONTACT-EMAIL-FORMAT',
                severity='error',
                compliance_note='Required for employment communications and compliance notices'
            ))
        
        # Phone validation
        if form_data.phone:
            clean_phone = re.sub(r'\D', '', form_data.phone)
            if len(clean_phone) != 10:
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='phone',
                    message='Phone number must be 10 digits',
                    legal_code='CONTACT-PHONE-FORMAT',
                    severity='error',
                    compliance_note='Required for employment communications and emergency contact'
                ))
        
        if result.is_valid:
            result.compliance_notes.append('I-9 Section 1 validation completed - meets federal immigration compliance requirements')
        
        return result
    
    @staticmethod
    def validate_w4_form(form_data: W4FormData) -> FederalValidationResult:
        """
        Validate W-4 form meets IRS requirements
        Reference: 26 U.S.C. § 3402, IRS Publication 15
        """
        result = FederalValidationResult(is_valid=True)
        
        # Required fields validation
        required_fields = [
            ('first_name', 'First name is required for W-4 tax withholding'),
            ('last_name', 'Last name is required for W-4 tax withholding'),
            ('address', 'Address is required for W-4 tax withholding'),
            ('city', 'City is required for W-4 tax withholding'),
            ('state', 'State is required for W-4 tax withholding'),
            ('zip_code', 'ZIP code is required for W-4 tax withholding'),
            ('ssn', 'SSN is required for W-4 tax withholding'),
            ('filing_status', 'Filing status is required for W-4 tax withholding'),
            ('signature', 'Employee signature is required for W-4 validity'),
            ('signature_date', 'Signature date is required for W-4 validity')
        ]
        
        for field_name, message in required_fields:
            field_value = getattr(form_data, field_name, None)
            if not field_value or str(field_value).strip() == '':
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field=field_name,
                    message=message,
                    legal_code='IRC-3402-REQUIRED',
                    severity='error',
                    compliance_note='Required under Internal Revenue Code Section 3402 for federal tax withholding'
                ))
        
        # Filing status validation
        valid_filing_statuses = ['Single', 'Married filing jointly', 'Head of household']
        if form_data.filing_status and form_data.filing_status not in valid_filing_statuses:
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='filing_status',
                message='Invalid filing status selected',
                legal_code='IRC-3402-FILING-STATUS',
                severity='error',
                compliance_note='Must use IRS-approved filing status categories'
            ))
        
        # SSN validation
        if form_data.ssn:
            ssn_validation = FederalValidationService.validate_ssn(form_data.ssn)
            result.errors.extend(ssn_validation.errors)
            result.warnings.extend(ssn_validation.warnings)
            if not ssn_validation.is_valid:
                result.is_valid = False
        
        # ZIP code validation
        if form_data.zip_code and not re.match(r'^\d{5}(-\d{4})?$', form_data.zip_code):
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='zip_code',
                message='ZIP code must be in format 12345 or 12345-6789',
                legal_code='USPS-ZIP-FORMAT',
                severity='error',
                compliance_note='Must use valid US Postal Service ZIP code format for tax purposes'
            ))
        
        # Numerical field validation
        numerical_fields = [
            'dependents_amount', 'other_credits', 'other_income', 'deductions', 'extra_withholding'
        ]
        
        for field_name in numerical_fields:
            field_value = getattr(form_data, field_name, None)
            if field_value is not None:
                try:
                    value = float(field_value)
                    if value < 0:
                        result.is_valid = False
                        result.errors.append(FederalValidationError(
                            field=field_name,
                            message=f'{field_name.replace("_", " ")} must be a non-negative number',
                            legal_code='IRC-3402-AMOUNT',
                            severity='error',
                            compliance_note='All monetary amounts must be valid non-negative numbers'
                        ))
                except (ValueError, TypeError):
                    result.is_valid = False
                    result.errors.append(FederalValidationError(
                        field=field_name,
                        message=f'{field_name.replace("_", " ")} must be a valid number',
                        legal_code='IRC-3402-AMOUNT',
                        severity='error',
                        compliance_note='All monetary amounts must be valid numbers'
                    ))
        
        # Signature date validation
        if form_data.signature_date:
            try:
                signature_date = datetime.strptime(form_data.signature_date, '%Y-%m-%d').date()
                today = date.today()
                
                if signature_date > today:
                    result.is_valid = False
                    result.errors.append(FederalValidationError(
                        field='signature_date',
                        message='Signature date cannot be in the future',
                        legal_code='IRC-3402-DATE-FUTURE',
                        severity='error',
                        compliance_note='W-4 signature date must be current or historical'
                    ))
                elif (today - signature_date).days > 30:
                    result.warnings.append(FederalValidationError(
                        field='signature_date',
                        message='W-4 signature date is more than 30 days old. Consider requesting updated form',
                        legal_code='IRC-3402-DATE-OLD',
                        severity='warning',
                        compliance_note='IRS recommends current W-4 forms for accurate withholding'
                    ))
            except ValueError:
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='signature_date',
                    message='Invalid signature date format',
                    legal_code='IRC-3402-DATE-FORMAT',
                    severity='error'
                ))
        
        if result.is_valid:
            result.compliance_notes.append('W-4 validation completed - meets federal tax withholding compliance requirements')
        
        return result
    
    @staticmethod
    def validate_i9_documents(
        documents: List[Dict[str, Any]]
    ) -> FederalValidationResult:
        """
        Validate I-9 supporting documents per USCIS requirements
        Reference: 8 U.S.C. § 1324a, 8 CFR § 274a
        
        Documents must satisfy EITHER:
        1. One document from List A (establishes both identity AND employment authorization), OR
        2. One document from List B (establishes identity) AND one document from List C (establishes employment authorization)
        """
        result = FederalValidationResult(is_valid=True)
        
        if not documents:
            result.is_valid = False
            result.errors.append(FederalValidationError(
                field='documents',
                message='FEDERAL COMPLIANCE VIOLATION: At least one acceptable document must be provided for I-9 verification',
                legal_code='USCIS-I9-NO-DOCS',
                severity='error',
                compliance_note='8 U.S.C. § 1324a requires document verification for employment eligibility'
            ))
            return result
        
        # Categorize documents by list type
        list_a_docs = []
        list_b_docs = []
        list_c_docs = []
        
        # Define acceptable documents per USCIS guidelines
        LIST_A_DOCUMENTS = {
            'us_passport', 'us_passport_card', 'permanent_resident_card', 
            'employment_authorization_document', 'foreign_passport_with_i551',
            'foreign_passport_with_i94'
        }
        
        LIST_B_DOCUMENTS = {
            'drivers_license', 'state_id_card', 'school_id_with_photo',
            'voter_registration_card', 'us_military_card', 'military_dependent_card',
            'us_coast_guard_card', 'native_american_tribal_document', 'canadian_drivers_license'
        }
        
        LIST_C_DOCUMENTS = {
            'social_security_card', 'birth_certificate', 'employment_authorization_document_c',
            'us_citizen_id_card', 'resident_citizen_id_card'
        }
        
        for doc in documents:
            doc_type = doc.get('document_type', '').lower().replace(' ', '_')
            doc_list = doc.get('document_list', '').lower()
            
            # Auto-categorize based on document type if list not specified
            if doc_list == 'list_a' or doc_type in LIST_A_DOCUMENTS:
                list_a_docs.append(doc)
            elif doc_list == 'list_b' or doc_type in LIST_B_DOCUMENTS:
                list_b_docs.append(doc)
            elif doc_list == 'list_c' or doc_type in LIST_C_DOCUMENTS:
                list_c_docs.append(doc)
            else:
                result.warnings.append(FederalValidationError(
                    field='documents',
                    message=f'Document type "{doc_type}" not recognized in standard I-9 lists',
                    legal_code='USCIS-I9-UNKNOWN-DOC',
                    severity='warning',
                    compliance_note='Document may require manual verification'
                ))
        
        # Validate document combination per USCIS requirements
        if list_a_docs:
            # List A document provided - this is sufficient alone
            if len(list_a_docs) > 1:
                result.warnings.append(FederalValidationError(
                    field='documents',
                    message='Multiple List A documents provided. Only one is required.',
                    legal_code='USCIS-I9-MULTIPLE-A',
                    severity='warning',
                    compliance_note='USCIS requires only one List A document'
                ))
            
            if list_b_docs or list_c_docs:
                result.warnings.append(FederalValidationError(
                    field='documents',
                    message='List A document provided with List B/C documents. List A alone is sufficient.',
                    legal_code='USCIS-I9-UNNECESSARY-DOCS',
                    severity='warning',
                    compliance_note='When List A document is provided, List B and C documents are not required'
                ))
            
            # Check document expiration for List A
            for doc in list_a_docs:
                if doc.get('expiration_date'):
                    try:
                        exp_date = datetime.strptime(doc['expiration_date'], '%Y-%m-%d').date()
                        if exp_date < date.today():
                            result.is_valid = False
                            result.errors.append(FederalValidationError(
                                field='documents',
                                message=f'List A document is expired (expired: {exp_date})',
                                legal_code='USCIS-I9-EXPIRED-DOC',
                                severity='error',
                                compliance_note='Expired documents cannot be accepted for I-9 verification'
                            ))
                    except (ValueError, TypeError):
                        pass
            
            result.compliance_notes.append('I-9 Document validation: List A document provided (establishes both identity and employment authorization)')
            
        else:
            # Must have both List B AND List C
            if not list_b_docs:
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='documents',
                    message='FEDERAL COMPLIANCE VIOLATION: List B document required when not using List A',
                    legal_code='USCIS-I9-NO-LIST-B',
                    severity='error',
                    compliance_note='Must provide List B document (identity) when not using List A'
                ))
            
            if not list_c_docs:
                result.is_valid = False
                result.errors.append(FederalValidationError(
                    field='documents',
                    message='FEDERAL COMPLIANCE VIOLATION: List C document required when not using List A',
                    legal_code='USCIS-I9-NO-LIST-C',
                    severity='error',
                    compliance_note='Must provide List C document (employment authorization) when not using List A'
                ))
            
            if len(list_b_docs) > 1:
                result.warnings.append(FederalValidationError(
                    field='documents',
                    message='Multiple List B documents provided. Only one is required.',
                    legal_code='USCIS-I9-MULTIPLE-B',
                    severity='warning',
                    compliance_note='USCIS requires only one List B document'
                ))
            
            if len(list_c_docs) > 1:
                result.warnings.append(FederalValidationError(
                    field='documents',
                    message='Multiple List C documents provided. Only one is required.',
                    legal_code='USCIS-I9-MULTIPLE-C',
                    severity='warning',
                    compliance_note='USCIS requires only one List C document'
                ))
            
            # Check expiration for List B documents (most require expiration dates)
            for doc in list_b_docs:
                doc_type = doc.get('document_type', '').lower()
                if doc_type in ['drivers_license', 'state_id_card', 'us_military_card']:
                    if doc.get('expiration_date'):
                        try:
                            exp_date = datetime.strptime(doc['expiration_date'], '%Y-%m-%d').date()
                            if exp_date < date.today():
                                result.is_valid = False
                                result.errors.append(FederalValidationError(
                                    field='documents',
                                    message=f'List B document is expired (expired: {exp_date})',
                                    legal_code='USCIS-I9-EXPIRED-B',
                                    severity='error',
                                    compliance_note='Expired List B documents cannot be accepted'
                                ))
                        except (ValueError, TypeError):
                            pass
            
            if list_b_docs and list_c_docs:
                result.compliance_notes.append('I-9 Document validation: List B + List C documents provided (identity + employment authorization)')
        
        # Additional validation for specific document types
        for doc in documents:
            doc_type = doc.get('document_type', '').lower()
            
            # Social Security card specific validation
            if doc_type == 'social_security_card':
                if 'NOT VALID FOR EMPLOYMENT' in doc.get('ocr_text', '').upper():
                    result.is_valid = False
                    result.errors.append(FederalValidationError(
                        field='documents',
                        message='Social Security card marked "NOT VALID FOR EMPLOYMENT" cannot be accepted',
                        legal_code='USCIS-I9-SSN-RESTRICTED',
                        severity='error',
                        compliance_note='Restricted Social Security cards are not acceptable List C documents'
                    ))
            
            # Check for receipt documents (temporary)
            if 'receipt' in doc_type.lower():
                result.warnings.append(FederalValidationError(
                    field='documents',
                    message='Receipt for document provided. Actual document must be provided within 90 days',
                    legal_code='USCIS-I9-RECEIPT',
                    severity='warning',
                    compliance_note='Receipts are temporary - actual document required within 90 days per USCIS'
                ))
        
        if result.is_valid:
            result.compliance_notes.append('I-9 document combination meets federal USCIS requirements')
        
        return result
    
    @staticmethod
    def generate_compliance_audit_entry(
        form_type: str,
        validation_result: FederalValidationResult,
        user_info: Dict[str, Any]
    ) -> ComplianceAuditEntry:
        """Generate compliance audit trail entry"""
        legal_codes = []
        for error in validation_result.errors + validation_result.warnings:
            legal_codes.append(error.legal_code)
        
        audit_id = f"AUDIT_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(str(user_info.get('id', 'unknown')))}"[-20:]
        
        return ComplianceAuditEntry(
            timestamp=datetime.now().isoformat(),
            form_type=form_type,
            user_id=user_info.get('id', 'unknown'),
            user_email=user_info.get('email', 'unknown'),
            compliance_status='COMPLIANT' if validation_result.is_valid else 'NON_COMPLIANT',
            error_count=len(validation_result.errors),
            warning_count=len(validation_result.warnings),
            legal_codes=legal_codes,
            compliance_notes=validation_result.compliance_notes,
            audit_id=audit_id
        )