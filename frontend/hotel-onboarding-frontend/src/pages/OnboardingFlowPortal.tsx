/**
 * OnboardingFlowPortal - New implementation using OnboardingFlowController
 * Implements the candidate onboarding flow specification
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { scrollToTop, scrollToErrorContainer } from '@/utils/scrollHelpers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SyncIndicator, SyncBadge } from '@/components/ui/sync-indicator'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { getApiUrl } from '@/config/api'

// Import the new infrastructure
import { OnboardingFlowController, StepProps, NavigationValidationResult } from '../controllers/OnboardingFlowController'
import { ProgressBar } from '../components/navigation/ProgressBar'
import { NavigationButtons } from '../components/navigation/NavigationButtons'

type StepContentWithMeta = React.ReactNode & { props?: { canProceed?: boolean } }

// Import new shadcn UI components
import { StepIndicator, Step } from '@/components/ui/step-indicator'
import { Breadcrumb, createBreadcrumbItems } from '@/components/ui/breadcrumb'
import { ValidationSummary, ValidationMessage } from '@/components/ui/validation-summary'

// Import step components
import WelcomeStep from './onboarding/WelcomeStep'
import PersonalInfoStep from './onboarding/PersonalInfoStep'
import JobDetailsStep from './onboarding/JobDetailsStep'
import CompanyPoliciesStep from './onboarding/CompanyPoliciesStep'
import I9Section1Step from './onboarding/I9Section1Step'
import I9CompleteStep from './onboarding/I9CompleteStep'
import I9SupplementsStep from './onboarding/I9SupplementsStep'
import W4FormStep from './onboarding/W4FormStep'
import DirectDepositStep from './onboarding/DirectDepositStep'
import TraffickingAwarenessStep from './onboarding/TraffickingAwarenessStep'
import WeaponsPolicyStep from './onboarding/WeaponsPolicyStep'
import HealthInsuranceStep from './onboarding/HealthInsuranceStep'
import DocumentUploadStep from './onboarding/DocumentUploadStep'
import FinalReviewStep from './onboarding/FinalReviewStep'
import { StepStatus } from '@/types/onboarding'

interface OnboardingFlowPortalProps {
  testMode?: boolean
}

export default function OnboardingFlowPortal({ testMode = false }: OnboardingFlowPortalProps) {
  const [searchParams] = useSearchParams()
  const [flowController] = useState(() => new OnboardingFlowController())
  
  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [stepStates, setStepStates] = useState<Record<string, StepStatus>>({})
  const [language, setLanguage] = useState<'en' | 'es'>('en')
  const [validationMessages, setValidationMessages] = useState<ValidationMessage[]>([])
  const [saveStatus, setSaveStatus] = useState<any>({ saving: false, lastSaved: null, error: null })

  const token = searchParams.get('token') || (testMode ? 'demo-token' : null)
  const mode = searchParams.get('mode')
  const requestedStep = searchParams.get('step')
  const [isSingleStepMode, setIsSingleStepMode] = useState(mode === 'single')
  const [singleStepTarget, setSingleStepTarget] = useState<string | null>(requestedStep)
  const [singleStepMeta, setSingleStepMeta] = useState<Record<string, any> | null>(null)
  
  // Sync status hook
  const { syncStatus, lastSyncTime, syncError, startSync, syncSuccess, syncError: reportSyncError, syncOffline, isOnline } = useSyncStatus()

  const syncControllerSnapshot = useCallback(() => {
    try {
      const nextStep = flowController.getCurrentStep()
      const nextProgress = flowController.getProgress()
      setCurrentStep(nextStep)
      setProgress(nextProgress)
      setStepStates(nextProgress.stepStates ?? flowController.getStepStates())
    } catch (error) {
      console.warn('Unable to sync onboarding flow snapshot:', error)
    }
  }, [flowController])

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      if (!token) {
        setError('No onboarding token provided')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const apiBase = getApiUrl()
        const singleStepRequested = mode === 'single'

        // Clear old session data when using a new token
        const lastToken = sessionStorage.getItem('current_onboarding_token')
        if (lastToken && lastToken !== token) {
          // Clear all onboarding-related sessionStorage
          const keysToRemove: string[] = []
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key && (key.includes('onboarding_') || key.includes('personal_info') || key.includes('company_policies') || key.includes('document_upload'))) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach(key => sessionStorage.removeItem(key))
        }
        sessionStorage.setItem('current_onboarding_token', token)

        if (singleStepRequested) {
          try {
            const response = await fetch(`${apiBase}/onboarding/single-step/${token}`)
            if (!response.ok) {
              throw new Error(`Invitation lookup failed with status ${response.status}`)
            }

            const result = await response.json()
            const data = result?.data || result

            const targetStep = data?.sessionData?.stepId || requestedStep || data?._metadata?.target_step || 'direct-deposit'

            const sessionData = await flowController.initializeSingleStepSession(token, {
              stepId: targetStep,
              employee: data?.employee || undefined,
              property: data?.property || undefined,
              savedFormData: data?.savedFormData || undefined,
              sessionId: data?.sessionData?.sessionId,
              recipientEmail: data?.sessionData?.recipientEmail,
              recipientName: data?.sessionData?.recipientName,
              expiresAt: data?.sessionData?.expiresAt,
              metadata: data?._metadata
            })

            setIsSingleStepMode(true)
            setSingleStepTarget(targetStep)
            const metadata = data?._metadata || {}
            const hrContactEmail = metadata.hr_contact_email || metadata.hrContactEmail || data?.sessionData?.hrContactEmail

            setSingleStepMeta({
              ...metadata,
              hrContactEmail,
              employeeExists: data?.employeeExists,
              sessionId: data?.sessionData?.sessionId,
              recipientEmail: data?.sessionData?.recipientEmail,
              recipientName: data?.sessionData?.recipientName
            })

            setSession(sessionData)
            syncControllerSnapshot()

            // Attempt to load any locally cached data for the target step
            const savedData = sessionStorage.getItem(`onboarding_${targetStep}_data`)
            if (savedData) {
              try {
                const parsed = JSON.parse(savedData)
                flowController.setStepData(targetStep, parsed)
              } catch (e) {
                console.error(`Failed to parse saved data for single-step ${targetStep}:`, e)
              }
            }

            setError(null)
          } catch (singleStepError) {
            console.error('Failed to initialize single-step session:', singleStepError)
            setError(singleStepError instanceof Error ? singleStepError.message : 'Failed to load invitation')
          } finally {
            setLoading(false)
          }
          return
        }

        const sessionData = await flowController.initializeOnboarding(token)
        setIsSingleStepMode(false)
        setSingleStepTarget(null)
        setSingleStepMeta(null)
        setSession(sessionData)

        // Load saved data from cloud first, then merge with local
        if (sessionData.savedFormData && Object.keys(sessionData.savedFormData).length > 0) {
          console.log('Loading saved form data from cloud:', sessionData.savedFormData)

          // Load cloud data and save to sessionStorage
          Object.entries(sessionData.savedFormData).forEach(([stepId, formData]) => {
            if (formData && Object.keys(formData).length > 0) {
              console.log(`Setting cloud data for step ${stepId}:`, formData)
              flowController.setStepData(stepId, formData)
              // Save to sessionStorage for offline access
              sessionStorage.setItem(`onboarding_${stepId}_data`, JSON.stringify(formData))
            }
          })
        } else {
          // No cloud data, check local storage
          console.log('No cloud data found, checking local storage')
          flowController.steps.forEach(step => {
            const savedData = sessionStorage.getItem(`onboarding_${step.id}_data`)
            if (savedData) {
              try {
                const parsed = JSON.parse(savedData)
                console.log(`Loading local data for step ${step.id}:`, parsed)
                flowController.setStepData(step.id, parsed)
              } catch (e) {
                console.error(`Failed to parse saved data for step ${step.id}:`, e)
              }
            }
          })
        }

        // IMPORTANT: Restore local progress AFTER loading session but BEFORE setting UI state
        // This ensures completed steps from local storage are merged with backend progress
        flowController.restoreLocalProgress()

        // Now set UI state with the merged progress
        syncControllerSnapshot()

        setError(null)
      } catch (err) {
        console.error('Failed to initialize onboarding:', err)
        setError(err instanceof Error ? err.message : 'Failed to load onboarding session')
      } finally {
        setLoading(false)
      }
    }

    initializeSession()
  }, [token, flowController, mode, requestedStep, syncControllerSnapshot])

  // Auto-save management
  useEffect(() => {
    if (!session || !currentStep) return

    const updateSaveStatus = () => {
      const status = flowController.getSaveStatus()
      setSaveStatus(status)
    }

    const interval = setInterval(updateSaveStatus, 5000) // Reduced frequency from 1s to 5s
    return () => clearInterval(interval)
  }, [session, currentStep, flowController])

  const handlePreviousStep = useCallback(() => {
    setValidationMessages([])
    flowController.goToPreviousStep()
    syncControllerSnapshot()

    // Scroll to top after navigation
    scrollToTop()
  }, [flowController, syncControllerSnapshot])

  // Handle jump navigation to a specific step
  const handleJumpToStep = useCallback((stepIndex: number) => {
    setValidationMessages([])

    const targetStep = flowController.steps[stepIndex]
    if (!targetStep) {
      return
    }

    const status = stepStates[targetStep.id] ?? flowController.getStepState(targetStep.id)
    if (status === 'locked') {
      return
    }

    const canNavigate = flowController.canNavigateToStep(stepIndex)
    if (!canNavigate) {
      return
    }

    flowController.setCurrentStepIndex(stepIndex)
    syncControllerSnapshot()
    scrollToTop()
  }, [flowController, stepStates, syncControllerSnapshot])

  // Check if user can navigate to a specific step
  const canNavigateToStep = useCallback((stepIndex: number): boolean => {
    const step = flowController.steps[stepIndex]
    if (!step) return false

    const status = stepStates[step.id] ?? flowController.getStepState(step.id)
    if (status === 'locked') return false

    return status === 'ready' || status === 'in-progress' || status === 'complete'
  }, [flowController, stepStates])

  const handleSaveProgress = useCallback(async (stepId: string, data?: any) => {
    if (!currentStep) return

    try {
      // Update controller's step data
      if (data) {
        flowController.setStepData(stepId, data)
        // Also save to sessionStorage immediately
        sessionStorage.setItem(`onboarding_${stepId}_data`, JSON.stringify(data))
      }
      
      // Start sync indicator
      startSync()
      
      // Save to backend
      await flowController.saveProgress(stepId, data)
      console.log(`Progress saved for step ${stepId}`)
      
      // Mark sync as successful
      syncSuccess()
    } catch (err) {
      console.error('Failed to save progress:', err)
      // Report sync error
      reportSyncError(err instanceof Error ? err.message : 'Failed to save progress')
      
      // If offline, mark as saved locally
      if (!isOnline) {
        syncOffline()
      }
    }
  }, [currentStep, flowController, startSync, syncSuccess, reportSyncError, isOnline, syncOffline])

  const handleStepComplete = useCallback(async (stepId: string, data?: any) => {
    try {
      await flowController.markStepComplete(stepId, data)
      syncControllerSnapshot()
    } catch (err) {
      console.error('Failed to mark step complete:', err)
    }
  }, [flowController, syncControllerSnapshot])

  const advanceCurrentStep = useCallback(async (
    options?: { overrideData?: any; skipValidation?: boolean }
  ): Promise<NavigationValidationResult | null> => {
    if (!currentStep) return null

    try {
      setValidationMessages([])

      const autoSyncedSteps = ['personal-info', 'w4-form', 'direct-deposit', 'health-insurance', 'company-policies', 'weapons-policy']

      let stepData = options?.overrideData ?? flowController.getStepData(currentStep.id)

      if (options?.overrideData) {
        flowController.setStepData(currentStep.id, options.overrideData)
        try {
          sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(options.overrideData))
        } catch (storageError) {
          console.error('Failed to persist override data to sessionStorage:', storageError)
        }
        stepData = options.overrideData
      } else if (autoSyncedSteps.includes(currentStep.id)) {
        const savedData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
        if (savedData) {
          try {
            stepData = JSON.parse(savedData)
            flowController.setStepData(currentStep.id, stepData)
          } catch (e) {
            console.error('Failed to parse saved data:', e)
          }
        }
      }

      if (!options?.skipValidation) {
        const validation = await flowController.validateCurrentStep()
        if (!validation.valid) {
          const messages: ValidationMessage[] = (validation.errors || []).map(message => ({ message, type: 'error' }))
          if (messages.length === 0 && validation.fieldErrors) {
            messages.push(...Object.values(validation.fieldErrors).map(message => ({ message, type: 'error' })))
          }
          setValidationMessages(messages)
          scrollToErrorContainer()
          return null
        }
      }

      await flowController.markStepComplete(currentStep.id, stepData)
      syncControllerSnapshot()

      const navigationResult = await flowController.advanceToNextStep()
      if (!navigationResult.allowed) {
        const messages: ValidationMessage[] = []
        if (navigationResult.reason) {
          messages.push({ message: navigationResult.reason, type: 'error' })
        }
        if (navigationResult.missing_requirements?.length) {
          navigationResult.missing_requirements.forEach(req => {
            messages.push({ message: `Complete step "${req}" before continuing.`, type: 'error' })
          })
        }
        setValidationMessages(messages)
        scrollToErrorContainer()
        return navigationResult
      }

      const warnings: ValidationMessage[] = []
      const warningMessages = navigationResult.warnings || []
      warningMessages.forEach(message => {
        warnings.push({ message, type: 'warning' })
      })

      if (navigationResult.fallback && navigationResult.reason && !warningMessages.includes(navigationResult.reason)) {
        warnings.push({ message: navigationResult.reason, type: 'warning' })
      } else if (navigationResult.fallback && warningMessages.length === 0) {
        warnings.push({
          message: 'We could not confirm with the server, but your progress is saved locally. Please refresh once you are back online.',
          type: 'warning'
        })
      }

      setValidationMessages(warnings)

      syncControllerSnapshot()
      scrollToTop()
      return navigationResult
    } catch (err) {
      console.error('Failed to proceed to next step:', err)
      setValidationMessages([{ message: err instanceof Error ? err.message : 'Failed to proceed', type: 'error' }])
      scrollToErrorContainer()
      return null
    }
  }, [currentStep, flowController, syncControllerSnapshot])

  const handleNextStep = useCallback(async (): Promise<NavigationValidationResult | null> => {
    return advanceCurrentStep()
  }, [advanceCurrentStep])

  // Language change handler
  const handleLanguageChange = useCallback((newLanguage: 'en' | 'es') => {
    setLanguage(newLanguage)
    // Save language preference
    if (currentStep) {
      handleSaveProgress(currentStep.id, { language_preference: newLanguage })
    }
  }, [currentStep, handleSaveProgress])

  // Get step props for component rendering
  const getStepProps = useCallback((): StepProps => {
    if (!session || !currentStep || !progress) {
      throw new Error('Session not properly initialized')
    }

    const baseProps = flowController.getStepProps()
    const stateMap = baseProps.stepStates ?? stepStates
    const resolveStepState = baseProps.getStepState ?? ((stepId: string) => stateMap?.[stepId] ?? 'locked')

    return {
      ...baseProps,
      markStepComplete: handleStepComplete,
      saveProgress: handleSaveProgress,
      goToNextStep: baseProps.goToNextStep ?? flowController.goToNextStep.bind(flowController),
      goToPreviousStep: handlePreviousStep,
      advanceToNextStep: async () => {
        const result = await advanceCurrentStep()
        return result ?? { allowed: false, reason: 'Navigation blocked' }
      },
      completeAndAdvance: async (data?: any, options?: { skipValidation?: boolean; resumeAnchor?: string | null }) => {
        if (options && Object.prototype.hasOwnProperty.call(options, 'resumeAnchor')) {
          baseProps.setStepResumeAnchor?.(currentStep.id, options?.resumeAnchor ?? null)
        }
        const result = await advanceCurrentStep({
          overrideData: data,
          skipValidation: options?.skipValidation
        })
        return result ?? { allowed: false, reason: 'Navigation blocked' }
      },
      language,
      employee: session.employee,
      property: session.property,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      isSingleStepMode,
      singleStepMeta,
      canProceedToNext: progress.canProceed,
      stepStates: stateMap,
      getStepState: resolveStepState
    }
  }, [session, currentStep, progress, language, handleStepComplete, handleSaveProgress, handlePreviousStep, isSingleStepMode, singleStepMeta, flowController, advanceCurrentStep, stepStates])

  // Render step content
  const renderStepContent = () => {
    if (!currentStep) return null

    const stepProps = getStepProps()

    switch (currentStep.id) {
      case 'welcome':
        return <WelcomeStep {...stepProps} />
      case 'personal-info':
        return <PersonalInfoStep {...stepProps} />
      case 'job-details':
        return <JobDetailsStep {...stepProps} />
      case 'company-policies':
        return <CompanyPoliciesStep {...stepProps} />
      case 'i9-section1':
        return <I9Section1Step {...stepProps} />
      case 'i9-complete':
        return <I9CompleteStep {...stepProps} />
      case 'i9-supplements':
        return <I9SupplementsStep {...stepProps} />
      case 'w4-form':
        return <W4FormStep {...stepProps} />
      case 'direct-deposit':
        return <DirectDepositStep {...stepProps} />
      case 'trafficking-awareness':
        return <TraffickingAwarenessStep {...stepProps} />
      case 'weapons-policy':
        return <WeaponsPolicyStep {...stepProps} />
      case 'health-insurance':
        return <HealthInsuranceStep {...stepProps} />
      case 'document-upload':
        return <DocumentUploadStep {...stepProps} />
      case 'final-review':
        return <FinalReviewStep {...stepProps} />
      default:
        return (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-heading-secondary text-gray-900 mb-2">
              Step Not Implemented
            </h3>
            <p className="text-gray-600">
              The step "{currentStep.name}" is not yet implemented.
            </p>
          </div>
        )
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      flowController.destroy()
    }
  }, [flowController])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-600">Loading onboarding session...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
<h2 className="text-2xl font-bold text-heading-primary text-gray-900 mb-2">Onboarding Error</h2>
            <p className="text-gray-600 mb-6">{error || 'Unable to load onboarding session'}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const federalSteps = flowController.steps.filter(step => step.governmentRequired)
  const completedFederalSteps = federalSteps.filter(step => 
    progress?.completedSteps?.includes(step.id)
  ).length
  const currentStepStatus: StepStatus | undefined = currentStep
    ? (stepStates[currentStep.id] ?? flowController.getStepState(currentStep.id))
    : undefined
  const isCurrentStepComplete = currentStepStatus === 'complete'
  const canAdvanceFromCurrentStep = Boolean(progress?.canProceed)
  const content = renderStepContent() as StepContentWithMeta
  const renderedContent = (
    <ErrorBoundary>
      {content}
    </ErrorBoundary>
  )
  const currentStepCanProceed = (() => {
    if (content?.props && Object.prototype.hasOwnProperty.call(content.props, 'canProceed')) {
      return Boolean(content.props.canProceed)
    }

    const containerElement = document.querySelector('[data-step-container]') as HTMLElement | null
    if (containerElement && containerElement.dataset.canProceed) {
      return containerElement.dataset.canProceed === 'true'
    }

    return true
  })()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-heading-primary text-gray-900">
                {isSingleStepMode ? 'Single-Step Form' : 'Employee Onboarding'}
              </h1>
              {session?.property?.name && !isSingleStepMode && (
                <span className="ml-1 text-sm text-gray-500">
                  {session.property.name}
                </span>
              )}
              {isSingleStepMode && singleStepTarget && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {singleStepTarget.replace('-', ' ')}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {/* Sync Status Indicator - Full on desktop */}
              <div className="hidden md:block">
                <SyncIndicator
                  status={syncStatus}
                  lastSyncTime={lastSyncTime}
                  error={syncError}
                  showDetails={true}
                  className="text-sm"
                />
              </div>
              
              {/* Sync Status Badge - Mobile */}
              <div className="block md:hidden">
                <SyncBadge
                  status={syncStatus}
                  className="w-8 h-8"
                />
              </div>
              
              {/* Language Toggle */}
              <button
                onClick={() => handleLanguageChange(language === 'en' ? 'es' : 'en')}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <span>{language === 'en' ? 'Español' : 'English'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      {currentStep && !isSingleStepMode && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumb 
              items={createBreadcrumbItems(['Home', 'Onboarding', currentStep.name])} 
              className="text-sm"
            />
          </div>
        </div>
      )}

      {/* Global Progress Bar - Sticky */}
      {progress && !isSingleStepMode && (
        <div className="sticky top-0 z-40 bg-white shadow-md">
          <ProgressBar
            steps={flowController.steps}
            currentStep={progress.currentStepIndex}
            completedSteps={progress.completedSteps}
            percentComplete={progress.percentComplete}
            estimatedTimeRemaining={flowController.steps
              .slice(progress.currentStepIndex)
              .reduce((total, step) => total + step.estimatedMinutes, 0)}
            federalStepsCompleted={completedFederalSteps}
            totalFederalSteps={federalSteps.length}
            onStepClick={handleJumpToStep}
            canNavigateToStep={canNavigateToStep}
            stepStates={stepStates}
          />
          {/* Enhanced Progress Info for Mobile */}
          <div className="md:hidden px-4 py-2 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>Step {progress.currentStepIndex + 1} of {flowController.steps.length}</span>
              <span>{progress.percentComplete}% Complete</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Added pb-28 on mobile to account for sticky navigation */}
      <main className="flex-1 py-6 pb-28 sm:pb-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Step Content */}
          <Card className="card-transition fade-in">
            <CardContent className="pt-6">
              {/* Validation Errors */}
              {validationMessages.length > 0 && (
                <div id="error-container" className="mb-6">
                  <ValidationSummary
                    messages={validationMessages}
                    title="Please fix the following issues"
                    showIcon={true}
                    className="transition-all duration-300"
                  />
                </div>
              )}

              {/* Step Content */}
              {renderedContent}

              {/* Navigation - Always visible for both regular and single-step modes */}
              {progress && (
                <NavigationButtons
                  showPrevious={progress.currentStepIndex > 0}
                  showNext={progress.currentStepIndex < progress.totalSteps - 1}
                  showSave={false} // Auto-save handles this
                  nextButtonText={
                    progress.currentStepIndex === progress.totalSteps - 1
                      ? 'Submit'
                      : 'Next'
                  }
                  onPrevious={handlePreviousStep}
                  onNext={handleNextStep}
                  saving={saveStatus.saving}
                  hasErrors={validationMessages.some(msg => msg.type === 'error')}
                  language={language}
                  disabled={saveStatus.saving || !canAdvanceFromCurrentStep || !currentStepCanProceed}
                  stepStatus={currentStepStatus}
                  sticky
                  currentStep={progress.currentStepIndex}
                  totalSteps={progress.totalSteps}
                  progress={progress.percentComplete}
                />
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}
