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
import { generateCleanI9Pdf } from '@/utils/i9PdfGeneratorClean'
import { scrollToTop } from '@/utils/scrollHelpers'
import axios from 'axios'

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
  goToNextStep,
  language = 'en',
  employee,
  property
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
  
  // State for SSN validation
  const [ssnMismatch, setSsnMismatch] = useState<{hasWarning: boolean, acknowledged: boolean}>({hasWarning: false, acknowledged: false})
  
  // State for supplements
  const [needsSupplements, setNeedsSupplements] = useState<'none' | 'translator'>('none')
  
  // State for PDF
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  
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
      // Also save to sessionStorage
      sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(data))
    }
  })
  
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
        } catch (e) {
          console.error('Failed to parse saved data:', e)
        }
      }

      // ALWAYS check cloud data if we have an employee ID
      if (employee?.id && !employee.id.startsWith('demo-')) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || '/api'
          const response = await fetch(`${apiUrl}/api/onboarding/${employee.id}/i9-complete`)
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
        const apiUrl = import.meta.env.VITE_API_URL || '/api'
        await axios.post(`${apiUrl}/api/onboarding/${employee.id}/i9-section1`, {
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
    
    setDocumentsData(data)
    setDocumentsComplete(true)
    
    // Store extracted data for Section 2
    if (data.extractedData) {
      sessionStorage.setItem('i9_section2_data', JSON.stringify(data.extractedData))
    }
    
    // Save the documents data and check for SSN mismatch
    await saveProgress(currentStep.id, { documentsData: data, documentsComplete: true })
    
    // Check for SSN mismatch after documents are uploaded
    console.log('Checking SSN after document upload - data.extractedData:', data.extractedData)
    console.log('Current formData.ssn:', formData.ssn)
    
    if (data.extractedData && formData.ssn) {
      // Find SSN document
      const ssnDocument = data.extractedData.find(doc => 
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
    await generateCompletePdf(data)
    
    setActiveTab('preview')
  }
  
  const generateCompletePdf = async (documents?: any, signatureData?: any) => {
    setIsGeneratingPdf(true)
    try {
      // Debug log to see the structure
      console.log('Documents received in generateCompletePdf:', documents)
      console.log('Extracted data:', documents?.extractedData)
      
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
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      // Continue without PDF preview
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleSign = async (signature: any) => {
    // Prevent double signing
    if (isSigned) {
      return
    }
    
    // Store signature data and create hash of current form state
    setSignatureData(signature)
    
    // Create hash of current form data
    const currentDataHash = createFormDataHash({
      formData,
      supplementsData,
      documentsData
    })
    setSignedFormDataHash(currentDataHash)
    
    const completeData = {
      formData,
      supplementsData,
      documentsData,
      signed: true,
      isSigned: true, // Include both for compatibility
      signatureData: signature,
      signedFormDataHash: currentDataHash,
      completedAt: new Date().toISOString(),
      needsSupplements,
      pdfUrl: pdfUrl // Include the PDF URL
    }
    
    // Save to backend if we have an employee ID
    if (employee?.id && !employee.id.startsWith('demo-')) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '/api'
        
        // Save I-9 Section 1 with signature
        await axios.post(`${apiUrl}/api/onboarding/${employee.id}/i9-section1`, {
          formData,
          signed: true,
          signatureData: signature.signature,
          completedAt: completeData.completedAt,
          pdfUrl: pdfUrl
        })
        console.log('I-9 Section 1 with signature saved to cloud')
        
        // Save I-9 Section 2 documents if we have them
        if (documentsData && documentsData.uploadedDocuments) {
          const documentMetadata = documentsData.uploadedDocuments.map((doc: any) => ({
            id: doc.id,
            type: doc.type,
            documentType: doc.documentType,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            uploadedAt: doc.uploadedAt,
            ocrData: doc.ocrData
          }))
          
          await axios.post(`${apiUrl}/api/onboarding/${employee.id}/i9-section2`, {
            documentSelection: documentsData.documentSelection || '',
            uploadedDocuments: documentMetadata,
            verificationComplete: true,
            completedAt: completeData.completedAt
          })
          console.log('I-9 Section 2 documents saved to cloud')
        }
      } catch (error) {
        console.error('Failed to save I-9 data to backend:', error)
        // Continue even if backend save fails - data is in session storage
      }
    }
    
    // Save the signed status to session storage immediately
    await saveProgress(currentStep.id, completeData)
    
    // Update session storage directly to ensure it's available for validation
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(completeData))
    
    // Regenerate PDF with signature
    await generateCompletePdf(documentsData, signature)
    
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
  
  return (
    <StepContainer errors={errors} fieldErrors={fieldErrors} saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-600 mt-2">{t.description}</p>
        </div>
        
        {/* Completion Status */}
        {isSigned && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t.completionMessage}
            </AlertDescription>
          </Alert>
        )}
        
        {/* SSN Mismatch Warning */}
        {ssnMismatch.hasWarning && !ssnMismatch.acknowledged && activeTab === 'preview' && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-800">
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <strong>SSN Verification Required</strong>
                    <p className="mt-1 text-sm">
                      The Social Security Number you entered in the form doesn't match the SSN on your uploaded Social Security card.
                      This could be a simple typo or a document issue.
                    </p>
                    <div className="mt-2 p-3 bg-white rounded border border-amber-200">
                      <p className="text-sm font-medium mb-1">Comparison:</p>
                      <p className="text-sm">Form Entry: ***-**-{formData.ssn?.slice(-4) || '****'}</p>
                      <p className="text-sm">Document: ***-**-{(() => {
                        const ssnDoc = documentsData?.extractedData?.find(doc => doc.documentType === 'social_security_card' || doc.type === 'social_security_card')
                        const ssn = ssnDoc?.ssn || ssnDoc?.data?.ssn
                        return ssn?.slice(-4) || '****'
                      })()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('form')
                      scrollToTop()
                    }}
                    className="px-4 py-2 bg-white border border-amber-600 text-amber-600 rounded hover:bg-amber-50 text-sm font-medium"
                  >
                    ← Fix SSN Entry
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('documents')
                      scrollToTop()
                    }}
                    className="px-4 py-2 bg-white border border-amber-600 text-amber-600 rounded hover:bg-amber-50 text-sm font-medium"
                  >
                    ← Re-upload Document
                  </button>
                  <button
                    onClick={() => setSsnMismatch(prev => ({ ...prev, acknowledged: true }))}
                    className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm font-medium"
                  >
                    Continue with Mismatch
                  </button>
                </div>
                <p className="text-xs text-amber-700 italic">
                  Note: Proceeding with mismatched SSNs may cause issues during employment verification.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            {tabs.map(tab => (
              <TabsTrigger 
                key={tab.id}
                value={tab.id}
                disabled={!tab.enabled}
                className="flex items-center space-x-2"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.complete && <CheckCircle className="h-3 w-3 text-green-600 ml-1" />}
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
              
              {needsSupplements === 'none' && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleSupplementsComplete}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {language === 'es' ? 'Continuar' : 'Continue'}
                  </button>
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
                
                {pdfUrl ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">PDF Preview ({pdfUrl.length} bytes)</p>
                    <PDFViewer pdfData={pdfUrl} height="600px" />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Loading PDF...</p>
                )}
                
                <div className="flex justify-between">
                  <button
                    onClick={() => handleTabChange('documents')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    {language === 'es' ? '← Volver' : '← Back'}
                  </button>
                  <button
                    onClick={() => goToNextStep()}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {language === 'es' ? 'Continuar →' : 'Continue →'}
                  </button>
                </div>
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
                pdfUrl={pdfUrl}
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