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
        {/* Mobile Optimized: Fluid spacing that scales with viewport */}
        <div className="space-y-[clamp(1.5rem,4vw,2rem)]">
        {/* Clean Header - Mobile Optimized with Fluid Typography */}
        <div className="text-center space-y-[clamp(0.5rem,2vw,1rem)] px-[clamp(1rem,3vw,1.5rem)]">
          <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-bold text-gray-900 leading-tight">
            {t.greeting}
          </h1>
          <p className="text-[clamp(1.25rem,4vw,2rem)] font-semibold text-blue-600 leading-snug">
            {t.propertyInfo}
          </p>
          <p className="text-[clamp(1rem,3vw,1.25rem)] text-gray-600 leading-relaxed">
            {t.title}
          </p>
        </div>

        {/* Completion Alert - Mobile Optimized */}
        {formData.welcomeAcknowledged && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)] text-green-600 flex-shrink-0" />
            <AlertDescription className="text-[clamp(0.875rem,2.5vw,1rem)] text-green-800 leading-relaxed">
              {t.completedMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Card - Mobile Optimized */}
        <Card className="card-transition">
          <CardContent className="pt-[clamp(1rem,3vw,1.5rem)] space-y-[clamp(1rem,3vw,1.5rem)]">
            {/* Time Estimate - Larger touch target on mobile */}
            <div className="flex items-center justify-center gap-[clamp(0.5rem,2vw,1rem)] text-blue-600 bg-blue-50 rounded-lg p-[clamp(0.75rem,3vw,1.25rem)]">
              <Clock className="h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)] flex-shrink-0" />
              <span className="text-[clamp(0.875rem,2.5vw,1rem)] font-medium">{t.estimatedTime}</span>
            </div>

            {/* Requirements List - Better spacing and readability on mobile */}
            <div>
              <h3 className="text-[clamp(0.875rem,2.5vw,1rem)] font-semibold text-gray-900 mb-[clamp(0.75rem,2vw,1rem)] flex items-center">
                <FileText className="h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)] mr-[clamp(0.5rem,2vw,0.75rem)] flex-shrink-0" />
                {t.whatYouNeed}
              </h3>
              <ul className="space-y-[clamp(0.75rem,2vw,1rem)]">
                {t.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-[clamp(0.5rem,2vw,0.75rem)]">
                    <span className="text-green-500 text-[clamp(1.25rem,3vw,1.5rem)] flex-shrink-0 leading-none mt-[clamp(0.125rem,0.5vw,0.25rem)]">✓</span>
                    <span className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-700 leading-relaxed">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Acknowledgement Section - Mobile Optimized with Larger Touch Targets */}
        <div className="mt-[clamp(1.5rem,4vw,2rem)] px-[clamp(1rem,3vw,1.5rem)]">
          <div className="max-w-2xl mx-auto">
            <div className={cn(
              "relative rounded-xl border-2 p-[clamp(1rem,4vw,1.5rem)] transition-all duration-300",
              formData.welcomeAcknowledged
                ? "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg"
                : "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-300 hover:shadow-md"
            )}>
              {/* Decorative corner accent - Scales with viewport */}
              <div className={cn(
                "absolute top-0 right-0 w-[clamp(3rem,8vw,4rem)] h-[clamp(3rem,8vw,4rem)] rounded-bl-3xl transition-colors duration-300",
                formData.welcomeAcknowledged ? "bg-green-100" : "bg-blue-100"
              )} />

              <div className="relative">
                <div className="flex items-start gap-[clamp(0.75rem,3vw,1rem)]">
                  {/* Checkbox with larger touch target on mobile */}
                  <div className="flex-shrink-0 mt-[clamp(0.125rem,0.5vw,0.25rem)]">
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
                        "transition-all duration-200",
                        // Larger on mobile (24px), smaller on desktop (20px) - always ≥ 20px for accessibility
                        "h-[clamp(1.5rem,4vw,1.75rem)] w-[clamp(1.5rem,4vw,1.75rem)]",
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
                        // Fluid font size - always ≥ 14px for readability
                        "text-[clamp(0.875rem,2.5vw,1rem)] font-medium leading-relaxed cursor-pointer transition-colors duration-200",
                        formData.welcomeAcknowledged ? "text-green-800" : "text-blue-800 hover:text-blue-900"
                      )}
                    >
                      {language === 'es'
                        ? 'He revisado qué esperar y estoy listo para comenzar mi proceso de incorporación.'
                        : "I've reviewed what to expect and I'm ready to start my onboarding process."}
                    </Label>

                    {formData.welcomeAcknowledged && (
                      <div className="mt-[clamp(0.5rem,2vw,0.75rem)] flex items-center gap-[clamp(0.5rem,2vw,0.75rem)] text-green-700">
                        <CheckCircle className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] flex-shrink-0" />
                        <span className="text-[clamp(0.75rem,2vw,0.875rem)] font-medium">
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
              <div className="mt-[clamp(0.75rem,2vw,1rem)] text-center px-[clamp(0.5rem,2vw,1rem)]">
                <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-600 flex items-center justify-center gap-[clamp(0.5rem,2vw,0.75rem)]">
                  <span className="w-[clamp(0.5rem,1.5vw,0.625rem)] h-[clamp(0.5rem,1.5vw,0.625rem)] bg-blue-400 rounded-full animate-pulse flex-shrink-0"></span>
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