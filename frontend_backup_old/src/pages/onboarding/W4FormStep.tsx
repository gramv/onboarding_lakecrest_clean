import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import W4FormClean from '@/components/W4FormClean'
import ReviewAndSign from '@/components/ReviewAndSign'
import PDFViewer from '@/components/PDFViewer'
import { CheckCircle, CreditCard, FileText, AlertTriangle } from 'lucide-react'
import { FormSection } from '@/components/ui/form-section'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useStepValidation } from '@/hooks/useStepValidation'
import { w4FormValidator } from '@/utils/stepValidators'
import { generateCleanW4Pdf } from '@/utils/w4PdfGeneratorClean'
import axios from 'axios'

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
  language = 'en',
  employee,
  property
}: StepProps) {
  
  const [formData, setFormData] = useState<any>({})
  const [showReview, setShowReview] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [autoFillNotification, setAutoFillNotification] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  // Validation hook
  const { errors, fieldErrors, validate } = useStepValidation(w4FormValidator)

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

  // Load existing W-4 data from cloud/session storage
  useEffect(() => {
    const loadFormData = async () => {
      try {
        // First, check session storage (may have cloud data already loaded by portal)
        const savedW4Data = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
        console.log('W4FormStep - Loading saved data:', savedW4Data)
        
        if (savedW4Data) {
          try {
            const parsed = JSON.parse(savedW4Data)
            console.log('W4FormStep - Parsed data:', parsed)
            
            // Handle both nested structure (expected) and flat structure (from cloud)
            let dataToLoad = {}
            if (parsed.formData) {
              // Nested structure - expected format
              dataToLoad = parsed.formData
            } else if (parsed.form_data) {
              // Cloud structure with form_data field
              dataToLoad = parsed.form_data
              // Also restore signature state
              if (parsed.signed) {
                setIsSigned(true)
                setShowReview(false)
              }
              if (parsed.pdf_url) {
                setPdfUrl(parsed.pdf_url)
              }
            } else {
              // Flat structure - data directly in parsed object
              dataToLoad = parsed
            }
            
            if (dataToLoad && Object.keys(dataToLoad).length > 0) {
              setFormData(dataToLoad)
            }
            
            // If already signed, show PDF preview instead of review
            if (parsed.isSigned || parsed.signed) {
              setIsSigned(true)
              setShowReview(false) // Don't show review, go straight to signed state
              if (parsed.pdfUrl || parsed.pdf_url) {
                setPdfUrl(parsed.pdfUrl || parsed.pdf_url)
              }
              return // Exit early, no need to process further
            }
          } catch (e) {
            console.error('Failed to parse saved W-4 data:', e)
          }
        }
        
        // Check if this step is already completed in progress
        if (progress.completedSteps.includes(currentStep.id)) {
          setIsSigned(true)
          setShowReview(false) // Don't show review for completed steps
          return
        }
        
        // Load existing W-4 data
        const existingW4Data = sessionStorage.getItem('onboarding_w4-form_data')
        let initialData: any = {}
        
        if (existingW4Data) {
          const parsed = JSON.parse(existingW4Data)
          initialData = parsed.formData || parsed
          setFormData(initialData)
          
          // If we already have data, check if it was signed
          if (parsed.isSigned) {
            setIsSigned(true)
            setShowReview(true)
          }
          
          // Restore PDF URL if available
          if (parsed.pdfUrl) {
            setPdfUrl(parsed.pdfUrl)
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
                autoFilledData.filing_status = 'single'
                fieldsUpdated++
              } else if (personalInfo.maritalStatus === 'married') {
                autoFilledData.filing_status = 'married_filing_jointly'
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
            }
          }
        }
      } catch (error) {
        console.error('Error loading W-4 data:', error)
      }
    }
    
    loadFormData()
  }, [currentStep.id, progress.completedSteps, language])

  const handleFormComplete = async (data: any) => {
    // Validate the form data
    const validation = await validate(data)
    
    if (validation.valid) {
      setFormData(data)
      setShowReview(true)
    }
  }

  const handleSign = async (signatureData: any) => {
    const completeData = {
      formData,
      signed: true,
      isSigned: true,
      signatureData,
      completedAt: new Date().toISOString()
    }
    
    setIsSigned(true)
    
    // Save to session storage immediately with both keys
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify({
      ...completeData,
      showReview: true,
      pdfUrl: null // Will be updated after PDF generation
    }))
    
    // Also save to the alternate key for compatibility
    sessionStorage.setItem('onboarding_w4-form_data', JSON.stringify(completeData))
    
    // Save progress to update controller's step data
    await saveProgress(currentStep.id, completeData)
    
    await markStepComplete(currentStep.id, completeData)
    
    // Generate PDF with signature using frontend generator
    try {
      console.log('Generating W-4 PDF with signature...')
      
      // Prepare form data for PDF generation
      const pdfFormData = {
        ...formData,
        signatureData: {
          signature: signatureData.signature,
          signedAt: signatureData.signedAt || new Date().toISOString()
        }
      }
      
      // Generate PDF with transparent signature
      const pdfBytes = await generateCleanW4Pdf(pdfFormData)
      
      // Convert to base64
      let binary = ''
      const chunkSize = 8192
      for (let i = 0; i < pdfBytes.length; i += chunkSize) {
        const chunk = pdfBytes.slice(i, i + chunkSize)
        binary += String.fromCharCode.apply(null, Array.from(chunk))
      }
      const base64String = btoa(binary)
      
      setPdfUrl(base64String)
      
      // Update session storage with PDF URL
      const updatedData = {
        ...completeData,
        showReview: true,
        pdfUrl: base64String
      }
      sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(updatedData))
      sessionStorage.setItem('onboarding_w4-form_data', JSON.stringify(updatedData))
      
      // Also try to save to backend for persistence
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      axios.post(
        `${apiUrl}/api/onboarding/${employee?.id}/w4-form`,
        {
          form_data: formData,
          signed: true,
          signature_data: signatureData.signature,
          completed_at: new Date().toISOString()
        }
      ).catch(err => {
        console.error('Failed to save W-4 to backend:', err)
        // Continue even if backend save fails
      })
      
    } catch (error) {
      console.error('Failed to generate W-4 PDF:', error)
      
      // Fallback to backend generation
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '/api'
        const response = await axios.post(
          `${apiUrl}/api/onboarding/${employee?.id}/w4-form/generate-pdf`,
          {
            employee_data: {
              ...formData,
              signatureData
            }
          }
        )
        
        if (response.data?.data?.pdf) {
          setPdfUrl(response.data.data.pdf)
          
          // Update session storage with PDF URL
          const updatedData = {
            ...completeData,
            showReview: true,
            pdfUrl: response.data.data.pdf
          }
          sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(updatedData))
          sessionStorage.setItem('onboarding_w4-form_data', JSON.stringify(updatedData))
        }
      } catch (backendError) {
        console.error('Backend PDF generation also failed:', backendError)
      }
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

  return (
    <StepContainer errors={errors} fieldErrors={fieldErrors} saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-6">
        {/* Step Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <h1 className="text-heading-secondary">{t.title}</h1>
          </div>
          <p className="text-gray-600 max-w-3xl mx-auto">{t.description}</p>
        </div>

        {/* Federal Compliance Notice */}
        <Alert className="bg-blue-50 border-blue-200">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>{language === 'es' ? 'Requisito Federal:' : 'Federal Requirement:'}</strong> {t.federalNotice}
          </AlertDescription>
        </Alert>

        {/* Progress Indicator */}
        {isSigned && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t.completionMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Auto-fill Notification */}
        {autoFillNotification && (
          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {autoFillNotification}
            </AlertDescription>
          </Alert>
        )}

        {/* Important Tax Information */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              <span>{t.importantInfoTitle}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-orange-800">
            <ul className="space-y-2 text-sm">
              {t.importantInfo.map((info, index) => (
                <li key={index}>• {info}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Show Form, Review, or Signed PDF */}
        {isSigned && pdfUrl ? (
          // Show PDF preview for already signed forms
          <div className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {t.completionMessage}
              </AlertDescription>
            </Alert>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <span>{language === 'es' ? 'Vista previa del W-4 firmado' : 'Signed W-4 Preview'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PDFViewer pdfData={pdfUrl} height="600px" />
              </CardContent>
            </Card>
          </div>
        ) : !showReview ? (
          <FormSection
            title={String(t.title || 'W-4 Tax Withholding')}
            description={String(t.description || '')}
            icon={<FileText />}
            completed={isSigned}
            required={true}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>{t.formTitle}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <W4FormClean
                  initialData={formData}
                  language={language}
                  employeeId={employee?.id}
                  onComplete={handleFormComplete}
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
            onBack={() => setShowReview(false)}
            usePDFPreview={true}
            pdfEndpoint={`${import.meta.env.VITE_API_URL || '/api'}/api/onboarding/${employee?.id}/w4-form/generate-pdf`}
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