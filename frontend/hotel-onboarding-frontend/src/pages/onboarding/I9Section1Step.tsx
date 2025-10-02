import React, { useState, useEffect } from 'react'
import I9Section1FormClean from '@/components/I9Section1FormClean'
import ReviewAndSign from '@/components/ReviewAndSign'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, FileText, User } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormSection } from '@/components/ui/form-section'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { NavigationButtons } from '@/components/navigation/NavigationButtons'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useStepValidation } from '@/hooks/useStepValidation'
import { i9Section1Validator } from '@/utils/stepValidators'
import { getApiUrl } from '@/config/api'

export default function I9Section1Step({
  currentStep,
  progress,
  markStepComplete,
  saveProgress,
  advanceToNextStep,
  goToPreviousStep,
  language = 'en',
  employee,
  property,
  canProceedToNext: _canProceedToNext
}: StepProps) {
  
  const [formData, setFormData] = useState<any>({})
  const [activeTab, setActiveTab] = useState('form')
  const [formValid, setFormValid] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [savedPdfUrl, setSavedPdfUrl] = useState<string | null>(null)

  // Validation hook
  const { errors, fieldErrors, validate } = useStepValidation(i9Section1Validator)

  // Auto-save data
  const autoSaveData = {
    formData,
    activeTab,
    formValid,
    isSigned,
    pdfUrl: savedPdfUrl
  }

  // Auto-save hook
  const { saveStatus } = useAutoSave(autoSaveData, {
    onSave: async (data) => {
    await saveProgress(currentStep.id, data)
    }
  })

  // Load existing data from cloud/session storage
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        // First, check sessionStorage (may have cloud data already loaded by portal)
        const savedI9Data = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
        console.log('I9Section1Step - Loading saved data:', savedI9Data)
        
        if (savedI9Data) {
          const parsed = JSON.parse(savedI9Data)
          console.log('I9Section1Step - Parsed data:', parsed)
          
          // Handle both nested structure (expected) and flat structure (from cloud)
          let dataToLoad = {}
          if (parsed.formData) {
            // Nested structure - expected format
            dataToLoad = parsed.formData
          } else if (parsed.form_data) {
            // Cloud structure with form_data field
            dataToLoad = parsed.form_data
            // Also restore signature state
            if (parsed.signed) {
              setIsSigned(true)
              setActiveTab('review')
            }
            if (parsed.signature_data) {
              // We have a signature stored
              setSavedPdfUrl(parsed.pdf_url || null)
            }
          } else {
            // Flat structure - data directly in parsed object
            dataToLoad = parsed
          }
          
          // Set ALL the loaded data including citizenship_status
          if (dataToLoad && Object.keys(dataToLoad).length > 0) {
            setFormData(dataToLoad)
            console.log('I9Section1Step - Set formData with citizenship_status:', dataToLoad.citizenship_status)
          }
          
          // Check if form was marked as valid/signed
          if (parsed.formValid) {
            setFormValid(true)
          }
          if (parsed.signed || parsed.isSigned) {
            setIsSigned(true)
            setActiveTab('review')
          }
          
          // Restore saved PDF URL if it exists
          if (parsed.pdfUrl || parsed.pdf_url) {
            setSavedPdfUrl(parsed.pdfUrl || parsed.pdf_url)
            console.log('I9Section1Step - Restored saved PDF preview')
          }
          
          // If we have saved I9 data, don't load personal info at all
          if (dataToLoad && Object.keys(dataToLoad).length > 0) {
            console.log('I9Section1Step - Using saved I9 data, skipping personal info auto-fill')
            return
          }
        }
        
        // Check if this step is already completed
        if (progress.completedSteps.includes(currentStep.id)) {
          setIsSigned(true)
          setFormValid(true)
          setActiveTab('review')
          return
        }
        
        // Only auto-fill from personal info if no I9 data exists
        if (!savedI9Data) {
      const personalInfoData = sessionStorage.getItem('onboarding_personal-info_data')
      console.log('Personal info data from storage:', personalInfoData)
      
      if (personalInfoData) {
        try {
          const parsedData = JSON.parse(personalInfoData)
          console.log('Parsed personal info:', parsedData)
          const personalInfo = parsedData.personalInfo || parsedData || {}
          
          // Map personal info fields to I-9 fields, preserving any existing citizenship_status
          const mappedData = {
            last_name: personalInfo.lastName || '',
            first_name: personalInfo.firstName || '',
            middle_initial: personalInfo.middleInitial || '',
            date_of_birth: personalInfo.dateOfBirth || '',
            ssn: personalInfo.ssn || '',
            email: personalInfo.email || '',
            phone: personalInfo.phone || '',
            address: personalInfo.address || '',
            apt_number: personalInfo.aptNumber || personalInfo.apartment || '',
            city: personalInfo.city || '',
            state: personalInfo.state || '',
            zip_code: personalInfo.zipCode || '',
            // Initialize I9-specific fields as empty
            citizenship_status: '',
            alien_registration_number: '',
            foreign_passport_number: '',
            country_of_issuance: '',
            expiration_date: ''
          }
          
          console.log('Mapped I9 data from personal info (citizenship_status initialized as empty):', mappedData)
          setFormData(mappedData)
        } catch (e) {
          console.error('Failed to parse personal info data:', e)
        }
      }
    }
      } catch (error) {
        console.error('Failed to load existing data:', error)
      }
    }
    loadExistingData()
  }, [currentStep.id, progress.completedSteps])

  const handleFormComplete = async (data: any) => {
    console.log('I9Section1Step - Form completed with data:', data)
    console.log('I9Section1Step - Citizenship status:', data.citizenship_status)
    console.log('I9Section1Step - All form fields:', Object.keys(data))
    
    // Ensure we have all the data including citizenship_status
    const completeFormData = {
      ...formData,  // Preserve any existing data
      ...data       // Override with new data from form
    }
    
    // Save the complete form data
    setFormData(completeFormData)
    setFormValid(true)
    
    // Save to session storage with proper structure
    const dataToSave = {
      formData: completeFormData,
      formValid: true,
      activeTab: 'review',
      pdfUrl: savedPdfUrl // Preserve any existing PDF URL
    }
    
    // Save to session storage immediately
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(dataToSave))
    console.log('I9Section1Step - Saved to session storage with citizenship_status:', completeFormData.citizenship_status)
    
    // Save via saveProgress for backend sync (general progress tracking)
    await saveProgress(currentStep.id, dataToSave)
    
    // Also save to dedicated I-9 endpoint for structured storage
    if (employee?.id && !employee.id.startsWith('demo-')) {
      try {
        const response = await fetch(
          `${getApiUrl()}/onboarding/${employee.id}/i9-section1`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              formData: completeFormData,
              signed: false,
              formValid: true
            })
          }
        )
        
        if (response.ok) {
          console.log('I9Section1Step - Form data saved to cloud')
        } else {
          console.error('Failed to save I-9 data to cloud:', await response.text())
        }
      } catch (error) {
        console.error('Error saving I-9 data to cloud:', error)
      }
    }
    
    // Switch to review tab
    setActiveTab('review')
  }

  const handlePdfGenerated = (pdfData: string) => {
    console.log('I9Section1Step - PDF generated, saving to session storage')
    setSavedPdfUrl(pdfData)
    
    // Update session storage with PDF URL
    const currentData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
    if (currentData) {
      try {
        const parsed = JSON.parse(currentData)
        const updatedData = {
          ...parsed,
          pdfUrl: pdfData,
          pdfGeneratedAt: new Date().toISOString()
        }
        sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(updatedData))
      } catch (e) {
        console.error('Failed to update session storage with PDF:', e)
      }
    }
  }

  const handleSign = async (signatureData: any) => {
    const completeData = {
      formData,
      signed: true,
      isSigned: true,
      signatureData,
      completedAt: new Date().toISOString(),
      formValid: true,
      pdfUrl: savedPdfUrl // Include the saved PDF URL
    }
    
    setIsSigned(true)
    
    // Save to session storage with signed status
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(completeData))
    
    // Save signature to cloud via dedicated I-9 endpoint
    if (employee?.id && !employee.id.startsWith('demo-')) {
      try {
        const response = await fetch(
          `${getApiUrl()}/onboarding/${employee.id}/i9-section1`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              formData,
              signed: true,
              signatureData: signatureData.signature, // Just the signature image
              completedAt: completeData.completedAt,
              pdfUrl: savedPdfUrl // Save PDF URL to cloud
            })
          }
        )
        
        if (response.ok) {
          console.log('I9Section1Step - Signature and PDF saved to cloud')
        } else {
          console.error('Failed to save I-9 signature to cloud:', await response.text())
        }
      } catch (error) {
        console.error('Error saving I-9 signature to cloud:', error)
      }
    }
    
    // Mark step as complete (this also saves via general progress endpoint)
    await markStepComplete(currentStep.id, completeData)
  }

  const renderFormPreview = (data: any) => {
    if (!data || Object.keys(data).length === 0) return <div>No form data available</div>
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Last Name</label>
            <p className="text-gray-900">{data.last_name || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">First Name</label>
            <p className="text-gray-900">{data.first_name || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Middle Initial</label>
            <p className="text-gray-900">{data.middle_initial || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Date of Birth</label>
            <p className="text-gray-900">{data.date_of_birth || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Social Security Number</label>
            <p className="text-gray-900">{data.ssn ? '***-**-' + data.ssn.slice(-4) : 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Employee Address</label>
            <p className="text-gray-900">{data.address || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Citizenship Status</label>
            <p className="text-gray-900">
              {data.citizenship_status === 'citizen' ? 'U.S. Citizen' :
               data.citizenship_status === 'permanent_resident' ? 'Lawful Permanent Resident' :
               data.citizenship_status === 'authorized_alien' ? 'Alien Authorized to Work' :
               data.citizenship_status || 'Not provided'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const translations = {
    en: {
      title: 'Employment Eligibility Verification',
      description: 'Complete Form I-9 Section 1 to verify your eligibility to work in the United States',
      completionMessage: 'Form I-9 Section 1 has been completed and digitally signed.',
      fillFormTab: 'Fill Form',
      reviewTab: 'Preview & Sign',
      reviewTitle: 'Review I-9 Section 1',
      reviewDescription: 'Please review your employment eligibility information and sign electronically',
      agreementText: 'I attest, under penalty of perjury, that I am (check one of the following boxes):'
    },
    es: {
      title: 'Verificación de Elegibilidad de Empleo',
      description: 'Complete el Formulario I-9 Sección 1 para verificar su elegibilidad para trabajar en los Estados Unidos',
      completionMessage: 'El Formulario I-9 Sección 1 ha sido completado y firmado digitalmente.',
      fillFormTab: 'Llenar Formulario',
      reviewTab: 'Revisar y Firmar',
      reviewTitle: 'Revisar I-9 Sección 1',
      reviewDescription: 'Por favor revise su información de elegibilidad de empleo y firme electrónicamente',
      agreementText: 'Atestiguo, bajo pena de perjurio, que soy (marque una de las siguientes casillas):'
    }
  }

  const t = translations[language]

  return (
    <StepContainer errors={errors} fieldErrors={fieldErrors} saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-6">
        {/* Step Header */}
        <div className="text-center mb-6">
          <h1 className="text-heading-secondary font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-600 mt-2 text-base">{t.description}</p>
        </div>

        {/* Completion Status */}
        {isSigned && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t.completionMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Form Section */}
        <FormSection
          title="Employment Eligibility Form"
          description="Complete your I-9 Section 1 form and review before signing"
          icon={<User className="h-5 w-5" />}
          completed={isSigned}
          required={true}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="form" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>{t.fillFormTab}</span>
                {formValid && <CheckCircle className="h-3 w-3 text-green-600" />}
              </TabsTrigger>
              <TabsTrigger value="review" disabled={!formValid} className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>{t.reviewTab}</span>
                {isSigned && <CheckCircle className="h-3 w-3 text-green-600" />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="space-y-6">
              <I9Section1FormClean
                onComplete={handleFormComplete}
                initialData={formData}
                language={language}
                employeeId={employee?.id}
              />
            </TabsContent>

            <TabsContent value="review" className="space-y-6">
              {formData && (
                <ReviewAndSign
                  formType="i9-section1"
                  formData={formData}
                  title={t.reviewTitle}
                  description={t.reviewDescription}
                  language={language}
                  onSign={handleSign}
                  onBack={() => setActiveTab('form')}
                  renderPreview={renderFormPreview}
                  usePDFPreview={true}
                pdfEndpoint={`${getApiUrl()}/onboarding/${employee?.id}/i9-section1/generate-pdf`}
                  pdfUrl={savedPdfUrl}
                  onPdfGenerated={handlePdfGenerated}
                  federalCompliance={{
                    formName: 'Form I-9, Employment Eligibility Verification',
                    retentionPeriod: '3 years after hire or 1 year after termination (whichever is later)',
                    requiresWitness: false
                  }}
                  agreementText={t.agreementText}
                />
              )}
            </TabsContent>
          </Tabs>
        </FormSection>

        {/* Navigation */}
        <NavigationButtons
          showPrevious={true}
          showNext={true}
          onPrevious={goToPreviousStep || (() => {})}
          onNext={advanceToNextStep || (async () => ({ allowed: false, reason: 'Navigation not available' }))}
          disabled={saveStatus?.saving || !isSigned}
          saving={saveStatus?.saving}
          hasErrors={false}
          language={language}
          nextButtonText={progress.currentStepIndex === progress.totalSteps - 1 ? 'Submit' : 'Next'}
        />

        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
