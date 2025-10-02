// Unified validation utility for consistent form validation across all onboarding forms
// This ensures consistent error handling and validation rules

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'email' | 'phone' | 'ssn' | 'zipCode' | 'date' | 'url' | 'number' | 'string';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: any, formData?: any) => string | null;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export class FormValidator {
  private static instance: FormValidator;
  
  static getInstance(): FormValidator {
    if (!FormValidator.instance) {
      FormValidator.instance = new FormValidator();
    }
    return FormValidator.instance;
  }

  // Standard validation patterns
  private readonly patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^\(\d{3}\)\s?\d{3}-?\d{4}$/,
    ssn: /^\d{3}-\d{2}-\d{4}$/,
    zipCode: /^\d{5}(-\d{4})?$/,
    url: /^https?:\/\/.+/
  };

  // Common validation messages
  private readonly messages = {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    phone: 'Please enter a valid phone number (XXX) XXX-XXXX',
    ssn: 'Please enter a valid SSN (XXX-XX-XXXX)',
    zipCode: 'Please enter a valid ZIP code',
    minLength: 'Must be at least {min} characters',
    maxLength: 'Must be no more than {max} characters',
    min: 'Must be at least {min}',
    max: 'Must be no more than {max}',
    date: 'Please enter a valid date',
    url: 'Please enter a valid URL',
    number: 'Please enter a valid number'
  };

  // Validate a single field
  validateField(value: any, rule: ValidationRule, formData?: any): string | null {
    // Check if required
    if (rule.required && this.isEmpty(value)) {
      return rule.message || this.messages.required;
    }

    // Skip other validations if field is empty and not required
    if (this.isEmpty(value) && !rule.required) {
      return null;
    }

    // Type-specific validation
    if (rule.type && !this.validateType(value, rule.type)) {
      return rule.message || (this.messages as any)[rule.type] || `Invalid ${rule.type}`;
    }

    // Length validation for strings
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return rule.message || this.messages.minLength.replace('{min}', rule.minLength.toString());
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return rule.message || this.messages.maxLength.replace('{max}', rule.maxLength.toString());
      }
    }

    // Numeric range validation
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return rule.message || this.messages.min.replace('{min}', rule.min.toString());
      }
      if (rule.max !== undefined && value > rule.max) {
        return rule.message || this.messages.max.replace('{max}', rule.max.toString());
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message || `Invalid format for ${rule.field}`;
    }

    // Custom validation
    if (rule.customValidator) {
      return rule.customValidator(value, formData);
    }

    return null;
  }

  // Validate entire form
  validateForm(formData: any, rules: ValidationRule[]): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    rules.forEach(rule => {
      const value = this.getNestedValue(formData, rule.field);
      const error = this.validateField(value, rule, formData);
      
      if (error) {
        errors[rule.field] = error;
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  // Helper methods
  private isEmpty(value: any): boolean {
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0);
  }

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'email':
        return typeof value === 'string' && this.patterns.email.test(value);
      case 'phone':
        return typeof value === 'string' && this.patterns.phone.test(value);
      case 'ssn':
        return typeof value === 'string' && this.patterns.ssn.test(value);
      case 'zipCode':
        return typeof value === 'string' && this.patterns.zipCode.test(value);
      case 'url':
        return typeof value === 'string' && this.patterns.url.test(value);
      case 'date':
        return !isNaN(Date.parse(value));
      case 'number':
        return !isNaN(Number(value));
      case 'string':
        return typeof value === 'string';
      default:
        return true;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Auto-format common field types
  formatField(value: string, type: string): string {
    switch (type) {
      case 'phone':
        return this.formatPhone(value);
      case 'ssn':
        return this.formatSSN(value);
      case 'zipCode':
        return this.formatZipCode(value);
      default:
        return value;
    }
  }

  private formatPhone(value: string): string {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  }

  private formatSSN(value: string): string {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 9)}`;
  }

  private formatZipCode(value: string): string {
    const numbers = value.replace(/\D/g, '').slice(0, 10);
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 9)}`;
  }
}

// Form-specific validation rule sets
export const ValidationRules = {
  personalInfo: [
    { field: 'firstName', required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
    { field: 'lastName', required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
    { field: 'middleInitial', required: false, type: 'string' as const, maxLength: 1 },
    { field: 'dateOfBirth', required: true, type: 'date' as const },
    { field: 'ssn', required: true, type: 'ssn' as const },
    { field: 'email', required: true, type: 'email' as const },
    { field: 'phone', required: true, type: 'phone' as const },
    { field: 'address', required: true, type: 'string' as const, minLength: 5, maxLength: 100 },
    { field: 'city', required: true, type: 'string' as const, minLength: 2, maxLength: 50 },
    { field: 'state', required: true, type: 'string' as const, minLength: 2, maxLength: 2 },
    { field: 'zipCode', required: true, type: 'zipCode' as const }
  ],

  i9Section1: [
    { field: 'employee_first_name', required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
    { field: 'employee_last_name', required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
    { field: 'date_of_birth', required: true, type: 'date' as const },
    { field: 'ssn', required: true, type: 'ssn' as const },
    { field: 'email', required: true, type: 'email' as const },
    { field: 'phone', required: true, type: 'phone' as const },
    { field: 'address_street', required: true, type: 'string' as const, minLength: 5, maxLength: 100 },
    { field: 'address_city', required: true, type: 'string' as const, minLength: 2, maxLength: 50 },
    { field: 'address_state', required: true, type: 'string' as const, minLength: 2, maxLength: 2 },
    { field: 'address_zip', required: true, type: 'zipCode' as const },
    { field: 'citizenship_status', required: true, type: 'string' as const }
  ],

  w4Form: [
    { field: 'first_name', required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
    { field: 'last_name', required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
    { field: 'address', required: true, type: 'string' as const, minLength: 5, maxLength: 100 },
    { field: 'city', required: true, type: 'string' as const, minLength: 2, maxLength: 50 },
    { field: 'state', required: true, type: 'string' as const, minLength: 2, maxLength: 2 },
    { field: 'zip_code', required: true, type: 'zipCode' as const },
    { field: 'ssn', required: true, type: 'ssn' as const },
    { field: 'filing_status', required: true, type: 'string' as const }
  ],

  directDeposit: [
    { field: 'primaryAccount.bankName', required: true, type: 'string' as const, minLength: 2, maxLength: 50 },
    { field: 'primaryAccount.routingNumber', required: true, type: 'string' as const, pattern: /^\d{9}$/, message: 'Routing number must be 9 digits' },
    { field: 'primaryAccount.accountNumber', required: true, type: 'string' as const, minLength: 4, maxLength: 20 },
    { field: 'primaryAccount.accountType', required: true, type: 'string' as const },
    { field: 'authorizeDeposit', required: true, customValidator: (value: any) => value === true ? null : 'Authorization is required' }
  ],

  emergencyContacts: [
    { field: 'primaryContact.name', required: true, type: 'string' as const, minLength: 2, maxLength: 100 },
    { field: 'primaryContact.relationship', required: true, type: 'string' as const },
    { field: 'primaryContact.phoneNumber', required: true, type: 'phone' as const }
  ],

  healthInsurance: [
    { field: 'employeeFirstName', required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
    { field: 'employeeLastName', required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
    { field: 'employeeDateOfBirth', required: true, type: 'date' as const }
  ]
};

// Utility function to get validation rules for a form type
export const getValidationRules = (formType: string): ValidationRule[] => {
  switch (formType) {
    case 'personal_info':
      return ValidationRules.personalInfo;
    case 'i9_section1':
      return ValidationRules.i9Section1;
    case 'w4_form':
      return ValidationRules.w4Form;
    case 'direct_deposit':
      return ValidationRules.directDeposit;
    case 'emergency_contacts':
      return ValidationRules.emergencyContacts;
    case 'health_insurance':
      return ValidationRules.healthInsurance;
    default:
      return [];
  }
};

// Cross-form validation utilities
export class CrossFormValidator {
  static validateDataConsistency(allFormData: Record<string, any>): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Check name consistency between forms
    const personalInfo = allFormData.personal_info;
    const i9Data = allFormData.i9_section1;
    const w4Data = allFormData.w4_form;

    if (personalInfo && i9Data) {
      if (personalInfo.firstName !== i9Data.employee_first_name) {
        warnings['name_consistency'] = 'First name differs between Personal Info and I-9 forms';
      }
      if (personalInfo.lastName !== i9Data.employee_last_name) {
        warnings['name_consistency'] = 'Last name differs between Personal Info and I-9 forms';
      }
    }

    if (personalInfo && w4Data) {
      if (personalInfo.firstName !== w4Data.first_name) {
        warnings['w4_name_consistency'] = 'First name differs between Personal Info and W-4 forms';
      }
      if (personalInfo.lastName !== w4Data.last_name) {
        warnings['w4_name_consistency'] = 'Last name differs between Personal Info and W-4 forms';
      }
    }

    // Check address consistency
    if (personalInfo && i9Data) {
      if (personalInfo.address !== i9Data.address_street) {
        warnings['address_consistency'] = 'Address differs between Personal Info and I-9 forms';
      }
    }

    // Check SSN consistency
    if (personalInfo && i9Data && personalInfo.ssn !== i9Data.ssn) {
      errors['ssn_consistency'] = 'SSN must be consistent across all forms';
    }

    if (personalInfo && w4Data && personalInfo.ssn !== w4Data.ssn) {
      errors['ssn_consistency'] = 'SSN must be consistent across all forms';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  static validateFormDependencies(formType: string, formData: any, allFormData: Record<string, any>): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Check if dependent forms have required data
    switch (formType) {
      case 'i9_section1':
        if (!allFormData.personal_info) {
          errors['dependency'] = 'Personal information must be completed first';
        }
        break;
      
      case 'w4_form':
        if (!allFormData.personal_info) {
          errors['dependency'] = 'Personal information must be completed first';
        }
        break;
      
      case 'health_insurance':
        if (!allFormData.personal_info) {
          errors['dependency'] = 'Personal information must be completed first';
        }
        if (formData.medical_tier?.includes('spouse') && !allFormData.w4_form?.filing_status?.includes('Married')) {
          warnings['spouse_coverage'] = 'Spouse coverage selected but filing status is not married';
        }
        break;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }
}

// Export default validator instance
export const formValidator = FormValidator.getInstance();