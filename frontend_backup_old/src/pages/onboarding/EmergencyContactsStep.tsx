import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import EmergencyContactsForm from '@/components/EmergencyContactsForm'
import { CheckCircle, Phone, AlertTriangle, Heart } from 'lucide-react'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'

interface StepProps {
  currentStep: any
  progress: any
  markStepComplete: (stepId: string, data?: any) => void
  saveProgress: (stepId: string, data?: any) => void
  language: 'en' | 'es'
  employee?: any
  property?: any
}

export default function EmergencyContactsStep(props: StepProps) {
  const { currentStep, progress, markStepComplete, saveProgress, language = 'en' } = props
  
  const [formData, setFormData] = useState(null)
  const [isValid, setIsValid] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  // Load existing data from progress
  useEffect(() => {
    const existingData = progress.stepData?.['emergency_contacts']
    if (existingData) {
      setFormData(existingData.formData)
      setIsComplete(existingData.completed || false)
    }
  }, [progress])

  const handleFormComplete = (data: any) => {
    setFormData(data)
    setIsComplete(true)
    const stepData = {
      formData: data,
      completed: true,
      completedAt: new Date().toISOString()
    }
    markStepComplete('emergency_contacts', stepData)
    saveProgress()
  }

  const translations = {
    en: {
      title: 'Emergency Contacts',
      subtitle: 'Provide Emergency Contact Information',
      description: 'Please provide contact information for people we should reach in case of an emergency.',
      completedNotice: 'Emergency contacts information saved successfully.',
      importantNote: 'Important Information',
      notesList: [
        'Provide at least one emergency contact with a valid phone number',
        'Emergency contacts should be people who can be reached during work hours',
        'Include any important medical information that could help in an emergency',
        'This information is kept confidential and used only for emergency purposes'
      ],
      estimatedTime: 'Estimated time: 4 minutes'
    },
    es: {
      title: 'Contactos de Emergencia',
      subtitle: 'Proporcione Información de Contactos de Emergencia',
      description: 'Por favor proporcione información de contacto para personas que debemos contactar en caso de emergencia.',
      completedNotice: 'Información de contactos de emergencia guardada exitosamente.',
      importantNote: 'Información Importante',
      notesList: [
        'Proporcione al menos un contacto de emergencia con un número de teléfono válido',
        'Los contactos de emergencia deben ser personas que puedan ser contactadas durante horas de trabajo',
        'Incluya cualquier información médica importante que pueda ayudar en una emergencia',
        'Esta información se mantiene confidencial y se usa solo para propósitos de emergencia'
      ],
      estimatedTime: 'Tiempo estimado: 4 minutos'
    }
  }

  const t = translations[language]

  return (
    <StepContentWrapper>
      <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Heart className="h-6 w-6 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        </div>
        <p className="text-gray-600 max-w-3xl mx-auto">
          {t.description}
        </p>
      </div>

      {/* Completion Notice */}
      {isComplete && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {t.completedNotice}
          </AlertDescription>
        </Alert>
      )}

      {/* Important Information */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            <span>{t.importantNote}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-orange-800">
          <ul className="space-y-2 text-sm">
            {t.notesList.map((note, index) => (
              <li key={index}>• {note}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Emergency Contacts Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5 text-red-600" />
            <span>{t.subtitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmergencyContactsForm
            initialData={formData || {}}
            language={language}
            onComplete={handleFormComplete}
            onValidationChange={setIsValid}
          />
        </CardContent>
      </Card>

      {/* Estimated Time */}
      <div className="text-center text-sm text-gray-500">
        <p>{t.estimatedTime}</p>
      </div>
      </div>
    </StepContentWrapper>
  )
}