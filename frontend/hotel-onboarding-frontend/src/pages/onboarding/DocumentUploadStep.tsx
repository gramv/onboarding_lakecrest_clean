import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  Upload,
  FileText,
  Camera,
  Shield,
  AlertTriangle,
  Info,
  CreditCard,
  BookOpen,
  Car
} from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { NavigationButtons } from '@/components/navigation/NavigationButtons'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useStepValidation } from '@/hooks/useStepValidation'
import { documentUploadValidator } from '@/utils/stepValidators'

interface DocumentOption {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  category: 'listA' | 'listB' | 'listC'
  examples: string[]
}

const DOCUMENT_OPTIONS: DocumentOption[] = [
  // List A - Documents that establish both identity and employment authorization
  {
    id: 'us-passport',
    title: 'U.S. Passport',
    description: 'Establishes both identity and work authorization',
    icon: <BookOpen className="h-5 w-5" />,
    category: 'listA',
    examples: ['U.S. Passport Book', 'U.S. Passport Card']
  },
  {
    id: 'permanent-resident-card',
    title: 'Permanent Resident Card',
    description: 'Green Card (I-551)',
    icon: <CreditCard className="h-5 w-5" />,
    category: 'listA',
    examples: ['Form I-551 (Green Card)']
  },
  {
    id: 'employment-authorization',
    title: 'Employment Authorization Document',
    description: 'Work permit with photo',
    icon: <FileText className="h-5 w-5" />,
    category: 'listA',
    examples: ['Form I-766 (EAD)']
  },
  // List B - Documents that establish identity
  {
    id: 'drivers-license',
    title: "Driver's License",
    description: 'State-issued with photo',
    icon: <Car className="h-5 w-5" />,
    category: 'listB',
    examples: ["Driver's License", "State ID Card"]
  },
  {
    id: 'military-id',
    title: 'Military ID',
    description: 'U.S. Military identification',
    icon: <Shield className="h-5 w-5" />,
    category: 'listB',
    examples: ['Military ID Card', 'Military Dependent ID']
  },
  // List C - Documents that establish work authorization
  {
    id: 'social-security-card',
    title: 'Social Security Card',
    description: 'Unrestricted Social Security card',
    icon: <CreditCard className="h-5 w-5" />,
    category: 'listC',
    examples: ['Social Security Card (unrestricted)']
  },
  {
    id: 'birth-certificate',
    title: 'U.S. Birth Certificate',
    description: 'Certified copy with official seal',
    icon: <FileText className="h-5 w-5" />,
    category: 'listC',
    examples: ['Birth Certificate', 'Certification of Birth']
  }
]

export default function DocumentUploadStep({
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
  
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({})
  const [documentStrategy, setDocumentStrategy] = useState<'listA' | 'listBC'>('listA')
  const [isComplete, setIsComplete] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)

  // Validation hook
  const { errors, validate } = useStepValidation(documentUploadValidator)

  // Auto-save data
  const autoSaveData = {
    selectedDocuments,
    uploadedFiles: Object.keys(uploadedFiles),
    documentStrategy,
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
      
      if (documentStrategy === 'listA') {
        // Need one List A document
        const hasListADoc = selectedDocuments.some(docId => 
          DOCUMENT_OPTIONS.find(doc => doc.id === docId)?.category === 'listA'
        )
        const hasUpload = selectedDocuments.some(docId => uploadedFiles[docId])
        complete = hasListADoc && hasUpload
      } else {
        // Need one List B AND one List C document
        const hasListBDoc = selectedDocuments.some(docId => 
          DOCUMENT_OPTIONS.find(doc => doc.id === docId)?.category === 'listB'
        )
        const hasListCDoc = selectedDocuments.some(docId => 
          DOCUMENT_OPTIONS.find(doc => doc.id === docId)?.category === 'listC'
        )
        const hasUploads = selectedDocuments.every(docId => uploadedFiles[docId])
        complete = hasListBDoc && hasListCDoc && hasUploads
      }
      
      setIsComplete(complete)
      
      if (complete && !progress.completedSteps.includes(currentStep.id)) {
        const stepData = {
          strategy: documentStrategy,
          selectedDocuments,
          uploadedFiles: Object.keys(uploadedFiles),
          completedAt: new Date().toISOString()
        }
        await markStepComplete(currentStep.id, stepData)
      }
    }
    
    checkCompletion()
  }, [documentStrategy, selectedDocuments, uploadedFiles, currentStep.id, progress.completedSteps, markStepComplete])

  const handleDocumentSelect = (docId: string) => {
    const doc = DOCUMENT_OPTIONS.find(d => d.id === docId)
    if (!doc) return

    if (documentStrategy === 'listA') {
      // For List A, only allow one document
      setSelectedDocuments([docId])
    } else {
      // For List B+C, allow one from each category
      if (doc.category === 'listB') {
        setSelectedDocuments(prev => [
          ...prev.filter(id => DOCUMENT_OPTIONS.find(d => d.id === id)?.category !== 'listB'),
          docId
        ])
      } else if (doc.category === 'listC') {
        setSelectedDocuments(prev => [
          ...prev.filter(id => DOCUMENT_OPTIONS.find(d => d.id === id)?.category !== 'listC'),
          docId
        ])
      }
    }
  }

  const handleFileUpload = (docId: string, file: File) => {
    setUploadedFiles(prev => ({ ...prev, [docId]: file }))
  }

  const translations = {
    en: {
      title: 'Document Verification',
      description: 'Upload acceptable documents to verify your identity and work authorization. These documents will be reviewed by your manager to complete Section 2 of Form I-9.',
      federalRequirement: 'Federal Requirement:',
      federalNotice: 'You must provide acceptable documents within 3 business days of your employment start date. Documents must be unexpired and appear genuine.',
      completionMessage: 'Document upload completed successfully. Your manager will review these documents to complete I-9 verification.',
      strategyTitle: 'Choose Your Document Strategy',
      option1: 'Option 1: List A Document',
      option2: 'Option 2: List B + List C',
      recommendedNotice: 'Recommended:',
      recommendedMessage: 'List A documents establish both identity and work authorization with a single document.',
      listBCNotice: 'You must provide one document from List B (identity) AND one document from List C (work authorization).',
      listBTitle: 'List B - Identity Documents',
      listCTitle: 'List C - Work Authorization Documents',
      photoGuidelinesTitle: 'Photo Guidelines',
      photoGuidelines: [
        'Take clear, well-lit photos showing all document details',
        'Ensure all text is readable and document corners are visible',
        'Documents must be unexpired and in good condition',
        'Accepted formats: JPG, PNG, PDF (max 10MB per file)'
      ],
      uploadRequirementsTitle: 'Upload Requirements',
      oneListADocument: 'One List A document uploaded',
      listBDocument: 'List B document (Identity)',
      listCDocument: 'List C document (Work Authorization)',
      complete: 'Complete',
      required: 'Required',
      readyForReview: 'Ready for Manager Review',
      managerReviewNotice: 'Your manager will examine these documents in person or remotely to complete Section 2 of Form I-9 within 3 business days of your start date.',
      privacyNotice: 'Privacy Notice:',
      privacyMessage: 'Document images are encrypted and stored securely for I-9 compliance. They will be retained for the required period and destroyed in accordance with federal recordkeeping requirements.',
      estimatedTime: 'Estimated time: 4-6 minutes',
      uploadLabel: 'Upload',
      fileUploaded: 'File uploaded:'
    },
    es: {
      title: 'Verificación de Documentos',
      description: 'Cargue documentos aceptables para verificar su identidad y autorización de trabajo. Estos documentos serán revisados por su gerente para completar la Sección 2 del Formulario I-9.',
      federalRequirement: 'Requisito Federal:',
      federalNotice: 'Debe proporcionar documentos aceptables dentro de los 3 días hábiles posteriores a su fecha de inicio. Los documentos deben estar vigentes y parecer genuinos.',
      completionMessage: 'Carga de documentos completada exitosamente. Su gerente revisará estos documentos para completar la verificación I-9.',
      strategyTitle: 'Elija su Estrategia de Documentos',
      option1: 'Opción 1: Documento de Lista A',
      option2: 'Opción 2: Lista B + Lista C',
      recommendedNotice: 'Recomendado:',
      recommendedMessage: 'Los documentos de Lista A establecen tanto identidad como autorización de trabajo con un solo documento.',
      listBCNotice: 'Debe proporcionar un documento de Lista B (identidad) Y un documento de Lista C (autorización de trabajo).',
      listBTitle: 'Lista B - Documentos de Identidad',
      listCTitle: 'Lista C - Documentos de Autorización de Trabajo',
      photoGuidelinesTitle: 'Guías para Fotos',
      photoGuidelines: [
        'Tome fotos claras y bien iluminadas mostrando todos los detalles del documento',
        'Asegúrese de que todo el texto sea legible y las esquinas del documento sean visibles',
        'Los documentos deben estar vigentes y en buenas condiciones',
        'Formatos aceptados: JPG, PNG, PDF (máximo 10MB por archivo)'
      ],
      uploadRequirementsTitle: 'Requisitos de Carga',
      oneListADocument: 'Un documento de Lista A cargado',
      listBDocument: 'Documento de Lista B (Identidad)',
      listCDocument: 'Documento de Lista C (Autorización de Trabajo)',
      complete: 'Completo',
      required: 'Requerido',
      readyForReview: 'Listo para Revisión del Gerente',
      managerReviewNotice: 'Su gerente examinará estos documentos en persona o remotamente para completar la Sección 2 del Formulario I-9 dentro de los 3 días hábiles de su fecha de inicio.',
      privacyNotice: 'Aviso de Privacidad:',
      privacyMessage: 'Las imágenes de documentos están encriptadas y almacenadas de forma segura para cumplimiento del I-9. Se conservarán durante el período requerido y se destruirán de acuerdo con los requisitos federales de mantenimiento de registros.',
      estimatedTime: 'Tiempo estimado: 4-6 minutos',
      uploadLabel: 'Cargar',
      fileUploaded: 'Archivo cargado:'
    }
  }

  const t = translations[language]

  const DocumentCard = ({ doc }: { doc: DocumentOption }) => {
    const isSelected = selectedDocuments.includes(doc.id)
    const hasUpload = uploadedFiles[doc.id]
    
    return (
      <Card 
        className={`cursor-pointer transition-all ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => handleDocumentSelect(doc.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 p-2 rounded-lg ${
              isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {doc.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{doc.title}</h3>
                {isSelected && hasUpload && <CheckCircle className="h-4 w-4 text-green-600" />}
              </div>
              <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
              <div className="mt-2">
                <Badge variant={doc.category === 'listA' ? 'default' : 'secondary'} className="text-xs">
                  List {doc.category.replace('list', '').toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
          
          {isSelected && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.uploadLabel} {doc.title}
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(doc.id, file)
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                {hasUpload && (
                  <div className="flex items-center space-x-2 text-green-700 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>{t.fileUploaded} {uploadedFiles[doc.id]?.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <StepContainer errors={errors} saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Upload className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        </div>
        <p className="text-gray-600 max-w-3xl mx-auto">{t.description}</p>
      </div>

      {/* Federal Requirements */}
      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>{t.federalRequirement}</strong> {t.federalNotice}
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

      {/* Document Strategy Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>{t.strategyTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={documentStrategy} onValueChange={(value: any) => setDocumentStrategy(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="listA" className="flex items-center space-x-2">
                <span>{t.option1}</span>
              </TabsTrigger>
              <TabsTrigger value="listBC" className="flex items-center space-x-2">
                <span>{t.option2}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="listA" className="mt-4">
              <Alert className="bg-green-50 border-green-200 mb-4">
                <Info className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>{t.recommendedNotice}</strong> {t.recommendedMessage}
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-4">
                {DOCUMENT_OPTIONS.filter(doc => doc.category === 'listA').map(doc => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="listBC" className="mt-4">
              <Alert className="bg-yellow-50 border-yellow-200 mb-4">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  {t.listBCNotice}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">{t.listBTitle}</h3>
                  <div className="grid gap-4">
                    {DOCUMENT_OPTIONS.filter(doc => doc.category === 'listB').map(doc => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">{t.listCTitle}</h3>
                  <div className="grid gap-4">
                    {DOCUMENT_OPTIONS.filter(doc => doc.category === 'listC').map(doc => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Upload Instructions */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>Photo Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-orange-800">
          <ul className="space-y-1 text-sm">
            <li>• Take clear, well-lit photos showing all document details</li>
            <li>• Ensure all text is readable and document corners are visible</li>
            <li>• Documents must be unexpired and in good condition</li>
            <li>• Accepted formats: JPG, PNG, PDF (max 10MB per file)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Completion Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Upload Requirements</h3>
        <div className="space-y-3">
          {documentStrategy === 'listA' ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">One List A document uploaded</span>
              <div className="flex items-center space-x-2">
                {isComplete ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                )}
                <span className="text-sm font-medium">
                  {isComplete ? 'Complete' : 'Required'}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">List B document (Identity)</span>
                <div className="flex items-center space-x-2">
                  {selectedDocuments.some(id => DOCUMENT_OPTIONS.find(d => d.id === id)?.category === 'listB') ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className="text-sm font-medium">{t.required}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">List C document (Work Authorization)</span>
                <div className="flex items-center space-x-2">
                  {selectedDocuments.some(id => DOCUMENT_OPTIONS.find(d => d.id === id)?.category === 'listC') ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className="text-sm font-medium">{t.required}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Manager Review Notice */}
      {isComplete && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-800">Ready for Manager Review</h3>
                <p className="text-sm text-blue-700">
                  Your manager will examine these documents in person or remotely to complete Section 2 of Form I-9 
                  within 3 business days of your start date.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

        {/* Federal Notice */}
        <div className="text-xs text-gray-500 border-t pt-4">
          <p><strong>{t.privacyNotice}</strong> {t.privacyMessage}</p>
        </div>

        {/* Estimated Time */}
        <div className="text-center text-sm text-gray-500">
          <p>{t.estimatedTime}</p>
        </div>

        {/* Navigation */}
        <NavigationButtons
          showPrevious={true}
          showNext={true}
          onPrevious={goToPreviousStep || (() => {})}
          onNext={advanceToNextStep || (async () => ({ allowed: false, reason: 'Navigation not available' }))}
          disabled={saveStatus?.saving || !isComplete}
          saving={saveStatus?.saving}
          hasErrors={!!errors && errors.length > 0}
          language={language}
          nextButtonText={progress.currentStepIndex === progress.totalSteps - 1 ? 'Submit' : 'Next'}
        />

        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
