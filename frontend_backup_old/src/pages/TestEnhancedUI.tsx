import React from 'react'
import { useNavigate } from 'react-router-dom'
import PersonalInfoStepEnhanced from '@/examples/PersonalInfoStepEnhanced'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles } from 'lucide-react'

// Mock data for testing
const mockProgress = {
  currentStepIndex: 1,
  completedSteps: [],
  totalSteps: 13,
  stepsData: {}
}

const mockCurrentStep = {
  id: 'personal-info',
  title: 'Personal Information',
  description: 'Your basic information and emergency contacts',
  component: PersonalInfoStepEnhanced,
  validation: null
}

export default function TestEnhancedUI() {
  const navigate = useNavigate()
  const [language, setLanguage] = React.useState<'en' | 'es'>('en')
  const [completedSteps, setCompletedSteps] = React.useState<string[]>([])
  const [savedData, setSavedData] = React.useState<any>({})

  const handleMarkStepComplete = (stepId: string, data?: any) => {
    console.log('Step completed:', stepId, data)
    setCompletedSteps(prev => [...prev, stepId])
    if (data) {
      setSavedData(prev => ({ ...prev, [stepId]: data }))
    }
  }

  const handleSaveProgress = async (stepId: string, data: any) => {
    console.log('Saving progress:', stepId, data)
    setSavedData(prev => ({ ...prev, [stepId]: data }))
    // Simulate async save
    return new Promise(resolve => setTimeout(resolve, 500))
  }

  const handleGoToNextStep = () => {
    console.log('Going to next step')
    // In real app, this would navigate to next step
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Enhanced UI Test
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              >
                {language === 'en' ? 'Español' : 'English'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Testing Enhanced UI Components</CardTitle>
            <CardDescription>
              This page demonstrates the new UI enhancements including:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li><strong>StepIndicator</strong> - Visual progress tracking with status indicators</li>
              <li><strong>FormSection</strong> - Organized form sections with completion tracking</li>
              <li><strong>ValidationSummary</strong> - Centralized error display</li>
              <li><strong>ProgressBar</strong> - Animated progress with percentage</li>
              <li><strong>Enhanced Tabs</strong> - Better visual feedback and disabled states</li>
              <li><strong>Auto-save indicators</strong> - Real-time save status</li>
              <li><strong>Mobile-friendly</strong> - Responsive design with mini indicators</li>
            </ul>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Try it out:</strong> Fill in the forms, switch between tabs, and watch the progress indicators update in real-time. 
                Check the console for save events.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Component */}
        <div className="bg-white rounded-lg shadow-sm">
          <PersonalInfoStepEnhanced
            currentStep={mockCurrentStep}
            progress={{
              ...mockProgress,
              completedSteps
            }}
            markStepComplete={handleMarkStepComplete}
            saveProgress={handleSaveProgress}
            goToNextStep={handleGoToNextStep}
            language={language}
            employee={{
              id: 'test-employee',
              name: 'Test Employee'
            }}
            property={{
              id: 'test-property',
              name: 'Test Hotel'
            }}
          />
        </div>

        {/* Debug Panel */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-xs font-mono">
              <div>
                <p className="text-gray-500 mb-1">Completed Steps:</p>
                <pre className="bg-gray-100 p-2 rounded">
                  {JSON.stringify(completedSteps, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Saved Data:</p>
                <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(savedData, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}