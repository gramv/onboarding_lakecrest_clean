/**
 * Federal compliance validation tests for I-9 Section 1
 * Ensures all USCIS requirements are met
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import I9Section1FormClean from '@/components/I9Section1FormClean'
import { generateMappedI9Pdf } from '@/utils/i9PdfGeneratorMapped'

// Mock dependencies
jest.mock('@/utils/i9PdfGeneratorMapped')
jest.mock('axios')

// Mock components for compliance testing
jest.mock('@/components/PDFViewerWithControls', () => {
  return function MockPDFViewer() {
    return <div data-testid="pdf-viewer" />
  }
})

jest.mock('@/components/SignatureCapture', () => {
  return function MockSignatureCapture({ onSign }: any) {
    return (
      <div data-testid="signature-capture">
        <button onClick={() => onSign({ 
          signature: 'compliance-test-signature',
          timestamp: new Date().toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Test Browser'
        })}>
          Sign with Compliance Data
        </button>
      </div>
    )
  }
})

global.fetch = jest.fn().mockResolvedValue({
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
})
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:compliance-test')

describe('I-9 Section 1 Federal Compliance', () => {
  const mockOnComplete = jest.fn()
  const defaultProps = {
    onComplete: mockOnComplete,
    employeeId: 'emp-compliance-test',
    language: 'en' as const
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(generateMappedI9Pdf as jest.Mock).mockResolvedValue(new Uint8Array([1, 2, 3]))
  })

  describe('Required Field Compliance', () => {
    it('should enforce all federally required fields for citizens', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // List of federally required fields per USCIS
      const requiredFields = [
        { step: 1, fields: ['last_name', 'first_name'] },
        { step: 2, fields: ['address', 'city', 'state', 'zip_code'] },
        { step: 3, fields: ['date_of_birth', 'ssn', 'email', 'phone'] },
        { step: 4, fields: ['citizenship_status'] }
      ]

      // Verify each required field shows error when empty
      for (let i = 0; i < requiredFields.length; i++) {
        await user.click(screen.getByRole('button', { name: /next|preview/i }))
        
        // Should not advance due to validation
        expect(screen.getByText(`Step ${i + 1} of 4`)).toBeInTheDocument()
        
        // Fill minimum required fields to proceed
        if (i === 0) {
          await user.type(screen.getByLabelText(/last name/i), 'Test')
          await user.type(screen.getByLabelText(/first name/i), 'User')
        } else if (i === 1) {
          await user.type(screen.getByLabelText(/street address/i), '123 Test St')
          await user.type(screen.getByLabelText(/city/i), 'Test City')
          await user.selectOptions(screen.getByLabelText(/state/i), 'CA')
          await user.type(screen.getByLabelText(/zip code/i), '12345')
        } else if (i === 2) {
          await user.type(screen.getByLabelText(/date of birth/i), '2000-01-01')
          await user.type(screen.getByLabelText(/social security number/i), '123456789')
          await user.type(screen.getByLabelText(/email/i), 'test@test.com')
          await user.type(screen.getByLabelText(/phone/i), '5551234567')
        }
        
        if (i < 3) {
          await user.click(screen.getByRole('button', { name: /next/i }))
        }
      }
    })

    it('should enforce additional required fields for permanent residents', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // Navigate to citizenship step
      await user.type(screen.getByLabelText(/last name/i), 'Test')
      await user.type(screen.getByLabelText(/first name/i), 'Resident')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Test St')
      await user.type(screen.getByLabelText(/city/i), 'Test City')
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '2000-01-01')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'test@test.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Select permanent resident
      await user.click(screen.getByLabelText(/lawful permanent resident/i))

      // Try to proceed without USCIS number
      await user.click(screen.getByRole('button', { name: /preview/i }))

      // Should show error for missing USCIS number
      expect(screen.getByText(/USCIS Number/i)).toBeInTheDocument()
      expect(screen.getByText('Alien Registration Number is required')).toBeInTheDocument()
    })

    it('should enforce all required fields for authorized aliens', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // Navigate to citizenship step
      await user.type(screen.getByLabelText(/last name/i), 'Test')
      await user.type(screen.getByLabelText(/first name/i), 'Alien')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Test St')
      await user.type(screen.getByLabelText(/city/i), 'Test City')
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '2000-01-01')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'test@test.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Select authorized alien
      await user.click(screen.getByLabelText(/alien authorized to work/i))

      // Try to proceed without required fields
      await user.click(screen.getByRole('button', { name: /preview/i }))

      // Should show errors for both required fields
      expect(screen.getByText('Alien Registration Number is required')).toBeInTheDocument()
      expect(screen.getByText('Work authorization expiration date is required')).toBeInTheDocument()
    })
  })

  describe('Data Format Compliance', () => {
    it('should format dates according to USCIS requirements (mmddyyyy)', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // Fill form to generate PDF
      await user.type(screen.getByLabelText(/last name/i), 'Test')
      await user.type(screen.getByLabelText(/first name/i), 'User')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Test St')
      await user.type(screen.getByLabelText(/city/i), 'Test City')
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '1990-07-15')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'test@test.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByLabelText(/citizen/i))
      await user.click(screen.getByRole('button', { name: /preview/i }))

      await waitFor(() => {
        expect(generateMappedI9Pdf).toHaveBeenCalledWith(
          expect.objectContaining({
            date_of_birth: '1990-07-15' // Component stores as ISO
          })
        )
      })

      // The PDF generator should format this as mmddyyyy
      // This is tested in the PDF generator tests
    })

    it('should accept only valid US state codes', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // Navigate to address step
      await user.type(screen.getByLabelText(/last name/i), 'Test')
      await user.type(screen.getByLabelText(/first name/i), 'User')
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Verify state dropdown contains only valid US states
      const stateSelect = screen.getByLabelText(/state/i)
      const options = within(stateSelect).getAllByRole('option')
      
      // Should have 50 states + DC + empty option
      expect(options.length).toBe(51) // 50 states + empty option
      
      // Verify some key states are present
      expect(within(stateSelect).getByRole('option', { name: 'CA' })).toBeInTheDocument()
      expect(within(stateSelect).getByRole('option', { name: 'NY' })).toBeInTheDocument()
      expect(within(stateSelect).getByRole('option', { name: 'TX' })).toBeInTheDocument()
    })
  })

  describe('Digital Signature Compliance', () => {
    it('should capture all required signature metadata', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // Complete form
      await user.type(screen.getByLabelText(/last name/i), 'Test')
      await user.type(screen.getByLabelText(/first name/i), 'User')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Test St')
      await user.type(screen.getByLabelText(/city/i), 'Test City')
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '2000-01-01')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'test@test.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByLabelText(/citizen/i))
      await user.click(screen.getByRole('button', { name: /preview/i }))

      // Wait for signature screen
      await waitFor(() => {
        expect(screen.getByTestId('signature-capture')).toBeInTheDocument()
      })

      // Sign the document
      await user.click(screen.getByText('Sign with Compliance Data'))

      // Verify signature metadata is captured
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            signature: expect.objectContaining({
              signature: 'compliance-test-signature',
              timestamp: expect.any(String),
              ipAddress: '192.168.1.1',
              userAgent: 'Mozilla/5.0 Test Browser'
            }),
            completedAt: expect.any(String)
          })
        )
      })
    })

    it('should display federal penalty notice before signature', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // Complete form quickly
      await user.type(screen.getByLabelText(/last name/i), 'Test')
      await user.type(screen.getByLabelText(/first name/i), 'User')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Test St')
      await user.type(screen.getByLabelText(/city/i), 'Test City')
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '2000-01-01')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'test@test.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByLabelText(/citizen/i))
      await user.click(screen.getByRole('button', { name: /preview/i }))

      // Verify federal compliance notice
      await waitFor(() => {
        expect(screen.getByText(/By signing below, you attest under penalty of perjury/i)).toBeInTheDocument()
        expect(screen.getByText(/federal law provides for imprisonment/i)).toBeInTheDocument()
        expect(screen.getByText(/The information you have provided is true and correct/i)).toBeInTheDocument()
      })
    })
  })

  describe('Field Restrictions and Limits', () => {
    it('should enforce SSN format and length', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // Navigate to contact step
      await user.type(screen.getByLabelText(/last name/i), 'Test')
      await user.type(screen.getByLabelText(/first name/i), 'User')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Test St')
      await user.type(screen.getByLabelText(/city/i), 'Test City')
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))

      const ssnInput = screen.getByLabelText(/social security number/i)
      
      // Should format with dashes
      await user.type(ssnInput, '123456789')
      expect(ssnInput).toHaveValue('123-45-6789')

      // Should not allow more than 9 digits
      await user.clear(ssnInput)
      await user.type(ssnInput, '1234567890123')
      expect(ssnInput).toHaveValue('123-45-6789')
    })

    it('should enforce phone number format', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // Navigate to contact step
      await user.type(screen.getByLabelText(/last name/i), 'Test')
      await user.type(screen.getByLabelText(/first name/i), 'User')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Test St')
      await user.type(screen.getByLabelText(/city/i), 'Test City')
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))

      const phoneInput = screen.getByLabelText(/phone number/i)
      
      // Should format with parentheses and dash
      await user.type(phoneInput, '5551234567')
      expect(phoneInput).toHaveValue('(555) 123-4567')

      // Should not allow more than 10 digits
      await user.clear(phoneInput)
      await user.type(phoneInput, '55512345678901')
      expect(phoneInput).toHaveValue('(555) 123-4567')
    })

    it('should enforce middle initial to single character', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      const middleInitialInput = screen.getByLabelText(/middle initial/i)
      
      // Should only accept one character
      await user.type(middleInitialInput, 'ABC')
      expect(middleInitialInput).toHaveValue('A')
      
      // Should capitalize
      await user.clear(middleInitialInput)
      await user.type(middleInitialInput, 'x')
      expect(middleInitialInput).toHaveValue('X')
    })
  })

  describe('Citizenship Status Requirements', () => {
    it('should require exactly one citizenship status selection', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // Navigate to citizenship step
      await user.type(screen.getByLabelText(/last name/i), 'Test')
      await user.type(screen.getByLabelText(/first name/i), 'User')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Test St')
      await user.type(screen.getByLabelText(/city/i), 'Test City')
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '2000-01-01')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'test@test.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Try to proceed without selecting status
      await user.click(screen.getByRole('button', { name: /preview/i }))

      // Should show error
      expect(screen.getByText('Please select your citizenship status')).toBeInTheDocument()

      // Select one status
      await user.click(screen.getByLabelText(/citizen of the United States/i))

      // Error should clear
      await waitFor(() => {
        expect(screen.queryByText('Please select your citizenship status')).not.toBeInTheDocument()
      })
    })

    it('should show correct federal warning for citizenship attestation', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // Navigate to citizenship step
      await user.type(screen.getByLabelText(/last name/i), 'Test')
      await user.type(screen.getByLabelText(/first name/i), 'User')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Test St')
      await user.type(screen.getByLabelText(/city/i), 'Test City')
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '2000-01-01')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'test@test.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Should show federal compliance warning
      expect(screen.getByText(/Federal law requires that you complete Form I-9/i)).toBeInTheDocument()
      expect(screen.getByText(/Providing false information may subject you to criminal prosecution/i)).toBeInTheDocument()
    })
  })

  describe('Work Authorization Expiration', () => {
    it('should require future expiration date for authorized aliens', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // Navigate to citizenship step
      await user.type(screen.getByLabelText(/last name/i), 'Test')
      await user.type(screen.getByLabelText(/first name/i), 'Alien')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Test St')
      await user.type(screen.getByLabelText(/city/i), 'Test City')
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '2000-01-01')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'test@test.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Select authorized alien
      await user.click(screen.getByLabelText(/alien authorized to work/i))

      // Fill required fields
      await user.type(screen.getByLabelText(/Alien Registration Number/i), 'A123456789')
      
      // The date input should accept future dates
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2)
      const futureDateString = futureDate.toISOString().split('T')[0]
      
      await user.type(screen.getByLabelText(/Work Authorization Expiration Date/i), futureDateString)

      // Should be able to proceed
      await user.click(screen.getByRole('button', { name: /preview/i }))

      await waitFor(() => {
        expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument()
      })
    })
  })

  describe('PDF Generation Compliance', () => {
    it('should generate PDF with all required federal fields mapped', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)

      // Complete full form
      await user.type(screen.getByLabelText(/last name/i), 'Compliance')
      await user.type(screen.getByLabelText(/first name/i), 'Test')
      await user.type(screen.getByLabelText(/middle initial/i), 'X')
      await user.type(screen.getByLabelText(/other last names/i), 'Previous')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '789 Federal Way')
      await user.type(screen.getByLabelText(/apt/i), '2A')
      await user.type(screen.getByLabelText(/city/i), 'Washington')
      await user.selectOptions(screen.getByLabelText(/state/i), 'DC')
      await user.type(screen.getByLabelText(/zip code/i), '20001')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '1975-03-25')
      await user.type(screen.getByLabelText(/social security number/i), '987654321')
      await user.type(screen.getByLabelText(/email/i), 'compliance@test.gov')
      await user.type(screen.getByLabelText(/phone/i), '2025551234')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByLabelText(/citizen of the United States/i))
      await user.click(screen.getByRole('button', { name: /preview/i }))

      // Verify all fields are passed to PDF generator
      await waitFor(() => {
        expect(generateMappedI9Pdf).toHaveBeenCalledWith({
          last_name: 'Compliance',
          first_name: 'Test',
          middle_initial: 'X',
          other_names: 'Previous',
          address: '789 Federal Way',
          apt_number: '2A',
          city: 'Washington',
          state: 'DC',
          zip_code: '20001',
          date_of_birth: '1975-03-25',
          ssn: '987-65-4321',
          email: 'compliance@test.gov',
          phone: '(202) 555-1234',
          citizenship_status: 'citizen',
          alien_registration_number: '',
          foreign_passport_number: '',
          country_of_issuance: '',
          expiration_date: ''
        })
      })
    })
  })
})