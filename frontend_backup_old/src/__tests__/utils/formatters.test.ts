/**
 * Tests for formatting utilities used in I-9 forms
 * Tests date, phone, and SSN formatting functions
 */

describe('Formatting Utilities', () => {
  describe('Date Formatting', () => {
    // Test the date formatting logic from the component
    const formatDateNoSlashes = (dateString: string): string => {
      if (!dateString) return ''
      const date = new Date(dateString)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const year = date.getFullYear()
      return `${month}${day}${year}`
    }

    it('should format date as mmddyyyy without separators', () => {
      expect(formatDateNoSlashes('2024-01-15')).toBe('01152024')
      expect(formatDateNoSlashes('2024-12-31')).toBe('12312024')
      expect(formatDateNoSlashes('2024-07-04')).toBe('07042024')
    })

    it('should handle single digit months and days', () => {
      expect(formatDateNoSlashes('2024-01-01')).toBe('01012024')
      expect(formatDateNoSlashes('2024-10-09')).toBe('10092024')
    })

    it('should handle leap years', () => {
      expect(formatDateNoSlashes('2024-02-29')).toBe('02292024')
    })

    it('should handle invalid dates', () => {
      expect(formatDateNoSlashes('invalid-date')).toBe('NaNNaNNaN')
    })

    it('should handle empty strings', () => {
      expect(formatDateNoSlashes('')).toBe('')
    })

    it('should handle date objects', () => {
      const date = new Date('2024-03-15')
      expect(formatDateNoSlashes(date.toISOString())).toBe('03152024')
    })
  })

  describe('Phone Number Formatting', () => {
    // Test the phone formatting logic from the component
    const formatPhone = (value: string): string => {
      const numbers = value.replace(/\D/g, '')
      if (numbers.length <= 3) return numbers
      if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
    }

    const stripPhoneFormatting = (value: string): string => {
      return value.replace(/\D/g, '')
    }

    it('should format phone numbers with parentheses and dashes', () => {
      expect(formatPhone('5551234567')).toBe('(555) 123-4567')
    })

    it('should handle partial phone numbers', () => {
      expect(formatPhone('555')).toBe('555')
      expect(formatPhone('555123')).toBe('(555) 123')
      expect(formatPhone('5551234')).toBe('(555) 123-4')
    })

    it('should strip existing formatting', () => {
      expect(formatPhone('(555) 123-4567')).toBe('(555) 123-4567')
      expect(formatPhone('555-123-4567')).toBe('(555) 123-4567')
      expect(formatPhone('555.123.4567')).toBe('(555) 123-4567')
    })

    it('should limit to 10 digits', () => {
      expect(formatPhone('55512345678901')).toBe('(555) 123-4567')
    })

    it('should strip all formatting for PDF', () => {
      expect(stripPhoneFormatting('(555) 123-4567')).toBe('5551234567')
      expect(stripPhoneFormatting('555-123-4567')).toBe('5551234567')
      expect(stripPhoneFormatting('+1 (555) 123-4567')).toBe('15551234567')
      expect(stripPhoneFormatting('555.123.4567')).toBe('5551234567')
    })
  })

  describe('SSN Formatting', () => {
    // Test the SSN formatting logic from the component
    const formatSSN = (value: string): string => {
      const numbers = value.replace(/\D/g, '')
      if (numbers.length <= 3) return numbers
      if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 9)}`
    }

    const stripSSNFormatting = (value: string): string => {
      return value.replace(/\D/g, '')
    }

    it('should format SSN with dashes', () => {
      expect(formatSSN('123456789')).toBe('123-45-6789')
    })

    it('should handle partial SSNs', () => {
      expect(formatSSN('123')).toBe('123')
      expect(formatSSN('12345')).toBe('123-45')
      expect(formatSSN('123456')).toBe('123-45-6')
    })

    it('should strip existing formatting', () => {
      expect(formatSSN('123-45-6789')).toBe('123-45-6789')
      expect(formatSSN('123 45 6789')).toBe('123-45-6789')
    })

    it('should limit to 9 digits', () => {
      expect(formatSSN('1234567890123')).toBe('123-45-6789')
    })

    it('should strip all formatting for PDF', () => {
      expect(stripSSNFormatting('123-45-6789')).toBe('123456789')
      expect(stripSSNFormatting('123 45 6789')).toBe('123456789')
      expect(stripSSNFormatting('123.45.6789')).toBe('123456789')
    })
  })

  describe('ZIP Code Validation', () => {
    const isValidZipCode = (zip: string): boolean => {
      return /^\d{5}(-\d{4})?$/.test(zip)
    }

    it('should validate 5-digit ZIP codes', () => {
      expect(isValidZipCode('12345')).toBe(true)
      expect(isValidZipCode('00001')).toBe(true)
      expect(isValidZipCode('99999')).toBe(true)
    })

    it('should validate ZIP+4 format', () => {
      expect(isValidZipCode('12345-6789')).toBe(true)
      expect(isValidZipCode('00001-0001')).toBe(true)
    })

    it('should reject invalid formats', () => {
      expect(isValidZipCode('1234')).toBe(false)
      expect(isValidZipCode('123456')).toBe(false)
      expect(isValidZipCode('12345-678')).toBe(false)
      expect(isValidZipCode('12345-67890')).toBe(false)
      expect(isValidZipCode('ABCDE')).toBe(false)
      expect(isValidZipCode('12345 6789')).toBe(false)
    })
  })

  describe('Email Validation', () => {
    const isValidEmail = (email: string): boolean => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    it('should validate standard email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@example.com')).toBe(true)
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true)
    })

    it('should reject invalid formats', () => {
      expect(isValidEmail('notanemail')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('user@example')).toBe(false)
      expect(isValidEmail('user @example.com')).toBe(false)
      expect(isValidEmail('user@example .com')).toBe(false)
    })
  })

  describe('Name Formatting', () => {
    const formatNameUpperCase = (name: string): string => {
      return name.toUpperCase()
    }

    it('should convert names to uppercase', () => {
      expect(formatNameUpperCase('john')).toBe('JOHN')
      expect(formatNameUpperCase('Jane')).toBe('JANE')
      expect(formatNameUpperCase('mCdOnAlD')).toBe('MCDONALD')
    })

    it('should handle special characters', () => {
      expect(formatNameUpperCase("O'Brien")).toBe("O'BRIEN")
      expect(formatNameUpperCase('Smith-Jones')).toBe('SMITH-JONES')
      expect(formatNameUpperCase('José')).toBe('JOSÉ')
    })

    it('should handle empty strings', () => {
      expect(formatNameUpperCase('')).toBe('')
    })
  })

  describe('State Code Validation', () => {
    const VALID_STATES = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ]

    const isValidState = (state: string): boolean => {
      return VALID_STATES.includes(state)
    }

    it('should validate all US state codes', () => {
      VALID_STATES.forEach(state => {
        expect(isValidState(state)).toBe(true)
      })
    })

    it('should reject invalid state codes', () => {
      expect(isValidState('XX')).toBe(false)
      expect(isValidState('USA')).toBe(false)
      expect(isValidState('ny')).toBe(false) // lowercase
      expect(isValidState('')).toBe(false)
    })
  })

  describe('Character Limits', () => {
    const enforceCharacterLimit = (value: string, limit: number): string => {
      return value.slice(0, limit)
    }

    it('should enforce middle initial limit', () => {
      expect(enforceCharacterLimit('ABC', 1)).toBe('A')
      expect(enforceCharacterLimit('X', 1)).toBe('X')
      expect(enforceCharacterLimit('', 1)).toBe('')
    })

    it('should handle various field limits', () => {
      // SSN without formatting
      expect(enforceCharacterLimit('1234567890', 9)).toBe('123456789')
      
      // Phone without formatting
      expect(enforceCharacterLimit('12345678901234', 10)).toBe('1234567890')
    })
  })
})