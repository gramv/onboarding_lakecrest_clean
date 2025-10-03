import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import ReviewAndSign from '@/components/ReviewAndSign'
import { CheckCircle, Shield, AlertTriangle, FileText, Users, AlertCircle, Info } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'
import { FormSection } from '@/components/ui/form-section'
import { getApiUrl } from '@/config/api'
import axios from 'axios'
import PDFViewer from '@/components/PDFViewer'

interface WeaponsPolicyData {
  hasReadPolicy: boolean
  acknowledgments: Record<string, boolean>
  isSigned: boolean
  signatureData?: any
}

interface PolicyContent {
  title: string
  subtitle: string
  policy: {
    title: string
    sections: Array<{
      title: string
      icon: React.ReactNode
      content: string[]
    }>
    exceptions: string[]
  }
  acknowledgmentStatements: string[]
  signatureAgreement: string
}

export default function WeaponsPolicyStep({
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
  
  const [formData, setFormData] = useState<WeaponsPolicyData>({
    hasReadPolicy: false,
    acknowledgments: {},
    isSigned: false
  })
  const [showReview, setShowReview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [remotePdfUrl, setRemotePdfUrl] = useState<string | null>(null)

  // Auto-save data
  const autoSaveData = {
    formData,
    showReview
  }

  // Auto-save hook
  const { saveStatus } = useAutoSave(autoSaveData, {
    onSave: async (data) => {
      await saveProgress(currentStep.id, data)
    }
  })

  // Load existing data
  useEffect(() => {
    // Load from session storage
    const savedData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        if (parsed.formData) {
          setFormData(parsed.formData)
        }
        if (parsed.formData?.isSigned) {
          setShowReview(false)
        }
        // ✅ FIX: Restore PDF URLs for preview after signing
        if (parsed.pdfUrl) {
          setPdfUrl(parsed.pdfUrl)
        }
        if (parsed.remotePdfUrl) {
          setRemotePdfUrl(parsed.remotePdfUrl)
        }
      } catch (e) {
        console.error('Failed to parse saved weapons policy data:', e)
      }
    }

    if (progress.completedSteps.includes(currentStep.id)) {
      setFormData(prev => ({ ...prev, isSigned: true }))
    }
  }, [currentStep.id, progress.completedSteps])

  const content: Record<'en' | 'es', PolicyContent> = {
    en: {
      title: 'Weapons Policy Acknowledgment',
      subtitle: 'Please review and acknowledge our workplace weapons policy',
      policy: {
        title: 'Weapons and Workplace Violence Prevention Policy',
        sections: [
          {
            title: 'Prohibited Items',
            icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
            content: [
              'Firearms, guns, pistols, revolvers, or any other weapon designed to propel a projectile',
              'Knives with blades longer than 3 inches (except for approved kitchen/work tools)',
              'Explosives, ammunition, or incendiary devices',
              'Chemical sprays, mace, or pepper spray (except where required by job duties)',
              'Martial arts weapons including nunchucks, throwing stars, or batons',
              'Any item that could reasonably be considered a weapon or used to threaten or intimidate'
            ]
          },
          {
            title: 'Workplace Violence Prevention',
            icon: <Shield className="w-6 h-6 text-blue-500" />,
            content: [
              'Threatening, intimidating, or hostile behavior toward any person is strictly prohibited',
              'Physical altercations, fighting, or aggressive behavior will result in immediate termination',
              'Verbal threats, including threats made in jest, are taken seriously and prohibited',
              'Harassment, stalking, or intimidation of employees, guests, or visitors is forbidden',
              'Reporting suspicious behavior or potential threats is encouraged and protected'
            ]
          },
          {
            title: 'Enforcement and Consequences',
            icon: <FileText className="w-6 h-6 text-orange-500" />,
            content: [
              'Violation of this policy will result in immediate disciplinary action, up to and including termination',
              'Criminal violations will be reported to law enforcement authorities',
              'The company reserves the right to search personal belongings, lockers, and vehicles on company property',
              'Employees who report violations in good faith will be protected from retaliation',
              'This policy applies to all company property, company-sponsored events, and work-related activities'
            ]
          },
          {
            title: 'Reporting Procedures',
            icon: <Users className="w-6 h-6 text-green-500" />,
            content: [
              'Report any policy violations immediately to your supervisor or HR department',
              'In case of immediate danger, call 911 first, then notify management',
              'Anonymous reporting is available through the company hotline',
              'All reports will be investigated promptly and thoroughly',
              'Confidentiality will be maintained to the extent possible during investigations'
            ]
          }
        ],
        exceptions: [
          'Law enforcement officers acting in their official capacity',
          'Security personnel specifically authorized by the company',
          'Kitchen staff using approved culinary knives within designated work areas',
          'Maintenance staff using approved tools within the scope of their duties'
        ]
      },
      acknowledgmentStatements: [
        'I have read and understood the complete Weapons and Workplace Violence Prevention Policy',
        'I understand that bringing prohibited weapons or items to the workplace is grounds for immediate termination',
        'I agree to report any violations of this policy that I observe',
        'I understand that this policy applies to all company property and company-related activities',
        'I acknowledge that the company may search personal belongings and vehicles on company property',
        'I understand that making threats, even in jest, is prohibited and subject to disciplinary action'
      ],
      signatureAgreement: 'By signing below, I acknowledge that I have read, understood, and agree to comply with the Weapons and Workplace Violence Prevention Policy. I understand that violation of this policy may result in disciplinary action up to and including termination of employment.'
    },
    es: {
      title: 'Reconocimiento de Política de Armas',
      subtitle: 'Por favor revise y reconozca nuestra política de armas en el lugar de trabajo',
      policy: {
        title: 'Política de Armas y Prevención de Violencia en el Lugar de Trabajo',
        sections: [
          {
            title: 'Artículos Prohibidos',
            icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
            content: [
              'Armas de fuego, pistolas, revólveres o cualquier arma diseñada para proyectar un proyectil',
              'Cuchillos con hojas de más de 3 pulgadas (excepto herramientas de cocina/trabajo aprobadas)',
              'Explosivos, municiones o dispositivos incendiarios',
              'Aerosoles químicos, gas pimienta (excepto cuando lo requieran las tareas laborales)',
              'Armas de artes marciales incluyendo nunchakus, estrellas arrojadizas o bastones',
              'Cualquier artículo que razonablemente podría considerarse un arma'
            ]
          },
          {
            title: 'Prevención de Violencia en el Lugar de Trabajo',
            icon: <Shield className="w-6 h-6 text-blue-500" />,
            content: [
              'El comportamiento amenazante, intimidante u hostil está estrictamente prohibido',
              'Las altercaciones físicas resultarán en terminación inmediata',
              'Las amenazas verbales, incluso en broma, están prohibidas',
              'El acoso o intimidación de empleados, huéspedes o visitantes está prohibido',
              'Se alienta y protege el reporte de comportamiento sospechoso'
            ]
          },
          {
            title: 'Aplicación y Consecuencias',
            icon: <FileText className="w-6 h-6 text-orange-500" />,
            content: [
              'La violación resultará en acción disciplinaria inmediata, hasta e incluyendo la terminación',
              'Las violaciones criminales serán reportadas a las autoridades',
              'La empresa se reserva el derecho de registrar pertenencias personales en la propiedad',
              'Los empleados que reporten violaciones de buena fe serán protegidos',
              'Esta política aplica a toda propiedad y eventos de la empresa'
            ]
          },
          {
            title: 'Procedimientos de Reporte',
            icon: <Users className="w-6 h-6 text-green-500" />,
            content: [
              'Reporte violaciones inmediatamente a su supervisor o departamento de RRHH',
              'En caso de peligro inmediato, llame al 911 primero',
              'Reporte anónimo disponible a través de la línea directa',
              'Todos los reportes serán investigados prontamente',
              'Se mantendrá confidencialidad en la medida de lo posible'
            ]
          }
        ],
        exceptions: [
          'Oficiales de policía actuando en capacidad oficial',
          'Personal de seguridad autorizado por la empresa',
          'Personal de cocina usando cuchillos aprobados en áreas designadas',
          'Personal de mantenimiento usando herramientas aprobadas'
        ]
      },
      acknowledgmentStatements: [
        'He leído y entendido la Política completa de Armas y Prevención de Violencia',
        'Entiendo que traer armas prohibidas al trabajo es motivo de terminación inmediata',
        'Acepto reportar cualquier violación de esta política que observe',
        'Entiendo que esta política aplica a toda propiedad de la empresa',
        'Reconozco que la empresa puede registrar pertenencias personales en la propiedad',
        'Entiendo que hacer amenazas, incluso en broma, está prohibido'
      ],
      signatureAgreement: 'Al firmar abajo, reconozco que he leído, entendido y acepto cumplir con la Política de Armas y Prevención de Violencia en el Lugar de Trabajo. Entiendo que la violación de esta política puede resultar en acción disciplinaria hasta e incluyendo la terminación del empleo.'
    }
  }

  const t = content[language]

  const handleAcknowledgmentChange = (index: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      acknowledgments: {
        ...prev.acknowledgments,
        [index]: checked
      }
    }))
  }

  const allAcknowledgmentsChecked = t.acknowledgmentStatements.every(
    (_, index) => formData.acknowledgments[index] === true
  )

  const canProceedToReview = formData.hasReadPolicy && allAcknowledgmentsChecked
  const isStepComplete = formData.hasReadPolicy && allAcknowledgmentsChecked && formData.isSigned


  const handleProceedToReview = () => {
    if (canProceedToReview) {
      setShowReview(true)
    }
  }

  const handleSign = async (signatureData: any) => {
    console.log('✅ Weapons Policy - handleSign called with:', {
      hasSignature: !!signatureData.signature,
      hasPdfUrl: !!signatureData.pdfUrl
    })

    const completedAt = new Date().toISOString()
    const completeData = {
      ...formData,
      isSigned: true,
      signatureData,
      completedAt
    }

    setFormData(completeData)

    // ✅ FIX: Call backend to generate and save signed PDF (like Human Trafficking)
    let supabaseUrl: string | null = null
    let base64Pdf: string | null = null

    if (employee?.id && !employee.id.startsWith('demo-')) {
      try {
        console.log('📤 Calling backend to save signed Weapons Policy PDF...')

        const response = await axios.post(
          `${getApiUrl()}/onboarding/${employee.id}/weapons-policy/generate-pdf`,
          {
            employee_data: {
              name: `${employee.firstName} ${employee.lastName}`,
              property_name: property?.name || '',
              position: employee.position || '',
              ...formData
            },
            signature_data: {
              signature: signatureData.signature,
              signedAt: completedAt,
              ipAddress: signatureData.ipAddress,
              userAgent: signatureData.userAgent
            }
          }
        )

        if (response.data?.success && response.data?.data) {
          supabaseUrl = response.data.data.pdf_url
          const pdfBase64 = response.data.data.pdf
          base64Pdf = `data:application/pdf;base64,${pdfBase64}`

          console.log('✅ Signed Weapons Policy PDF saved to database:', supabaseUrl)
        } else {
          console.error('❌ Failed to save signed PDF:', response.data)
        }
      } catch (error) {
        console.error('❌ Error saving signed Weapons Policy PDF:', error)
        // Continue even if backend save fails - data is in session storage
      }
    }

    // Save to session storage with PDF URLs
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify({
      formData: completeData,
      showReview: false,
      pdfUrl: base64Pdf,
      remotePdfUrl: supabaseUrl
    }))

    // Hide review BEFORE marking complete
    setShowReview(false)

    // Mark step complete
    await saveProgress(currentStep.id, completeData)
    await markStepComplete(currentStep.id, completeData)

    console.log('✅ Weapons Policy step completed and signed')
  }

  const handleBack = () => {
    setShowReview(false)
  }

  // If already signed, show completion status
  if (formData.isSigned && !showReview) {
    return (
      <StepContainer saveStatus={saveStatus}>
        <StepContentWrapper>
          <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t.title}</h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto px-4">{t.subtitle}</p>
            </div>

            <Alert className="bg-green-50 border-green-200 p-3 sm:p-4">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <AlertDescription className="text-sm sm:text-base text-green-800">
                {language === 'es'
                  ? 'Política de armas reconocida y firmada exitosamente.'
                  : 'Weapons policy acknowledged and signed successfully.'}
              </AlertDescription>
            </Alert>

            {/* ✅ FIX: Show PDF preview after signing (like Human Trafficking) */}
            {(pdfUrl || remotePdfUrl) ? (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                    <span>{language === 'es' ? 'Vista previa del documento firmado' : 'Signed Document Preview'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <PDFViewer
                    pdfUrl={remotePdfUrl || undefined}
                    pdfData={!remotePdfUrl ? pdfUrl ?? undefined : undefined}
                    height="600px"
                    title="Signed Weapons Policy Acknowledgment"
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-2">
                      {language === 'es' ? 'Reconocimiento Completo' : 'Acknowledgment Complete'}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600">
                      {language === 'es'
                        ? 'Su reconocimiento ha sido registrado y guardado.'
                        : 'Your acknowledgment has been recorded and saved.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </StepContentWrapper>
      </StepContainer>
    )
  }

  // Show review and sign
  if (showReview) {
    return (
      <StepContainer saveStatus={saveStatus}>
        <StepContentWrapper>
          <FormSection
            title={language === 'es' ? 'Revisar y Firmar Política' : 'Review and Sign Policy'}
            description={language === 'es' 
              ? 'Por favor revise el reconocimiento de política y firme para completar este paso'
              : 'Please review the policy acknowledgment and sign to complete this step'}
            icon={<Shield className="h-5 w-5" />}
            required={true}
          >
            <ReviewAndSign
              formType="weapons-policy"
              formData={{
                policyRead: formData.hasReadPolicy,
                acknowledgments: formData.acknowledgments,
                acknowledgmentStatements: t.acknowledgmentStatements
              }}
              title={language === 'es' ? 'Revisar Reconocimiento de Política' : 'Review Policy Acknowledgment'}
              description={language === 'es'
                ? 'Por favor revise sus reconocimientos y firme electrónicamente'
                : 'Please review your acknowledgments and sign electronically'}
              language={language}
              onSign={handleSign}
              onBack={handleBack}
              agreementText={t.signatureAgreement}
              federalCompliance={{
                formName: 'Weapons and Workplace Violence Prevention Policy',
                retentionPeriod: 'Permanent employee record',
                requiresWitness: false
              }}
              usePDFPreview={true}
              pdfEndpoint={`${getApiUrl()}/onboarding/${employee?.id || 'test-employee'}/weapons-policy/generate-pdf`}
            />
          </FormSection>
        </StepContentWrapper>
      </StepContainer>
    )
  }

  // Main policy content
  return (
    <StepContainer saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
          {/* Step Header */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t.title}</h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto px-4">{t.subtitle}</p>
          </div>

          {/* Zero Tolerance Notice */}
          <Alert className="bg-red-50 border-red-200 p-3 sm:p-4">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
            <AlertDescription className="text-xs sm:text-sm text-red-800">
              <strong>{language === 'es' ? 'Cero Tolerancia:' : 'Zero Tolerance:'}</strong>{' '}
              {language === 'es'
                ? 'Nuestra empresa mantiene una política estricta de no armas para todos los empleados, contratistas y visitantes.'
                : 'Our company maintains a strict no-weapons policy for all employees, contractors, and visitors.'}
            </AlertDescription>
          </Alert>

          {/* Policy Content */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                <span>{t.policy.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-6 sm:space-y-8">
                {t.policy.sections.map((section, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 sm:pl-6">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      {React.cloneElement(section.icon, { className: 'h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0' })}
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-800">{section.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {section.content.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                          <span className="text-xs sm:text-sm text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Exceptions */}
              <div className="mt-6 sm:mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                <h4 className="font-semibold text-yellow-800 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Info className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  {language === 'es' ? 'Excepciones Limitadas' : 'Limited Exceptions'}
                </h4>
                <ul className="space-y-1">
                  {t.policy.exceptions.map((exception, index) => (
                    <li key={index} className="flex items-start gap-2 text-yellow-700">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-xs sm:text-sm">{exception}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Read Confirmation */}
              <div className="mt-6 flex items-center gap-3">
                <Checkbox
                  id="policy-read"
                  checked={formData.hasReadPolicy}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, hasReadPolicy: checked as boolean }))
                  }
                />
                <label htmlFor="policy-read" className="text-gray-700 font-medium cursor-pointer">
                  {language === 'es' 
                    ? 'He leído y entiendo la política completa anterior'
                    : 'I have read and understand the complete policy above'}
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Acknowledgments */}
          {formData.hasReadPolicy && (
            <Card>
              <CardHeader>
                <CardTitle>{language === 'es' ? 'Reconocimientos Requeridos' : 'Required Acknowledgments'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {t.acknowledgmentStatements.map((statement, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Checkbox
                        id={`ack-${index}`}
                        checked={formData.acknowledgments[index] || false}
                        onCheckedChange={(checked) => 
                          handleAcknowledgmentChange(index, checked as boolean)
                        }
                      />
                      <label htmlFor={`ack-${index}`} className="text-gray-700 leading-relaxed cursor-pointer">
                        {statement}
                      </label>
                    </div>
                  ))}
                </div>

                {/* Proceed to Review Button */}
                {allAcknowledgmentsChecked && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleProceedToReview}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      {language === 'es' ? 'Proceder a Revisar y Firmar' : 'Proceed to Review and Sign'}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progress Indicator */}
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">
              {language === 'es' ? 'Progreso de Finalización' : 'Completion Progress'}
            </div>
            <div className="flex justify-center gap-4">
              <div className={`flex items-center gap-2 ${formData.hasReadPolicy ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-4 h-4" />
                <span>{language === 'es' ? 'Política Leída' : 'Policy Read'}</span>
              </div>
              <div className={`flex items-center gap-2 ${allAcknowledgmentsChecked ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-4 h-4" />
                <span>{language === 'es' ? 'Reconocimientos' : 'Acknowledgments'}</span>
              </div>
              <div className={`flex items-center gap-2 ${formData.isSigned ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-4 h-4" />
                <span>{language === 'es' ? 'Firma' : 'Signature'}</span>
              </div>
            </div>
          </div>
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
