import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Pen, AlertCircle, Eye, Loader2, Info } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { format } from 'date-fns'
import PDFViewer from './PDFViewer'
import axios from 'axios'

interface ReviewAndSignProps {
  formType: string
  formData: any
  title: string
  description?: string
  language: 'en' | 'es'
  onSign: (signatureData: SignatureData) => void
  onBack?: () => void
  renderPreview?: (data: any) => React.ReactNode
  signatureLabel?: string
  agreementText?: string
  federalCompliance?: {
    formName: string
    requiresWitness?: boolean
    retentionPeriod?: string
  }
  pdfEndpoint?: string // Optional endpoint to generate PDF
  usePDFPreview?: boolean // Whether to show PDF preview instead of HTML
  pdfUrl?: string | null // Direct PDF URL to display
  onPdfGenerated?: (pdfData: string) => void // Callback when PDF is generated
  extraPdfData?: any // Optional extra data to merge into PDF generation payload
}

export interface SignatureData {
  signature: string
  signedAt: string
  ipAddress?: string
  userAgent?: string
  formType: string
  formData: any
  certificationStatement: string
  federalCompliance?: any
}

export default function ReviewAndSign({
  formType,
  formData,
  title,
  description,
  language = 'en',
  onSign,
  onBack,
  renderPreview,
  signatureLabel,
  agreementText,
  federalCompliance,
  pdfEndpoint,
  usePDFPreview = false,
  pdfUrl,
  onPdfGenerated,
  extraPdfData
}: ReviewAndSignProps) {
  const [hasAgreed, setHasAgreed] = useState(false)
  const [signatureError, setSignatureError] = useState('')
  const [isSigned, setIsSigned] = useState(false)
  const [pdfData, setPdfData] = useState<string | null>(null)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfGenerationInProgress, setPdfGenerationInProgress] = useState(false)
  const [pdfGeneratedFor, setPdfGeneratedFor] = useState<string | null>(null)
  const signatureRef = useRef<SignatureCanvas>(null)

  // Build a stable payload for PDF generation
  const pdfPayload = React.useMemo(() => {
    // Debug logging for data received
    console.log('ReviewAndSign - Received data:')
    console.log('  - formData keys:', formData ? Object.keys(formData) : 'null')
    console.log('  - formData.personalInfo type:', typeof formData?.personalInfo)
    console.log('  - formData.personalInfo isArray:', Array.isArray(formData?.personalInfo))
    console.log('  - formData.personalInfo:', formData?.personalInfo)
    console.log('  - extraPdfData keys:', extraPdfData ? Object.keys(extraPdfData) : 'null')
    
    // Extract SSN from nested personalInfo object first, then fallbacks
    const ssn = formData?.personalInfo?.ssn || formData?.ssn || extraPdfData?.ssn || '';
    console.log('  - Extracted SSN:', ssn ? `${ssn.substring(0, 3)}****` : 'none')

    // Build payload with proper structure - use the personal info that was passed in
    const personalInfoToUse = formData?.personalInfo && typeof formData.personalInfo === 'object' && !Array.isArray(formData.personalInfo)
      ? formData.personalInfo
      : {}

    console.log('  - Personal info to use:', personalInfoToUse)
    console.log('  - Personal info fields check:', {
      firstName: personalInfoToUse?.firstName || 'MISSING',
      lastName: personalInfoToUse?.lastName || 'MISSING',
      ssn: personalInfoToUse?.ssn || 'MISSING',
      address: personalInfoToUse?.address || 'MISSING',
      city: personalInfoToUse?.city || 'MISSING',
      state: personalInfoToUse?.state || 'MISSING',
      zipCode: personalInfoToUse?.zipCode || 'MISSING',
      phone: personalInfoToUse?.phone || 'MISSING',
      email: personalInfoToUse?.email || 'MISSING',
      gender: personalInfoToUse?.gender || 'MISSING'
    })

    const payload = {
      ...formData,
      personalInfo: {
        // Use the personal info object directly if it has values, otherwise fallback
        firstName: personalInfoToUse?.firstName || formData?.firstName || '',
        lastName: personalInfoToUse?.lastName || formData?.lastName || '',
        middleInitial: personalInfoToUse?.middleInitial || formData?.middleInitial || '',
        ssn: personalInfoToUse?.ssn || formData?.ssn || ssn || '',
        dateOfBirth: personalInfoToUse?.dateOfBirth || formData?.dateOfBirth || '',
        address: personalInfoToUse?.address || formData?.address || '',
        city: personalInfoToUse?.city || formData?.city || '',
        state: personalInfoToUse?.state || formData?.state || '',
        zipCode: personalInfoToUse?.zipCode || personalInfoToUse?.zip || formData?.zipCode || formData?.zip || '',
        phone: personalInfoToUse?.phone || formData?.phone || '',
        email: personalInfoToUse?.email || formData?.email || '',
        gender: personalInfoToUse?.gender || formData?.gender || '',
        maritalStatus: personalInfoToUse?.maritalStatus || formData?.maritalStatus || '',
        aptNumber: personalInfoToUse?.aptNumber || formData?.aptNumber || '',
        ...personalInfoToUse // Include any additional fields from personal info
      },
      ...(extraPdfData || {})
    }
    
    // Debug log the actual values
    console.log('Personal Info Values:', {
      firstName: payload.personalInfo.firstName || 'empty',
      lastName: payload.personalInfo.lastName || 'empty',
      ssn: payload.personalInfo.ssn ? '***-**-' + String(payload.personalInfo.ssn).slice(-4) : 'empty',
      dateOfBirth: payload.personalInfo.dateOfBirth || 'empty',
      address: payload.personalInfo.address || 'empty',
      city: payload.personalInfo.city || 'empty',
      state: payload.personalInfo.state || 'empty',
      zipCode: payload.personalInfo.zipCode || 'empty',
      phone: payload.personalInfo.phone || 'empty',
      email: payload.personalInfo.email || 'empty',
      gender: payload.personalInfo.gender || 'empty'
    })

    // Log the payload for debugging
    console.log('ReviewAndSign - PDF payload being sent:', {
      hasSSN: !!(payload.personalInfo?.ssn),
      ssn: payload.personalInfo?.ssn ? `${payload.personalInfo.ssn.substring(0, 3)}****` : 'empty',
      hasPersonalInfo: !!(payload.personalInfo?.firstName && payload.personalInfo?.lastName),
      firstName: payload.personalInfo?.firstName || 'empty',
      lastName: payload.personalInfo?.lastName || 'empty',
      address: payload.personalInfo?.address || 'empty',
      city: payload.personalInfo?.city || 'empty',
      gender: payload.personalInfo?.gender || 'empty',
      dentalCoverage: payload.dentalCoverage || 'empty',
      dentalEnrolled: payload.dentalEnrolled || 'empty',
      dentalTier: payload.dentalTier || 'empty',
      dentalWaived: payload.dentalWaived || 'empty',
      keys: Object.keys(payload)
    })

    console.log('ReviewAndSign - Complete payload structure:')
    console.log('  personalInfo:', payload.personalInfo)
    console.log('  dental fields:', {
      dentalCoverage: payload.dentalCoverage,
      dentalEnrolled: payload.dentalEnrolled,
      dentalTier: payload.dentalTier,
      dentalWaived: payload.dentalWaived
    })
    
    return payload
  }, [formData, extraPdfData])
  const payloadKey = React.useMemo(() => {
    try {
      return JSON.stringify(pdfPayload)
    } catch {
      return String(Date.now())
    }
  }, [pdfPayload])

  const translations = {
    en: {
      reviewTitle: 'Review Your Information',
      reviewDescription: 'Please carefully review all information before signing',
      editButton: 'Edit Information',
      signatureTitle: 'Electronic Signature',
      signatureInstructions: 'Please sign in the box below using your mouse or touch screen',
      clearSignature: 'Clear',
      submitSignature: 'Submit Signature',
      agreementLabel: 'I certify that the information provided is true and correct',
      signatureRequired: 'Please provide your signature',
      agreementRequired: 'You must agree to the certification statement',
      signedSuccessfully: 'Document signed successfully',
      signedAt: 'Signed at',
      ipAddress: 'IP Address',
      viewDocument: 'View Document',
      federalNotice: 'This is a federal form that will be retained for',
      witnessRequired: 'This form requires witness verification'
    },
    es: {
      reviewTitle: 'Revise Su Información',
      reviewDescription: 'Por favor revise cuidadosamente toda la información antes de firmar',
      editButton: 'Editar Información',
      signatureTitle: 'Firma Electrónica',
      signatureInstructions: 'Por favor firme en el cuadro a continuación usando su mouse o pantalla táctil',
      clearSignature: 'Limpiar',
      submitSignature: 'Enviar Firma',
      agreementLabel: 'Certifico que la información proporcionada es verdadera y correcta',
      signatureRequired: 'Por favor proporcione su firma',
      agreementRequired: 'Debe aceptar la declaración de certificación',
      signedSuccessfully: 'Documento firmado exitosamente',
      signedAt: 'Firmado en',
      ipAddress: 'Dirección IP',
      viewDocument: 'Ver Documento',
      federalNotice: 'Este es un formulario federal que se conservará durante',
      witnessRequired: 'Este formulario requiere verificación de testigo'
    }
  }

  const t = translations[language]

  // Use useCallback to ensure loadPDF has access to current payloadKey
  const loadPDF = React.useCallback(async () => {
    if (!pdfEndpoint) return
    
    // Prevent concurrent PDF generation
    if (pdfGenerationInProgress) {
      console.log('ReviewAndSign - PDF generation already in progress, aborting new request')
      return
    }
    
    console.log('ReviewAndSign - Starting PDF generation...')
    setPdfGenerationInProgress(true)
    setLoadingPDF(true)
    setPdfError(null)
    
    try {
      const controller = new AbortController()
      const response = await axios.post(
        pdfEndpoint,
        {
          employee_data: pdfPayload
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      )
      
      // DEBUG: Log response structure
      console.log('ReviewAndSign - Full response structure:', {
        responseType: typeof response,
        responseDataType: typeof response.data,
        responseDataKeys: response.data ? Object.keys(response.data) : 'no response.data',
        success: response.data?.success,
        hasData: !!response.data?.data,
        dataKeys: response.data?.data ? Object.keys(response.data.data) : 'no data',
        hasPdf: response.data?.data?.pdf ? 'yes' : 'no',
        pdfType: response.data?.data?.pdf ? typeof response.data.data.pdf : 'no pdf'
      })

      // DEBUG: Log raw response for troubleshooting
      console.log('ReviewAndSign - Raw response.data:', response.data)

      // Extract base64 string directly from JSON response
      if (!response || !response.data) {
        throw new Error(`Invalid response: ${JSON.stringify(response, null, 2)}`)
      }

      if (!response.data.success) {
        throw new Error(`API returned error: ${response.data.message || 'Unknown error'}`)
      }

      if (!response.data.data || !response.data.data.pdf) {
        throw new Error(`PDF not found in response. Response structure: ${JSON.stringify(response.data, null, 2)}`)
      }

      const pdfBase64 = response.data.data.pdf

      // DEBUG: Validate PDF content
      console.log('ReviewAndSign - PDF received, length:', pdfBase64.length)

      try {
        const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
        const header = String.fromCharCode(...pdfBytes.slice(0, 4))
        console.log('ReviewAndSign - PDF header validation:', header === '%PDF' ? '✅ VALID PDF' : '❌ INVALID PDF')

        // Check for actual form field content
        const pdfText = new TextDecoder().decode(pdfBytes)
        const hasEmployeeName = pdfText.includes('employee_name') || pdfText.includes(formData?.firstName || '') || pdfText.includes(formData?.lastName || '')
        const hasSSN = pdfText.includes('social_security_number') || pdfText.includes(extraPdfData?.ssn?.slice(-4) || '')
        const hasBankName = pdfText.includes('bank1_name') || pdfText.includes(formData?.primaryAccount?.bankName || '')

        console.log('ReviewAndSign - PDF Content Validation:')
        console.log('  - Has employee name references:', hasEmployeeName)
        console.log('  - Has SSN references:', hasSSN)
        console.log('  - Has bank name references:', hasBankName)

        if (hasEmployeeName && hasSSN && hasBankName) {
          console.log('🎉 PDF contains all expected form data!')
        } else {
          console.log('⚠️  PDF might be missing form data - check backend logs')
        }

        // Keep preview-only; no auto-download
        // If needed for manual testing, uncomment below to log a downloadable URL
        // const pdfBlob = new Blob([pdfBytes], {type: 'application/pdf'})
        // const downloadUrl = URL.createObjectURL(pdfBlob)
        // console.log('ReviewAndSign - PDF download URL for inspection:', downloadUrl)

      } catch (decodeError) {
        console.error('ReviewAndSign - PDF decode error:', decodeError)
      }

      setPdfData(pdfBase64)

      // Mark this payload as generated ONLY on success
      setPdfGeneratedFor(payloadKey)
      console.log('ReviewAndSign - PDF generation complete, marked payload as generated')

      // Call the callback if provided
      if (onPdfGenerated && pdfBase64) {
        onPdfGenerated(pdfBase64)
      }
    } catch (error) {
      console.error('Error loading PDF:', error)
      console.error('PDF generation request data:', { employee_data: pdfPayload })
      setPdfError('Failed to load PDF preview')

      // Clear the generated flag on error so it can be retried
      setPdfGeneratedFor(null)
      setPdfData(null)
    } finally {
      setLoadingPDF(false)
      setPdfGenerationInProgress(false)
      console.log('ReviewAndSign - PDF generation process ended')
    }
  }, [pdfEndpoint, pdfPayload, payloadKey, pdfGenerationInProgress, onPdfGenerated])

  useEffect(() => {
    // Get IP address and user agent for federal compliance
    if (window.navigator) {
      // In production, you'd make an API call to get the real IP
      // For now, we'll use placeholder data
    }
    
    // If pdfUrl is already provided, use it directly
    if (pdfUrl) {
      console.log('ReviewAndSign - Using provided pdfUrl, skipping generation')
      setPdfData(pdfUrl)
      // Don't call onPdfGenerated here as it's already saved
      return; // Exit early, no need to generate
    }
    
    // Only generate PDF if:
    // 1. PDF preview is enabled
    // 2. We have an endpoint
    // 3. We haven't already generated for this payload
    // 4. Generation is not currently in progress
    if (usePDFPreview && pdfEndpoint && payloadKey !== pdfGeneratedFor && !pdfGenerationInProgress) {
      console.log('ReviewAndSign - Triggering PDF generation (only once per payload)')
      loadPDF()
    } else if (pdfGenerationInProgress) {
      console.log('ReviewAndSign - PDF generation already in progress, skipping')
    } else if (payloadKey === pdfGeneratedFor) {
      console.log('ReviewAndSign - PDF already generated for this payload, skipping')
    }
    
    // No cleanup that clears pdfData; avoid flicker on re-renders
  }, [usePDFPreview, pdfEndpoint, pdfUrl, payloadKey, pdfGeneratedFor, pdfGenerationInProgress, loadPDF])

  const handleClearSignature = () => {
    signatureRef.current?.clear()
    setSignatureError('')
  }

  const handleSubmitSignature = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty() && hasAgreed) {
      const signatureData: SignatureData = {
        signature: signatureRef.current.toDataURL(),
        signedAt: new Date().toISOString(),
        ipAddress: 'xxx.xxx.xxx.xxx', // In production, get real IP
        userAgent: window.navigator.userAgent,
        formType,
        formData,
        certificationStatement: agreementText || t.agreementLabel,
        federalCompliance: federalCompliance
      }
      
      setIsSigned(true)
      onSign(signatureData)
    } else {
      if (signatureRef.current?.isEmpty()) {
        setSignatureError(t.signatureRequired)
      } else if (!hasAgreed) {
        setSignatureError(t.agreementRequired)
      }
    }
  }

  if (isSigned) {
    return (
      <div className="space-y-6">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {t.signedSuccessfully}
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t.signedAt}:</span>
                <span className="font-medium">{format(new Date(), 'PPpp')}</span>
              </div>
              {federalCompliance && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    {t.federalNotice} {federalCompliance.retentionPeriod}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        {description && (
          <p className="text-gray-600">{description}</p>
        )}
      </div>

      {/* Show PDF Preview or HTML Preview */}
      {usePDFPreview && (pdfUrl || pdfEndpoint) ? (
        <div className="space-y-4">
          {loadingPDF ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-gray-600">Generating PDF preview...</p>
                </div>
              </CardContent>
            </Card>
          ) : pdfError ? (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {pdfError}
              </AlertDescription>
            </Alert>
          ) : (pdfUrl || pdfData) ? (
            <PDFViewer
              pdfUrl={pdfUrl || undefined}
              pdfData={pdfData || undefined}
              title={`${title} Preview`}
              height="600px"
            />
          ) : null}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>{t.reviewTitle}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              {renderPreview && renderPreview(formData)}
            </div>
          </CardContent>
        </Card>
      )}

      {federalCompliance && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-1">
              <p className="font-medium">{federalCompliance.formName}</p>
              {federalCompliance.requiresWitness && (
                <p className="text-sm">{t.witnessRequired}</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Signature Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Pen className="h-5 w-5" />
            <span>{t.signatureTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-600 text-sm">{t.signatureInstructions}</p>
          
          {/* Signature Canvas */}
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: 'w-full h-48'
              }}
              backgroundColor="rgba(0,0,0,0)"
              penColor="black"
            />
          </div>
          
          {/* Electronic Signature Legal Notice */}
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-800 flex items-start">
              <Info className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
              {language === 'es' 
                ? 'Las firmas electrónicas tienen el mismo nivel de autenticidad y validez legal que las firmas físicas según la Ley ESIGN y UETA.'
                : 'Electronic signatures have the same level of authenticity and legal validity as physical signatures under the ESIGN Act and UETA.'}
            </p>
          </div>

          {/* Agreement Checkbox */}
          <div className="space-y-3">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAgreed}
                onChange={(e) => {
                  setHasAgreed(e.target.checked)
                  setSignatureError('')
                }}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                {agreementText || t.agreementLabel}
              </span>
            </label>
          </div>

          {/* Error Message */}
          {signatureError && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {signatureError}
              </AlertDescription>
            </Alert>
          )}

          {/* Signature Label */}
          {signatureLabel && (
            <div className="text-sm text-gray-600 text-center">
              {signatureLabel}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onBack()
                }}
                className="flex-1"
              >
                {t.editButton}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleClearSignature()
              }}
              className="flex-1"
            >
              {t.clearSignature}
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSubmitSignature()
              }}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t.submitSignature}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}