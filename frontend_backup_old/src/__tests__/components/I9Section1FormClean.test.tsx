/**
 * Comprehensive tests for I9Section1FormClean component
 * Tests federal compliance, form validation, multi-step navigation, and PDF generation
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import I9Section1FormClean from '@/components/I9Section1FormClean'
import { generateMappedI9Pdf } from '@/utils/i9PdfGeneratorMapped'
import axios from 'axios'

// Mock dependencies
jest.mock('axios')
jest.mock('@/utils/i9PdfGeneratorMapped')
jest.mock('@/components/ReviewAndSign', () => {
  return function MockReviewAndSign({ onConfirm, onCancel }: any) {
    return (
      <div data-testid="review-and-sign">
        <button onClick={() => onConfirm({ signature: 'mock-signature' })}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    )
  }
})

jest.mock('@/components/PDFViewerWithControls', () => {
  return function MockPDFViewer({ pdfUrl, title }: any) {
    return (
      <div data-testid="pdf-viewer">
        <div>PDF URL: {pdfUrl}</div>
        <div>Title: {title}</div>
      </div>
    )
  }
})

jest.mock('@/components/SignatureCapture', () => {
  return function MockSignatureCapture({ onSign, onCancel, title, description }: any) {
    return (
      <div data-testid="signature-capture">
        <div>{title}</div>
        <div>{description}</div>
        <button onClick={() => onSign('mock-signature-data')}>Sign</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    )
  }
})

// Mock fetch for PDF template
global.fetch = jest.fn().mockResolvedValue({
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
})

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn().mockReturnValue('mock-pdf-url')

describe('I9Section1FormClean', () => {
  const mockOnComplete = jest.fn()
  const mockOnValidationChange = jest.fn()
  
  const defaultProps = {
    onComplete: mockOnComplete,
    language: 'en' as const,
    onValidationChange: mockOnValidationChange,
    employeeId: 'test-123'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(generateMappedI9Pdf as jest.Mock).mockResolvedValue(new Uint8Array([1, 2, 3]))
  })

  describe('Component Rendering', () => {
    it('should render without errors', () => {
      render(<I9Section1FormClean {...defaultProps} />)
      expect(screen.getByText('Form I-9, Section 1')).toBeInTheDocument()
      expect(screen.getByText('Employment Eligibility Verification')).toBeInTheDocument()
    })

    it('should display progress bar with correct initial state', () => {
      render(<I9Section1FormClean {...defaultProps} />)
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
      // Check for heading specifically
      expect(screen.getByRole('heading', { name: 'Personal Information' })).toBeInTheDocument()
    })

    it('should load initial data when provided', () => {
      const initialData = {
        last_name: 'Smith',
        first_name: 'John',
        email: 'john.smith@example.com'
      }
      
      render(<I9Section1FormClean {...defaultProps} initialData={initialData} />)
      
      expect(screen.getByDisplayValue('Smith')).toBeInTheDocument()
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })
  })

  describe('Step 1: Personal Information', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      // Try to proceed without filling required fields
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      expect(screen.getByText('Last name is required')).toBeInTheDocument()
      expect(screen.getByText('First name is required')).toBeInTheDocument()
    })

    it('should accept valid personal information', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await user.type(screen.getByLabelText(/last name \*/i), 'Doe')
      await user.type(screen.getByLabelText(/first name \*/i), 'Jane')
      await user.type(screen.getByLabelText(/middle initial/i), 'M')
      
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Should move to step 2
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Address Information' })).toBeInTheDocument()
      })
    })

    it('should limit middle initial to 1 character', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      const middleInitialInput = screen.getByLabelText(/middle initial/i)
      await user.type(middleInitialInput, 'ABC')
      
      expect(middleInitialInput).toHaveValue('A')
    })
  })

  describe('Step 2: Address', () => {
    const fillPersonalInfo = async (user: any) => {
      await user.type(screen.getByLabelText(/last name \*/i), 'Doe')
      await user.type(screen.getByLabelText(/first name \*/i), 'Jane')
      await user.click(screen.getByRole('button', { name: /next/i }))
    }

    it('should validate address fields', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await fillPersonalInfo(user)
      
      // Try to proceed without filling required fields
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      expect(screen.getByText('Street address is required')).toBeInTheDocument()
      expect(screen.getByText('City is required')).toBeInTheDocument()
      expect(screen.getByText('State is required')).toBeInTheDocument()
      expect(screen.getByText('ZIP code is required')).toBeInTheDocument()
    })

    it('should validate ZIP code format', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await fillPersonalInfo(user)
      
      // Invalid ZIP
      await user.type(screen.getByLabelText(/zip code/i), '123')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      expect(screen.getByText('Invalid ZIP code format')).toBeInTheDocument()
      
      // Valid 5-digit ZIP
      await user.clear(screen.getByLabelText(/zip code/i))
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      
      // Valid ZIP+4
      await user.clear(screen.getByLabelText(/zip code/i))
      await user.type(screen.getByLabelText(/zip code/i), '12345-6789')
      
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'New York')
      await user.selectOptions(screen.getByLabelText(/state/i), 'NY')
      
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Should move to step 3
      expect(screen.getByText('Contact Information & Personal Details')).toBeInTheDocument()
    })
  })

  describe('Step 3: Contact & Details', () => {
    const navigateToStep3 = async (user: any) => {
      // Fill step 1
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/first name/i), 'Jane')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Fill step 2
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'New York')
      await user.selectOptions(screen.getByLabelText(/state/i), 'NY')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
    }

    it('should format SSN correctly', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await navigateToStep3(user)
      
      const ssnInput = screen.getByLabelText(/social security number/i)
      await user.type(ssnInput, '123456789')
      
      expect(ssnInput).toHaveValue('123-45-6789')
    })

    it('should format phone number correctly', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await navigateToStep3(user)
      
      const phoneInput = screen.getByLabelText(/phone number/i)
      await user.type(phoneInput, '5551234567')
      
      expect(phoneInput).toHaveValue('(555) 123-4567')
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await navigateToStep3(user)
      
      await user.type(screen.getByLabelText(/email/i), 'invalid-email')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
      
      await user.clear(screen.getByLabelText(/email/i))
      await user.type(screen.getByLabelText(/email/i), 'valid@email.com')
    })

    it('should validate SSN length', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await navigateToStep3(user)
      
      await user.type(screen.getByLabelText(/social security number/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      expect(screen.getByText('SSN must be 9 digits')).toBeInTheDocument()
    })
  })

  describe('Step 4: Citizenship Status', () => {
    const navigateToStep4 = async (user: any) => {
      // Fill steps 1-3
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/first name/i), 'Jane')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'New York')
      await user.selectOptions(screen.getByLabelText(/state/i), 'NY')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))
    }

    it('should require citizenship status selection', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await navigateToStep4(user)
      
      await user.click(screen.getByRole('button', { name: /preview & sign/i }))
      
      expect(screen.getByText('Please select your citizenship status')).toBeInTheDocument()
    })

    it('should show additional fields for permanent residents', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await navigateToStep4(user)
      
      await user.click(screen.getByLabelText(/lawful permanent resident/i))
      
      expect(screen.getByLabelText(/USCIS Number/i)).toBeInTheDocument()
      expect(screen.queryByLabelText(/expiration date/i)).not.toBeInTheDocument()
    })

    it('should show all additional fields for authorized aliens', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await navigateToStep4(user)
      
      await user.click(screen.getByLabelText(/alien authorized to work/i))
      
      expect(screen.getByLabelText(/Alien Registration Number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Work Authorization Expiration Date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Foreign Passport Number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Country of Issuance/i)).toBeInTheDocument()
    })

    it('should validate required fields for authorized aliens', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await navigateToStep4(user)
      
      await user.click(screen.getByLabelText(/alien authorized to work/i))
      await user.click(screen.getByRole('button', { name: /preview & sign/i }))
      
      expect(screen.getByText('Alien Registration Number is required')).toBeInTheDocument()
      expect(screen.getByText('Work authorization expiration date is required')).toBeInTheDocument()
    })
  })

  describe('PDF Generation and Preview', () => {
    const fillCompleteForm = async (user: any) => {
      // Step 1
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/first name/i), 'Jane')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Step 2
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'New York')
      await user.selectOptions(screen.getByLabelText(/state/i), 'NY')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Step 3
      await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Step 4
      await user.click(screen.getByLabelText(/citizen of the United States/i))
    }

    it('should generate PDF preview when form is complete', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await fillCompleteForm(user)
      
      await user.click(screen.getByRole('button', { name: /preview & sign/i }))
      
      await waitFor(() => {
        expect(generateMappedI9Pdf).toHaveBeenCalledWith(expect.objectContaining({
          last_name: 'Doe',
          first_name: 'Jane',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip_code: '12345',
          ssn: '123-45-6789',
          phone: '(555) 123-4567',
          citizenship_status: 'citizen'
        }))
      })
    })

    it('should display PDF viewer after generation', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await fillCompleteForm(user)
      await user.click(screen.getByRole('button', { name: /preview & sign/i }))
      
      await waitFor(() => {
        expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument()
        expect(screen.getByText('PDF URL: mock-pdf-url')).toBeInTheDocument()
      })
    })

    it('should show federal compliance notice before signing', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await fillCompleteForm(user)
      await user.click(screen.getByRole('button', { name: /preview & sign/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/By signing below, you attest under penalty of perjury/i)).toBeInTheDocument()
      })
    })
  })

  describe('Signature and Completion', () => {
    const navigateToSignature = async (user: any) => {
      // Fill complete form
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/first name/i), 'Jane')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'New York')
      await user.selectOptions(screen.getByLabelText(/state/i), 'NY')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByLabelText(/citizen of the United States/i))
      await user.click(screen.getByRole('button', { name: /preview & sign/i }))
      
      await waitFor(() => {
        expect(screen.getByTestId('signature-capture')).toBeInTheDocument()
      })
    }

    it('should complete form when signed', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await navigateToSignature(user)
      
      const signButton = within(screen.getByTestId('signature-capture')).getByText('Sign')
      await user.click(signButton)
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({
          last_name: 'Doe',
          first_name: 'Jane',
          signature: 'mock-signature-data',
          completedAt: expect.any(String)
        }))
      })
    })

    it('should save to backend for real employee IDs', async () => {
      const user = userEvent.setup()
      const realEmployeeProps = { ...defaultProps, employeeId: 'emp-123' }
      render(<I9Section1FormClean {...realEmployeeProps} />)
      
      await navigateToSignature(user)
      
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          '/api/onboarding/emp-123/i9-section1',
          expect.objectContaining({
            formData: expect.any(Object),
            signed: false
          })
        )
      })
    })

    it('should not save to backend for test employee IDs', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await navigateToSignature(user)
      
      await waitFor(() => {
        expect(screen.getByTestId('signature-capture')).toBeInTheDocument()
      })
      
      expect(axios.post).not.toHaveBeenCalled()
    })

    it('should allow canceling signature and returning to form', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      await navigateToSignature(user)
      
      const cancelButton = within(screen.getByTestId('signature-capture')).getByText('Cancel')
      await user.click(cancelButton)
      
      // Should return to step 4
      expect(screen.getByText('Citizenship Status')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should allow backward navigation between steps', async () => {
      const user = userEvent.setup()
      render(<I9Section1FormClean {...defaultProps} />)
      
      // Go to step 2
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/first name/i), 'Jane')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      expect(screen.getByText('Address Information')).toBeInTheDocument()
      
      // Go back to step 1
      await user.click(screen.getByRole('button', { name: /previous/i }))
      
      expect(screen.getByText('Personal Information')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
    })

    it('should disable previous button on first step', () => {
      render(<I9Section1FormClean {...defaultProps} />)
      
      const previousButton = screen.getByRole('button', { name: /previous/i })
      expect(previousButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should handle PDF generation errors gracefully', async () => {
      const user = userEvent.setup()
      ;(generateMappedI9Pdf as jest.Mock).mockRejectedValue(new Error('PDF generation failed'))
      
      render(<I9Section1FormClean {...defaultProps} />)
      
      // Fill form
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/first name/i), 'Jane')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'New York')
      await user.selectOptions(screen.getByLabelText(/state/i), 'NY')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByLabelText(/citizen of the United States/i))
      await user.click(screen.getByRole('button', { name: /preview & sign/i }))
      
      // Should still show review despite error
      await waitFor(() => {
        expect(screen.getByTestId('signature-capture')).toBeInTheDocument()
      })
    })

    it('should complete form even if backend save fails', async () => {
      const user = userEvent.setup()
      ;(axios.post as jest.Mock).mockRejectedValue(new Error('Backend error'))
      
      const realEmployeeProps = { ...defaultProps, employeeId: 'emp-123' }
      render(<I9Section1FormClean {...realEmployeeProps} />)
      
      // Navigate to signature
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/first name/i), 'Jane')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'New York')
      await user.selectOptions(screen.getByLabelText(/state/i), 'NY')
      await user.type(screen.getByLabelText(/zip code/i), '12345')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01')
      await user.type(screen.getByLabelText(/social security number/i), '123456789')
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
      await user.type(screen.getByLabelText(/phone/i), '5551234567')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByLabelText(/citizen of the United States/i))
      await user.click(screen.getByRole('button', { name: /preview & sign/i }))
      
      await waitFor(() => {
        expect(screen.getByTestId('signature-capture')).toBeInTheDocument()
      })
      
      const signButton = within(screen.getByTestId('signature-capture')).getByText('Sign')
      await user.click(signButton)
      
      // Should still call onComplete despite backend error
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })
    })
  })

  describe('Language Support', () => {
    it('should accept Spanish language prop', () => {
      const spanishProps = { ...defaultProps, language: 'es' as const }
      render(<I9Section1FormClean {...spanishProps} />)
      
      // Component should render successfully with es language
      expect(screen.getByText('Form I-9, Section 1')).toBeInTheDocument()
      // TODO: Add Spanish translations to component
    })
  })
})