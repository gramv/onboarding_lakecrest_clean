/**
 * OnboardingFlowController - Core controller for managing the onboarding flow
 * Implements Phase 1: Core Infrastructure from candidate-onboarding-flow spec
 */

import { OnboardingStep, OnboardingSession, OnboardingProgress } from '../types/onboarding'
import { AutoSaveManager } from '../utils/AutoSaveManager'
import { stepValidators } from '../utils/stepValidators'
import { ValidationResult } from '../hooks/useStepValidation'

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  position: string
  department: string
  startDate: string
  propertyId: string
}

export interface Property {
  id: string
  name: string
  address: string
}

export interface OnboardingFlowSession {
  employee: Employee
  property: Property
  progress: OnboardingProgress
  sessionToken: string
  expiresAt: Date
  savedFormData?: Record<string, any>
}

export interface StepProps {
  // Current step info
  currentStep: {
    id: string
    name: string
    order: number
    required: boolean
  }
  
  // Progress info
  progress: {
    completedSteps: string[]
    currentStepIndex: number
    totalSteps: number
    percentComplete: number
  }
  
  // Actions
  markStepComplete: (stepId: string, data?: any) => Promise<void>
  saveProgress: (stepId: string, data?: any) => Promise<void>
  goToNextStep: () => void
  goToPreviousStep: () => void
  
  // Data
  language: 'en' | 'es'
  employee: Employee
  property: Property
  
  // Session
  sessionToken: string
  expiresAt: Date
}

export class OnboardingFlowController {
  private session: OnboardingFlowSession | null = null
  private autoSaveManager: AutoSaveManager
  private currentStepIndex: number = 0
  private stepData: Record<string, any> = {}
  private stepErrors: Record<string, string[]> = {}
  
  // Define the onboarding steps - aligned with the spec
  // Note: Emergency contacts are handled as a tab within personal-info step
  public readonly steps: OnboardingStep[] = [
    { id: 'welcome', name: 'Welcome', order: 1, required: true, estimatedMinutes: 2, governmentRequired: false },
    { id: 'personal-info', name: 'Personal Information', order: 2, required: true, estimatedMinutes: 8, governmentRequired: false },
    { id: 'job-details', name: 'Job Details Confirmation', order: 3, required: true, estimatedMinutes: 3, governmentRequired: false },
    { id: 'company-policies', name: 'Company Policies', order: 4, required: true, estimatedMinutes: 10, governmentRequired: false },
    { id: 'i9-complete', name: 'I-9 Employment Verification', order: 5, required: true, estimatedMinutes: 20, governmentRequired: true },
    { id: 'w4-form', name: 'W-4 Tax Form', order: 6, required: true, estimatedMinutes: 10, governmentRequired: true },
    { id: 'direct-deposit', name: 'Direct Deposit', order: 7, required: true, estimatedMinutes: 5, governmentRequired: false },
    { id: 'trafficking-awareness', name: 'Human Trafficking Awareness', order: 8, required: true, estimatedMinutes: 5, governmentRequired: true },
    { id: 'weapons-policy', name: 'Weapons Policy', order: 9, required: true, estimatedMinutes: 2, governmentRequired: false },
    { id: 'health-insurance', name: 'Health Insurance', order: 10, required: true, estimatedMinutes: 8, governmentRequired: false },
    { id: 'final-review', name: 'Final Review', order: 11, required: true, estimatedMinutes: 5, governmentRequired: false }
  ]

  private apiUrl: string
  
  constructor() {
    this.autoSaveManager = new AutoSaveManager()
    this.apiUrl = import.meta.env.VITE_API_URL || '/api'
  }

  /**
   * Initialize onboarding session from token
   */
  async initializeOnboarding(token: string): Promise<OnboardingFlowSession> {
    try {
      // Handle demo/test mode with fallback data
      if (token === 'demo-token') {
        const mockSession: OnboardingFlowSession = {
          employee: {
            id: 'demo-employee-001',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@demo.com',
            position: 'Front Desk Associate',
            department: 'Front Office',
            startDate: '2025-02-01',
            propertyId: 'demo-property-001'
          },
          property: {
            id: 'demo-property-001',
            name: 'Demo Hotel & Suites',
            address: '123 Demo Street, Demo City, DC 12345'
          },
          progress: {
            currentStepIndex: 0,
            totalSteps: this.steps.length,
            completedSteps: [],
            percentComplete: 0,
            canProceed: true
          },
          sessionToken: token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          savedFormData: {}
        }

        this.session = mockSession
        this.currentStepIndex = 0
        return this.session
      }

      // Try to validate token and load session data from API
      try {
        const response = await fetch(`${this.apiUrl}/api/onboarding/session/${token}`)
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }

        const result = await response.json()
        const sessionData = result.data || result
        
        this.session = {
          employee: sessionData.employee,
          property: sessionData.property,
          progress: {
            ...sessionData.progress,
            canProceed: true
          },
          sessionToken: token,
          expiresAt: new Date(sessionData.expiresAt),
          savedFormData: sessionData.savedFormData || {}
        }

        // Set current step index based on progress
        this.currentStepIndex = this.session.progress.currentStepIndex || 0

        return this.session
        
      } catch (apiError) {
        console.warn('API call failed, falling back to demo mode:', apiError)
        // Fallback to demo mode if API fails
        return this.initializeOnboarding('demo-token')
      }
      
    } catch (error) {
      console.error('Failed to initialize onboarding session:', error)
      throw error
    }
  }

  /**
   * Get current progress information
   */
  getProgress(): OnboardingProgress {
    if (!this.session) {
      throw new Error('Session not initialized')
    }

    const completedSteps = this.session.progress.completedSteps || []
    const totalSteps = this.steps.length
    const percentComplete = Math.round((completedSteps.length / totalSteps) * 100)

    return {
      currentStepIndex: this.currentStepIndex,
      totalSteps,
      completedSteps,
      percentComplete,
      canProceed: this.canProceedToNextStep()
    }
  }

  /**
   * Mark a step as complete
   */
  async markStepComplete(stepId: string, data?: any): Promise<void> {
    if (!this.session) {
      throw new Error('Session not initialized')
    }

    try {
      // Handle demo mode
      if (this.session.employee.id === 'demo-employee-001') {
        // Update local progress in demo mode
        if (!this.session.progress.completedSteps.includes(stepId)) {
          this.session.progress.completedSteps.push(stepId)
        }
        console.log(`Demo mode: Marked step ${stepId} as complete`)
        return
      }

      const response = await fetch(`${this.apiUrl}/api/onboarding/${this.session.employee.id}/complete/${stepId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.session.sessionToken}`
        },
        body: JSON.stringify(data || {})
      })

      if (!response.ok) {
        throw new Error('Failed to mark step as complete')
      }

      // Update local progress
      if (!this.session.progress.completedSteps.includes(stepId)) {
        this.session.progress.completedSteps.push(stepId)
      }

    } catch (error) {
      console.error('Failed to mark step complete:', error)
      // In demo mode or if API fails, just update locally
      if (this.session.employee.id === 'demo-employee-001' || this.session.sessionToken === 'demo-token') {
        if (!this.session.progress.completedSteps.includes(stepId)) {
          this.session.progress.completedSteps.push(stepId)
        }
        console.warn('API failed, updated progress locally:', error)
        return
      }
      throw error
    }
  }

  /**
   * Save progress for a step
   */
  async saveProgress(stepId: string, data?: any): Promise<void> {
    if (!this.session) {
      throw new Error('Session not initialized')
    }

    try {
      // Handle demo mode
      if (this.session.employee.id === 'demo-employee-001' || this.session.sessionToken === 'demo-token') {
        console.log(`Demo mode: Saved progress for step ${stepId}`, data)
        if (data) {
          this.setStepData(stepId, data)
        }
        return
      }

      const response = await fetch(`${this.apiUrl}/api/onboarding/${this.session.employee.id}/progress/${stepId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.session.sessionToken}`
        },
        body: JSON.stringify(data || {})
      })

      if (!response.ok) {
        throw new Error('Failed to save progress')
      }

      // Update local session data if needed
      // This would be extended to update form data cache
      if (data) {
        this.setStepData(stepId, data)
      }

    } catch (error) {
      console.error('Failed to save progress:', error)
      // In demo mode, don't throw errors for save failures
      if (this.session.employee.id === 'demo-employee-001' || this.session.sessionToken === 'demo-token') {
        console.warn('API failed, but continuing in demo mode:', error)
        if (data) {
          this.setStepData(stepId, data)
        }
        return
      }
      throw error
    }
  }

  /**
   * Navigate to next step
   */
  goToNextStep(): void {
    if (this.canProceedToNextStep()) {
      this.currentStepIndex = Math.min(this.currentStepIndex + 1, this.steps.length - 1)
    }
  }

  /**
   * Navigate to previous step
   */
  goToPreviousStep(): void {
    this.currentStepIndex = Math.max(this.currentStepIndex - 1, 0)
  }

  /**
   * Navigate to specific step by index
   */
  goToStep(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.steps.length) {
      this.currentStepIndex = stepIndex
    }
  }

  /**
   * Get current step
   */
  getCurrentStep(): OnboardingStep {
    return this.steps[this.currentStepIndex]
  }

  /**
   * Check if can proceed to next step
   */
  private canProceedToNextStep(): boolean {
    if (!this.session) return false
    
    const currentStep = this.getCurrentStep()
    
    // Can proceed if current step is completed or not required
    return this.session.progress.completedSteps.includes(currentStep.id) || !currentStep.required
  }

  /**
   * Get step props for component rendering
   */
  getStepProps(): StepProps {
    if (!this.session) {
      throw new Error('Session not initialized')
    }

    const currentStep = this.getCurrentStep()
    const progress = this.getProgress()

    return {
      currentStep: {
        id: currentStep.id,
        name: currentStep.name,
        order: currentStep.order,
        required: currentStep.required
      },
      progress: {
        completedSteps: progress.completedSteps,
        currentStepIndex: this.currentStepIndex,
        totalSteps: this.steps.length,
        percentComplete: progress.percentComplete
      },
      markStepComplete: this.markStepComplete.bind(this),
      saveProgress: this.saveProgress.bind(this),
      goToNextStep: this.goToNextStep.bind(this),
      goToPreviousStep: this.goToPreviousStep.bind(this),
      language: 'en', // This would be dynamic from session
      employee: this.session.employee,
      property: this.session.property,
      sessionToken: this.session.sessionToken,
      expiresAt: this.session.expiresAt
    }
  }

  /**
   * Initialize auto-save for current step
   */
  initAutoSave(getFormData: () => any): void {
    const currentStep = this.getCurrentStep()
    this.autoSaveManager.initAutoSave(currentStep.id, getFormData, this.saveProgress.bind(this))
  }

  /**
   * Clear auto-save for current step
   */
  clearAutoSave(): void {
    const currentStep = this.getCurrentStep()
    this.autoSaveManager.clearAutoSave(currentStep.id)
  }

  /**
   * Get save status for UI indicators
   */
  getSaveStatus() {
    return this.autoSaveManager.getSaveStatus()
  }

  /**
   * Clean up controller
   */
  destroy(): void {
    this.autoSaveManager.destroy()
  }

  /**
   * Validate current step data
   */
  async validateCurrentStep(): Promise<ValidationResult> {
    const currentStep = this.getCurrentStep()
    const data = this.getStepData(currentStep.id)
    
    // Get validator for current step
    const validator = stepValidators[currentStep.id]
    if (!validator) {
      // No validator defined, assume valid
      return { valid: true, errors: [] }
    }

    try {
      const result = await validator(data)
      this.stepErrors[currentStep.id] = result.errors || []
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed'
      return { valid: false, errors: [errorMessage] }
    }
  }

  /**
   * Get data for a specific step
   */
  getStepData(stepId: string): any {
    return this.stepData[stepId] || {}
  }

  /**
   * Set data for a specific step
   */
  setStepData(stepId: string, data: any): void {
    this.stepData[stepId] = { ...this.stepData[stepId], ...data }
  }

  /**
   * Get errors for current step
   */
  getCurrentStepErrors(): string[] {
    const currentStep = this.getCurrentStep()
    return this.stepErrors[currentStep.id] || []
  }

  /**
   * Clear errors for a step
   */
  clearStepErrors(stepId: string): void {
    delete this.stepErrors[stepId]
  }

  /**
   * Check if a specific step has government requirements
   */
  isGovernmentRequiredStep(stepId: string): boolean {
    const governmentSteps = ['i9-complete', 'w4-form']
    return governmentSteps.includes(stepId)
  }

  /**
   * Get estimated time remaining
   */
  getEstimatedTimeRemaining(): number {
    const remainingSteps = this.steps.slice(this.currentStepIndex)
    return remainingSteps.reduce((total, step) => total + (step.estimatedMinutes || 5), 0)
  }
}