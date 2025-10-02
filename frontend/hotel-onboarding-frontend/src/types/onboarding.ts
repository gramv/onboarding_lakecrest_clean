/**
 * Onboarding type definitions
 */

export interface OnboardingStep {
  id: string
  name: string
  order: number
  required: boolean
  estimatedMinutes: number
  dependencies?: string[]
  governmentRequired?: boolean
}

export type StepStatus = 'locked' | 'ready' | 'in-progress' | 'complete'

export interface OnboardingProgress {
  currentStepIndex: number
  currentStepId?: string
  totalSteps: number
  completedSteps: string[]
  percentComplete: number
  canProceed: boolean
  stepStates?: Record<string, StepStatus>
  formData?: { [stepId: string]: any }
}

export interface OnboardingSession {
  id: string
  status: string
  current_step: string
  progress_percentage: number
  language_preference: string
  expires_at: string
}

export interface SaveStatus {
  lastSaved: Date | null
  saving: boolean
  error: string | null
}

