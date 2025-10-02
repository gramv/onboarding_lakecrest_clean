import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, FileText, Upload, Camera, Globe, AlertTriangle } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import I9Section1FormClean from '@/components/I9Section1FormClean'
import I9SupplementA from '@/components/I9SupplementA'
import DocumentUploadEnhanced from './DocumentUploadEnhanced'
import ReviewAndSign from '@/components/ReviewAndSign'
import PDFViewer from '@/components/PDFViewer'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useStepValidation } from '@/hooks/useStepValidation'
import { i9Section1Validator } from '@/utils/stepValidators'
import { generateCleanI9Pdf, addSignatureToExistingPdf } from '@/utils/i9PdfGeneratorClean'
import { scrollToTop } from '@/utils/scrollHelpers'
import axios from 'axios'
import { getApiUrl } from '@/config/api'
import { fetchStepDocumentMetadata, persistStepDocument, listStepDocuments, StepDocumentMetadata } from '@/services/documentService'
import { uploadOnboardingDocument, uploadSignedI9Pdf } from '@/services/onboardingDocuments'
import { Button } from '@/components/ui/button'

// Helper function to create a simple hash of form data
const createFormDataHash = (data: any): string => {
  const relevantData = {
    formData: data.formData,
    supplementsData: data.supplementsData,
    documentsData: data.documentsData?.extractedData // Only hash extracted data, not file contents
  }
  return JSON.stringify(relevantData)
}

export default function I9CompleteStep({
  currentStep,
  progress,
  markStepComplete,
  saveProgress,
  advanceToNextStep,
  language = 'en',
  employee,
  property,
  canProceedToNext: _canProceedToNext
}: StepProps) {
  // State for tabs
  const [activeTab, setActiveTab] = useState('form')
  const [formData, setFormData] = useState<any>({})
  const [supplementsData, setSupplementsData] = useState<any>(null)
  const [documentsData, setDocumentsData] = useState<any>(null)
  
  // State for completion tracking
  const [formComplete, setFormComplete] = useState(false)
  const [supplementsComplete, setSupplementsComplete] = useState(false)
  const [documentsComplete, setDocumentsComplete] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [signatureData, setSignatureData] = useState<any>(null)
  const [signedFormDataHash, setSignedFormDataHash] = useState<string | null>(null)
  const [isAdvancing, setIsAdvancing] = useState(false)
  
  // State for SSN validation
  const [ssnMismatch, setSsnMismatch] = useState<{hasWarning: boolean, acknowledged: boolean}>({hasWarning: false, acknowledged: false})
  
  // State for supplements
  const [needsSupplements, setNeedsSupplements] = useState<'none' | 'translator'>('none')
  
  // State for PDF
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [remotePdfUrl, setRemotePdfUrl] = useState<string | null>(null)
  const [documentMetadata, setDocumentMetadata] = useState<StepDocumentMetadata | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [metadataRequested, setMetadataRequested] = useState(false)
  const [uploadedDocsMetadata, setUploadedDocsMetadata] = useState<any>(null)
  const [sessionToken, setSessionToken] = useState<string>('')

  // Track which files are missing from Supabase
  const [missingFiles, setMissingFiles] = useState<{
    i9Pdf: boolean
    dlDocument: boolean
    ssnDocument: boolean
  }>({ i9Pdf: false, dlDocument: false, ssnDocument: false })
  const [filesValidated, setFilesValidated] = useState(false)

  // Validation hook
  const { errors, fieldErrors, validate } = useStepValidation(i9Section1Validator)
  
  // Auto-save data
  const autoSaveData = {
    activeTab,
    formData,
    supplementsData,
    documentsData,
    formComplete,
    supplementsComplete,
    documentsComplete,
    needsSupplements,
    isSigned,
    ssnMismatch,
    signatureData,
    signedFormDataHash
  }
  
  // Debug log citizenship status and check for SSN mismatches
  useEffect(() => {
    if (formData.citizenship_status) {
      console.log('Auto-save formData citizenship_status:', formData.citizenship_status)
    }
    
    // Check for SSN mismatch when both formData and documentsData are available
    if (formData.ssn && documentsData?.extractedData) {
      checkSsnMismatch()
    }
  }, [formData.citizenship_status, formData.ssn, documentsData])
  
  // Auto-save hook
  const { saveStatus } = useAutoSave(autoSaveData, {
    onSave: async (data) => {
      console.log('I9CompleteStep - Saving data with citizenship_status:', data.formData?.citizenship_status)
      await saveProgress(currentStep.id, data)
      // Also save to sessionStorage with metadata
      const saveData = {
        ...data,
        documentMetadata,
        remotePdfUrl
      }
      sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(saveData))
    }
  })

  // Get session token
  useEffect(() => {
    const token = sessionStorage.getItem('hotel_onboarding_token') || ''
    setSessionToken(token)
  }, [])

  // Load existing data
  useEffect(() => {
    const loadData = async () => {
      // Check if already completed
      if (progress.completedSteps.includes(currentStep.id)) {
        setIsSigned(true)
        setFormComplete(true)
        setSupplementsComplete(true)
        setDocumentsComplete(true)
        setActiveTab('preview')
      }
      
      let dataToUse = null
      
      // Load saved data from session storage
      const savedData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
      if (savedData) {
        try {
          dataToUse = JSON.parse(savedData)
          console.log('Loading saved I9 data from session:', {
            hasFormData: !!dataToUse.formData,
            citizenship_status: dataToUse.formData?.citizenship_status,
            formComplete: dataToUse.formComplete
          })

          // Restore document metadata and remote PDF URL if available
          if (dataToUse.documentMetadata) {
            setDocumentMetadata(dataToUse.documentMetadata as StepDocumentMetadata)
            if (dataToUse.documentMetadata?.signed_url) {
              setRemotePdfUrl(dataToUse.documentMetadata.signed_url as string)
              console.log('Restored I-9 PDF URL from metadata:', dataToUse.documentMetadata.signed_url)
            }
          }

          // Also check for remotePdfUrl directly saved
          if (dataToUse.remotePdfUrl) {
            setRemotePdfUrl(dataToUse.remotePdfUrl as string)
            console.log('Restored remote I-9 PDF URL:', dataToUse.remotePdfUrl)
          }
        } catch (e) {
          console.error('Failed to parse saved data:', e)
        }
      }

      // ALWAYS check cloud data if we have an employee ID
      if (employee?.id && !employee.id.startsWith('demo-')) {
        try {
          const response = await fetch(`${getApiUrl()}/onboarding/${employee.id}/i9-complete`)
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data && Object.keys(result.data).length > 0) {
              console.log('I9CompleteStep - Loaded data from cloud:', result.data)
              
              // Check if cloud data has actual content
              const cloudHasFormData = result.data.formData && 
                (result.data.formData.citizenship_status || result.data.formData.last_name)
              
              if (cloudHasFormData || !dataToUse) {
                // Use cloud data if it has content or if we have no local data
                dataToUse = result.data
                // Update session storage with cloud data
                sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(result.data))
              }
            }
          }
        } catch (error) {
          console.error('Failed to load I-9 data from cloud:', error)
        }
      }
      
      // Now apply whatever data we decided to use
      if (dataToUse) {
        // Handle both nested and flat data structures
        if (dataToUse.formData) {
          // Data has nested structure (expected)
          setFormData(dataToUse.formData)
          console.log('Set formData with citizenship_status:', dataToUse.formData.citizenship_status)
        } else if (dataToUse.citizenship_status || dataToUse.last_name || dataToUse.first_name) {
          // Data is flat (from backend) - use it as formData
          setFormData(dataToUse)
          console.log('Set formData from flat structure with citizenship_status:', dataToUse.citizenship_status)
        }
        
        if (dataToUse.supplementsData) setSupplementsData(dataToUse.supplementsData)
        if (dataToUse.documentsData) setDocumentsData(dataToUse.documentsData)
        if (dataToUse.needsSupplements) setNeedsSupplements(dataToUse.needsSupplements)
        if (dataToUse.formComplete) setFormComplete(dataToUse.formComplete)
        if (dataToUse.supplementsComplete) setSupplementsComplete(dataToUse.supplementsComplete)
        if (dataToUse.documentsComplete) setDocumentsComplete(dataToUse.documentsComplete)
        if (dataToUse.isSigned) {
          setIsSigned(dataToUse.isSigned)
          if (dataToUse.formComplete && dataToUse.supplementsComplete && dataToUse.documentsComplete) {
            setActiveTab('preview')
          }
        }
        if (dataToUse.signatureData) setSignatureData(dataToUse.signatureData)
        if (dataToUse.signedFormDataHash) setSignedFormDataHash(dataToUse.signedFormDataHash)
        if (dataToUse.ssnMismatch) setSsnMismatch(dataToUse.ssnMismatch)
        if (dataToUse.activeTab && !dataToUse.isSigned) {
          setActiveTab(dataToUse.activeTab)
        }
      }
      
      // Auto-fill from personal info - but preserve existing I-9 specific fields
      // Only auto-fill if we don't have I-9 data already (check if formData was just set from cloud)
      const personalInfoData = sessionStorage.getItem('onboarding_personal-info_data')
      if (personalInfoData) {
        try {
          const parsedData = JSON.parse(personalInfoData)
          const personalInfo = parsedData.personalInfo || parsedData || {}
          
          // Only auto-fill if we don't already have this data from cloud
          setFormData(prevData => {
            // If we already have last_name from cloud, don't auto-fill
            if (prevData.last_name) {
              return prevData
            }
            
            const mappedData = {
              last_name: personalInfo.lastName || '',
              first_name: personalInfo.firstName || '',
              middle_initial: personalInfo.middleInitial || '',
              date_of_birth: personalInfo.dateOfBirth || '',
              ssn: personalInfo.ssn || '',
              email: personalInfo.email || '',
              phone: personalInfo.phone || '',
              address: personalInfo.address || '',
              apt_number: personalInfo.aptNumber || personalInfo.apartment || '',
              city: personalInfo.city || '',
              state: personalInfo.state || '',
              zip_code: personalInfo.zipCode || ''
            }
            
            // IMPORTANT: Merge with existing formData to preserve citizenship_status and other I-9 specific fields
            return {
              ...prevData,  // Keep existing data including citizenship_status
              ...mappedData // Override with personal info fields
            }
          })
        } catch (e) {
          console.error('Failed to parse personal info data:', e)
        }
      }
    }
    
    loadData()
  }, [currentStep.id, progress.completedSteps, employee])

  // Reset metadata request flag when dependencies change
  useEffect(() => {
    setMetadataRequested(false)
  }, [sessionToken, currentStep.id, employee?.id])

  // Fetch latest I-9 document metadata from backend when available
  useEffect(() => {
    if (!sessionToken || !employee?.id) {
      return
    }

    // Skip if we've already requested and have the data
    if (metadataRequested && documentMetadata?.signed_url) {
      return
    }

    // Always fetch if step is complete or we don't have the PDF URL yet
    const shouldFetch = progress.completedSteps.includes(currentStep.id) ||
                        !remotePdfUrl ||
                        (isSigned && !documentMetadata?.signed_url)

    if (!shouldFetch) {
      return
    }

    let isMounted = true
    setMetadataRequested(true)
    setMetadataLoading(true)
    setMetadataError(null)

    // Use 'i9-section1' as the step ID for fetching I-9 document
    fetchStepDocumentMetadata(employee.id, 'i9-section1', sessionToken)
      .then(async response => {
        if (!isMounted) {
          return
        }
        if (response.document_metadata) {
          setDocumentMetadata(response.document_metadata)
          if (response.document_metadata.signed_url) {
            // Verify the URL is still valid by doing a HEAD request
            try {
              const checkResponse = await fetch(response.document_metadata.signed_url, {
                method: 'HEAD'
              })
              if (checkResponse.ok) {
                setRemotePdfUrl(response.document_metadata.signed_url)
                console.log('Found existing I-9 document in Supabase:', response.document_metadata.signed_url)

                // If we have a signed document, ensure states are set
                if (response.has_document) {
                  setIsSigned(true)
                  setFormComplete(true)
                  setSupplementsComplete(true)
                  setDocumentsComplete(true)
                }
              } else {
                // File was deleted from storage but metadata exists
                console.log('I-9 document metadata exists but file is missing from storage')
                setMetadataError('Document file missing from storage')
                // Clear invalid metadata
                setDocumentMetadata(null)
                setRemotePdfUrl(null)
                // Mark I-9 PDF as missing
                setMissingFiles(prev => ({ ...prev, i9Pdf: true }))
                setFilesValidated(true)
                // Keep signed state but clear the URL to trigger re-sign prompt
                if (isSigned) {
                  // This will trigger the re-sign prompt
                  setIsSigned(true)
                }
              }
            } catch (err) {
              console.log('Error checking document URL validity:', err)
              // Clear invalid metadata
              setDocumentMetadata(null)
              setRemotePdfUrl(null)
            }
          }
        }
      })
      .catch(error => {
        if (isMounted) {
          console.log('Document metadata not found or error:', error)
          // Don't set error if document simply doesn't exist yet
          if (error instanceof Error && !error.message.includes('404')) {
            setMetadataError(error.message)
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setMetadataLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [sessionToken, employee?.id, currentStep.id, progress.completedSteps, metadataRequested, documentMetadata?.signed_url, remotePdfUrl, isSigned])

  // Check for uploaded I-9 documents (DL/SSN) and validate their availability
  useEffect(() => {
    const checkUploadedDocuments = async () => {
      if (!employee?.id || employee.id.startsWith('demo-') || !sessionToken) {
        return
      }

      try {
        const documents = await listStepDocuments(employee.id, 'i9-uploads', sessionToken)
        setUploadedDocsMetadata(documents)
        console.log('Found uploaded I-9 documents:', documents.length)

        const hasDL = documents.some(doc =>
          doc.category === 'dl' || doc.documentType === 'drivers_license'
        )
        const hasSSN = documents.some(doc =>
          doc.category === 'ssn' || doc.documentType === 'social_security_card'
        )

        if (documents.length === 0) {
          setMissingFiles(prev => ({
            ...prev,
            dlDocument: true,
            ssnDocument: true
          }))
          setFilesValidated(true)
          return
        }

        let dlMissing = false
        let ssnMissing = false

        for (const doc of documents) {
          if (doc.signed_url) {
            try {
              const headResponse = await fetch(doc.signed_url, { method: 'HEAD' })
              if (!headResponse.ok) {
                if (doc.category === 'dl' || doc.documentType === 'drivers_license') {
                  dlMissing = true
                }
                if (doc.category === 'ssn' || doc.documentType === 'social_security_card') {
                  ssnMissing = true
                }
              }
            } catch (error) {
              if (doc.category === 'dl' || doc.documentType === 'drivers_license') {
                dlMissing = true
              }
              if (doc.category === 'ssn' || doc.documentType === 'social_security_card') {
                ssnMissing = true
              }
            }
          }
        }

        if (dlMissing || ssnMissing || !hasDL || !hasSSN) {
          setMissingFiles(prev => ({
            ...prev,
            dlDocument: !hasDL || dlMissing,
            ssnDocument: !hasSSN || ssnMissing
          }))
          setFilesValidated(true)
        }
      } catch (error) {
        console.log('Error checking uploaded I-9 documents:', error)
        if (documentsComplete) {
          setMissingFiles(prev => ({
            ...prev,
            dlDocument: true,
            ssnDocument: true
          }))
          setFilesValidated(true)
        }
      }
    }

    checkUploadedDocuments()
  }, [employee?.id, currentStep.id, documentsComplete, sessionToken])
  
  // Regenerate PDF when returning to preview tab
  useEffect(() => {
    if (activeTab === 'preview' && !pdfUrl && !isGeneratingPdf && documentsComplete) {
      console.log('Regenerating PDF on preview tab - formData citizenship_status:', formData.citizenship_status)
      // Include signature data if already signed
      if (isSigned && signatureData) {
        console.log('Including existing signature in PDF regeneration')
        generateCompletePdf(documentsData, signatureData)
      } else {
        generateCompletePdf(documentsData)
      }
    }
  }, [activeTab, pdfUrl, isGeneratingPdf, documentsComplete, isSigned, signatureData])
  
  // Cleanup PDF data when component unmounts to free memory
  useEffect(() => {
    return () => {
      setPdfUrl(null)
      setFormData({})
      setSupplementsData(null)
      setDocumentsData(null)
    }
  }, [])
  
  // Tab configuration
  const tabs = [
    { 
      id: 'form', 
      label: language === 'es' ? 'Llenar Formulario' : 'Fill Form',
      icon: <FileText className="h-4 w-4" />,
      enabled: true,
      complete: formComplete
    },
    { 
      id: 'supplements', 
      label: language === 'es' ? 'Suplementos' : 'Supplements',
      icon: <Globe className="h-4 w-4" />,
      enabled: formComplete,
      complete: supplementsComplete
    },
    { 
      id: 'documents', 
      label: language === 'es' ? 'Cargar Documentos' : 'Upload Documents',
      icon: <Upload className="h-4 w-4" />,
      enabled: formComplete && supplementsComplete,
      complete: documentsComplete
    },
    { 
      id: 'preview', 
      label: language === 'es' ? 'Revisar y Firmar' : 'Preview & Sign',
      icon: <CheckCircle className="h-4 w-4" />,
      enabled: formComplete && supplementsComplete && documentsComplete,
      complete: isSigned
    }
  ]
  
  // Helper function to check SSN mismatch
  const checkSsnMismatch = () => {
    if (!formData.ssn || !documentsData?.extractedData) return

    console.log('Checking SSN mismatch - formData.ssn:', formData.ssn)
    console.log('Checking SSN mismatch - documentsData.extractedData:', documentsData.extractedData)

    // Find SSN from extracted data - the backend returns it directly in the document object
    const ssnDocument = documentsData.extractedData.find(doc =>
      doc.documentType === 'social_security_card' || doc.type === 'social_security_card'
    )

    console.log('Found SSN document:', ssnDocument)

    // Check for SSN in the document - the backend returns it at the root level
    const extractedSsn = ssnDocument?.ssn
    
    if (!extractedSsn) {
      console.log('No SSN found in extracted data - checking all fields:', ssnDocument)
      if (ssnDocument) {
        console.warn('SSN card data exists but no SSN was extracted')
      }
      return
    }
    
    // Compare SSNs (remove formatting)
    const enteredSsnClean = formData.ssn.replace(/\D/g, '')
    const extractedSsnClean = extractedSsn.replace(/\D/g, '')
    
    const hasWarning = enteredSsnClean !== extractedSsnClean
    setSsnMismatch(prev => ({ ...prev, hasWarning }))
    
    if (hasWarning) {
      console.log('SSN Mismatch detected:', {
        entered: enteredSsnClean,
        extracted: extractedSsnClean,
        enteredFormatted: formData.ssn,
        extractedFormatted: extractedSsn
      })
    } else {
      console.log('SSN Match confirmed')
    }
  }

  // Function to completely reset the I-9 step
  const handleCompleteReset = () => {
    console.log('Resetting entire I-9 step due to missing files')

    // Clear all state
    setFormData({})
    setSupplementsData(null)
    setDocumentsData(null)
    setFormComplete(false)
    setSupplementsComplete(false)
    setDocumentsComplete(false)
    setIsSigned(false)
    setSignatureData(null)
    setSignedFormDataHash(null)
    setSsnMismatch({ hasWarning: false, acknowledged: false })
    setNeedsSupplements('none')
    setPdfUrl(null)
    setRemotePdfUrl(null)
    setDocumentMetadata(null)
    setMetadataError(null)
    setUploadedDocsMetadata(null)
    setMissingFiles({ i9Pdf: false, dlDocument: false, ssnDocument: false })
    setFilesValidated(false)

    // Clear session storage
    sessionStorage.removeItem(`onboarding_${currentStep.id}_data`)

    // Reset to first tab
    setActiveTab('form')

    // Auto-fill from personal info again
    const personalInfoData = sessionStorage.getItem('onboarding_personal-info_data')
    if (personalInfoData) {
      try {
        const parsedData = JSON.parse(personalInfoData)
        const personalInfo = parsedData.personalInfo || parsedData || {}

        const mappedData = {
          last_name: personalInfo.lastName || '',
          first_name: personalInfo.firstName || '',
          middle_initial: personalInfo.middleInitial || '',
          date_of_birth: personalInfo.dateOfBirth || '',
          ssn: personalInfo.ssn || '',
          email: personalInfo.email || '',
          phone: personalInfo.phone || '',
          address: personalInfo.address || '',
          apt_number: personalInfo.aptNumber || personalInfo.apartment || '',
          city: personalInfo.city || '',
          state: personalInfo.state || '',
          zip_code: personalInfo.zipCode || ''
        }

        console.log('Re-populating form data from PersonalInfoStep after reset')
        setFormData(mappedData)
      } catch (e) {
        console.error('Error re-populating from personal info:', e)
      }
    }
  }

  // Tab change handler with validation
  const handleTabChange = (newTab: string) => {
    const currentTabIndex = tabs.findIndex(t => t.id === activeTab)
    const newTabIndex = tabs.findIndex(t => t.id === newTab)
    
    console.log('Tab change - Current formData citizenship_status:', formData.citizenship_status)
    console.log('Tab change - Form data keys:', Object.keys(formData))
    console.log('Tab change - Form data values preserved:', {
      citizenship_status: formData.citizenship_status,
      ssn: formData.ssn ? '***-**-' + formData.ssn.slice(-4) : 'none'
    })
    
    // Save current tab data before switching
    const currentAutoSaveData = {
      activeTab: newTab,
      formData,
      supplementsData,
      documentsData,
      formComplete,
      supplementsComplete,
      documentsComplete,
      needsSupplements,
      isSigned,
      ssnMismatch,
      signatureData,
      signedFormDataHash
    }
    
    // Save to session storage immediately
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(currentAutoSaveData))
    
    // Also trigger saveProgress to ensure data is saved
    saveProgress(currentStep.id, currentAutoSaveData)
    
    // If going backwards, reset states appropriately
    if (newTabIndex < currentTabIndex) {
      // Don't reset signed state if just navigating back
      // User will need to explicitly change data to require re-signing
      if (activeTab === 'preview') {
        // Clear PDF to force regeneration with current data
        setPdfUrl(null)
      }
      
      // Don't reset completion states when just navigating
      // Only reset if data actually changes (handled in individual handlers)
      // Clear PDF to force regeneration with current data
      setPdfUrl(null)
    }
    
    // Allow navigation if tab is enabled
    const targetTab = tabs.find(t => t.id === newTab)
    if (targetTab?.enabled) {
      setActiveTab(newTab)
      scrollToTop()
    }
  }

  // Handlers
  const handleFormComplete = async (data: any) => {
    console.log('handleFormComplete - citizenship_status:', data.citizenship_status)
    console.log('handleFormComplete - Full data received:', Object.keys(data))
    
    // Check if form data changed after signing
    if (isSigned && signedFormDataHash) {
      const newDataHash = createFormDataHash({
        formData: { ...formData, ...data },
        supplementsData,
        documentsData
      })
      
      if (newDataHash !== signedFormDataHash) {
        console.log('Form data changed after signing - clearing signature')
        setIsSigned(false)
        setSignatureData(null)
        setSignedFormDataHash(null)
        setPdfUrl(null)
      }
    }
    
    // Preserve all form data including citizenship status
    const updatedFormData = { ...formData, ...data }
    setFormData(updatedFormData)
    setFormComplete(true)
    
    // Save with complete form data
    const completeAutoSaveData = {
      activeTab: 'supplements',
      formData: updatedFormData,  // Use the updated data
      supplementsData,
      documentsData,
      formComplete: true,
      supplementsComplete,
      documentsComplete,
      needsSupplements,
      isSigned,
      ssnMismatch,
      signatureData,
      signedFormDataHash
    }
    
    // Save to session storage immediately
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(completeAutoSaveData))
    await saveProgress(currentStep.id, completeAutoSaveData)
    
    // Also save to I-9 Section 1 endpoint for cloud storage
    if (employee?.id && !employee.id.startsWith('demo-')) {
      try {
        await axios.post(`${getApiUrl()}/onboarding/${employee.id}/i9-section1`, {
          formData: updatedFormData,
          signed: false,
          formValid: true
        })
        console.log('I-9 Section 1 data saved to cloud')
      } catch (error) {
        console.error('Failed to save I-9 Section 1 to cloud:', error)
      }
    }
    
    setActiveTab('supplements')
  }
  
  const handleSupplementsComplete = async () => {
    // Check if supplements data changed after signing
    if (isSigned && signedFormDataHash) {
      const newDataHash = createFormDataHash({
        formData,
        supplementsData,
        documentsData
      })
      
      if (newDataHash !== signedFormDataHash) {
        console.log('Supplements data changed after signing - clearing signature')
        setIsSigned(false)
        setSignatureData(null)
        setSignedFormDataHash(null)
        setPdfUrl(null)
      }
    }
    
    setSupplementsComplete(true)
    await saveProgress(currentStep.id, { supplementsComplete: true })
    setActiveTab('documents')
  }
  
  const handleDocumentsComplete = async (data: any) => {
    // Check if documents changed after signing
    if (isSigned && signedFormDataHash) {
      const newDataHash = createFormDataHash({
        formData,
        supplementsData,
        documentsData: data
      })
      
      if (newDataHash !== signedFormDataHash) {
        console.log('Documents changed after signing - clearing signature')
        setIsSigned(false)
        setSignatureData(null)
        setSignedFormDataHash(null)
        setPdfUrl(null)
      }
    }
    
    // Upload each completed document to storage (if not already uploaded)
    if (employee?.id && data?.uploadedDocuments?.length) {
      for (const doc of data.uploadedDocuments) {
        // Skip if already uploaded to storage
        if (doc.storageMetadata) {
          console.log('Document already uploaded to storage:', doc.type)
          continue
        }

        const fileToUpload: File | undefined = doc.file || doc.originalFile
        if (!fileToUpload) {
          console.warn('Skipping upload: no File object available for document', doc.type)
          continue
        }

        try {
          const uploadResult = await uploadOnboardingDocument({
            employeeId: employee.id,
            documentType: doc.type, // This will be 'list_a', 'list_b', 'list_c'
            documentCategory: doc.type, // Backend expects this format
            file: fileToUpload
          })
          doc.storageMetadata = uploadResult?.data || uploadResult
          console.log('Document uploaded to storage (retry):', doc.type)
        } catch (error) {
          console.error('Failed to upload I-9 document to storage:', doc.type, error)
        }
      }
    }

    const sanitizedUploadedDocuments = (data.uploadedDocuments || []).map((doc: any) => ({
      type: doc.type,
      category: doc.category,
      fileName: doc.file?.name || doc.fileName || `${doc.type}`,
      status: doc.status || 'complete',
      extractedData: doc.extractedData,
      storageMetadata: doc.storageMetadata ?? null
    }))

    const sanitizedData = {
      ...data,
      uploadedDocuments: sanitizedUploadedDocuments
    }

    setDocumentsData(sanitizedData)
    setDocumentsComplete(true)

    // Store extracted data for Section 2
    if (sanitizedData.extractedData) {
      sessionStorage.setItem('i9_section2_data', JSON.stringify(sanitizedData.extractedData))
    }

    // Persist sanitized documents metadata for cross-session restoration
    if (employee?.id && sessionToken) {
      try {
        await persistStepDocument(
          employee.id,
          'i9-uploads',
          {
            uploadedDocuments: sanitizedUploadedDocuments,
            extractedData: sanitizedData.extractedData,
            uploadedAt: new Date().toISOString()
          },
          { token: sessionToken }
        )
      } catch (error) {
        console.error('Failed to store I-9 upload metadata:', error)
      }
    }

    await saveProgress(currentStep.id, { documentsData: sanitizedData, documentsComplete: true })

    // Check for SSN mismatch after documents are uploaded
    console.log('Checking SSN after document upload - data.extractedData:', sanitizedData.extractedData)
    console.log('Current formData.ssn:', formData.ssn)

    if (sanitizedData.extractedData && formData.ssn) {
      // Find SSN document
      const ssnDocument = sanitizedData.extractedData.find((doc: any) => 
        doc.documentType === 'social_security_card' || doc.type === 'social_security_card'
      )

      console.log('Found SSN document in handleDocumentsComplete:', ssnDocument)
      
      // Check for SSN in the document - the backend returns it at the root level
      const extractedSsn = ssnDocument?.ssn
      
      console.log('Looking for SSN in document:', {
        ssnDocument: ssnDocument,
        hasSSN: !!extractedSsn,
        extractedSSN: extractedSsn
      })
      
      if (extractedSsn) {
        const enteredSsn = formData.ssn.replace(/\D/g, '')
        const extractedSsnClean = extractedSsn.replace(/\D/g, '')
        const hasWarning = enteredSsn !== extractedSsnClean
        
        console.log('SSN Comparison:', {
          entered: enteredSsn,
          extracted: extractedSsnClean,
          hasWarning: hasWarning,
          enteredFormatted: formData.ssn,
          extractedFormatted: extractedSsn
        })
        
        if (hasWarning) {
          setSsnMismatch({ hasWarning: true, acknowledged: false })
          console.log('SSN Mismatch detected on document upload:', {
            entered: formData.ssn,
            extracted: extractedSsn
          })
        } else {
          setSsnMismatch({ hasWarning: false, acknowledged: false })
          console.log('SSN Match confirmed on document upload')
        }
      } else {
        console.log('No SSN found in SSN document - full document:', ssnDocument)
        // If we have a social security card but no SSN extracted, that's also a problem
        if (ssnDocument) {
          console.warn('SSN card uploaded but no SSN was extracted from it')
        }
      }
    } else {
      console.log('Missing data for SSN check:', {
        hasExtractedData: !!data.extractedData,
        hasFormSSN: !!formData.ssn
      })
    }
    
    // Generate PDF before showing preview
    await generateCompletePdf(sanitizedData)

    setActiveTab('preview')
  }
  
  const generateCompletePdf = async (documents?: any, signatureData?: any) => {
    setIsGeneratingPdf(true)
    try {
      // Debug log to see the structure
      console.log('Documents received in generateCompletePdf:', documents)
      console.log('Extracted data:', documents?.extractedData)
      
      // Reset remote references when generating a fresh preview
      setRemotePdfUrl(null)
      setDocumentMetadata(null)

      // Prepare complete form data including Section 2 info from documents
      const completeFormData = {
        ...formData,
        // Add Section 2 data from document extraction
        section2: documents?.extractedData && documents.extractedData.length > 0 ? {
          documents: documents.extractedData, // Pass all documents
          documentVerificationDate: new Date().toISOString()
        } : null,
        // Add supplement data if applicable
        supplementA: needsSupplements === 'translator' ? supplementsData : null,
        // Add signature data if available
        signatureData: signatureData || null
      }
      
      console.log('Complete form data being sent to PDF generator:', completeFormData)
      console.log('citizenship_status in PDF data:', completeFormData.citizenship_status)
      
      // Generate PDF with all sections
      const pdfBytes = await generateCleanI9Pdf(completeFormData)
      
      // Convert Uint8Array to base64 using a more efficient method
      let binary = ''
      const chunkSize = 8192 // Process in chunks to avoid stack overflow
      for (let i = 0; i < pdfBytes.length; i += chunkSize) {
        const chunk = pdfBytes.slice(i, i + chunkSize)
        binary += String.fromCharCode.apply(null, Array.from(chunk))
      }
      const base64String = btoa(binary)
      
      // TODO: Save PDF to backend when endpoint is implemented
      // The backend endpoint /api/onboarding/{employee_id}/i9-complete/generate-pdf needs to be implemented
      
      // Set the base64 PDF data - PDFViewer expects base64 string
      console.log('Setting PDF URL, base64 length:', base64String.length)
      setPdfUrl(base64String)
      return base64String
    } catch (error) {
      console.error('Error generating PDF:', error)
      // Continue without PDF preview
      return null
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleSign = async (signature: any) => {
    if (isSigned) {
      return
    }

    setSignatureData(signature)

    const currentDataHash = createFormDataHash({
      formData,
      supplementsData,
      documentsData
    })
    setSignedFormDataHash(currentDataHash)

    let basePdf = pdfUrl
    if (!basePdf) {
      basePdf = await generateCompletePdf(documentsData)
    }

    if (!basePdf) {
      console.error('Unable to generate base I-9 PDF before signing')
      return
    }

    let signedPdfBase64: string
    try {
      signedPdfBase64 = await addSignatureToExistingPdf(basePdf, signature)
      setPdfUrl(signedPdfBase64)
      setRemotePdfUrl(null)
      setDocumentMetadata(null)
      setMissingFiles(prev => ({ ...prev, i9Pdf: false }))
    } catch (error) {
      console.error('Failed to overlay signature onto I-9 PDF:', error)
      return
    }

    let remotePdfUrl: string | null = null
    let documentMetadata: StepDocumentMetadata | null = null
    let inlinePdfData: string | null = signedPdfBase64

    if (employee?.id && !employee.id.startsWith('demo-')) {
      try {
        const uploadResponse = await uploadSignedI9Pdf({
          employeeId: employee.id,
          pdfBase64: signedPdfBase64,
          signatureData: {
            ...signature,
            signedAt: signature.signedAt || new Date().toISOString()
          },
          formData,
          documentsData
        })

        if (uploadResponse?.success && uploadResponse?.data) {
          const payload = uploadResponse.data
          if (payload.pdf_url) {
            remotePdfUrl = payload.pdf_url
            setRemotePdfUrl(payload.pdf_url)
            console.log('Signed I-9 stored in Supabase:', payload.pdf_url)
          }
          if (payload.document_metadata) {
            documentMetadata = payload.document_metadata as StepDocumentMetadata
            setDocumentMetadata(documentMetadata)
          }
          if (payload.pdf) {
            inlinePdfData = payload.pdf
            setPdfUrl(payload.pdf)
          }
        } else {
          console.error('Failed to store signed I-9 PDF:', uploadResponse)
        }
      } catch (error) {
        console.error('Error uploading signed I-9 PDF:', error)
      }
    }

    const completedAt = new Date().toISOString()
    const completeData = {
      formData,
      supplementsData,
      documentsData,
      signed: true,
      isSigned: true,
      signatureData: signature,
      signedFormDataHash: currentDataHash,
      completedAt,
      needsSupplements,
      pdfGenerated: true,
      pdfGeneratedAt: completedAt,
      remotePdfUrl,
      documentMetadata,
      inlinePdfData
    }

    if (employee?.id && !employee.id.startsWith('demo-')) {
      try {
        await axios.post(`${getApiUrl()}/onboarding/${employee.id}/i9-section1`, {
          formData,
          signed: true,
          signatureData: signature.signature,
          completedAt: completedAt,
          pdfUrl: inlinePdfData
        })
        console.log('I-9 Section 1 with signature saved to cloud')

        if (documentsData && documentsData.uploadedDocuments) {
          const documentMetadataPayload = documentsData.uploadedDocuments.map((doc: any) => ({
            type: doc.type,
            category: doc.category,
            storageMetadata: doc.storageMetadata,
            fileName: doc.fileName,
            extractedData: doc.extractedData
          }))

          await axios.post(`${getApiUrl()}/onboarding/${employee.id}/i9-section2`, {
            documentSelection: documentsData.documentSelection || '',
            uploadedDocuments: documentMetadataPayload,
            verificationComplete: true,
            completedAt
          })
          console.log('I-9 Section 2 documents saved to cloud')
        }

        if (sessionToken) {
          await persistStepDocument(
            employee.id,
            'i9-section1',
            {
              formData,
              signed: true,
              signature: signature,
              completedAt,
              documentMetadata,
              remotePdfUrl,
              inlinePdfData
            },
            { token: sessionToken }
          )

          if (documentsData && documentsData.uploadedDocuments) {
            await persistStepDocument(
              employee.id,
              'i9-uploads',
              {
                uploadedDocuments: documentsData.uploadedDocuments,
                extractedData: documentsData.extractedData,
                lastUpdatedAt: completedAt
              },
              { token: sessionToken }
            )
          }

          await persistStepDocument(
            employee.id,
            'i9-complete',
            {
              documentMetadata,
              remotePdfUrl,
              completedAt,
              signed: true
            },
            { token: sessionToken }
          )
        }
      } catch (error) {
        console.error('Failed to persist I-9 metadata:', error)
      }
    }

    await saveProgress(currentStep.id, completeData)
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(completeData))

    setIsSigned(true)
    await markStepComplete(currentStep.id, completeData)
  }
  
  
  const translations = {
    en: {
      title: 'Employment Eligibility Verification (I-9)',
      description: 'Complete all sections of Form I-9 including document upload',
      completionMessage: 'Form I-9 has been completed successfully.'
    },
    es: {
      title: 'Verificación de Elegibilidad de Empleo (I-9)',
      description: 'Complete todas las secciones del Formulario I-9 incluyendo carga de documentos',
      completionMessage: 'El Formulario I-9 ha sido completado exitosamente.'
    }
  }
  
  const t = translations[language]
  
  const renderMissingDocumentState = () => {
    return (missingFiles.i9Pdf || (!remotePdfUrl && !documentMetadata?.signed_url && !pdfUrl))
  }

  const renderDocumentPreview = () => {
    if (pdfUrl || remotePdfUrl) {
      return (
        <div>
          {documentMetadata && (
            <div className="text-xs text-gray-600 space-y-1 mb-2">
              {documentMetadata.filename && (
                <p>Stored file: {documentMetadata.filename}</p>
              )}
              {documentMetadata.generated_at && (
                <p>Generated: {new Date(documentMetadata.generated_at).toLocaleString()}</p>
              )}
            </div>
          )}
          {metadataError && (
            <Alert className="bg-amber-50 border-amber-200 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <div className="space-y-2">
                  <p className="font-medium">
                    {metadataError === 'Document file missing from storage'
                      ? (language === 'es'
                          ? 'El archivo del documento firmado fue eliminado del almacenamiento.'
                          : 'The signed document file was deleted from storage.')
                      : metadataError}
                  </p>
                  <button
                    onClick={handleCompleteReset}
                    className="text-sm text-amber-700 underline hover:text-amber-800 font-medium"
                  >
                    {language === 'es'
                      ? 'Haga clic aquí para reiniciar el proceso I-9'
                      : 'Click here to restart the I-9 process'}
                  </button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {metadataLoading && !metadataError && (
            <p className="text-xs text-gray-500 mb-2">Refreshing stored document link...</p>
          )}
          {/* Only show PDF viewer if we don't have a metadata error */}
          {!metadataError && (
            <PDFViewer
              pdfUrl={remotePdfUrl || documentMetadata?.signed_url || undefined}
              pdfData={!remotePdfUrl && !documentMetadata?.signed_url ? pdfUrl ?? undefined : undefined}
              height="600px"
              title="Signed I-9 Form"
            />
          )}
        </div>
      )
    }
    return null
  }

  return (
    <StepContainer errors={errors} fieldErrors={fieldErrors} saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center px-4">
          <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">{t.description}</p>
        </div>

        {/* Completion Status */}
        {isSigned && (
          <Alert className="bg-green-50 border-green-200 p-3 sm:p-4">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
            <AlertDescription className="text-sm sm:text-base text-green-800">
              {t.completionMessage}
            </AlertDescription>
          </Alert>
        )}
        
        {/* SSN Mismatch Warning */}
        {ssnMismatch.hasWarning && !ssnMismatch.acknowledged && activeTab === 'preview' && (
          <Alert className="bg-amber-50 border-amber-200 p-3 sm:p-4">
            <AlertDescription className="text-amber-800">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <strong className="text-sm sm:text-base">SSN Verification Required</strong>
                    <p className="mt-1 text-xs sm:text-sm">
                      The Social Security Number you entered in the form doesn't match the SSN on your uploaded Social Security card.
                      This could be a simple typo or a document issue.
                    </p>
                    <div className="mt-2 p-3 bg-white rounded border border-amber-200">
                      <p className="text-xs sm:text-sm font-medium mb-1">Comparison:</p>
                      <p className="text-xs sm:text-sm">Form Entry: ***-**-{formData.ssn?.slice(-4) || '****'}</p>
                      <p className="text-xs sm:text-sm">Document: ***-**-{(() => {
                        const ssnDoc = documentsData?.extractedData?.find(doc => doc.documentType === 'social_security_card' || doc.type === 'social_security_card')
                        const ssn = ssnDoc?.ssn || ssnDoc?.data?.ssn
                        return ssn?.slice(-4) || '****'
                      })()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('form')
                      scrollToTop()
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-white border border-amber-600 text-amber-600 rounded hover:bg-amber-50 text-xs sm:text-sm font-medium min-h-[44px]"
                  >
                    ← Fix SSN Entry
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('documents')
                      scrollToTop()
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-white border border-amber-600 text-amber-600 rounded hover:bg-amber-50 text-xs sm:text-sm font-medium min-h-[44px]"
                  >
                    ← Re-upload Document
                  </button>
                  <button
                    onClick={() => setSsnMismatch(prev => ({ ...prev, acknowledged: true }))}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs sm:text-sm font-medium min-h-[44px]"
                  >
                    Continue with Mismatch
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-amber-700 italic">
                  Note: Proceeding with mismatched SSNs may cause issues during employment verification.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 sm:mb-6 sticky top-0 z-10 bg-white shadow-sm">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={!tab.enabled}
                className="flex flex-col sm:flex-row items-center justify-center sm:space-x-2 min-h-[44px] text-xs sm:text-sm px-1 sm:px-3"
              >
                {React.cloneElement(tab.icon, { className: 'h-4 w-4 flex-shrink-0' })}
                <span className="text-[10px] sm:text-sm mt-0.5 sm:mt-0 truncate">{tab.label}</span>
                {tab.complete && <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 ml-0 sm:ml-1 flex-shrink-0 hidden sm:block" />}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {/* Form Tab */}
          <TabsContent value="form" className="space-y-6">
            <I9Section1FormClean
              onComplete={handleFormComplete}
              initialData={formData}
              language={language}
              employeeId={employee?.id}
              showPreview={false}
            />
          </TabsContent>
          
          {/* Supplements Tab */}
          <TabsContent value="supplements" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                {language === 'es' ? '¿Necesita Suplementos?' : 'Do You Need Supplements?'}
              </h2>
              
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800">
                  {language === 'es' 
                    ? 'La mayoría de los empleados pueden omitir esta sección. Solo es necesaria si alguien le ayudó a traducir o completar el formulario.'
                    : 'Most employees can skip this section. It\'s only needed if someone helped translate or complete your form.'}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="supplements"
                    value="none"
                    checked={needsSupplements === 'none'}
                    onChange={() => setNeedsSupplements('none')}
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="font-medium">
                      {language === 'es' ? 'No necesito suplementos' : 'I don\'t need supplements'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'es' 
                        ? 'Completé el formulario yo mismo'
                        : 'I completed the form myself'}
                    </p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="supplements"
                    value="translator"
                    checked={needsSupplements === 'translator'}
                    onChange={() => setNeedsSupplements('translator')}
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="font-medium">
                      {language === 'es' ? 'Alguien me ayudó' : 'Someone helped me'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'es' 
                        ? 'Un traductor o preparador me ayudó'
                        : 'A translator or preparer helped me'}
                    </p>
                  </div>
                </label>
              </div>
              
              {needsSupplements === 'none' && (
                <div className="flex justify-between pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveTab('form')
                      scrollToTop()
                    }}
                  >
                    {language === 'es' ? 'Regresar al Formulario' : 'Back to Form'}
                  </Button>
                  <Button
                    onClick={() => {
                      handleSupplementsComplete()
                    }}
                  >
                    {language === 'es' ? 'Continuar a Documentos' : 'Continue to Documents'}
                  </Button>
                </div>
              )}

              {needsSupplements === 'translator' && (
                <div className="mt-6">
                  <I9SupplementA
                    initialData={supplementsData || {}}
                    language={language}
                    onComplete={(data) => {
                      setSupplementsData(data)
                      handleSupplementsComplete()
                    }}
                    onSkip={() => {
                      setNeedsSupplements('none')
                      handleSupplementsComplete()
                    }}
                    onBack={() => setNeedsSupplements('none')}
                  />
                </div>
              )}
              
            </div>
          </TabsContent>
          
          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <DocumentUploadEnhanced
              onComplete={handleDocumentsComplete}
              language={language}
              initialData={documentsData}
              employee={employee}
            />
          </TabsContent>
          
          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            {isGeneratingPdf ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">
                    {language === 'es' ? 'Generando PDF...' : 'Generating PDF...'}
                  </span>
                </div>
              </div>
            ) : isSigned ? (
              <div className="space-y-6">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="space-y-2">
                      <p className="font-medium">
                        {language === 'es' 
                          ? 'El Formulario I-9 ha sido firmado y completado exitosamente.'
                          : 'Form I-9 has been signed and completed successfully.'}
                      </p>
                      {signatureData && (
                        <div className="text-sm space-y-1">
                          {signatureData.signedAt && (
                            <p>{language === 'es' ? 'Firmado el:' : 'Signed on:'} {new Date(signatureData.signedAt).toLocaleString()}</p>
                          )}
                          {signatureData.ipAddress && (
                            <p>{language === 'es' ? 'Dirección IP:' : 'IP Address:'} {signatureData.ipAddress}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Comprehensive redo UI for missing files */}
                {renderMissingDocumentState() ? (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <div className="space-y-4">
                        <div>
                          <p className="font-semibold text-lg mb-2">
                            {language === 'es'
                              ? 'Documentos I-9 no encontrados'
                              : 'I-9 Documents Not Found'}
                          </p>
                          <p className="text-sm mb-3">
                            {language === 'es'
                              ? 'Los siguientes documentos requeridos no se encuentran en el sistema:'
                              : 'The following required documents are missing from the system:'}
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                            {(missingFiles.i9Pdf || (!remotePdfUrl && !documentMetadata?.signed_url && !pdfUrl)) && (
                              <li className="text-red-700 font-medium">
                                {language === 'es'
                                  ? '✗ Formulario I-9 firmado'
                                  : '✗ Signed I-9 Form'}
                              </li>
                            )}
                            {missingFiles.dlDocument && (
                              <li className="text-red-700 font-medium">
                                {language === 'es'
                                  ? '✗ Licencia de conducir'
                                  : '✗ Driver\'s License'}
                              </li>
                            )}
                            {missingFiles.ssnDocument && (
                              <li className="text-red-700 font-medium">
                                {language === 'es'
                                  ? '✗ Tarjeta de Seguro Social'
                                  : '✗ Social Security Card'}
                              </li>
                            )}
                          </ul>
                        </div>

                        <div className="bg-white p-3 rounded border border-red-200">
                          <p className="text-sm font-medium mb-2">
                            {language === 'es'
                              ? 'Para continuar, debe completar todo el proceso I-9 nuevamente:'
                              : 'To continue, you must complete the entire I-9 process again:'}
                          </p>
                          <ol className="list-decimal list-inside text-xs space-y-1 text-gray-700 ml-2">
                            <li>{language === 'es' ? 'Completar el formulario I-9' : 'Complete the I-9 form'}</li>
                            <li>{language === 'es' ? 'Responder preguntas de suplementos' : 'Answer supplement questions'}</li>
                            <li>{language === 'es' ? 'Cargar documentos de identidad' : 'Upload identity documents'}</li>
                            <li>{language === 'es' ? 'Revisar y firmar' : 'Review and sign'}</li>
                          </ol>
                        </div>

                        <button
                          onClick={handleCompleteReset}
                          className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                        >
                          {language === 'es'
                            ? '🔄 Reiniciar Proceso I-9 Completo'
                            : '🔄 Restart Entire I-9 Process'}
                        </button>

                        <p className="text-xs text-gray-600 text-center italic">
                          {language === 'es'
                            ? 'Nota: Sus datos personales básicos se conservarán del paso de información personal.'
                            : 'Note: Your basic personal information will be retained from the personal info step.'}
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : renderDocumentPreview()}
                
                              </div>
            ) : (
              <ReviewAndSign
                formType="i9-complete"
                formData={{ ...formData, supplementsData, documentsData }}
                title={language === 'es' ? 'Revisar I-9 Completo' : 'Review Complete I-9'}
                description={language === 'es' 
                  ? 'Revise toda la información antes de firmar'
                  : 'Review all information before signing'}
                language={language}
                onSign={handleSign}
                onBack={() => setActiveTab('documents')}
                usePDFPreview={true}
                pdfUrl={remotePdfUrl || pdfUrl}
                federalCompliance={{
                  formName: 'Form I-9, Employment Eligibility Verification',
                  retentionPeriod: '3 years after hire or 1 year after termination (whichever is later)',
                  requiresWitness: false
                }}
                agreementText={language === 'es'
                  ? 'Atestiguo, bajo pena de perjurio, que la información proporcionada es verdadera y correcta.'
                  : 'I attest, under penalty of perjury, that the information provided is true and correct.'}
              />
            )}
          </TabsContent>
        </Tabs>
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
