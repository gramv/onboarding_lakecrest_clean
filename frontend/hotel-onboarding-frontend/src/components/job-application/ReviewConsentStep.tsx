import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { 
  FileText, 
  CheckCircle2,
  AlertTriangle
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
  
  // Function to get expected initials from user's name
  const getExpectedInitials = () => {
    const firstName = formData.first_name || ''
    const middleName = formData.middle_name || ''
    const lastName = formData.last_name || ''
    
    // Handle edge case where names might be empty
    if (!firstName || !lastName) {
      return ''
    }
    
    // Build initials based on whether middle name exists
    if (middleName && middleName.length > 0) {
      return `${firstName[0]}${middleName[0]}${lastName[0]}`.toUpperCase()
    } else {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
  }
  
  const expectedInitials = getExpectedInitials()
  
  // Separate states for typed and drawn signatures
  const [typedSignature, setTypedSignature] = useState(
    formData.signature && !formData.signature.startsWith('data:') ? formData.signature : ''
  )
  const [drawnSignature, setDrawnSignature] = useState(
    formData.signature && formData.signature.startsWith('data:') ? formData.signature : ''
  )
  const [signatureDate, setSignatureDate] = useState(formData.signature_date || new Date().toISOString().split('T')[0])
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false) // Track if user actually drew something
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
  }, [typedSignature, drawnSignature, signatureDate, initials])

  // Function to mark all required fields as touched
  const markAllFieldsTouched = () => {
    const requiredFields = [
      'initials_truthfulness',
      'initials_at_will', 
      'initials_screening',
      'signature',
      'drawn_signature',
      'signature_date'
    ]
    const touchedState: Record<string, boolean> = {}
    requiredFields.forEach(field => {
      touchedState[field] = true
    })
    setTouched(touchedState)
  }

  // Force validation when requested by parent
  useEffect(() => {
    if (externalErrors._forceValidation) {
      markAllFieldsTouched()
    }
  }, [externalErrors._forceValidation])

  const validateStep = () => {
    const errors: Record<string, string> = {}
    let isValid = true

    // Validate initials - must match expected initials
    if (!initials.truthfulness) {
      errors.initials_truthfulness = `Please enter your initials${expectedInitials ? ` (${expectedInitials})` : ''}`
      isValid = false
    } else if (expectedInitials && initials.truthfulness.toUpperCase() !== expectedInitials) {
      errors.initials_truthfulness = `Please enter your correct initials (${expectedInitials})`
      isValid = false
    }

    if (!initials.at_will) {
      errors.initials_at_will = `Please enter your initials${expectedInitials ? ` (${expectedInitials})` : ''}`
      isValid = false
    } else if (expectedInitials && initials.at_will.toUpperCase() !== expectedInitials) {
      errors.initials_at_will = `Please enter your correct initials (${expectedInitials})`
      isValid = false
    }

    if (!initials.screening) {
      errors.initials_screening = `Please enter your initials${expectedInitials ? ` (${expectedInitials})` : ''}`
      isValid = false
    } else if (expectedInitials && initials.screening.toUpperCase() !== expectedInitials) {
      errors.initials_screening = `Please enter your correct initials (${expectedInitials})`
      isValid = false
    }

    // Require BOTH typed name AND drawn signature
    if (!typedSignature || typedSignature.length < 3) {
      errors.signature = 'Please type your full name'
      isValid = false
    }
    
    if (!drawnSignature) {
      errors.drawn_signature = 'Please draw your signature'
      isValid = false
    }
    
    // Combine both for storage - store as JSON object
    const finalSignature = (typedSignature && drawnSignature) ? 
      JSON.stringify({ name: typedSignature, signature: drawnSignature }) : 
      ''

    if (!signatureDate) {
      errors.signature_date = t('jobApplication.steps.reviewConsent.signatureSection.dateError')
      isValid = false
    }

    setLocalErrors(errors)
    updateFormData({ 
      signature: finalSignature, 
      signature_date: signatureDate,
      initials_truthfulness: initials.truthfulness,
      initials_at_will: initials.at_will,
      initials_screening: initials.screening
    })
    onComplete(isValid)
  }

  const handleSignatureChange = (value: string) => {
    setTypedSignature(value)
    // Don't clear drawn signature - we want both!
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
    setDrawnSignature('')
    setHasDrawn(false)
    // Don't clear typed signature when clearing canvas
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    setHasDrawn(true) // Mark that user is drawing
    // Don't clear typed signature - we want both!
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
    if (isDrawing && canvasRef.current && hasDrawn) {
      setIsDrawing(false)
      // Only save canvas if user actually drew something
      const dataUrl = canvasRef.current.toDataURL()
      setDrawnSignature(dataUrl)
      setTouched(prev => ({ ...prev, drawn_signature: true }))
    } else {
      setIsDrawing(false)
    }
  }

  // Touch event handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // Prevent scrolling while drawing
    e.stopPropagation()
    setIsDrawing(true)
    setHasDrawn(true)
    
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const context = canvas.getContext('2d')
      if (context) {
        context.beginPath()
        context.moveTo(
          touch.clientX - rect.left,
          touch.clientY - rect.top
        )
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // Prevent scrolling while drawing
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const context = canvas.getContext('2d')
      if (context) {
        context.lineTo(
          touch.clientX - rect.left,
          touch.clientY - rect.top
        )
        context.stroke()
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    stopDrawing() // Reuse existing stopDrawing function
  }

  // Add a summary section showing what data will be submitted
  const getDataSummary = () => {
    const summary = []
    
    // Check personal info
    if (formData.first_name && formData.last_name) {
      summary.push(`Name: ${formData.first_name} ${formData.middle_name || ''} ${formData.last_name}`.trim())
    }
    if (formData.email) {
      summary.push(`Email: ${formData.email}`)
    }
    if (formData.phone) {
      summary.push(`Phone: ${formData.phone}`)
    }
    if (formData.position_applying_for || formData.position) {
      summary.push(`Position: ${formData.position_applying_for || formData.position}`)
    }
    if (formData.department) {
      summary.push(`Department: ${formData.department}`)
    }
    
    return summary
  }

  return (
    <div className="space-y-6">
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          {t('jobApplication.steps.reviewConsent.readInstructions')}
        </AlertDescription>
      </Alert>

      {/* Data Summary Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Application Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {getDataSummary().map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
          {expectedInitials && (
            <p className="text-sm text-blue-600 font-medium mt-2">
              Your initials: {expectedInitials}
            </p>
          )}
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
                      className={`w-24 h-14 text-center font-bold text-base ${
                        getError('initials_truthfulness') ? 'border-red-500' : ''
                      }`}
                      placeholder="Initials"
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
                      className={`w-24 h-14 text-center font-bold text-base ${
                        getError('initials_at_will') ? 'border-red-500' : ''
                      }`}
                      placeholder="Initials"
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
                      className={`w-24 h-14 text-center font-bold text-base ${
                        getError('initials_screening') ? 'border-red-500' : ''
                      }`}
                      placeholder="Initials"
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
                <div className="space-y-3">
                  {/* Step 1: Type your printed name */}
                  <div>
                    <Label className="text-sm font-medium">Printed Name *</Label>
                    <Input
                      id="signature"
                      type="text"
                      value={typedSignature}
                      onChange={(e) => handleSignatureChange(e.target.value)}
                      className={getError('signature') ? 'border-red-500 mt-1' : 'mt-1'}
                      placeholder="Type your full legal name"
                    />
                    {getError('signature') && (
                      <p className="text-sm text-red-600 mt-1">{getError('signature')}</p>
                    )}
                  </div>
                  
                  {/* Step 2: Draw your signature */}
                  <div>
                    <Label className="text-sm font-medium">Signature *</Label>
                    <div className="relative mt-1">
                      <canvas
                        ref={canvasRef}
                        width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 48, 400) : 400}
                        height={150}
                        className={`border rounded-md cursor-crosshair bg-white w-full ${getError('drawn_signature') ? 'border-red-500' : 'border-gray-300'}`}
                        style={{ 
                          maxWidth: '400px',
                          touchAction: 'none' // Disable browser touch gestures
                        }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                      />
                      {drawnSignature && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearSignature}
                          className="absolute top-1 right-1"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    {getError('drawn_signature') && (
                      <p className="text-sm text-red-600 mt-1">{getError('drawn_signature')}</p>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Please provide both your printed name and signature above
                  </p>
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