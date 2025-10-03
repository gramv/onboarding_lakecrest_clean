/**
 * OnboardingFlowController - Core controller for managing the onboarding flow
 * Implements Phase 1: Core Infrastructure from candidate-onboarding-flow spec
 */

import { OnboardingStep, OnboardingSession, OnboardingProgress, StepStatus } from '../types/onboarding'
import { AutoSaveManager } from '../utils/AutoSaveManager'
import { stepValidators } from '../utils/stepValidators'
import { ValidationResult } from '../hooks/useStepValidation'
import { getApiUrl } from '../config/api'

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  position: string
  department: string
  startDate: string
  propertyId: string
  // Approval details
  payRate?: number
  payFrequency?: string
  startTime?: string
  benefitsEligible?: string
  supervisor?: string
  specialInstructions?: string
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

export interface NavigationValidationResult {
  allowed: boolean
  reason?: string
  warnings?: string[]
  missing_requirements?: string[]
  fallback?: boolean
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
    currentStepId?: string
    totalSteps: number
    percentComplete: number
    stepStates?: Record<string, StepStatus>
  }
  
  // Actions
  markStepComplete: (stepId: string, data?: any) => Promise<void>
  saveProgress: (stepId: string, data?: any) => Promise<void>
  goToNextStep: () => void
  goToPreviousStep: () => void
  goToStep?: (stepIndex: number) => void
  advanceToNextStep?: () => Promise<NavigationValidationResult>
  completeAndAdvance?: (data?: any, options?: { skipValidation?: boolean; resumeAnchor?: string | null }) => Promise<NavigationValidationResult>
  canProceedToNext?: boolean
  getStepState?: (stepId: string) => StepStatus
  stepStates?: Record<string, StepStatus>
  setStepResumeAnchor?: (stepId: string, anchor: string | null) => void
  getStepResumeAnchor?: (stepId: string) => string | null
  
  // Data
  language: 'en' | 'es'
  employee: Employee
  property: Property
  
  // Session
  sessionToken: string
  expiresAt: Date

  // Single-step invitations
  isSingleStepMode?: boolean
  singleStepMeta?: Record<string, any> | null
}

export class OnboardingFlowController {
  private session: OnboardingFlowSession | null = null
  private autoSaveManager: AutoSaveManager
  private currentStepIndex: number = 0
  private stepData: Record<string, any> = {}
  private stepErrors: Record<string, string[]> = {}
  private stepStates: Record<string, StepStatus> = {}
  private stepRuntimeMeta: Record<string, { resumeAnchor?: string | null }> = {}
  
  // Define the onboarding steps - aligned with the spec
  // Note: Emergency contacts are handled as a tab within personal-info step
  private readonly baseSteps: OnboardingStep[] = [
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

  public steps: OnboardingStep[]
  private apiUrl: string
  private isSingleStepMode = false
  private singleStepTarget: string | null = null
  private singleStepMetadata: Record<string, any> | null = null
  
  constructor() {
    this.autoSaveManager = new AutoSaveManager()
    // Use API URL with /api prefix for all endpoints
    this.apiUrl = getApiUrl()
    this.steps = [...this.baseSteps]
  }

  private recomputeProgressMetadata(): void {
    if (!this.session) {
      return
    }

    const totalSteps = this.steps.length
    const validStepIds = new Set(this.steps.map(step => step.id))
    const uniqueCompleted = Array.from(new Set(this.session.progress.completedSteps || [])).filter(stepId => validStepIds.has(stepId))

    Object.keys(this.stepRuntimeMeta).forEach(stepId => {
      if (!validStepIds.has(stepId)) {
        delete this.stepRuntimeMeta[stepId]
      }
    })

    this.session.progress.completedSteps = uniqueCompleted
    this.session.progress.totalSteps = totalSteps
    this.session.progress.currentStepIndex = Math.min(this.currentStepIndex, Math.max(totalSteps - 1, 0))
    this.session.progress.currentStepId = this.steps[this.session.progress.currentStepIndex]?.id
    this.session.progress.percentComplete = totalSteps === 0
      ? 0
      : Math.round((uniqueCompleted.length / totalSteps) * 100)
    this.session.progress.canProceed = this.canProceedToNextStep()

    this.stepStates = this.computeStepStates()
    this.session.progress.stepStates = { ...this.stepStates }
  }

  private computeStepStates(): Record<string, StepStatus> {
    if (!this.session) {
      return {}
    }

    const completed = new Set(this.session.progress.completedSteps || [])
    const states: Record<string, StepStatus> = {}

    this.steps.forEach((step, index) => {
      if (completed.has(step.id)) {
        states[step.id] = 'complete'
        return
      }

      const dependencies = this.getStepDependencies(step, index)
      const dependenciesSatisfied = dependencies.every(depId => completed.has(depId))

      if (!dependenciesSatisfied) {
        states[step.id] = 'locked'
        return
      }

      if (index === this.currentStepIndex) {
        states[step.id] = 'in-progress'
        return
      }

      states[step.id] = 'ready'
    })

    return states
  }

  private getStepDependencies(step: OnboardingStep, index: number): string[] {
    if (Array.isArray(step.dependencies) && step.dependencies.length > 0) {
      return step.dependencies
    }

    if (index <= 0) {
      return []
    }

    const priorRequiredSteps = this.steps.slice(0, index).filter(prevStep => prevStep.required)
    return priorRequiredSteps.map(prevStep => prevStep.id)
  }

  private shouldSkipRemoteNavigationValidation(): boolean {
    if (!this.session) {
      return true
    }

    if (this.isSingleStepMode) {
      return true
    }

    if (!this.session.sessionToken) {
      return true
    }

    if (this.session.sessionToken === 'demo-token' || this.session.employee.id === 'demo-employee-001') {
      return true
    }

    return false
  }

  private buildNavigationValidationPayload(nextStepId: string): Record<string, any> {
    if (!this.session) {
      return {}
    }

    return {
      employee_id: this.session.employee.id,
      current_step: this.getCurrentStep().id,
      next_step: nextStepId,
      completed_steps: this.session.progress.completedSteps,
      is_single_step: this.isSingleStepMode,
      timestamp: new Date().toISOString()
    }
  }

  getStepStates(): Record<string, StepStatus> {
    return { ...this.stepStates }
  }

  getStepState(stepId: string): StepStatus {
    return this.stepStates[stepId] || 'locked'
  }

  setStepResumeAnchor(stepId: string, anchor: string | null): void {
    const existing = this.stepRuntimeMeta[stepId] || {}
    this.stepRuntimeMeta[stepId] = {
      ...existing,
      resumeAnchor: anchor ?? null
    }
  }

  getStepResumeAnchor(stepId: string): string | null {
    return this.stepRuntimeMeta[stepId]?.resumeAnchor ?? null
  }

  /**
   * Enable single-step mode by restricting active steps to the target step
   */
  enableSingleStepMode(stepId: string, metadata?: Record<string, any>): void {
    const targetStep = this.baseSteps.find(step => step.id === stepId)
    if (!targetStep) {
      console.warn(`Single-step target ${stepId} not found; falling back to full flow`)
      this.disableSingleStepMode()
      return
    }

    this.isSingleStepMode = true
    this.singleStepTarget = stepId
    this.singleStepMetadata = metadata || null
    this.steps = [targetStep]
    this.currentStepIndex = 0
  }

  /**
   * Disable single-step mode and restore the full onboarding flow
   */
  disableSingleStepMode(): void {
    this.isSingleStepMode = false
    this.singleStepTarget = null
    this.singleStepMetadata = null
    this.steps = [...this.baseSteps]
    this.currentStepIndex = 0
  }

  getIsSingleStepMode(): boolean {
    return this.isSingleStepMode
  }

  getSingleStepTarget(): string | null {
    return this.singleStepTarget
  }

  getSingleStepMetadata(): Record<string, any> | null {
    return this.singleStepMetadata
  }

  /**
   * Initialize onboarding session from token
   */
  async initializeOnboarding(token: string): Promise<OnboardingFlowSession> {
    try {
      // Always reset to full flow when initializing a standard session
      this.disableSingleStepMode()

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
            propertyId: 'demo-property-001',
            // Add demo approval details
            payRate: 18.50,
            payFrequency: 'hourly',
            startTime: '9:00 AM',
            benefitsEligible: 'yes',
            supervisor: 'Jane Manager',
            specialInstructions: 'Please report to the front desk on your first day.'
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
        this.recomputeProgressMetadata()
        return this.session
      }

      // Try to validate token and load session data from API
      try {
        const response = await fetch(`${this.apiUrl}/onboarding/welcome/${token}`)
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }

        const result = await response.json()
        const sessionData = result.data || result

        const rawProgress = sessionData.progress || {}

        const initialProgress: OnboardingProgress = {
          currentStepIndex: rawProgress.currentStepIndex ?? rawProgress.current_step_index ?? 0,
          totalSteps: this.steps.length,
          completedSteps: Array.isArray(rawProgress.completedSteps)
            ? rawProgress.completedSteps
            : Array.isArray(rawProgress.completed_steps)
            ? rawProgress.completed_steps
            : [],
          percentComplete: rawProgress.percentComplete ?? rawProgress.percent_complete ?? 0,
          canProceed: true,
          currentStepId: rawProgress.currentStepId ?? rawProgress.current_step_id,
          stepStates: rawProgress.stepStates ?? rawProgress.step_states
        }

        this.session = {
          employee: sessionData.employee,
          property: sessionData.property,
          progress: {
            ...initialProgress
          },
          sessionToken: token,
          expiresAt: new Date(sessionData.expiresAt),
          savedFormData: sessionData.savedFormData || {}
        }

        this.hydrateCompletedStepsFromSavedData(this.session.savedFormData)

        // Set current step index based on progress
        this.currentStepIndex = this.session.progress.currentStepIndex || 0

        this.recomputeProgressMetadata()

        return this.session
        
      } catch (apiError) {
        console.error('API call failed:', apiError)
        // Don't fallback to demo mode - throw the error
        throw apiError
      }
      
    } catch (error) {
      console.error('Failed to initialize onboarding session:', error)
      throw error
    }
  }

  private hydrateCompletedStepsFromSavedData(savedFormData?: Record<string, any> | null): void {
    if (!this.session || !savedFormData) {
      return
    }

    const ensureComplete = (stepId: string, condition: boolean) => {
      if (!condition) return
      if (!this.session!.progress.completedSteps.includes(stepId)) {
        this.session!.progress.completedSteps.push(stepId)
      }
    }

    const isPersonalInfoComplete = (data: any): boolean => {
      if (!data) return false
      if (data.stepComplete || data.completed || data.isComplete) return true
      const personal = data.personalInfo
      const emergency = data.emergencyContacts
      return Boolean(personal && emergency && (personal.firstName || personal.lastName) && emergency.primaryContact?.name)
    }

    const generalCompletion = (data: any): boolean => {
      if (!data) return false
      return Boolean(
        data.stepComplete ||
        data.completed ||
        data.isComplete ||
        data.isSigned ||
        data.completedAt
      )
    }

    ensureComplete('welcome', Boolean(savedFormData['welcome']?.welcomeAcknowledged ?? savedFormData['welcome']?.formData?.welcomeAcknowledged))
    ensureComplete('personal-info', isPersonalInfoComplete(savedFormData['personal-info']))
    ensureComplete('job-details', Boolean(savedFormData['job-details']?.acknowledged))
    ensureComplete('company-policies', Boolean(savedFormData['company-policies']?.isSigned))
    ensureComplete('i9-complete', Boolean(savedFormData['i9-complete']?.isSigned))
    ensureComplete('w4-form', generalCompletion(savedFormData['w4-form']))
    ensureComplete('direct-deposit', generalCompletion(savedFormData['direct-deposit']))
    ensureComplete('health-insurance', generalCompletion(savedFormData['health-insurance']))

    const savedCompleted = Array.isArray(savedFormData.completedSteps) ? savedFormData.completedSteps : []
    savedCompleted.forEach((stepId: string) => ensureComplete(stepId, true))
  }

  /**
   * Initialize the controller for single-step invitations
   */
  async initializeSingleStepSession(
    token: string,
    options: {
      stepId: string
      employee?: Partial<Employee> | null
      property?: Partial<Property> | null
      savedFormData?: Record<string, any>
      sessionId?: string
      recipientEmail?: string
      recipientName?: string
      expiresAt?: string | Date
      metadata?: Record<string, any>
    }
  ): Promise<OnboardingFlowSession> {
    const {
      stepId,
      employee,
      property,
      savedFormData,
      sessionId,
      recipientEmail,
      recipientName,
      expiresAt,
      metadata
    } = options

    const employeeAny = employee as Record<string, any> | undefined

    const fallbackEmployee: Employee = {
      id: employee?.id || `temp-${stepId}-${Date.now()}`,
      firstName: employee?.firstName || employeeAny?.first_name || 'Guest',
      lastName: employee?.lastName || employeeAny?.last_name || 'User',
      email: employee?.email || employeeAny?.email || 'onboarding@placeholder.local',
      position: employee?.position || employeeAny?.position || 'Pending',
      department: employee?.department || employeeAny?.department || 'Pending',
      startDate: employee?.startDate || employeeAny?.start_date || new Date().toISOString().slice(0, 10),
      propertyId: employee?.propertyId || employeeAny?.property_id || property?.id || 'temp-property',
      payRate: employee?.payRate,
      payFrequency: employee?.payFrequency,
      startTime: employee?.startTime,
      benefitsEligible: employee?.benefitsEligible,
      supervisor: employee?.supervisor,
      specialInstructions: employee?.specialInstructions
    }

    const propertyAny = property as Record<string, any> | undefined

    const fallbackProperty: Property = {
      id: property?.id || propertyAny?.id || fallbackEmployee.propertyId || 'temp-property',
      name: property?.name || propertyAny?.name || 'Hotel Property',
      address: property?.address || propertyAny?.address || ''
    }

    const progress: OnboardingProgress = {
      currentStepIndex: 0,
      totalSteps: 1,
      completedSteps: [],
      percentComplete: 0,
      canProceed: true
    }

    this.session = {
      employee: fallbackEmployee,
      property: fallbackProperty,
      progress,
      sessionToken: token,
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      savedFormData: savedFormData || {}
    }

    this.enableSingleStepMode(stepId, { sessionId, recipientEmail, recipientName, ...(metadata || {}) })

    if (savedFormData) {
      Object.entries(savedFormData).forEach(([step, data]) => {
        this.setStepData(step, data)
      })
    }

    this.recomputeProgressMetadata()

    return this.session
  }

  /**
   * Get current progress information
   */
  getProgress(): OnboardingProgress {
    if (!this.session) {
      throw new Error('Session not initialized')
    }

    this.recomputeProgressMetadata()

    const {
      currentStepIndex,
      completedSteps,
      totalSteps,
      percentComplete,
      canProceed,
      stepStates,
      currentStepId
    } = this.session.progress

    return {
      currentStepIndex,
      currentStepId,
      totalSteps,
      completedSteps: [...completedSteps],
      percentComplete,
      canProceed,
      stepStates: stepStates ? { ...stepStates } : { ...this.stepStates },
      formData: this.session.progress.formData
    }
  }

  /**
   * Mark a step as complete
   * ✅ PERFORMANCE FIX: Optimistic UI updates with background API calls
   */
  async markStepComplete(stepId: string, data?: any): Promise<void> {
    if (!this.session) {
      throw new Error('Session not initialized')
    }

    try {
      // ✅ OPTIMISTIC UPDATE: Mark complete immediately in local state
      if (!this.session.progress.completedSteps.includes(stepId)) {
        this.session.progress.completedSteps.push(stepId)
      }

      this.recomputeProgressMetadata()

      // ✅ Update UI immediately
      const completionKey = `onboarding_${stepId}_completed`
      sessionStorage.setItem(completionKey, 'true')
      sessionStorage.setItem('onboarding_progress', JSON.stringify(this.session.progress))

      // Save step data if provided (non-blocking)
      if (data) {
        this.saveProgress(stepId, data).catch(err => {
          console.error('Background save failed:', err)
        })
      }

      // Handle demo mode
      if (this.session.employee.id === 'demo-employee-001' || this.session.sessionToken === 'demo-token') {
        console.log(`Demo mode: Marked step ${stepId} as complete`)
        return
      }

      // ✅ Make API call in background (don't await)
      const payload = {
        formData: data || {},
        stepId,
        timestamp: new Date().toISOString(),
        is_single_step: this.isSingleStepMode,
        single_step_mode: this.isSingleStepMode,
        session_id: this.singleStepMetadata?.sessionId,
        target_step: this.singleStepTarget,
        recipient_email: this.singleStepMetadata?.recipientEmail,
        recipient_name: this.singleStepMetadata?.recipientName
      }

      fetch(`${this.apiUrl}/onboarding/${this.session.employee.id}/complete/${stepId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.session.sessionToken}`
        },
        body: JSON.stringify(payload)
      }).then(response => {
        if (response.ok) {
          console.log(`✅ Step marked as complete in cloud: ${stepId}`)
        } else {
          console.warn(`⚠️ Failed to mark step complete in cloud: ${stepId}`)
        }
      }).catch(error => {
        console.error('Failed to mark step complete in cloud:', error)
      })

      // ✅ Return immediately - don't wait for API
      return

    } catch (error) {
      console.error('Failed to mark step complete:', error)
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
      // Save data to controller's internal storage
      if (data) {
        this.setStepData(stepId, data)
      }

      // Save to sessionStorage for persistence (as backup)
      const storageKey = `onboarding_${stepId}_data`
      if (data) {
        sessionStorage.setItem(storageKey, JSON.stringify(data))
      }

      // Handle demo mode - skip API call
      if (this.session.employee.id === 'demo-employee-001' || this.session.sessionToken === 'demo-token') {
        console.log(`Demo mode: Saved progress for step ${stepId}`, data)
        return
      }

      // Make API call to save to cloud
      // ⚠️ IMPORTANT: Exclude large PDF data from progress save to prevent request timeouts
      const { inlinePdfData, pdfUrl, signedPdfUrl, ...dataWithoutPdf } = data || {}

      const payload = {
        formData: dataWithoutPdf,
        stepId,
        timestamp: new Date().toISOString(),
        is_single_step: this.isSingleStepMode,
        single_step_mode: this.isSingleStepMode,
        session_id: this.singleStepMetadata?.sessionId,
        target_step: this.singleStepTarget,
        recipient_email: this.singleStepMetadata?.recipientEmail,
        recipient_name: this.singleStepMetadata?.recipientName
      }

      const response = await fetch(`${this.apiUrl}/onboarding/${this.session.employee.id}/progress/${stepId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.session.sessionToken}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Failed to save progress to cloud')
      }

      console.log(`Progress saved to cloud for step: ${stepId}`)
      return

    } catch (error) {
      console.error('Failed to save progress to cloud, saved locally:', error)
      // Don't throw error - local save is sufficient
      return
    }
  }

  /**
   * Navigate to next step
   */
  goToNextStep(): void {
    if (this.canProceedToNextStep()) {
      this.currentStepIndex = Math.min(this.currentStepIndex + 1, this.steps.length - 1)
      this.recomputeProgressMetadata()
    }
  }

  /**
   * Advance to next step with validation result
   * Returns NavigationValidationResult for compatibility with OnboardingFlowPortal
   */
  async advanceToNextStep(): Promise<NavigationValidationResult> {
    if (!this.session) {
      return {
        allowed: false,
        reason: 'Session not initialized'
      }
    }

    this.recomputeProgressMetadata()

    const currentStep = this.getCurrentStep()
    const nextIndex = this.currentStepIndex + 1

    if (nextIndex >= this.steps.length) {
      return {
        allowed: false,
        reason: 'You have reached the final step of the onboarding process'
      }
    }

    if (currentStep.required && !this.session.progress.completedSteps.includes(currentStep.id)) {
      return {
        allowed: false,
        reason: `Please complete "${currentStep.name}" before proceeding`,
        missing_requirements: [currentStep.name]
      }
    }

    if (!this.canProceedToNextStep()) {
      return {
        allowed: false,
        reason: 'Cannot proceed to next step. Please complete the current step first.'
      }
    }

    const nextStep = this.steps[nextIndex]
    const missingDependencies = this.getStepDependencies(nextStep, nextIndex).filter(
      dependencyId => !this.session!.progress.completedSteps.includes(dependencyId)
    )

    if (missingDependencies.length > 0) {
      const missingNames = missingDependencies.map(depId => {
        const dependencyStep = this.steps.find(step => step.id === depId)
        return dependencyStep?.name || depId
      })

      return {
        allowed: false,
        reason: 'Complete required steps before continuing.',
        missing_requirements: missingNames
      }
    }

    const warnings: string[] = []
    let fallback = false

    if (!this.shouldSkipRemoteNavigationValidation()) {
      try {
        const payload = this.buildNavigationValidationPayload(nextStep.id)
        const response = await fetch(`${this.apiUrl}/navigation/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.session.sessionToken}`
          },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          const result = await response.json()
          const remoteAllowed = result?.allowed !== undefined ? Boolean(result.allowed) : true

          if (!remoteAllowed) {
            return {
              allowed: false,
              reason: result?.reason || 'Navigation blocked by server validation.',
              warnings: Array.isArray(result?.warnings) ? result.warnings : undefined,
              missing_requirements: result?.missing_requirements
            }
          }

          if (Array.isArray(result?.warnings)) {
            warnings.push(...result.warnings)
          }
        } else if (response.status === 401) {
          // ✅ FIX: Don't show "session expired" warning - onboarding tokens are different from manager tokens
          // The navigation validation endpoint expects manager/HR tokens, but onboarding uses onboarding tokens
          // Local validation works fine, so we just fall back silently
          fallback = true
          console.log('Navigation validation endpoint returned 401 (expected for onboarding tokens), using local validation')
          // Don't add warning - local validation is sufficient
        } else {
          fallback = true
          // Only show warning for actual errors (not 401)
          console.warn('Navigation validation failed:', response.status, 'Using local validation')
          const errorText = await response.text().catch(() => '')
          console.error('Navigation validation failed:', response.status, errorText)
        }
      } catch (error) {
        fallback = true
        warnings.push('We could not reach the server. Progress will continue locally.')
        console.error('Navigation validation error:', error)
      }
    }

    this.currentStepIndex = nextIndex
    this.recomputeProgressMetadata()

    return {
      allowed: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      fallback: fallback || undefined
    }
  }

  /**
   * Navigate to previous step
   */
  goToPreviousStep(): void {
    this.setCurrentStepIndex(Math.max(this.currentStepIndex - 1, 0))
  }

  /**
   * Navigate to specific step by index
   */
  goToStep(stepIndex: number): void {
    this.setCurrentStepIndex(stepIndex)
  }

  setCurrentStepIndex(stepIndex: number): void {
    if (stepIndex < 0 || stepIndex >= this.steps.length) {
      return
    }

    this.currentStepIndex = stepIndex

    if (this.session) {
      this.session.progress.currentStepIndex = stepIndex
      this.recomputeProgressMetadata()
    }
  }

  canNavigateToStep(stepIndex: number): boolean {
    if (!this.session) return false
    if (stepIndex < 0 || stepIndex >= this.steps.length) return false

    this.recomputeProgressMetadata()

    const step = this.steps[stepIndex]
    const state = this.getStepState(step.id)

    if (state === 'locked') {
      return false
    }

    return state === 'ready' || state === 'in-progress' || state === 'complete'
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
    const progressSnapshot = this.getProgress()
    const stepStates = progressSnapshot.stepStates ?? this.getStepStates()

    return {
      currentStep: {
        id: currentStep.id,
        name: currentStep.name,
        order: currentStep.order,
        required: currentStep.required
      },
      progress: {
        completedSteps: progressSnapshot.completedSteps,
        currentStepIndex: progressSnapshot.currentStepIndex,
        currentStepId: progressSnapshot.currentStepId,
        totalSteps: progressSnapshot.totalSteps,
        percentComplete: progressSnapshot.percentComplete,
        stepStates
      },
      markStepComplete: this.markStepComplete.bind(this),
      saveProgress: this.saveProgress.bind(this),
      goToNextStep: this.goToNextStep.bind(this),
      goToPreviousStep: this.goToPreviousStep.bind(this),
      goToStep: this.goToStep.bind(this),
      advanceToNextStep: this.advanceToNextStep.bind(this),
      canProceedToNext: this.canProceedToNextStep(),
      getStepState: this.getStepState.bind(this),
      stepStates,
      setStepResumeAnchor: this.setStepResumeAnchor.bind(this),
      getStepResumeAnchor: this.getStepResumeAnchor.bind(this),
      language: 'en', // This would be dynamic from session
      employee: this.session.employee,
      property: this.session.property,
      sessionToken: this.session.sessionToken,
      expiresAt: this.session.expiresAt,
      isSingleStepMode: this.isSingleStepMode,
      singleStepMeta: this.singleStepMetadata
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

  /**
   * Restore local progress from sessionStorage and merge with current session
   * This ensures that locally completed steps are not lost when loading from backend
   */
  restoreLocalProgress(): void {
    if (!this.session) {
      console.warn('Cannot restore local progress: session not initialized')
      return
    }

    try {
      // Restore overall progress from sessionStorage
      const progressKey = 'onboarding_progress'
      const savedProgressStr = sessionStorage.getItem(progressKey)

      if (savedProgressStr) {
        const savedProgress = JSON.parse(savedProgressStr)

        // Merge completed steps (union of local and backend)
        const mergedCompletedSteps = new Set([
          ...this.session.progress.completedSteps,
          ...(savedProgress.completedSteps || [])
        ])

        this.session.progress.completedSteps = Array.from(mergedCompletedSteps)
      }

      // Also check individual step completion flags
      this.steps.forEach(step => {
        const completionKey = `onboarding_${step.id}_completed`
        const isCompleted = sessionStorage.getItem(completionKey) === 'true'

        if (isCompleted && !this.session!.progress.completedSteps.includes(step.id)) {
          this.session!.progress.completedSteps.push(step.id)
        }
      })

      // Recalculate percent complete after merging
      const totalSteps = this.steps.length
      const completedCount = this.session.progress.completedSteps.length
      this.session.progress.percentComplete = Math.round((completedCount / totalSteps) * 100)

      console.log('Local progress restored. Completed steps:', this.session.progress.completedSteps)
    } catch (error) {
      console.error('Failed to restore local progress:', error)
      // Don't throw - continue with backend progress only
    }

    this.recomputeProgressMetadata()
  }
}
