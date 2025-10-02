import React, { useState, useEffect, useCallback, useRef } from 'react'
import PersonalInformationForm from '@/components/PersonalInformationForm'
import EmergencyContactsForm from '@/components/EmergencyContactsForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Breadcrumb, createBreadcrumbItems } from '@/components/ui/breadcrumb'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, User, Phone, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { useAutoSave } from '@/hooks/useAutoSave'
import { scrollToTop } from '@/utils/scrollHelpers'

export default function PersonalInfoStep({
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
  const tabOverrideRef = useRef(false)
  
  // Combine form data for saving
  const formData = {
    personalInfo: personalInfoData,
    emergencyContacts: emergencyContactsData,
    activeTab
  }

  // For this step, we rely on the form components' own validation
  // since they handle it internally
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  // Auto-save hook
  const { saveStatus } = useAutoSave(formData, {
    onSave: async (data) => {
      // Save to both cloud and local storage
      await saveProgress(currentStep.id, data)
      // Store in session storage as backup
      sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(data))
    }
  })

  // Load existing data on mount
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        let dataToUse = null
        
        // Try to load from session storage first
        const savedData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
        console.log('PersonalInfoStep - Loading saved data:', savedData)
        if (savedData) {
          try {
            dataToUse = JSON.parse(savedData)
            console.log('PersonalInfoStep - Parsed data from session:', dataToUse)
          } catch (e) {
            console.error('Failed to parse session data:', e)
          }
        }
        
        // ALWAYS check cloud data if we have an employee ID (not just when no local data)
        if (employee?.id && !employee.id.startsWith('demo-')) {
          try {
            const apiUrl = import.meta.env.VITE_API_URL || '/api'
            const response = await fetch(`${apiUrl}/api/onboarding/${employee.id}/personal-info`)
            if (response.ok) {
              const result = await response.json()
              if (result.success && result.data && Object.keys(result.data).length > 0) {
                console.log('PersonalInfoStep - Loaded data from cloud:', result.data)
                
                // Use cloud data if it exists and has content
                // Check if cloud data has actual values (not just empty structure)
                const cloudHasData = result.data.personalInfo && 
                  Object.values(result.data.personalInfo).some(v => v && v !== '')
                
                if (cloudHasData || !dataToUse) {
                  // Use cloud data if it has content or if we have no local data
                  dataToUse = result.data
                  // Update session storage with cloud data
                  sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(result.data))
                }
              }
            }
          } catch (error) {
            console.error('Failed to load personal info from cloud:', error)
          }
        }
        
        // Now apply whatever data we decided to use
        if (dataToUse) {
          // Handle both nested structure (expected) and flat structure
          if (dataToUse.personalInfo) {
            setPersonalInfoData(dataToUse.personalInfo)
          } else if (dataToUse.firstName || dataToUse.lastName || dataToUse.phone) {
            setPersonalInfoData(dataToUse)
          }
          
          if (dataToUse.emergencyContacts) {
            setEmergencyContactsData(dataToUse.emergencyContacts)
          } else if (dataToUse.primaryContact) {
            setEmergencyContactsData({
              primaryContact: dataToUse.primaryContact,
              secondaryContact: dataToUse.secondaryContact || {},
              medicalInfo: dataToUse.medicalInfo || '',
              allergies: dataToUse.allergies || '',
              medications: dataToUse.medications || '',
              medicalConditions: dataToUse.medicalConditions || ''
            })
          }
          
          if (dataToUse.activeTab && !tabOverrideRef.current) {
            setActiveTab(dataToUse.activeTab)
          }
        }
        
        // Check if step is already completed
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
  }, [currentStep.id, progress.completedSteps, employee])

  // Check completion status
  const isStepComplete = personalInfoValid && emergencyContactsValid

  // Debug logging for step completion
  useEffect(() => {
    console.log('📋 PersonalInfoStep: Validation status:', {
      personalInfoValid,
      emergencyContactsValid,
      isStepComplete,
      isAlreadyCompleted: progress.completedSteps.includes(currentStep.id)
    })
  }, [personalInfoValid, emergencyContactsValid, isStepComplete, progress.completedSteps, currentStep.id])

  // Auto-mark complete when both forms are valid
  useEffect(() => {
    if (isStepComplete && !progress.completedSteps.includes(currentStep.id)) {
      console.log('🎯 PersonalInfoStep: Auto-completing step...')
      markStepComplete(currentStep.id, formData)
    }
  }, [isStepComplete, currentStep.id, formData, markStepComplete, progress.completedSteps])

  const handlePersonalInfoSave = useCallback(async (data: any) => {
    console.log('Saving personal info:', data)
    setPersonalInfoData(data)
    // Immediately save to session storage and backend
    const updatedFormData = {
      personalInfo: data,
      emergencyContacts: emergencyContactsData,
      activeTab
    }
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(updatedFormData))
    // Also save to backend (this will trigger sync status updates in the portal)
    await saveProgress(currentStep.id, updatedFormData)
  }, [emergencyContactsData, activeTab, currentStep.id, saveProgress])

  const handleEmergencyContactsSave = useCallback(async (data: any) => {
    console.log('Saving emergency contacts:', data)
    setEmergencyContactsData(data)
    // Immediately save to session storage and backend
    const updatedFormData = {
      personalInfo: personalInfoData,
      emergencyContacts: data,
      activeTab
    }
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(updatedFormData))
    // Also save to backend (this will trigger sync status updates in the portal)
    await saveProgress(currentStep.id, updatedFormData)
  }, [personalInfoData, activeTab, currentStep.id, saveProgress])

  const handlePersonalInfoValidationChange = useCallback((isValid: boolean) => {
    setPersonalInfoValid(isValid)
  }, [])

  const handleEmergencyContactsValidationChange = useCallback((isValid: boolean) => {
    setEmergencyContactsValid(isValid)
  }, [])
 
  const unlocksEmergencyTab = personalInfoValid || progress.completedSteps.includes(currentStep.id)
  const allSectionsComplete = personalInfoValid && emergencyContactsValid
  // Enhanced tab change handler
  const handleTabChange = useCallback((newTab: string) => {
    if (newTab === 'emergency' && !unlocksEmergencyTab) {
      return
    }
    tabOverrideRef.current = true
    setActiveTab(newTab)
    scrollToTop()
    // Save tab state
    const updatedFormData = {
      personalInfo: personalInfoData,
      emergencyContacts: emergencyContactsData,
      activeTab: newTab
    }
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(updatedFormData))
  }, [personalInfoData, emergencyContactsData, currentStep.id, unlocksEmergencyTab])

  const translations = {
    en: {
      title: 'Personal Information',
      description: 'Please provide your personal information and emergency contacts. This information will be kept confidential.',
      personalTab: 'Personal Details',
      emergencyTab: 'Emergency Contacts',
      sectionProgress: 'Section Progress',
      complete: 'Complete',
      required: 'Required',
      completionMessage: 'Personal information section completed successfully.',
      continueToEmergency: 'Continue to Emergency Contacts',
      backToPersonal: '← Back to Personal Details',
      fillPersonalFirst: 'Please complete Personal Details first'
    },
    es: {
      title: 'Información Personal',
      description: 'Por favor proporcione su información personal y contactos de emergencia. Esta información se mantendrá confidencial.',
      personalTab: 'Detalles Personales',
      emergencyTab: 'Contactos de Emergencia',
      sectionProgress: 'Progreso de la Sección',
      complete: 'Completo',
      required: 'Requerido',
      completionMessage: 'Sección de información personal completada exitosamente.',
      continueToEmergency: 'Continuar a Contactos de Emergencia',
      backToPersonal: '← Volver a Detalles Personales',
      fillPersonalFirst: 'Por favor complete primero los Detalles Personales'
    }
  }

  const t = translations[language]

  // Tab configuration similar to I9CompleteStep
  const tabs = [
    {
      id: 'personal',
      label: t.personalTab,
      icon: <User className="h-4 w-4" />,
      disabled: false,
      complete: personalInfoValid
    },
    {
      id: 'emergency',
      label: t.emergencyTab,
      icon: <Phone className="h-4 w-4" />,
      disabled: !unlocksEmergencyTab,
      complete: emergencyContactsValid
    }
  ]

  return (
    <StepContainer
      errors={errors}
      fieldErrors={fieldErrors}
      saveStatus={saveStatus}
      canProceed={isStepComplete}
    >
      <StepContentWrapper>
        <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb 
          items={createBreadcrumbItems(['Home', 'Onboarding', 'Personal Information'])}
          className="mb-4"
        />
        
        {/* Step Header */}
        <div className="text-center px-4">
          <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
            <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">{t.description}</p>
        </div>

        {/* Section Summary */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 px-2 sm:px-0">
          {[
            {
              id: 'personal',
              label: t.personalTab,
              complete: personalInfoValid,
              description: personalInfoValid
                ? 'Personal details confirmed'
                : t.fillPersonalFirst
            },
            {
              id: 'emergency',
              label: t.emergencyTab,
              complete: emergencyContactsValid,
              description: emergencyContactsValid
                ? 'Emergency contacts ready'
                : 'Provide at least one emergency contact'
            }
          ].map(section => (
            <div
              key={section.id}
              className={`flex items-start gap-2 sm:gap-3 rounded-lg border p-3 sm:p-4 ${
                section.complete ? 'border-green-200 bg-green-50' : 'border-blue-100 bg-blue-50'
              }`}
            >
              <div className="mt-0.5 sm:mt-1 flex-shrink-0">
                {section.complete ? (
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                ) : (
                  <Badge variant="outline" className="text-[10px] sm:text-[11px] px-1.5 py-0.5">
                    {t.required}
                  </Badge>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{section.label}</p>
                <p className="text-[11px] sm:text-xs text-gray-600 leading-snug mt-0.5">{section.description}</p>
              </div>
            </div>
          ))}
        </div>


        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 sticky top-0 z-10 bg-white shadow-sm">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={tab.disabled}
                className="flex items-center justify-center space-x-1 sm:space-x-2 min-h-[44px] text-xs sm:text-sm"
              >
                {tab.icon && React.cloneElement(tab.icon, { className: 'h-4 w-4 flex-shrink-0' })}
                <span className="truncate">{tab.label}</span>
                {tab.complete && <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 ml-0.5 sm:ml-1 flex-shrink-0" />}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
            {dataLoaded && (
              <>
                <PersonalInformationForm
                  key="personal-form"
                  initialData={personalInfoData}
                  language={language}
                  onSave={handlePersonalInfoSave}
                  onValidationChange={handlePersonalInfoValidationChange}
                  useMainNavigation
                />

                {/* Go to Emergency Contacts Button */}
                {personalInfoValid && (
                  <div className="flex justify-center px-4 sm:px-0">
                    <Button
                      onClick={() => handleTabChange('emergency')}
                      className="w-full sm:w-auto min-h-[48px] px-6 text-sm sm:text-base"
                      variant="default"
                    >
                      {t.continueToEmergency}
                      <ArrowRight className="ml-2 h-4 w-4 flex-shrink-0" />
                    </Button>
                  </div>
                )}

              </>
            )}
          </TabsContent>

          <TabsContent value="emergency" className="space-y-4 sm:space-y-6">
            {dataLoaded && (
              <>
                {/* Back to Personal Details Button */}
                <div className="flex justify-start px-4 sm:px-0">
                  <Button
                    onClick={() => handleTabChange('personal')}
                    className="min-h-[48px] text-sm sm:text-base"
                    variant="outline"
                  >
                    {t.backToPersonal}
                  </Button>
                </div>

                <EmergencyContactsForm
                  key="emergency-form"
                  initialData={emergencyContactsData}
                  language={language}
                  onSave={handleEmergencyContactsSave}
                  onValidationChange={handleEmergencyContactsValidationChange}
                  useMainNavigation
                />
              </>
            )}
          </TabsContent>
        </Tabs>


        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}