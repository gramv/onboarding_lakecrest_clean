import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import HealthInsuranceForm from '@/components/HealthInsuranceForm'
import ReviewAndSign from '@/components/ReviewAndSign'
import { CheckCircle, Heart, Users, AlertTriangle } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useStepValidation } from '@/hooks/useStepValidation'
import { healthInsuranceValidator } from '@/utils/stepValidators'
import axios from 'axios'
import { getApiUrl } from '@/config/api'

export default function HealthInsuranceStep({
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
  const [isValid, setIsValid] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [isSigned, setIsSigned] = useState(false)

  // Validation hook
  const { errors, fieldErrors, validate } = useStepValidation(healthInsuranceValidator)

  // Auto-save data
  const autoSaveData = {
    formData,
    isValid,
    showReview,
    isSigned
  }

  // Auto-save hook
  const { saveStatus } = useAutoSave(autoSaveData, {
    onSave: async (data) => {
      await saveProgress(currentStep.id, data)
    }
  })

  // Load existing data
  useEffect(() => {
    console.log('HealthInsuranceStep - Loading data for step:', currentStep.id)
    
    // Try to load saved data from session storage
    const savedData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        console.log('HealthInsuranceStep - Found saved data:', parsed)
        
        // Check for different data structures
        if (parsed.formData) {
          console.log('HealthInsuranceStep - Setting formData from parsed.formData')
          setFormData(parsed.formData)
        } else if (parsed.medicalPlan !== undefined || parsed.isWaived !== undefined) {
          // Direct data structure
          console.log('HealthInsuranceStep - Setting formData from direct structure')
          setFormData(parsed)
        }
        
        if (parsed.isSigned || parsed.signed) {
          console.log('HealthInsuranceStep - Form was previously signed')
          setIsSigned(true)
          setIsValid(true)
        }
      } catch (e) {
        console.error('Failed to parse saved health insurance data:', e)
      }
    }
    
    if (progress.completedSteps.includes(currentStep.id)) {
      console.log('HealthInsuranceStep - Step marked as complete in progress')
      setIsSigned(true)
      setIsValid(true)
    }
  }, [currentStep.id, progress.completedSteps])

  const handleFormSave = async (data: any) => {
    console.log('HealthInsuranceStep - handleFormSave called with data:', data)
    // Validate the form data
    const validation = await validate(data)
    console.log('Validation result:', validation)
    
    if (validation.valid) {
      console.log('Validation passed, saving data and showing review')
      setFormData(data)
      setIsValid(true)
      setShowReview(true)
      
      // Save to session storage
      sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify({
        formData: data,
        isValid: true,
        isSigned: false,
        showReview: true
      }))
    } else {
      console.log('Validation failed:', validation.errors)
    }
  }

  const handleBackFromReview = () => {
    setShowReview(false)
  }

  const handleDigitalSignature = async (signatureData: any) => {
    setIsSigned(true)
    
    // Create complete data with both nested and flat structure for compatibility
    const completeData = {
      // Include flat structure for validator
      ...formData,
      // Also include nested structure for consistency
      formData,
      signed: true,
      isSigned: true, // Include both for compatibility
      signatureData,
      completedAt: new Date().toISOString()
    }
    
    // Save to backend if we have an employee ID
    if (employee?.id) {
      try {
        await axios.post(`${getApiUrl()}/onboarding/${employee.id}/health-insurance`, completeData)
        console.log('Health insurance data saved to backend')
      } catch (error) {
        console.error('Failed to save health insurance data to backend:', error)
        // Continue even if backend save fails - data is in session storage
      }
    }
    
    // Save to session storage with signed status
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify({
      ...formData, // Include flat structure in session storage too
      formData,
      isValid: true,
      isSigned: true,
      showReview: false,
      signed: true,
      signatureData,
      completedAt: completeData.completedAt
    }))
    
    // Save progress to update controller's step data - this ensures data is available for validation
    await saveProgress(currentStep.id, completeData)
    
    await markStepComplete(currentStep.id, completeData)
    setShowReview(false)
  }

  const isStepComplete = isValid && isSigned


  const translations = {
    en: {
      title: 'Health Insurance Enrollment',
      reviewTitle: 'Review & Sign Health Insurance Enrollment',
      description: 'Choose your health insurance plan and add dependents if applicable. Your coverage will begin according to your plan\'s effective date.',
      enrollmentPeriod: 'Enrollment Period',
      enrollmentNotice: 'You have 30 days from your hire date to enroll in health insurance or make changes to your coverage.',
      completionMessage: 'Health insurance enrollment completed successfully.',
      planSelectionTitle: 'Health Insurance Plan Selection',
      estimatedTime: 'Estimated time: 6-8 minutes',
      reviewDescription: 'Review your health insurance plan selections and dependent information before signing',
      acknowledgments: {
        planSelection: 'I have reviewed and selected the appropriate health insurance plan',
        dependentInfo: 'All dependent information provided is accurate and complete',
        coverage: 'I understand when my coverage will begin',
        changes: 'I understand I can make changes during open enrollment or qualifying life events'
      },
      certificateTitle: 'Health Insurance Enrollment Certificate',
      completedCertificate: 'Your health insurance enrollment has been completed and signed'
    },
    es: {
      title: 'Inscripción en Seguro de Salud',
      reviewTitle: 'Revisar y Firmar Inscripción en Seguro de Salud',
      description: 'Elija su plan de seguro de salud y agregue dependientes si corresponde. Su cobertura comenzará según la fecha de vigencia de su plan.',
      enrollmentPeriod: 'Período de Inscripción',
      enrollmentNotice: 'Tiene 30 días desde su fecha de contratación para inscribirse en el seguro de salud o hacer cambios en su cobertura.',
      completionMessage: 'Inscripción en seguro de salud completada exitosamente.',
      planSelectionTitle: 'Selección de Plan de Seguro de Salud',
      estimatedTime: 'Tiempo estimado: 6-8 minutos',
      reviewDescription: 'Revise sus selecciones de plan de seguro de salud e información de dependientes antes de firmar',
      acknowledgments: {
        planSelection: 'He revisado y seleccionado el plan de seguro de salud apropiado',
        dependentInfo: 'Toda la información de dependientes proporcionada es precisa y completa',
        coverage: 'Entiendo cuándo comenzará mi cobertura',
        changes: 'Entiendo que puedo hacer cambios durante la inscripción abierta o eventos de vida calificados'
      },
      certificateTitle: 'Certificado de Inscripción en Seguro de Salud',
      completedCertificate: 'Su inscripción en seguro de salud ha sido completada y firmada'
    }
  }

  const t = translations[language]

  // Show review and sign if form is valid and review is requested
  if (showReview && formData) {
    return (
      <StepContainer errors={errors} saveStatus={saveStatus}>
        <StepContentWrapper>
          <div className="space-y-6 sm:space-y-8 px-2 sm:px-0">
            {/* Professional Header with Certificate Style */}
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg mb-3 sm:mb-4">
                <Heart className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {t.reviewTitle}
                </h1>
                <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
                  {t.reviewDescription}
                </p>
              </div>

              {/* Professional divider */}
              <div className="flex items-center justify-center space-x-3 sm:space-x-4 py-3 sm:py-4">
                <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-blue-300"></div>
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-blue-300"></div>
              </div>
            </div>

            {/* Review and Sign Component */}
            <div className="max-w-4xl mx-auto">
              <ReviewAndSign
                formType="health_insurance"
                formTitle="Health Insurance Enrollment Form"
                formData={formData}
                documentName="Health Insurance Enrollment"
                signerName={employee?.firstName + ' ' + employee?.lastName || 'Employee'}
                signerTitle={employee?.position}
                onSign={handleDigitalSignature}
                onEdit={handleBackFromReview}
                acknowledgments={[
                  t.acknowledgments.planSelection,
                  t.acknowledgments.dependentInfo,
                  t.acknowledgments.coverage,
                  t.acknowledgments.changes
                ]}
                language={language}
                description={t.reviewDescription}
                usePDFPreview={true}
                pdfEndpoint={`${getApiUrl()}/onboarding/${employee?.id || 'test-employee'}/health-insurance/generate-pdf`}
              />
            </div>
          </div>
        </StepContentWrapper>
      </StepContainer>
    )
  }

  return (
    <StepContainer errors={errors} fieldErrors={fieldErrors} saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-6 sm:space-y-8 px-2 sm:px-0">
          {/* Professional Header */}
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg mb-2 sm:mb-3">
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
                {t.title}
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
                {t.description}
              </p>
            </div>

            {/* Professional divider */}
            <div className="flex items-center justify-center space-x-3 sm:space-x-4 py-2 sm:py-3">
              <div className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent to-blue-300"></div>
              <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
              <div className="h-px w-12 sm:w-20 bg-gradient-to-l from-transparent to-blue-300"></div>
            </div>
          </div>

          {/* Enrollment Period Notice - Enhanced */}
          <Alert className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 shadow-sm max-w-4xl mx-auto p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">{t.enrollmentPeriod}</h3>
                <AlertDescription className="text-blue-800 text-xs sm:text-sm">
                  {t.enrollmentNotice}
                </AlertDescription>
              </div>
            </div>
          </Alert>

          {/* Completion Status - Enhanced */}
          {isStepComplete && (
            <Alert className="bg-gradient-to-r from-green-50 to-green-100 border-green-300 shadow-sm max-w-4xl mx-auto p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <AlertDescription className="text-green-800 font-medium text-sm sm:text-base">
                    {t.completionMessage}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Health Insurance Form - Enhanced Card */}
          <div className="max-w-5xl mx-auto">
            <Card className="shadow-lg border-t-4 border-t-blue-500">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white pb-3 sm:pb-4 p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 sm:space-x-3 text-base sm:text-lg md:text-xl">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <span className="text-gray-900">{t.planSelectionTitle}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                <HealthInsuranceForm
                  initialData={formData}
                  language={language}
                  onSave={handleFormSave}
                  onValidationChange={(valid: boolean, errors?: Record<string, string>) => {
                    console.log('HealthInsuranceStep - onValidationChange called, valid:', valid)
                    setIsValid(valid)
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Time Estimate - Enhanced */}
          <div className="text-center">
            <p className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-500 bg-gray-50 px-3 sm:px-4 py-2 rounded-full border border-gray-200">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0"></span>
              {t.estimatedTime}
            </p>
          </div>
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
