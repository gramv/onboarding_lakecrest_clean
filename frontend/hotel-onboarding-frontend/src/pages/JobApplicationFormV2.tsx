import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Phone,
  MapPin,
  Info,
  Building2,
  Send,
  PartyPopper,
  Globe,
  Loader2
} from 'lucide-react'
import api from '@/services/api'

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
  // Restore main steps to original order, but place Review & Consent right before Voluntary Self-Identification
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
    id: 'review-consent',
    title: t('jobApplication.steps.reviewConsent.title'),
    description: t('jobApplication.steps.reviewConsent.description'),
    component: ReviewConsentStep,
    required: true
  },
  {
    id: 'voluntary-identification',
    title: t('jobApplication.steps.voluntaryIdentification.title'),
    description: t('jobApplication.steps.voluntaryIdentification.description'),
    component: VoluntarySelfIdentificationStep,
    required: false
  }
]

export default function JobApplicationFormV2() {
  const { propertyId } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, any>>({})
  const [stepCompletionStatus, setStepCompletionStatus] = useState<Record<string, boolean>>({})
  const [showEqualOpportunityModal, setShowEqualOpportunityModal] = useState(false)
  const [languageSelected, setLanguageSelected] = useState(false)
  
  const steps = useMemo(() => getSteps(t), [t])
  
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
    
    // Voluntary Self-Identification (detailed flags)
    decline_to_identify: false,
    race_hispanic_latino: false,
    race_white: false,
    race_black_african_american: false,
    race_native_hawaiian_pacific_islander: false,
    race_asian: false,
    race_american_indian_alaska_native: false,
    race_two_or_more: false,
    referral_source_voluntary: '',
    
    // Consent
    physical_requirements_acknowledged: false,
    background_check_consent: false,
    information_accuracy_certified: false,
    at_will_employment_acknowledged: false
  })

  // Check for saved language preference on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('preferred-language')
    if (savedLang) {
      i18n.changeLanguage(savedLang)
      setLanguageSelected(true)
    }
  }, [i18n])

  // Load property information
  useEffect(() => {
    fetchProperty()
    loadDraftApplication()
  }, [propertyId])
  
  // Auto-scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentStep])
  
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
      const response = await api.properties.getInfo(propertyId)
      setPropertyInfo(response.data)
      // Set property name in form data for use in other components
      if (response.data?.property?.name) {
        setFormData(prev => ({
          ...prev,
          property_name: response.data.property.name
        }))
      }
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

  const saveDraft = () => {
    // Save current application state as draft to localStorage
    const draftKey = `job-application-draft-${propertyId}`
    const draftData = {
      formData,
      currentStep,
      stepCompletionStatus,
      savedAt: new Date().toISOString()
    }
    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData))
    } catch (e) {
      console.error('Failed to save draft:', e)
    }
  }

  const updateFormData = (stepData: any) => {
    setFormData(prev => ({ ...prev, ...stepData }))
  }

  const markStepComplete = useCallback((stepId: string, isComplete: boolean = true) => {
    setStepCompletionStatus(prev => ({ ...prev, [stepId]: isComplete }))
  }, [])

  const handleStepComplete = useCallback((isComplete: boolean) => {
    markStepComplete(steps[currentStep].id, isComplete)
  }, [currentStep, markStepComplete])

  const validateCurrentStep = (): boolean => {
    const step = steps[currentStep]
    // Step-specific validation will be handled by each component
    return true
  }

  const scrollToFirstError = () => {
    setTimeout(() => {
      // Try multiple selectors for better coverage
      const errorElement = document.querySelector(
        '.border-red-500, ' +
        '[aria-invalid="true"], ' +
        '.text-red-600' // Also look for error messages
      )
      
      if (errorElement) {
        // Scroll with offset for better visibility
        const yOffset = -100 // Leave 100px space at top
        const y = errorElement.getBoundingClientRect().top + window.pageYOffset + yOffset
        
        window.scrollTo({ top: y, behavior: 'smooth' })
        
        // Try to focus the input
        const input = errorElement.tagName === 'INPUT' || 
                     errorElement.tagName === 'SELECT' || 
                     errorElement.tagName === 'TEXTAREA' 
                     ? errorElement 
                     : errorElement.querySelector('input, select, textarea')
        
        if (input && input instanceof HTMLElement) {
          setTimeout(() => input.focus(), 300)
        }
      }
    }, 150) // Slightly longer delay to ensure all fields update
  }

  const handleNext = () => {
    // Clear any previous errors
    setError('')
    
    // Check if current step is complete
    const currentStepId = steps[currentStep].id
    const isStepComplete = stepCompletionStatus[currentStepId]
    
    if (!isStepComplete && steps[currentStep].required) {
      // Force validation to show all errors
      setValidationErrors(prev => ({
        ...prev,
        [currentStepId]: { _forceValidation: Date.now() } // Use timestamp to trigger re-render
      }))
      
      // Show error and prevent navigation
      setError(`Please complete all required fields in "${steps[currentStep].title}" before proceeding.`)
      scrollToFirstError()
      return // Block navigation if step is incomplete
    }
    
    // Allow navigation only if step is complete or not required
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
        // Force validation on current step
        const currentStepId = steps[currentStep].id
        setValidationErrors(prev => ({
          ...prev,
          [currentStepId]: { _forceValidation: Date.now() }
        }))
        
        setError(`Cannot skip ahead. Please complete the following required steps first: ${incompleteStepsBefore.join(', ')}`)
        scrollToFirstError()
        return // Block navigation if there are incomplete required steps
      }
    }
    
    // Allow navigation only if going backward or all required steps are complete
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

      // Normalize and validate phone numbers to satisfy backend (10 digits required)
      const digits = (s: string | undefined) => (s || '').replace(/\D/g, '')
      const primaryPhoneDigits = digits(formData.phone)
      const referencePhoneDigits = digits(formData.references?.[0]?.phone)

      if (primaryPhoneDigits.length !== 10) {
        setError('Phone number must be 10 digits')
        setLoading(false)
        return
      }
      if (formData.references?.[0]?.phone && referencePhoneDigits.length !== 10) {
        setError('Reference phone must be 10 digits')
        setLoading(false)
        return
      }

      // Submit the application (align keys to backend schema where needed)
      const payload = {
        // Track the language used for submission
        application_language: i18n.language,

        // Personal Information - Complete
        first_name: formData.first_name,
        middle_initial: formData.middle_name ? formData.middle_name[0] : undefined,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone?.trim(),
        phone_is_cell: true,  // Default to cell phone
        phone_is_home: false,
        secondary_phone: formData.alternate_phone || null,  // Map from alternate_phone field
        secondary_phone_is_cell: formData.alternate_phone_is_cell || false,
        secondary_phone_is_home: formData.alternate_phone_is_home || false,
        address: formData.address,
        apartment_unit: formData.apartment_unit || null,  // Send actual data from form
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        
        // Position Information
        department: formData.department,
        position: formData.position,
        salary_desired: formData.desired_salary || null,  // Map frontend field to backend field name
        
        // Work Authorization & Legal - Use language-agnostic values
        work_authorized: formData.work_authorized === 'yes' || formData.work_authorized === 'sí' ? 'yes' : 'no',
        sponsorship_required: formData.sponsorship_required === 'yes' || formData.sponsorship_required === 'sí' ? 'yes' : 'no',
        age_verification: formData.age_verification !== false,  // Default to true if not explicitly false
        conviction_record: {
          has_conviction: formData.has_criminal_record === 'yes',
          explanation: formData.criminal_record_explanation || null
        },
        
        // Availability - Include ALL collected fields
        start_date: formData.start_date || new Date().toISOString().slice(0,10),
        shift_preference: formData.shift_preference === 'any' ? 'flexible' : (formData.shift_preference || 'flexible'),
        employment_type: formData.employment_type || 'full_time',
        seasonal_start_date: null,  // For seasonal positions
        seasonal_end_date: null,     // For seasonal positions
        
        // Previous hotel employment
        previous_hotel_employment: formData.previous_hotel_employment === 'yes' || formData.previous_hotel_employment === true,
        previous_hotel_details: formData.previous_hotel_details || null,
        
        // How did you hear about us?
        how_heard: formData.how_heard || 'walk_in',
        how_heard_detailed: formData.how_heard_detailed || null,
        
        // References - Send first reference (backend expects single reference)
        personal_reference: formData.references?.[0] ? {
          name: formData.references[0].name || 'N/A',
          years_known: formData.references[0].years_known || '0',
          phone: (formData.references[0].phone || '0000000000').trim(),
          relationship: formData.references[0].relationship || 'N/A'
        } : { name: 'N/A', years_known: '0', phone: '0000000000', relationship: 'N/A' },
        
        // Military Service - Send actual data from form
        military_service: formData.has_no_military_service ? {} : {
          branch: formData.military_branch || null,
          from_to: formData.military_from_to || null,
          rank_duties: formData.military_rank_duties || null,
          discharge_date: formData.military_discharge_date || null
        },
        
        // Education History - Include both high school and college
        education_history: [
          // High School
          { 
            school_name: formData.high_school_info?.name || 'N/A', 
            location: [formData.high_school_info?.city, formData.high_school_info?.state].filter(Boolean).join(', ') || '',
            years_attended: formData.high_school_info?.graduation_year || '',
            graduated: formData.high_school_info?.graduated === 'yes' || formData.high_school_info?.graduated === true,
            degree_received: null
          },
          // College (if provided)
          ...(formData.college_info?.name ? [{
            school_name: formData.college_info.name,
            location: [formData.college_info.city, formData.college_info.state].filter(Boolean).join(', ') || '',
            years_attended: formData.college_info.graduation_year || '',
            graduated: true,
            degree_received: formData.college_info.degree || null
          }] : [])
        ].filter((edu, index) => edu.school_name !== 'N/A' || index === 0),  // Keep at least one entry
        
        // Employment History - Send ALL employment history
        employment_history: (formData.employment_history && formData.employment_history.length > 0
          ? formData.employment_history.map((e: any) => ({
              company_name: e.employer_name || 'N/A',
              phone: e.supervisor_phone || '0000000000',
              address: '',
              supervisor: e.supervisor_name || 'N/A',
              job_title: e.job_title || 'N/A',
              starting_salary: '',
              ending_salary: '',
              // Format dates as YYYY-MM or leave empty
              from_date: e.start_date ? e.start_date.slice(0, 7) : '',
              to_date: e.is_current ? 'Present' : (e.end_date ? e.end_date.slice(0, 7) : ''),
              reason_for_leaving: e.reason_for_leaving || '',
              may_contact: !!e.may_contact
            }))
          : [{
              company_name: 'N/A',
              phone: '0000000000',
              address: '',
              supervisor: 'N/A',
              job_title: 'N/A',
              starting_salary: '',
              ending_salary: '',
              from_date: '',
              to_date: '',
              reason_for_leaving: '',
              may_contact: false
            }]),
        
        // Skills, Languages, and Certifications - Combine all
        skills_languages_certifications: [
          ...(formData.skills || []),
          ...(formData.languages || []),
          ...(formData.certifications || [])
        ].filter(Boolean).join(', ') || null,
        
        // Voluntary Self-Identification - Include ALL collected data
        voluntary_self_identification: {
          gender: formData.gender || null,
          ethnicity: formData.ethnicity || null,
          veteran_status: formData.veteran_status || null,
          disability_status: formData.disability_status || null,
          // Include detailed race/ethnicity flags
          decline_to_identify: formData.decline_to_identify || false,
          race_hispanic_latino: formData.race_hispanic_latino || false,
          race_white: formData.race_white || false,
          race_black_african_american: formData.race_black_african_american || false,
          race_native_hawaiian_pacific_islander: formData.race_native_hawaiian_pacific_islander || false,
          race_asian: formData.race_asian || false,
          race_american_indian_alaska_native: formData.race_american_indian_alaska_native || false,
          race_two_or_more: formData.race_two_or_more || false
        },
        
        // Experience
        experience_years: formData.experience_years || '0-1',
        hotel_experience: formData.hotel_experience || 'no',
        
        // Additional Information
        additional_comments: formData.additional_comments || ''
      }

      await api.applications.submitToProperty(propertyId, payload)
      
      // Clear draft on successful submission
      localStorage.removeItem(`job-application-draft-${propertyId}`)
      
      setSubmitted(true)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      console.error('Application submit error:', err?.response?.data || err)
      if (err.response?.status === 400 && typeof detail === 'string' && detail.includes('Duplicate')) {
        setError('You have already submitted an application for this property and position.')
      } else if (Array.isArray(detail)) {
        // Pydantic validation errors
        const first = detail[0]
        const loc = Array.isArray(first?.loc) ? first.loc.join(' > ') : ''
        setError(`Please correct: ${first?.msg || 'Invalid field value'} ${loc ? `(${loc})` : ''}`)
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to submit application. Please review required fields and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = () => {
    const completedSteps = Object.values(stepCompletionStatus).filter(status => status).length
    return (completedSteps / steps.length) * 100
  }

  // Show language selection screen first
  if (!languageSelected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold mb-2">
              Select Your Language
              <br />
              <span className="text-xl text-gray-600">Seleccione su idioma</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => {
                i18n.changeLanguage('en')
                localStorage.setItem('preferred-language', 'en')
                setLanguageSelected(true)
                setShowEqualOpportunityModal(true)
              }}
              className="w-full h-14 text-lg"
              variant="outline"
            >
              <span className="text-2xl mr-3">🇺🇸</span>
              English
            </Button>
            <Button
              onClick={() => {
                i18n.changeLanguage('es')
                localStorage.setItem('preferred-language', 'es')
                setLanguageSelected(true)
                setShowEqualOpportunityModal(true)
              }}
              className="w-full h-14 text-lg"
              variant="outline"
            >
              <span className="text-2xl mr-3">🇪🇸</span>
              Español
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
            {/* Minimal Language Toggle */}
            <button
              onClick={() => {
                const newLang = i18n.language === 'en' ? 'es' : 'en'
                i18n.changeLanguage(newLang)
                localStorage.setItem('preferred-language', newLang)
              }}
              className="absolute top-2 right-2 text-xs text-gray-500 hover:text-gray-700 underline"
              aria-label="Switch language"
            >
              {i18n.language === 'en' ? 'ES' : 'EN'}
            </button>
            
            <CardTitle className="text-2xl font-bold">{t('jobApplication.title')}</CardTitle>
            <CardDescription>
              {propertyInfo ? (
                <div className="space-y-2">
                  <p className="text-lg">{propertyInfo?.property?.name}</p>
                  <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {propertyInfo?.property?.city}, {propertyInfo?.property?.state}
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      {propertyInfo?.property?.phone}
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
              onComplete={handleStepComplete}
            />

          </CardContent>
        </Card>

        {/* Mobile-Optimized Sticky Navigation */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t shadow-lg mt-8 -mx-4 sm:mx-0 sm:relative sm:bg-transparent sm:border-0 sm:shadow-none">
          <div className="flex gap-3 p-4 sm:p-0 sm:pt-6">
            {/* Previous Button */}
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1 sm:flex-initial sm:min-w-[140px] min-h-[48px] font-medium
                         hover:bg-gray-50 hover:text-gray-900 active:scale-95
                         transition-all duration-150 shadow-sm"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">{t('common.previous')}</span>
              <span className="sm:hidden">{t('common.back')}</span>
            </Button>

            {/* Submit or Next Button */}
            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 sm:flex-initial sm:min-w-[140px] min-h-[48px] font-medium
                          bg-green-600 hover:bg-green-700 active:bg-green-800 active:scale-95
                          text-white shadow-md transition-all duration-150"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    <span>{t('common.loading')}</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Send className="w-5 h-5 mr-2" />
                    {t('common.submit')}
                  </span>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="flex-1 sm:flex-initial sm:min-w-[140px] min-h-[48px] font-medium
                          bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-95
                          text-white shadow-md transition-all duration-150"
              >
                <span>{currentStep === 0 ? t('common.getStarted') : t('common.continue')}</span>
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>

          {/* Mobile Progress Indicator */}
          <div className="sm:hidden px-4 pb-2">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(calculateProgress())}% Complete</span>
            </div>
            <Progress value={calculateProgress()} className="h-1 mt-1" />
          </div>
        </div>
        
        {/* Legal Disclaimer - Only show on Additional Information step */}
        {steps[currentStep].id === 'additional-info' && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 flex items-start">
              <sup className="text-blue-600 mr-1 font-semibold">†</sup>
              <span className="italic">
                {t('jobApplication.steps.additionalInfo.conviction.doNotList')}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Equal Opportunity Statement Modal */}
      <Dialog open={showEqualOpportunityModal} onOpenChange={setShowEqualOpportunityModal}>
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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