import React, { useState, useEffect, useCallback } from 'react'
import PersonalInformationForm from '@/components/PersonalInformationForm'
import EmergencyContactsForm from '@/components/EmergencyContactsForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Breadcrumb, createBreadcrumbItems } from '@/components/ui/breadcrumb'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { CheckCircle, User, Phone } from 'lucide-react'
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
          
          if (dataToUse.activeTab) {
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

  // Auto-mark complete when both forms are valid
  useEffect(() => {
    if (isStepComplete && !progress.completedSteps.includes(currentStep.id)) {
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

  // Handle Continue button for Personal Details section
  const handlePersonalDetailsContinue = useCallback(() => {
    if (personalInfoValid) {
      setActiveTab('emergency')
      scrollToTop()
      // Update session storage
      const updatedFormData = {
        personalInfo: personalInfoData,
        emergencyContacts: emergencyContactsData,
        activeTab: 'emergency'
      }
      sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(updatedFormData))
    }
  }, [personalInfoValid, personalInfoData, emergencyContactsData, currentStep.id])

  // Enhanced tab change handler
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab)
    scrollToTop()
    // Save tab state
    const updatedFormData = {
      personalInfo: personalInfoData,
      emergencyContacts: emergencyContactsData,
      activeTab: newTab
    }
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(updatedFormData))
  }, [personalInfoData, emergencyContactsData, currentStep.id])

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
      enabled: true,
      complete: personalInfoValid
    },
    {
      id: 'emergency',
      label: t.emergencyTab,
      icon: <Phone className="h-4 w-4" />,
      enabled: true, // Always enabled, but continue button requires personal details
      complete: emergencyContactsValid
    }
  ]

  return (
    <StepContainer errors={errors} fieldErrors={fieldErrors} saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb 
          items={createBreadcrumbItems(['Home', 'Onboarding', 'Personal Information'])}
          className="mb-4"
        />
        
        {/* Step Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <User className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">{t.description}</p>
        </div>

        {/* Completion Alert */}
        {isStepComplete && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t.completionMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            {tabs.map(tab => (
              <TabsTrigger 
                key={tab.id}
                value={tab.id}
                disabled={!tab.enabled}
                className="flex items-center space-x-2"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.complete && <CheckCircle className="h-3 w-3 text-green-600 ml-1" />}
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
                  onNext={handlePersonalDetailsContinue}
                  onValidationChange={handlePersonalInfoValidationChange}
                  useMainNavigation={false}
                />
                
                {/* Continue Button */}
                <div className="flex justify-end pt-6 border-t">
                  <button
                    onClick={handlePersonalDetailsContinue}
                    disabled={!personalInfoValid}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      personalInfoValid
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {t.continueToEmergency} →
                  </button>
                </div>
                
                {!personalInfoValid && (
                  <p className="text-sm text-amber-600 text-center">
                    {t.fillPersonalFirst}
                  </p>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="emergency" className="space-y-6">
            {dataLoaded && (
              <>
                <EmergencyContactsForm
                  key="emergency-form"
                  initialData={emergencyContactsData}
                  language={language}
                  onSave={handleEmergencyContactsSave}
                  onNext={() => {}} // Portal handles navigation
                  onBack={() => handleTabChange('personal')}
                  onValidationChange={handleEmergencyContactsValidationChange}
                  useMainNavigation={true}
                />
                
                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t">
                  <button
                    onClick={() => handleTabChange('personal')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    {t.backToPersonal}
                  </button>
                  
                  {emergencyContactsValid && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{t.complete}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Progress Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">{t.sectionProgress}</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t.personalTab}</span>
              <div className="flex items-center space-x-2">
                {personalInfoValid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                )}
                <span className="text-sm font-medium">
                  {personalInfoValid ? t.complete : t.required}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t.emergencyTab}</span>
              <div className="flex items-center space-x-2">
                {emergencyContactsValid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                )}
                <span className="text-sm font-medium">
                  {emergencyContactsValid ? t.complete : t.required}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Debug section - temporary */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <button 
              onClick={() => {
                const data = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
                console.log('Session storage data:', data)
                if (data) {
                  const parsed = JSON.parse(data)
                  console.log('Parsed data structure:', parsed)
                  console.log('Personal info valid:', personalInfoValid)
                  console.log('Emergency contacts valid:', emergencyContactsValid)
                  console.log('Is step complete:', isStepComplete)
                }
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded text-sm mr-2"
            >
              Debug: Check Session Storage
            </button>
            <span className="text-sm text-gray-600">
              Personal: {personalInfoValid ? '✓' : '✗'} | 
              Emergency: {emergencyContactsValid ? '✓' : '✗'} | 
              Complete: {isStepComplete ? '✓' : '✗'}
            </span>
          </div>
        )}
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}