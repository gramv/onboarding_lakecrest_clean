import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PersonalInformationStep from '../PersonalInformationStep'

describe('PersonalInformationStep', () => {
  const mockUpdateFormData = jest.fn()
  const mockOnComplete = jest.fn()
  
  const defaultProps = {
    formData: {},
    updateFormData: mockUpdateFormData,
    validationErrors: {},
    onComplete: mockOnComplete
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all form sections', () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      // Check section headers
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Contact Information')).toBeInTheDocument()
      expect(screen.getByText('Address')).toBeInTheDocument()
      expect(screen.getByText('Legal Information')).toBeInTheDocument()
    })

    it('should render all required fields with asterisks', () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      expect(screen.getByLabelText(/First Name \*/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Last Name \*/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Email Address \*/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Phone Number \*/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Street Address \*/)).toBeInTheDocument()
      expect(screen.getByLabelText(/City \*/)).toBeInTheDocument()
      expect(screen.getByLabelText(/State \*/)).toBeInTheDocument()
      expect(screen.getByLabelText(/ZIP Code \*/)).toBeInTheDocument()
    })

    it('should render optional fields without asterisks', () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      expect(screen.getByLabelText('Middle Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Salutation')).toBeInTheDocument()
      expect(screen.getByLabelText('Unit/Apt #')).toBeInTheDocument()
      expect(screen.getByLabelText('Alternate Phone')).toBeInTheDocument()
      expect(screen.getByLabelText('Social Security Number')).toBeInTheDocument()
      expect(screen.getByLabelText('Date of Birth')).toBeInTheDocument()
    })

    it('should display initial form data', () => {
      const propsWithData = {
        ...defaultProps,
        formData: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '(555) 123-4567'
        }
      }
      
      render(<PersonalInformationStep {...propsWithData} />)
      
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('(555) 123-4567')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should update form data when typing in text fields', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const firstNameInput = screen.getByLabelText(/First Name \*/)
      await userEvent.type(firstNameInput, 'Jane')
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ first_name: 'J' })
      expect(mockUpdateFormData).toHaveBeenCalledWith({ first_name: 'Ja' })
      expect(mockUpdateFormData).toHaveBeenCalledWith({ first_name: 'Jan' })
      expect(mockUpdateFormData).toHaveBeenCalledWith({ first_name: 'Jane' })
    })

    it('should format phone number as user types', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const phoneInput = screen.getByPlaceholderText('(555) 123-4567')
      await userEvent.type(phoneInput, '5551234567')
      
      // Check that the formatted value is passed to updateFormData
      expect(mockUpdateFormData).toHaveBeenLastCalledWith({ phone: '(555) 123-4567' })
    })

    it('should limit ZIP code to 5 digits', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const zipInput = screen.getByLabelText(/ZIP Code \*/)
      await userEvent.type(zipInput, '123456789')
      
      // Should only accept first 5 digits
      expect(mockUpdateFormData).toHaveBeenLastCalledWith({ zip_code: '12345' })
    })

    it('should handle salutation selection', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const salutationSelect = screen.getByLabelText('Salutation')
      fireEvent.click(salutationSelect)
      
      const mrOption = screen.getByText('Mr.')
      fireEvent.click(mrOption)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ salutation: 'Mr.' })
    })

    it('should handle state selection', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const stateSelect = screen.getByLabelText(/State \*/)
      fireEvent.click(stateSelect)
      
      const nyOption = screen.getByText('NY')
      fireEvent.click(nyOption)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ state: 'NY' })
    })

    it('should handle phone type selection', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const phoneTypeSelects = screen.getAllByText('Type')
      fireEvent.click(phoneTypeSelects[0])
      
      const cellOption = screen.getByText('Cell')
      fireEvent.click(cellOption)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ phone_type: 'cell' })
    })

    it('should handle age verification checkbox', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const ageCheckbox = screen.getByLabelText(/I certify that I am 18 years/)
      await userEvent.click(ageCheckbox)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ age_verification: true })
    })

    it('should handle transportation radio selection', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const yesRadio = screen.getByLabelText('Yes')
      await userEvent.click(yesRadio)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ reliable_transportation: 'yes' })
      
      const noRadio = screen.getByLabelText('No')
      await userEvent.click(noRadio)
      
      expect(mockUpdateFormData).toHaveBeenCalledWith({ reliable_transportation: 'no' })
    })
  })

  describe('Validation', () => {
    it('should show validation error for invalid email', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/Email Address \*/)
      await userEvent.type(emailInput, 'invalid-email')
      await userEvent.tab() // Trigger blur
      
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email address/)).toBeInTheDocument()
      })
    })

    it('should show validation error for short phone number', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const phoneInput = screen.getByPlaceholderText('(555) 123-4567')
      await userEvent.type(phoneInput, '555')
      await userEvent.tab()
      
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid phone number/)).toBeInTheDocument()
      })
    })

    it('should show validation error for short ZIP code', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const zipInput = screen.getByLabelText(/ZIP Code \*/)
      await userEvent.type(zipInput, '123')
      await userEvent.tab()
      
      await waitFor(() => {
        expect(screen.getByText(/ZIP code must be 5 digits/)).toBeInTheDocument()
      })
    })

    it('should not show errors for untouched fields', () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      // Should not show any validation errors initially
      expect(screen.queryByText(/Please enter/)).not.toBeInTheDocument()
      expect(screen.queryByText(/must be/)).not.toBeInTheDocument()
    })

    it('should show external validation errors', () => {
      const propsWithErrors = {
        ...defaultProps,
        validationErrors: {
          email: 'Email already exists',
          phone: 'Phone number already registered'
        }
      }
      
      render(<PersonalInformationStep {...propsWithErrors} />)
      
      // External errors should show even without touching fields
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
      expect(screen.getByText('Phone number already registered')).toBeInTheDocument()
    })
  })

  describe('Form Completion', () => {
    it('should call onComplete(false) when form is incomplete', () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      expect(mockOnComplete).toHaveBeenCalledWith(false)
    })

    it('should call onComplete(true) when all required fields are filled', async () => {
      const completeFormData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567',
        phone_type: 'cell',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
        age_verification: true,
        reliable_transportation: 'yes'
      }
      
      render(<PersonalInformationStep {...defaultProps} formData={completeFormData} />)
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(true)
      })
    })

    it('should call onComplete(false) when required field is removed', async () => {
      const completeFormData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567',
        phone_type: 'cell',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
        age_verification: true,
        reliable_transportation: 'yes'
      }
      
      const { rerender } = render(<PersonalInformationStep {...defaultProps} formData={completeFormData} />)
      
      // Remove a required field
      const incompleteFormData = { ...completeFormData, first_name: '' }
      rerender(<PersonalInformationStep {...defaultProps} formData={incompleteFormData} />)
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenLastCalledWith(false)
      })
    })
  })

  describe('Special Field Behaviors', () => {
    it('should limit SSN to 9 digits', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const ssnInput = screen.getByLabelText('Social Security Number')
      await userEvent.type(ssnInput, '1234567890')
      
      expect(mockUpdateFormData).toHaveBeenLastCalledWith({ ssn: '123456789' })
    })

    it('should enforce minimum age of 16 for date of birth', () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const dobInput = screen.getByLabelText('Date of Birth') as HTMLInputElement
      
      // Check max date is set correctly (16 years ago)
      const maxDate = new Date()
      maxDate.setFullYear(maxDate.getFullYear() - 16)
      expect(dobInput.max).toBe(maxDate.toISOString().split('T')[0])
    })

    it('should show helpful text for optional fields', () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      expect(screen.getByText('Optional - Will be requested if you are offered employment')).toBeInTheDocument()
      expect(screen.getByText('Must be at least 16 years old to apply')).toBeInTheDocument()
    })

    it('should format alternate phone number', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const altPhoneInput = screen.getByPlaceholderText('(555) 987-6543')
      await userEvent.type(altPhoneInput, '5559876543')
      
      expect(mockUpdateFormData).toHaveBeenLastCalledWith({ alternate_phone: '(555) 987-6543' })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      // Check that all inputs have associated labels
      const inputs = screen.getAllByRole('textbox')
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName()
      })
      
      const selects = screen.getAllByRole('combobox')
      selects.forEach(select => {
        expect(select).toHaveAccessibleName()
      })
    })

    it('should have proper ARIA attributes for required fields', () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const firstNameInput = screen.getByLabelText(/First Name \*/)
      expect(firstNameInput).toHaveAttribute('required')
      
      const emailInput = screen.getByLabelText(/Email Address \*/)
      expect(emailInput).toHaveAttribute('required')
    })

    it('should show icons for visual context', () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      // Check for icon presence (they're rendered as SVGs)
      const container = screen.getByLabelText(/First Name \*/).parentElement
      expect(container?.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined form data gracefully', () => {
      const propsWithUndefined = {
        ...defaultProps,
        formData: undefined as any
      }
      
      render(<PersonalInformationStep {...propsWithUndefined} />)
      
      // Should render without errors
      expect(screen.getByLabelText(/First Name \*/)).toHaveValue('')
    })

    it('should handle rapid input changes', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const firstNameInput = screen.getByLabelText(/First Name \*/)
      
      // Simulate rapid typing
      await userEvent.type(firstNameInput, 'abcdefghijklmnop', { delay: 1 })
      
      // Should handle all input events
      expect(mockUpdateFormData).toHaveBeenCalledTimes(16)
    })

    it('should prevent special characters in numeric fields', async () => {
      render(<PersonalInformationStep {...defaultProps} />)
      
      const zipInput = screen.getByLabelText(/ZIP Code \*/)
      await userEvent.type(zipInput, 'abc!@#123')
      
      // Should only accept numeric characters
      expect(mockUpdateFormData).toHaveBeenLastCalledWith({ zip_code: '123' })
    })
  })
})