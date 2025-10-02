import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { CheckCircle, Clock, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
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
    <StepContainer saveStatus={saveStatus} canProceed={formData.welcomeAcknowledged}>
      <StepContentWrapper>
        <div className="space-y-6">
        {/* Clean Header */}
        <div className="text-center space-y-2 px-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{t.greeting}</h1>
          <p className="text-lg sm:text-xl md:text-2xl font-semibold text-blue-600">{t.propertyInfo}</p>
          <p className="text-base sm:text-lg text-gray-600">{t.title}</p>
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
            <div className="flex items-center justify-center space-x-2 text-blue-600 bg-blue-50 rounded-lg p-3 sm:p-4">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="text-sm sm:text-base font-medium">{t.estimatedTime}</span>
            </div>

            {/* Requirements List */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                {t.whatYouNeed}
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                {t.requirements.map((req, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2 text-lg sm:text-xl flex-shrink-0">✓</span>
                    <span className="text-sm sm:text-base text-gray-700">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Acknowledgement Section */}
        <div className="mt-6 sm:mt-8 px-4">
          <div className="max-w-2xl mx-auto">
            <div className={cn(
              "relative rounded-xl border-2 p-4 sm:p-6 transition-all duration-300",
              formData.welcomeAcknowledged
                ? "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg"
                : "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-300 hover:shadow-md"
            )}>
              {/* Decorative corner accent */}
              <div className={cn(
                "absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 rounded-bl-3xl transition-colors duration-300",
                formData.welcomeAcknowledged ? "bg-green-100" : "bg-blue-100"
              )} />

              <div className="relative">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                    <Checkbox
                      id="welcome-acknowledgement"
                      checked={formData.welcomeAcknowledged}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          welcomeAcknowledged: Boolean(checked)
                        }))
                      }
                      className={cn(
                        "transition-all duration-200 h-6 w-6 sm:h-5 sm:w-5",
                        formData.welcomeAcknowledged
                          ? "border-green-500 data-[state=checked]:bg-green-600"
                          : "border-blue-400 hover:border-blue-500"
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor="welcome-acknowledgement"
                      className={cn(
                        "text-sm sm:text-base font-medium leading-relaxed cursor-pointer transition-colors duration-200",
                        formData.welcomeAcknowledged ? "text-green-800" : "text-blue-800 hover:text-blue-900"
                      )}
                    >
                      {language === 'es'
                        ? 'He revisado qué esperar y estoy listo para comenzar mi proceso de incorporación.'
                        : "I've reviewed what to expect and I'm ready to start my onboarding process."}
                    </Label>

                    {formData.welcomeAcknowledged && (
                      <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs sm:text-sm text-green-700">
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="font-medium">
                          {language === 'es'
                            ? '¡Listo para continuar! Haga clic en Siguiente para continuar.'
                            : 'Ready to proceed! Click Next to continue.'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!formData.welcomeAcknowledged && (
              <div className="mt-3 sm:mt-4 text-center px-2">
                <p className="text-xs sm:text-sm text-gray-600 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse flex-shrink-0"></span>
                  <span>
                    {language === 'es'
                      ? 'Marque la casilla de arriba para habilitar el botón Siguiente'
                      : 'Please check the box above to enable the Next button'}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}