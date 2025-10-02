import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import HumanTraffickingAwareness from '@/components/HumanTraffickingAwareness'
import ReviewAndSign from '@/components/ReviewAndSign'
import { CheckCircle, GraduationCap, Shield, AlertTriangle, FileText } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'
import { getApiUrl } from '@/config/api'
import SimplePDFViewer from '@/components/SimplePDFViewer'

export default function TraffickingAwarenessStep({
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
  
  const [trainingComplete, setTrainingComplete] = useState(false)
  const [certificateData, setCertificateData] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [trainingProgress, setTrainingProgress] = useState<any>(null)

  // Auto-save data
  const autoSaveData = {
    trainingComplete,
    certificateData,
    showReview,
    isSigned,
    pdfUrl
  }

  // Auto-save hook
  const { saveStatus } = useAutoSave(autoSaveData, {
    onSave: async (data) => {
    await saveProgress(currentStep.id, data)
    }
  })

  // Load existing data
  useEffect(() => {
    const savedData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        if (parsed.isSigned) {
          setIsSigned(true)
          setPdfUrl(parsed.pdfUrl)
          setTrainingComplete(true)
          setCertificateData(parsed.certificateData)
        } else if (parsed.trainingComplete) {
          setTrainingComplete(true)
          setCertificateData(parsed.certificateData)
        }
      } catch (e) {
        console.error('Failed to parse saved trafficking awareness data:', e)
      }
    }

    // Load training progress (video/section state)
    const savedProgress = sessionStorage.getItem(`${currentStep.id}_training_progress`)
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress)
        setTrainingProgress(parsed)
      } catch (e) {
        console.error('Failed to parse training progress:', e)
      }
    }

    if (progress.completedSteps.includes(currentStep.id)) {
      setIsSigned(true)
      setTrainingComplete(true)
    }
  }, [currentStep.id, progress.completedSteps])

  const handleTrainingComplete = async (data: any) => {
    setTrainingComplete(true)
    setCertificateData(data)
    setShowReview(true)

    // Save to session storage but DON'T mark complete yet
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify({
      trainingComplete: true,
      certificateData: data,
      showReview: true,
      isSigned: false
    }))
  }

  const handleSign = async (signatureData: any) => {
    setIsSigned(true)

    const stepData = {
      trainingComplete: true,
      certificate: certificateData,
      signed: true,
      signatureData,
      completedAt: new Date().toISOString()
    }

    // Save signed status to session storage
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify({
      ...stepData,
      isSigned: true,
      pdfUrl: signatureData.pdfUrl
    }))

    if (signatureData.pdfUrl) {
      setPdfUrl(signatureData.pdfUrl)
    }

    await markStepComplete(currentStep.id, stepData)
    setShowReview(false)
  }

  const translations = {
    en: {
      title: 'Human Trafficking Awareness Training',
      description: 'Complete this mandatory training to learn about human trafficking awareness and your role in recognizing and reporting suspicious activities in the hospitality industry.',
      federalRequirement: 'Federal Requirement:',
      federalNotice: 'This training is mandatory for all hospitality employees under federal anti-trafficking laws and industry best practices.',
      completionMessage: 'Human trafficking awareness training completed successfully. Certificate generated.',
      trainingModule: 'Training Module',
      estimatedTime: 'Estimated time: 8-10 minutes',
      reviewTitle: 'Review & Sign Training Certificate',
      reviewDescription: 'Review your training completion certificate and sign to acknowledge',
      certificateTitle: 'Training Completion Certificate',
      viewCertificate: 'View Your Signed Certificate'
    },
    es: {
      title: 'Capacitación sobre Concientización del Tráfico Humano',
      description: 'Complete esta capacitación obligatoria para aprender sobre la concientización del tráfico humano y su papel en el reconocimiento y reporte de actividades sospechosas en la industria hotelera.',
      federalRequirement: 'Requisito Federal:',
      federalNotice: 'Esta capacitación es obligatoria para todos los empleados de hospitalidad bajo las leyes federales contra el tráfico y las mejores prácticas de la industria.',
      completionMessage: 'Capacitación sobre concientización del tráfico humano completada exitosamente. Certificado generado.',
      trainingModule: 'Módulo de Capacitación',
      estimatedTime: 'Tiempo estimado: 8-10 minutos',
      reviewTitle: 'Revisar y Firmar Certificado de Capacitación',
      reviewDescription: 'Revise su certificado de finalización de capacitación y firme para reconocer',
      certificateTitle: 'Certificado de Finalización de Capacitación',
      viewCertificate: 'Ver Su Certificado Firmado'
    }
  }

  const t = translations[language]


  // Three-state rendering: Completed PDF view → Review & Sign → Training Module

  // State 1: Already signed - show PDF viewer
  if (isSigned && pdfUrl) {
    return (
      <StepContainer saveStatus={saveStatus} canProceed={true}>
        <StepContentWrapper>
          <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg mb-3 sm:mb-4">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t.viewCertificate}</h1>
              <p className="text-sm sm:text-base text-gray-600">{t.completionMessage}</p>
            </div>

            {/* PDF Viewer */}
            <div className="max-w-4xl mx-auto">
              <SimplePDFViewer pdfUrl={pdfUrl} />
            </div>
          </div>
        </StepContentWrapper>
      </StepContainer>
    )
  }

  // State 2: Training complete, show review & sign
  if (showReview && trainingComplete && certificateData) {
    return (
      <StepContainer saveStatus={saveStatus} canProceed={false}>
        <StepContentWrapper>
          <div className="space-y-6 sm:space-y-8 px-2 sm:px-0">
            {/* Professional Header */}
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg mb-3 sm:mb-4">
                <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
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
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-blue-300"></div>
              </div>
            </div>

            {/* Review and Sign Component */}
            <div className="max-w-4xl mx-auto">
              <ReviewAndSign
                formType="human-trafficking"
                formData={certificateData}
                formTitle={t.certificateTitle}
                documentName="Human Trafficking Awareness Training Certificate"
                signerName={employee?.firstName + ' ' + employee?.lastName || 'Employee'}
                signerTitle={employee?.position}
                onSign={handleSign}
                onEdit={() => setShowReview(false)}
                acknowledgments={[
                  language === 'en'
                    ? 'I have completed the required Human Trafficking Awareness Training'
                    : 'He completado la Capacitación de Concientización sobre Tráfico Humano requerida',
                  language === 'en'
                    ? 'I understand how to identify potential signs of human trafficking'
                    : 'Entiendo cómo identificar posibles signos de tráfico humano',
                  language === 'en'
                    ? 'I know how to report suspected human trafficking incidents'
                    : 'Sé cómo reportar incidentes sospechosos de tráfico humano',
                  language === 'en'
                    ? 'I understand this training is required by federal law'
                    : 'Entiendo que esta capacitación es requerida por ley federal'
                ]}
                language={language}
                description={t.reviewDescription}
                usePDFPreview={true}
                pdfEndpoint={`${getApiUrl()}/onboarding/${employee?.id || 'test-employee'}/human-trafficking/generate-pdf`}
                federalCompliance={{
                  formName: 'Human Trafficking Awareness Training Certificate',
                  requiresWitness: false,
                  retentionPeriod: '3 years after completion'
                }}
              />
            </div>
          </div>
        </StepContentWrapper>
      </StepContainer>
    )
  }

  // State 3: Default - show training module
  return (
    <StepContainer saveStatus={saveStatus} canProceed={false}>
      <StepContentWrapper>
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* Step Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">{t.description}</p>
        </div>

        {/* Federal Requirement Notice */}
        <Alert className="bg-red-50 border-red-200 p-3 sm:p-4">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
          <AlertDescription className="text-xs sm:text-sm text-red-800">
            <strong>{t.federalRequirement}</strong> {t.federalNotice}
          </AlertDescription>
        </Alert>

        {/* Training Module Card */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span>{t.trainingModule}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <HumanTraffickingAwareness
              onTrainingComplete={handleTrainingComplete}
              language={language}
              stepId={currentStep.id}
              initialProgress={trainingProgress}
            />
          </CardContent>
        </Card>

        {/* Time Estimate */}
        <div className="text-center text-xs sm:text-sm text-gray-500">
          <p>{t.estimatedTime}</p>
        </div>
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
