import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Briefcase, Calendar, DollarSign, Building, User } from 'lucide-react'
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

  // Form data for auto-save
  const formData = {
    acknowledged,
    acknowledgedAt
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

  // Auto-mark complete when acknowledged
  useEffect(() => {
    if (acknowledged && !progress.completedSteps.includes(currentStep.id)) {
      markStepComplete(currentStep.id, formData)
    }
  }, [acknowledged, currentStep.id, formData, markStepComplete, progress.completedSteps])

  const handleAcknowledgment = (checked: boolean) => {
    setAcknowledged(checked)
    if (checked) {
      setAcknowledgedAt(new Date().toISOString())
    } else {
      setAcknowledgedAt(null)
    }
  }

  // Pay rate for display
  const payRate = 18.50 // Demo rate

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

  return (
    <StepContainer saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-6">
        {/* Step Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Briefcase className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">{t.description}</p>
        </div>

        {/* Completion Notice */}
        {acknowledged && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t.completedNotice}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Property Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <span>{t.propertyInfo}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Hotel Name</p>
                  <p className="font-semibold">{property?.name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="text-sm">{property?.address || 'Not specified'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Position Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-green-600" />
                  <span>{t.positionInfo}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">{t.position}</p>
                  <p className="font-semibold">{employee?.position || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t.department}</p>
                  <p>{employee?.department || 'Not specified'}</p>
                </div>
                <div>
                  <Badge variant="secondary">Full Time</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Employment Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <span>{t.employmentDetails}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">{t.startDate}</p>
                  <p className="font-semibold">{formatDate(employee?.startDate || '')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t.payRate}</p>
                  <p className="font-semibold">
                    {formatCurrency(payRate)}
                    <span className="text-sm text-gray-500 ml-1">/ hour</span>
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Job Offer Acceptance */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800">
              <CheckCircle className="h-5 w-5" />
              <span>{t.acknowledgment}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="jobOfferAcknowledgment"
                checked={acknowledged}
                onCheckedChange={handleAcknowledgment}
                className="mt-1"
                disabled={progress.completedSteps.includes(currentStep.id)}
              />
              <label
                htmlFor="jobOfferAcknowledgment"
                className="text-sm text-blue-800 leading-relaxed cursor-pointer flex-1"
              >
                {t.acknowledgmentText}
              </label>
            </div>
            {acknowledgedAt && (
              <p className="text-xs text-blue-600 mt-2">
                {t.acknowledgedOn}: {new Date(acknowledgedAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}