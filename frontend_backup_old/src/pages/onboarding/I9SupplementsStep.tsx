import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import I9SupplementA from '@/components/I9SupplementA'
import { CheckCircle, FileText, Info, Users, Globe } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'

export default function I9SupplementsStep({
  currentStep,
  progress,
  markStepComplete,
  saveProgress,
  language = 'en',
  employee,
  property
}: StepProps) {
  
  const [needsSupplements, setNeedsSupplements] = useState<'none' | 'translator'>('none')
  const [supplementAData, setSupplementAData] = useState(null)
  const [isComplete, setIsComplete] = useState(false)

  // Auto-save data
  const autoSaveData = {
    needsSupplements,
    supplementAData,
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

  // Check completion status
  useEffect(() => {
    const checkCompletion = async () => {
      let complete = false
      
      if (needsSupplements === 'none') {
        complete = true
      } else if (needsSupplements === 'translator' && supplementAData) {
        complete = true
      }
      
      setIsComplete(complete)
      
      if (complete && !progress.completedSteps.includes(currentStep.id)) {
        const stepData = {
          needsSupplements,
          supplementA: supplementAData,
          federalComplianceNote: 'Supplement B is not applicable for employee - manager handles reverification',
          completedAt: new Date().toISOString()
        }
        await markStepComplete(currentStep.id, stepData)
      }
    }
    
    checkCompletion()
  }, [needsSupplements, supplementAData, currentStep.id, progress.completedSteps, markStepComplete])

  const handleSupplementAComplete = (data: any) => {
    setSupplementAData(data)
  }

  const handleSkipSupplements = () => {
    setNeedsSupplements('none')
  }

  const translations = {
    en: {
      title: 'I-9 Supplements',
      description: 'If someone assisted you in completing Section 1 of Form I-9, additional supplements may be required. This includes translators or preparers who helped you understand or complete the form.',
      mostEmployeesSkip: 'Most employees can skip this step.',
      supplementsRequired: 'Supplements are only required if someone other than you helped translate or prepare your I-9 Section 1 responses.',
      completionMessage: 'I-9 Supplements section completed. You can proceed to document upload.',
      didAnyoneAssist: 'Did Anyone Assist You?',
      selectSupplements: 'Select which supplements are needed (if any):',
      noAssistanceNeeded: 'No assistance needed',
      noAssistanceDescription: 'I completed Section 1 myself without help from a translator or preparer.',
      supplementATranslator: 'Supplement A - Translator',
      supplementADescription: 'Someone translated the form or instructions for me because English is not my primary language.',
      noSupplementsRequired: 'No supplements required',
      canProceed: 'You can proceed to the next step - document upload for I-9 verification.',
      supplementATitle: 'Supplement A - Translator Information',
      aboutSupplementB: 'About Supplement B (Reverification)',
      supplementBNotCompleted: 'Supplement B is NOT completed by employees.',
      supplementBUsed: 'It is used exclusively by managers for reverification scenarios such as:',
      whenAuthorizationExpires: 'When an employee\'s work authorization expires and needs renewal',
      whenRehiring: 'When rehiring an employee within 3 years of the original I-9',
      whenNameChange: 'When an employee has a legal name change',
      managerWillComplete: 'Your manager will complete Supplement B if any of these situations apply to you during your employment. You do not need to take any action regarding Supplement B.',
      supplementRequirements: 'Supplement Requirements',
      readyToContinue: 'No supplements needed - Ready to continue',
      supplementA: 'Supplement A (Translator)',
      supplementB: 'Supplement B (Reverification)',
      complete: 'Complete',
      required: 'Required',
      managerResponsibility: 'Manager Responsibility',
      federalRequirement: 'Federal Requirement:',
      federalNotice: 'Supplements A and B are required when a translator or preparer assists with Form I-9 completion under 8 CFR § 274a.2(b)(1)(i)(B).',
      estimatedTime: 'Estimated time: 2-4 minutes (if supplements needed)'
    },
    es: {
      title: 'Suplementos I-9',
      description: 'Si alguien le ayudó a completar la Sección 1 del Formulario I-9, pueden ser necesarios suplementos adicionales. Esto incluye traductores o preparadores que le ayudaron a entender o completar el formulario.',
      mostEmployeesSkip: 'La mayoría de los empleados pueden omitir este paso.',
      supplementsRequired: 'Los suplementos solo son necesarios si alguien más que usted ayudó a traducir o preparar sus respuestas de la Sección 1 del I-9.',
      completionMessage: 'Sección de Suplementos I-9 completada. Puede proceder a cargar documentos.',
      didAnyoneAssist: '¿Alguien le Ayudó?',
      selectSupplements: 'Seleccione qué suplementos son necesarios (si corresponde):',
      noAssistanceNeeded: 'No necesité ayuda',
      noAssistanceDescription: 'Completé la Sección 1 yo mismo sin ayuda de un traductor o preparador.',
      supplementATranslator: 'Suplemento A - Traductor',
      supplementADescription: 'Alguien tradujo el formulario o las instrucciones porque el inglés no es mi idioma principal.',
      noSupplementsRequired: 'No se requieren suplementos',
      canProceed: 'Puede continuar con el siguiente paso: carga de documentos para la verificación I-9.',
      supplementATitle: 'Suplemento A - Información del Traductor',
      aboutSupplementB: 'Acerca del Suplemento B (Reverificación)',
      supplementBNotCompleted: 'El Suplemento B NO es completado por los empleados.',
      supplementBUsed: 'Se usa exclusivamente por los gerentes para escenarios de reverificación como:',
      whenAuthorizationExpires: 'Cuando la autorización de trabajo de un empleado expira y necesita renovación',
      whenRehiring: 'Al recontratar a un empleado dentro de 3 años del I-9 original',
      whenNameChange: 'Cuando un empleado tiene un cambio de nombre legal',
      managerWillComplete: 'Su gerente completará el Suplemento B si alguna de estas situaciones se aplica a usted durante su empleo. No necesita tomar ninguna acción con respecto al Suplemento B.',
      supplementRequirements: 'Requisitos de Suplementos',
      readyToContinue: 'No se necesitan suplementos - Listo para continuar',
      supplementA: 'Suplemento A (Traductor)',
      supplementB: 'Suplemento B (Reverificación)',
      complete: 'Completo',
      required: 'Requerido',
      managerResponsibility: 'Responsabilidad del Gerente',
      federalRequirement: 'Requisito Federal:',
      federalNotice: 'Los Suplementos A y B son requeridos cuando un traductor o preparador ayuda con la compleción del Formulario I-9 bajo 8 CFR § 274a.2(b)(1)(i)(B).',
      estimatedTime: 'Tiempo estimado: 2-4 minutos (si se necesitan suplementos)'
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
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        </div>
        <p className="text-gray-600 max-w-3xl mx-auto">{t.description}</p>
      </div>

      {/* Information Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>{t.mostEmployeesSkip}</strong> {t.supplementsRequired}
        </AlertDescription>
      </Alert>

      {/* Progress Indicator */}
      {isComplete && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {t.completionMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Assessment Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>{t.didAnyoneAssist}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium text-gray-900 mb-4 block">
              {t.selectSupplements}
            </Label>
            
            <RadioGroup 
              value={needsSupplements} 
              onValueChange={(value: any) => setNeedsSupplements(value)}
              className="space-y-4"
            >
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                <RadioGroupItem value="none" id="none" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="none" className="font-medium cursor-pointer">
                    {t.noAssistanceNeeded}
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {t.noAssistanceDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                <RadioGroupItem value="translator" id="translator" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="translator" className="font-medium cursor-pointer flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>{t.supplementATranslator}</span>
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {t.supplementADescription}
                  </p>
                </div>
              </div>

            </RadioGroup>
          </div>

          {needsSupplements === 'none' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">{t.noSupplementsRequired}</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                {t.canProceed}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplement A - Translator */}
      {needsSupplements === 'translator' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <span>{t.supplementATitle}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <I9SupplementA
              initialData={supplementAData || {}}
              language={language}
              onComplete={handleSupplementAComplete}
              onSkip={() => setNeedsSupplements('none')}
              onBack={() => setNeedsSupplements('none')}
            />
          </CardContent>
        </Card>
      )}

      {/* Federal Compliance Notice for Supplement B */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-800">
            <FileText className="h-5 w-5" />
            <span>{t.aboutSupplementB}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="space-y-3">
            <p className="text-sm">
              <strong>{t.supplementBNotCompleted}</strong> {t.supplementBUsed}
            </p>
            <ul className="text-sm list-disc list-inside space-y-1 ml-4">
              <li>{t.whenAuthorizationExpires}</li>
              <li>{t.whenRehiring}</li>
              <li>{t.whenNameChange}</li>
            </ul>
            <p className="text-sm">
              {t.managerWillComplete}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Completion Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">{t.supplementRequirements}</h3>
        <div className="space-y-3">
          {needsSupplements === 'none' && (
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{t.readyToContinue}</span>
            </div>
          )}
          
          {needsSupplements === 'translator' && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t.supplementA}</span>
              <div className="flex items-center space-x-2">
                {supplementAData ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                )}
                <span className="text-sm font-medium">
                  {supplementAData ? t.complete : t.required}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t.supplementB}</span>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {t.managerResponsibility}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Federal Notice */}
      <div className="text-xs text-gray-500 border-t pt-4">
        <p><strong>{t.federalRequirement}</strong> {t.federalNotice}</p>
      </div>

      {/* Estimated Time */}
      <div className="text-center text-sm text-gray-500">
        <p>{t.estimatedTime}</p>
      </div>
      </div>
      </StepContentWrapper>
    </StepContainer>
  )
}