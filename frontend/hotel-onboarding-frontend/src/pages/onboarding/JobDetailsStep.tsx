import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, MessageCircle } from 'lucide-react'
import { CheckCircle, Briefcase, Calendar, DollarSign, Building } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'

export default function JobDetailsStep({
  currentStep,
  progress,
  markStepComplete,
  saveProgress,
  language = 'en',
  employee,
  property
}: StepProps) {
  
  const [acknowledged, setAcknowledged] = useState(false)
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  // Form data for auto-save
  const formData = {
    acknowledged,
    acknowledgedAt,
    isCompleting
  }

  // Auto-save hook
  const { saveStatus } = useAutoSave(formData, {
    onSave: async (data) => {
      await saveProgress(currentStep.id, data)
    }
  })

  // Load existing data
  useEffect(() => {
    if (progress.completedSteps.includes(currentStep.id)) {
      setAcknowledged(true)
      setAcknowledgedAt(new Date().toISOString())
    }
  }, [currentStep.id, progress.completedSteps])

  // Auto-mark complete when acknowledged (with proper async handling)
  useEffect(() => {
    const completeStep = async () => {
      if (acknowledged && !progress.completedSteps.includes(currentStep.id) && !isCompleting) {
        console.log('🎯 JobDetailsStep: Auto-completing step...')
        setIsCompleting(true)
        try {
          await markStepComplete(currentStep.id, formData)
          console.log('✅ JobDetailsStep: Step completed successfully')
        } catch (error) {
          console.error('❌ JobDetailsStep: Failed to complete step:', error)
          // Reset acknowledged state on error
          setAcknowledged(false)
          setAcknowledgedAt(null)
        } finally {
          setIsCompleting(false)
        }
      }
    }

    completeStep()
  }, [acknowledged, currentStep.id, formData, markStepComplete, progress.completedSteps, isCompleting])

  const handleAcknowledgment = async (checked: boolean) => {
    console.log('🖱️ JobDetailsStep: Acknowledgment changed:', checked)

    if (checked && !isCompleting) {
      setAcknowledged(checked)
      setAcknowledgedAt(new Date().toISOString())
      // The useEffect above will handle the completion
    } else if (!checked) {
      setAcknowledged(false)
      setAcknowledgedAt(null)
    }
  }

  // Use actual pay rate from employee data, fallback to 0 if not available
  const payRate = employee?.payRate || employee?.hourlyRate || 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const translations = {
    en: {
      title: 'Review Your Job Offer',
      description: 'Please review the job offer details provided by your manager.',
      completedNotice: 'Job offer accepted successfully! Click Next to continue.',
      propertyInfo: 'Property Information',
      positionInfo: 'Position Details',
      position: 'Job Title',
      department: 'Department',
      employmentDetails: 'Employment Terms',
      startDate: 'Start Date',
      payRate: 'Pay Rate',
      acknowledgment: 'Job Offer Acceptance',
      acknowledgmentText: 'I have reviewed and accept all job details above.',
      acknowledgedOn: 'Acknowledged on'
    },
    es: {
      title: 'Revise Su Oferta de Trabajo',
      description: 'Revise los detalles de la oferta de trabajo proporcionados por su gerente.',
      completedNotice: '¡Oferta de trabajo aceptada exitosamente! Haga clic en Siguiente para continuar.',
      propertyInfo: 'Información de la Propiedad',
      positionInfo: 'Detalles de la Posición',
      position: 'Título del Trabajo',
      department: 'Departamento',
      employmentDetails: 'Términos de Empleo',
      startDate: 'Fecha de Inicio',
      payRate: 'Tarifa de Pago',
      acknowledgment: 'Aceptación de Oferta de Trabajo',
      acknowledgmentText: 'He revisado y acepto todos los detalles del trabajo anteriores.',
      acknowledgedOn: 'Reconocido el'
    }
  }

  const t = translations[language]

  const canAdvance = acknowledged && !isCompleting

  return (
    <StepContainer saveStatus={isCompleting ? 'saving' : saveStatus} canProceed={canAdvance}>
      <StepContentWrapper>
        <div className="space-y-6">
        {/* Step Header */}
        <div className="text-center px-4">
          <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
            <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">{t.description}</p>
        </div>

        {/* Guidance Banner */}
        <Alert className={cn(
          "p-3 sm:p-4",
          acknowledged ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
        )}>
          {acknowledged ? (
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
          )}
          <AlertDescription className={cn(
            "text-xs sm:text-sm leading-snug",
            acknowledged ? 'text-green-800' : 'text-blue-800'
          )}>
            {acknowledged ? t.completedNotice : 'Review the offer details carefully. Accept below to enable the Next button.'}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 px-2 sm:px-0">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Property Information */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Building className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                  <span>{t.propertyInfo}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-6 pt-0 sm:pt-0">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Hotel Name</p>
                  <p className="font-semibold text-sm sm:text-base">{property?.name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Location</p>
                  <p className="text-xs sm:text-sm leading-relaxed">{property?.address || 'Not specified'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Position Information */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                  <span>{t.positionInfo}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-6 pt-0 sm:pt-0">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">{t.position}</p>
                  <p className="font-semibold text-sm sm:text-base">{employee?.position || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">{t.department}</p>
                  <p className="text-sm sm:text-base">{employee?.department || 'Not specified'}</p>
                </div>
                {employee?.employmentType && (
                  <div>
                    <Badge variant="secondary" className="text-xs">{employee.employmentType}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Employment Terms */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
                  <span>{t.employmentDetails}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-6 pt-0 sm:pt-0">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">{t.startDate}</p>
                  <p className="font-semibold text-sm sm:text-base">{formatDate(employee?.startDate || '')}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">{t.payRate}</p>
                  <p className="font-semibold text-sm sm:text-base">
                    {payRate ? (
                      <>
                        {formatCurrency(payRate)}
                        <span className="text-xs sm:text-sm text-gray-500 ml-1">/ hour</span>
                      </>
                    ) : (
                      'Not specified'
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Job Offer Acceptance - Enhanced Design */}
        <div className="mt-6 sm:mt-8 px-2 sm:px-0">
          <div className="max-w-4xl mx-auto">
            <Card className={cn(
              "relative border-2 transition-all duration-300 overflow-hidden",
              acknowledged
                ? "border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 shadow-lg"
                : "border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 hover:border-blue-300 hover:shadow-md"
            )}>
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-bl from-current rounded-full -translate-y-12 sm:-translate-y-16 translate-x-12 sm:translate-x-16" />
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-tr from-current rounded-full translate-y-8 sm:translate-y-12 -translate-x-8 sm:-translate-x-12" />
              </div>

              <CardHeader className="relative pb-3 sm:pb-4 p-4 sm:p-6">
                <CardTitle className={cn(
                  "flex items-center space-x-2 sm:space-x-3 text-base sm:text-lg font-semibold transition-colors duration-200",
                  acknowledged ? "text-green-800" : "text-blue-800"
                )}>
                  <div className={cn(
                    "p-1.5 sm:p-2 rounded-full transition-colors duration-200 flex-shrink-0",
                    acknowledged ? "bg-green-100" : "bg-blue-100"
                  )}>
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span>{t.acknowledgment}</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="relative pt-0 p-4 sm:p-6">
                <div className={cn(
                  "rounded-xl p-4 sm:p-6 border transition-all duration-300",
                  acknowledged
                    ? "border-green-200 bg-white/70 shadow-sm"
                    : "border-blue-200 bg-white/70 hover:bg-white/90"
                )}>
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                      <Checkbox
                        id="jobOfferAcknowledgment"
                        checked={acknowledged}
                        onCheckedChange={handleAcknowledgment}
                        disabled={isCompleting}
                        className={cn(
                          "transition-all duration-200 h-6 w-6 sm:h-5 sm:w-5 sm:scale-110",
                          isCompleting && "opacity-50 cursor-not-allowed",
                          acknowledged
                            ? "border-green-500 data-[state=checked]:bg-green-600"
                            : "border-blue-400 hover:border-blue-500"
                        )}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor="jobOfferAcknowledgment"
                        className={cn(
                          "text-sm sm:text-base font-medium leading-relaxed block transition-colors duration-200",
                          isCompleting ? "cursor-wait opacity-75" : "cursor-pointer",
                          acknowledged ? "text-green-800" : "text-blue-800 hover:text-blue-900"
                        )}
                      >
                        {isCompleting ? "Processing acceptance..." : t.acknowledgmentText}
                      </label>

                      {acknowledged && acknowledgedAt && !isCompleting && (
                        <div className="mt-3 sm:mt-4 flex items-start gap-2 text-xs sm:text-sm text-green-700 bg-green-100/50 rounded-lg p-3">
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-medium">Job offer accepted!</p>
                            <p className="text-[11px] sm:text-xs text-green-600 mt-1 break-words">
                              {t.acknowledgedOn}: {new Date(acknowledgedAt).toLocaleDateString()} at {new Date(acknowledgedAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {isCompleting && (
                        <div className="mt-3 sm:mt-4 flex items-start gap-2 text-xs sm:text-sm text-blue-700 bg-blue-100/50 rounded-lg p-3">
                          <div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5"></div>
                          <div className="min-w-0">
                            <p className="font-medium">Saving your acceptance...</p>
                            <p className="text-[11px] sm:text-xs text-blue-600 mt-1">Please wait while we process your job offer acceptance.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!acknowledged && (
                  <div className="mt-3 sm:mt-4 text-center">
                    <p className="text-xs sm:text-sm text-gray-600 flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse flex-shrink-0"></span>
                      <span className="leading-snug">Please review and accept the job offer to continue</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 text-xs sm:text-sm text-gray-600 mx-2 sm:mx-0">
          <div className="flex items-start sm:items-center gap-2">
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0 mt-0.5 sm:mt-0" />
            <span className="leading-snug">Need help? Contact HR for clarification before accepting.</span>
          </div>
          <a
            href="mailto:hr@hotel.com"
            className="rounded border border-blue-600 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 text-center min-h-[44px] flex items-center justify-center"
          >
            hr@hotel.com
          </a>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs sm:text-sm text-blue-800 leading-snug mx-2 sm:mx-0">
          Once you continue, you'll review five short policy sections. We'll guide you through them one by one.
        </div>
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}