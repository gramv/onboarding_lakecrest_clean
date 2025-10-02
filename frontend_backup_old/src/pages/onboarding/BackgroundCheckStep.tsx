import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle, Shield, AlertTriangle, FileCheck } from 'lucide-react'

interface StepProps {
  currentStep: any
  progress: any
  markStepComplete: (stepId: string, data?: any) => void
  saveProgress: (stepId: string, data?: any) => void
  language: 'en' | 'es'
  employee?: any
  property?: any
}

export default function BackgroundCheckStep(props: StepProps) {
  const { currentStep, progress, markStepComplete, saveProgress, language = 'en' } = props
  
  const [isComplete, setIsComplete] = useState(false)
  const [consent, setConsent] = useState(false)
  const [acknowledgments, setAcknowledgments] = useState([false, false, false])

  useEffect(() => {
    const existingData = progress.stepData?.['background_check']
    if (existingData) {
      setConsent(existingData.consent || false)
      setAcknowledgments(existingData.acknowledgments || [false, false, false])
      setIsComplete(existingData.completed || false)
    }
  }, [progress])

  const handleSubmit = () => {
    if (!consent || !acknowledgments.every(ack => ack)) {
      alert('Please provide consent and complete all acknowledgments.')
      return
    }

    setIsComplete(true)
    const stepData = {
      consent,
      acknowledgments,
      completed: true,
      completedAt: new Date().toISOString(),
      consentTimestamp: new Date().toISOString()
    }
    markStepComplete('background_check', stepData)
    saveProgress()
  }

  const translations = {
    en: {
      title: 'Background Check Authorization',
      subtitle: 'Authorize Employment Background Verification',
      description: 'As part of our hiring process, we need your authorization to conduct a background check.',
      completedNotice: 'Background check authorization completed successfully.',
      consentText: 'I authorize [Company Name] to conduct a background check, including but not limited to verification of employment history, criminal records, and other relevant information as permitted by law.',
      acknowledgment1: 'I understand that this background check is a condition of employment.',
      acknowledgment2: 'I have been provided with information about my rights under the Fair Credit Reporting Act (FCRA).',
      acknowledgment3: 'I understand that false information on my application may result in rejection or termination.',
      authorizeButton: 'Authorize Background Check',
      estimatedTime: 'Estimated time: 3 minutes'
    },
    es: {
      title: 'Autorización de Verificación de Antecedentes',
      subtitle: 'Autorice la Verificación de Antecedentes de Empleo',
      description: 'Como parte de nuestro proceso de contratación, necesitamos su autorización para realizar una verificación de antecedentes.',
      completedNotice: 'Autorización de verificación de antecedentes completada exitosamente.',
      consentText: 'Autorizo a [Nombre de la Empresa] a realizar una verificación de antecedentes, incluyendo pero no limitado a la verificación del historial de empleo, registros criminales, y otra información relevante según lo permitido por la ley.',
      acknowledgment1: 'Entiendo que esta verificación de antecedentes es una condición del empleo.',
      acknowledgment2: 'Se me ha proporcionado información sobre mis derechos bajo la Ley de Informes de Crédito Justos (FCRA).',
      acknowledgment3: 'Entiendo que información falsa en mi solicitud puede resultar en rechazo o terminación.',
      authorizeButton: 'Autorizar Verificación de Antecedentes',
      estimatedTime: 'Tiempo estimado: 3 minutos'
    }
  }

  const t = translations[language]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        </div>
        <p className="text-gray-600 max-w-3xl mx-auto">{t.description}</p>
      </div>

      {isComplete && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{t.completedNotice}</AlertDescription>
        </Alert>
      )}

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileCheck className="h-5 w-5 text-blue-600" />
            <span>{t.subtitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={setConsent}
              className="mt-1"
            />
            <label htmlFor="consent" className="text-sm text-blue-800 leading-relaxed cursor-pointer">
              {t.consentText}
            </label>
          </div>

          {[t.acknowledgment1, t.acknowledgment2, t.acknowledgment3].map((ack, index) => (
            <div key={index} className="flex items-start space-x-3">
              <Checkbox
                id={`ack-${index}`}
                checked={acknowledgments[index]}
                onCheckedChange={(checked) => {
                  const newAcks = [...acknowledgments]
                  newAcks[index] = checked as boolean
                  setAcknowledgments(newAcks)
                }}
                className="mt-1"
              />
              <label htmlFor={`ack-${index}`} className="text-sm text-blue-800 leading-relaxed cursor-pointer">
                {ack}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={!consent || !acknowledgments.every(ack => ack) || isComplete}
          size="lg"
          className="px-8 py-3 text-lg font-semibold"
        >
          {isComplete ? (
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Authorization Complete</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>{t.authorizeButton}</span>
            </div>
          )}
        </Button>
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>{t.estimatedTime}</p>
      </div>
    </div>
  )
}