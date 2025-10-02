import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Clock, FileText } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'

export default function WelcomeStep({
  currentStep, 
  progress, 
  markStepComplete, 
  saveProgress, 
  language = 'en', 
  employee,
  property
}: StepProps) {
  
  const [formData, setFormData] = useState({
    welcomeAcknowledged: false,
    languagePreference: language
  })

  // Auto-save hook
  const { saveStatus } = useAutoSave(formData, {
    onSave: async (data) => {
      await saveProgress(currentStep.id, data)
    }
  })

  // Load existing data
  useEffect(() => {
    const isCompleted = progress.completedSteps.includes(currentStep.id)
    if (isCompleted) {
      setFormData(prev => ({ ...prev, welcomeAcknowledged: true }))
    }
  }, [progress.completedSteps, currentStep.id])

  // Mark complete when acknowledged
  useEffect(() => {
    if (formData.welcomeAcknowledged && !progress.completedSteps.includes(currentStep.id)) {
      markStepComplete(currentStep.id, formData)
    }
  }, [formData.welcomeAcknowledged, currentStep.id, markStepComplete, progress.completedSteps])

  const translations = {
    en: {
      greeting: `Welcome, ${employee?.firstName || 'Team Member'}!`,
      propertyInfo: property?.name || 'Our Company',
      title: 'Let\'s get you started',
      description: 'Complete your onboarding in about 45 minutes',
      whatYouNeed: 'What you\'ll need:',
      requirements: [
        'Government ID (Driver\'s License or Passport)',
        'Social Security Card',
        'Bank account information',
        'Emergency contact details'
      ],
      estimatedTime: 'Estimated time: 45-60 minutes',
      completedMessage: 'Welcome step completed! Click Next to continue.'
    },
    es: {
      greeting: `¡Bienvenido, ${employee?.firstName || 'Miembro del Equipo'}!`,
      propertyInfo: property?.name || 'Nuestra Empresa',
      title: 'Comencemos',
      description: 'Complete su incorporación en aproximadamente 45 minutos',
      whatYouNeed: 'Lo que necesitará:',
      requirements: [
        'Identificación del gobierno (Licencia o Pasaporte)',
        'Tarjeta de Seguro Social',
        'Información bancaria',
        'Datos de contacto de emergencia'
      ],
      estimatedTime: 'Tiempo estimado: 45-60 minutos',
      completedMessage: '¡Paso de bienvenida completado! Haga clic en Siguiente para continuar.'
    }
  }

  const t = translations[language]

  return (
    <StepContainer saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-6">
        {/* Clean Header */}
        <div className="text-center space-y-2">
          <h1 className="text-heading-primary">{t.greeting}</h1>
          <p className="text-heading-secondary text-blue-600">{t.propertyInfo}</p>
          <p className="text-body-large text-gray-600">{t.title}</p>
        </div>

        {/* Completion Alert */}
        {formData.welcomeAcknowledged && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-body-default text-green-800">
              {t.completedMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Card */}
        <Card className="card-transition">
          <CardContent className="pt-6 space-y-4">
            {/* Time Estimate */}
            <div className="flex items-center justify-center space-x-2 text-blue-600 bg-blue-50 rounded-lg p-3">
              <Clock className="h-5 w-5" />
              <span className="text-body-small font-medium">{t.estimatedTime}</span>
            </div>

            {/* Requirements List */}
            <div>
              <h3 className="text-body-default font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                {t.whatYouNeed}
              </h3>
              <ul className="space-y-2">
                {t.requirements.map((req, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-body-default text-gray-700">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Auto-acknowledge after viewing */}
        {!formData.welcomeAcknowledged && (
          <div className="text-center mt-4">
            <button
              onClick={() => setFormData(prev => ({ ...prev, welcomeAcknowledged: true }))}
              className="text-body-small text-blue-600 hover:text-blue-700 underline"
            >
              I understand the requirements
            </button>
          </div>
        )}
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}