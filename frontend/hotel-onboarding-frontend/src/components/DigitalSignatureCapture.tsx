import React, { useRef, useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PenTool, RotateCcw, Check, Shield, Clock, User, FileText, AlertCircle, Info } from 'lucide-react'


export default function DigitalSignatureCapture({
  signatureType,
  documentName,
  signerName,
  signerTitle,
  acknowledgments,
  requireIdentityVerification = false,
  language,
  onSignatureComplete,
  onCancel,
  submitButtonText  // ✅ NEW: Custom button text prop
}) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureData, setSignatureData] = useState('')
  const [typedName, setTypedName] = useState(signerName)
  // Only draw method now, no type option
  const signatureMethod = 'draw'
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [identityVerified, setIdentityVerified] = useState(false)
  const [acknowledgementsChecked, setAcknowledgementsChecked] = useState(
    new Array(acknowledgments.length).fill(false)
  )
  const [ipAddress, setIpAddress] = useState('')
  const [canSign, setCanSign] = useState(false)
  const [auditTrail, setAuditTrail] = useState([])
  const [browserInfo, setBrowserInfo] = useState({})
  const [consentTimestamp, setConsentTimestamp] = useState('')

  const t = (key) => {
    const translations = {
      en: {
        'digital_signature': 'Digital Signature',
        'signature_required': 'Your signature is required to complete this document',
        'draw_signature': 'Draw Signature',
        'type_signature': 'Type Signature',
        'draw_instruction': 'Use your mouse or finger to draw your signature in the box below',
        'type_instruction': 'Type your full legal name as it appears on your identification',
        'clear': 'Clear',
        'your_name': 'Your Full Legal Name',
        'acknowledgments': 'Acknowledgments',
        'legal_notices': 'Legal Notices and Consents',
        'electronic_signature_consent': 'I consent to the use of electronic signatures and understand that they have the same legal effect as handwritten signatures.',
        'identity_verification': 'I verify that I am the person identified above and am authorized to sign this document.',
        'document_accuracy': 'I certify that all information provided in this document is true and accurate to the best of my knowledge.',
        'terms_conditions': 'I have read, understood, and agree to be bound by the terms and conditions of this agreement.',
        'sign_document': 'Sign Document',
        'cancel': 'Cancel',
        'signature_timestamp': 'Signature Timestamp',
        'signature_method': 'Signature Method: {method}',
        'ip_address': 'IP Address: {ip}',
        'legal_binding': 'This signature is legally binding',
        'esign_act_notice': 'Electronic Signature Act Notice: By signing electronically, you agree that your electronic signature has the same legal effect as a handwritten signature.',
        'document_retention': 'A copy of this signed document will be retained for legal and compliance purposes.',
        'signature_verification': 'Signature Verification',
        'all_acknowledgments_required': 'All acknowledgments must be checked to proceed.',
        'signature_required_error': 'A signature is required to complete this document.',
        'processing': 'Processing signature...',
        'metadata_captured': 'Compliance metadata captured',
        'audit_trail': 'Audit Trail',
        'compliance_status': 'Compliance Status: Active'
      },
      es: {
        'digital_signature': 'Firma Digital',
        'signature_required': 'Su firma es requerida para completar este documento',
        'draw_signature': 'Dibujar Firma',
        'type_signature': 'Escribir Firma',
        'draw_instruction': 'Use su mouse o dedo para dibujar su firma en el cuadro de abajo',
        'type_instruction': 'Escriba su nombre legal completo como aparece en su identificación',
        'clear': 'Limpiar',
        'your_name': 'Su Nombre Legal Completo',
        'acknowledgments': 'Reconocimientos',
        'legal_notices': 'Avisos Legales y Consentimientos',
        'sign_document': 'Firmar Documento',
        'cancel': 'Cancelar',
        'processing': 'Procesando firma...'
      }
    }
    return translations[language][key] || key
  }

  useEffect(() => {
    // Get user's IP address for audit trail
    fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('Unknown'))
    
    // Capture browser information for ESIGN Act compliance
    const capturedBrowserInfo = {
      platform: navigator.platform || 'Unknown',
      language: navigator.language || 'en-US',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      userAgent: navigator.userAgent
    }
    setBrowserInfo(capturedBrowserInfo)
    
    // Add initial audit trail entry
    addAuditTrailEntry('Signature capture initiated', 'User opened digital signature interface')
  }, [])

  // Initialize canvas with transparent background
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Ensure canvas starts with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        // Set compositing to ensure we don't add white background
        ctx.globalCompositeOperation = 'source-over'
      }
    }
  }, [])

  useEffect(() => {
    // Check if all requirements are met
    const allAcknowledgmentsChecked = acknowledgementsChecked.every(checked => checked)
    const hasSignature = signatureData.length > 0
    const identityOk = requireIdentityVerification ? identityVerified : true
    const canSignNow = allAcknowledgmentsChecked && hasSignature && termsAccepted && identityOk

    console.log('🔍 DigitalSignatureCapture - Can Sign Check:', {
      allAcknowledgmentsChecked,
      hasSignature,
      termsAccepted,
      identityOk,
      canSignNow,
      acknowledgementsChecked,
      signatureDataLength: signatureData.length
    })

    setCanSign(canSignNow)
  }, [acknowledgementsChecked, signatureData, typedName, termsAccepted, identityVerified, requireIdentityVerification, signatureMethod])

  const startDrawing = (e) => {
    if (!canvasRef.current) return
    
    setIsDrawing(true)
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      let x, y
      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left
        y = e.touches[0].clientY - rect.top
      } else {
        x = e.clientX - rect.left
        y = e.clientY - rect.top
      }
      
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      let x, y
      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left
        y = e.touches[0].clientY - rect.top
      } else {
        x = e.clientX - rect.left
        y = e.clientY - rect.top
      }
      
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    if (!isDrawing || !canvasRef.current) return

    setIsDrawing(false)
    const canvas = canvasRef.current

    // Ensure we get a PNG with transparent background (not white)
    const dataUrl = canvas.toDataURL('image/png')
    setSignatureData(dataUrl)
  }

  const clearSignature = () => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setSignatureData('')
    }
  }

  const generateTypedSignature = (name) => {
    // Create SVG signature for typed name
    const svg = `
      <svg width="300" height="80" xmlns="http://www.w3.org/2000/svg">
        <text x="10" y="50" font-family="Brush Script MT, cursive" font-size="24" fill="black">${name}</text>
      </svg>
    `
    return 'data:image/svg+xml;base64,' + btoa(svg)
  }

  const generateSignatureHash = (data) => {
    // Simple hash function for demo - in production use crypto.subtle.digest
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }
  
  const addAuditTrailEntry = (action, details) => {
    const entry = {
      action,
      timestamp: new Date().toISOString(),
      details
    }
    setAuditTrail(prev => [...prev, entry])
  }
  
  const handleSubmitSignature = async () => {
    // Record consent timestamp
    const currentConsentTimestamp = new Date().toISOString()
    setConsentTimestamp(currentConsentTimestamp)
    addAuditTrailEntry('Consent provided', 'User consented to electronic signature')
    
    const finalSignatureData = signatureData
    
    // Generate signature hash for integrity verification
    const signatureHash = generateSignatureHash(finalSignatureData + currentConsentTimestamp)
    
    addAuditTrailEntry('Signature captured', `Signature method: draw, Hash: ${signatureHash}`)

    const signatureDataToSubmit = {
      signatureType,
      signatureData: finalSignatureData,
      signedByName: signerName,
      signedByTitle: signerTitle,
      ipAddress,
      timestamp: new Date().toISOString(),
      documentName,
      acknowledgments,
      termsAccepted,
      identityVerified: requireIdentityVerification ? identityVerified : true,
      // ESIGN Act metadata
      userAgent: navigator.userAgent,
      browserInfo: {
        platform: browserInfo.platform,
        language: browserInfo.language,
        timezone: browserInfo.timezone,
        screenResolution: browserInfo.screenResolution
      },
      signatureMethod,
      signatureHash,
      consentTimestamp: currentConsentTimestamp,
      auditTrail: [...auditTrail, {
        action: 'Signature submitted',
        timestamp: new Date().toISOString(),
        details: 'Digital signature successfully captured and submitted'
      }]
    }

    onSignatureComplete(signatureDataToSubmit)
  }

  const handleAcknowledgmentChange = (index, checked) => {
    const newChecked = [...acknowledgementsChecked]
    newChecked[index] = checked
    setAcknowledgementsChecked(newChecked)
    
    addAuditTrailEntry(
      checked ? 'Acknowledgment checked' : 'Acknowledgment unchecked',
      `Item ${index + 1}: ${acknowledgments[index].substring(0, 50)}...`
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center px-4">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <PenTool className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t('digital_signature')}</h2>
        <p className="text-sm sm:text-base text-gray-600 mt-2">{t('signature_required')}</p>
        <Badge variant="outline" className="mt-2 text-xs sm:text-sm">
          <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          {t('legal_binding')}
        </Badge>
      </div>

      {/* Document Info */}
      <Card className="bg-blue-50">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-start sm:items-center space-x-3">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-blue-900 text-sm sm:text-base truncate">Document: {documentName}</p>
                <p className="text-xs sm:text-sm text-blue-700 truncate">Signer: {signerName}</p>
                {signerTitle && <p className="text-xs sm:text-sm text-blue-700 truncate">Title: {signerTitle}</p>}
              </div>
            </div>
            <div className="text-left sm:text-right text-xs sm:text-sm text-blue-700 space-y-1">
              <div className="flex items-center">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                <span className="truncate">{new Date().toLocaleString()}</span>
              </div>
              {ipAddress && <div className="truncate">{t('ip_address').replace('{ip}', ipAddress)}</div>}
              {browserInfo.platform && <div className="text-xs truncate">Platform: {browserInfo.platform}</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgments */}
      {acknowledgments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('acknowledgments')}</CardTitle>
            <CardDescription>
              Please read and acknowledge each item below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {acknowledgments.map((acknowledgment, index) => (
              <div key={index} className="flex items-start space-x-3">
                <Checkbox
                  id={`ack-${index}`}
                  checked={acknowledgementsChecked[index]}
                  onCheckedChange={(checked) => handleAcknowledgmentChange(index, !!checked)}
                  className="mt-1"
                />
                <Label htmlFor={`ack-${index}`} className="text-sm leading-relaxed">
                  {acknowledgment}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Legal Notices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('legal_notices')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="esign-consent"
              checked={termsAccepted}
              onCheckedChange={(checked) => {
                setTermsAccepted(!!checked)
                if (checked) {
                  addAuditTrailEntry('ESIGN consent provided', 'User agreed to electronic signature terms')
                }
              }}
            />
            <Label htmlFor="esign-consent" className="text-sm leading-relaxed">
              {t('electronic_signature_consent')}
            </Label>
          </div>

          {requireIdentityVerification && (
            <div className="flex items-start space-x-3">
              <Checkbox
                id="identity-verify"
                checked={identityVerified}
                onCheckedChange={(checked) => setIdentityVerified(!!checked)}
              />
              <Label htmlFor="identity-verify" className="text-sm leading-relaxed">
                {t('identity_verification')}
              </Label>
            </div>
          )}

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <div className="space-y-2">
                <p>{t('esign_act_notice')}</p>
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                  <p className="font-semibold mb-1">ESIGN Act Compliance Metadata:</p>
                  <ul className="space-y-1">
                    <li>• IP Address: {ipAddress || 'Capturing...'}</li>
                    <li>• Browser: {browserInfo.userAgent ? browserInfo.userAgent.split(' ')[0] : 'Unknown'}</li>
                    <li>• Timezone: {browserInfo.timezone || 'Unknown'}</li>
                    <li>• Language: {browserInfo.language || 'Unknown'}</li>
                    <li>• Device: {browserInfo.platform || 'Unknown'}</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Signature Capture */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">{t('signature_verification')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">{t('draw_instruction')}</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 sm:p-4 bg-white">
              <canvas
                ref={canvasRef}
                width={800}
                height={300}
                className="w-full h-40 sm:h-48 md:h-52 border border-gray-200 rounded cursor-crosshair touch-none"
                style={{ touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <div className="flex justify-between items-center mt-2 sm:mt-3">
                <p className="text-xs text-gray-500">{language === 'es' ? 'Firme arriba' : 'Sign above'}</p>
                <Button variant="outline" size="sm" onClick={clearSignature} className="min-h-[44px]">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('clear')}
                </Button>
              </div>
            </div>

            {/* Electronic Signature Legal Notice */}
            <div className="mt-3 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs sm:text-sm text-blue-800 flex items-start leading-relaxed">
                <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 mt-0.5 flex-shrink-0" />
                {language === 'es'
                  ? 'Las firmas electrónicas tienen el mismo nivel de autenticidad y validez legal que las firmas físicas según la Ley ESIGN y UETA.'
                  : 'Electronic signatures have the same level of authenticity and legal validity as physical signatures under the ESIGN Act and UETA.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Footer */}
      <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-600 space-y-2">
        <div className="flex items-center">
          <Shield className="h-4 w-4 mr-2" />
          <span>{t('document_retention')}</span>
        </div>
        <p>
          Signature Method: Hand-drawn
        </p>
        <p>Timestamp: {new Date().toLocaleString()}</p>
        {ipAddress && <p>IP Address: {ipAddress}</p>}
      </div>

      {/* Validation Messages */}
      {!canSign && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {acknowledgementsChecked.some(checked => !checked) && (
              <div>{t('all_acknowledgments_required')}</div>
            )}
            {!signatureData && (
              <div>{t('signature_required_error')}</div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0 pt-6">
        <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto min-h-[48px]">
          {t('cancel')}
        </Button>

        <Button
          onClick={handleSubmitSignature}
          disabled={!canSign}
          size="lg"
          className="w-full sm:w-auto min-h-[48px] px-8"
        >
          <Check className="h-5 w-5 mr-2" />
          {submitButtonText || t('sign_document')}
        </Button>
      </div>
    </div>
  )
}