import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import I9ReviewAndSign from '@/components/I9ReviewAndSign'
import PDFDocumentViewer from '@/components/ui/pdf-document-viewer'
import DigitalSignatureCapture from '@/components/DigitalSignatureCapture'
import { CheckCircle, FileText, AlertTriangle, Shield, Eye } from 'lucide-react'

export default function I9ReviewSignStep(props) {
  const { currentStep, progress, markStepComplete, saveProgress, language = 'en' } = props
  
  const [isComplete, setIsComplete] = useState(false)
  const [reviewData, setReviewData] = useState(null)
  const [showPDFReview, setShowPDFReview] = useState(false)
  const [showSignature, setShowSignature] = useState(false)

  // Load existing data from progress
  useEffect(() => {
    const existingData = progress.stepData?.['i9_review_sign']
    if (existingData) {
      setReviewData(existingData.reviewData)
      setIsComplete(existingData.completed || false)
    }
  }, [progress])

  // Get I-9 data from previous steps
  const section1Data = progress.stepData?.['i9_section1']?.formData
  const supplementAData = progress.stepData?.['i9_supplement_a']?.formData
  const supplementBData = progress.stepData?.['i9_supplement_b']?.formData

  const handleComplete = (data) => {
    setReviewData(data)
    setIsComplete(true)
    const stepData = {
      reviewData: data,
      completed: true,
      completedAt: new Date().toISOString(),
      governmentCompliant: true,
      legallyBinding: true
    }
    markStepComplete('i9_review_sign', stepData)
    saveProgress('i9_review_sign', stepData)
  }

  const handleBack = () => {
    // Navigate back to previous step logic
    console.log('Navigate back to previous step')
  }

  const translations = {
    en: {
      title: 'Review & Sign Form I-9',
      subtitle: 'Employment Eligibility Verification - Final Review',
      description: 'Review all your I-9 information and provide your digital signature to complete the federal requirement.',
      federalRequirement: 'Federal Requirement',
      federalNotice: 'Form I-9 completion is required by U.S. Citizenship and Immigration Services (USCIS) under the Immigration and Nationality Act.',
      completedNotice: 'I-9 form review and signature completed successfully. This form is now legally binding.',
      instructions: 'Important Instructions',
      instructionsList: [
        'Review all information carefully for accuracy',
        'Ensure your digital signature matches your legal name',
        'This signature is legally binding under federal law',
        'Any false information may result in penalties under 18 U.S.C. § 1546'
      ],
      missingData: 'Missing Required Data',
      missingDataDesc: 'Please complete I-9 Section 1 before proceeding to review and signature.',
      reviewTitle: 'Review Official I-9 Form',
      reviewDescription: 'Please review the official USCIS Form I-9 with your information filled in. Verify all details before signing.',
      signatureTitle: 'Digital Signature Required',
      signatureDescription: 'Provide your digital signature to complete Form I-9. This signature is legally binding.',
      viewPDFButton: 'Review Official Form',
      estimatedTime: 'Estimated time: 5-7 minutes'
    },
    es: {
      title: 'Revisar y Firmar Formulario I-9',
      subtitle: 'Verificación de Elegibilidad de Empleo - Revisión Final',
      description: 'Revise toda su información del I-9 y proporcione su firma digital para completar el requisito federal.',
      federalRequirement: 'Requisito Federal',
      federalNotice: 'La completación del Formulario I-9 es requerida por los Servicios de Ciudadanía e Inmigración de EE.UU. (USCIS) bajo la Ley de Inmigración y Nacionalidad.',
      completedNotice: 'Revisión y firma del formulario I-9 completada exitosamente. Este formulario ahora es legalmente vinculante.',
      instructions: 'Instrucciones Importantes',
      instructionsList: [
        'Revise toda la información cuidadosamente para verificar su precisión',
        'Asegúrese de que su firma digital coincida con su nombre legal',
        'Esta firma es legalmente vinculante bajo la ley federal',
        'Cualquier información falsa puede resultar en penalidades bajo 18 U.S.C. § 1546'
      ],
      missingData: 'Faltan Datos Requeridos',
      missingDataDesc: 'Por favor complete la Sección 1 del I-9 antes de proceder a la revisión y firma.',
      estimatedTime: 'Tiempo estimado: 5-7 minutos'
    }
  }

  const t = translations[language]

  // Check if required I-9 Section 1 data exists
  if (!section1Data) {
    return (
      <div className="space-y-6 pb-32">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-gray-600 max-w-3xl mx-auto">
            {t.description}
          </p>
        </div>

        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{t.missingData}:</strong> {t.missingDataDesc}
          </AlertDescription>
        </Alert>

        <div className="text-center text-sm text-gray-500">
          <p>{t.estimatedTime}</p>
        </div>
      </div>
    )
  }

  // Show signature capture if PDF has been reviewed
  if (showSignature) {
    return (
      <div className="space-y-6 pb-32">
        <div className="text-center mb-6">
          <Shield className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900">{t.signatureTitle}</h2>
          <p className="text-gray-600 mt-2">{t.signatureDescription}</p>
        </div>

        <DigitalSignatureCapture
          documentName="Form I-9 - Employment Eligibility Verification"
          signerName={`${section1Data?.employee_first_name} ${section1Data?.employee_last_name}`}
          signerTitle="Employee"
          acknowledgments={[
            "I attest, under penalty of perjury, that I have reviewed the information I provided in Section 1 of this form, and any applicable supplements, and that it is complete, true and correct.",
            "I understand that this form is required by federal law and that providing false information may result in penalties."
          ]}
          requireIdentityVerification={true}
          language={language}
          onSignatureComplete={handleComplete}
          onCancel={() => setShowSignature(false)}
        />
      </div>
    )
  }

  // Show PDF review if form data is complete
  if (showPDFReview) {
    return (
      <div className="space-y-6 pb-32">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Eye className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{t.reviewTitle}</h1>
          </div>
          <p className="text-gray-600 max-w-3xl mx-auto">
            {t.reviewDescription}
          </p>
        </div>

        <PDFDocumentViewer
          documentType="i9"
          employeeData={section1Data}
          propertyData={progress.stepData?.property}
          language={language}
          onSignatureRequired={() => setShowSignature(true)}
          onError={(error) => console.error('PDF display error:', error)}
          showActions={true}
          height="700px"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Step Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        </div>
        <p className="text-gray-600 max-w-3xl mx-auto">
          {t.description}
        </p>
      </div>

      {/* Federal Compliance Notice */}
      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>{t.federalRequirement}:</strong> {t.federalNotice}
        </AlertDescription>
      </Alert>

      {/* Progress Indicator */}
      {isComplete && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {t.completedNotice}
          </AlertDescription>
        </Alert>
      )}

      {/* Important Instructions */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            <span>{t.instructions}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-orange-800">
          <ul className="space-y-2 text-sm">
            {t.instructionsList.map((instruction, index) => (
              <li key={index}>• {instruction}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setShowPDFReview(true)} 
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Eye className="h-5 w-5" />
          <span>{t.viewPDFButton}</span>
        </button>
      </div>

      {/* I-9 Review and Sign Component */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>{t.subtitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <I9ReviewAndSign
            section1Data={section1Data}
            supplementAData={supplementAData}
            supplementBData={supplementBData}
            language={language}
            onComplete={handleComplete}
            onBack={handleBack}
          />
        </CardContent>
      </Card>

      {/* Completion Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">I-9 Review Requirements</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Review all I-9 information</span>
            <div className="flex items-center space-x-2">
              {isComplete ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
              )}
              <span className="text-sm font-medium">
                {isComplete ? 'Reviewed' : 'Required'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Digital signature certification</span>
            <div className="flex items-center space-x-2">
              {isComplete ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
              )}
              <span className="text-sm font-medium">
                {isComplete ? 'Signed' : 'Required'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Federal Notice */}
      <div className="text-xs text-gray-500 border-t pt-4">
        <p className="mb-2"><strong>Privacy Act Notice:</strong> The authority for collecting this information is the Immigration and Nationality Act.</p>
        <p>This signature is legally binding and subject to federal penalties for false statements.</p>
      </div>

      {/* Estimated Time */}
      <div className="text-center text-sm text-gray-500">
        <p>{t.estimatedTime}</p>
      </div>
    </div>
  )
}