import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
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
  Car,
  Loader2,
  X,
  ArrowLeft,
  Plane,
  FileCheck,
  Building2
} from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import axios from 'axios'

interface DocumentOption {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  category: 'listA' | 'listB' | 'listC'
  apiType: string // For backend processing
}

interface UploadedDocument {
  id: string
  file: File
  type: string
  status: 'uploading' | 'processing' | 'complete' | 'error'
  extractedData?: {
    documentNumber?: string
    expirationDate?: string
    issuingAuthority?: string
  }
  error?: string
}

const DOCUMENT_OPTIONS: DocumentOption[] = [
  // List A - Establishes both identity and employment authorization
  {
    id: 'us-passport',
    title: 'U.S. Passport',
    description: 'Passport or Passport Card',
    icon: <BookOpen className="h-5 w-5" />,
    category: 'listA',
    apiType: 'us_passport'
  },
  {
    id: 'green-card',
    title: 'Permanent Resident Card',
    description: 'Green Card (I-551)',
    icon: <CreditCard className="h-5 w-5" />,
    category: 'listA',
    apiType: 'permanent_resident_card'
  },
  {
    id: 'foreign-passport',
    title: 'Foreign Passport with I-94',
    description: 'With temporary I-551 stamp or visa',
    icon: <Plane className="h-5 w-5" />,
    category: 'listA',
    apiType: 'foreign_passport'
  },
  {
    id: 'employment-auth-card',
    title: 'Employment Authorization Card',
    description: 'EAD Card (I-766)',
    icon: <FileCheck className="h-5 w-5" />,
    category: 'listA',
    apiType: 'employment_authorization_card'
  },
  // List B - Establishes identity only
  {
    id: 'drivers-license',
    title: "Driver's License",
    description: 'State-issued driver\'s license',
    icon: <Car className="h-5 w-5" />,
    category: 'listB',
    apiType: 'drivers_license'
  },
  {
    id: 'state-id',
    title: 'State ID Card',
    description: 'State-issued identification card',
    icon: <CreditCard className="h-5 w-5" />,
    category: 'listB',
    apiType: 'state_id'
  },
  {
    id: 'school-id',
    title: 'School ID with Photo',
    description: 'With photo (if under 18)',
    icon: <Building2 className="h-5 w-5" />,
    category: 'listB',
    apiType: 'school_id'
  },
  // List C - Establishes employment authorization only
  {
    id: 'ssn-card',
    title: 'Social Security Card',
    description: 'Unrestricted Social Security card',
    icon: <CreditCard className="h-5 w-5" />,
    category: 'listC',
    apiType: 'social_security_card'
  },
  {
    id: 'birth-certificate',
    title: 'Birth Certificate',
    description: 'Original or certified copy',
    icon: <FileText className="h-5 w-5" />,
    category: 'listC',
    apiType: 'birth_certificate'
  }
]

export default function DocumentUploadEnhanced({
  onComplete,
  language = 'en',
  initialData
}: {
  onComplete: (data: any) => void
  language?: 'en' | 'es'
  initialData?: any
}) {
  const [documentChoice, setDocumentChoice] = useState<'passport' | 'dl_ssn' | 'other'>('')
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [ssn, setSsn] = useState('')
  
  // Load saved state on mount - prioritize initialData from parent over sessionStorage
  useEffect(() => {
    // First check if we have initialData from parent (cloud sync)
    if (initialData) {
      console.log('DocumentUploadEnhanced - Loading from initialData:', initialData)
      if (initialData.documentChoice) setDocumentChoice(initialData.documentChoice)
      if (initialData.selectedDocuments) setSelectedDocuments(initialData.selectedDocuments)
      if (initialData.ssn) setSsn(initialData.ssn)
      if (initialData.uploadedDocuments) {
        // Restore uploaded documents but not the actual File objects
        const restoredDocs = initialData.uploadedDocuments.map((doc: any) => ({
          ...doc,
          file: null, // Can't restore File objects from JSON
          status: doc.status === 'complete' ? 'complete' : 'error'
        }))
        setUploadedDocuments(restoredDocs)
      }
      // Also handle extractedData if present
      if (initialData.extractedData && initialData.extractedData.length > 0) {
        // Map extractedData back to uploadedDocuments format
        const docsFromExtracted = initialData.extractedData.map((doc: any) => ({
          id: doc.id || `doc-${Date.now()}-${Math.random()}`,
          file: null,
          type: doc.type || doc.documentType,
          status: 'complete' as const,
          extractedData: doc
        }))
        setUploadedDocuments(docsFromExtracted)
      }
    } else {
      // Fallback to sessionStorage if no initialData
      const savedData = sessionStorage.getItem('document_upload_data')
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          if (parsed.documentChoice) setDocumentChoice(parsed.documentChoice)
          if (parsed.selectedDocuments) setSelectedDocuments(parsed.selectedDocuments)
          if (parsed.ssn) setSsn(parsed.ssn)
          if (parsed.uploadedDocuments) {
            // Restore uploaded documents but not the actual File objects
            const restoredDocs = parsed.uploadedDocuments.map((doc: any) => ({
              ...doc,
              file: null, // Can't restore File objects from JSON
              status: doc.status === 'complete' ? 'complete' : 'error'
            }))
            setUploadedDocuments(restoredDocs)
          }
        } catch (e) {
          console.error('Failed to parse saved document data:', e)
        }
      }
    }
  }, [initialData])
  
  // Save state whenever it changes
  useEffect(() => {
    const dataToSave = {
      documentChoice,
      selectedDocuments,
      ssn,
      uploadedDocuments: uploadedDocuments.map(doc => ({
        id: doc.id,
        type: doc.type,
        status: doc.status,
        extractedData: doc.extractedData,
        error: doc.error
      }))
    }
    sessionStorage.setItem('document_upload_data', JSON.stringify(dataToSave))
  }, [documentChoice, selectedDocuments, ssn, uploadedDocuments])
  
  const translations = {
    en: {
      title: 'Upload Documents',
      subtitle: 'Upload your documents for I-9 verification',
      question: 'Which documents do you have?',
      option1: 'U.S. Passport or Green Card',
      option1Desc: 'One document establishes both identity and work authorization',
      option2: 'Driver\'s License',
      option2Desc: 'You\'ll also need to upload your Social Security card',
      option3: 'Other documents',
      option3Desc: 'See all acceptable document options',
      upload: 'Upload',
      processing: 'Processing your document...',
      extracting: 'Extracting information...',
      complete: 'Processing complete!',
      error: 'Error processing document',
      retry: 'Retry',
      remove: 'Remove',
      continue: 'Continue',
      documentNumber: 'Document Number',
      expires: 'Expires',
      issuer: 'Issuing Authority',
      changeSelection: 'Change Document Selection',
      listATitle: 'List A Documents',
      listADesc: 'Documents that establish both identity and employment authorization',
      listBTitle: 'List B Documents',
      listBDesc: 'Documents that establish identity only',
      listCTitle: 'List C Documents',
      listCDesc: 'Documents that establish employment authorization only',
      listBCNote: 'You must provide one document from List B AND one from List C',
      ssnLabel: 'Social Security Number',
      ssnPlaceholder: 'Enter your 9-digit SSN (XXX-XX-XXXX)',
      ssnRequired: 'SSN is required for List A documents'
    },
    es: {
      title: 'Cargar Documentos',
      subtitle: 'Cargue sus documentos para verificación I-9',
      question: '¿Qué documentos tiene?',
      option1: 'Pasaporte de EE.UU. o Tarjeta Verde',
      option1Desc: 'Un documento establece identidad y autorización de trabajo',
      option2: 'Licencia de Conducir',
      option2Desc: 'También necesitará cargar su tarjeta de Seguro Social',
      option3: 'Otros documentos',
      option3Desc: 'Ver todas las opciones de documentos aceptables',
      upload: 'Cargar',
      processing: 'Procesando su documento...',
      extracting: 'Extrayendo información...',
      complete: '¡Procesamiento completo!',
      error: 'Error al procesar documento',
      retry: 'Reintentar',
      remove: 'Eliminar',
      continue: 'Continuar',
      documentNumber: 'Número de Documento',
      expires: 'Vence',
      issuer: 'Autoridad Emisora',
      changeSelection: 'Cambiar Selección de Documento',
      listATitle: 'Documentos de Lista A',
      listADesc: 'Documentos que establecen identidad y autorización de empleo',
      listBTitle: 'Documentos de Lista B',
      listBDesc: 'Documentos que establecen solo identidad',
      listCTitle: 'Documentos de Lista C',
      listCDesc: 'Documentos que establecen solo autorización de empleo',
      listBCNote: 'Debe proporcionar un documento de Lista B Y uno de Lista C',
      ssnLabel: 'Número de Seguro Social',
      ssnPlaceholder: 'Ingrese su SSN de 9 dígitos (XXX-XX-XXXX)',
      ssnRequired: 'El SSN es requerido para documentos de Lista A'
    }
  }
  
  const t = translations[language]
  
  // Handle changing document selection
  const handleChangeSelection = () => {
    // Clear all uploaded documents
    setUploadedDocuments([])
    // Reset document choice
    setDocumentChoice('')
    // Clear selected documents for "other" option
    setSelectedDocuments([])
    // Clear SSN
    setSsn('')
    // Clear saved data
    sessionStorage.removeItem('document_upload_data')
  }
  
  // Process document with AI
  const processDocument = async (file: File, docType: string) => {
    const docId = `${docType}-${Date.now()}`
    
    // Add to uploaded documents
    setUploadedDocuments(prev => [...prev, {
      id: docId,
      file,
      type: docType,
      status: 'uploading'
    }])
    
    try {
      // Create FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', docType)
      
      // Update status to processing
      setUploadedDocuments(prev => prev.map(doc => 
        doc.id === docId ? { ...doc, status: 'processing' } : doc
      ))
      
      // Call backend API
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const response = await axios.post(
        `${apiUrl}/api/documents/process`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      
      // Update with extracted data
      console.log('Document processing response:', response.data)
      console.log('Document type:', docType)
      
      const extractedData = response.data.data || response.data
      console.log('Extracted data for', docType, ':', extractedData)
      
      // For SSN card, ensure the SSN is available at the root level
      if (docType === 'social_security_card' && extractedData.ssn) {
        console.log('SSN found in response:', extractedData.ssn)
      }
      
      setUploadedDocuments(prev => prev.map(doc => 
        doc.id === docId ? {
          ...doc,
          status: 'complete',
          extractedData: extractedData
        } : doc
      ))
      
    } catch (error) {
      console.error('Document processing error:', error)
      setUploadedDocuments(prev => prev.map(doc => 
        doc.id === docId ? {
          ...doc,
          status: 'error',
          error: 'Failed to process document'
        } : doc
      ))
    }
  }
  
  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Please upload an image or PDF file')
      return
    }
    
    // Process the document
    setIsProcessing(true)
    await processDocument(file, docType)
    setIsProcessing(false)
  }
  
  // Check if ready to continue
  const isReady = () => {
    if (documentChoice === 'passport') {
      // Need one List A document and SSN
      const hasListADoc = uploadedDocuments.some(doc => {
        const docOption = DOCUMENT_OPTIONS.find(opt => opt.apiType === doc.type)
        return docOption?.category === 'listA' && doc.status === 'complete'
      })
      const hasValidSSN = ssn.trim().length > 0
      return hasListADoc && hasValidSSN
    } else if (documentChoice === 'dl_ssn') {
      const hasLicense = uploadedDocuments.some(doc => 
        doc.type === 'drivers_license' && doc.status === 'complete'
      )
      const hasSSN = uploadedDocuments.some(doc => 
        doc.type === 'social_security_card' && doc.status === 'complete'
      )
      return hasLicense && hasSSN
    } else if (documentChoice === 'other') {
      // Need either one List A document OR one List B + one List C
      const completedDocs = uploadedDocuments.filter(doc => doc.status === 'complete')
      
      // Check for List A
      const hasListA = completedDocs.some(doc => {
        const docOption = DOCUMENT_OPTIONS.find(opt => opt.apiType === doc.type)
        return docOption?.category === 'listA'
      })
      
      if (hasListA) return true
      
      // Check for List B + List C combination
      const hasListB = completedDocs.some(doc => {
        const docOption = DOCUMENT_OPTIONS.find(opt => opt.apiType === doc.type)
        return docOption?.category === 'listB'
      })
      
      const hasListC = completedDocs.some(doc => {
        const docOption = DOCUMENT_OPTIONS.find(opt => opt.apiType === doc.type)
        return docOption?.category === 'listC'
      })
      
      return hasListB && hasListC
    }
    return false
  }
  
  // Handle completion
  const handleComplete = () => {
    console.log('handleComplete - uploadedDocuments:', uploadedDocuments)
    
    const extractedData = uploadedDocuments
      .filter(doc => doc.status === 'complete')
      .map(doc => {
        console.log('Processing document:', doc.type, 'with extractedData:', doc.extractedData)
        return {
          documentType: doc.type,
          type: doc.type, // Add both for compatibility
          ...doc.extractedData
        }
      })
    
    console.log('DocumentUploadEnhanced - Final extracted data array:', extractedData)
    
    // Look specifically for SSN data
    const ssnDoc = extractedData.find(d => d.documentType === 'social_security_card')
    console.log('SSN document found:', ssnDoc)
    
    // Clear saved data on successful completion
    sessionStorage.removeItem('document_upload_data')
    
    onComplete({ 
      uploadedDocuments: uploadedDocuments.map(doc => ({
        type: doc.type,
        fileName: doc.file?.name || `${doc.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
      })),
      extractedData,
      ssn: documentChoice === 'passport' ? ssn : undefined
    })
  }
  
  return (
    <div className="space-y-6">
      {/* Document Choice */}
      {!documentChoice && (
        <Card>
          <CardHeader>
            <CardTitle>{t.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup onValueChange={(value: any) => setDocumentChoice(value)}>
              <div className="space-y-3">
                <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="passport" className="mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">{t.option1}</p>
                    <p className="text-sm text-gray-600">{t.option1Desc}</p>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="dl_ssn" className="mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">{t.option2}</p>
                    <p className="text-sm text-gray-600">{t.option2Desc}</p>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="other" className="mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">{t.option3}</p>
                    <p className="text-sm text-gray-600">{t.option3Desc}</p>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}
      
      {/* Change Selection Button */}
      {documentChoice && (
        <div className="flex justify-start mb-4">
          <Button
            variant="outline"
            onClick={handleChangeSelection}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.changeSelection}
          </Button>
        </div>
      )}
      
      {/* SSN Input for List A documents */}
      {documentChoice === 'passport' && (
        <Card>
          <CardHeader>
            <CardTitle>{t.ssnLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="ssn-input">{t.ssnLabel}</Label>
              <Input
                id="ssn-input"
                type="text"
                placeholder={t.ssnPlaceholder}
                value={ssn}
                onChange={(e) => {
                  // Format SSN as user types (XXX-XX-XXXX)
                  let value = e.target.value.replace(/\D/g, '')
                  if (value.length > 0) {
                    if (value.length <= 3) {
                      value = value
                    } else if (value.length <= 5) {
                      value = value.slice(0, 3) + '-' + value.slice(3)
                    } else {
                      value = value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5, 9)
                    }
                  }
                  setSsn(value)
                }}
                maxLength={11}
                className="font-mono"
              />
              {ssn.trim().length === 0 && (
                <p className="text-sm text-amber-600">{t.ssnRequired}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Document Upload */}
      {documentChoice === 'passport' && (
        <Card>
          <CardHeader>
            <CardTitle>{t.option1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Passport Upload */}
            <div className="p-4 border-2 border-dashed rounded-lg">
              <div className="text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <label htmlFor="passport-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    {t.upload} U.S. Passport
                  </span>
                  <input
                    id="passport-upload"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileSelect(e, 'us_passport')}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </label>
              </div>
            </div>
            
            {/* Green Card Upload */}
            <div className="p-4 border-2 border-dashed rounded-lg">
              <div className="text-center">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <label htmlFor="greencard-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    {t.upload} Green Card
                  </span>
                  <input
                    id="greencard-upload"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileSelect(e, 'permanent_resident_card')}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {documentChoice === 'dl_ssn' && (
        <div className="space-y-4">
          {/* Driver's License */}
          <Card>
            <CardHeader>
              <CardTitle>Driver's License</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <Car className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <label htmlFor="dl-upload" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      {t.upload} Driver's License
                    </span>
                    <input
                      id="dl-upload"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileSelect(e, 'drivers_license')}
                      className="hidden"
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Social Security Card */}
          <Card>
            <CardHeader>
              <CardTitle>Social Security Card</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <label htmlFor="ssn-upload" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      {t.upload} Social Security Card
                    </span>
                    <input
                      id="ssn-upload"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileSelect(e, 'social_security_card')}
                      className="hidden"
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Other Documents Option */}
      {documentChoice === 'other' && (
        <div className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {t.listBCNote}
            </AlertDescription>
          </Alert>
          
          {/* List A Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.listATitle}</CardTitle>
              <p className="text-sm text-gray-600">{t.listADesc}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {DOCUMENT_OPTIONS.filter(doc => doc.category === 'listA').map(doc => (
                <div key={doc.id} className="p-4 border-2 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                  <div className="text-center">
                    {doc.icon}
                    <p className="mt-2 font-medium">{doc.title}</p>
                    <p className="text-sm text-gray-600">{doc.description}</p>
                    <label htmlFor={`${doc.id}-upload`} className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                        {t.upload}
                      </span>
                      <input
                        id={`${doc.id}-upload`}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileSelect(e, doc.apiType)}
                        className="hidden"
                        disabled={isProcessing}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* List B and C Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* List B */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.listBTitle}</CardTitle>
                <p className="text-sm text-gray-600">{t.listBDesc}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {DOCUMENT_OPTIONS.filter(doc => doc.category === 'listB').map(doc => (
                  <div key={doc.id} className="p-4 border-2 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      {doc.icon}
                      <p className="mt-2 font-medium text-sm">{doc.title}</p>
                      <p className="text-xs text-gray-600">{doc.description}</p>
                      <label htmlFor={`${doc.id}-upload`} className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                          {t.upload}
                        </span>
                        <input
                          id={`${doc.id}-upload`}
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileSelect(e, doc.apiType)}
                          className="hidden"
                          disabled={isProcessing}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            {/* List C */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.listCTitle}</CardTitle>
                <p className="text-sm text-gray-600">{t.listCDesc}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {DOCUMENT_OPTIONS.filter(doc => doc.category === 'listC').map(doc => (
                  <div key={doc.id} className="p-4 border-2 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      {doc.icon}
                      <p className="mt-2 font-medium text-sm">{doc.title}</p>
                      <p className="text-xs text-gray-600">{doc.description}</p>
                      <label htmlFor={`${doc.id}-upload`} className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                          {t.upload}
                        </span>
                        <input
                          id={`${doc.id}-upload`}
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileSelect(e, doc.apiType)}
                          className="hidden"
                          disabled={isProcessing}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* Processing Status */}
      {uploadedDocuments.map(doc => (
        <Card key={doc.id} className="relative">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">{doc.file?.name || `${doc.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`}</p>
                  {doc.status === 'uploading' && (
                    <p className="text-sm text-gray-600">{t.upload}...</p>
                  )}
                  {doc.status === 'processing' && (
                    <p className="text-sm text-blue-600">{t.extracting}</p>
                  )}
                  {doc.status === 'complete' && doc.extractedData && (
                    <div className="text-sm text-green-600">
                      {doc.extractedData.documentNumber && (
                        <p>{t.documentNumber}: {doc.extractedData.documentNumber}</p>
                      )}
                      {doc.extractedData.expirationDate && (
                        <p>{t.expires}: {doc.extractedData.expirationDate}</p>
                      )}
                    </div>
                  )}
                  {doc.status === 'error' && (
                    <p className="text-sm text-red-600">{doc.error}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {doc.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                )}
                {doc.status === 'processing' && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
                {doc.status === 'complete' && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                {doc.status === 'error' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setUploadedDocuments(prev => prev.filter(d => d.id !== doc.id))
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {doc.status === 'processing' && (
              <Progress value={66} className="mt-2" />
            )}
          </CardContent>
        </Card>
      ))}
      
      {/* Continue Button */}
      {documentChoice && (
        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleComplete}
            disabled={!isReady() || isProcessing}
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.processing}
              </>
            ) : (
              <>
                {t.continue}
                {isReady() && <CheckCircle className="ml-2 h-4 w-4" />}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}