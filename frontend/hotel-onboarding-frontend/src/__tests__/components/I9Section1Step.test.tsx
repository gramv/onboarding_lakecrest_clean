/**
 * Tests for I9Section1Step component
 * Tests federal I-9 Section 1 compliance and validation
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import I9Section1Step from '@/pages/onboarding/I9Section1Step'
import { StepProps } from '@/types/form'
import * as federalValidation from '@/utils/federalValidation'

// Mock the I9 form component
jest.mock('@/components/I9Section1Form', () => {
  return function MockI9Section1Form({ onSubmit, onValidate, initialData, language }: any) {
    const [errors, setErrors] = React.useState<string[]>([])
    
    const handleSubmit = () => {
      const mockData = {
        lastName: 'Doe',
        firstName: 'John',
        middleInitial: 'A',
        birthDate: '1990-01-01',
        ssn: '123-45-6789',
        email: 'john.doe@example.com',
        phone: '555-0123',
        address: '123 Main St',
        city: 'Anytown',
        state: 'ST',
        zipCode: '12345',
        citizenshipStatus: 'citizen',
        signature: 'John A. Doe',
        signatureDate: new Date().toISOString()
      }
      
      // Simulate validation
      const validationErrors = []
      if (!mockData.ssn.match(/^\d{3}-\d{2}-\d{4}$/)) {
        validationErrors.push('Invalid SSN format')
      }
      
      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        onValidate(false)
      } else {
        setErrors([])
        onValidate(true)
        onSubmit(mockData)
      }
    }
    
    return (
      <div data-testid="i9-section1-form">
        <h2>{language === 'es' ? 'Sección 1 del Formulario I-9' : 'I-9 Section 1'}</h2>
        {errors.length > 0 && (
          <div data-testid="validation-errors">
            {errors.map((error, i) => <p key={i}>{error}</p>)}
          </div>
        )}
        <button onClick={handleSubmit}>Submit I-9 Section 1</button>
        <button onClick={() => {
          const alienData = { ...mockData, citizenshipStatus: 'alien_authorized' }
          onSubmit(alienData)
        }}>Submit as Alien</button>
      </div>
    )
  }
})

// Mock federal validation
jest.mock('@/utils/federalValidation', () => ({
  validateI9Section1: jest.fn(),
  validateSSN: jest.fn(),
  validateI9Dates: jest.fn()
}))

describe('I9Section1Step', () => {
  const mockProps: StepProps = {
    currentStep: { id: 'i9-section1', title: 'I-9 Section 1' },
    progress: { stepData: {} },
    markStepComplete: jest.fn(),
    saveProgress: jest.fn(),
    language: 'en',
    employee: { id: 'emp-123', name: 'Test Employee' },
    property: { id: 'prop-123', name: 'Test Hotel' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(federalValidation.validateI9Section1 as jest.Mock).mockReturnValue([])
    ;(federalValidation.validateSSN as jest.Mock).mockReturnValue(true)
    ;(federalValidation.validateI9Dates as jest.Mock).mockReturnValue(true)
  })

  it('should render without errors', () => {
    render(<I9Section1Step {...mockProps} />)
    expect(screen.getByText(/employment eligibility verification/i)).toBeInTheDocument()
  })

  it('should display federal compliance disclaimer', () => {
    render(<I9Section1Step {...mockProps} />)
    expect(screen.getByText(/federal law requires/i)).toBeInTheDocument()
  })

  it('should load existing I-9 data from progress', () => {
    const propsWithData = {
      ...mockProps,
      progress: {
        stepData: {
          'i9-section1': {
            lastName: 'Existing',
            firstName: 'User',
            citizenshipStatus: 'citizen'
          }
        }
      }
    }

    render(<I9Section1Step {...propsWithData} />)
    expect(screen.getByTestId('i9-section1-form')).toBeInTheDocument()
  })

  it('should validate federal requirements before saving', async () => {
    const user = userEvent.setup()
    
    // Mock validation to return errors
    ;(federalValidation.validateI9Section1 as jest.Mock).mockReturnValue([
      'SSN is required',
      'Birth date cannot be in the future'
    ])

    render(<I9Section1Step {...mockProps} />)

    await user.click(screen.getByText('Submit I-9 Section 1'))

    await waitFor(() => {
      expect(federalValidation.validateI9Section1).toHaveBeenCalled()
      expect(mockProps.saveProgress).not.toHaveBeenCalled()
    })
  })

  it('should save progress when validation passes', async () => {
    const user = userEvent.setup()
    render(<I9Section1Step {...mockProps} />)

    await user.click(screen.getByText('Submit I-9 Section 1'))

    await waitFor(() => {
      expect(mockProps.saveProgress).toHaveBeenCalledWith('i9-section1', expect.objectContaining({
        lastName: 'Doe',
        firstName: 'John',
        ssn: '123-45-6789',
        citizenshipStatus: 'citizen'
      }))
    })
  })

  it('should validate SSN format', async () => {
    const user = userEvent.setup()
    
    ;(federalValidation.validateSSN as jest.Mock).mockReturnValue(false)
    ;(federalValidation.validateI9Section1 as jest.Mock).mockReturnValue(['Invalid SSN format'])

    render(<I9Section1Step {...mockProps} />)

    await user.click(screen.getByText('Submit I-9 Section 1'))

    await waitFor(() => {
      expect(federalValidation.validateSSN).toHaveBeenCalledWith('123-45-6789')
      expect(mockProps.saveProgress).not.toHaveBeenCalled()
    })
  })

  it('should handle alien work authorization requirements', async () => {
    const user = userEvent.setup()
    render(<I9Section1Step {...mockProps} />)

    await user.click(screen.getByText('Submit as Alien'))

    await waitFor(() => {
      expect(mockProps.saveProgress).toHaveBeenCalledWith('i9-section1', expect.objectContaining({
        citizenshipStatus: 'alien_authorized'
      }))
    })
  })

  it('should require digital signature', async () => {
    const user = userEvent.setup()
    render(<I9Section1Step {...mockProps} />)

    await user.click(screen.getByText('Submit I-9 Section 1'))

    await waitFor(() => {
      expect(mockProps.saveProgress).toHaveBeenCalledWith('i9-section1', expect.objectContaining({
        signature: expect.any(String),
        signatureDate: expect.any(String)
      }))
    })
  })

  it('should mark step complete only after successful submission', async () => {
    const user = userEvent.setup()
    render(<I9Section1Step {...mockProps} />)

    await user.click(screen.getByText('Submit I-9 Section 1'))

    await waitFor(() => {
      expect(mockProps.markStepComplete).toHaveBeenCalledWith('i9-section1', expect.any(Object))
    })
  })

  it('should display validation errors to user', async () => {
    const user = userEvent.setup()
    
    ;(federalValidation.validateI9Section1 as jest.Mock).mockReturnValue([
      'SSN is required',
      'Birth date is required'
    ])

    render(<I9Section1Step {...mockProps} />)

    await user.click(screen.getByText('Submit I-9 Section 1'))

    await waitFor(() => {
      expect(screen.getByText(/SSN is required/i)).toBeInTheDocument()
      expect(screen.getByText(/Birth date is required/i)).toBeInTheDocument()
    })
  })

  it('should support Spanish language', () => {
    const spanishProps = { ...mockProps, language: 'es' as const }
    render(<I9Section1Step {...spanishProps} />)

    expect(screen.getByText(/verificación de elegibilidad de empleo/i)).toBeInTheDocument()
    expect(screen.getByText(/Sección 1 del Formulario I-9/i)).toBeInTheDocument()
  })

  it('should track completion timestamp', async () => {
    const user = userEvent.setup()
    render(<I9Section1Step {...mockProps} />)

    const beforeSubmit = new Date()
    await user.click(screen.getByText('Submit I-9 Section 1'))

    await waitFor(() => {
      expect(mockProps.saveProgress).toHaveBeenCalledWith('i9-section1', expect.objectContaining({
        signatureDate: expect.any(String)
      }))
      
      const call = (mockProps.saveProgress as jest.Mock).mock.calls[0]
      const signatureDate = new Date(call[1].signatureDate)
      expect(signatureDate.getTime()).toBeGreaterThanOrEqual(beforeSubmit.getTime())
    })
  })

  it('should prevent submission if under 18', async () => {
    const user = userEvent.setup()
    
    ;(federalValidation.validateI9Dates as jest.Mock).mockReturnValue(false)
    ;(federalValidation.validateI9Section1 as jest.Mock).mockReturnValue([
      'Must be at least 18 years old to work'
    ])

    render(<I9Section1Step {...mockProps} />)

    await user.click(screen.getByText('Submit I-9 Section 1'))

    await waitFor(() => {
      expect(mockProps.saveProgress).not.toHaveBeenCalled()
      expect(screen.getByText(/must be at least 18/i)).toBeInTheDocument()
    })
  })
})