import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { 
  FileText, 
  CheckCircle2
} from 'lucide-react'

interface ReviewConsentStepProps {
  formData: any
  updateFormData: (data: any) => void
  validationErrors: Record<string, string>
  onComplete: (isComplete: boolean) => void
}

export default function ReviewConsentStep({
  formData,
  updateFormData,
  validationErrors: externalErrors,
  onComplete
}: ReviewConsentStepProps) {
  const { t } = useTranslation()
  const [signature, setSignature] = useState(formData.signature || '')
  const [signatureDate, setSignatureDate] = useState(formData.signature_date || new Date().toISOString().split('T')[0])
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [initials, setInitials] = useState({
    truthfulness: formData.initials_truthfulness || '',
    at_will: formData.initials_at_will || '',
    screening: formData.initials_screening || ''
  })

  useEffect(() => {
    validateStep()
  }, [signature, signatureDate, initials])

  const validateStep = () => {
    const errors: Record<string, string> = {}
    let isValid = true

    // Validate initials
    if (!initials.truthfulness || initials.truthfulness.length < 2) {
      errors.initials_truthfulness = t('jobApplication.steps.reviewConsent.signatureSection.initialError', { statement: 'first' })
      isValid = false
    }

    if (!initials.at_will || initials.at_will.length < 2) {
      errors.initials_at_will = t('jobApplication.steps.reviewConsent.signatureSection.initialError', { statement: 'second' })
      isValid = false
    }

    if (!initials.screening || initials.screening.length < 2) {
      errors.initials_screening = t('jobApplication.steps.reviewConsent.signatureSection.initialError', { statement: 'third' })
      isValid = false
    }

    if (!signature || signature.length < 3) {
      errors.signature = t('jobApplication.steps.reviewConsent.signatureSection.signatureError')
      isValid = false
    }

    if (!signatureDate) {
      errors.signature_date = t('jobApplication.steps.reviewConsent.signatureSection.dateError')
      isValid = false
    }

    setLocalErrors(errors)
    updateFormData({ 
      signature, 
      signature_date: signatureDate,
      initials_truthfulness: initials.truthfulness,
      initials_at_will: initials.at_will,
      initials_screening: initials.screening
    })
    onComplete(isValid)
  }

  const handleSignatureChange = (value: string) => {
    setSignature(value)
    setTouched(prev => ({ ...prev, signature: true }))
  }

  const handleDateChange = (value: string) => {
    setSignatureDate(value)
    setTouched(prev => ({ ...prev, signature_date: true }))
  }

  const handleInitialsChange = (field: keyof typeof initials, value: string) => {
    // Limit to 4 characters and convert to uppercase
    const formattedValue = value.toUpperCase().slice(0, 4)
    setInitials(prev => ({ ...prev, [field]: formattedValue }))
    setTouched(prev => ({ ...prev, [`initials_${field}`]: true }))
  }

  const getError = (field: string) => {
    return touched[field] ? (localErrors[field] || externalErrors[field]) : ''
  }

  const clearSignature = () => {
    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      if (context) {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
    setSignature('')
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const context = canvas.getContext('2d')
      if (context) {
        context.beginPath()
        context.moveTo(e.clientX - rect.left, e.clientY - rect.top)
      }
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const context = canvas.getContext('2d')
      if (context) {
        context.lineTo(e.clientX - rect.left, e.clientY - rect.top)
        context.stroke()
      }
    }
  }

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false)
      // Convert canvas to base64 string
      const dataUrl = canvasRef.current.toDataURL()
      setSignature(dataUrl)
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          {t('jobApplication.steps.reviewConsent.readInstructions')}
        </AlertDescription>
      </Alert>

      {/* Consent Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            {t('jobApplication.steps.reviewConsent.applicantCertification')}
          </CardTitle>
          <p className="text-sm font-semibold mt-2">
            {t('jobApplication.steps.reviewConsent.readAndInitial')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {/* First certification with initial box */}
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <Input
                      type="text"
                      value={initials.truthfulness}
                      onChange={(e) => handleInitialsChange('truthfulness', e.target.value)}
                      className={`w-16 h-10 text-center font-bold text-sm ${
                        getError('initials_truthfulness') ? 'border-red-500' : ''
                      }`}
                      placeholder={t('jobApplication.steps.reviewConsent.placeholders.initial')}
                      maxLength={4}
                    />
                    {getError('initials_truthfulness') && (
                      <p className="text-xs text-red-600 mt-1 absolute whitespace-nowrap">
                        {getError('initials_truthfulness')}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed">
                  <span dangerouslySetInnerHTML={{ __html: t('jobApplication.steps.reviewConsent.certification1', { propertyName: formData.property_name || 'this hotel' }) }} />
                </p>
              </div>
            </div>

            {/* Second certification with initial box */}
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <Input
                      type="text"
                      value={initials.at_will}
                      onChange={(e) => handleInitialsChange('at_will', e.target.value)}
                      className={`w-16 h-10 text-center font-bold text-sm ${
                        getError('initials_at_will') ? 'border-red-500' : ''
                      }`}
                      placeholder={t('jobApplication.steps.reviewConsent.placeholders.initial')}
                      maxLength={4}
                    />
                    {getError('initials_at_will') && (
                      <p className="text-xs text-red-600 mt-1 absolute whitespace-nowrap">
                        {getError('initials_at_will')}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed">
                  {t('jobApplication.steps.reviewConsent.certification2')}
                </p>
              </div>
            </div>

            {/* Third certification with initial box */}
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <Input
                      type="text"
                      value={initials.screening}
                      onChange={(e) => handleInitialsChange('screening', e.target.value)}
                      className={`w-16 h-10 text-center font-bold text-sm ${
                        getError('initials_screening') ? 'border-red-500' : ''
                      }`}
                      placeholder={t('jobApplication.steps.reviewConsent.placeholders.initial')}
                      maxLength={4}
                    />
                    {getError('initials_screening') && (
                      <p className="text-xs text-red-600 mt-1 absolute whitespace-nowrap">
                        {getError('initials_screening')}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed">
                  {t('jobApplication.steps.reviewConsent.certification3')}
                </p>
              </div>
            </div>
          </div>

          {/* Signature Section */}
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signature">{t('jobApplication.steps.reviewConsent.signatureSection.applicantSignature')} *</Label>
                <div className="space-y-2">
                  {/* Option 1: Type signature */}
                  <Input
                    id="signature"
                    type="text"
                    value={typeof signature === 'string' && !signature.startsWith('data:') ? signature : ''}
                    onChange={(e) => handleSignatureChange(e.target.value)}
                    className={getError('signature') ? 'border-red-500' : ''}
                    placeholder={t('jobApplication.steps.reviewConsent.placeholders.typeFullName')}
                  />
                  
                  {/* Option 2: Draw signature */}
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={300}
                      height={100}
                      className="border border-gray-300 rounded-md cursor-crosshair bg-white"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                    {signature.startsWith('data:') && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearSignature}
                        className="absolute top-1 right-1"
                      >
                        {t('jobApplication.steps.reviewConsent.clear')}
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    {t('jobApplication.steps.reviewConsent.signatureSection.typeOrDraw')}
                  </p>
                  {getError('signature') && (
                    <p className="text-sm text-red-600">{getError('signature')}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signature_date">{t('jobApplication.steps.reviewConsent.signatureSection.date')} *</Label>
                <Input
                  id="signature_date"
                  type="date"
                  value={signatureDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={getError('signature_date') ? 'border-red-500' : ''}
                  max={new Date().toISOString().split('T')[0]}
                />
                {getError('signature_date') && (
                  <p className="text-sm text-red-600">{getError('signature_date')}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
        <p className="text-sm text-gray-800 font-medium text-center">
          {t('jobApplication.steps.reviewConsent.signatureSection.instruction')}
        </p>
      </div>
    </div>
  )
}