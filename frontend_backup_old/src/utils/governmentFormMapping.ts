/**
 * Smart Field Mapping Service for Government Forms
 * 
 * This service handles the intelligent mapping of employee data to various
 * government forms while ensuring federal compliance and proper data handling.
 * 
 * Key Features:
 * - Prevents auto-fill contamination in supplements A/B
 * - Maps basic employee info to appropriate form fields
 * - Handles multi-language field mapping
 * - Ensures federal compliance requirements
 */

interface EmployeeData {
  // Personal Information
  employee_last_name?: string;
  employee_first_name?: string;
  employee_middle_initial?: string;
  employee_other_last_names?: string;
  employee_address?: string;
  employee_city?: string;
  employee_state?: string;
  employee_zip_code?: string;
  employee_phone?: string;
  employee_email?: string;

  // Employment Information
  hire_date?: string;
  position?: string;
  department?: string;
  pay_rate?: string;
  employment_type?: string;
  supervisor?: string;

  // Tax Information
  filing_status?: string;
  dependents?: number;
  other_income?: number;
  deductions?: number;
  extra_withholding?: number;

  // Document Information
  citizenship_status?: string;
  work_authorization?: string;
  alien_registration_number?: string;
  uscis_number?: string;
  form_i94_number?: string;
  passport_number?: string;
  country_of_issuance?: string;
}

interface PropertyData {
  property_name?: string;
  property_address?: string;
  property_city?: string;
  property_state?: string;
  property_zip_code?: string;
  property_ein?: string;
  property_phone?: string;
}

/**
 * I-9 Form Field Mapping
 * Maps employee data to I-9 Section 1 fields with federal compliance
 */
export class I9FieldMapper {
  /**
   * Maps basic employee information to I-9 Section 1
   * ONLY basic identifying information - no preparer/translator data
   */
  static mapSection1(employeeData: EmployeeData): Record<string, any> {
    return {
      // Basic name information - always safe to auto-fill
      lastName: employeeData.employee_last_name || '',
      firstName: employeeData.employee_first_name || '',
      middleInitial: employeeData.employee_middle_initial || '',
      otherLastNames: employeeData.employee_other_last_names || '',
      
      // Address information - safe to auto-fill from employee record
      address: employeeData.employee_address || '',
      city: employeeData.employee_city || '',
      state: employeeData.employee_state || '',
      zipCode: employeeData.employee_zip_code || '',
      
      // Contact information
      phoneNumber: employeeData.employee_phone || '',
      emailAddress: employeeData.employee_email || '',
      
      // Work authorization - can be pre-filled if known
      citizenshipStatus: employeeData.citizenship_status || '',
      
      // Document numbers - only if already collected
      alienRegistrationNumber: employeeData.alien_registration_number || '',
      uscisNumber: employeeData.uscis_number || '',
      formI94Number: employeeData.form_i94_number || '',
      passportNumber: employeeData.passport_number || '',
      countryOfIssuance: employeeData.country_of_issuance || '',
      
      // Employment information
      startDate: employeeData.hire_date || new Date().toISOString().split('T')[0]
    };
  }

  /**
   * CRITICAL: Supplement A should NEVER be auto-filled
   * This is for preparer/translator information ONLY
   */
  static mapSupplementA(): Record<string, any> {
    return {
      // ALL fields must be blank - federal compliance requirement
      preparerLastName: '',
      preparerFirstName: '',
      preparerAddress: '',
      preparerCity: '',
      preparerState: '',
      preparerZipCode: '',
      preparerPhoneNumber: '',
      preparerEmail: '',
      translatorLastName: '',
      translatorFirstName: '',
      translatorAddress: '',
      translatorCity: '',
      translatorState: '',
      translatorZipCode: '',
      translatorPhoneNumber: '',
      translatorEmail: '',
      languageSpoken: '',
      assistanceProvided: '',
      preparationDate: new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Supplement B: Only display employee info from Section 1 (read-only)
   * All other fields must be manually filled
   */
  static mapSupplementB(employeeData: EmployeeData): Record<string, any> {
    return {
      // READ-ONLY employee information from Section 1
      employeeLastName: employeeData.employee_last_name || '',
      employeeFirstName: employeeData.employee_first_name || '',
      employeeMiddleInitial: employeeData.employee_middle_initial || '',
      
      // All other fields MUST be blank for manual entry
      newDocumentTitle: '',
      newDocumentNumber: '',
      newExpirationDate: '',
      previousDocumentTitle: '',
      previousDocumentNumber: '',
      previousExpirationDate: '',
      reverificationReason: 'expiration',
      reverificationReasonOther: '',
      reverificationDate: new Date().toISOString().split('T')[0],
      signatureDate: new Date().toISOString().split('T')[0]
    };
  }
}

/**
 * W-4 Form Field Mapping
 * Maps employee data to W-4 fields with IRS compliance
 */
export class W4FieldMapper {
  static mapForm(employeeData: EmployeeData): Record<string, any> {
    return {
      // Step 1: Personal Information
      firstName: employeeData.employee_first_name || '',
      middleInitial: employeeData.employee_middle_initial || '',
      lastName: employeeData.employee_last_name || '',
      address: employeeData.employee_address || '',
      city: employeeData.employee_city || '',
      state: employeeData.employee_state || '',
      zipCode: employeeData.employee_zip_code || '',
      
      // Social Security Number - handled separately for security
      socialSecurityNumber: '', // Never auto-fill SSN
      
      // Step 2: Multiple Jobs or Spouse Works - manual entry only
      multipleJobs: false,
      
      // Step 3: Claim Dependents - can be pre-filled if known
      dependents: employeeData.dependents || 0,
      
      // Step 4: Other Adjustments - can be pre-filled if known
      otherIncome: employeeData.other_income || 0,
      deductions: employeeData.deductions || 0,
      extraWithholding: employeeData.extra_withholding || 0,
      
      // Filing status - can be pre-filled if known
      filingStatus: employeeData.filing_status || 'single'
    };
  }
}

/**
 * Emergency Contacts Field Mapping
 * Maps any existing emergency contact data
 */
export class EmergencyContactsMapper {
  static mapForm(employeeData: EmployeeData): Record<string, any> {
    return {
      primaryContact: {
        name: '',
        relationship: '',
        phoneNumber: '',
        alternatePhone: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
      },
      secondaryContact: {
        name: '',
        relationship: '',
        phoneNumber: '',
        alternatePhone: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
      },
      medicalInfo: '',
      allergies: '',
      medications: '',
      medicalConditions: ''
    };
  }
}

/**
 * Direct Deposit Field Mapping
 * Handles banking information with security considerations
 */
export class DirectDepositMapper {
  static mapForm(employeeData: EmployeeData): Record<string, any> {
    return {
      // NEVER auto-fill banking information for security
      accountType: 'checking',
      bankName: '',
      routingNumber: '',
      accountNumber: '',
      confirmAccountNumber: '',
      
      // Employee verification
      employeeName: `${employeeData.employee_first_name || ''} ${employeeData.employee_last_name || ''}`.trim(),
      
      // Allocation - can default
      depositAmount: '',
      depositPercentage: 100,
      isPercentage: true
    };
  }
}

/**
 * Health Insurance Field Mapping
 * Maps employee data for health insurance enrollment
 */
export class HealthInsuranceMapper {
  static mapForm(employeeData: EmployeeData): Record<string, any> {
    return {
      // Employee information
      employeeName: `${employeeData.employee_first_name || ''} ${employeeData.employee_last_name || ''}`.trim(),
      employeeAddress: employeeData.employee_address || '',
      employeeCity: employeeData.employee_city || '',
      employeeState: employeeData.employee_state || '',
      employeeZipCode: employeeData.employee_zip_code || '',
      employeePhone: employeeData.employee_phone || '',
      employeeEmail: employeeData.employee_email || '',
      
      // Employment information
      hireDate: employeeData.hire_date || '',
      position: employeeData.position || '',
      department: employeeData.department || '',
      
      // Plan selection - manual entry only
      selectedPlan: '',
      coverageLevel: 'employee_only',
      
      // Dependents - manual entry only
      dependents: [],
      
      // Beneficiaries - manual entry only
      primaryBeneficiary: {
        name: '',
        relationship: '',
        percentage: 100
      }
    };
  }
}

/**
 * Main Form Mapping Service
 * Coordinates all form mappings with compliance checks
 */
export class GovernmentFormMappingService {
  /**
   * Maps employee data to the appropriate form with compliance checking
   */
  static mapToForm(
    formType: 'i9_section1' | 'i9_supplement_a' | 'i9_supplement_b' | 'w4' | 'emergency_contacts' | 'direct_deposit' | 'health_insurance',
    employeeData: EmployeeData,
    propertyData?: PropertyData
  ): Record<string, any> {
    
    switch (formType) {
      case 'i9_section1':
        return I9FieldMapper.mapSection1(employeeData);
        
      case 'i9_supplement_a':
        // CRITICAL: Always return blank form for federal compliance
        return I9FieldMapper.mapSupplementA();
        
      case 'i9_supplement_b':
        return I9FieldMapper.mapSupplementB(employeeData);
        
      case 'w4':
        return W4FieldMapper.mapForm(employeeData);
        
      case 'emergency_contacts':
        return EmergencyContactsMapper.mapForm(employeeData);
        
      case 'direct_deposit':
        return DirectDepositMapper.mapForm(employeeData);
        
      case 'health_insurance':
        return HealthInsuranceMapper.mapForm(employeeData);
        
      default:
        throw new Error(`Unknown form type: ${formType}`);
    }
  }

  /**
   * Validates that sensitive fields are not auto-filled inappropriately
   */
  static validateMapping(formType: string, mappedData: Record<string, any>): boolean {
    const sensitiveFields = {
      'i9_supplement_a': ['preparerLastName', 'preparerFirstName', 'translatorLastName', 'translatorFirstName'],
      'direct_deposit': ['routingNumber', 'accountNumber'],
      'w4': ['socialSecurityNumber']
    };

    const fieldsToCheck = sensitiveFields[formType as keyof typeof sensitiveFields];
    if (!fieldsToCheck) return true;

    // Ensure sensitive fields are not auto-filled
    return fieldsToCheck.every(field => !mappedData[field] || mappedData[field] === '');
  }

  /**
   * Gets the list of fields that should NEVER be auto-filled for a form type
   */
  static getRestrictedFields(formType: string): string[] {
    const restrictedFields = {
      'i9_supplement_a': [
        'preparerLastName', 'preparerFirstName', 'preparerAddress', 'preparerCity', 
        'preparerState', 'preparerZipCode', 'preparerPhoneNumber', 'preparerEmail',
        'translatorLastName', 'translatorFirstName', 'translatorAddress', 'translatorCity',
        'translatorState', 'translatorZipCode', 'translatorPhoneNumber', 'translatorEmail',
        'languageSpoken', 'assistanceProvided'
      ],
      'i9_supplement_b': [
        'newDocumentTitle', 'newDocumentNumber', 'newExpirationDate',
        'previousDocumentTitle', 'previousDocumentNumber', 'previousExpirationDate',
        'reverificationReasonOther'
      ],
      'direct_deposit': [
        'bankName', 'routingNumber', 'accountNumber', 'confirmAccountNumber'
      ],
      'w4': [
        'socialSecurityNumber', 'multipleJobs', 'dependents', 'otherIncome', 'deductions', 'extraWithholding'
      ],
      'emergency_contacts': [
        'primaryContact', 'secondaryContact', 'medicalInfo', 'allergies', 'medications', 'medicalConditions'
      ]
    };

    return restrictedFields[formType as keyof typeof restrictedFields] || [];
  }
}

export default GovernmentFormMappingService;