/**
 * Integration tests for I-9 PDF generation
 * Tests field mapping, formatting, and compliance requirements
 */
import { generateMappedI9Pdf } from '@/utils/i9PdfGeneratorMapped'
import { PDFDocument } from 'pdf-lib'

// Mock pdf-lib
jest.mock('pdf-lib', () => {
  const mockTextField = {
    setText: jest.fn()
  }
  
  const mockDropdown = {
    select: jest.fn()
  }
  
  const mockCheckbox = {
    check: jest.fn()
  }
  
  const mockForm = {
    getTextField: jest.fn().mockReturnValue(mockTextField),
    getDropdown: jest.fn().mockReturnValue(mockDropdown),
    getCheckBox: jest.fn().mockReturnValue(mockCheckbox)
  }
  
  const mockPdfDoc = {
    getForm: jest.fn().mockReturnValue(mockForm),
    save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
  }
  
  return {
    PDFDocument: {
      load: jest.fn().mockResolvedValue(mockPdfDoc)
    }
  }
})

// Mock fetch for PDF template
global.fetch = jest.fn().mockResolvedValue({
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
})

describe('i9PdfGeneratorMapped', () => {
  const mockFormData = {
    last_name: 'Doe',
    first_name: 'Jane',
    middle_initial: 'M',
    other_names: 'Smith',
    address: '123 Main Street',
    apt_number: '4B',
    city: 'New York',
    state: 'NY',
    zip_code: '12345',
    date_of_birth: '1990-01-15',
    ssn: '123-45-6789',
    email: 'jane.doe@example.com',
    phone: '(555) 123-4567',
    citizenship_status: 'citizen'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PDF Loading', () => {
    it('should load the I-9 template from public folder', async () => {
      await generateMappedI9Pdf(mockFormData)
      
      expect(fetch).toHaveBeenCalledWith('/i9-form-template.pdf')
      expect(PDFDocument.load).toHaveBeenCalled()
    })

    it('should handle PDF loading errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to load PDF'))
      
      await expect(generateMappedI9Pdf(mockFormData)).rejects.toThrow('Failed to load PDF')
    })
  })

  describe('Date Formatting', () => {
    it('should format dates as mmddyyyy without separators', async () => {
      const result = await generateMappedI9Pdf(mockFormData)
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      
      // Check date of birth formatting
      expect(mockForm.getTextField).toHaveBeenCalledWith('Date of Birth mmddyyyy')
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('01152090')
      
      // Check today's date formatting
      const today = new Date()
      const expectedTodayFormat = 
        String(today.getMonth() + 1).padStart(2, '0') +
        String(today.getDate()).padStart(2, '0') +
        today.getFullYear()
      
      expect(mockForm.getTextField).toHaveBeenCalledWith("Today's Date mmddyyyy")
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith(expectedTodayFormat)
    })

    it('should handle invalid dates gracefully', async () => {
      const invalidDateData = { ...mockFormData, date_of_birth: 'invalid-date' }
      
      await generateMappedI9Pdf(invalidDateData)
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('NaNNaNNaN')
    })
  })

  describe('Phone Number Formatting', () => {
    it('should strip all formatting from phone numbers', async () => {
      await generateMappedI9Pdf(mockFormData)
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      expect(mockForm.getTextField).toHaveBeenCalledWith('Telephone Number')
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('5551234567')
    })

    it('should handle various phone formats', async () => {
      const phoneFormats = [
        '(555) 123-4567',
        '555-123-4567',
        '555.123.4567',
        '555 123 4567',
        '+1 555 123 4567'
      ]
      
      for (const phone of phoneFormats) {
        jest.clearAllMocks()
        await generateMappedI9Pdf({ ...mockFormData, phone })
        
        const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
        expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('15551234567')
      }
    })
  })

  describe('SSN Formatting', () => {
    it('should strip dashes from SSN', async () => {
      await generateMappedI9Pdf(mockFormData)
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      expect(mockForm.getTextField).toHaveBeenCalledWith('US Social Security Number')
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('123456789')
    })
  })

  describe('Field Mapping', () => {
    it('should map all personal information fields correctly', async () => {
      await generateMappedI9Pdf(mockFormData)
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      
      // Verify exact field names from official form
      const expectedMappings = [
        ['Last Name (Family Name)', 'DOE'],
        ['First Name Given Name', 'JANE'],
        ['Employee Middle Initial (if any)', 'M'],
        ['Employee Other Last Names Used (if any)', 'SMITH'],
        ['Address Street Number and Name', '123 Main Street'],
        ['Apt Number (if any)', '4B'],
        ['City or Town', 'New York'],
        ['ZIP Code', '12345'],
        ['Employees E-mail Address', 'jane.doe@example.com']
      ]
      
      expectedMappings.forEach(([fieldName, value]) => {
        expect(mockForm.getTextField).toHaveBeenCalledWith(fieldName)
        expect(mockForm.getTextField('').setText).toHaveBeenCalledWith(value)
      })
    })

    it('should handle state dropdown separately', async () => {
      await generateMappedI9Pdf(mockFormData)
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      expect(mockForm.getDropdown).toHaveBeenCalledWith('State')
      expect(mockForm.getDropdown('').select).toHaveBeenCalledWith('NY')
    })

    it('should convert names to uppercase', async () => {
      const lowerCaseData = {
        ...mockFormData,
        last_name: 'doe',
        first_name: 'jane',
        middle_initial: 'm',
        other_names: 'smith'
      }
      
      await generateMappedI9Pdf(lowerCaseData)
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('DOE')
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('JANE')
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('M')
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('SMITH')
    })
  })

  describe('Citizenship Status', () => {
    it('should check correct checkbox for US citizen', async () => {
      await generateMappedI9Pdf({ ...mockFormData, citizenship_status: 'citizen' })
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      expect(mockForm.getCheckBox).toHaveBeenCalledWith('CB_1')
      expect(mockForm.getCheckBox('').check).toHaveBeenCalled()
    })

    it('should check correct checkbox for noncitizen national', async () => {
      await generateMappedI9Pdf({ ...mockFormData, citizenship_status: 'national' })
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      expect(mockForm.getCheckBox).toHaveBeenCalledWith('CB_2')
      expect(mockForm.getCheckBox('').check).toHaveBeenCalled()
    })

    it('should check correct checkbox for permanent resident', async () => {
      await generateMappedI9Pdf({ ...mockFormData, citizenship_status: 'permanent_resident' })
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      expect(mockForm.getCheckBox).toHaveBeenCalledWith('CB_3')
      expect(mockForm.getCheckBox('').check).toHaveBeenCalled()
    })

    it('should check correct checkbox for authorized alien', async () => {
      await generateMappedI9Pdf({ ...mockFormData, citizenship_status: 'authorized_alien' })
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      expect(mockForm.getCheckBox).toHaveBeenCalledWith('CB_4')
      expect(mockForm.getCheckBox('').check).toHaveBeenCalled()
    })
  })

  describe('Permanent Resident Fields', () => {
    it('should fill USCIS number for permanent residents', async () => {
      const permanentResidentData = {
        ...mockFormData,
        citizenship_status: 'permanent_resident',
        alien_registration_number: 'A123456789'
      }
      
      await generateMappedI9Pdf(permanentResidentData)
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      expect(mockForm.getTextField).toHaveBeenCalledWith('3 A lawful permanent resident Enter USCIS or ANumber')
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('A123456789')
    })
  })

  describe('Authorized Alien Fields', () => {
    it('should fill all required fields for authorized aliens', async () => {
      const authorizedAlienData = {
        ...mockFormData,
        citizenship_status: 'authorized_alien',
        alien_registration_number: 'A987654321',
        expiration_date: '2025-12-31',
        foreign_passport_number: 'P123456',
        country_of_issuance: 'Canada'
      }
      
      await generateMappedI9Pdf(authorizedAlienData)
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      
      // Check A-Number
      expect(mockForm.getTextField).toHaveBeenCalledWith('USCIS ANumber')
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('A987654321')
      
      // Check expiration date formatting
      expect(mockForm.getTextField).toHaveBeenCalledWith('Exp Date mmddyyyy')
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('12312025')
      
      // Check foreign passport and country
      expect(mockForm.getTextField).toHaveBeenCalledWith('Foreign Passport Number and Country of IssuanceRow1')
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('P123456 Canada')
    })

    it('should handle missing optional fields gracefully', async () => {
      const minimalAlienData = {
        ...mockFormData,
        citizenship_status: 'authorized_alien',
        alien_registration_number: 'A987654321',
        expiration_date: '2025-12-31'
      }
      
      await generateMappedI9Pdf(minimalAlienData)
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      
      // Should not set foreign passport field if data is missing
      const setTextCalls = (mockForm.getTextField('').setText as jest.Mock).mock.calls
      const foreignPassportCall = setTextCalls.find(call => 
        call[0] === 'Foreign Passport Number and Country of IssuanceRow1'
      )
      expect(foreignPassportCall).toBeUndefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing fields gracefully', async () => {
      const mockGetTextField = jest.fn().mockImplementation((fieldName) => {
        if (fieldName === 'NonExistentField') {
          throw new Error(`Field "${fieldName}" not found`)
        }
        return { setText: jest.fn() }
      })
      
      const mockForm = {
        getTextField: mockGetTextField,
        getDropdown: jest.fn().mockReturnValue({ select: jest.fn() }),
        getCheckBox: jest.fn().mockReturnValue({ check: jest.fn() })
      }
      
      const mockPdfDoc = {
        getForm: jest.fn().mockReturnValue(mockForm),
        save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
      }
      
      ;(PDFDocument.load as jest.Mock).mockResolvedValueOnce(mockPdfDoc)
      
      // Should not throw even if some fields are missing
      await expect(generateMappedI9Pdf(mockFormData)).resolves.not.toThrow()
    })

    it('should return PDF bytes on success', async () => {
      const result = await generateMappedI9Pdf(mockFormData)
      
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result).toEqual(new Uint8Array([1, 2, 3]))
    })
  })

  describe('Field Value Edge Cases', () => {
    it('should handle empty strings', async () => {
      const emptyData = {
        ...mockFormData,
        middle_initial: '',
        apt_number: '',
        other_names: ''
      }
      
      await generateMappedI9Pdf(emptyData)
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      
      // Should set empty strings for optional fields
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('')
    })

    it('should handle very long values', async () => {
      const longData = {
        ...mockFormData,
        address: 'This is a very long address that might exceed typical field limits in the PDF form and should be handled appropriately'
      }
      
      await generateMappedI9Pdf(longData)
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith(longData.address)
    })

    it('should handle special characters', async () => {
      const specialCharData = {
        ...mockFormData,
        last_name: "O'Brien-Smith",
        address: '123 Main St. #4B & 4C'
      }
      
      await generateMappedI9Pdf(specialCharData)
      
      const mockForm = (await PDFDocument.load(new ArrayBuffer(8))).getForm()
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith("O'BRIEN-SMITH")
      expect(mockForm.getTextField('').setText).toHaveBeenCalledWith('123 Main St. #4B & 4C')
    })
  })
})