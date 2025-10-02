import {
  FormValidator,
  ValidationRule,
  ValidationRules,
  getValidationRules,
  CrossFormValidator,
  formValidator
} from '../utils/formValidation'

describe('FormValidator', () => {
  let validator: FormValidator

  beforeEach(() => {
    validator = FormValidator.getInstance()
  })

  describe('validateField', () => {
    test('validates required fields', () => {
      const rule: ValidationRule = { field: 'name', required: true }
      
      expect(validator.validateField('', rule)).toBe('This field is required')
      expect(validator.validateField(null, rule)).toBe('This field is required')
      expect(validator.validateField(undefined, rule)).toBe('This field is required')
      expect(validator.validateField('John', rule)).toBeNull()
    })

    test('validates email format', () => {
      const rule: ValidationRule = { field: 'email', type: 'email' }
      
      expect(validator.validateField('invalid-email', rule)).toBe('Please enter a valid email address')
      expect(validator.validateField('test@', rule)).toBe('Please enter a valid email address')
      expect(validator.validateField('test@example.com', rule)).toBeNull()
      expect(validator.validateField('user.name+tag@example.co.uk', rule)).toBeNull()
    })

    test('validates phone format', () => {
      const rule: ValidationRule = { field: 'phone', type: 'phone' }
      
      expect(validator.validateField('123456789', rule)).toBe('Please enter a valid phone number (XXX) XXX-XXXX')
      expect(validator.validateField('(555) 123-4567', rule)).toBeNull()
      expect(validator.validateField('(555)123-4567', rule)).toBeNull()
      expect(validator.validateField('5551234567', rule)).toBe('Please enter a valid phone number (XXX) XXX-XXXX')
    })

    test('validates SSN format', () => {
      const rule: ValidationRule = { field: 'ssn', type: 'ssn' }
      
      expect(validator.validateField('123456789', rule)).toBe('Please enter a valid SSN (XXX-XX-XXXX)')
      expect(validator.validateField('123-45-6789', rule)).toBeNull()
      expect(validator.validateField('123456789', rule)).toBe('Please enter a valid SSN (XXX-XX-XXXX)')
    })

    test('validates ZIP code format', () => {
      const rule: ValidationRule = { field: 'zipCode', type: 'zipCode' }
      
      expect(validator.validateField('1234', rule)).toBe('Please enter a valid ZIP code')
      expect(validator.validateField('12345', rule)).toBeNull()
      expect(validator.validateField('12345-6789', rule)).toBeNull()
      expect(validator.validateField('123456', rule)).toBe('Please enter a valid ZIP code')
    })

    test('validates string length', () => {
      const rule: ValidationRule = { 
        field: 'name', 
        type: 'string',
        minLength: 2,
        maxLength: 10
      }
      
      expect(validator.validateField('a', rule)).toBe('Must be at least 2 characters')
      expect(validator.validateField('ab', rule)).toBeNull()
      expect(validator.validateField('abcdefghijk', rule)).toBe('Must be no more than 10 characters')
      expect(validator.validateField('abcdefghij', rule)).toBeNull()
    })

    test('validates numeric ranges', () => {
      const rule: ValidationRule = { 
        field: 'age', 
        type: 'number',
        min: 18,
        max: 65
      }
      
      expect(validator.validateField(17, rule)).toBe('Must be at least 18')
      expect(validator.validateField(18, rule)).toBeNull()
      expect(validator.validateField(66, rule)).toBe('Must be no more than 65')
      expect(validator.validateField(65, rule)).toBeNull()
    })

    test('validates date format', () => {
      const rule: ValidationRule = { field: 'date', type: 'date' }
      
      expect(validator.validateField('invalid-date', rule)).toBe('Please enter a valid date')
      expect(validator.validateField('2024-01-01', rule)).toBeNull()
      expect(validator.validateField('01/01/2024', rule)).toBeNull()
    })

    test('validates URL format', () => {
      const rule: ValidationRule = { field: 'website', type: 'url' }
      
      expect(validator.validateField('not-a-url', rule)).toBe('Please enter a valid URL')
      expect(validator.validateField('http://example.com', rule)).toBeNull()
      expect(validator.validateField('https://www.example.com', rule)).toBeNull()
    })

    test('validates with custom pattern', () => {
      const rule: ValidationRule = { 
        field: 'code', 
        pattern: /^[A-Z]{3}\d{3}$/,
        message: 'Code must be 3 letters followed by 3 numbers'
      }
      
      expect(validator.validateField('ABC123', rule)).toBeNull()
      expect(validator.validateField('abc123', rule)).toBe('Code must be 3 letters followed by 3 numbers')
      expect(validator.validateField('AB123', rule)).toBe('Code must be 3 letters followed by 3 numbers')
    })

    test('validates with custom validator function', () => {
      const rule: ValidationRule = { 
        field: 'password',
        customValidator: (value) => {
          if (value.length < 8) return 'Password must be at least 8 characters'
          if (!/[A-Z]/.test(value)) return 'Password must contain uppercase letter'
          if (!/[0-9]/.test(value)) return 'Password must contain a number'
          return null
        }
      }
      
      expect(validator.validateField('short', rule)).toBe('Password must be at least 8 characters')
      expect(validator.validateField('lowercase123', rule)).toBe('Password must contain uppercase letter')
      expect(validator.validateField('NoNumbers', rule)).toBe('Password must contain a number')
      expect(validator.validateField('ValidPass123', rule)).toBeNull()
    })

    test('skips validation for empty non-required fields', () => {
      const rule: ValidationRule = { 
        field: 'optional',
        type: 'email',
        minLength: 5
      }
      
      expect(validator.validateField('', rule)).toBeNull()
      expect(validator.validateField(null, rule)).toBeNull()
      expect(validator.validateField(undefined, rule)).toBeNull()
    })

    test('uses custom error messages', () => {
      const rule: ValidationRule = { 
        field: 'name',
        required: true,
        message: 'Name is mandatory'
      }
      
      expect(validator.validateField('', rule)).toBe('Name is mandatory')
    })
  })

  describe('validateForm', () => {
    test('validates entire form with multiple rules', () => {
      const formData = {
        name: '',
        email: 'invalid-email',
        age: 15,
        phone: '(555) 123-4567'
      }

      const rules: ValidationRule[] = [
        { field: 'name', required: true },
        { field: 'email', required: true, type: 'email' },
        { field: 'age', type: 'number', min: 18 },
        { field: 'phone', type: 'phone' }
      ]

      const result = validator.validateForm(formData, rules)

      expect(result.isValid).toBe(false)
      expect(result.errors).toEqual({
        name: 'This field is required',
        email: 'Please enter a valid email address',
        age: 'Must be at least 18'
      })
    })

    test('returns valid result for correct form data', () => {
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        phone: '(555) 123-4567'
      }

      const rules: ValidationRule[] = [
        { field: 'name', required: true },
        { field: 'email', required: true, type: 'email' },
        { field: 'age', type: 'number', min: 18 },
        { field: 'phone', type: 'phone' }
      ]

      const result = validator.validateForm(formData, rules)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    test('validates nested object properties', () => {
      const formData = {
        user: {
          profile: {
            email: 'invalid-email'
          }
        }
      }

      const rules: ValidationRule[] = [
        { field: 'user.profile.email', required: true, type: 'email' }
      ]

      const result = validator.validateForm(formData, rules)

      expect(result.isValid).toBe(false)
      expect(result.errors['user.profile.email']).toBe('Please enter a valid email address')
    })
  })

  describe('formatField', () => {
    test('formats phone numbers', () => {
      expect(validator.formatField('5551234567', 'phone')).toBe('(555) 123-4567')
      expect(validator.formatField('555123', 'phone')).toBe('(555) 123')
      expect(validator.formatField('555', 'phone')).toBe('555')
    })

    test('formats SSN', () => {
      expect(validator.formatField('123456789', 'ssn')).toBe('123-45-6789')
      expect(validator.formatField('12345', 'ssn')).toBe('123-45')
      expect(validator.formatField('123', 'ssn')).toBe('123')
    })

    test('formats ZIP codes', () => {
      expect(validator.formatField('123456789', 'zipCode')).toBe('12345-6789')
      expect(validator.formatField('12345', 'zipCode')).toBe('12345')
    })

    test('returns original value for unknown types', () => {
      expect(validator.formatField('test', 'unknown')).toBe('test')
    })
  })
})

describe('ValidationRules', () => {
  test('contains personal info validation rules', () => {
    expect(ValidationRules.personalInfo).toBeDefined()
    expect(ValidationRules.personalInfo.length).toBeGreaterThan(0)
    
    const firstNameRule = ValidationRules.personalInfo.find(rule => rule.field === 'firstName')
    expect(firstNameRule).toBeDefined()
    expect(firstNameRule?.required).toBe(true)
    expect(firstNameRule?.type).toBe('string')
  })

  test('contains I-9 section 1 validation rules', () => {
    expect(ValidationRules.i9Section1).toBeDefined()
    expect(ValidationRules.i9Section1.length).toBeGreaterThan(0)
    
    const ssnRule = ValidationRules.i9Section1.find(rule => rule.field === 'ssn')
    expect(ssnRule).toBeDefined()
    expect(ssnRule?.type).toBe('ssn')
  })

  test('contains W-4 form validation rules', () => {
    expect(ValidationRules.w4Form).toBeDefined()
    expect(ValidationRules.w4Form.length).toBeGreaterThan(0)
    
    const filingStatusRule = ValidationRules.w4Form.find(rule => rule.field === 'filing_status')
    expect(filingStatusRule).toBeDefined()
    expect(filingStatusRule?.required).toBe(true)
  })
})

describe('getValidationRules', () => {
  test('returns correct rules for form types', () => {
    expect(getValidationRules('personal_info')).toEqual(ValidationRules.personalInfo)
    expect(getValidationRules('i9_section1')).toEqual(ValidationRules.i9Section1)
    expect(getValidationRules('w4_form')).toEqual(ValidationRules.w4Form)
    expect(getValidationRules('unknown')).toEqual([])
  })
})

describe('CrossFormValidator', () => {
  describe('validateDataConsistency', () => {
    test('validates name consistency between forms', () => {
      const allFormData = {
        personal_info: {
          firstName: 'John',
          lastName: 'Doe',
          ssn: '123-45-6789'
        },
        i9_section1: {
          employee_first_name: 'Johnny',
          employee_last_name: 'Doe',
          ssn: '123-45-6789'
        }
      }

      const result = CrossFormValidator.validateDataConsistency(allFormData)

      expect(result.isValid).toBe(true)
      expect(result.warnings['name_consistency']).toBe('First name differs between Personal Info and I-9 forms')
    })

    test('validates SSN consistency between forms', () => {
      const allFormData = {
        personal_info: {
          firstName: 'John',
          lastName: 'Doe',
          ssn: '123-45-6789'
        },
        i9_section1: {
          employee_first_name: 'John',
          employee_last_name: 'Doe',
          ssn: '987-65-4321'
        }
      }

      const result = CrossFormValidator.validateDataConsistency(allFormData)

      expect(result.isValid).toBe(false)
      expect(result.errors['ssn_consistency']).toBe('SSN must be consistent across all forms')
    })

    test('validates address consistency', () => {
      const allFormData = {
        personal_info: {
          address: '123 Main St'
        },
        i9_section1: {
          address_street: '456 Oak Ave'
        }
      }

      const result = CrossFormValidator.validateDataConsistency(allFormData)

      expect(result.warnings['address_consistency']).toBe('Address differs between Personal Info and I-9 forms')
    })
  })

  describe('validateFormDependencies', () => {
    test('validates I-9 form dependencies', () => {
      const result = CrossFormValidator.validateFormDependencies('i9_section1', {}, {})

      expect(result.isValid).toBe(false)
      expect(result.errors['dependency']).toBe('Personal information must be completed first')
    })

    test('validates W-4 form dependencies', () => {
      const result = CrossFormValidator.validateFormDependencies('w4_form', {}, {})

      expect(result.isValid).toBe(false)
      expect(result.errors['dependency']).toBe('Personal information must be completed first')
    })

    test('validates health insurance spouse coverage warning', () => {
      const formData = {
        medical_tier: 'employee_spouse'
      }
      const allFormData = {
        personal_info: { firstName: 'John' },
        w4_form: { filing_status: 'Single' }
      }

      const result = CrossFormValidator.validateFormDependencies('health_insurance', formData, allFormData)

      expect(result.warnings['spouse_coverage']).toBe('Spouse coverage selected but filing status is not married')
    })

    test('passes validation when dependencies are met', () => {
      const allFormData = {
        personal_info: { firstName: 'John' }
      }

      const result = CrossFormValidator.validateFormDependencies('i9_section1', {}, allFormData)

      expect(result.isValid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })
  })
})

describe('formValidator singleton', () => {
  test('returns same instance', () => {
    const instance1 = FormValidator.getInstance()
    const instance2 = FormValidator.getInstance()
    
    expect(instance1).toBe(instance2)
    expect(formValidator).toBe(instance1)
  })
})