import React, { useState, useEffect, useCallback, useRef } from 'react'
import PersonalInformationForm from '@/components/PersonalInformationForm'
import EmergencyContactsForm from '@/components/EmergencyContactsForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, User, Phone, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { useAutoSave } from '@/hooks/useAutoSave'
import { scrollToTop } from '@/utils/scrollHelpers'
import { secureStorage } from '@/services/SecureStorageService'

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
  const dataLoadedRef = useRef(false) // ✅ FIX: Track if data has been loaded to prevent infinite loop

  // ✅ PERFORMANCE FIX: Add completion guard flags
  const [isCompleting, setIsCompleting] = useState(false)
  const completionAttemptedRef = useRef(false)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  
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
      // Store in encrypted storage as backup
      secureStorage.setItem(`${currentStep.id}_data`, data)
    }
  })

  // Load existing data on mount
  useEffect(() => {
    const loadExistingData = async () => {
      // ✅ FIX: Prevent infinite loop - only load data once
      if (dataLoadedRef.current) {
        return
      }

      try {
        let dataToUse = null

        // Try to load from encrypted storage first
        const savedData = secureStorage.getItem(`${currentStep.id}_data`)
        console.log('PersonalInfoStep - Loading saved data:', savedData)
        if (savedData) {
          dataToUse = savedData
          console.log('PersonalInfoStep - Loaded data from encrypted storage:', dataToUse)
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
                  // Update encrypted storage with cloud data
                  secureStorage.setItem(`${currentStep.id}_data`, result.data)
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

        // ✅ FIX: Mark data as loaded to prevent re-loading
        dataLoadedRef.current = true
        setDataLoaded(true)
      } catch (error) {
        console.error('Failed to load existing data:', error)
        setDataLoaded(true)
      }
    }
    loadExistingData()
  }, [currentStep.id, progress.completedSteps, employee?.id]) // ✅ FIX: Use employee.id instead of employee object

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

  // ✅ PERFORMANCE FIX: Auto-mark complete with proper guards
  useEffect(() => {
    const completeStep = async () => {
      // Guard: Don't run if already completing or already attempted
      if (isCompleting || completionAttemptedRef.current) {
        return
      }

      // Guard: Only run if step is actually complete and not already in completed list
      if (isStepComplete && !progress.completedSteps.includes(currentStep.id)) {
        console.log('🎯 PersonalInfoStep: Auto-completing step...')
        setIsCompleting(true)
        completionAttemptedRef.current = true

        try {
          await markStepComplete(currentStep.id, {
            personalInfo: personalInfoData,
            emergencyContacts: emergencyContactsData,
            activeTab
          })
          console.log('✅ PersonalInfoStep: Step completed successfully')
        } catch (error) {
          console.error('❌ PersonalInfoStep: Failed to complete step:', error)
          // Don't reset state - let user retry manually
          completionAttemptedRef.current = false
        } finally {
          setIsCompleting(false)
        }
      }
    }

    completeStep()
  }, [isStepComplete, progress.completedSteps, currentStep.id])  // ✅ Minimal dependencies

  const handlePersonalInfoSave = useCallback(async (data: any) => {
    console.log('Saving personal info:', data)
    setPersonalInfoData(data)
    // Immediately save to session storage and backend
    const updatedFormData = {
      personalInfo: data,
      emergencyContacts: emergencyContactsData,
      activeTab
    }
    secureStorage.setItem(`${currentStep.id}_data`, updatedFormData)
    // Also save to backend (this will trigger sync status updates in the portal)
    await saveProgress(currentStep.id, updatedFormData)
  }, [emergencyContactsData, activeTab, currentStep.id, saveProgress])

  // ✅ PERFORMANCE FIX: Debounced emergency contacts save
  const handleEmergencyContactsSave = useCallback(async (data: any) => {
    console.log('Saving emergency contacts:', data)
    setEmergencyContactsData(data)

    const updatedFormData = {
      personalInfo: personalInfoData,
      emergencyContacts: data,
      activeTab
    }

    // Save to encrypted storage immediately (no data loss)
    secureStorage.setItem(`${currentStep.id}_data`, updatedFormData)

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    // Debounce save to backend (500ms)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveProgress(currentStep.id, updatedFormData)
        console.log('✅ Emergency contacts saved to backend')
      } catch (error) {
        console.error('❌ Failed to save emergency contacts:', error)
      }
    }, 500)
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
    secureStorage.setItem(`${currentStep.id}_data`, updatedFormData)
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
        {/* Step Header - Mobile Optimized with Fluid Typography */}
        <div className="text-center px-[clamp(1rem,3vw,1.5rem)]">
          <div className="flex items-center justify-center gap-[clamp(0.5rem,2vw,0.75rem)] mb-[clamp(0.75rem,2vw,1rem)]">
            <User className="h-[clamp(1.25rem,4vw,1.5rem)] w-[clamp(1.25rem,4vw,1.5rem)] text-blue-600 flex-shrink-0" />
            <h1 className="text-[clamp(1.5rem,5vw,2.5rem)] font-bold text-gray-900 leading-tight">{t.title}</h1>
          </div>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600 max-w-2xl mx-auto leading-relaxed">{t.description}</p>
        </div>

        {/* Tabbed Interface - Mobile Optimized with Larger Touch Targets */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-[clamp(1rem,3vw,1.5rem)] sticky top-0 z-10 bg-white shadow-sm">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={tab.disabled}
                className="flex items-center justify-center gap-[clamp(0.25rem,1vw,0.5rem)] min-h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.75rem,2vw,0.875rem)]"
              >
                {tab.icon && React.cloneElement(tab.icon, { className: 'h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] flex-shrink-0' })}
                <span className="truncate">{tab.label}</span>
                {tab.complete && <CheckCircle className="h-[clamp(0.875rem,2vw,1rem)] w-[clamp(0.875rem,2vw,1rem)] text-green-600 ml-[clamp(0.125rem,0.5vw,0.25rem)] flex-shrink-0" />}
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

                {/* Go to Emergency Contacts Button - Mobile Optimized */}
                {personalInfoValid && (
                  <div className="flex justify-center px-[clamp(1rem,3vw,1.5rem)]">
                    <Button
                      onClick={() => handleTabChange('emergency')}
                      className="w-full sm:w-auto h-[clamp(2.75rem,6vw,3rem)] px-[clamp(1.5rem,4vw,2rem)] text-[clamp(0.875rem,2.5vw,1rem)]"
                      variant="default"
                    >
                      {t.continueToEmergency}
                      <ArrowRight className="ml-[clamp(0.5rem,2vw,0.75rem)] h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] flex-shrink-0" />
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