import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import DigitalSignatureCapture from '@/components/DigitalSignatureCapture'
import { 
  CheckCircle, 
  Award, 
  User, 
  Shield, 
  FileText, 
  CreditCard, 
  Heart, 
  Building, 
  GraduationCap,
  AlertCircle,
  PartyPopper
} from 'lucide-react'

interface StepProps {
  currentStep: any
  progress: any
  markStepComplete: (stepId: string, data?: any) => void
  saveProgress: (stepId: string, data?: any) => void
  language: 'en' | 'es'
  employee?: any
  property?: any
  ONBOARDING_STEPS?: any[]
}

export default function EmployeeReviewStep(props: StepProps) {
  const { currentStep, progress, markStepComplete, saveProgress } = props
  const navigate = useNavigate()
  
  // Default onboarding steps if not provided
  const ONBOARDING_STEPS = props.ONBOARDING_STEPS || [
    { id: 'personal-info', title: 'Personal Information', description: 'Basic personal details', estimatedTime: '5' },
    { id: 'i9-section1', title: 'I-9 Section 1', description: 'Employment eligibility', estimatedTime: '10' },
    { id: 'i9-supplements', title: 'I-9 Supplements', description: 'Additional I-9 forms', estimatedTime: '5' },
    { id: 'document-upload', title: 'Document Upload', description: 'Required documents', estimatedTime: '5' },
    { id: 'w4-form', title: 'W-4 Form', description: 'Tax withholding', estimatedTime: '10' },
    { id: 'direct-deposit', title: 'Direct Deposit', description: 'Banking information', estimatedTime: '5' },
    { id: 'health-insurance', title: 'Health Insurance', description: 'Benefits enrollment', estimatedTime: '10' },
    { id: 'company-policies', title: 'Company Policies', description: 'Policy acknowledgments', estimatedTime: '5' },
    { id: 'trafficking-awareness', title: 'Human Trafficking', description: 'Required training', estimatedTime: '5' },
    { id: 'weapons-policy', title: 'Weapons Policy', description: 'Security policy', estimatedTime: '5' },
    { id: 'employee-review', title: 'Final Review', description: 'Review and sign', estimatedTime: '5' }
  ]
  
  const [finalSignature, setFinalSignature] = useState(null)
  const [onboardingComplete, setOnboardingComplete] = useState(false)

  useEffect(() => {
    const existingData = progress.stepData?.['employee-review']
    if (existingData) {
      setFinalSignature(existingData.signature)
      setOnboardingComplete(existingData.complete || false)
    }
  }, [progress])

  const getStepIcon = (stepId: string) => {
    const icons: Record<string, React.ReactNode> = {
      'personal-info': <User className="h-4 w-4" />,
      'i9-section1': <Shield className="h-4 w-4" />,
      'i9-supplements': <FileText className="h-4 w-4" />,
      'document-upload': <FileText className="h-4 w-4" />,
      'w4-form': <CreditCard className="h-4 w-4" />,
      'direct-deposit': <CreditCard className="h-4 w-4" />,
      'health-insurance': <Heart className="h-4 w-4" />,
      'company-policies': <Building className="h-4 w-4" />,
      'trafficking-awareness': <GraduationCap className="h-4 w-4" />,
      'weapons-policy': <Shield className="h-4 w-4" />,
      'employee-review': <Award className="h-4 w-4" />
    }
    return icons[stepId] || <FileText className="h-4 w-4" />
  }

  const getStepStatus = (stepId: string) => {
    if (progress.completedSteps.includes(stepId)) {
      return 'completed'
    } else if (stepId === 'employee-review') {
      return 'current'
    } else {
      return 'incomplete'
    }
  }

  const handleFinalSignature = (signature: any) => {
    setFinalSignature(signature)
    setOnboardingComplete(true)
    
    const stepData = {
      signature,
      complete: true,
      completedAt: new Date().toISOString(),
      finalReview: {
        allStepsCompleted: ONBOARDING_STEPS.length - 1, // All except this final step
        reviewedAt: new Date().toISOString(),
        employeeConfirmation: true
      }
    }
    
    markStepComplete('employee-review', stepData)
    saveProgress('employee-review', stepData)
  }

  const handleCompleteOnboarding = () => {
    // Navigate to a completion page or dashboard
    navigate('/onboarding-complete')
  }

  const completedStepsCount = progress.completedSteps.length
  const totalSteps = ONBOARDING_STEPS.length
  const allStepsComplete = completedStepsCount === totalSteps - 1 // Exclude this review step

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Award className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Final Review & Certification</h1>
        </div>
        <p className="text-gray-600 max-w-3xl mx-auto">
          Review all your onboarding information and provide your final certification to complete the process.
        </p>
      </div>

      {/* Completion Status */}
      {allStepsComplete ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Excellent!</strong> All required onboarding steps have been completed successfully.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Incomplete Steps:</strong> Please complete all previous steps before proceeding with final certification.
          </AlertDescription>
        </Alert>
      )}

      {/* Step Review Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>Onboarding Progress Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ONBOARDING_STEPS.map((step, index) => {
              const status = getStepStatus(step.id)
              return (
                <div key={step.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      status === 'completed' ? 'bg-green-100 text-green-600' :
                      status === 'current' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {getStepIcon(step.id)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{step.title}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {status === 'completed' && (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Complete
                        </Badge>
                      </>
                    )}
                    {status === 'current' && (
                      <Badge variant="default" className="bg-blue-100 text-blue-800">
                        Current
                      </Badge>
                    )}
                    {status === 'incomplete' && (
                      <Badge variant="outline" className="text-gray-500">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Progress Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{completedStepsCount}</div>
              <div className="text-sm text-gray-600">Steps Completed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {Math.round((completedStepsCount / (totalSteps - 1)) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {ONBOARDING_STEPS.reduce((total, step) => {
                  const minutes = parseInt(step.estimatedTime) || 0
                  return total + minutes
                }, 0)}
              </div>
              <div className="text-sm text-gray-600">Minutes Invested</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Certification */}
      {allStepsComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-blue-600" />
              <span>Final Certification</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Employee Certification Statement</h3>
                <p className="text-blue-800 text-sm">
                  By signing below, I certify that I have completed all required onboarding steps, 
                  reviewed all provided information, and understand my responsibilities as an employee. 
                  I acknowledge that all information provided is accurate and complete to the best of my knowledge.
                </p>
              </div>
              
              <DigitalSignatureCapture
                onSignature={handleFinalSignature}
                title="Employee Onboarding Certification"
                description="Your digital signature confirms completion of the onboarding process."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Celebration */}
      {onboardingComplete && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <PartyPopper className="h-12 w-12 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold text-green-900">Congratulations!</h2>
              <p className="text-green-800">
                You have successfully completed the employee onboarding process. 
                Welcome to the team!
              </p>
              <Button 
                onClick={handleCompleteOnboarding}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                Complete Onboarding
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps Information */}
      {onboardingComplete && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800">
            <ul className="space-y-2 text-sm">
              <li>• Your manager will review and approve your onboarding documentation</li>
              <li>• You'll receive your employee handbook and training schedule</li>
              <li>• Your first day orientation will cover job-specific training</li>
              <li>• HR will contact you with any additional requirements</li>
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-sm text-gray-500">
        <p>Estimated time: 3-5 minutes</p>
      </div>
    </div>
  )
}