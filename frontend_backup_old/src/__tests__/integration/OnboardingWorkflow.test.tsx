/**
 * Integration tests for complete onboarding workflow
 * Tests navigation, data persistence, and compliance across all steps
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import EnhancedOnboardingPortal from '@/pages/EnhancedOnboardingPortal'
import { AuthProvider } from '@/contexts/AuthContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import * as api from '@/services/api'

// Mock API calls
jest.mock('@/services/api', () => ({
  getOnboardingSession: jest.fn(),
  saveOnboardingProgress: jest.fn(),
  submitOnboarding: jest.fn(),
  validateI9Data: jest.fn(),
  validateW4Data: jest.fn(),
  generatePDF: jest.fn()
}))

// Mock all step components to simplify testing
const mockSteps = [
  'WelcomeStep',
  'PersonalInfoStep',
  'I9Section1Step',
  'DocumentUploadStep',
  'W4FormStep',
  'DirectDepositStep',
  'HealthInsuranceStep',
  'CompanyPoliciesStep',
  'FinalReviewStep'
]

mockSteps.forEach(stepName => {
  jest.mock(`@/pages/onboarding/${stepName}`, () => {
    return function MockStep({ markStepComplete, currentStep }: any) {
      return (
        <div data-testid={`mock-${stepName}`}>
          <h2>{stepName}</h2>
          <button onClick={() => markStepComplete(currentStep.id)}>
            Complete {stepName}
          </button>
        </div>
      )
    }
  })
})

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          {component}
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('OnboardingWorkflow Integration', () => {
  const mockToken = 'test-onboarding-token-123'
  const mockSession = {
    id: 'session-123',
    token: mockToken,
    employee: {
      id: 'emp-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    },
    property: {
      id: 'prop-123',
      name: 'Test Hotel'
    },
    progress: {
      currentStep: 'welcome',
      completedSteps: [],
      stepData: {}
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(api.getOnboardingSession as jest.Mock).mockResolvedValue(mockSession)
    ;(api.saveOnboardingProgress as jest.Mock).mockResolvedValue({ success: true })
    ;(api.submitOnboarding as jest.Mock).mockResolvedValue({ success: true })
    ;(api.validateI9Data as jest.Mock).mockResolvedValue({ valid: true })
    ;(api.validateW4Data as jest.Mock).mockResolvedValue({ valid: true })
  })

  it('should load onboarding session on mount', async () => {
    renderWithProviders(<EnhancedOnboardingPortal />)

    await waitFor(() => {
      expect(api.getOnboardingSession).toHaveBeenCalledWith(mockToken)
      expect(screen.getByText(/welcome.*john doe/i)).toBeInTheDocument()
    })
  })

  it('should display progress indicator', async () => {
    renderWithProviders(<EnhancedOnboardingPortal />)

    await waitFor(() => {
      expect(screen.getByText(/step.*1.*of.*9/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  it('should navigate through steps sequentially', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EnhancedOnboardingPortal />)

    // Start at welcome step
    await waitFor(() => {
      expect(screen.getByTestId('mock-WelcomeStep')).toBeInTheDocument()
    })

    // Complete welcome and move to personal info
    await user.click(screen.getByText('Complete WelcomeStep'))
    
    await waitFor(() => {
      expect(screen.getByTestId('mock-PersonalInfoStep')).toBeInTheDocument()
      expect(api.saveOnboardingProgress).toHaveBeenCalledWith(mockToken, expect.objectContaining({
        currentStep: 'personal-info',
        completedSteps: expect.arrayContaining(['welcome'])
      }))
    })
  })

  it('should save progress after each step', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EnhancedOnboardingPortal />)

    await waitFor(() => screen.getByTestId('mock-WelcomeStep'))

    // Complete multiple steps
    const stepsToComplete = ['WelcomeStep', 'PersonalInfoStep', 'I9Section1Step']
    
    for (const step of stepsToComplete) {
      const button = screen.getByText(`Complete ${step}`)
      await user.click(button)
      
      await waitFor(() => {
        expect(api.saveOnboardingProgress).toHaveBeenCalled()
      })
    }

    // Verify progress was saved correctly
    expect(api.saveOnboardingProgress).toHaveBeenCalledTimes(stepsToComplete.length)
  })

  it('should validate federal forms before progression', async () => {
    const user = userEvent.setup()
    
    // Mock I-9 validation failure
    ;(api.validateI9Data as jest.Mock).mockResolvedValue({ 
      valid: false, 
      errors: ['SSN is required', 'Citizenship status not selected'] 
    })

    renderWithProviders(<EnhancedOnboardingPortal />)

    // Navigate to I-9 step
    await waitFor(() => screen.getByTestId('mock-WelcomeStep'))
    await user.click(screen.getByText('Complete WelcomeStep'))
    await user.click(screen.getByText('Complete PersonalInfoStep'))

    // Try to complete I-9 with validation errors
    await user.click(screen.getByText('Complete I9Section1Step'))

    await waitFor(() => {
      expect(api.validateI9Data).toHaveBeenCalled()
      expect(screen.getByText(/SSN is required/i)).toBeInTheDocument()
      expect(screen.getByText(/Citizenship status not selected/i)).toBeInTheDocument()
    })
  })

  it('should enforce step order and prevent skipping', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EnhancedOnboardingPortal />)

    await waitFor(() => screen.getByTestId('mock-WelcomeStep'))

    // Try to navigate directly to a later step via URL
    window.history.pushState({}, '', '/onboarding/w4-form')

    // Should redirect back to current step
    await waitFor(() => {
      expect(screen.getByTestId('mock-WelcomeStep')).toBeInTheDocument()
      expect(screen.getByText(/must complete.*previous steps/i)).toBeInTheDocument()
    })
  })

  it('should handle language switching throughout workflow', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EnhancedOnboardingPortal />)

    await waitFor(() => screen.getByTestId('mock-WelcomeStep'))

    // Find and click language toggle
    const languageToggle = screen.getByRole('button', { name: /español/i })
    await user.click(languageToggle)

    await waitFor(() => {
      expect(screen.getByText(/bienvenido/i)).toBeInTheDocument()
    })

    // Language preference should persist across steps
    await user.click(screen.getByText('Complete WelcomeStep'))
    
    await waitFor(() => {
      expect(screen.getByText(/información personal/i)).toBeInTheDocument()
    })
  })

  it('should display final review with all collected data', async () => {
    const user = userEvent.setup()
    
    // Mock session with completed data
    const completedSession = {
      ...mockSession,
      progress: {
        currentStep: 'final-review',
        completedSteps: ['welcome', 'personal-info', 'i9-section1', 'documents', 'w4-form'],
        stepData: {
          'personal-info': { firstName: 'John', lastName: 'Doe' },
          'i9-section1': { citizenshipStatus: 'citizen' },
          'w4-form': { filingStatus: 'single' }
        }
      }
    }
    
    ;(api.getOnboardingSession as jest.Mock).mockResolvedValue(completedSession)

    renderWithProviders(<EnhancedOnboardingPortal />)

    await waitFor(() => {
      expect(screen.getByTestId('mock-FinalReviewStep')).toBeInTheDocument()
      expect(screen.getByText(/review.*information/i)).toBeInTheDocument()
    })
  })

  it('should generate PDFs before final submission', async () => {
    const user = userEvent.setup()
    
    ;(api.generatePDF as jest.Mock).mockResolvedValue({ 
      url: 'http://example.com/i9.pdf',
      documentId: 'doc-123'
    })

    const completedSession = {
      ...mockSession,
      progress: {
        currentStep: 'final-review',
        completedSteps: ['welcome', 'personal-info', 'i9-section1', 'w4-form'],
        stepData: { /* all required data */ }
      }
    }
    
    ;(api.getOnboardingSession as jest.Mock).mockResolvedValue(completedSession)

    renderWithProviders(<EnhancedOnboardingPortal />)

    await waitFor(() => screen.getByTestId('mock-FinalReviewStep'))

    const submitButton = screen.getByRole('button', { name: /submit.*onboarding/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(api.generatePDF).toHaveBeenCalledWith(mockToken, 'i9')
      expect(api.generatePDF).toHaveBeenCalledWith(mockToken, 'w4')
    })
  })

  it('should handle submission errors gracefully', async () => {
    const user = userEvent.setup()
    
    ;(api.submitOnboarding as jest.Mock).mockRejectedValue(new Error('Network error'))

    const completedSession = {
      ...mockSession,
      progress: {
        currentStep: 'final-review',
        completedSteps: ['all-steps-completed'],
        stepData: { /* all data */ }
      }
    }
    
    ;(api.getOnboardingSession as jest.Mock).mockResolvedValue(completedSession)

    renderWithProviders(<EnhancedOnboardingPortal />)

    await waitFor(() => screen.getByTestId('mock-FinalReviewStep'))

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/error.*submitting/i)).toBeInTheDocument()
      expect(screen.getByText(/please try again/i)).toBeInTheDocument()
    })
  })

  it('should show completion confirmation after successful submission', async () => {
    const user = userEvent.setup()
    
    const completedSession = {
      ...mockSession,
      progress: {
        currentStep: 'final-review',
        completedSteps: ['all-required-steps'],
        stepData: { /* all data */ }
      }
    }
    
    ;(api.getOnboardingSession as jest.Mock).mockResolvedValue(completedSession)

    renderWithProviders(<EnhancedOnboardingPortal />)

    await waitFor(() => screen.getByTestId('mock-FinalReviewStep'))

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(api.submitOnboarding).toHaveBeenCalledWith(mockToken)
      expect(screen.getByText(/congratulations/i)).toBeInTheDocument()
      expect(screen.getByText(/onboarding.*complete/i)).toBeInTheDocument()
    })
  })

  it('should handle session expiration', async () => {
    ;(api.getOnboardingSession as jest.Mock).mockRejectedValue({ 
      status: 401, 
      message: 'Session expired' 
    })

    renderWithProviders(<EnhancedOnboardingPortal />)

    await waitFor(() => {
      expect(screen.getByText(/session.*expired/i)).toBeInTheDocument()
      expect(screen.getByText(/contact.*hr/i)).toBeInTheDocument()
    })
  })

  it('should auto-save progress periodically', async () => {
    jest.useFakeTimers()
    
    renderWithProviders(<EnhancedOnboardingPortal />)

    await waitFor(() => screen.getByTestId('mock-WelcomeStep'))

    // Fast-forward 5 minutes
    jest.advanceTimersByTime(5 * 60 * 1000)

    await waitFor(() => {
      expect(api.saveOnboardingProgress).toHaveBeenCalledWith(
        mockToken,
        expect.objectContaining({
          autoSave: true
        })
      )
    })

    jest.useRealTimers()
  })

  it('should track time spent on each step', async () => {
    const user = userEvent.setup()
    jest.useFakeTimers()
    
    renderWithProviders(<EnhancedOnboardingPortal />)

    await waitFor(() => screen.getByTestId('mock-WelcomeStep'))

    const startTime = Date.now()
    
    // Spend 2 minutes on welcome step
    jest.advanceTimersByTime(2 * 60 * 1000)
    
    await user.click(screen.getByText('Complete WelcomeStep'))

    await waitFor(() => {
      expect(api.saveOnboardingProgress).toHaveBeenCalledWith(
        mockToken,
        expect.objectContaining({
          analytics: expect.objectContaining({
            stepDuration: expect.any(Number)
          })
        })
      )
    })

    jest.useRealTimers()
  })
})