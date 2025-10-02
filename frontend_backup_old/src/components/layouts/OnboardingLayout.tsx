import React, { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  CheckCircle, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  AlertTriangle,
  Clock,
  User,
  Shield,
  FileText,
  CreditCard,
  Heart,
  Building,
  GraduationCap,
  Award,
  Home
} from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  shortTitle: string
  path: string
  icon: React.ReactNode
  description: string
  required: boolean
  estimatedTime: string
}

interface OnboardingProgress {
  currentStep: number
  completedSteps: string[]
  stepData: Record<string, any>
  lastSaved: string
  isComplete: boolean
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'personal-info',
    title: 'Personal Information',
    shortTitle: 'Personal Info',
    path: '/onboarding/personal-info',
    icon: <User className="h-4 w-4" />,
    description: 'Basic contact, emergency contacts, and personal details',
    required: true,
    estimatedTime: '5 min'
  },
  {
    id: 'i9-section1',
    title: 'I-9 Employment Eligibility',
    shortTitle: 'I-9 Section 1',
    path: '/onboarding/i9-section1',
    icon: <Shield className="h-4 w-4" />,
    description: 'Employee eligibility verification with digital signature',
    required: true,
    estimatedTime: '3 min'
  },
  {
    id: 'i9-supplements',
    title: 'I-9 Translator/Preparer',
    shortTitle: 'I-9 Supplements',
    path: '/onboarding/i9-supplements',
    icon: <FileText className="h-4 w-4" />,
    description: 'Supplement A if translator or preparer assisted',
    required: false,
    estimatedTime: '2 min'
  },
  {
    id: 'document-upload',
    title: 'Document Verification',
    shortTitle: 'Documents',
    path: '/onboarding/document-upload',
    icon: <FileText className="h-4 w-4" />,
    description: 'Upload I-9 List A, B, or C documents for verification',
    required: true,
    estimatedTime: '4 min'
  },
  {
    id: 'w4-form',
    title: 'W-4 Tax Withholding',
    shortTitle: 'W-4 Form',
    path: '/onboarding/w4-form',
    icon: <CreditCard className="h-4 w-4" />,
    description: 'Federal tax withholding form with digital signature',
    required: true,
    estimatedTime: '4 min'
  },
  {
    id: 'direct-deposit',
    title: 'Direct Deposit Setup',
    shortTitle: 'Direct Deposit',
    path: '/onboarding/direct-deposit',
    icon: <CreditCard className="h-4 w-4" />,
    description: 'Banking information with authorization signature',
    required: true,
    estimatedTime: '3 min'
  },
  {
    id: 'health-insurance',
    title: 'Health Insurance Enrollment',
    shortTitle: 'Health Insurance',
    path: '/onboarding/health-insurance',
    icon: <Heart className="h-4 w-4" />,
    description: 'Plan selection with dependent coverage options',
    required: true,
    estimatedTime: '6 min'
  },
  {
    id: 'company-policies',
    title: 'Company Policies',
    shortTitle: 'Policies',
    path: '/onboarding/company-policies',
    icon: <Building className="h-4 w-4" />,
    description: 'Policy acknowledgment with digital signature',
    required: true,
    estimatedTime: '4 min'
  },
  {
    id: 'trafficking-awareness',
    title: 'Human Trafficking Awareness',
    shortTitle: 'Trafficking Training',
    path: '/onboarding/trafficking-awareness',
    icon: <GraduationCap className="h-4 w-4" />,
    description: 'Required training completion with certificate',
    required: true,
    estimatedTime: '8 min'
  },
  {
    id: 'weapons-policy',
    title: 'Weapons Policy Acknowledgment',
    shortTitle: 'Weapons Policy',
    path: '/onboarding/weapons-policy',
    icon: <Shield className="h-4 w-4" />,
    description: 'Policy acknowledgment with digital signature',
    required: true,
    estimatedTime: '2 min'
  },
  {
    id: 'employee-review',
    title: 'Final Review & Certification',
    shortTitle: 'Final Review',
    path: '/onboarding/employee-review',
    icon: <Award className="h-4 w-4" />,
    description: 'Review all information and complete onboarding',
    required: true,
    estimatedTime: '3 min'
  }
]

export function OnboardingLayout() {
  const { user, isAuthenticated, token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [progress, setProgress] = useState<OnboardingProgress>({
    currentStep: 0,
    completedSteps: [],
    stepData: {},
    lastSaved: '',
    isComplete: false
  })

  const [saving, setSaving] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  // Get current step from URL
  const currentStepId = location.pathname.split('/onboarding/')[1] || 'personal-info'
  const currentStepIndex = ONBOARDING_STEPS.findIndex(step => step.id === currentStepId)
  const currentStep = ONBOARDING_STEPS[currentStepIndex]

  // TODO: Implement token-based access for approved employees
  // For now, allow public access to onboarding (no authentication required)
  useEffect(() => {
    setLoading(false)
  }, [])

  // Load progress from backend API or localStorage
  useEffect(() => {
    // TODO: In the future, use onboarding token from URL params
    // For now, try to load from localStorage as fallback
    loadProgressFromBackend()
  }, [])

  const loadProgressFromBackend = async () => {
    // TODO: Future implementation will use onboarding token
    // For now, try localStorage first, then fallback to new session
    try {
      const savedProgress = localStorage.getItem('onboarding-progress')
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress)
        setProgress(parsed)
        return
      }
    } catch (parseError) {
      console.error('Failed to parse saved progress:', parseError)
    }
    
    // Initialize with default progress if no saved data
    setProgress({
      currentStep: 0,
      completedSteps: [],
      stepData: {},
      lastSaved: '',
      isComplete: false
    })
  }

  // Auto-save progress
  useEffect(() => {
    if (autoSaveEnabled && progress.lastSaved) {
      const timeoutId = setTimeout(() => {
        saveProgress()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId)
    }
  }, [progress, autoSaveEnabled])

  const saveProgress = async () => {
    setSaving(true)
    try {
      // TODO: Future implementation will save to backend via onboarding token
      // For now, save to localStorage
      localStorage.setItem('onboarding-progress', JSON.stringify({
        ...progress,
        lastSaved: new Date().toISOString()
      }))
      
      if (progress.lastSaved) {
        toast({
          title: "Progress Saved",
          description: "Your onboarding progress has been saved locally.",
          duration: 2000
        })
      }
    } catch (error) {
      console.error('Failed to save progress:', error)
      toast({
        title: "Save Failed",
        description: "Unable to save your progress. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const markStepComplete = async (stepId: string, data?: any) => {
    const updatedProgress = {
      ...progress,
      completedSteps: [...progress.completedSteps.filter(id => id !== stepId), stepId],
      stepData: data ? { ...progress.stepData, [stepId]: data } : progress.stepData,
      currentStep: Math.max(progress.currentStep, currentStepIndex + 1),
      lastSaved: new Date().toISOString()
    }
    
    setProgress(updatedProgress)
    
    // TODO: Future implementation will save to backend via onboarding token
    // For now, the saveProgress function will handle localStorage
  }

  const navigateToStep = (stepIndex: number) => {
    const step = ONBOARDING_STEPS[stepIndex]
    if (step) {
      // Only allow navigation to completed steps or the next step
      const canNavigate = progress.completedSteps.includes(step.id) || 
                         stepIndex <= Math.max(progress.currentStep, currentStepIndex + 1)
      
      if (canNavigate) {
        navigate(step.path)
      } else {
        toast({
          title: "Step Locked",
          description: "Please complete the previous steps before proceeding.",
          variant: "destructive"
        })
      }
    }
  }

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      navigateToStep(currentStepIndex - 1)
    }
  }

  const goToNextStep = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      navigateToStep(currentStepIndex + 1)
    }
  }

  const getTotalEstimatedTime = () => {
    const totalMinutes = ONBOARDING_STEPS.reduce((total, step) => {
      const minutes = parseInt(step.estimatedTime)
      return total + minutes
    }, 0)
    return `${totalMinutes} min`
  }

  const getCompletionPercentage = () => {
    return Math.round((progress.completedSteps.length / ONBOARDING_STEPS.length) * 100)
  }

  const getStepStatus = (step: OnboardingStep, index: number) => {
    if (progress.completedSteps.includes(step.id)) {
      return 'completed'
    } else if (index === currentStepIndex) {
      return 'current'
    } else if (index <= Math.max(progress.currentStep, currentStepIndex)) {
      return 'available'
    } else {
      return 'locked'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Exit Onboarding</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Employee Onboarding</h1>
                <p className="text-sm text-gray-500 hidden sm:block">Complete your employment paperwork</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Est. {getTotalEstimatedTime()} total</span>
              </div>
              
              {saving && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <Save className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={saveProgress}
                disabled={saving}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Save & Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{currentStep?.title}</h2>
              <p className="text-sm text-gray-600">{currentStep?.description}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
              </Badge>
              <div className="text-sm text-gray-600">
                {getCompletionPercentage()}% Complete
              </div>
            </div>
          </div>
          
          <Progress value={getCompletionPercentage()} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Step Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Steps Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ONBOARDING_STEPS.map((step, index) => {
                  const status = getStepStatus(step, index)
                  return (
                    <button
                      key={step.id}
                      onClick={() => navigateToStep(index)}
                      disabled={status === 'locked'}
                      className={`
                        w-full flex items-start space-x-3 p-3 rounded-lg text-left transition-all
                        ${status === 'completed' 
                          ? 'bg-green-50 border border-green-200 hover:bg-green-100' 
                          : status === 'current'
                          ? 'bg-blue-50 border border-blue-200'
                          : status === 'available'
                          ? 'bg-white border border-gray-200 hover:bg-gray-50'
                          : 'bg-gray-50 border border-gray-100 cursor-not-allowed opacity-60'
                        }
                      `}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : status === 'current' ? (
                          <div className="h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        ) : (
                          <Circle className={`h-4 w-4 ${status === 'locked' ? 'text-gray-400' : 'text-gray-500'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            status === 'locked' ? 'text-gray-400' : 'text-gray-900'
                          }`}>
                            {step.shortTitle}
                          </p>
                          <span className={`text-xs ${
                            status === 'locked' ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            {step.estimatedTime}
                          </span>
                        </div>
                        {step.required && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            {/* Auto-save Notice */}
            {progress.lastSaved && (
              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  Last saved: {new Date(progress.lastSaved).toLocaleTimeString()}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <Outlet context={{ 
                  currentStep, 
                  progress, 
                  markStepComplete,
                  saveProgress,
                  ONBOARDING_STEPS
                }} />
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStepIndex === 0}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}</span>
              </div>

              <Button
                onClick={goToNextStep}
                disabled={currentStepIndex === ONBOARDING_STEPS.length - 1}
                className="flex items-center space-x-2"
              >
                <span>{currentStepIndex === ONBOARDING_STEPS.length - 1 ? 'Complete' : 'Next'}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}