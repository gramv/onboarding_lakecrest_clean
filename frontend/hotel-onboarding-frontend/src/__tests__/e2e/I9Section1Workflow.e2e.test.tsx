/**
 * End-to-end tests for I-9 Section 1 workflow
 * Tests complete user journey from start to signed PDF
 */
import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import I9Section1FormClean from '@/components/I9Section1FormClean'
import { generateMappedI9Pdf } from '@/utils/i9PdfGeneratorMapped'
import axios from 'axios'

// Mock dependencies
jest.mock('axios')
jest.mock('@/utils/i9PdfGeneratorMapped')

// Mock all sub-components
jest.mock('@/components/PDFViewerWithControls', () => {
  return function MockPDFViewer({ pdfUrl }: any) {
    return <div data-testid="pdf-viewer">PDF: {pdfUrl}</div>
  }
})

jest.mock('@/components/SignatureCapture', () => {
  return function MockSignatureCapture({ onSign, onCancel }: any) {
    return (
      <div data-testid="signature-capture">
        <button onClick={() => onSign({ signature: 'e2e-test-signature', timestamp: new Date().toISOString() })}>
          Sign Document
        </button>
        <button onClick={onCancel}>Cancel Signature</button>
      </div>
    )
  }
})

// Mock fetch and URL APIs
global.fetch = jest.fn().mockResolvedValue({
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
})
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-pdf-url')

// Test wrapper component to simulate onboarding flow
const TestWrapper = ({ onComplete }: { onComplete: (data: any) => void }) => {
  return (
    <MemoryRouter initialEntries={['/onboarding/i9-section1']}>
      <Routes>
        <Route 
          path="/onboarding/i9-section1" 
          element={
            <I9Section1FormClean 
              onComplete={onComplete}
              employeeId="emp-e2e-test"
              language="en"
            />
          } 
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('I-9 Section 1 E2E Workflow', () => {
  const mockOnComplete = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(generateMappedI9Pdf as jest.Mock).mockResolvedValue(new Uint8Array([1, 2, 3]))
    ;(axios.post as jest.Mock).mockResolvedValue({ data: { success: true } })
  })

  describe('Complete US Citizen Workflow', () => {
    it('should complete full workflow for US citizen', async () => {
      const user = userEvent.setup()
      render(<TestWrapper onComplete={mockOnComplete} />)

      // Verify initial state
      expect(screen.getByText('Form I-9, Section 1')).toBeInTheDocument()
      expect(screen.getByText('Employment Eligibility Verification')).toBeInTheDocument()
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()

      // Step 1: Personal Information
      await user.type(screen.getByLabelText(/last name \*/i), 'Johnson')
      await user.type(screen.getByLabelText(/first name \*/i), 'Mary')
      await user.type(screen.getByLabelText(/middle initial/i), 'A')
      await user.type(screen.getByLabelText(/other last names used/i), 'Smith')
      
      // Verify character limits
      const middleInitialInput = screen.getByLabelText(/middle initial/i)
      expect(middleInitialInput).toHaveValue('A')
      
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Step 2: Address Information
      await waitFor(() => {
        expect(screen.getByText('Address Information')).toBeInTheDocument()
        expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/street address \*/i), '456 Oak Avenue')
      await user.type(screen.getByLabelText(/apt #/i), '10B')
      await user.type(screen.getByLabelText(/city \*/i), 'Los Angeles')
      await user.selectOptions(screen.getByLabelText(/state \*/i), 'CA')
      await user.type(screen.getByLabelText(/zip code \*/i), '90210')
      
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Step 3: Contact & Details
      await waitFor(() => {
        expect(screen.getByText('Contact Information & Personal Details')).toBeInTheDocument()
        expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/date of birth \*/i), '1985-06-15')
      await user.type(screen.getByLabelText(/social security number \*/i), '987654321')
      await user.type(screen.getByLabelText(/email address \*/i), 'mary.johnson@email.com')
      await user.type(screen.getByLabelText(/phone number \*/i), '3105551234')

      // Verify formatting
      expect(screen.getByLabelText(/social security number \*/i)).toHaveValue('987-65-4321')
      expect(screen.getByLabelText(/phone number \*/i)).toHaveValue('(310) 555-1234')

      await user.click(screen.getByRole('button', { name: /next/i }))

      // Step 4: Citizenship Status
      await waitFor(() => {
        expect(screen.getByText('Citizenship Status')).toBeInTheDocument()
        expect(screen.getByText('Step 4 of 4')).toBeInTheDocument()
      })

      await user.click(screen.getByLabelText(/A citizen of the United States/i))
      
      // Verify federal compliance notice
      expect(screen.getByText(/Federal law requires that you complete Form I-9/i)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /preview & sign/i }))

      // Verify PDF generation
      await waitFor(() => {
        expect(generateMappedI9Pdf).toHaveBeenCalledWith({
          last_name: 'Johnson',
          first_name: 'Mary',
          middle_initial: 'A',
          other_names: 'Smith',
          address: '456 Oak Avenue',
          apt_number: '10B',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90210',
          date_of_birth: '1985-06-15',
          ssn: '987-65-4321',
          email: 'mary.johnson@email.com',
          phone: '(310) 555-1234',
          citizenship_status: 'citizen',
          alien_registration_number: '',
          foreign_passport_number: '',
          country_of_issuance: '',
          expiration_date: ''
        })
      })

      // Verify review screen
      await waitFor(() => {
        expect(screen.getByText('Review Form I-9 Section 1')).toBeInTheDocument()
        expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument()
        expect(screen.getByText(/By signing below, you attest under penalty of perjury/i)).toBeInTheDocument()
      })

      // Sign the document
      const signButton = within(screen.getByTestId('signature-capture')).getByText('Sign Document')
      await user.click(signButton)

      // Verify completion
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith({
          last_name: 'Johnson',
          first_name: 'Mary',
          middle_initial: 'A',
          other_names: 'Smith',
          address: '456 Oak Avenue',
          apt_number: '10B',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90210',
          date_of_birth: '1985-06-15',
          ssn: '987-65-4321',
          email: 'mary.johnson@email.com',
          phone: '(310) 555-1234',
          citizenship_status: 'citizen',
          alien_registration_number: '',
          foreign_passport_number: '',
          country_of_issuance: '',
          expiration_date: '',
          signature: {
            signature: 'e2e-test-signature',
            timestamp: expect.any(String)
          },
          completedAt: expect.any(String)
        })
      })

      // Verify backend save
      expect(axios.post).toHaveBeenCalledWith(
        '/api/onboarding/emp-e2e-test/i9-section1',
        expect.objectContaining({
          formData: expect.any(Object),
          signed: true,
          signatureData: expect.any(Object)
        })
      )
    })
  })

  describe('Complete Permanent Resident Workflow', () => {
    it('should complete full workflow for permanent resident', async () => {
      const user = userEvent.setup()
      render(<TestWrapper onComplete={mockOnComplete} />)

      // Navigate through first 3 steps
      await user.type(screen.getByLabelText(/last name \*/i), 'Chen')
      await user.type(screen.getByLabelText(/first name \*/i), 'Wei')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.type(screen.getByLabelText(/street address \*/i), '789 Pine Street')
      await user.type(screen.getByLabelText(/city \*/i), 'San Francisco')
      await user.selectOptions(screen.getByLabelText(/state \*/i), 'CA')
      await user.type(screen.getByLabelText(/zip code \*/i), '94102')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.type(screen.getByLabelText(/date of birth \*/i), '1990-03-20')
      await user.type(screen.getByLabelText(/social security number \*/i), '555667777')
      await user.type(screen.getByLabelText(/email address \*/i), 'wei.chen@email.com')
      await user.type(screen.getByLabelText(/phone number \*/i), '4155551234')
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Select permanent resident status
      await user.click(screen.getByLabelText(/A lawful permanent resident/i))

      // Fill additional required field
      await waitFor(() => {
        expect(screen.getByLabelText(/USCIS Number \*/i)).toBeInTheDocument()
      })
      
      await user.type(screen.getByLabelText(/USCIS Number \*/i), 'A123456789')

      await user.click(screen.getByRole('button', { name: /preview & sign/i }))

      // Verify PDF includes USCIS number
      await waitFor(() => {
        expect(generateMappedI9Pdf).toHaveBeenCalledWith(
          expect.objectContaining({
            citizenship_status: 'permanent_resident',
            alien_registration_number: 'A123456789'
          })
        )
      })

      // Complete signature
      await waitFor(() => {
        expect(screen.getByTestId('signature-capture')).toBeInTheDocument()
      })
      
      const signButton = within(screen.getByTestId('signature-capture')).getByText('Sign Document')
      await user.click(signButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })
    })
  })

  describe('Complete Authorized Alien Workflow', () => {
    it('should complete full workflow for authorized alien', async () => {
      const user = userEvent.setup()
      render(<TestWrapper onComplete={mockOnComplete} />)

      // Navigate through first 3 steps quickly
      await user.type(screen.getByLabelText(/last name \*/i), 'Garcia')
      await user.type(screen.getByLabelText(/first name \*/i), 'Carlos')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.type(screen.getByLabelText(/street address \*/i), '321 Elm Street')
      await user.type(screen.getByLabelText(/city \*/i), 'Houston')
      await user.selectOptions(screen.getByLabelText(/state \*/i), 'TX')
      await user.type(screen.getByLabelText(/zip code \*/i), '77001')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.type(screen.getByLabelText(/date of birth \*/i), '1988-11-10')
      await user.type(screen.getByLabelText(/social security number \*/i), '111223333')
      await user.type(screen.getByLabelText(/email address \*/i), 'carlos.garcia@email.com')
      await user.type(screen.getByLabelText(/phone number \*/i), '7135551234')
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Select authorized alien status
      await user.click(screen.getByLabelText(/An alien authorized to work/i))

      // Fill all additional required fields
      await waitFor(() => {
        expect(screen.getByLabelText(/Alien Registration Number \*/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Work Authorization Expiration Date \*/i)).toBeInTheDocument()
      })
      
      await user.type(screen.getByLabelText(/Alien Registration Number \*/i), 'A987654321')
      await user.type(screen.getByLabelText(/Work Authorization Expiration Date \*/i), '2026-12-31')
      await user.type(screen.getByLabelText(/Foreign Passport Number/i), 'MX123456')
      await user.type(screen.getByLabelText(/Country of Issuance/i), 'Mexico')

      await user.click(screen.getByRole('button', { name: /preview & sign/i }))

      // Verify all alien fields in PDF
      await waitFor(() => {
        expect(generateMappedI9Pdf).toHaveBeenCalledWith(
          expect.objectContaining({
            citizenship_status: 'authorized_alien',
            alien_registration_number: 'A987654321',
            expiration_date: '2026-12-31',
            foreign_passport_number: 'MX123456',
            country_of_issuance: 'Mexico'
          })
        )
      })

      // Complete workflow
      await waitFor(() => {
        expect(screen.getByTestId('signature-capture')).toBeInTheDocument()
      })
      
      const signButton = within(screen.getByTestId('signature-capture')).getByText('Sign Document')
      await user.click(signButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })
    })
  })

  describe('Navigation and Corrections', () => {
    it('should allow user to navigate back and make corrections', async () => {
      const user = userEvent.setup()
      render(<TestWrapper onComplete={mockOnComplete} />)

      // Fill first step with a typo
      await user.type(screen.getByLabelText(/last name \*/i), 'Smithh') // Typo
      await user.type(screen.getByLabelText(/first name \*/i), 'John')
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Fill second step
      await user.type(screen.getByLabelText(/street address \*/i), '123 Main St')
      await user.type(screen.getByLabelText(/city \*/i), 'Boston')
      await user.selectOptions(screen.getByLabelText(/state \*/i), 'MA')
      await user.type(screen.getByLabelText(/zip code \*/i), '02101')
      
      // Go back to fix the typo
      await user.click(screen.getByRole('button', { name: /previous/i }))

      // Verify we're back on step 1
      expect(screen.getByText('Personal Information')).toBeInTheDocument()
      
      // Fix the typo
      const lastNameInput = screen.getByLabelText(/last name \*/i)
      await user.clear(lastNameInput)
      await user.type(lastNameInput, 'Smith')

      // Continue forward
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Verify address data was preserved
      expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Boston')).toBeInTheDocument()
    })

    it('should allow canceling signature and returning to form', async () => {
      const user = userEvent.setup()
      render(<TestWrapper onComplete={mockOnComplete} />)

      // Complete form quickly
      await user.type(screen.getByLabelText(/last name \*/i), 'Test')
      await user.type(screen.getByLabelText(/first name \*/i), 'User')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.type(screen.getByLabelText(/street address \*/i), '123 Test St')
      await user.type(screen.getByLabelText(/city \*/i), 'Testville')
      await user.selectOptions(screen.getByLabelText(/state \*/i), 'CA')
      await user.type(screen.getByLabelText(/zip code \*/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.type(screen.getByLabelText(/date of birth \*/i), '2000-01-01')
      await user.type(screen.getByLabelText(/social security number \*/i), '123456789')
      await user.type(screen.getByLabelText(/email address \*/i), 'test@test.com')
      await user.type(screen.getByLabelText(/phone number \*/i), '5555551234')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.click(screen.getByLabelText(/A citizen of the United States/i))
      await user.click(screen.getByRole('button', { name: /preview & sign/i }))

      // Wait for signature screen
      await waitFor(() => {
        expect(screen.getByTestId('signature-capture')).toBeInTheDocument()
      })

      // Cancel signature
      const cancelButton = within(screen.getByTestId('signature-capture')).getByText('Cancel Signature')
      await user.click(cancelButton)

      // Should be back on step 4
      await waitFor(() => {
        expect(screen.getByText('Citizenship Status')).toBeInTheDocument()
        expect(screen.getByText('Step 4 of 4')).toBeInTheDocument()
      })

      // Form should not be completed
      expect(mockOnComplete).not.toHaveBeenCalled()
    })
  })

  describe('Validation Scenarios', () => {
    it('should validate all required fields before proceeding', async () => {
      const user = userEvent.setup()
      render(<TestWrapper onComplete={mockOnComplete} />)

      // Try to proceed without filling any fields
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Should show validation errors
      expect(screen.getByText('Last name is required')).toBeInTheDocument()
      expect(screen.getByText('First name is required')).toBeInTheDocument()

      // Should not proceed to next step
      expect(screen.getByText('Personal Information')).toBeInTheDocument()
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    })

    it('should validate format requirements', async () => {
      const user = userEvent.setup()
      render(<TestWrapper onComplete={mockOnComplete} />)

      // Navigate to step 2
      await user.type(screen.getByLabelText(/last name \*/i), 'Test')
      await user.type(screen.getByLabelText(/first name \*/i), 'User')
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Enter invalid ZIP code
      await user.type(screen.getByLabelText(/street address \*/i), '123 Main St')
      await user.type(screen.getByLabelText(/city \*/i), 'City')
      await user.selectOptions(screen.getByLabelText(/state \*/i), 'CA')
      await user.type(screen.getByLabelText(/zip code \*/i), '123') // Invalid
      
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Should show validation error
      expect(screen.getByText('Invalid ZIP code format')).toBeInTheDocument()
    })
  })

  describe('Error Recovery', () => {
    it('should handle PDF generation failure gracefully', async () => {
      const user = userEvent.setup()
      ;(generateMappedI9Pdf as jest.Mock).mockRejectedValue(new Error('PDF generation failed'))
      
      render(<TestWrapper onComplete={mockOnComplete} />)

      // Complete form
      await user.type(screen.getByLabelText(/last name \*/i), 'Test')
      await user.type(screen.getByLabelText(/first name \*/i), 'User')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.type(screen.getByLabelText(/street address \*/i), '123 Test St')
      await user.type(screen.getByLabelText(/city \*/i), 'Test City')
      await user.selectOptions(screen.getByLabelText(/state \*/i), 'CA')
      await user.type(screen.getByLabelText(/zip code \*/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.type(screen.getByLabelText(/date of birth \*/i), '2000-01-01')
      await user.type(screen.getByLabelText(/social security number \*/i), '123456789')
      await user.type(screen.getByLabelText(/email address \*/i), 'test@test.com')
      await user.type(screen.getByLabelText(/phone number \*/i), '5555551234')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.click(screen.getByLabelText(/A citizen of the United States/i))
      await user.click(screen.getByRole('button', { name: /preview & sign/i }))

      // Should still show signature screen despite PDF error
      await waitFor(() => {
        expect(screen.getByTestId('signature-capture')).toBeInTheDocument()
      })

      // Should be able to complete form
      const signButton = within(screen.getByTestId('signature-capture')).getByText('Sign Document')
      await user.click(signButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })
    })

    it('should handle backend save failure gracefully', async () => {
      const user = userEvent.setup()
      ;(axios.post as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      render(<TestWrapper onComplete={mockOnComplete} />)

      // Complete form quickly (minimal required fields)
      await user.type(screen.getByLabelText(/last name \*/i), 'Test')
      await user.type(screen.getByLabelText(/first name \*/i), 'User')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.type(screen.getByLabelText(/street address \*/i), '123 Test St')
      await user.type(screen.getByLabelText(/city \*/i), 'Test')
      await user.selectOptions(screen.getByLabelText(/state \*/i), 'CA')
      await user.type(screen.getByLabelText(/zip code \*/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.type(screen.getByLabelText(/date of birth \*/i), '2000-01-01')
      await user.type(screen.getByLabelText(/social security number \*/i), '123456789')
      await user.type(screen.getByLabelText(/email address \*/i), 'test@test.com')
      await user.type(screen.getByLabelText(/phone number \*/i), '5555551234')
      await user.click(screen.getByRole('button', { name: /next/i }))

      await user.click(screen.getByLabelText(/A citizen of the United States/i))
      await user.click(screen.getByRole('button', { name: /preview & sign/i }))

      await waitFor(() => {
        expect(screen.getByTestId('signature-capture')).toBeInTheDocument()
      })

      const signButton = within(screen.getByTestId('signature-capture')).getByText('Sign Document')
      await user.click(signButton)

      // Should complete despite backend error
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })
    })
  })
})