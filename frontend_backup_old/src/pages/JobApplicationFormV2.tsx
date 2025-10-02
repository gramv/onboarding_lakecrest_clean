import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Phone,
  MapPin,
  Info,
  Building2,
  Send,
  PartyPopper,
  Globe
} from 'lucide-react'
import axios from 'axios'

// Import step components
import PersonalInformationStep from '@/components/job-application/PersonalInformationStep'
import PositionAvailabilityStep from '@/components/job-application/PositionAvailabilityStep'
import EmploymentHistoryStep from '@/components/job-application/EmploymentHistoryStep'
import EducationSkillsStep from '@/components/job-application/EducationSkillsStep'
import AdditionalInformationStep from '@/components/job-application/AdditionalInformationStep'
import VoluntarySelfIdentificationStep from '@/components/job-application/VoluntarySelfIdentificationStep'
import ReviewConsentStep from '@/components/job-application/ReviewConsentStep'

interface Property {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
}

interface PropertyInfo {
  property: Property
  departments_and_positions: Record<string, string[]>
  application_url: string
  is_accepting_applications: boolean
}

interface StepConfig {
  id: string
  title: string
  description: string
  component: React.ComponentType<any>
  required: boolean
}

const getSteps = (t: any): StepConfig[] => [
  {
    id: 'personal-info',
    title: t('jobApplication.steps.personalInfo.title'),
    description: t('jobApplication.steps.personalInfo.description'),
    component: PersonalInformationStep,
    required: true
  },
  {
    id: 'position-availability',
    title: t('jobApplication.steps.positionAvailability.title'),
    description: t('jobApplication.steps.positionAvailability.description'),
    component: PositionAvailabilityStep,
    required: true
  },
  {
    id: 'employment-history',
    title: t('jobApplication.steps.employmentHistory.title'),
    description: t('jobApplication.steps.employmentHistory.description'),
    component: EmploymentHistoryStep,
    required: true
  },
  {
    id: 'education-skills',
    title: t('jobApplication.steps.education.title'),
    description: t('jobApplication.steps.education.description'),
    component: EducationSkillsStep,
    required: true
  },
  {
    id: 'additional-info',
    title: t('jobApplication.steps.additionalInfo.title'),
    description: t('jobApplication.steps.additionalInfo.description'),
    component: AdditionalInformationStep,
    required: true
  },
  {
    id: 'voluntary-identification',
    title: t('jobApplication.steps.voluntaryIdentification.title'),
    description: t('jobApplication.steps.voluntaryIdentification.description'),
    component: VoluntarySelfIdentificationStep,
    required: false
  },
  {
    id: 'review-consent',
    title: t('jobApplication.steps.reviewConsent.title'),
    description: t('jobApplication.steps.reviewConsent.description'),
    component: ReviewConsentStep,
    required: true
  }
]

export default function JobApplicationFormV2() {
  const { propertyId } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, any>>({})
  const [stepCompletionStatus, setStepCompletionStatus] = useState<Record<string, boolean>>({})
  const [showEqualOpportunityModal, setShowEqualOpportunityModal] = useState(false)
  
  const steps = getSteps(t)
  
  // Comprehensive form data state
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    
    // Position & Availability
    department: '',
    position: '',
    desired_salary: '',
    employment_type: '',
    start_date: '',
    shift_preference: '',
    availability_weekends: '',
    availability_holidays: '',
    reliable_transportation: '',
    work_authorized: '',
    sponsorship_required: '',
    
    // Employment History
    employment_history: [] as Array<{
      employer_name: string
      job_title: string
      start_date: string
      end_date: string
      is_current: boolean
      responsibilities: string
      reason_for_leaving: string
      supervisor_name: string
      supervisor_phone: string
      may_contact: boolean
    }>,
    
    // Education & Skills
    education_level: '',
    high_school_info: {
      name: '',
      city: '',
      state: '',
      graduated: '',
      graduation_year: ''
    },
    college_info: {
      name: '',
      city: '',
      state: '',
      degree: '',
      major: '',
      graduation_year: ''
    },
    additional_education: '',
    skills: [] as string[],
    certifications: [] as string[],
    languages: [] as string[],
    
    // Additional Information
    references: [] as Array<{
      name: string
      relationship: string
      phone: string
      email: string
      years_known: string
    }>,
    has_criminal_record: '',
    criminal_record_explanation: '',
    additional_comments: '',
    
    // Voluntary Self-Identification
    gender: '',
    ethnicity: '',
    veteran_status: '',
    disability_status: '',
    
    // Voluntary Self-Identification
    decline_to_identify: false,
    race_hispanic_latino: false,
    race_white: false,
    race_black_african_american: false,
    race_native_hawaiian_pacific_islander: false,
    race_asian: false,
    race_american_indian_alaska_native: false,
    race_two_or_more: false,
    gender: '',
    referral_source_voluntary: '',
    
    // Consent
    physical_requirements_acknowledged: false,
    background_check_consent: false,
    information_accuracy_certified: false,
    at_will_employment_acknowledged: false
  })

  // Load property information
  useEffect(() => {
    fetchProperty()
    loadDraftApplication()
  }, [propertyId])
  
  // Check for equal opportunity acknowledgment after initial load
  useEffect(() => {
    // Small delay to ensure everything is loaded
    const timer = setTimeout(() => {
      const storageKey = `eeo-acknowledged-${propertyId}`
      const hasAcknowledged = sessionStorage.getItem(storageKey)
      
      // Check if there's any saved draft data
      const savedDraft = localStorage.getItem(`job-application-draft-${propertyId}`)
      const hasDraftData = savedDraft && JSON.parse(savedDraft).first_name
      
      // Only show modal if they haven't acknowledged it AND they don't have draft data
      if (!hasAcknowledged && !hasDraftData) {
        setShowEqualOpportunityModal(true)
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [propertyId])

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`/api/properties/${propertyId}/info`)
      setPropertyInfo(response.data)
      // Set property name in form data for use in other components
      setFormData(prev => ({
        ...prev,
        property_name: response.data.property.name
      }))
    } catch (error) {
      console.error('Failed to fetch property:', error)
      setError('Failed to load property information. Please try again.')
    }
  }

  const loadDraftApplication = () => {
    // Load any saved draft from localStorage
    const draftKey = `job-application-draft-${propertyId}`
    const savedDraft = localStorage.getItem(draftKey)
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft)
        setFormData(parsedDraft.formData)
        setCurrentStep(parsedDraft.currentStep || 0)
        setStepCompletionStatus(parsedDraft.stepCompletionStatus || {})
      } catch (e) {
        console.error('Failed to load draft:', e)
      }
    }
  }

  const saveDraft = async () => {
    setSaving(true)
    try {
      const draftKey = `job-application-draft-${propertyId}`
      const draftData = {
        formData,
        currentStep,
        stepCompletionStatus,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(draftKey, JSON.stringify(draftData))
      
      // Show success toast or notification
      setSaving(false)
    } catch (error) {
      console.error('Failed to save draft:', error)
      setSaving(false)
    }
  }

  const updateFormData = (stepData: any) => {
    setFormData(prev => ({ ...prev, ...stepData }))
  }

  const markStepComplete = (stepId: string, isComplete: boolean = true) => {
    setStepCompletionStatus(prev => ({ ...prev, [stepId]: isComplete }))
  }

  const validateCurrentStep = (): boolean => {
    const step = steps[currentStep]
    // Step-specific validation will be handled by each component
    return true
  }

  const handleNext = () => {
    // Clear any previous errors
    setError('')
    
    // Check if current step is complete
    const currentStepId = steps[currentStep].id
    const isStepComplete = stepCompletionStatus[currentStepId]
    
    if (!isStepComplete && steps[currentStep].required) {
      // Show error but don't prevent navigation
      setError(`Please complete all required fields in "${steps[currentStep].title}" before proceeding.`)
    }
    
    // Always allow navigation to next step
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      saveDraft()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepClick = (index: number) => {
    // Clear any previous errors
    setError('')
    
    // Check if there are incomplete required steps before the target step
    if (index > currentStep) {
      const incompleteStepsBefore = steps
        .slice(currentStep, index)
        .filter(step => step.required && !stepCompletionStatus[step.id])
        .map(step => step.title)
      
      if (incompleteStepsBefore.length > 0) {
        setError(`Warning: The following required steps are incomplete: ${incompleteStepsBefore.join(', ')}`)
      }
    }
    
    // Always allow navigation
    setCurrentStep(index)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      // Check for incomplete required steps
      const incompleteSteps = steps
        .filter(step => step.required && !stepCompletionStatus[step.id])
        .map(step => step.title)
      
      if (incompleteSteps.length > 0) {
        // Show which steps are incomplete but still try to submit
        setError(`The following required steps are incomplete: ${incompleteSteps.join(', ')}. The application cannot be submitted until all required steps are completed.`)
        setLoading(false)
        
        // Optionally navigate to the first incomplete step
        const firstIncompleteStepIndex = steps.findIndex(
          step => step.required && !stepCompletionStatus[step.id]
        )
        if (firstIncompleteStepIndex !== -1) {
          setCurrentStep(firstIncompleteStepIndex)
        }
        return
      }

      // Submit the application
      await axios.post(`/api/apply/${propertyId}`, formData)
      
      // Clear draft on successful submission
      localStorage.removeItem(`job-application-draft-${propertyId}`)
      
      setSubmitted(true)
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.detail?.includes('already submitted')) {
        setError('You have already submitted an application for this position.')
      } else {
        setError('Failed to submit application. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = () => {
    const completedSteps = Object.values(stepCompletionStatus).filter(status => status).length
    return (completedSteps / steps.length) * 100
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">{t('jobApplication.messages.submitSuccess')}</CardTitle>
            <CardDescription>
              {t('jobApplication.messages.submitMessage', { propertyName: propertyInfo?.property?.name })}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">{t('jobApplication.messages.nextSteps')}:</p>
              <p className="text-sm text-blue-700 mt-1">
                {t('jobApplication.messages.reviewMessage')}
              </p>
            </div>
            <p className="text-sm text-gray-600">
              {t('jobApplication.messages.confirmationEmail', { email: formData.email })}
            </p>
            <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
              {t('jobApplication.messages.returnHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const CurrentStepComponent = steps[currentStep].component

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader className="text-center relative">
            {/* Language Switcher */}
            <div className="absolute top-4 right-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en')}
                className="flex items-center gap-2 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <Globe className="w-4 h-4" />
                {i18n.language === 'en' ? 'Español' : 'English'}
              </Button>
            </div>
            
            <CardTitle className="text-2xl font-bold">{t('jobApplication.title')}</CardTitle>
            <CardDescription>
              {propertyInfo ? (
                <div className="space-y-2">
                  <p className="text-lg">{propertyInfo.property.name}</p>
                  <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {propertyInfo.property.city}, {propertyInfo.property.state}
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      {propertyInfo.property.phone}
                    </div>
                  </div>
                </div>
              ) : (
                t('common.loading')
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Application Progress</span>
                <span className="text-sm text-gray-600">{Math.round(calculateProgress())}% Complete</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
              
              {/* Step Indicators */}
              <div className="flex justify-between mt-6">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleStepClick(index)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                        stepCompletionStatus[step.id]
                          ? 'bg-green-600 text-white'
                          : index === currentStep
                          ? 'bg-blue-600 text-white'
                          : index < currentStep
                          ? 'bg-gray-300 text-gray-600'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {stepCompletionStatus[step.id] ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="text-xs mt-1 text-center hidden sm:block max-w-[80px]">
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Step */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <CurrentStepComponent
              formData={formData}
              updateFormData={updateFormData}
              validationErrors={validationErrors[steps[currentStep].id] || {}}
              propertyInfo={propertyInfo}
              onComplete={(isComplete: boolean) => markStepComplete(steps[currentStep].id, isComplete)}
            />

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="h-12 px-6 font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t('common.previous')}
              </Button>

              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={saving}
                className="h-12 px-6 font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? t('common.loading') : t('common.saveDraft')}
              </Button>

              {currentStep === steps.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="h-12 px-8 font-medium bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? t('common.loading') : t('common.submit')}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="h-12 px-6 font-medium bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t('common.next')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Citation - Always visible at bottom of page */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 flex items-start">
            <sup className="text-blue-600 mr-1">*</sup>
            {t('jobApplication.steps.additionalInfo.conviction.doNotList')}
          </p>
        </div>
      </div>

      {/* Equal Opportunity Statement Modal */}
      <Dialog open={showEqualOpportunityModal} onOpenChange={setShowEqualOpportunityModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">{t('jobApplication.equalOpportunity.title')}</DialogTitle>
                <DialogDescription className="text-base mt-1">
                  {t('jobApplication.equalOpportunity.subtitle')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm leading-relaxed text-gray-700">
                {t('jobApplication.equalOpportunity.statement')}
              </p>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex space-x-3">
                <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="font-semibold text-gray-800">{t('jobApplication.equalOpportunity.instructions.title')}</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                    <li>{t('jobApplication.equalOpportunity.instructions.item1')}</li>
                    <li>{t('jobApplication.equalOpportunity.instructions.item2')}</li>
                    <li>{t('jobApplication.equalOpportunity.instructions.item3')}</li>
                    <li>{t('jobApplication.equalOpportunity.instructions.item4')}</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-600 pt-2">
              {t('jobApplication.equalOpportunity.acknowledgment')}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                // Mark as acknowledged for this session
                sessionStorage.setItem(`eeo-acknowledged-${propertyId}`, 'true')
                setShowEqualOpportunityModal(false)
              }}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {t('jobApplication.equalOpportunity.proceedButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}