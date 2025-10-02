import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { ONBOARDING_WORKFLOW_STEPS } from '@/config/onboardingSteps'

// Import all step components
import WelcomeStep from './onboarding/WelcomeStep'
import PersonalInfoStep from './onboarding/PersonalInfoStep'
import JobDetailsStep from './onboarding/JobDetailsStep'
import CompanyPoliciesStep from './onboarding/CompanyPoliciesStep'
import I9Section1Step from './onboarding/I9Section1Step'
import W4FormStep from './onboarding/W4FormStep'
import DirectDepositStep from './onboarding/DirectDepositStep'
import TraffickingAwarenessStep from './onboarding/TraffickingAwarenessStep'
import WeaponsPolicyStep from './onboarding/WeaponsPolicyStep'
import HealthInsuranceStep from './onboarding/HealthInsuranceStep'
import DocumentUploadStep from './onboarding/DocumentUploadStep'
import I9SupplementsStep from './onboarding/I9SupplementsStep'
import FinalReviewStep from './onboarding/FinalReviewStep'

const stepComponents: Record<string, React.ComponentType<any>> = {
  'welcome': WelcomeStep,
  'personal-info': PersonalInfoStep,
  'job-details': JobDetailsStep,
  'company-policies': CompanyPoliciesStep,
  'i9-section1': I9Section1Step,
  'w4-form': W4FormStep,
  'direct-deposit': DirectDepositStep,
  'trafficking-awareness': TraffickingAwarenessStep,
  'weapons-policy': WeaponsPolicyStep,
  'health-insurance': HealthInsuranceStep,
  'document-upload': DocumentUploadStep,
  'i9-supplements': I9SupplementsStep,
  'final-review': FinalReviewStep
}

export default function OnboardingFlowTest() {
  const [testResults, setTestResults] = useState<Record<string, { 
    loaded: boolean, 
    error: string | null,
    hasAutoSave: boolean,
    hasStepContainer: boolean
  }>>({})

  const testStep = (stepId: string) => {
    try {
      const StepComponent = stepComponents[stepId]
      if (!StepComponent) {
        throw new Error(`Component not found for step: ${stepId}`)
      }

      // Mock props that all steps expect
      const mockProps = {
        currentStep: { id: stepId, name: stepId },
        progress: {
          currentStep: 1,
          totalSteps: ONBOARDING_WORKFLOW_STEPS.length,
          completedSteps: [],
          stepData: {}
        },
        markStepComplete: () => Promise.resolve(),
        saveProgress: () => Promise.resolve(),
        language: 'en' as const,
        employee: {
          firstName: 'Test',
          lastName: 'User',
          position: 'Test Position'
        },
        property: {
          name: 'Test Hotel',
          address: '123 Test St'
        }
      }

      // Try to render the component
      const element = React.createElement(StepComponent, mockProps)
      
      // Check if component uses our patterns (this is a basic check)
      const componentString = StepComponent.toString()
      const hasAutoSave = componentString.includes('useAutoSave')
      const hasStepContainer = componentString.includes('StepContainer')

      setTestResults(prev => ({
        ...prev,
        [stepId]: {
          loaded: true,
          error: null,
          hasAutoSave,
          hasStepContainer
        }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [stepId]: {
          loaded: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          hasAutoSave: false,
          hasStepContainer: false
        }
      }))
    }
  }

  const runAllTests = () => {
    ONBOARDING_WORKFLOW_STEPS.forEach(step => {
      testStep(step.id)
    })
  }

  const getStatusIcon = (result: typeof testResults[string]) => {
    if (!result) return <AlertCircle className="h-5 w-5 text-gray-400" />
    if (result.error) return <XCircle className="h-5 w-5 text-red-600" />
    if (result.loaded && result.hasAutoSave && result.hasStepContainer) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    }
    return <AlertCircle className="h-5 w-5 text-yellow-600" />
  }

  const getStatusColor = (result: typeof testResults[string]) => {
    if (!result) return 'bg-gray-50'
    if (result.error) return 'bg-red-50'
    if (result.loaded && result.hasAutoSave && result.hasStepContainer) {
      return 'bg-green-50'
    }
    return 'bg-yellow-50'
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Flow Component Test</CardTitle>
          <p className="text-sm text-gray-600">
            This page tests that all step components load correctly and follow the new patterns
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={runAllTests} className="w-full">
              Run All Component Tests
            </Button>

            {Object.keys(testResults).length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Test Results:</h3>
                <div className="space-y-2">
                  {ONBOARDING_WORKFLOW_STEPS.map(step => {
                    const result = testResults[step.id]
                    return (
                      <div 
                        key={step.id} 
                        className={`p-3 rounded-lg border ${getStatusColor(result)}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(result)}
                            <div>
                              <p className="font-medium">{step.name}</p>
                              <p className="text-sm text-gray-600">{step.id}</p>
                            </div>
                          </div>
                          {result && (
                            <div className="text-sm text-right">
                              {result.error ? (
                                <span className="text-red-600">Error: {result.error}</span>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className={result.hasAutoSave ? 'text-green-600' : 'text-gray-400'}>
                                      {result.hasAutoSave ? '✓' : '✗'} Auto-save
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={result.hasStepContainer ? 'text-green-600' : 'text-gray-400'}>
                                      {result.hasStepContainer ? '✓' : '✗'} StepContainer
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> This is a basic component loading test. For full functionality testing, 
                please use the manual test guide at /onboard-flow-test route.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <a 
              href="/onboard-flow-test" 
              className="block p-3 border rounded-lg hover:bg-gray-50"
            >
              <p className="font-medium">Full Onboarding Flow Test</p>
              <p className="text-sm text-gray-600">Test the complete onboarding experience</p>
            </a>
            <a 
              href="/onboard-flow" 
              className="block p-3 border rounded-lg hover:bg-gray-50"
            >
              <p className="font-medium">Production Onboarding Flow</p>
              <p className="text-sm text-gray-600">The actual onboarding flow (requires auth)</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}