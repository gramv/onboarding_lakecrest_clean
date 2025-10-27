import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SignatureCanvas from 'react-signature-canvas'
import { CheckCircle, FileText, Users, Shield, Clock, Pen, AlertCircle, Info } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useStepValidation } from '@/hooks/useStepValidation'
import { finalReviewValidator } from '@/utils/stepValidators'
import { Button } from '@/components/ui/button'
import { MobileCheckbox } from '@/components/job-application/mobile-optimized/MobileCheckbox'
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

  const navigate = useNavigate()
  const [isComplete, setIsComplete] = useState(false)
  const [finalAcknowledgments, setFinalAcknowledgments] = useState([false, false, false, false])
  const [signatureData, setSignatureData] = useState(null)
  const [reviewData, setReviewData] = useState(null)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [hasAgreed, setHasAgreed] = useState(false)
  const [signatureError, setSignatureError] = useState('')
  const signatureRef = useRef<SignatureCanvas>(null)

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

            // ✅ Redirect to completion page after 2 seconds
            setTimeout(() => {
              console.log('🔄 Redirecting to onboarding complete page...')
              navigate('/onboarding-complete')
            }, 2000)
          } else {
            console.error('❌ Backend returned success=false:', response.data)
          }
        } catch (error) {
          console.error('❌ Failed to send manager notification:', error)
          console.error('❌ Error details:', error.response?.data || error.message)
          // Continue anyway - step is marked complete
          // Still redirect to completion page
          setTimeout(() => {
            console.log('🔄 Redirecting to onboarding complete page (after error)...')
            navigate('/onboarding-complete')
          }, 2000)
        }
      } else {
        console.warn('⚠️ Missing employee or property data:', {
          hasEmployee: !!employee?.id,
          hasProperty: !!property?.id
        })
        // Still redirect to completion page
        setTimeout(() => {
          console.log('🔄 Redirecting to onboarding complete page (missing data)...')
          navigate('/onboarding-complete')
        }, 2000)
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
        <div className="space-y-[clamp(1rem,3vw,1.5rem)]">
      {/* Step Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-[clamp(0.5rem,1.5vw,0.75rem)] mb-[clamp(0.75rem,2vw,1rem)]">
          <FileText className="h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)] text-blue-600 flex-shrink-0" />
          <h1 className="text-[clamp(1.25rem,4vw,1.875rem)] font-bold text-gray-900">{t.title}</h1>
        </div>
        <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600 max-w-3xl mx-auto px-[clamp(1rem,3vw,1.5rem)]">
          {t.description}
        </p>
      </div>

      {/* Progress Indicator */}
      {isComplete && (
        <Alert className="bg-green-50 border-green-200 p-[clamp(0.75rem,2vw,1rem)]">
          <CheckCircle className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-green-600 flex-shrink-0" />
          <AlertDescription className="text-[clamp(0.875rem,2.5vw,1rem)] text-green-800">
            {t.completedNotice}
          </AlertDescription>
        </Alert>
      )}

      {/* Onboarding Summary */}
      <Card>
        <CardHeader className="p-[clamp(1rem,3vw,1.5rem)]">
          <CardTitle className="flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(1rem,2.5vw,1.125rem)]">
            <Users className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-blue-600 flex-shrink-0" />
            <span>{t.reviewSummary}</span>
          </CardTitle>
          <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-600">{t.reviewSummaryDesc}</p>
        </CardHeader>
        <CardContent className="p-[clamp(1rem,3vw,1.5rem)]">
          <div className="space-y-[clamp(0.75rem,2vw,1rem)]">
            {/* Overall Progress */}
            <div className="bg-blue-50 rounded-lg p-[clamp(0.75rem,2vw,1rem)]">
              <div className="flex items-center justify-between mb-[clamp(0.5rem,1.5vw,0.75rem)]">
                <span className="text-[clamp(0.875rem,2.5vw,1rem)] font-medium text-blue-900">{t.overallProgress}</span>
                <span className="text-[clamp(1rem,2.5vw,1.125rem)] font-bold text-blue-600">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-[clamp(0.5rem,1.5vw,0.75rem)]">
                <div
                  className="bg-blue-600 h-[clamp(0.5rem,1.5vw,0.75rem)] rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-blue-700 mt-[clamp(0.5rem,1.5vw,0.75rem)]">
                {completedStepsList.length} of {totalSteps} {t.stepsCompleted}
              </p>
            </div>

            {/* Step by Step Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(0.5rem,1.5vw,0.75rem)]">
              {Object.entries(t.stepStatuses).map(([stepId, stepTitle]) => {
                const isCompleted = getStepStatus(stepId)
                return (
                  <div key={stepId} className="flex items-center justify-between p-[clamp(0.5rem,1.5vw,0.75rem)] bg-gray-50 rounded-lg">
                    <span className="text-[clamp(0.75rem,2vw,0.875rem)] font-medium text-gray-700 truncate pr-[clamp(0.5rem,1.5vw,0.75rem)]">{stepTitle}</span>
                    <div className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)] flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle className="h-[clamp(0.75rem,2vw,1rem)] w-[clamp(0.75rem,2vw,1rem)] text-green-600 flex-shrink-0" />
                      ) : (
                        <Clock className="h-[clamp(0.75rem,2vw,1rem)] w-[clamp(0.75rem,2vw,1rem)] text-gray-400 flex-shrink-0" />
                      )}
                      <span className="text-[clamp(0.75rem,2vw,0.875rem)] font-medium">
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
        <CardHeader className="p-[clamp(1rem,3vw,1.5rem)]">
          <CardTitle className="text-[clamp(1rem,2.5vw,1.125rem)] flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] text-orange-800">
            <Shield className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] flex-shrink-0" />
            <span>{t.finalAcknowledgments}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-[clamp(0.75rem,2vw,1rem)] p-[clamp(1rem,3vw,1.5rem)]">
          {[t.acknowledgment1, t.acknowledgment2, t.acknowledgment3, t.acknowledgment4].map((acknowledgment, index) => (
            <MobileCheckbox
              key={index}
              id={`acknowledgment-${index}`}
              label={acknowledgment}
              checked={finalAcknowledgments[index]}
              onCheckedChange={(checked) => handleAcknowledgmentChange(index, checked as boolean)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Final Signature */}
      <Card>
        <CardHeader className="p-[clamp(1rem,3vw,1.5rem)]">
          <CardTitle className="flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(1rem,2.5vw,1.125rem)]">
            <Pen className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-blue-600 flex-shrink-0" />
            <span>{t.finalSignature}</span>
          </CardTitle>
          <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-600">{t.signatureDesc}</p>
        </CardHeader>
        <CardContent className="p-[clamp(1rem,3vw,1.5rem)] pb-[clamp(1.5rem,4vw,2rem)] space-y-[clamp(1.5rem,4vw,2rem)]">
          <p className="text-gray-600 text-[clamp(0.875rem,2.5vw,1rem)]">Please sign in the box below using your mouse or touch screen</p>

          {/* Signature Canvas */}
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: 'w-full h-[clamp(12rem,30vw,15rem)]'
              }}
              backgroundColor="rgba(255,255,255,1)"
              penColor="black"
            />
          </div>

          {/* Electronic Signature Legal Notice */}
          <div className="mt-[clamp(0.75rem,2vw,1rem)] p-[clamp(0.75rem,2vw,1rem)] bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-blue-800 flex items-start gap-[clamp(0.25rem,1vw,0.5rem)]">
              <Info className="h-[clamp(0.75rem,2vw,1rem)] w-[clamp(0.75rem,2vw,1rem)] mt-[clamp(0.125rem,0.5vw,0.25rem)] flex-shrink-0" />
              <span>
                {language === 'es'
                  ? 'Las firmas electrónicas tienen el mismo nivel de autenticidad y validez legal que las firmas físicas según la Ley ESIGN y UETA.'
                  : 'Electronic signatures have the same level of authenticity and legal validity as physical signatures under the ESIGN Act and UETA.'}
              </span>
            </p>
          </div>

          {/* Agreement Checkbox */}
          <div className="space-y-[clamp(0.75rem,2vw,1rem)]">
            <MobileCheckbox
              id="final-agreement"
              label={language === 'es'
                ? 'Certifico que toda la información proporcionada es verdadera, precisa y completa'
                : 'By signing above, I confirm all acknowledgements checked in the previous section and certify that all information provided is true and accurate'}
              checked={hasAgreed}
              onCheckedChange={(checked) => {
                setHasAgreed(!!checked)
                setSignatureError('')
              }}
            />
          </div>

          {/* Error Message */}
          {signatureError && (
            <Alert className="bg-red-50 border-red-200 p-[clamp(0.75rem,2vw,1rem)]">
              <AlertCircle className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-red-600" />
              <AlertDescription className="text-[clamp(0.875rem,2.5vw,1rem)] text-red-800">
                {signatureError}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-[clamp(0.75rem,2vw,1rem)] w-full">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                if (signatureRef.current) {
                  signatureRef.current.clear()
                  setSignatureError('')
                }
              }}
              className="w-full sm:flex-1 h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)] flex items-center justify-center"
            >
              {language === 'es' ? 'Borrar' : 'Clear Signature'}
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                if (signatureRef.current && !signatureRef.current.isEmpty() && hasAgreed) {
                  const signature = {
                    signature: signatureRef.current.toDataURL(),
                    signedAt: new Date().toISOString(),
                    ipAddress: 'xxx.xxx.xxx.xxx',
                    userAgent: window.navigator.userAgent
                  }
                  handleSignatureComplete(signature)
                } else {
                  if (signatureRef.current?.isEmpty()) {
                    setSignatureError(language === 'es' ? 'Por favor proporcione su firma' : 'Please provide your signature')
                  } else if (!hasAgreed) {
                    setSignatureError(language === 'es' ? 'Debe aceptar la declaración de certificación' : 'You must agree to the certification statement')
                  }
                }
              }}
              className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)] flex items-center justify-center gap-[clamp(0.5rem,1.5vw,0.75rem)]"
              disabled={isAdvancing}
            >
              <CheckCircle className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)]" />
              {isAdvancing ? (language === 'es' ? 'Procesando...' : 'Processing...') : t.submitButton}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Completion Status */}
      {isComplete && (
        <div className="bg-green-50 rounded-lg p-[clamp(1rem,3vw,1.5rem)] text-center">
          <CheckCircle className="h-[clamp(2.5rem,6vw,3rem)] w-[clamp(2.5rem,6vw,3rem)] text-green-600 mx-auto mb-[clamp(0.5rem,1.5vw,0.75rem)]" />
          <h3 className="text-[clamp(1rem,2.5vw,1.125rem)] font-semibold text-green-800 mb-[clamp(0.5rem,1.5vw,0.75rem)]">Onboarding Completed</h3>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-green-700">{t.completedNotice}</p>
        </div>
      )}

        {/* Legal Notice */}
        <div className="text-[clamp(0.625rem,1.5vw,0.75rem)] text-gray-500 border-t pt-[clamp(0.75rem,2vw,1rem)] px-[clamp(0.5rem,1.5vw,0rem)]">
          <p className="mb-[clamp(0.5rem,1.5vw,0.75rem)]"><strong>{t.legalNoticeTitle}</strong> {t.legalNoticeMessage}</p>
          <p>{t.complianceMessage}</p>
        </div>

      {/* Estimated Time */}
      <div className="text-center text-[clamp(0.75rem,2vw,0.875rem)] text-gray-500">
        <p>{t.estimatedTime}</p>
      </div>
      </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
