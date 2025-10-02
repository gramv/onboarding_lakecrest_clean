/**
 * Federal Compliance Validation Utilities
 * 
 * CRITICAL: This module implements federal employment law compliance validations
 * required to prevent legal liability in hotel employee onboarding system.
 * 
 * All validations must meet federal standards exactly as specified by:
 * - U.S. Department of Labor
 * - Internal Revenue Service (IRS)
 * - U.S. Citizenship and Immigration Services (USCIS)
 * - Equal Employment Opportunity Commission (EEOC)
 */

/**
 * Federal validation error types with legal compliance messages
 */
export interface FederalValidationError {
  field: string;
  message: string;
  legalCode: string;
  severity: 'error' | 'warning' | 'info';
  complianceNote?: string;
}

/**
 * Federal validation result
 */
export interface FederalValidationResult {
  isValid: boolean;
  errors: FederalValidationError[];
  warnings: FederalValidationError[];
  complianceNotes: string[];
}

/**
 * Age validation - CRITICAL FEDERAL REQUIREMENT
 * Federal law prohibits employment of individuals under 18 in most hotel positions
 * 
 * Reference: Fair Labor Standards Act (FLSA) 29 U.S.C. § 203
 */
export function validateAge(dateOfBirth: string): FederalValidationResult {
  const result: FederalValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    complianceNotes: []
  };

  if (!dateOfBirth) {
    result.isValid = false;
    result.errors.push({
      field: 'dateOfBirth',
      message: 'Date of birth is required for federal employment eligibility verification',
      legalCode: 'FLSA-203',
      severity: 'error',
      complianceNote: 'Required under Fair Labor Standards Act for age verification'
    });
    return result;
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Adjust age if birthday hasn't occurred this year
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
    ? age - 1 
    : age;

  if (actualAge < 18) {
    result.isValid = false;
    result.errors.push({
      field: 'dateOfBirth',
      message: `FEDERAL COMPLIANCE VIOLATION: Applicant must be at least 18 years old. Current age: ${actualAge}`,
      legalCode: 'FLSA-203-CHILD-LABOR',
      severity: 'error',
      complianceNote: 'Employment of individuals under 18 in hotel positions may violate federal child labor laws. Special work permits and restricted hours may be required. Consult legal counsel immediately.'
    });
  } else if (actualAge < 21) {
    result.warnings.push({
      field: 'dateOfBirth',
      message: `Employee is ${actualAge} years old. Alcohol service restrictions may apply.`,
      legalCode: 'FLSA-203-MINOR',
      severity: 'warning',
      complianceNote: 'Employees under 21 cannot serve or handle alcoholic beverages in most jurisdictions'
    });
  }

  // Add compliance note for all valid ages
  if (result.isValid) {
    result.complianceNotes.push(
      `Age verification completed: ${actualAge} years old. Meets federal minimum age requirements.`
    );
  }

  return result;
}

/**
 * Social Security Number validation - FEDERAL REQUIREMENT
 * Must meet IRS and SSA format requirements exactly
 * 
 * Reference: 26 U.S.C. § 3401 (IRS), 42 U.S.C. § 405 (SSA)
 */
export function validateSSN(ssn: string): FederalValidationResult {
  const result: FederalValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    complianceNotes: []
  };

  if (!ssn) {
    result.isValid = false;
    result.errors.push({
      field: 'ssn',
      message: 'Social Security Number is required for federal tax withholding and employment verification',
      legalCode: 'IRC-3401-SSN',
      severity: 'error',
      complianceNote: 'Required under Internal Revenue Code Section 3401 for payroll tax withholding'
    });
    return result;
  }

  // Remove formatting characters
  const cleanSSN = ssn.replace(/[-\s]/g, '');

  // Must be exactly 9 digits
  if (!/^\d{9}$/.test(cleanSSN)) {
    result.isValid = false;
    result.errors.push({
      field: 'ssn',
      message: 'SSN must be exactly 9 digits in format XXX-XX-XXXX',
      legalCode: 'SSA-405-FORMAT',
      severity: 'error',
      complianceNote: 'Social Security Administration requires 9-digit format'
    });
    return result;
  }

  // Federal prohibited SSN patterns
  const area = cleanSSN.substring(0, 3);
  const group = cleanSSN.substring(3, 5);
  const serial = cleanSSN.substring(5, 9);

  // Invalid area numbers (000, 666, 900-999)
  if (area === '000' || area === '666' || parseInt(area) >= 900) {
    result.isValid = false;
    result.errors.push({
      field: 'ssn',
      message: `Invalid SSN area number: ${area}. This SSN format is not issued by the Social Security Administration`,
      legalCode: 'SSA-405-INVALID-AREA',
      severity: 'error',
      complianceNote: 'SSN area numbers 000, 666, and 900-999 are never issued'
    });
    return result;
  }

  // Invalid group number (00)
  if (group === '00') {
    result.isValid = false;
    result.errors.push({
      field: 'ssn',
      message: 'Invalid SSN group number: 00. Group number cannot be 00',
      legalCode: 'SSA-405-INVALID-GROUP',
      severity: 'error',
      complianceNote: 'SSN group number 00 is never issued'
    });
    return result;
  }

  // Invalid serial number (0000)
  if (serial === '0000') {
    result.isValid = false;
    result.errors.push({
      field: 'ssn',
      message: 'Invalid SSN serial number: 0000. Serial number cannot be 0000',
      legalCode: 'SSA-405-INVALID-SERIAL',
      severity: 'error',
      complianceNote: 'SSN serial number 0000 is never issued'
    });
    return result;
  }

  // Known advertising/placeholder SSNs
  const knownInvalidSSNs = [
    '123456789', '111111111', '222222222', '333333333', '444444444',
    '555555555', '777777777', '888888888', '999999999', '078051120',
    '219099999', '457555462'
  ];

  if (knownInvalidSSNs.includes(cleanSSN)) {
    result.isValid = false;
    result.errors.push({
      field: 'ssn',
      message: 'This SSN is a known invalid/placeholder number and cannot be used for employment',
      legalCode: 'SSA-405-PLACEHOLDER',
      severity: 'error',
      complianceNote: 'Placeholder SSNs used in advertising or examples are not valid for employment'
    });
    return result;
  }

  result.complianceNotes.push('SSN format validation passed - meets federal requirements');
  return result;
}

/**
 * I-9 Section 1 validation - FEDERAL IMMIGRATION COMPLIANCE
 * Must meet USCIS requirements exactly as specified in Form I-9 instructions
 * 
 * Reference: 8 U.S.C. § 1324a, 8 CFR § 274a
 */
export function validateI9Section1(formData: any): FederalValidationResult {
  const result: FederalValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    complianceNotes: []
  };

  // Required fields validation
  const requiredFields = [
    { field: 'employee_last_name', message: 'Last name is required for I-9 compliance' },
    { field: 'employee_first_name', message: 'First name is required for I-9 compliance' },
    { field: 'address_street', message: 'Street address is required for I-9 compliance' },
    { field: 'address_city', message: 'City is required for I-9 compliance' },
    { field: 'address_state', message: 'State is required for I-9 compliance' },
    { field: 'address_zip', message: 'ZIP code is required for I-9 compliance' },
    { field: 'date_of_birth', message: 'Date of birth is required for I-9 compliance' },
    { field: 'ssn', message: 'SSN is required for I-9 compliance' },
    { field: 'email', message: 'Email is required for I-9 compliance' },
    { field: 'phone', message: 'Phone number is required for I-9 compliance' },
    { field: 'citizenship_status', message: 'Citizenship status is required for I-9 compliance' },
    { field: 'employee_signature_date', message: 'Employee signature date is required for I-9 compliance' },
    { field: 'employee_attestation', message: 'Employee attestation is required for I-9 compliance' }
  ];

  for (const req of requiredFields) {
    if (!formData[req.field] || formData[req.field].toString().trim() === '') {
      result.isValid = false;
      result.errors.push({
        field: req.field,
        message: req.message,
        legalCode: 'INA-274A-REQUIRED',
        severity: 'error',
        complianceNote: 'Required under Immigration and Nationality Act Section 274A'
      });
    }
  }

  // Citizenship status validation
  const validCitizenshipStatuses = [
    'us_citizen',
    'noncitizen_national', 
    'permanent_resident',
    'authorized_alien'
  ];

  if (formData.citizenship_status && 
      !validCitizenshipStatuses.includes(formData.citizenship_status)) {
    result.isValid = false;
    result.errors.push({
      field: 'citizenship_status',
      message: 'Invalid citizenship status selected',
      legalCode: 'INA-274A-STATUS',
      severity: 'error',
      complianceNote: 'Must select one of the four federal citizenship/work authorization categories'
    });
  }

  // Additional validation for non-citizens
  if (formData.citizenship_status === 'permanent_resident') {
    if (!formData.uscis_number && !formData.i94_admission_number) {
      result.isValid = false;
      result.errors.push({
        field: 'uscis_number',
        message: 'USCIS Number or I-94 Admission Number is required for permanent residents',
        legalCode: 'INA-274A-DOCUMENT',
        severity: 'error',
        complianceNote: 'Permanent residents must provide USCIS Number or I-94 Admission Number'
      });
    }
  }

  if (formData.citizenship_status === 'authorized_alien') {
    if (!formData.uscis_number && !formData.i94_admission_number && !formData.passport_number) {
      result.isValid = false;
      result.errors.push({
        field: 'uscis_number',
        message: 'At least one identification number is required for authorized aliens',
        legalCode: 'INA-274A-ALIEN-ID',
        severity: 'error',
        complianceNote: 'Must provide USCIS Number, I-94 Number, or Passport Number'
      });
    }

    if (!formData.work_authorization_expiration) {
      result.isValid = false;
      result.errors.push({
        field: 'work_authorization_expiration',
        message: 'Work authorization expiration date is required for authorized aliens',
        legalCode: 'INA-274A-EXPIRATION',
        severity: 'error',
        complianceNote: 'Required to verify ongoing work authorization status'
      });
    } else {
      // Check if work authorization is expired
      const expDate = new Date(formData.work_authorization_expiration);
      const today = new Date();
      
      if (expDate <= today) {
        result.isValid = false;
        result.errors.push({
          field: 'work_authorization_expiration',
          message: 'Work authorization has expired. Cannot proceed with employment',
          legalCode: 'INA-274A-EXPIRED',
          severity: 'error',
          complianceNote: 'Expired work authorization prohibits legal employment'
        });
      } else if (expDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        result.warnings.push({
          field: 'work_authorization_expiration',
          message: 'Work authorization expires within 30 days. Renewal documentation may be needed',
          legalCode: 'INA-274A-EXPIRING',
          severity: 'warning',
          complianceNote: 'Early renewal recommended to avoid employment interruption'
        });
      }
    }
  }

  // Age validation for I-9
  if (formData.date_of_birth) {
    const ageValidation = validateAge(formData.date_of_birth);
    result.errors.push(...ageValidation.errors);
    result.warnings.push(...ageValidation.warnings);
    if (!ageValidation.isValid) {
      result.isValid = false;
    }
  }

  // SSN validation for I-9
  if (formData.ssn) {
    const ssnValidation = validateSSN(formData.ssn);
    result.errors.push(...ssnValidation.errors);
    result.warnings.push(...ssnValidation.warnings);
    if (!ssnValidation.isValid) {
      result.isValid = false;
    }
  }

  // ZIP code validation
  if (formData.address_zip && !/^\d{5}(-\d{4})?$/.test(formData.address_zip)) {
    result.isValid = false;
    result.errors.push({
      field: 'address_zip',
      message: 'ZIP code must be in format 12345 or 12345-6789',
      legalCode: 'USPS-ZIP-FORMAT',
      severity: 'error',
      complianceNote: 'Must use valid US Postal Service ZIP code format'
    });
  }

  // Email validation
  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    result.isValid = false;
    result.errors.push({
      field: 'email',
      message: 'Valid email address is required',
      legalCode: 'CONTACT-EMAIL-FORMAT',
      severity: 'error',
      complianceNote: 'Required for employment communications and compliance notices'
    });
  }

  // Phone validation
  if (formData.phone) {
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      result.isValid = false;
      result.errors.push({
        field: 'phone',
        message: 'Phone number must be 10 digits',
        legalCode: 'CONTACT-PHONE-FORMAT',
        severity: 'error',
        complianceNote: 'Required for employment communications and emergency contact'
      });
    }
  }

  // Employee signature date validation (8 CFR § 274a.2)
  if (formData.employee_signature_date) {
    const signatureDate = new Date(formData.employee_signature_date);
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Reset time components for accurate date comparison
    signatureDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    if (signatureDate > today) {
      result.isValid = false;
      result.errors.push({
        field: 'employee_signature_date',
        message: 'Employee signature date cannot be in the future',
        legalCode: 'CFR-274A-SIGNATURE-DATE-FUTURE',
        severity: 'error',
        complianceNote: 'Federal regulation 8 CFR § 274a.2 prohibits future-dated signatures on Form I-9'
      });
    } else if (signatureDate < sevenDaysAgo) {
      result.isValid = false;
      result.errors.push({
        field: 'employee_signature_date',
        message: 'Employee signature date must be within 7 days of completion',
        legalCode: 'CFR-274A-SIGNATURE-DATE-STALE',
        severity: 'error',
        complianceNote: 'Federal regulation requires employee signature to be current and within reasonable timeframe'
      });
    }
  }
  
  // Employee attestation validation
  if (!formData.employee_attestation) {
    result.isValid = false;
    result.errors.push({
      field: 'employee_attestation',
      message: 'Employee must attest to truthfulness under penalty of perjury',
      legalCode: 'USC-1546-FALSE-STATEMENTS',
      severity: 'error',
      complianceNote: 'Required under 18 U.S.C. § 1546 - false statements are punishable by up to 10 years imprisonment'
    });
  }

  if (result.isValid) {
    result.complianceNotes.push('I-9 Section 1 validation completed - meets federal immigration compliance requirements');
  }

  return result;
}

/**
 * W-4 Form validation - FEDERAL TAX COMPLIANCE
 * Must meet IRS requirements exactly as specified in Publication 15
 * 
 * Reference: 26 U.S.C. § 3402, IRS Publication 15
 */
export function validateW4Form(formData: any): FederalValidationResult {
  const result: FederalValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    complianceNotes: []
  };

  // Required fields validation
  const requiredFields = [
    { field: 'first_name', message: 'First name is required for W-4 tax withholding' },
    { field: 'last_name', message: 'Last name is required for W-4 tax withholding' },
    { field: 'address', message: 'Address is required for W-4 tax withholding' },
    { field: 'city', message: 'City is required for W-4 tax withholding' },
    { field: 'state', message: 'State is required for W-4 tax withholding' },
    { field: 'zip_code', message: 'ZIP code is required for W-4 tax withholding' },
    { field: 'ssn', message: 'SSN is required for W-4 tax withholding' },
    { field: 'filing_status', message: 'Filing status is required for W-4 tax withholding' },
    { field: 'signature', message: 'Employee signature is required for W-4 validity' },
    { field: 'signature_date', message: 'Signature date is required for W-4 validity' }
  ];

  for (const req of requiredFields) {
    if (!formData[req.field] || formData[req.field].toString().trim() === '') {
      result.isValid = false;
      result.errors.push({
        field: req.field,
        message: req.message,
        legalCode: 'IRC-3402-REQUIRED',
        severity: 'error',
        complianceNote: 'Required under Internal Revenue Code Section 3402 for federal tax withholding'
      });
    }
  }

  // Filing status validation
  const validFilingStatuses = [
    'Single',
    'Married filing jointly',
    'Head of household'
  ];

  if (formData.filing_status && !validFilingStatuses.includes(formData.filing_status)) {
    result.isValid = false;
    result.errors.push({
      field: 'filing_status',
      message: 'Invalid filing status selected',
      legalCode: 'IRC-3402-FILING-STATUS',
      severity: 'error',
      complianceNote: 'Must use IRS-approved filing status categories'
    });
  }

  // SSN validation for W-4
  if (formData.ssn) {
    const ssnValidation = validateSSN(formData.ssn);
    result.errors.push(...ssnValidation.errors);
    result.warnings.push(...ssnValidation.warnings);
    if (!ssnValidation.isValid) {
      result.isValid = false;
    }
  }

  // ZIP code validation
  if (formData.zip_code && !/^\d{5}(-\d{4})?$/.test(formData.zip_code)) {
    result.isValid = false;
    result.errors.push({
      field: 'zip_code',
      message: 'ZIP code must be in format 12345 or 12345-6789',
      legalCode: 'USPS-ZIP-FORMAT',
      severity: 'error',
      complianceNote: 'Must use valid US Postal Service ZIP code format for tax purposes'
    });
  }

  // Numerical field validation
  const numericalFields = [
    'dependents_amount',
    'other_credits', 
    'other_income',
    'deductions',
    'extra_withholding'
  ];

  for (const field of numericalFields) {
    if (formData[field] !== undefined && formData[field] !== null) {
      const value = parseFloat(formData[field]);
      if (isNaN(value) || value < 0) {
        result.isValid = false;
        result.errors.push({
          field: field,
          message: `${field.replace(/_/g, ' ')} must be a non-negative number`,
          legalCode: 'IRC-3402-AMOUNT',
          severity: 'error',
          complianceNote: 'All monetary amounts must be valid non-negative numbers'
        });
      }
    }
  }

  // Signature date validation
  if (formData.signature_date) {
    const signatureDate = new Date(formData.signature_date);
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (signatureDate > today) {
      result.isValid = false;
      result.errors.push({
        field: 'signature_date',
        message: 'Signature date cannot be in the future',
        legalCode: 'IRC-3402-DATE-FUTURE',
        severity: 'error',
        complianceNote: 'W-4 signature date must be current or historical'
      });
    } else if (signatureDate < thirtyDaysAgo) {
      result.warnings.push({
        field: 'signature_date',
        message: 'W-4 signature date is more than 30 days old. Consider requesting updated form',
        legalCode: 'IRC-3402-DATE-OLD',
        severity: 'warning',
        complianceNote: 'IRS recommends current W-4 forms for accurate withholding'
      });
    }
  }

  if (result.isValid) {
    result.complianceNotes.push('W-4 validation completed - meets federal tax withholding compliance requirements');
  }

  return result;
}

/**
 * Comprehensive federal compliance validation
 * Validates all forms together for complete compliance check
 */
export function validateFederalCompliance(personalInfo: any, i9Data: any, w4Data: any): FederalValidationResult {
  const result: FederalValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    complianceNotes: []
  };

  // Age validation (critical)
  if (personalInfo?.dateOfBirth) {
    const ageValidation = validateAge(personalInfo.dateOfBirth);
    result.errors.push(...ageValidation.errors);
    result.warnings.push(...ageValidation.warnings);
    result.complianceNotes.push(...ageValidation.complianceNotes);
    if (!ageValidation.isValid) {
      result.isValid = false;
    }
  }

  // I-9 validation
  if (i9Data) {
    const i9Validation = validateI9Section1(i9Data);
    result.errors.push(...i9Validation.errors);
    result.warnings.push(...i9Validation.warnings);
    result.complianceNotes.push(...i9Validation.complianceNotes);
    if (!i9Validation.isValid) {
      result.isValid = false;
    }
  }

  // W-4 validation
  if (w4Data) {
    const w4Validation = validateW4Form(w4Data);
    result.errors.push(...w4Validation.errors);
    result.warnings.push(...w4Validation.warnings);
    result.complianceNotes.push(...w4Validation.complianceNotes);
    if (!w4Validation.isValid) {
      result.isValid = false;
    }
  }

  // Cross-form validation (ensure consistency)
  if (personalInfo && i9Data) {
    // Name consistency
    if (personalInfo.firstName !== i9Data.employee_first_name ||
        personalInfo.lastName !== i9Data.employee_last_name) {
      result.warnings.push({
        field: 'name_consistency',
        message: 'Name differences detected between personal info and I-9 form',
        legalCode: 'CONSISTENCY-NAME',
        severity: 'warning',
        complianceNote: 'Names should match across all forms for compliance'
      });
    }

    // SSN consistency
    if (personalInfo.ssn && i9Data.ssn && personalInfo.ssn !== i9Data.ssn) {
      result.isValid = false;
      result.errors.push({
        field: 'ssn_consistency',
        message: 'SSN mismatch between personal info and I-9 form',
        legalCode: 'CONSISTENCY-SSN',
        severity: 'error',
        complianceNote: 'SSN must be consistent across all forms for federal compliance'
      });
    }
  }

  if (personalInfo && w4Data) {
    // Name consistency
    if (personalInfo.firstName !== w4Data.first_name ||
        personalInfo.lastName !== w4Data.last_name) {
      result.warnings.push({
        field: 'name_consistency_w4',
        message: 'Name differences detected between personal info and W-4 form',
        legalCode: 'CONSISTENCY-NAME-W4',
        severity: 'warning',
        complianceNote: 'Names should match across all forms for tax compliance'
      });
    }

    // SSN consistency
    if (personalInfo.ssn && w4Data.ssn && personalInfo.ssn !== w4Data.ssn) {
      result.isValid = false;
      result.errors.push({
        field: 'ssn_consistency_w4',
        message: 'SSN mismatch between personal info and W-4 form',
        legalCode: 'CONSISTENCY-SSN-W4',
        severity: 'error',
        complianceNote: 'SSN must be consistent across all forms for tax compliance'
      });
    }
  }

  if (result.isValid) {
    result.complianceNotes.push('FEDERAL COMPLIANCE VERIFIED: All forms meet federal employment law requirements');
  } else {
    result.complianceNotes.push('FEDERAL COMPLIANCE FAILURE: Critical violations detected that must be resolved before employment can proceed');
  }

  return result;
}

/**
 * Format SSN for display with proper masking for security
 */
export function formatSSNForDisplay(ssn: string, maskFull: boolean = false): string {
  if (!ssn) return '';
  
  const clean = ssn.replace(/\D/g, '');
  if (clean.length !== 9) return ssn; // Return as-is if invalid format
  
  if (maskFull) {
    return 'XXX-XX-XXXX';
  }
  
  // Show only last 4 digits
  return `XXX-XX-${clean.slice(-4)}`;
}

/**
 * Generate compliance audit trail entry
 */
export function generateComplianceAuditEntry(
  formType: string,
  validationResult: FederalValidationResult,
  userInfo: any
): any {
  return {
    timestamp: new Date().toISOString(),
    formType,
    userId: userInfo.id,
    userEmail: userInfo.email,
    complianceStatus: validationResult.isValid ? 'COMPLIANT' : 'NON_COMPLIANT',
    errorCount: validationResult.errors.length,
    warningCount: validationResult.warnings.length,
    legalCodes: [...validationResult.errors, ...validationResult.warnings].map(e => e.legalCode),
    complianceNotes: validationResult.complianceNotes,
    auditId: `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.toUpperCase()
  };
}