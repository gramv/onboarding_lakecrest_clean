import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FormSection } from '@/components/ui/form-section'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'
import {
  Upload,
  FileText,
  CheckCircle,
  X,
  AlertCircle,
  Image,
  Loader2,
  Eye,
  Download,
  Trash2
} from 'lucide-react'
import axios from 'axios'
import { getApiUrl } from '@/config/api'

interface UploadedDocument {
  id: string
  type: 'list_a' | 'list_b' | 'list_c' | 'ssn'
  documentType: string
  fileName: string
  fileSize: number
  fileData: string // Base64
  uploadedAt: string
  ocrData?: any  // OCR extracted data
  manualData?: {  // Manually entered data (fallback if OCR fails)
    documentNumber?: string
    expirationDate?: string
    issuingAuthority?: string
    firstName?: string
    lastName?: string
    dateOfBirth?: string
    alienNumber?: string
    uscisNumber?: string
    ssn?: string
  }
  dataSource?: 'ocr' | 'manual' | 'hybrid'  // Track data source
  ocrAttempted?: boolean  // Track if OCR was attempted
  ocrFailed?: boolean  // Track if OCR failed
  preview?: string // For images
}

interface I9Section2Data {
  documentSelection: 'list_a' | 'list_bc' | ''
  uploadedDocuments: UploadedDocument[]
  listADocument?: UploadedDocument
  listBDocument?: UploadedDocument
  listCDocument?: UploadedDocument
  ssnDocument?: UploadedDocument  // SSN required for List A (payroll/direct deposit)
  verificationComplete: boolean
}

export default function I9Section2Step({
  currentStep,
  progress,
  markStepComplete,
  saveProgress,
  advanceToNextStep: _advanceToNextStep,
  language = 'en',
  employee,
  property,
  canProceedToNext: _canProceedToNext
}: StepProps) {
  
  const [formData, setFormData] = useState<I9Section2Data>({
    documentSelection: '',
    uploadedDocuments: [],
    verificationComplete: false
  })
  
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [processingOcr, setProcessingOcr] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState<{
    list_a?: boolean
    list_b?: boolean
    list_c?: boolean
    ssn?: boolean
  }>({})
  const fileInputRefs = {
    list_a: useRef<HTMLInputElement>(null),
    list_b: useRef<HTMLInputElement>(null),
    list_c: useRef<HTMLInputElement>(null),
    ssn: useRef<HTMLInputElement>(null)  // SSN upload for List A
  }

  // Auto-save hook
  const { saveStatus } = useAutoSave(formData, {
    onSave: async (data) => {
      await saveProgress(currentStep.id, data)
    }
  })

  // Load saved data from cloud/session storage on mount
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        // Check sessionStorage (may have cloud data already loaded by portal)
        const savedData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
        console.log('I9Section2Step - Loading saved document data:', savedData)
        
        if (savedData) {
          const parsed = JSON.parse(savedData)
          console.log('I9Section2Step - Parsed data:', parsed)
          
          // Handle both direct format and cloud format
          let dataToLoad = {}
          if (parsed.uploadedDocuments) {
            // Direct format - as expected
            dataToLoad = parsed
          } else if (parsed.documents) {
            // Cloud format with documents array
            dataToLoad = {
              documentSelection: parsed.documentSelection || '',
              uploadedDocuments: parsed.uploadedDocuments || parsed.documents || [],
              verificationComplete: parsed.verificationComplete || false
            }
          } else {
            // Fallback to any structure
            dataToLoad = parsed
          }
          
          if (dataToLoad.uploadedDocuments || dataToLoad.documents) {
            setFormData({
              documentSelection: dataToLoad.documentSelection || '',
              uploadedDocuments: dataToLoad.uploadedDocuments || dataToLoad.documents || [],
              listADocument: dataToLoad.listADocument,
              listBDocument: dataToLoad.listBDocument,
              listCDocument: dataToLoad.listCDocument,
              verificationComplete: dataToLoad.verificationComplete || false
            })
            console.log('I9Section2Step - Loaded documents from saved data')
          }
        }
      } catch (error) {
        console.error('Failed to load existing I9 Section 2 data:', error)
      }
    }
    loadExistingData()
  }, [currentStep.id])

  // Save data to session storage and cloud whenever it changes
  useEffect(() => {
    const dataToSave = {
      ...formData,
      lastUpdated: new Date().toISOString()
    }
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(dataToSave))
    console.log('I9Section2Step - Saved documents to session storage')
    
    // Also save to cloud via saveProgress
    if (formData.uploadedDocuments.length > 0) {
      saveProgress(currentStep.id, dataToSave)
    }
  }, [formData, currentStep.id, saveProgress])

  const handleFileUpload = async (file: File, documentList: 'list_a' | 'list_b' | 'list_c' | 'ssn') => {
    // Validate file
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only JPG, PNG, and PDF files are allowed')
      return
    }

    setUploadingDocument(documentList)
    setUploadError(null)

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file)
      
      // Create document object
      const newDocument: UploadedDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: documentList,
        documentType: getDocumentTypeFromFileName(file.name, documentList),
        fileName: file.name,
        fileSize: file.size,
        fileData: base64,
        uploadedAt: new Date().toISOString(),
        file: file, // Store original File object for upload to Supabase
        originalFile: file // Also store as originalFile for compatibility
      }

      // If it's an image, create a preview
      if (file.type.startsWith('image/')) {
        newDocument.preview = base64
      }

      // Process with OCR and upload to Supabase storage
      if (employee?.id) {
        setProcessingOcr(true)
        try {
          // Step 1: OCR Processing (OPTIONAL - don't block if it fails)
          const ocrFormData = new FormData()
          ocrFormData.append('file', file)
          // Map 'ssn' to 'list_c' for OCR processing (SSN is a List C document)
          const ocrDocType = documentList === 'ssn' ? 'list_c' : documentList
          ocrFormData.append('document_type', ocrDocType)
          ocrFormData.append('employee_id', employee.id)

          const ocrResponse = await axios.post(
            `${getApiUrl()}/documents/process`,
            ocrFormData,
            {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            }
          )

          if (ocrResponse.data.success) {
            newDocument.ocrData = ocrResponse.data.data.extracted_data
            newDocument.ocrAttempted = true
            newDocument.ocrFailed = false
            newDocument.dataSource = 'ocr'
            console.log('✅ OCR data extracted successfully:', newDocument.ocrData)
          } else {
            // OCR returned but failed to extract data
            newDocument.ocrAttempted = true
            newDocument.ocrFailed = true
            newDocument.dataSource = 'manual'
            console.warn('⚠️ OCR failed to extract data:', ocrResponse.data.message)
            setUploadError('OCR processing failed. Please enter document information manually below.')
          }

          // Step 2: Upload to Supabase storage (in parallel or after OCR)
          try {
            const { uploadOnboardingDocument } = await import('../../services/onboardingDocuments')
            const uploadResult = await uploadOnboardingDocument({
              employeeId: employee.id,
              documentType: documentList, // This will be 'list_a', 'list_b', 'list_c'
              documentCategory: documentList, // Backend expects this format
              file: file
            })

            // Store upload metadata
            newDocument.storageMetadata = uploadResult?.data || uploadResult
            console.log('Document uploaded to Supabase storage:', uploadResult)

          } catch (uploadError) {
            console.error('Failed to upload document to storage:', uploadError)
            // Continue without storage upload - will retry in I9CompleteStep
          }

        } catch (ocrError) {
          // OCR service unavailable or error - DON'T BLOCK USER
          newDocument.ocrAttempted = true
          newDocument.ocrFailed = true
          newDocument.dataSource = 'manual'
          console.error('❌ OCR processing error (service may be unavailable):', ocrError)

          // Show user-friendly message - they can still proceed with manual entry
          setUploadError(
            'OCR processing is currently unavailable. Please enter document information manually below.'
          )

          // Auto-show manual entry form
          setShowManualEntry(prev => ({ ...prev, [documentList]: true }))
        } finally {
          setProcessingOcr(false)
        }
      }

      // Update form data based on document list
      setFormData(prev => {
        const updated = { ...prev }

        if (documentList === 'list_a') {
          updated.listADocument = newDocument
        } else if (documentList === 'list_b') {
          updated.listBDocument = newDocument
        } else if (documentList === 'list_c') {
          updated.listCDocument = newDocument
        } else if (documentList === 'ssn') {
          updated.ssnDocument = newDocument
        }

        // Add to uploaded documents array
        updated.uploadedDocuments = [
          ...prev.uploadedDocuments.filter(d => d.type !== documentList),
          newDocument
        ]

        return updated
      })

      console.log(`Document uploaded for ${documentList}:`, file.name)
    } catch (error) {
      console.error('Error uploading document:', error)
      setUploadError('Failed to upload document. Please try again.')
    } finally {
      setUploadingDocument(null)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const getDocumentTypeFromFileName = (fileName: string, list: string): string => {
    const lower = fileName.toLowerCase()
    if (list === 'list_a') {
      if (lower.includes('passport')) return 'US Passport'
      if (lower.includes('green') || lower.includes('card')) return 'Permanent Resident Card'
      if (lower.includes('authorization')) return 'Employment Authorization Card'
      return 'List A Document'
    } else if (list === 'list_b') {
      if (lower.includes('license') || lower.includes('dl')) return "Driver's License"
      if (lower.includes('id')) return 'State ID Card'
      return 'List B Document'
    } else if (list === 'ssn') {
      return 'Social Security Card'
    } else {
      if (lower.includes('ssn') || lower.includes('social')) return 'Social Security Card'
      if (lower.includes('birth')) return 'Birth Certificate'
      return 'List C Document'
    }
  }

  const handleRemoveDocument = (documentList: 'list_a' | 'list_b' | 'list_c' | 'ssn') => {
    setFormData(prev => {
      const updated = { ...prev }

      if (documentList === 'list_a') {
        updated.listADocument = undefined
      } else if (documentList === 'list_b') {
        updated.listBDocument = undefined
      } else if (documentList === 'list_c') {
        updated.listCDocument = undefined
      } else if (documentList === 'ssn') {
        updated.ssnDocument = undefined
      }

      // Remove from uploaded documents array
      updated.uploadedDocuments = prev.uploadedDocuments.filter(d => d.type !== documentList)

      return updated
    })
  }

  const handleManualDataChange = (
    list: 'list_a' | 'list_b' | 'list_c' | 'ssn',
    field: string,
    value: string
  ) => {
    setFormData(prev => {
      const updated = { ...prev }
      let doc: UploadedDocument | undefined

      if (list === 'list_a') doc = updated.listADocument
      else if (list === 'list_b') doc = updated.listBDocument
      else if (list === 'list_c') doc = updated.listCDocument
      else if (list === 'ssn') doc = updated.ssnDocument

      if (doc) {
        doc.manualData = {
          ...doc.manualData,
          [field]: value
        }
        // Update data source
        doc.dataSource = doc.ocrData ? 'hybrid' : 'manual'

        // Update in uploadedDocuments array as well
        const docIndex = updated.uploadedDocuments.findIndex(d => d.type === list)
        if (docIndex !== -1) {
          updated.uploadedDocuments[docIndex] = doc
        }
      }

      return updated
    })
  }

  const hasRequiredManualData = (
    doc: UploadedDocument,
    type: 'list_a' | 'list_b' | 'list_c' | 'ssn'
  ): boolean => {
    if (!doc.manualData) return false

    // SSN requires SSN field
    if (type === 'ssn') {
      return !!doc.manualData.ssn
    }

    // All other documents require document number and issuing authority
    return !!(doc.manualData.documentNumber && doc.manualData.issuingAuthority)
  }

  const handleComplete = async () => {
    const completeData = {
      ...formData,
      verificationComplete: true,
      completedAt: new Date().toISOString()
    }

    setFormData(completeData)
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(completeData))
    
    // Save to cloud via both general progress and dedicated endpoint
    await saveProgress(currentStep.id, completeData)
    
    // Save document metadata to cloud via dedicated I-9 Section 2 endpoint
    if (employee?.id && !employee.id.startsWith('demo-')) {
      try {
        // Prepare document metadata without base64 data for cloud storage
        const documentMetadata = completeData.uploadedDocuments.map(doc => ({
          id: doc.id,
          type: doc.type,
          documentType: doc.documentType,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt,
          ocrData: doc.ocrData
          // Exclude fileData (base64) as it's already stored via /api/documents/process
        }))
        
        const response = await fetch(
          `${getApiUrl()}/onboarding/${employee.id}/i9-section2`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              documentSelection: completeData.documentSelection,
              uploadedDocuments: documentMetadata,
              verificationComplete: true,
              completedAt: completeData.completedAt
            })
          }
        )
        
        if (response.ok) {
          console.log('I9Section2Step - Document metadata saved to cloud')
        } else {
          console.error('Failed to save I-9 Section 2 to cloud:', await response.text())
        }
      } catch (error) {
        console.error('Error saving I-9 Section 2 to cloud:', error)
      }
    }
    
    await markStepComplete(currentStep.id, completeData)
  }

  const canProceed = () => {
    // SSN is ALWAYS required for all employees
    const hasSsnData = formData.ssnDocument && (
      formData.ssnDocument.ocrData ||
      hasRequiredManualData(formData.ssnDocument, 'ssn')
    )

    if (!hasSsnData) return false  // Block if no SSN

    if (formData.documentSelection === 'list_a') {
      // List A requires List A document + SSN
      const hasListAData = formData.listADocument && (
        formData.listADocument.ocrData ||
        hasRequiredManualData(formData.listADocument, 'list_a')
      )
      return hasListAData
    } else if (formData.documentSelection === 'list_bc') {
      // List B+C requires List B + List C + SSN
      const hasListBData = formData.listBDocument && (
        formData.listBDocument.ocrData ||
        hasRequiredManualData(formData.listBDocument, 'list_b')
      )
      const hasListCData = formData.listCDocument && (
        formData.listCDocument.ocrData ||
        hasRequiredManualData(formData.listCDocument, 'list_c')
      )
      return hasListBData && hasListCData
    }
    return false
  }

  const renderManualDataEntry = (
    doc: UploadedDocument,
    list: 'list_a' | 'list_b' | 'list_c' | 'ssn'
  ) => {
    return (
      <Card className="mt-4 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            {doc.ocrFailed ? (
              <>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span>⚠️ OCR Failed - Enter Document Information Manually</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Manual Data Entry</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {list === 'ssn' ? (
            // SSN Card - only need SSN
            <div>
              <Label htmlFor={`${list}-ssn`}>Social Security Number *</Label>
              <Input
                id={`${list}-ssn`}
                value={doc.manualData?.ssn || ''}
                onChange={(e) => handleManualDataChange(list, 'ssn', e.target.value)}
                placeholder="XXX-XX-XXXX"
                pattern="\d{3}-\d{2}-\d{4}"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Format: XXX-XX-XXXX</p>
            </div>
          ) : (
            // Other documents - need document number, expiration, issuing authority
            <>
              <div>
                <Label htmlFor={`${list}-docNumber`}>
                  Document Number *
                  {doc.ocrData?.document_number && (
                    <span className="ml-2 text-xs text-green-600 font-normal">✓ Auto-filled from OCR</span>
                  )}
                </Label>
                <Input
                  id={`${list}-docNumber`}
                  value={doc.manualData?.documentNumber || doc.ocrData?.document_number || ''}
                  onChange={(e) => handleManualDataChange(list, 'documentNumber', e.target.value)}
                  placeholder="Enter document number as shown on document"
                  className={doc.ocrData?.document_number ? 'bg-green-50 border-green-300' : ''}
                />
              </div>

              <div>
                <Label htmlFor={`${list}-expiration`}>
                  Expiration Date
                  {doc.ocrData?.expiration_date && (
                    <span className="ml-2 text-xs text-green-600 font-normal">✓ Auto-filled from OCR</span>
                  )}
                </Label>
                <Input
                  id={`${list}-expiration`}
                  type="date"
                  value={doc.manualData?.expirationDate || doc.ocrData?.expiration_date || ''}
                  onChange={(e) => handleManualDataChange(list, 'expirationDate', e.target.value)}
                  className={doc.ocrData?.expiration_date ? 'bg-green-50 border-green-300' : ''}
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank if document does not expire</p>
              </div>

              <div>
                <Label htmlFor={`${list}-authority`}>
                  Issuing Authority *
                  {doc.ocrData?.issuing_authority && (
                    <span className="ml-2 text-xs text-green-600 font-normal">✓ Auto-filled from OCR</span>
                  )}
                </Label>
                <Input
                  id={`${list}-authority`}
                  value={doc.manualData?.issuingAuthority || doc.ocrData?.issuing_authority || ''}
                  onChange={(e) => handleManualDataChange(list, 'issuingAuthority', e.target.value)}
                  placeholder="e.g., California DMV, USCIS, Social Security Administration"
                  className={doc.ocrData?.issuing_authority ? 'bg-green-50 border-green-300' : ''}
                />
                <p className="text-xs text-gray-500 mt-1">State, country, or agency that issued the document</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderDocumentUpload = (
    list: 'list_a' | 'list_b' | 'list_c' | 'ssn',
    title: string,
    description: string,
    acceptedDocs: string[],
    uploadedDoc?: UploadedDocument
  ) => {
    const isUploading = uploadingDocument === list

    return (
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <p className="text-sm text-gray-600">{description}</p>
        </CardHeader>
        <CardContent>
          {uploadedDoc ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {uploadedDoc.preview ? (
                    <Image className="h-8 w-8 text-green-600" />
                  ) : (
                    <FileText className="h-8 w-8 text-green-600" />
                  )}
                  <div>
                    <p className="font-medium">{uploadedDoc.fileName}</p>
                    <p className="text-sm text-gray-600">
                      {(uploadedDoc.fileSize / 1024).toFixed(2)} KB • Uploaded {new Date(uploadedDoc.uploadedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDocument(list)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* OCR Status Indicator */}
              {uploadedDoc.ocrAttempted && (
                <Alert className={uploadedDoc.ocrFailed ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}>
                  <AlertCircle className={`h-4 w-4 ${uploadedDoc.ocrFailed ? 'text-yellow-600' : 'text-green-600'}`} />
                  <AlertDescription className={uploadedDoc.ocrFailed ? 'text-yellow-800' : 'text-green-800'}>
                    {uploadedDoc.ocrFailed ? (
                      <>
                        <strong>OCR Unavailable:</strong> Please enter document information manually below.
                      </>
                    ) : (
                      <>
                        <strong>OCR Successful:</strong> Data extracted automatically. You can edit if needed.
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Manual Entry Form - Show if OCR failed or user wants to edit */}
              {(uploadedDoc.ocrFailed || showManualEntry[list]) && (
                renderManualDataEntry(uploadedDoc, list)
              )}

              {/* Toggle button for manual entry (only if OCR succeeded) */}
              {!uploadedDoc.ocrFailed && uploadedDoc.ocrData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualEntry(prev => ({ ...prev, [list]: !prev[list] }))}
                  className="mt-2"
                >
                  {showManualEntry[list] ? 'Hide Manual Entry' : 'Edit Data Manually'}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <input
                ref={fileInputRefs[list]}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleFileUpload(file, list)
                  }
                }}
              />
              
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileInputRefs[list].current?.click()}
              >
                {isUploading ? (
                  <div className="space-y-2">
                    <Loader2 className="h-12 w-12 mx-auto text-blue-600 animate-spin" />
                    <p className="text-gray-600">Uploading document...</p>
                    {processingOcr && (
                      <p className="text-sm text-gray-500">Processing with OCR...</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="text-gray-600">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">PDF, JPG, or PNG (max 10MB)</p>
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Accepted documents:</p>
                <ul className="list-disc list-inside space-y-1">
                  {acceptedDocs.map((doc, idx) => (
                    <li key={idx}>{doc}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const translations = {
    en: {
      title: 'I-9 Section 2: Document Verification',
      description: 'Upload documents to verify your identity and employment authorization',
      documentSelection: 'Select which documents you will provide:',
      listAOption: 'One document from List A (establishes both identity and work authorization)',
      listBCOption: 'One document from List B AND one from List C',
      listATitle: 'List A Document',
      listADesc: 'Documents that establish both identity and employment authorization',
      listBTitle: 'List B Document',
      listBDesc: 'Documents that establish identity',
      listCTitle: 'List C Document',
      listCDesc: 'Documents that establish employment authorization (Birth Certificate, Employment Authorization, etc.)',
      proceedButton: 'Submit Documents',
      errorTitle: 'Upload Error',
      completedMessage: 'Documents have been uploaded and verified successfully.'
    },
    es: {
      title: 'I-9 Sección 2: Verificación de Documentos',
      description: 'Suba documentos para verificar su identidad y autorización de empleo',
      documentSelection: 'Seleccione qué documentos proporcionará:',
      listAOption: 'Un documento de la Lista A (establece identidad y autorización de trabajo)',
      listBCOption: 'Un documento de la Lista B Y uno de la Lista C',
      listATitle: 'Documento de Lista A',
      listADesc: 'Documentos que establecen identidad y autorización de empleo',
      listBTitle: 'Documento de Lista B',
      listBDesc: 'Documentos que establecen identidad',
      listCTitle: 'Documento de Lista C',
      listCDesc: 'Documentos que establecen autorización de empleo (Certificado de Nacimiento, Autorización de Empleo, etc.)',
      proceedButton: 'Enviar Documentos',
      errorTitle: 'Error de Carga',
      completedMessage: 'Los documentos han sido cargados y verificados exitosamente.'
    }
  }

  const t = translations[language]

  const listADocs = [
    'U.S. Passport',
    'Permanent Resident Card (Green Card)',
    'Employment Authorization Card',
    'Foreign passport with I-551 stamp or I-94'
  ]

  const listBDocs = [
    "Driver's License",
    'State-issued ID Card',
    'School ID with photograph',
    'Voter Registration Card',
    'U.S. Military Card'
  ]

  const listCDocs = [
    'Birth Certificate',
    'Employment authorization document issued by DHS',
    'Certification of Birth Abroad',
    'Native American tribal document',
    'U.S. Citizen ID Card'
    // Note: Social Security Card is now a separate, always-required upload
  ]

  return (
    <StepContainer errors={[]} fieldErrors={{}} saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-6">
          {/* Step Header */}
          <div className="text-center mb-6">
            <h1 className="text-heading-secondary font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-600 mt-2 text-base">{t.description}</p>
          </div>

          {/* Completion Status */}
          {formData.verificationComplete && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {t.completedMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Error */}
          {uploadError && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>{t.errorTitle}:</strong> {uploadError}
              </AlertDescription>
            </Alert>
          )}

          {/* Document Selection */}
          <FormSection
            title="Document Selection"
            description="Choose which documents you will provide for verification"
            icon={<FileText className="h-5 w-5" />}
            required={true}
          >
            <div className="space-y-4">
              <Label>{t.documentSelection}</Label>
              <RadioGroup
                value={formData.documentSelection}
                onValueChange={(value: 'list_a' | 'list_bc') => 
                  setFormData(prev => ({ ...prev, documentSelection: value }))
                }
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="list_a" id="list_a" />
                  <Label htmlFor="list_a" className="font-normal cursor-pointer">
                    {t.listAOption}
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="list_bc" id="list_bc" />
                  <Label htmlFor="list_bc" className="font-normal cursor-pointer">
                    {t.listBCOption}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </FormSection>

          {/* Document Upload Sections */}
          {formData.documentSelection === 'list_a' && (
            <div className="space-y-6">
              {renderDocumentUpload(
                'list_a',
                t.listATitle,
                t.listADesc,
                listADocs,
                formData.listADocument
              )}
            </div>
          )}

          {formData.documentSelection === 'list_bc' && (
            <div className="space-y-6">
              {renderDocumentUpload(
                'list_b',
                t.listBTitle,
                t.listBDesc,
                listBDocs,
                formData.listBDocument
              )}
              {renderDocumentUpload(
                'list_c',
                t.listCTitle,
                t.listCDesc,
                listCDocs,
                formData.listCDocument
              )}
            </div>
          )}

          {/* SSN Upload - REQUIRED FOR ALL EMPLOYEES (moved outside conditional) */}
          {formData.documentSelection && (
            <div className="space-y-6 mt-8 pt-8 border-t-2 border-gray-200">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Required for All Employees:</strong> Please upload your Social Security Card.
                  <br />
                  <span className="text-sm mt-1 block">
                    This is required for payroll processing, direct deposit, tax forms (W-4, W-2),
                    benefits enrollment, and employment verification (E-Verify).
                  </span>
                </AlertDescription>
              </Alert>

              {renderDocumentUpload(
                'ssn',
                'Social Security Card (Required for All Employees)',
                'Upload a clear photo or scan of your Social Security Card',
                ['Social Security Card'],
                formData.ssnDocument
              )}
            </div>
          )}

        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
