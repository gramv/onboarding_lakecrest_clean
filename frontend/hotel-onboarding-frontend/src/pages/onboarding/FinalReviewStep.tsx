import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import DigitalSignatureCapture from '@/components/DigitalSignatureCapture'
import { CheckCircle, FileText, Users, Shield, Clock } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useStepValidation } from '@/hooks/useStepValidation'
import { finalReviewValidator } from '@/utils/stepValidators'
import { Button } from '@/components/ui/button'
import axios from 'axios'
import { getApiUrl } from '@/config/api'

export default function FinalReviewStep({
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
  
  const [isComplete, setIsComplete] = useState(false)
  const [finalAcknowledgments, setFinalAcknowledgments] = useState([false, false, false, false])
  const [signatureData, setSignatureData] = useState(null)
  const [reviewData, setReviewData] = useState(null)
  const [isAdvancing, setIsAdvancing] = useState(false)

  // Validation hook
  const { errors, validate } = useStepValidation(finalReviewValidator)

  // Auto-save data
  const autoSaveData = {
    finalAcknowledgments,
    signatureData,
    reviewData,
    isComplete
  }

  // Auto-save hook
  const { saveStatus } = useAutoSave(autoSaveData, {
    onSave: async (data) => {
    await saveProgress(currentStep.id, data)
    }
  })

  // Load existing data from progress
  useEffect(() => {
    if (progress.completedSteps.includes(currentStep.id)) {
      setIsComplete(true)
    }
  }, [currentStep.id, progress.completedSteps])

  const handleAcknowledgmentChange = (index: number, checked: boolean) => {
    const newAcknowledgments = [...finalAcknowledgments]
    newAcknowledgments[index] = checked
    setFinalAcknowledgments(newAcknowledgments)
  }

  const handleSignatureComplete = async (signature) => {
    console.log('🎉 FINAL REVIEW - handleSignatureComplete called!')
    console.log('📝 Signature data:', {
      hasSignature: !!signature,
      signatureKeys: signature ? Object.keys(signature) : [],
      hasSignatureField: !!signature?.signature,
      hasSignedAt: !!signature?.signedAt
    })
    console.log('✅ Final acknowledgments:', finalAcknowledgments)
    console.log('👤 Employee:', { id: employee?.id, name: employee?.firstName })
    console.log('🏨 Property:', { id: property?.id, name: property?.name })

    setSignatureData(signature)

    // Validate before completing
    const validation = await validate({
      finalAcknowledgments,
      signature
    })

    console.log('🔍 Validation result:', validation)

    if (validation.valid) {
      console.log('✅ Validation passed! Proceeding with completion...')
      const completionData = {
        finalAcknowledgments,
        signatureData: signature,
        reviewData: {
          allStepsCompleted: true,
          completedAt: new Date().toISOString(),
          employeeSignatureTimestamp: new Date().toISOString(),
          finalReviewCompleted: true
        },
        completed: true,
        completedAt: new Date().toISOString()
      }

      setReviewData(completionData.reviewData)
      setIsComplete(true)

      // ✅ FIX: Mark step complete
      await markStepComplete(currentStep.id, completionData)

      // ✅ FIX: Call backend to complete onboarding and send manager notification
      if (employee?.id && property?.id) {
        try {
          console.log('📧 Completing onboarding and sending manager notification...')

          const response = await axios.post(
            `${getApiUrl()}/onboarding/${employee.id}/complete-onboarding`,
            {
              employee_id: employee.id,
              property_id: property.id,
              completed_at: completionData.completedAt,
              final_signature: signature
            }
          )

          if (response.data?.success) {
            console.log('✅ Onboarding completed! Manager notification sent.')
            console.log('📧 Response data:', response.data)
          } else {
            console.error('❌ Backend returned success=false:', response.data)
          }
        } catch (error) {
          console.error('❌ Failed to send manager notification:', error)
          console.error('❌ Error details:', error.response?.data || error.message)
          // Continue anyway - step is marked complete
        }
      } else {
        console.warn('⚠️ Missing employee or property data:', {
          hasEmployee: !!employee?.id,
          hasProperty: !!property?.id
        })
      }
    } else {
      console.error('❌ Validation failed:', validation.errors)
    }
  }

  const translations = {
    en: {
      title: 'Final Review & Employee Signature',
      subtitle: 'Complete Your Onboarding Process',
      description: 'Review all your onboarding information and provide your final signature to complete the process.',
      completedNotice: 'Onboarding process completed successfully! Your information has been submitted for manager review.',
      reviewSummary: 'Onboarding Summary',
      reviewSummaryDesc: 'Please review your completed onboarding steps before signing.',
      finalAcknowledgments: 'Final Acknowledgments',
      acknowledgment1: 'I certify that all information I have provided during this onboarding process is true, accurate, and complete to the best of my knowledge.',
      acknowledgment2: 'I understand that providing false or misleading information may result in termination of employment and potential legal consequences.',
      acknowledgment3: 'I acknowledge that I have read, understood, and agree to comply with all company policies and procedures presented during this onboarding process.',
      acknowledgment4: 'I consent to the processing of my personal information as described in the company privacy policy and understand my rights regarding this data.',
      legalNoticeTitle: 'Legal Notice:',
      legalNoticeMessage: 'Your signature above is legally binding and certifies the completeness and accuracy of all information provided.',
      complianceMessage: 'This onboarding process complies with federal employment law requirements including I-9 and tax withholding regulations.',
      finalSignature: 'Final Employee Signature',
      signatureDesc: 'Your signature below certifies that you have completed the onboarding process and agree to all terms and conditions.',
      submitButton: '🎉 Complete Onboarding',
      stepStatuses: {
        'personal-info': 'Personal Information',
        'job-details': 'Job Details',
        'company-policies': 'Company Policies',
        'i9-complete': 'I-9 Form',
        'w4-form': 'W-4 Tax Form',
        'direct-deposit': 'Direct Deposit',
        'health-insurance': 'Health Insurance',
        'trafficking-awareness': 'Human Trafficking Awareness',
        'weapons-policy': 'Weapons Policy'
      },
      estimatedTime: 'Estimated time: 4-5 minutes',
      overallProgress: 'Overall Progress',
      stepsCompleted: 'steps completed',
      complete: 'Complete',
      pending: 'Pending'
    },
    es: {
      title: 'Revisión Final y Firma del Empleado',
      subtitle: 'Complete Su Proceso de Incorporación',
      description: 'Revise toda su información de incorporación y proporcione su firma final para completar el proceso.',
      completedNotice: '¡Proceso de incorporación completado exitosamente! Su información ha sido enviada para revisión del gerente.',
      reviewSummary: 'Resumen de Incorporación',
      reviewSummaryDesc: 'Por favor revise sus pasos de incorporación completados antes de firmar.',
      finalAcknowledgments: 'Reconocimientos Finales',
      acknowledgment1: 'Certifico que toda la información que he proporcionado durante este proceso de incorporación es verdadera, precisa y completa según mi mejor conocimiento.',
      acknowledgment2: 'Entiendo que proporcionar información falsa o engañosa puede resultar en la terminación del empleo y posibles consecuencias legales.',
      acknowledgment3: 'Reconozco que he leído, entendido y acepto cumplir con todas las políticas y procedimientos de la empresa presentados durante este proceso de incorporación.',
      acknowledgment4: 'Consiento al procesamiento de mi información personal como se describe en la política de privacidad de la empresa y entiendo mis derechos con respecto a estos datos.',
      legalNoticeTitle: 'Aviso Legal:',
      legalNoticeMessage: 'Su firma anterior es legalmente vinculante y certifica la integridad y precisión de toda la información proporcionada.',
      complianceMessage: 'Este proceso de incorporación cumple con los requisitos de la ley federal de empleo, incluidos los requisitos del I-9 y de retención de impuestos.',
      finalSignature: 'Firma Final del Empleado',
      signatureDesc: 'Su firma a continuación certifica que ha completado el proceso de incorporación y acepta todos los términos y condiciones.',
      submitButton: '🎉 Completar Incorporación',
      stepStatuses: {
        'personal-info': 'Información Personal',
        'job-details': 'Detalles del Trabajo',
        'company-policies': 'Políticas de la Empresa',
        'i9-complete': 'Formulario I-9',
        'w4-form': 'Formulario de Impuestos W-4',
        'direct-deposit': 'Depósito Directo',
        'health-insurance': 'Seguro de Salud',
        'trafficking-awareness': 'Concientización sobre Trata de Personas',
        'weapons-policy': 'Política de Armas'
      },
      estimatedTime: 'Tiempo estimado: 4-5 minutos',
      overallProgress: 'Progreso General',
      stepsCompleted: 'pasos completados',
      complete: 'Completo',
      pending: 'Pendiente'
    }
  }

  const t = translations[language]

  // ✅ FIX: Calculate completion status for each step using progress.completedSteps
  const getStepStatus = (stepId: string) => {
    // Check if step is in completedSteps array
    const isCompleted = progress.completedSteps?.includes(stepId) || false

    console.log(`Step ${stepId} completion check:`, {
      isCompleted,
      completedSteps: progress.completedSteps,
      hasCompletedSteps: !!progress.completedSteps
    })

    return isCompleted
  }

  const completedStepsList = Object.keys(t.stepStatuses).filter(stepId => getStepStatus(stepId))
  const totalSteps = Object.keys(t.stepStatuses).length
  const completionPercentage = Math.round((completedStepsList.length / totalSteps) * 100)

  console.log('📊 Final Review Progress:', {
    completedStepsList,
    totalSteps,
    completionPercentage,
    progressCompletedSteps: progress.completedSteps
  })

  return (
    <StepContainer errors={errors} saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Step Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
          <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t.title}</h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto px-4">
          {t.description}
        </p>
      </div>

      {/* Progress Indicator */}
      {isComplete && (
        <Alert className="bg-green-50 border-green-200 p-3 sm:p-4">
          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
          <AlertDescription className="text-sm sm:text-base text-green-800">
            {t.completedNotice}
          </AlertDescription>
        </Alert>
      )}

      {/* Onboarding Summary */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
            <span>{t.reviewSummary}</span>
          </CardTitle>
          <p className="text-xs sm:text-sm text-gray-600">{t.reviewSummaryDesc}</p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Overall Progress */}
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm sm:text-base font-medium text-blue-900">{t.overallProgress}</span>
                <span className="text-base sm:text-lg font-bold text-blue-600">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 sm:h-3">
                <div
                  className="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-xs sm:text-sm text-blue-700 mt-2">
                {completedStepsList.length} of {totalSteps} {t.stepsCompleted}
              </p>
            </div>

            {/* Step by Step Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              {Object.entries(t.stepStatuses).map(([stepId, stepTitle]) => {
                const isCompleted = getStepStatus(stepId)
                return (
                  <div key={stepId} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs sm:text-sm font-medium text-gray-700 truncate pr-2">{stepTitle}</span>
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="text-xs sm:text-sm font-medium">
                        {isCompleted ? t.complete : t.pending}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Acknowledgments */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center space-x-2 text-orange-800">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span>{t.finalAcknowledgments}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
          {[t.acknowledgment1, t.acknowledgment2, t.acknowledgment3, t.acknowledgment4].map((acknowledgment, index) => (
            <div key={index} className="flex items-start space-x-2 sm:space-x-3">
              <Checkbox
                id={`acknowledgment-${index}`}
                checked={finalAcknowledgments[index]}
                onCheckedChange={(checked) => handleAcknowledgmentChange(index, checked as boolean)}
                className="mt-0.5 sm:mt-1 h-5 w-5 sm:h-4 sm:w-4"
              />
              <label
                htmlFor={`acknowledgment-${index}`}
                className="text-xs sm:text-sm text-orange-800 leading-relaxed cursor-pointer"
              >
                {acknowledgment}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Final Signature */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
            <span>{t.finalSignature}</span>
          </CardTitle>
          <p className="text-xs sm:text-sm text-gray-600">{t.signatureDesc}</p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <DigitalSignatureCapture
            documentName="Employee Onboarding Completion"
            signerName={employee?.firstName + ' ' + employee?.lastName || 'Employee'}
            signerTitle={employee?.position}
            acknowledgments={[
              t.acknowledgment1,
              t.acknowledgment2,
              t.acknowledgment3,
              t.acknowledgment4
            ]}
            requireIdentityVerification={false}
            language={language}
            onSignatureComplete={handleSignatureComplete}
            submitButtonText={t.submitButton}
          />
        </CardContent>
      </Card>

      {/* Completion Status */}
      {isComplete && (
        <div className="bg-green-50 rounded-lg p-4 sm:p-6 text-center">
          <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 mx-auto mb-2 sm:mb-3" />
          <h3 className="text-base sm:text-lg font-semibold text-green-800 mb-2">Onboarding Completed</h3>
          <p className="text-sm sm:text-base text-green-700">{t.completedNotice}</p>
        </div>
      )}

        {/* Legal Notice */}
        <div className="text-[10px] sm:text-xs text-gray-500 border-t pt-3 sm:pt-4 px-2 sm:px-0">
          <p className="mb-2"><strong>{t.legalNoticeTitle}</strong> {t.legalNoticeMessage}</p>
          <p>{t.complianceMessage}</p>
        </div>

      {/* Estimated Time */}
      <div className="text-center text-xs sm:text-sm text-gray-500">
        <p>{t.estimatedTime}</p>
      </div>
      </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
