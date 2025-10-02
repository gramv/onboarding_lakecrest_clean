import React, { useState, useEffect, useCallback } from 'react'
import PersonalInformationForm from '@/components/PersonalInformationForm'
import EmergencyContactsForm from '@/components/EmergencyContactsForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, User, Phone, AlertCircle } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { useAutoSave } from '@/hooks/useAutoSave'
import { scrollToTop } from '@/utils/scrollHelpers'

// NEW IMPORTS FOR ENHANCED UI
import { StepIndicator, StepIndicatorMini } from '@/components/ui/step-indicator'
import { FormSection } from '@/components/ui/form-section'
import { ValidationSummary } from '@/components/ui/validation-summary'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Badge } from '@/components/ui/badge'

export default function PersonalInfoStepEnhanced({
  currentStep,
  progress,
  markStepComplete,
  saveProgress,
  language = 'en',
  employee,
  property
}: StepProps) {
  
  const [personalInfoData, setPersonalInfoData] = useState<any>({})
  const [emergencyContactsData, setEmergencyContactsData] = useState<any>({})
  const [personalInfoValid, setPersonalInfoValid] = useState(false)
  const [emergencyContactsValid, setEmergencyContactsValid] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  const [dataLoaded, setDataLoaded] = useState(false)
  const [validationMessages, setValidationMessages] = useState<any[]>([])
  
  // Calculate overall progress
  const progressPercentage = 
    (personalInfoValid ? 50 : 0) + 
    (emergencyContactsValid ? 50 : 0)
  
  // Define sub-steps for the StepIndicator
  const subSteps = [
    {
      id: 'personal',
      title: language === 'es' ? 'Información Personal' : 'Personal Information',
      description: language === 'es' ? 'Datos básicos' : 'Basic details',
      status: personalInfoValid ? 'completed' : activeTab === 'personal' ? 'current' : 'pending'
    },
    {
      id: 'emergency',
      title: language === 'es' ? 'Contactos de Emergencia' : 'Emergency Contacts',
      description: language === 'es' ? 'En caso de emergencia' : 'In case of emergency',
      status: emergencyContactsValid ? 'completed' : activeTab === 'emergency' ? 'current' : 'pending'
    }
  ] as const
  
  // Combine form data for saving
  const formData = {
    personalInfo: personalInfoData,
    emergencyContacts: emergencyContactsData,
    activeTab
  }

  // Auto-save hook
  const { saveStatus } = useAutoSave(formData, {
    onSave: async (data) => {
      await saveProgress(currentStep.id, data)
      sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(data))
    }
  })

  // Load existing data on mount
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const savedData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
        if (savedData) {
          const parsed = JSON.parse(savedData)
          if (parsed.personalInfo) {
            setPersonalInfoData(parsed.personalInfo)
          }
          if (parsed.emergencyContacts) {
            setEmergencyContactsData(parsed.emergencyContacts)
          }
          if (parsed.activeTab) {
            setActiveTab(parsed.activeTab)
          }
        }
        
        if (progress.completedSteps.includes(currentStep.id)) {
          setPersonalInfoValid(true)
          setEmergencyContactsValid(true)
        }
        
        setDataLoaded(true)
      } catch (error) {
        console.error('Failed to load existing data:', error)
        setDataLoaded(true)
      }
    }
    loadExistingData()
  }, [currentStep.id, progress.completedSteps])

  // Check completion status
  const isStepComplete = personalInfoValid && emergencyContactsValid

  // Auto-mark complete when both forms are valid
  useEffect(() => {
    if (isStepComplete && !progress.completedSteps.includes(currentStep.id)) {
      markStepComplete(currentStep.id, formData)
    }
  }, [isStepComplete, currentStep.id, formData, markStepComplete, progress.completedSteps])

  const handlePersonalInfoSave = useCallback((data: any) => {
    setPersonalInfoData(data)
    const updatedFormData = {
      personalInfo: data,
      emergencyContacts: emergencyContactsData,
      activeTab
    }
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(updatedFormData))
  }, [emergencyContactsData, activeTab, currentStep.id])

  const handleEmergencyContactsSave = useCallback((data: any) => {
    setEmergencyContactsData(data)
    const updatedFormData = {
      personalInfo: personalInfoData,
      emergencyContacts: data,
      activeTab
    }
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(updatedFormData))
  }, [personalInfoData, activeTab, currentStep.id])

  const handlePersonalInfoValidationChange = useCallback((isValid: boolean, errors?: Record<string, string>) => {
    setPersonalInfoValid(isValid)
    
    // Update validation messages for display
    if (errors && Object.keys(errors).length > 0) {
      const messages = Object.entries(errors).map(([field, message]) => ({
        field,
        message,
        type: 'error' as const
      }))
      setValidationMessages(prev => {
        const filtered = prev.filter(m => !Object.keys(errors).includes(m.field))
        return [...filtered, ...messages]
      })
    } else if (activeTab === 'personal') {
      setValidationMessages(prev => prev.filter(m => m.field !== 'personal'))
    }
  }, [activeTab])

  const handleEmergencyContactsValidationChange = useCallback((isValid: boolean) => {
    setEmergencyContactsValid(isValid)
  }, [])

  const handlePersonalDetailsContinue = useCallback(() => {
    if (personalInfoValid) {
      setActiveTab('emergency')
      scrollToTop()
      const updatedFormData = {
        personalInfo: personalInfoData,
        emergencyContacts: emergencyContactsData,
        activeTab: 'emergency'
      }
      sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(updatedFormData))
    }
  }, [personalInfoValid, personalInfoData, emergencyContactsData, currentStep.id])

  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab)
    scrollToTop()
    const updatedFormData = {
      personalInfo: personalInfoData,
      emergencyContacts: emergencyContactsData,
      activeTab: newTab
    }
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(updatedFormData))
  }, [personalInfoData, emergencyContactsData, currentStep.id])

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'step_complete': 'Step Complete',
        'all_sections_completed': 'All sections have been completed successfully.',
        'personal_details': 'Personal Details',
        'emergency_contacts': 'Emergency Contacts',
        'save_status': 'Auto-save enabled',
        'progress': 'Progress'
      },
      es: {
        'step_complete': 'Paso Completado',
        'all_sections_completed': 'Todas las secciones han sido completadas exitosamente.',
        'personal_details': 'Datos Personales',
        'emergency_contacts': 'Contactos de Emergencia',
        'save_status': 'Guardado automático habilitado',
        'progress': 'Progreso'
      }
    }
    return translations[language][key] || key
  }

  if (!dataLoaded) {
    return <div>Loading...</div>
  }

  return (
    <StepContainer currentStep={currentStep} language={language}>
      <div className="space-y-6">
        {/* Enhanced Progress Section */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('progress')}</h3>
            {saveStatus === 'saving' && (
              <Badge variant="secondary" className="animate-pulse">
                {t('save_status')}
              </Badge>
            )}
          </div>
          
          {/* Visual Step Indicator */}
          <StepIndicator 
            steps={subSteps} 
            orientation="horizontal"
            size="md"
            className="mb-4"
          />
          
          {/* Progress Bar */}
          <ProgressBar
            value={progressPercentage}
            label={`${progressPercentage}% Complete`}
            showPercentage
            variant={progressPercentage === 100 ? 'success' : 'default'}
            animated
            striped={progressPercentage > 0 && progressPercentage < 100}
          />
        </div>

        {/* Validation Summary */}
        {validationMessages.length > 0 && activeTab === 'personal' && (
          <ValidationSummary
            messages={validationMessages}
            dismissible
            onDismiss={() => setValidationMessages([])}
          />
        )}

        {/* Success Alert */}
        {isStepComplete && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>{t('step_complete')}:</strong> {t('all_sections_completed')}
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger 
              value="personal" 
              className="data-[state=active]:bg-white flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              <span>{t('personal_details')}</span>
              {personalInfoValid && (
                <CheckCircle className="h-4 w-4 text-green-600 ml-1" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="emergency" 
              className="data-[state=active]:bg-white flex items-center gap-2"
              disabled={!personalInfoValid}
            >
              <Phone className="h-4 w-4" />
              <span>{t('emergency_contacts')}</span>
              {emergencyContactsValid && (
                <CheckCircle className="h-4 w-4 text-green-600 ml-1" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-6">
            <FormSection
              title={t('personal_details')}
              description="Please provide your personal information as it appears on your official documents."
              icon={<User className="h-5 w-5" />}
              required
              completed={personalInfoValid}
            >
              <PersonalInformationForm
                initialData={personalInfoData}
                language={language}
                onSave={handlePersonalInfoSave}
                onNext={handlePersonalDetailsContinue}
                onValidationChange={handlePersonalInfoValidationChange}
                useMainNavigation={false}
              />
            </FormSection>
          </TabsContent>

          <TabsContent value="emergency" className="mt-6">
            <FormSection
              title={t('emergency_contacts')}
              description="Please provide at least one emergency contact who we can reach in case of emergency."
              icon={<Phone className="h-5 w-5" />}
              required
              completed={emergencyContactsValid}
            >
              <EmergencyContactsForm
                initialData={emergencyContactsData}
                language={language}
                onSave={handleEmergencyContactsSave}
                onBack={() => handleTabChange('personal')}
                onValidationChange={handleEmergencyContactsValidationChange}
                useMainNavigation={false}
              />
            </FormSection>
          </TabsContent>
        </Tabs>

        {/* Mini Progress Indicator for Mobile */}
        <div className="block sm:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-white rounded-full shadow-lg border p-3">
            <StepIndicatorMini currentStep={personalInfoValid ? (emergencyContactsValid ? 2 : 1) : 0} totalSteps={2} />
          </div>
        </div>
      </div>
    </StepContainer>
  )
}