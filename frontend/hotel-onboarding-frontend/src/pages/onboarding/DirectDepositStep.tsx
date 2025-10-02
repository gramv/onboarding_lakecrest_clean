import React, { useState, useEffect } from 'react'
import { getApiUrl } from '@/config/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DirectDepositFormEnhanced from '@/components/DirectDepositFormEnhanced'
import ReviewAndSign from '@/components/ReviewAndSign'
import PDFViewer from '@/components/PDFViewer'
import { CheckCircle, DollarSign, AlertTriangle } from 'lucide-react'
import { StepProps } from '../../controllers/OnboardingFlowController'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepContentWrapper } from '@/components/onboarding/StepContentWrapper'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useStepValidation } from '@/hooks/useStepValidation'
import { directDepositValidator } from '@/utils/stepValidators'
import { ValidationSummary } from '@/components/ui/validation-summary'
import { FormSection } from '@/components/ui/form-section'
import axios from 'axios'
import { secureStorage } from '@/services/SecureStorageService'
import { savePDFToStorage, getLatestPDFForStep } from '@/services/pdfStorage'

export default function DirectDepositStep({
  currentStep,
  progress,
  markStepComplete,
  saveProgress,
  advanceToNextStep,
  goToPreviousStep,
  language = 'en',
  employee,
  property,
  isSingleStepMode = false,
  singleStepMeta,
  sessionToken,
  canProceedToNext: _canProceedToNext
}: StepProps) {

  const [formData, setFormData] = useState<any>({})
  const [isValid, setIsValid] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [ssnFromI9, setSsnFromI9] = useState<string>('')

  const hrContactEmail = singleStepMeta?.hrContactEmail || singleStepMeta?.hr_contact_email

  const sendSingleStepNotifications = async (pdfBase64: string, completionPayload: any) => {
    if (!isSingleStepMode || !singleStepMeta?.sessionId || !sessionToken || !employee?.id || !pdfBase64) {
      return
    }

    const apiUrl = getApiUrl()
    const employeeAny = employee as Record<string, any>
    const fullName = [employeeAny?.firstName || employeeAny?.first_name, employeeAny?.lastName || employeeAny?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Employee'

    if (hrContactEmail) {
      try {
        const emailEndpoint = `${apiUrl}/onboarding/${singleStepMeta.sessionId}/step/direct-deposit/email-documents?token=${encodeURIComponent(sessionToken)}`
        const emailForm = new FormData()
        emailForm.append('hr_email', hrContactEmail)
        emailForm.append('form_pdf_base64', pdfBase64)
        emailForm.append('employee_name', fullName)

        if (employeeAny?.email) {
          emailForm.append('employee_email', employeeAny.email)
        }

        const directDepositData = completionPayload?.formData || completionPayload || {}
        const voidedDoc = directDepositData?.voidedCheckDocument
        if (voidedDoc?.document_id) {
          emailForm.append('voided_check_document_id', voidedDoc.document_id)
          if (voidedDoc.original_filename) {
            emailForm.append('voided_check_filename', voidedDoc.original_filename)
          }
        }

        const bankLetterDoc = directDepositData?.bankLetterDocument
        if (bankLetterDoc?.document_id) {
          emailForm.append('bank_letter_document_id', bankLetterDoc.document_id)
          if (bankLetterDoc.original_filename) {
            emailForm.append('bank_letter_filename', bankLetterDoc.original_filename)
          }
        }

        await fetch(emailEndpoint, {
          method: 'POST',
          body: emailForm
        })
      } catch (error) {
        console.error('Failed to email HR with direct deposit packet:', error)
      }
    }

    try {
      await fetch(`${apiUrl}/onboarding/single-step/notify-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          step_id: currentStep.id,
          step_name: currentStep.name,
          pdf_data: pdfBase64,
          property_id: property?.id,
          session_id: singleStepMeta.sessionId,
          hr_email: hrContactEmail,
          recipient_email: singleStepMeta?.recipientEmail || undefined
        })
      })
    } catch (error) {
      console.error('Failed to notify single-step completion for direct deposit:', error)
    }
  }

  // Try to restore PDF from IndexedDB if we have one stored
  React.useEffect(() => {
    if (!isSingleStepMode && !pdfUrl) {
      ;(async () => {
        const storedPdf = await getLatestPDFForStep(currentStep.id)
        if (storedPdf) {
          setPdfUrl(storedPdf)
          console.log('DirectDepositStep - Restored PDF from IndexedDB')
        }
      })()
    }
  }, [currentStep.id, isSingleStepMode])

  // Try to retrieve SSN from PersonalInfoStep or I9 form data stored in session
  // FIXED: Use regular sessionStorage.getItem() instead of secureStorage (matches I9Section1Step pattern)
  React.useEffect(() => {
    console.log('DirectDepositStep - Starting SSN retrieval...')
    try {
      // First try PersonalInfoStep data (regular sessionStorage - where SSN is actually saved)
      const personalInfoData = sessionStorage.getItem('onboarding_personal-info_data')
      console.log('DirectDepositStep - Personal info data exists:', !!personalInfoData)

      if (personalInfoData) {
        const parsedData = JSON.parse(personalInfoData)
        console.log('DirectDepositStep - Parsed personal info structure:', Object.keys(parsedData))

        // SSN can be at parsedData.personalInfo.ssn or parsedData.ssn
        const personalInfo = parsedData.personalInfo || parsedData
        const ssn = personalInfo?.ssn || ''

        console.log('DirectDepositStep - Personal info parsed SSN:', ssn ? '****' + ssn.slice(-4) : 'NOT FOUND')
        if (ssn) {
          console.log('DirectDepositStep - ✅ Retrieved SSN from PersonalInfo data')
          setSsnFromI9(ssn)
          return
        }
      }

      // Fallback to I9 Section 1 data (also regular sessionStorage)
      const i9Section1Data = sessionStorage.getItem('onboarding_i9-section1_data')
      console.log('DirectDepositStep - I9 Section 1 data exists:', !!i9Section1Data)

      if (i9Section1Data) {
        const parsedData = JSON.parse(i9Section1Data)
        const ssn = parsedData?.formData?.ssn || parsedData?.ssn || ''

        console.log('DirectDepositStep - I9 Section 1 parsed SSN:', ssn ? '****' + ssn.slice(-4) : 'NOT FOUND')
        if (ssn) {
          console.log('DirectDepositStep - ✅ Retrieved SSN from I9 Section 1 data')
          setSsnFromI9(ssn)
          return
        }
      }

      // Additional fallback: check I9 complete step data
      const i9CompleteData = sessionStorage.getItem('onboarding_i9-complete_data')
      console.log('DirectDepositStep - I9 complete data exists:', !!i9CompleteData)

      if (i9CompleteData) {
        const parsedData = JSON.parse(i9CompleteData)
        const ssn = parsedData?.personalInfo?.ssn || parsedData?.formData?.ssn || parsedData?.ssn || ''

        console.log('DirectDepositStep - I9 complete parsed SSN:', ssn ? '****' + ssn.slice(-4) : 'NOT FOUND')
        if (ssn) {
          console.log('DirectDepositStep - ✅ Retrieved SSN from I9 Complete data')
          setSsnFromI9(ssn)
          return
        }
      }

      console.log('DirectDepositStep - ❌ SSN not found in any sessionStorage location')
    } catch (e) {
      console.error('Failed to retrieve SSN from session data:', e)
    }
  }, [])

  // Stable extra data for PDF generation
  const extraPdfData = React.useMemo(() => {
    // Get firstName and lastName from PersonalInfoStep sessionStorage (matches SSN pattern)
    let firstName = employee?.firstName || (employee as any)?.first_name || ''
    let lastName = employee?.lastName || (employee as any)?.last_name || ''

    try {
      const personalInfoData = sessionStorage.getItem('onboarding_personal-info_data')
      if (personalInfoData) {
        const parsedData = JSON.parse(personalInfoData)
        const personalInfo = parsedData.personalInfo || parsedData

        // Use names from PersonalInfoStep if available
        if (personalInfo?.firstName) firstName = personalInfo.firstName
        if (personalInfo?.lastName) lastName = personalInfo.lastName
      }
    } catch (err) {
      console.warn('Failed to retrieve names from PersonalInfoStep:', err)
    }

    return {
      firstName,
      lastName,
      email: (employee as any)?.email,
      ssn: ssnFromI9 || (formData as any)?.ssn || ''
    }
  }, [employee?.firstName, (employee as any)?.first_name, employee?.lastName, (employee as any)?.last_name, (employee as any)?.email, ssnFromI9, (formData as any)?.ssn])

  // Validation hook
  const { errors, fieldErrors, validate } = useStepValidation(directDepositValidator)

  // Convert errors to ValidationSummary format
  const validationMessages = React.useMemo(() => {
    const messages = []

    // Add general errors
    if (errors && errors.length > 0) {
      messages.push(...errors.map(error => ({ message: error, type: 'error' as const })))
    }

    // Add field-specific errors
    if (fieldErrors) {
      Object.entries(fieldErrors).forEach(([field, message]) => {
        if (message) {
          messages.push({ field, message, type: 'error' as const })
        }
      })
    }

    return messages
  }, [errors, fieldErrors])

  // Auto-save data
  const autoSaveData = {
    formData,
    isValid,
    isSigned,
    showReview
  }

  // Auto-save hook
  const { saveStatus } = useAutoSave(autoSaveData, {
    onSave: async (data) => {
      await saveProgress(currentStep.id, {
        ...data,
        isSingleStepMode
      })
    }
  })

  // Load existing data
  useEffect(() => {
    console.log('DirectDepositStep - Loading data for step:', currentStep.id)

    // Try to load saved data from secure session storage
    ;(async () => {
      const savedData = await secureStorage.secureRetrieve<any>(`onboarding_${currentStep.id}_data`)
    if (savedData) {
      try {
        const parsed = savedData
        console.log('DirectDepositStep - Found saved data:', parsed)

        // Check for different data structures
        if (parsed.formData) {
          console.log('DirectDepositStep - Setting formData from parsed.formData')
          setFormData(parsed.formData)
        } else if (parsed.paymentMethod || parsed.primaryAccount) {
          // Direct data structure
          console.log('DirectDepositStep - Setting formData from direct structure')
          setFormData(parsed)
        }

        // Only set as signed if BOTH signed flag AND final PDF exist
        if ((parsed.isSigned || parsed.signed) && parsed.pdfUrl) {
          console.log('DirectDepositStep - Form was previously signed with PDF')
          setIsSigned(true)
          setIsValid(true)
          setPdfUrl(parsed.pdfUrl)
        } else if (parsed.showReview) {
          // Restore review state if it was saved but not signed
          console.log('DirectDepositStep - Restoring review state')
          setShowReview(true)
          setIsValid(parsed.isValid || false)
        }
      } catch (e) {
        console.error('Failed to parse saved direct deposit data:', e)
      }
    }

    // Only set as signed if step is complete AND we have a saved PDF
    if (progress.completedSteps.includes(currentStep.id)) {
      console.log('DirectDepositStep - Step marked as complete in progress')
      // Check if we have a signed PDF before marking as signed
      const savedData2 = await secureStorage.secureRetrieve<any>(`onboarding_${currentStep.id}_data`)
      if (savedData2) {
        const parsed = savedData2
        if (parsed.pdfUrl && (parsed.isSigned || parsed.signed)) {
          setIsSigned(true)
          setIsValid(true)
        }
      }
    }
    })()
  }, [currentStep.id, progress.completedSteps])

  const handleFormComplete = async (data: any) => {
    // Transform nested data structure to flat structure for validation
    const validationData = {
      paymentMethod: data.paymentMethod,
      accountType: data.primaryAccount?.accountType,
      bankName: data.primaryAccount?.bankName,
      routingNumber: data.primaryAccount?.routingNumber,
      accountNumber: data.primaryAccount?.accountNumber,
      confirmAccountNumber: data.primaryAccount?.accountNumberConfirm,
      voidedCheckUploaded: data.voidedCheckUploaded,
      bankLetterUploaded: data.bankLetterUploaded,
      accountVerified: data.accountVerified || data.voidedCheckUploaded || data.bankLetterUploaded,
      // Include deposit type and amount for partial deposits
      depositType: data.depositType,
      depositAmount:
        data.depositType === 'partial' ? (data.primaryAccount?.depositAmount ?? '') : ''
    }

    // Validate the transformed data
    const validation = await validate(validationData)

    if (validation.valid) {
      setFormData(data)
      setIsValid(true)
      setShowReview(true)

      // Save to secure session storage (no pdfUrl until signed)
      await secureStorage.secureStore(`onboarding_${currentStep.id}_data`, {
        formData: data,
        isValid: true,
        isSigned: false,
        showReview: true,
        // Don't save pdfUrl here - only after signing
      });
    }
  }

  const handleBackFromReview = async () => {
    setShowReview(false)
    setPdfUrl(null)  // Clear any preview PDF

    // Update secure session storage to clear review state
    await secureStorage.secureStore(`onboarding_${currentStep.id}_data`, {
      formData,
      isValid: true,
      isSigned: false,
      showReview: false,
      // No pdfUrl
    })
  }

  const handleDigitalSignature = async (signatureData: any, generatedPdfUrl?: string) => {
    console.log('🖊️ DirectDepositStep - Signing with signature data')
    console.log('🖊️ Signature payload verification:', {
      hasSignatureData: !!signatureData,
      signatureDataType: typeof signatureData,
      signatureKeys: signatureData ? Object.keys(signatureData) : [],
      signatureStringLength: signatureData?.signature?.length || 0,
      signaturePreview: signatureData?.signature?.substring(0, 50) || 'NO SIGNATURE'
    })

    // If we have an employee ID, regenerate PDF with signature
    let finalPdfUrl = generatedPdfUrl || pdfUrl

    if (employee?.id && signatureData) {
      try {
        console.log('🖊️ DirectDepositStep - Regenerating PDF with signature...')
        const apiUrl = getApiUrl()

        // Create payload with signature included - ensure SSN is properly included
        const pdfPayload = {
          ...formData,
          ...extraPdfData,
          signatureData: signatureData,
          // Ensure SSN is always included - try multiple sources
          ssn: ssnFromI9 || extraPdfData?.ssn || (formData as any)?.ssn || ''
        }

        console.log('🖊️ PDF Payload signature check:', {
          payloadHasSignatureData: !!pdfPayload.signatureData,
          signatureDataKeys: pdfPayload.signatureData ? Object.keys(pdfPayload.signatureData) : []
        })

        if (isSingleStepMode) {
          pdfPayload.is_single_step = true
          pdfPayload.single_step_mode = true
          if (singleStepMeta?.sessionId) {
            pdfPayload.session_id = singleStepMeta.sessionId
          }
        }

        // Debug logging to identify SSN sources
        console.log('DirectDepositStep - SSN Debug:')
        console.log('  - ssnFromI9:', ssnFromI9)
        console.log('  - extraPdfData.ssn:', extraPdfData?.ssn)
        console.log('  - formData.ssn:', (formData as any)?.ssn)
        console.log('  - Final SSN in payload:', pdfPayload.ssn)

        // Regenerate PDF with signature
        const response = await axios.post(
          `${apiUrl}/onboarding/${employee.id}/direct-deposit/generate-pdf`,
          { employee_data: pdfPayload },
          { headers: { 'Content-Type': 'application/json' } }
        )

        if (response.data?.data?.pdf) {
          finalPdfUrl = response.data.data.pdf
          console.log('DirectDepositStep - PDF regenerated with signature')
        }
      } catch (error) {
        console.error('Failed to regenerate PDF with signature:', error)
        // Use preview PDF if regeneration fails
      }
    }

    setIsSigned(true)
    setPdfUrl(finalPdfUrl)

    // Create complete data with both nested and flat structure for compatibility
    const completeData = {
      // Include flattened primary account data for validator
      ...(formData.primaryAccount || {}),
      // Include all form data
      ...formData,
      // Keep nested structure too
      formData,
      signed: true,
      isSigned: true, // Include both for compatibility
      signatureData,
      pdfUrl: finalPdfUrl,
      completedAt: new Date().toISOString()
    }

    if (isSingleStepMode) {
      completeData.is_single_step = true
      completeData.single_step_mode = true
      if (singleStepMeta?.sessionId) {
        completeData.session_id = singleStepMeta.sessionId
      }
      if (singleStepMeta?.recipientEmail) {
        completeData.recipient_email = singleStepMeta.recipientEmail
      }
    }

    // Save to backend if we have an employee ID
    if (employee?.id) {
      try {
        const apiUrl = getApiUrl()
        await axios.post(`${apiUrl}/onboarding/${employee.id}/direct-deposit`, completeData)
        console.log('Direct deposit data saved to backend')
      } catch (error) {
        console.error('Failed to save direct deposit data to backend:', error)
        // Continue even if backend save fails - data is in session storage
      }
    }

    // Save to secure session storage with signed status and flat structure
    // For single-step mode, we need the PDF for email notifications
    // For regular mode, avoid storing PDF to prevent sessionStorage quota issues
    const dataToStore = {
      ...(formData.primaryAccount || {}), // Include flattened data
      ...formData,
      formData,
      isValid: true,
      isSigned: true,
      showReview: false,
      signed: true,
      signatureData,
      completedAt: completeData.completedAt
    }

    if (isSingleStepMode) {
      // Single-step mode needs PDF for email notifications
      dataToStore.pdfUrl = generatedPdfUrl || pdfUrl
    } else {
      // Regular mode: Use IndexedDB for PDF storage to avoid quota issues
      if (finalPdfUrl) {
        const { pdfId, stored } = await savePDFToStorage(currentStep.id, finalPdfUrl, employee?.id)
        dataToStore.pdfId = pdfId
        dataToStore.pdfStored = stored
      }
      dataToStore.pdfGenerated = true
      dataToStore.pdfGeneratedAt = new Date().toISOString()
    }

    await secureStorage.secureStore(`onboarding_${currentStep.id}_data`, dataToStore)

    // Save progress to update controller's step data
    await saveProgress(currentStep.id, completeData)

    await markStepComplete(currentStep.id, completeData)

    await sendSingleStepNotifications(finalPdfUrl || pdfUrl || '', completeData)
    setShowReview(false)
  }

  const isStepComplete = isValid && isSigned

  const translations = {
    en: {
      title: 'Payment Method Setup',
      reviewTitle: 'Review Direct Deposit',
      description: 'Choose how you want to receive your pay. Direct deposit is the fastest and most secure way to receive your paycheck.',
      completionMessage: 'Payment method configured successfully!',
      importantInfoTitle: 'Important Information',
      importantInfo: [
        'Direct deposit is available 1-2 days earlier than paper checks',
        'Changes take 1-2 pay periods to take effect',
        'You can update your payment method anytime through HR',
        'Ensure your banking information is accurate'
      ],
      formTitle: 'Direct Deposit Setup',
      acknowledgments: {
        directDeposit: 'I authorize my employer to deposit my pay electronically',
        paperCheck: 'I choose to receive paper checks and will pick them up on payday',
        understand: 'I understand changes take 1-2 pay periods to take effect',
        update: 'I can update my payment method at any time through HR'
      }
    },
    es: {
      title: 'Configuración de Método de Pago',
      reviewTitle: 'Revisar Depósito Directo',
      description: 'Elija cómo desea recibir su pago. El depósito directo es la forma más rápida y segura de recibir su salario.',
      completionMessage: '¡Método de pago configurado exitosamente!',
      importantInfoTitle: 'Información Importante',
      importantInfo: [
        'El depósito directo está disponible 1-2 días antes que los cheques en papel',
        'Los cambios tardan 1-2 períodos de pago en entrar en vigencia',
        'Puede actualizar su método de pago en cualquier momento a través de RRHH',
        'Asegúrese de que su información bancaria sea precisa'
      ],
      formTitle: 'Configuración de Depósito Directo',
      acknowledgments: {
        directDeposit: 'Autorizo a mi empleador a depositar mi pago electrónicamente',
        paperCheck: 'Elijo recibir cheques en papel y los recogeré el día de pago',
        understand: 'Entiendo que los cambios tardan 1-2 períodos de pago en entrar en vigencia',
        update: 'Puedo actualizar mi método de pago en cualquier momento a través de RRHH'
      }
    }
  }

  const t = translations[language]

  // Show signed PDF if form is already signed
  if (isSigned && pdfUrl) {
    return (
      <StepContainer errors={errors} saveStatus={saveStatus}>
        <StepContentWrapper>
          <div className="space-y-4 sm:space-y-6">
            {/* Completion Status */}
            <Alert className="bg-green-50 border-green-200 p-3 sm:p-4">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <AlertDescription className="text-sm sm:text-base text-green-800">
                {t.completionMessage}
              </AlertDescription>
            </Alert>

            {/* Signed PDF Display */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                  <span>Signed Direct Deposit Authorization</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Your direct deposit authorization has been completed and signed.
                  </p>
                  <PDFViewer pdfData={pdfUrl} height="600px" />
                </div>
              </CardContent>
            </Card>
          </div>
        </StepContentWrapper>
      </StepContainer>
    )
  }

  // Show review and sign if form is valid and review is requested
  if (showReview && formData) {
    const previewEmployeeId = employee?.id
    return (
      <StepContainer errors={errors} saveStatus={saveStatus}>
        <StepContentWrapper>
          <div className="space-y-4 sm:space-y-6">
          {/* Validation Summary */}
          {validationMessages.length > 0 && (
            <ValidationSummary
              messages={validationMessages}
              title="Please correct the following issues"
              className="mb-4 sm:mb-6"
            />
          )}

          {isSingleStepMode && (
            <Alert className="mb-4 sm:mb-6 bg-blue-50 border-blue-200 p-3 sm:p-4">
              <AlertDescription className="text-xs sm:text-sm text-blue-800">
                You are completing a standalone direct deposit form. Once you sign and submit, HR will be notified automatically{singleStepMeta?.recipientEmail ? ` at ${singleStepMeta.recipientEmail}` : ''}.
              </AlertDescription>
            </Alert>
          )}

          <FormSection
            title={t.reviewTitle}
            description="Please review your direct deposit information and sign to complete this step"
            icon={<DollarSign className="h-5 w-5" />}
            required={true}
          >
            <ReviewAndSign
              formType="direct_deposit"
              title="Direct Deposit Authorization Form"
              formData={formData}
              description={employee?.position ? `Position: ${employee.position}` : undefined}
              onSign={(signatureData: any) => handleDigitalSignature(signatureData, pdfUrl || undefined)}
              onBack={handleBackFromReview}
              language={language}
              usePDFPreview={!!previewEmployeeId}
              pdfEndpoint={previewEmployeeId ? `${getApiUrl()}/onboarding/${previewEmployeeId}/direct-deposit/generate-pdf` : undefined}
              onPdfGenerated={(pdf: string) => setPdfUrl(pdf)}
              extraPdfData={extraPdfData}
            />
          </FormSection>
          </div>
        </StepContentWrapper>
      </StepContainer>
    )
  }

  return (
    <StepContainer errors={errors} fieldErrors={fieldErrors} saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-4 sm:space-y-6">
        {/* Validation Summary */}
        {validationMessages.length > 0 && (
          <ValidationSummary
            messages={validationMessages}
            title="Please correct the following issues"
            className="mb-4 sm:mb-6"
          />
        )}

        {isSingleStepMode && (
          <Alert className="bg-blue-50 border-blue-200 p-3 sm:p-4">
            <AlertDescription className="text-xs sm:text-sm text-blue-800">
              Complete this form to finalize your direct deposit details. A confirmation is sent to HR automatically once you finish.
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Indicator */}
        {isStepComplete && (
          <Alert className="bg-green-50 border-green-200 p-3 sm:p-4">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
            <AlertDescription className="text-sm sm:text-base text-green-800">
              {t.completionMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Form Section */}
        <FormSection
          title={t.title}
          description={t.description}
          icon={<DollarSign className="h-5 w-5" />}
          completed={isStepComplete}
          required={true}
        >
          <div className="space-y-4 sm:space-y-6">
            {/* Important Information */}
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3 p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center space-x-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span>{t.importantInfoTitle}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-amber-800 p-4 sm:p-6">
                <ul className="space-y-2 text-xs sm:text-sm">
                  {t.importantInfo.map((info, index) => (
                    <li key={index}>• {info}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Direct Deposit Form */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 px-2 sm:px-0">{t.formTitle}</h3>
              <DirectDepositFormEnhanced
                initialData={formData}
                language={language}
                onSave={handleFormComplete}
                onValidationChange={(valid: boolean) => {
                  setIsValid(valid)
                }}
                employee={employee}
                property={property}
                employeeSSN={ssnFromI9}
              />
            </div>
          </div>
        </FormSection>
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
