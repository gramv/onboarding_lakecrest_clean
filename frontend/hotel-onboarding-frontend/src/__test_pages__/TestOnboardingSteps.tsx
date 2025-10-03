import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import I9Section1Step from './onboarding/I9Section1Step'
import W4FormStep from './onboarding/W4FormStep'
import PersonalInfoStep from './onboarding/PersonalInfoStep'
import CompanyPoliciesStep from './onboarding/CompanyPoliciesStep'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addI9FieldTestButton } from '@/utils/testI9Fields'
import { addW4FieldTestButton } from '@/utils/testW4Fields'

// Define available test steps
const TEST_STEPS = [
  { id: 'personal-info', name: 'Personal Info', component: PersonalInfoStep },
  { id: 'company-policies', name: 'Company Policies', component: CompanyPoliciesStep },
  { id: 'i9-section1', name: 'I-9 Section 1', component: I9Section1Step },
  { id: 'w4-form', name: 'W-4 Form', component: W4FormStep }
]

export default function TestOnboardingSteps() {
  const navigate = useNavigate()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [progress, setProgress] = useState({
    currentStep: 0,
    totalSteps: TEST_STEPS.length,
    completedSteps: [],
    stepData: {}
  })

  // Add test buttons on mount
  useEffect(() => {
    addI9FieldTestButton()
    addW4FieldTestButton()
    // Cleanup on unmount
    return () => {
      const buttons = document.querySelectorAll('button[style*="position: fixed"]')
      buttons.forEach(button => button.remove())
    }
  }, [])

  const currentStep = TEST_STEPS[currentStepIndex]
  const StepComponent = currentStep.component

  const markStepComplete = (stepId: string, data?: any) => {
    setProgress(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps, stepId],
      stepData: {
        ...prev.stepData,
        [stepId]: data
      }
    }))
    
    // Move to next step if available
    if (currentStepIndex < TEST_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const saveProgress = async (stepId: string, data?: any) => {
    setProgress(prev => ({
      ...prev,
      stepData: {
        ...prev.stepData,
        [stepId]: data
      }
    }))
    console.log(`Progress saved for ${stepId}:`, data)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    return Promise.resolve()
  }

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const goToNextStep = () => {
    if (currentStepIndex < TEST_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  // Mock employee data for testing
  const mockEmployee = {
    id: 'test-employee-123',
    first_name: 'Test',
    last_name: 'Employee',
    email: 'test@example.com'
  }

  const mockProperty = {
    id: 'test-property-123',
    name: 'Test Hotel',
    address: '123 Test St',
    city: 'Test City',
    state: 'TX',
    zip_code: '12345'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Onboarding Steps</CardTitle>
            <p className="text-sm text-gray-600">
              Testing individual onboarding components in isolation
            </p>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={() => {
                  import('@/utils/testI9Fields').then(module => {
                    module.testI9Fields()
                  })
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Analyze I-9 PDF Fields
              </Button>
              <Button 
                onClick={() => {
                  import('@/utils/testW4Fields').then(module => {
                    module.testW4Fields()
                  })
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Analyze W-4 PDF Fields
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Step selector */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-2">
                {TEST_STEPS.map((step, index) => (
                  <Button
                    key={step.id}
                    variant={index === currentStepIndex ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentStepIndex(index)}
                  >
                    {step.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Progress info */}
            <div className="text-sm text-gray-600">
              <p>Current Step: {currentStep.name}</p>
              <p>Completed Steps: {progress.completedSteps.join(', ') || 'None'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Step Component */}
        <Card>
          <CardContent className="p-6">
            <StepComponent
              currentStep={{
                id: currentStep.id,
                name: currentStep.name,
                order: currentStepIndex + 1,
                required: true
              }}
              progress={{
                completedSteps: progress.completedSteps,
                currentStepIndex: currentStepIndex,
                totalSteps: TEST_STEPS.length,
                percentComplete: Math.round((progress.completedSteps.length / TEST_STEPS.length) * 100),
                stepData: progress.stepData
              }}
              markStepComplete={markStepComplete}
              saveProgress={saveProgress}
              goToNextStep={goToNextStep}
              goToPreviousStep={goToPreviousStep}
              language="en"
              employee={mockEmployee}
              property={mockProperty}
              sessionToken="test-token"
              expiresAt={new Date(Date.now() + 24 * 60 * 60 * 1000)}
            />
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous Step
          </Button>
          <Button
            variant="outline"
            onClick={goToNextStep}
            disabled={currentStepIndex === TEST_STEPS.length - 1}
          >
            Next Step
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Debug info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(progress, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}