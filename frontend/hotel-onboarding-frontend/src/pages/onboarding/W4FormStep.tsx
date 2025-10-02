import React, { useState, useEffect } from 'react'
import { getApiUrl } from '@/config/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import W4FormClean from '@/components/W4FormClean'
import ReviewAndSign from '@/components/ReviewAndSign'
import PDFViewer from '@/components/PDFViewer'
import { CheckCircle, CreditCard, FileText, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react'
import { FormSection } from '@/components/ui/form-section'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useStepValidation } from '@/hooks/useStepValidation'
import { w4FormValidator } from '@/utils/stepValidators'
import { generateCleanW4Pdf, addSignatureToExistingW4Pdf } from '@/utils/w4PdfGeneratorClean'
import axios from 'axios'
import { fetchStepDocumentMetadata, persistStepDocument, listStepDocuments, StepDocumentMetadata } from '@/services/documentService'
import { uploadOnboardingDocument } from '@/services/onboardingDocuments'

interface W4Translations {
  title: string
  description: string
  federalNotice: string
  completionMessage: string
  importantInfoTitle: string
  importantInfo: string[]
  formTitle: string
  reviewTitle: string
  reviewDescription: string
  agreementText: string
}

export default function W4FormStep({
  currentStep,
  progress,
  markStepComplete,
  saveProgress,
  advanceToNextStep,
  goToPreviousStep,
  language = 'en',
  employee,
  property
}: StepProps) {

  const [formData, setFormData] = useState<any>({})
  const [showReview, setShowReview] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [isSigningInProgress, setIsSigningInProgress] = useState(false)
  const [autoFillNotification, setAutoFillNotification] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [remotePdfUrl, setRemotePdfUrl] = useState<string | null>(null)
  const [documentMetadata, setDocumentMetadata] = useState<StepDocumentMetadata | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string>('')
  const [hasStoredDocument, setHasStoredDocument] = useState(false)

  // Validation hooks
  const { errors, fieldErrors, validate } = useStepValidation(w4FormValidator)
  // Removed useComplianceValidation - hook doesn't exist yet
  // const complianceValidation = useComplianceValidation({ language, debounceMs: 500 })

  // Auto-save data
  const autoSaveData = {
    formData,
    showReview,
    isSigned,
    pdfUrl
  }

  // Auto-save hook
  const { saveStatus } = useAutoSave(autoSaveData, {
    onSave: async (data) => {
    await saveProgress(currentStep.id, data)
    }
  })

  // Validate W-4 form data when it changes
  useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      // complianceValidation.validateW4Form(formData)
    }
  }, [formData])

  useEffect(() => {
    const token = sessionStorage.getItem('hotel_onboarding_token') || ''
    setSessionToken(token)
  }, [])

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setMetadataLoading(true)
        setMetadataError(null)

        // Load metadata first if employee has saved docs
        if (employee?.id && !employee.id.startsWith('demo-') && sessionToken) {
          try {
            const [metadataResponse, documents] = await Promise.all([
              fetchStepDocumentMetadata(employee.id, currentStep.id, sessionToken),
              listStepDocuments(employee.id, currentStep.id, sessionToken)
            ])

            if (metadataResponse.document_metadata?.signed_url) {
              setRemotePdfUrl(metadataResponse.document_metadata.signed_url)
            }
            setDocumentMetadata(metadataResponse.document_metadata ?? null)
            setHasStoredDocument((metadataResponse.document_metadata?.signed_url?.length ?? 0) > 0 || documents.length > 0)

            if (!documents || documents.length === 0) {
              console.warn('No stored W-4 documents found in Supabase')
            }
          } catch (metaError) {
            console.error('Failed to load W-4 document metadata:', metaError)
            setMetadataError(metaError instanceof Error ? metaError.message : 'Unable to load stored W-4 document')
          }
        }
        
        // Initialize data from multiple sources
        let initialData: any = {}
        let isAlreadySigned = false
        let savedPdfUrl: string | null = null
        let savedInlinePdf: string | null = null

        // First, try to load from backend database
        if (employee?.id && !employee.id.startsWith('demo-') && !employee.id.startsWith('test-')) {
          try {
            const apiUrl = getApiUrl()
            const response = await axios.get(`${apiUrl}/onboarding/${employee.id}/w4-form`)

            if (response.data?.success && response.data?.data) {
              const w4Data = response.data.data
              console.log('W4FormStep - Loaded from database:', w4Data)

              if (w4Data.form_data) {
                initialData = w4Data.form_data
              }
              if (w4Data.signed) {
                isAlreadySigned = true
              }
              if (w4Data.signature_data) {
                // Store signature data for later use
                sessionStorage.setItem('w4_signature_data', JSON.stringify(w4Data.signature_data))
              }
            }
          } catch (dbError) {
            console.log('W4FormStep - No database data found or error loading:', dbError)
          }
        }

        // Second, check session storage (may override database data)
        const savedW4Data = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
        console.log('W4FormStep - Loading saved data:', savedW4Data)
        
        if (savedW4Data) {
          try {
            const parsed = JSON.parse(savedW4Data)
            console.log('W4FormStep - Parsed data:', parsed)
            
            // Handle both nested structure (expected) and flat structure (from cloud)
            if (parsed.formData) {
              // Nested structure - expected format
              initialData = parsed.formData
            } else if (parsed.form_data) {
              // Cloud structure with form_data field
              initialData = parsed.form_data
              // Also restore signature state
              if (parsed.signed) {
                isAlreadySigned = true
              }
              if (parsed.pdf_url) {
                savedPdfUrl = parsed.pdf_url
              }
              if (parsed.inlinePdfData) {
                savedInlinePdf = parsed.inlinePdfData
              }
            } else {
              // Flat structure - data directly in parsed object
              initialData = parsed
            }
            
            // Migrate old filing status format to new format
            if (initialData && initialData.filing_status) {
              const oldToNewMapping: { [key: string]: string } = {
                'Single': 'single',
                'Single or Married filing separately': 'single',
                'Married filing jointly': 'married_filing_jointly',
                'Married filing jointly (or Qualifying surviving spouse)': 'married_filing_jointly',
                'Head of household': 'head_of_household'
              }

              if (oldToNewMapping[initialData.filing_status]) {
                console.log(`W4FormStep - Migrating filing status from "${initialData.filing_status}" to "${oldToNewMapping[initialData.filing_status]}"`)
                initialData.filing_status = oldToNewMapping[initialData.filing_status]
              }
            }

            // Check if already signed
            if (parsed.isSigned || parsed.signed) {
              isAlreadySigned = true
              if (parsed.pdfUrl || parsed.pdf_url) {
                savedPdfUrl = parsed.pdfUrl || parsed.pdf_url
              }
              if (parsed.inlinePdfData) {
                savedInlinePdf = parsed.inlinePdfData
              }
            }
          } catch (e) {
            console.error('Failed to parse saved W-4 data:', e)
          }
        }
        
        // Check if this step is already completed in progress
        if (progress.completedSteps.includes(currentStep.id)) {
          isAlreadySigned = true
        }
        
        // Load existing W-4 data (backward compatibility check)
        const existingW4Data = sessionStorage.getItem('onboarding_w4-form_data')
        
        if (existingW4Data && !savedW4Data) {
          const parsed = JSON.parse(existingW4Data)
          const tempData = parsed.formData || parsed
          // Merge with existing initialData
          initialData = { ...initialData, ...tempData }
          
          // If we already have data, check if it was signed
          if (parsed.isSigned) {
            isAlreadySigned = true
          }
          
          // Restore PDF URL if available
          if (parsed.pdfUrl) {
            savedPdfUrl = parsed.pdfUrl
          }
          if (parsed.inlinePdfData) {
            savedInlinePdf = parsed.inlinePdfData
          }
        }
        
        // Always try to autofill from personal info for empty fields
        const personalInfoData = sessionStorage.getItem('onboarding_personal-info_data')
        
        if (personalInfoData) {
          const parsed = JSON.parse(personalInfoData)
          const personalInfo = parsed.personalInfo || parsed
          
          if (personalInfo) {
            // Map personal info to W-4 fields
            const autoFilledData: any = { ...initialData }
            let fieldsUpdated = 0
            
            // Name fields - only fill if empty
            if (!autoFilledData.first_name && personalInfo.firstName) {
              autoFilledData.first_name = personalInfo.firstName
              fieldsUpdated++
            }
            
            if (!autoFilledData.middle_initial && personalInfo.middleInitial) {
              autoFilledData.middle_initial = personalInfo.middleInitial
              fieldsUpdated++
            }
            
            if (!autoFilledData.last_name && personalInfo.lastName) {
              autoFilledData.last_name = personalInfo.lastName
              fieldsUpdated++
            }
            
            // SSN - only fill if empty
            if (!autoFilledData.ssn && personalInfo.ssn) {
              autoFilledData.ssn = personalInfo.ssn
              fieldsUpdated++
            }
            
            // Address fields - only fill if empty
            if (!autoFilledData.address && personalInfo.address) {
              autoFilledData.address = personalInfo.address
              fieldsUpdated++
            }
            if (!autoFilledData.apt_number && personalInfo.aptNumber) {
              autoFilledData.apt_number = personalInfo.aptNumber
              fieldsUpdated++
            }
            if (!autoFilledData.city && personalInfo.city) {
              autoFilledData.city = personalInfo.city
              fieldsUpdated++
            }
            if (!autoFilledData.state && personalInfo.state) {
              autoFilledData.state = personalInfo.state
              fieldsUpdated++
            }
            if (!autoFilledData.zip_code && personalInfo.zipCode) {
              autoFilledData.zip_code = personalInfo.zipCode
              fieldsUpdated++
            }
            
            // Determine filing status based on marital status - only fill if empty
            if (!autoFilledData.filing_status && personalInfo.maritalStatus) {
              if (personalInfo.maritalStatus === 'single' ||
                  personalInfo.maritalStatus === 'divorced' ||
                  personalInfo.maritalStatus === 'widowed') {
                autoFilledData.filing_status = 'Single'
                fieldsUpdated++
              } else if (personalInfo.maritalStatus === 'married') {
                autoFilledData.filing_status = 'Married filing jointly'
                fieldsUpdated++
              }
            }
            
            // Update form data if any fields were filled
            if (fieldsUpdated > 0) {
              setFormData(autoFilledData)
              
              // Show notification
              setAutoFillNotification(
                language === 'es' 
                  ? `Se han completado automáticamente ${fieldsUpdated} campos con su información personal.`
                  : `${fieldsUpdated} fields have been auto-filled with your personal information.`
              )
              
              // Clear notification after 5 seconds
              setTimeout(() => setAutoFillNotification(null), 5000)
            } else {
              // No fields were updated, just set the initial data
              setFormData(initialData)
            }
          } else {
            // No personal info, just set the initial data
            setFormData(initialData)
          }
        } else {
          // No personal info data, just set initial data if any
          if (initialData && Object.keys(initialData).length > 0) {
            setFormData(initialData)
          }
        }
        
        // Finally, set the signed state and PDF URL if applicable
        if (isAlreadySigned) {
          setIsSigned(true)
          setShowReview(false)
          if (savedInlinePdf) {
            setPdfUrl(savedInlinePdf)
          } else if (savedPdfUrl) {
            setPdfUrl(savedPdfUrl)
          }
        }
      } catch (error) {
        console.error('Error loading W-4 data:', error)
      } finally {
        setMetadataLoading(false)
      }
    }
    
    loadFormData()
  }, [currentStep.id, language, employee?.id, sessionToken]) // Removed progress.completedSteps to prevent reload after signing

  const handleFormComplete = async (data: any) => {
    // Validate the form data
    const validation = await validate(data)

    if (validation.valid) {
      setFormData(data)

      // Generate PDF preview when entering review mode (like I-9 does)
      try {
        console.log('Pre-generating W-4 PDF for review...')
        console.log('🔍 DEBUG: Form data being passed to PDF generator:', JSON.stringify(data, null, 2))
        const { base64String } = await generateUnsignedPdfPreview(data)
        setPdfUrl(base64String)
        console.log('✓ W-4 PDF pre-generated successfully')
      } catch (error) {
        console.error('Failed to pre-generate W-4 PDF:', error)
        // Continue to review even if PDF generation fails
      }

      setShowReview(true)
    }
  }

  const generateUnsignedPdfPreview = async (dataToUse?: any) => {
    try {
      // Don't regenerate if already signed
      if (isSigned) {
        console.log('W-4 already signed, skipping PDF regeneration')
        return { base64String: pdfUrl || '', pdfFile: null }
      }

      console.log('Generating unsigned W-4 PDF for preview...')

      // Use the passed data or fall back to component state
      const pdfData = dataToUse || formData
      console.log('🔍 DEBUG: Data being used for PDF generation:', JSON.stringify(pdfData, null, 2))

      // Generate PDF without signature data
      const pdfBytes = await generateCleanW4Pdf(pdfData)
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' })
      const pdfFile = new File([pdfBlob], `w4-preview-${employee?.id || 'employee'}-${Date.now()}.pdf`, { type: 'application/pdf' })

      const reader = new FileReader()
      const base64String = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result
          if (typeof result === 'string') {
            resolve(result.split(',')[1] || '')
          } else {
            reject(new Error('Invalid PDF data'))
          }
        }
        reader.onerror = () => reject(reader.error || new Error('Failed to read PDF file'))
        reader.readAsDataURL(pdfBlob)
      })

      return { base64String, pdfFile }
    } catch (error) {
      console.error('Failed to generate unsigned W-4 PDF:', error)
      throw error
    }
  }

  const generateSignedPdfPreview = async (signatureData: any) => {
    try {
      console.log('Adding signature to existing W-4 PDF...')

      // Use existing PDF if available, otherwise generate new one
      let pdfBytes: Uint8Array

      if (pdfUrl && !pdfUrl.startsWith('data:')) {
        // If we have an existing PDF URL, use it as base
        console.log('Using existing PDF as base for signature')
        try {
          const response = await fetch(pdfUrl)
          const existingPdfBytes = await response.arrayBuffer()
          pdfBytes = new Uint8Array(existingPdfBytes)
        } catch (error) {
          console.warn('Failed to load existing PDF, generating new one:', error)
          const pdfFormData = {
            ...formData,
            signatureData: {
              signature: signatureData.signature,
              signedAt: signatureData.signedAt || new Date().toISOString()
            }
          }
          pdfBytes = await generateCleanW4Pdf(pdfFormData)
        }
      } else {
        // Generate new PDF with signature
        const pdfFormData = {
          ...formData,
          signatureData: {
            signature: signatureData.signature,
            signedAt: signatureData.signedAt || new Date().toISOString()
          }
        }
        pdfBytes = await generateCleanW4Pdf(pdfFormData)
      }
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' })
      const pdfFile = new File([pdfBlob], `w4-${employee?.id || 'employee'}-${Date.now()}.pdf`, { type: 'application/pdf' })

      const reader = new FileReader()
      const base64String = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result
          if (typeof result === 'string') {
            resolve(result.split(',')[1] || '')
          } else {
            reject(new Error('Invalid PDF data'))
          }
        }
        reader.onerror = () => reject(reader.error || new Error('Failed to read PDF file'))
        reader.readAsDataURL(pdfBlob)
      })

      setPdfUrl(base64String)

      return { base64String, pdfFile }
    } catch (error) {
      console.error('Failed to generate W-4 PDF:', error)
      throw error
    }
  }

  const handleSign = async (signatureData: any) => {
    // Guard against multiple concurrent sign operations
    if (isSigningInProgress) {
      console.log('Sign operation already in progress, ignoring duplicate request')
      return
    }

    setIsSigningInProgress(true)
    setIsSigned(true)

    try {
      console.log('📝 W-4 Signing Process Started - Using I-9 Pattern')

      // Step 1: Reuse existing preview PDF (don't regenerate!)
      let basePdf = pdfUrl
      if (!basePdf) {
        console.log('⚠️ No preview PDF found, generating fresh preview first...')
        const { base64String } = await generateSignedPdfPreview(null)
        basePdf = base64String
      }

      if (!basePdf) {
        console.error('❌ Unable to generate base W-4 PDF before signing')
        setMetadataError('Failed to generate W-4 PDF')
        return
      }

      // Step 2: Overlay signature on EXISTING PDF (like I-9 does)
      console.log('🖊️ Adding signature overlay to existing W-4 PDF...')
      let signedPdfBase64: string
      try {
        signedPdfBase64 = await addSignatureToExistingW4Pdf(basePdf, signatureData)
        setPdfUrl(signedPdfBase64)
        setRemotePdfUrl(null)  // Clear remote reference during signing
        setDocumentMetadata(null)
        console.log('✅ Signature overlay complete, PDF length:', signedPdfBase64.length)
      } catch (error) {
        console.error('❌ Failed to overlay signature onto W-4 PDF:', error)
        setMetadataError('Failed to add signature to W-4 PDF')
        return
      }

      // Step 3: Upload signed PDF to backend for storage (don't regenerate!)
      let remotePdfUrl: string | null = null
      let documentMetadata: StepDocumentMetadata | null = null
      let inlinePdfData: string = signedPdfBase64

      if (employee?.id && !employee.id.startsWith('demo-')) {
        try {
          console.log('☁️ Uploading signed W-4 PDF to backend storage...')
          const apiUrl = getApiUrl()
          const response = await axios.post(
            `${apiUrl}/onboarding/${employee.id}/w4-form/store-signed-pdf`,
            {
              pdfBase64: signedPdfBase64,  // Send the signed PDF
              signature_data: {
                ...signatureData,
                signedAt: signatureData.signedAt || new Date().toISOString()
              },
              form_data: formData  // For metadata only
            }
          )

          if (response?.data?.success && response.data.data) {
            const payload = response.data.data
            if (payload.pdf_url) {
              remotePdfUrl = payload.pdf_url
              setRemotePdfUrl(payload.pdf_url)
              console.log('✅ Signed W-4 stored in Supabase:', payload.pdf_url)
            }
            if (payload.document_metadata) {
              documentMetadata = payload.document_metadata as StepDocumentMetadata
              setDocumentMetadata(documentMetadata)
              setHasStoredDocument(true)
            }
            if (payload.pdf) {
              inlinePdfData = payload.pdf
              setPdfUrl(payload.pdf)
            }
          }
        } catch (uploadError) {
          console.error('❌ Failed to upload signed W-4 PDF:', uploadError)
          console.warn('⚠️ W-4 PDF signed locally, but storage failed')
          setMetadataError('PDF signed locally, not stored in cloud')
          setHasStoredDocument(false)
        }
      }

      // Step 4: Save complete data to session and backend
      const completedAt = new Date().toISOString()
      const completeData = {
        formData,
        signed: true,
        isSigned: true,
        signatureData,
        completedAt,
        pdfGenerated: true,
        pdfGeneratedAt: completedAt,
        remotePdfUrl,
        documentMetadata,
        inlinePdfData,
        showReview: true
      }

      // Save to session storage
      sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(completeData))
      sessionStorage.setItem('onboarding_w4-form_data', JSON.stringify(completeData))

      // Save to backend database
      await saveProgress(currentStep.id, completeData)
      await markStepComplete(currentStep.id, completeData)

      // Also save form data to backend
      if (employee?.id && !employee.id.startsWith('demo-')) {
        try {
          const apiUrl = getApiUrl()
          await axios.post(
            `${apiUrl}/onboarding/${employee.id}/w4-form`,
            {
              formData: formData,
              signed: true,
              signatureData: signatureData,
              completedAt: completedAt
            }
          )
          console.log('✅ W-4 form data saved to backend database')
        } catch (err) {
          console.error('⚠️ Failed to save W-4 to backend database:', err)
          // Don't block on database save failure
        }
      }

      console.log('🎉 W-4 signing complete - TWO previews workflow successful')

    } catch (error) {
      console.error('❌ W-4 signing process failed:', error)
      setMetadataError('Failed to complete W-4 signing')
    } finally {
      // Always clear signing flag, even if errors occurred
      setIsSigningInProgress(false)
    }
  }

  const translations: Record<'en' | 'es', W4Translations> = {
    en: {
      title: 'W-4 Tax Withholding',
      description: 'Complete Form W-4 to determine the correct amount of federal income tax to withhold from your pay.',
      federalNotice: 'Form W-4 is required by the Internal Revenue Service (IRS) for all employees to determine federal income tax withholding.',
      completionMessage: 'W-4 form completed successfully with digital signature.',
      importantInfoTitle: 'Important Tax Information',
      importantInfo: [
        'Complete this form based on your current tax situation',
        'You can submit a new W-4 anytime your situation changes',
        'Consider using the IRS Tax Withholding Estimator for accuracy',
        'Consult a tax professional if you have complex tax situations'
      ],
      formTitle: 'Form W-4: Employee\'s Withholding Certificate',
      reviewTitle: 'Review W-4 Form',
      reviewDescription: 'Please review your tax withholding information and sign electronically',
      agreementText: 'Under penalties of perjury, I declare that this certificate, to the best of my knowledge and belief, is true, correct, and complete.'
    },
    es: {
      title: 'Retención de Impuestos W-4',
      description: 'Complete el Formulario W-4 para determinar la cantidad correcta de impuesto federal sobre la renta a retener de su pago.',
      federalNotice: 'El Formulario W-4 es requerido por el Servicio de Impuestos Internos (IRS) para todos los empleados.',
      completionMessage: 'Formulario W-4 completado exitosamente con firma digital.',
      importantInfoTitle: 'Información Fiscal Importante',
      importantInfo: [
        'Complete este formulario basado en su situación fiscal actual',
        'Puede enviar un nuevo W-4 cuando cambie su situación',
        'Considere usar el Estimador de Retención del IRS',
        'Consulte a un profesional de impuestos si tiene situaciones complejas'
      ],
      formTitle: 'Formulario W-4: Certificado de Retención del Empleado',
      reviewTitle: 'Revisar Formulario W-4',
      reviewDescription: 'Por favor revise su información de retención de impuestos y firme electrónicamente',
      agreementText: 'Bajo pena de perjurio, declaro que este certificado, a mi leal saber y entender, es verdadero, correcto y completo.'
    }
  }

  const t = translations[language]

  const renderMissingDocumentNotice = () => {
    if (!isSigned) return null

    if (!hasStoredDocument && metadataError) {
      return (
        <Alert className="bg-amber-50 border-amber-200 p-3 sm:p-4">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0" />
          <AlertDescription className="text-amber-800">
            <div className="space-y-2">
              <p className="text-sm sm:text-base">{language === 'es' ? 'No pudimos encontrar su W-4 firmado en el almacenamiento. Por favor repita este paso.' : 'We could not find your signed W-4 in storage. Please redo this step.'}</p>
              <button
                onClick={handleResetW4}
                className="text-xs sm:text-sm text-amber-700 underline hover:text-amber-800 font-medium min-h-[44px]"
              >
                {language === 'es' ? 'Reiniciar el W-4' : 'Restart W-4'}
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  const handleResetW4 = () => {
    setFormData({})
    setShowReview(false)
    setIsSigned(false)
    setPdfUrl(null)
    setRemotePdfUrl(null)
    setDocumentMetadata(null)
    setMetadataError(null)
    setHasStoredDocument(false)
    sessionStorage.removeItem(`onboarding_${currentStep.id}_data`)
    sessionStorage.removeItem('onboarding_w4-form_data')
  }

  const renderLoadingIndicator = () => {
    if (!metadataLoading) return null

    return (
      <Alert className="bg-blue-50 border-blue-200 p-3 sm:p-4">
        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 animate-spin flex-shrink-0" />
        <AlertDescription className="text-blue-800 text-xs sm:text-sm">
          {language === 'es' ? 'Verificando los documentos almacenados del W-4...' : 'Checking stored W-4 documents...'}
        </AlertDescription>
      </Alert>
    )
  }

  const hasPreviewSource = Boolean(pdfUrl || remotePdfUrl || documentMetadata?.signed_url)

  return (
    <StepContainer errors={errors} fieldErrors={fieldErrors} saveStatus={saveStatus} canProceed={isSigned}>
      <StepContentWrapper>
        <div className="space-y-4 sm:space-y-6">
        {/* Step Header */}
        <div className="text-center px-4">
          <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto leading-relaxed">{t.description}</p>
        </div>

        {/* Compliance validation alerts commented out - hook doesn't exist yet */}
        {/* complianceValidation.w4Calculations && (
          <ComplianceAlert ... />
        ) */}
        {/* complianceValidation.w4Validation warnings ... */}
        {/* complianceValidation.w4Validation errors ... */}

        {/* Federal Compliance Notice */}
        <Alert className="bg-blue-50 border-blue-200 p-3 sm:p-4">
          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
          <AlertDescription className="text-xs sm:text-sm text-blue-800">
            <strong>{language === 'es' ? 'Requisito Federal:' : 'Federal Requirement:'}</strong> {t.federalNotice}
          </AlertDescription>
        </Alert>

        {/* Progress Indicator */}
        {isSigned && (
          <Alert className="bg-green-50 border-green-200 p-3 sm:p-4">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
            <AlertDescription className="text-sm sm:text-base text-green-800">
              {t.completionMessage}
            </AlertDescription>
          </Alert>
        )}

        {renderLoadingIndicator()}

        {/* Auto-fill Notification */}
        {autoFillNotification && (
          <Alert className="bg-blue-50 border-blue-200 p-3 sm:p-4">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
            <AlertDescription className="text-sm sm:text-base text-blue-800">
              {autoFillNotification}
            </AlertDescription>
          </Alert>
        )}

        {/* Important Tax Information */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center space-x-2 text-orange-800">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>{t.importantInfoTitle}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-orange-800 p-4 sm:p-6">
            <ul className="space-y-2 text-xs sm:text-sm">
              {t.importantInfo.map((info, index) => (
                <li key={index}>• {info}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Show Form, Review, or Signed PDF */}
        {isSigned && hasPreviewSource ? (
          <div className="space-y-4 sm:space-y-6">
            <Alert className="bg-green-50 border-green-200 p-3 sm:p-4">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <AlertDescription className="text-sm sm:text-base text-green-800">
                {t.completionMessage}
              </AlertDescription>
            </Alert>

            {renderMissingDocumentNotice()}

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                  <span>{language === 'es' ? 'Vista previa del W-4 firmado' : 'Signed W-4 Preview'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <PDFViewer
                  pdfUrl={remotePdfUrl || documentMetadata?.signed_url || undefined}
                  pdfData={!remotePdfUrl && !documentMetadata?.signed_url ? pdfUrl ?? undefined : undefined}
                  height="600px"
                />
              </CardContent>
            </Card>
          </div>
        ) : !showReview ? (
          <FormSection
            title={t.title || 'W-4 Tax Withholding'}
            description={t.description || ''}
            icon={<FileText />}
            completed={isSigned}
            required={true}
          >
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                  <span>{t.formTitle}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <W4FormClean
                  initialData={formData}
                  language={language}
                  employeeId={employee?.id}
                  onComplete={handleFormComplete}
                  isLocked={isSigned || !!documentMetadata?.signed_url}
                />
              </CardContent>
            </Card>
          </FormSection>
        ) : (
          <ReviewAndSign
            formType="w4-form"
            formData={formData}
            title={t.reviewTitle}
            description={t.reviewDescription}
            language={language}
            onSign={handleSign}
            onBack={() => {
              setShowReview(false)
              setPdfUrl(null) // Clear PDF so it regenerates when returning to review
            }}
            usePDFPreview={true}
            pdfUrl={pdfUrl}
            federalCompliance={{
              formName: 'Form W-4, Employee\'s Withholding Certificate',
              retentionPeriod: 'For 4 years after the date the last tax return using the information was filed',
              requiresWitness: false
            }}
            agreementText={t.agreementText}
          />
        )}
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
