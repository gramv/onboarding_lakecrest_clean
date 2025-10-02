/**
 * Form Validation System
 * 
 * Provides comprehensive validation for all form components
 * with real-time feedback and federal compliance checking.
 */

import { 
  ValidationResult, 
  ValidationRule, 
  ValidationTrigger,
  BaseFormData 
} from '@/types/form';
import { validateAge, validateSSN, validateEmail, validatePhone } from './federalValidation';

/**
 * Form validator class
 * Provides consistent validation across all forms
 */
export class FormValidator {
  private static instance: FormValidator;
  private validationCache = new Map<string, ValidationResult>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Get singleton instance
   */
  public static getInstance(): FormValidator {
    if (!FormValidator.instance) {
      FormValidator.instance = new FormValidator();
    }
    return FormValidator.instance;
  }

  /**
   * Validate form data against rules
   */
  public validateForm<T extends BaseFormData>(
    data: T,
    rules: ValidationRule[],
    trigger: ValidationTrigger = 'change'
  ): ValidationResult {
    const cacheKey = this.getCacheKey(data, rules);
    
    // Check cache for performance
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const result: ValidationResult = {
      isValid: true,
      errors: {},
      warnings: {},
      federalErrors: [],
      federalWarnings: []
    };

    // Validate each field
    for (const rule of rules) {
      const fieldValue = data[rule.field as keyof T];
      const fieldResult = this.validateField(fieldValue, rule, data);
      
      if (!fieldResult.isValid) {
        result.isValid = false;
        result.errors[rule.field] = fieldResult.message;
      }
      
      if (fieldResult.warning) {
        result.warnings[rule.field] = fieldResult.warning;
      }

      // Check for federal compliance
      const federalCheck = this.checkFederalCompliance(rule.field, fieldValue);
      if (federalCheck.errors.length > 0) {
        result.federalErrors!.push(...federalCheck.errors);
        result.isValid = false;
      }
      if (federalCheck.warnings.length > 0) {
        result.federalWarnings!.push(...federalCheck.warnings);
      }
    }

    // Cache the result
    this.validationCache.set(cacheKey, result);
    
    // Clear cache after 1 second to prevent stale data
    setTimeout(() => this.validationCache.delete(cacheKey), 1000);

    return result;
  }

  /**
   * Validate a single field
   */
  private validateField<T extends BaseFormData>(
    value: any,
    rule: ValidationRule,
    formData: T
  ): { isValid: boolean; message: string; warning?: string } {
    const { type, message, value: ruleValue, validator } = rule;

    // Custom validator takes precedence
    if (validator) {
      const isValid = validator(value, formData);
      return { isValid, message: isValid ? '' : message };
    }

    switch (type) {
      case 'required':
        return this.validateRequired(value, message);
      case 'min':
        return this.validateMin(value, ruleValue, message);
      case 'max':
        return this.validateMax(value, ruleValue, message);
      case 'pattern':
        return this.validatePattern(value, ruleValue, message);
      case 'email':
        return this.validateEmail(value, message);
      case 'phone':
        return this.validatePhone(value, message);
      case 'ssn':
        return this.validateSSN(value, message);
      case 'date':
        return this.validateDate(value, message);
      case 'age':
        return this.validateAge(value, message);
      default:
        return { isValid: true, message: '' };
    }
  }

  /**
   * Validate required field
   */
  private validateRequired(value: any, message: string): { isValid: boolean; message: string } {
    const isValid = value !== undefined && value !== null && value !== '';
    return { isValid, message: isValid ? '' : message };
  }

  /**
   * Validate minimum value
   */
  private validateMin(value: any, min: any, message: string): { isValid: boolean; message: string } {
    if (value === undefined || value === null || value === '') {
      return { isValid: true, message: '' };
    }
    
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    const isValid = !isNaN(numValue) && numValue >= min;
    return { isValid, message: isValid ? '' : message };
  }

  /**
   * Validate maximum value
   */
  private validateMax(value: any, max: any, message: string): { isValid: boolean; message: string } {
    if (value === undefined || value === null || value === '') {
      return { isValid: true, message: '' };
    }
    
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    const isValid = !isNaN(numValue) && numValue <= max;
    return { isValid, message: isValid ? '' : message };
  }

  /**
   * Validate pattern
   */
  private validatePattern(value: any, pattern: string, message: string): { isValid: boolean; message: string } {
    if (value === undefined || value === null || value === '') {
      return { isValid: true, message: '' };
    }
    
    const regex = new RegExp(pattern);
    const isValid = regex.test(String(value));
    return { isValid, message: isValid ? '' : message };
  }

  /**
   * Validate email
   */
  private validateEmail(value: any, message: string): { isValid: boolean; message: string } {
    if (value === undefined || value === null || value === '') {
      return { isValid: true, message: '' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(String(value));
    return { isValid, message: isValid ? '' : message };
  }

  /**
   * Validate phone
   */
  private validatePhone(value: any, message: string): { isValid: boolean; message: string } {
    if (value === undefined || value === null || value === '') {
      return { isValid: true, message: '' };
    }
    
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    const isValid = phoneRegex.test(String(value).replace(/\D/g, ''));
    return { isValid, message: isValid ? '' : message };
  }

  /**
   * Validate SSN
   */
  private validateSSN(value: any, message: string): { isValid: boolean; message: string } {
    if (value === undefined || value === null || value === '') {
      return { isValid: true, message: '' };
    }
    
    const ssnRegex = /^(?!000|666)[0-8][0-9]{2}-(?!00)[0-9]{2}-(?!0000)[0-9]{4}$/;
    const isValid = ssnRegex.test(String(value));
    return { isValid, message: isValid ? '' : message };
  }

  /**
   * Validate date
   */
  private validateDate(value: any, message: string): { isValid: boolean; message: string } {
    if (value === undefined || value === null || value === '') {
      return { isValid: true, message: '' };
    }
    
    const date = new Date(value);
    const isValid = !isNaN(date.getTime());
    return { isValid, message: isValid ? '' : message };
  }

  /**
   * Validate age
   */
  private validateAge(value: any, message: string): { isValid: boolean; message: string; warning?: string } {
    if (value === undefined || value === null || value === '') {
      return { isValid: true, message: '' };
    }
    
    const birthDate = new Date(value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      return {
        isValid: false,
        message: 'Employees must be at least 18 years old for hotel positions',
        warning: 'Federal labor law compliance required'
      };
    }

    return { isValid: true, message: '' };
  }

  /**
   * Check federal compliance for specific fields
   */
  private checkFederalCompliance(field: string, value: any): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (field) {
      case 'ssn':
        if (value && !this.validateSSN(value, '').isValid) {
          errors.push('FEDERAL COMPLIANCE: Invalid SSN format - required for tax purposes under IRC Section 3401');
        }
        break;
      case 'dateOfBirth':
        const ageValidation = this.validateAge(value, '');
        if (!ageValidation.isValid) {
          errors.push(`FEDERAL COMPLIANCE: ${ageValidation.message} - Fair Labor Standards Act requirement`);
        }
        break;
      case 'email':
        if (value && !this.validateEmail(value, '').isValid) {
          warnings.push('FEDERAL COMPLIANCE WARNING: Invalid email format may affect official communications');
        }
        break;
      case 'phone':
        if (value && !this.validatePhone(value, '').isValid) {
          warnings.push('FEDERAL COMPLIANCE WARNING: Invalid phone format may affect emergency contact');
        }
        break;
    }

    return { errors, warnings };
  }

  /**
   * Format field values based on type
   */
  public formatField(value: string, type: string): string {
    const cleanValue = String(value).replace(/\D/g, '');

    switch (type) {
      case 'ssn':
        if (cleanValue.length <= 3) return cleanValue;
        if (cleanValue.length <= 5) return `${cleanValue.slice(0, 3)}-${cleanValue.slice(3)}`;
        return `${cleanValue.slice(0, 3)}-${cleanValue.slice(3, 5)}-${cleanValue.slice(5, 9)}`;
      
      case 'phone':
        if (cleanValue.length <= 3) return cleanValue;
        if (cleanValue.length <= 6) return `(${cleanValue.slice(0, 3)}) ${cleanValue.slice(3)}`;
        return `(${cleanValue.slice(0, 3)}) ${cleanValue.slice(3, 6)}-${cleanValue.slice(6, 10)}`;
      
      case 'zipCode':
        if (cleanValue.length <= 5) return cleanValue;
        return `${cleanValue.slice(0, 5)}-${cleanValue.slice(5, 9)}`;
      
      default:
        return value;
    }
  }

  /**
   * Debounced validation for performance
   */
  public debounceValidation<T extends BaseFormData>(
    data: T,
    rules: ValidationRule[],
    callback: (result: ValidationResult) => void,
    delay: number = 300
  ): void {
    const key = this.getCacheKey(data, rules);
    
    // Clear existing timer
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    // Set new timer
    const timer = setTimeout(() => {
      const result = this.validateForm(data, rules);
      callback(result);
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Clear validation cache
   */
  public clearCache(): void {
    this.validationCache.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Generate cache key for validation
   */
  private getCacheKey<T extends BaseFormData>(data: T, rules: ValidationRule[]): string {
    return JSON.stringify({ data, rules });
  }
}

/**
 * Validation rule helpers
 */
export const ValidationRules = {
  required: (message: string = 'This field is required'): ValidationRule => ({
    field: '',
    type: 'required',
    message
  }),

  min: (min: number, message: string): ValidationRule => ({
    field: '',
    type: 'min',
    value: min,
    message
  }),

  max: (max: number, message: string): ValidationRule => ({
    field: '',
    type: 'max',
    value: max,
    message
  }),

  pattern: (pattern: string, message: string): ValidationRule => ({
    field: '',
    type: 'pattern',
    value: pattern,
    message
  }),

  email: (message: string = 'Please enter a valid email address'): ValidationRule => ({
    field: '',
    type: 'email',
    message
  }),

  phone: (message: string = 'Please enter a valid phone number'): ValidationRule => ({
    field: '',
    type: 'phone',
    message
  }),

  ssn: (message: string = 'Please enter a valid Social Security Number'): ValidationRule => ({
    field: '',
    type: 'ssn',
    message
  }),

  age: (minAge: number = 18, message: string = `Must be at least ${minAge} years old`): ValidationRule => ({
    field: '',
    type: 'age',
    value: minAge,
    message
  }),

  custom: (validator: (value: any, formData: any) => boolean, message: string): ValidationRule => ({
    field: '',
    type: 'custom',
    validator,
    message
  })
};

/**
 * Form validation hooks
 */
export const useFormValidation = <T extends BaseFormData>() => {
  const validator = FormValidator.getInstance();

  const validate = (
    data: T,
    rules: ValidationRule[],
    trigger: ValidationTrigger = 'change'
  ): ValidationResult => {
    return validator.validateForm(data, rules, trigger);
  };

  const debounceValidate = (
    data: T,
    rules: ValidationRule[],
    callback: (result: ValidationResult) => void,
    delay: number = 300
  ) => {
    validator.debounceValidation(data, rules, callback, delay);
  };

  const formatField = (value: string, type: string): string => {
    return validator.formatField(value, type);
  };

  const clearCache = () => {
    validator.clearCache();
  };

  return {
    validate,
    debounceValidate,
    formatField,
    clearCache
  };
};