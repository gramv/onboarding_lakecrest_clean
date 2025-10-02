/**
 * Tests for W4FormStep component
 * Tests federal W-4 tax form compliance and calculations
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import W4FormStep from '@/pages/onboarding/W4FormStep'
import { StepProps } from '@/types/form'
import * as federalValidation from '@/utils/federalValidation'

// Mock the W4 form component
jest.mock('@/components/W4Form', () => {
  return function MockW4Form({ onSubmit, onValidate, initialData, language }: any) {
    const handleSubmit = () => {
      const mockData = {
        firstName: 'John',
        lastName: 'Doe',
        ssn: '123-45-6789',
        address: '123 Main St',
        city: 'Anytown',
        state: 'ST',
        zipCode: '12345',
        filingStatus: 'single',
        multipleJobs: false,
        dependentsAmount: 0,
        otherIncome: 0,
        deductions: 0,
        extraWithholding: 0,
        signature: 'John Doe',
        signatureDate: new Date().toISOString()
      }
      
      onValidate(true)
      onSubmit(mockData)
    }
    
    const handleMarriedSubmit = () => {
      const marriedData = {
        firstName: 'Jane',
        lastName: 'Smith',
        ssn: '987-65-4321',
        address: '456 Oak Ave',
        city: 'Somewhere',
        state: 'ST',
        zipCode: '54321',
        filingStatus: 'married_filing_jointly',
        multipleJobs: true,
        spouseWorks: true,
        dependentsAmount: 4000, // Two children
        otherIncome: 5000,
        deductions: 2000,
        extraWithholding: 50,
        signature: 'Jane Smith',
        signatureDate: new Date().toISOString()
      }
      
      onValidate(true)
      onSubmit(marriedData)
    }
    
    return (
      <div data-testid="w4-form">
        <h2>{language === 'es' ? 'Formulario W-4' : 'W-4 Form'}</h2>
        <button onClick={handleSubmit}>Submit Single Filer</button>
        <button onClick={handleMarriedSubmit}>Submit Married Filer</button>
        <button onClick={() => {
          onValidate(false)
        }}>Trigger Validation Error</button>
      </div>
    )
  }
})

// Mock federal validation and calculations
jest.mock('@/utils/federalValidation', () => ({
  validateW4Form: jest.fn(),
  calculateW4Withholding: jest.fn(),
  validateDependentAmount: jest.fn()
}))

describe('W4FormStep', () => {
  const mockProps: StepProps = {
    currentStep: { id: 'w4-form', title: 'W-4 Tax Information' },
    progress: { stepData: {} },
    markStepComplete: jest.fn(),
    saveProgress: jest.fn(),
    language: 'en',
    employee: { id: 'emp-123', name: 'Test Employee' },
    property: { id: 'prop-123', name: 'Test Hotel' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(federalValidation.validateW4Form as jest.Mock).mockReturnValue([])
    ;(federalValidation.calculateW4Withholding as jest.Mock).mockReturnValue({
      annualWithholding: 5000,
      perPayPeriodWithholding: 192.31
    })
    ;(federalValidation.validateDependentAmount as jest.Mock).mockReturnValue(true)
  })

  it('should render without errors', () => {
    render(<W4FormStep {...mockProps} />)
    expect(screen.getByText(/employee.*withholding certificate/i)).toBeInTheDocument()
  })

  it('should display IRS compliance notice', () => {
    render(<W4FormStep {...mockProps} />)
    expect(screen.getByText(/irs.*requirements/i)).toBeInTheDocument()
  })

  it('should load existing W-4 data from progress', () => {
    const propsWithData = {
      ...mockProps,
      progress: {
        stepData: {
          'w4-form': {
            filingStatus: 'married_filing_jointly',
            dependentsAmount: 2000,
            multipleJobs: true
          }
        }
      }
    }

    render(<W4FormStep {...propsWithData} />)
    expect(screen.getByTestId('w4-form')).toBeInTheDocument()
  })

  it('should validate W-4 form before saving', async () => {
    const user = userEvent.setup()
    
    ;(federalValidation.validateW4Form as jest.Mock).mockReturnValue([
      'Invalid filing status',
      'SSN is required'
    ])

    render(<W4FormStep {...mockProps} />)

    await user.click(screen.getByText('Submit Single Filer'))

    await waitFor(() => {
      expect(federalValidation.validateW4Form).toHaveBeenCalled()
      expect(mockProps.saveProgress).not.toHaveBeenCalled()
    })
  })

  it('should calculate withholding for single filer', async () => {
    const user = userEvent.setup()
    render(<W4FormStep {...mockProps} />)

    await user.click(screen.getByText('Submit Single Filer'))

    await waitFor(() => {
      expect(federalValidation.calculateW4Withholding).toHaveBeenCalledWith(
        expect.objectContaining({
          filingStatus: 'single',
          multipleJobs: false,
          dependentsAmount: 0
        }),
        expect.any(Number) // Annual income
      )
    })
  })

  it('should calculate withholding for married filer with dependents', async () => {
    const user = userEvent.setup()
    render(<W4FormStep {...mockProps} />)

    await user.click(screen.getByText('Submit Married Filer'))

    await waitFor(() => {
      expect(federalValidation.calculateW4Withholding).toHaveBeenCalledWith(
        expect.objectContaining({
          filingStatus: 'married_filing_jointly',
          multipleJobs: true,
          dependentsAmount: 4000, // Two children
          otherIncome: 5000,
          deductions: 2000,
          extraWithholding: 50
        }),
        expect.any(Number)
      )
    })
  })

  it('should validate dependent amounts are multiples of $500 or $2000', async () => {
    const user = userEvent.setup()
    
    ;(federalValidation.validateDependentAmount as jest.Mock).mockReturnValue(false)
    ;(federalValidation.validateW4Form as jest.Mock).mockReturnValue([
      'Dependent amount must be a multiple of $500 or $2000'
    ])

    render(<W4FormStep {...mockProps} />)

    await user.click(screen.getByText('Submit Married Filer'))

    await waitFor(() => {
      expect(federalValidation.validateDependentAmount).toHaveBeenCalledWith(4000)
      expect(mockProps.saveProgress).not.toHaveBeenCalled()
    })
  })

  it('should save W-4 data with calculated withholding', async () => {
    const user = userEvent.setup()
    render(<W4FormStep {...mockProps} />)

    await user.click(screen.getByText('Submit Single Filer'))

    await waitFor(() => {
      expect(mockProps.saveProgress).toHaveBeenCalledWith('w4-form', expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
        ssn: '123-45-6789',
        filingStatus: 'single',
        calculatedWithholding: {
          annualWithholding: 5000,
          perPayPeriodWithholding: 192.31
        }
      }))
    })
  })

  it('should require digital signature', async () => {
    const user = userEvent.setup()
    render(<W4FormStep {...mockProps} />)

    await user.click(screen.getByText('Submit Single Filer'))

    await waitFor(() => {
      expect(mockProps.saveProgress).toHaveBeenCalledWith('w4-form', expect.objectContaining({
        signature: expect.any(String),
        signatureDate: expect.any(String)
      }))
    })
  })

  it('should mark step complete after successful submission', async () => {
    const user = userEvent.setup()
    render(<W4FormStep {...mockProps} />)

    await user.click(screen.getByText('Submit Single Filer'))

    await waitFor(() => {
      expect(mockProps.markStepComplete).toHaveBeenCalledWith('w4-form', expect.any(Object))
    })
  })

  it('should handle Step 2 multiple jobs checkbox', async () => {
    const user = userEvent.setup()
    render(<W4FormStep {...mockProps} />)

    await user.click(screen.getByText('Submit Married Filer'))

    await waitFor(() => {
      expect(mockProps.saveProgress).toHaveBeenCalledWith('w4-form', expect.objectContaining({
        multipleJobs: true,
        spouseWorks: true
      }))
    })
  })

  it('should support Spanish language', () => {
    const spanishProps = { ...mockProps, language: 'es' as const }
    render(<W4FormStep {...spanishProps} />)

    expect(screen.getByText(/certificado de retención del empleado/i)).toBeInTheDocument()
    expect(screen.getByText(/Formulario W-4/i)).toBeInTheDocument()
  })

  it('should display withholding calculation results', async () => {
    const user = userEvent.setup()
    render(<W4FormStep {...mockProps} />)

    await user.click(screen.getByText('Submit Single Filer'))

    await waitFor(() => {
      expect(screen.getByText(/estimated.*withholding/i)).toBeInTheDocument()
    })
  })

  it('should handle validation errors gracefully', async () => {
    const user = userEvent.setup()
    render(<W4FormStep {...mockProps} />)

    await user.click(screen.getByText('Trigger Validation Error'))

    await waitFor(() => {
      expect(mockProps.saveProgress).not.toHaveBeenCalled()
      expect(mockProps.markStepComplete).not.toHaveBeenCalled()
    })
  })

  it('should track form completion timestamp', async () => {
    const user = userEvent.setup()
    render(<W4FormStep {...mockProps} />)

    const beforeSubmit = new Date()
    await user.click(screen.getByText('Submit Single Filer'))

    await waitFor(() => {
      const call = (mockProps.saveProgress as jest.Mock).mock.calls[0]
      const signatureDate = new Date(call[1].signatureDate)
      expect(signatureDate.getTime()).toBeGreaterThanOrEqual(beforeSubmit.getTime())
    })
  })
})