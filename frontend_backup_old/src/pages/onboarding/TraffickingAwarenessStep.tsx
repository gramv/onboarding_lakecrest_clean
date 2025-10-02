import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import HumanTraffickingAwareness from '@/components/HumanTraffickingAwareness'
import { CheckCircle, GraduationCap, Shield, AlertTriangle } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'

export default function TraffickingAwarenessStep({
  currentStep,
  progress,
  markStepComplete,
  saveProgress,
  language = 'en',
  employee,
  property
}: StepProps) {
  
  const [trainingComplete, setTrainingComplete] = useState(false)
  const [certificateData, setCertificateData] = useState(null)

  // Auto-save data
  const autoSaveData = {
    trainingComplete,
    certificateData
  }

  // Auto-save hook
  const { saveStatus } = useAutoSave(autoSaveData, {
    onSave: async (data) => {
    await saveProgress(currentStep.id, data)
    }
  })

  // Load existing data
  useEffect(() => {
    if (progress.completedSteps.includes(currentStep.id)) {
      setTrainingComplete(true)
    }
  }, [currentStep.id, progress.completedSteps])

  const handleTrainingComplete = async (data: any) => {
    setTrainingComplete(true)
    setCertificateData(data)
    
    const stepData = {
      trainingComplete: true,
      certificate: data,
      completedAt: new Date().toISOString()
    }
    await markStepComplete(currentStep.id, stepData)
  }

  const translations = {
    en: {
      title: 'Human Trafficking Awareness Training',
      description: 'Complete this mandatory training to learn about human trafficking awareness and your role in recognizing and reporting suspicious activities in the hospitality industry.',
      federalRequirement: 'Federal Requirement:',
      federalNotice: 'This training is mandatory for all hospitality employees under federal anti-trafficking laws and industry best practices.',
      completionMessage: 'Human trafficking awareness training completed successfully. Certificate generated.',
      trainingModule: 'Training Module',
      estimatedTime: 'Estimated time: 8-10 minutes'
    },
    es: {
      title: 'Capacitación sobre Concientización del Tráfico Humano',
      description: 'Complete esta capacitación obligatoria para aprender sobre la concientización del tráfico humano y su papel en el reconocimiento y reporte de actividades sospechosas en la industria hotelera.',
      federalRequirement: 'Requisito Federal:',
      federalNotice: 'Esta capacitación es obligatoria para todos los empleados de hospitalidad bajo las leyes federales contra el tráfico y las mejores prácticas de la industria.',
      completionMessage: 'Capacitación sobre concientización del tráfico humano completada exitosamente. Certificado generado.',
      trainingModule: 'Módulo de Capacitación',
      estimatedTime: 'Tiempo estimado: 8-10 minutos'
    }
  }

  const t = translations[language]

  return (
    <StepContainer saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-6">
        {/* Step Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <GraduationCap className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-gray-600 max-w-3xl mx-auto">{t.description}</p>
        </div>

        {/* Federal Requirement Notice */}
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{t.federalRequirement}</strong> {t.federalNotice}
          </AlertDescription>
        </Alert>

        {/* Completion Status */}
        {trainingComplete && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t.completionMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Training Module Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span>{t.trainingModule}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HumanTraffickingAwareness
              onTrainingComplete={handleTrainingComplete}
              language={language}
            />
          </CardContent>
        </Card>

        {/* Time Estimate */}
        <div className="text-center text-sm text-gray-500">
          <p>{t.estimatedTime}</p>
        </div>
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}