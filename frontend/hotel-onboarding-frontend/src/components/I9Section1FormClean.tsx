import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MobileInput,
  MobileLabel,
  MobileRadioGroup,
  MobileSelect
} from '@/components/job-application/mobile-optimized'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronRight, ChevronLeft, FileText, Eye, Check, Pen } from 'lucide-react'
import { format } from 'date-fns'
import ReviewAndSign from './ReviewAndSign'
import PDFViewerWithControls from './PDFViewerWithControls'
import DigitalSignatureCapture from './DigitalSignatureCapture'
import axios from 'axios'
import { generateMappedI9Pdf } from '@/utils/i9PdfGeneratorMapped'

interface I9Section1FormCleanProps {
  onComplete: (data: any) => void
  initialData?: any
  language?: 'en' | 'es'
  onValidationChange?: (isValid: boolean) => void
  employeeId?: string
  showPreview?: boolean  // Control whether to show internal preview
}

interface FormData {
  // Personal Information
  last_name: string
  first_name: string
  middle_initial: string
  other_names: string
  
  // Address
  address: string
  apt_number: string
  city: string
  state: string
  zip_code: string
  
  // Personal Details
  date_of_birth: string
  ssn: string
  email: string
  phone: string
  
  // Citizenship Status
  citizenship_status: string
  
  // Additional fields for non-citizens
  alien_registration_number: string
  i94_admission_number: string
  foreign_passport_number: string
  country_of_issuance: string
  expiration_date: string
}

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function I9Section1FormClean({
  onComplete,
  initialData = {},
  language = 'en',
  onValidationChange,
  employeeId,
  showPreview = true
}: I9Section1FormCleanProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    last_name: initialData.last_name || '',
    first_name: initialData.first_name || '',
    middle_initial: initialData.middle_initial || '',
    other_names: initialData.other_names || '',
    address: initialData.address || '',
    apt_number: initialData.apt_number || '',
    city: initialData.city || '',
    state: initialData.state || '',
    zip_code: initialData.zip_code || '',
    date_of_birth: initialData.date_of_birth || '',
    ssn: initialData.ssn || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    citizenship_status: initialData.citizenship_status || '',
    alien_registration_number: initialData.alien_registration_number || '',
    i94_admission_number: initialData.i94_admission_number || '',
    foreign_passport_number: initialData.foreign_passport_number || '',
    country_of_issuance: initialData.country_of_issuance || '',
    expiration_date: initialData.expiration_date || ''
  })
  
  // Update form data when initialData changes - with deep comparison to preserve state
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log('I9Section1FormClean: Received initialData update:', {
        citizenship_status: initialData.citizenship_status,
        keys: Object.keys(initialData)
      })
      
      setFormData(prev => {
        const newData = {
          last_name: initialData.last_name || prev.last_name || '',
          first_name: initialData.first_name || prev.first_name || '',
          middle_initial: initialData.middle_initial || prev.middle_initial || '',
          other_names: initialData.other_names || prev.other_names || '',
          address: initialData.address || prev.address || '',
          apt_number: initialData.apt_number || prev.apt_number || '',
          city: initialData.city || prev.city || '',
          state: initialData.state || prev.state || '',
          zip_code: initialData.zip_code || prev.zip_code || '',
          date_of_birth: initialData.date_of_birth || prev.date_of_birth || '',
          ssn: initialData.ssn || prev.ssn || '',
          email: initialData.email || prev.email || '',
          phone: initialData.phone || prev.phone || '',
          citizenship_status: initialData.citizenship_status || prev.citizenship_status || '',
          alien_registration_number: initialData.alien_registration_number || prev.alien_registration_number || '',
          i94_admission_number: initialData.i94_admission_number || prev.i94_admission_number || '',
          foreign_passport_number: initialData.foreign_passport_number || prev.foreign_passport_number || '',
          country_of_issuance: initialData.country_of_issuance || prev.country_of_issuance || '',
          expiration_date: initialData.expiration_date || prev.expiration_date || ''
        }
        
        console.log('I9Section1FormClean: Updated form data:', {
          citizenship_status: newData.citizenship_status,
          previous: prev.citizenship_status
        })
        
        return newData
      })
    }
  }, [initialData])

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Debug logging for citizenship status
  useEffect(() => {
    console.log('I9Section1FormClean - citizenship_status state:', {
      current: formData.citizenship_status,
      initial: initialData?.citizenship_status,
      isEmpty: !formData.citizenship_status
    })
  }, [formData.citizenship_status, initialData?.citizenship_status])

  const steps = [
    {
      title: 'Personal Information',
      fields: ['last_name', 'first_name', 'middle_initial', 'other_names']
    },
    {
      title: 'Address',
      fields: ['address', 'apt_number', 'city', 'state', 'zip_code']
    },
    {
      title: 'Contact & Details',
      fields: ['date_of_birth', 'ssn', 'email', 'phone']
    },
    {
      title: 'Citizenship Status',
      fields: ['citizenship_status', 'alien_registration_number', 'foreign_passport_number', 'country_of_issuance', 'expiration_date']
    }
  ]

  const handleInputChange = (field: keyof FormData, value: string) => {
    console.log(`I9Section1FormClean: Field ${field} changed to:`, value)
    
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      console.log('I9Section1FormClean: New form data state:', {
        field,
        value,
        citizenship_status: newData.citizenship_status
      })
      return newData
    })
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    
    // Immediately call onValidationChange if available to notify parent
    if (onValidationChange) {
      const newErrors = { ...errors }
      delete newErrors[field]
      onValidationChange(Object.keys(newErrors).length === 0)
    }
  }

  const formatUSCISNumber = (value: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    
    // If it doesn't start with 'A', add it
    let formatted = cleaned
    if (cleaned.length > 0 && !cleaned.startsWith('A')) {
      formatted = 'A' + cleaned
    }
    
    // Limit to A + 9 digits
    const match = formatted.match(/^(A)(\d{0,9})/)
    if (match) {
      const prefix = match[1]
      const numbers = match[2]
      return prefix + '-' + numbers
    }
    
    return formatted.slice(0, 1) // Just return 'A' if no match
  }

  const formatSSN = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 9)}`
  }
  
  const isInvalidSSN = (ssn: string): boolean => {
    // Check for invalid SSN patterns per SSA rules
    const firstThree = ssn.substring(0, 3)
    const middleTwo = ssn.substring(3, 5)
    const lastFour = ssn.substring(5, 9)
    
    // SSNs with first 3 digits as 000, 666, or 900-999 are invalid
    if (firstThree === '000' || firstThree === '666' || (parseInt(firstThree) >= 900 && parseInt(firstThree) <= 999)) {
      return true
    }
    
    // SSNs with middle 2 digits as 00 are invalid
    if (middleTwo === '00') {
      return true
    }
    
    // SSNs with last 4 digits as 0000 are invalid
    if (lastFour === '0000') {
      return true
    }
    
    return false
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }
  
  const isValidPhoneNumber = (phone: string): boolean => {
    // Check for invalid phone patterns
    const areaCode = phone.substring(0, 3)
    const exchange = phone.substring(3, 6)
    
    // Area codes cannot start with 0 or 1
    if (areaCode[0] === '0' || areaCode[0] === '1') {
      return false
    }
    
    // Exchange codes cannot start with 0 or 1
    if (exchange[0] === '0' || exchange[0] === '1') {
      return false
    }
    
    // 555-01XX numbers are reserved for fictional use
    if (areaCode === '555' && exchange === '01') {
      return false
    }
    
    return true
  }

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {}
    const step = steps[stepIndex]

    step.fields.forEach(field => {
      switch (field) {
        case 'last_name':
          if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
          break
        case 'first_name':
          if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
          break
        case 'address':
          if (!formData.address.trim()) newErrors.address = 'Street address is required'
          break
        case 'city':
          if (!formData.city.trim()) newErrors.city = 'City is required'
          break
        case 'state':
          if (!formData.state) newErrors.state = 'State is required'
          break
        case 'zip_code':
          if (!formData.zip_code.trim()) newErrors.zip_code = 'ZIP code is required'
          else if (!/^\d{5}(-\d{4})?$/.test(formData.zip_code)) newErrors.zip_code = 'Invalid ZIP code format'
          break
        case 'date_of_birth':
          if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required'
          break
        case 'ssn':
          if (!formData.ssn.trim()) {
            newErrors.ssn = 'SSN is required'
          } else {
            const ssnDigits = formData.ssn.replace(/\D/g, '')
            if (ssnDigits.length !== 9) {
              newErrors.ssn = 'SSN must be 9 digits'
            }
          }
          break
        case 'email':
          if (!formData.email.trim()) newErrors.email = 'Email is required'
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format'
          break
        case 'phone':
          if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required'
          } else {
            const phoneDigits = formData.phone.replace(/\D/g, '')
            if (phoneDigits.length !== 10) {
              newErrors.phone = 'Phone must be 10 digits'
            } else if (!isValidPhoneNumber(phoneDigits)) {
              newErrors.phone = 'Invalid phone number'
            }
          }
          break
        case 'citizenship_status':
          if (!formData.citizenship_status) newErrors.citizenship_status = 'Please select your citizenship status'
          break
      }
    })

    // Additional validation for non-citizens
    if (stepIndex === 3) {
      if (formData.citizenship_status === 'permanent_resident') {
        if (!formData.alien_registration_number.trim()) {
          newErrors.alien_registration_number = 'USCIS Number is required'
        } else {
          // Validate USCIS number format (A-XXXXXXXXX)
          const uscisRegex = /^A-\d{9}$/
          if (!uscisRegex.test(formData.alien_registration_number)) {
            newErrors.alien_registration_number = 'USCIS Number must be in format A-XXXXXXXXX (9 digits)'
          }
        }
        if (!formData.expiration_date) {
          newErrors.expiration_date = 'Card expiration date is required'
        } else {
          // Check if expiration date is in the future
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const expDate = new Date(formData.expiration_date)
          if (expDate <= today) {
            newErrors.expiration_date = 'Card expiration date must be in the future'
          }
        }
      } else if (formData.citizenship_status === 'authorized_alien') {
        // Check that at least ONE of the three options is provided
        const hasUSCIS = formData.alien_registration_number.trim().length > 0
        const hasI94 = (formData.i94_admission_number || '').trim().length > 0
        const hasPassport = formData.foreign_passport_number.trim().length > 0 && formData.country_of_issuance.trim().length > 0

        if (!hasUSCIS && !hasI94 && !hasPassport) {
          newErrors.authorized_alien_docs = 'Please provide at least ONE of the following: USCIS Number, Form I-94 Admission Number, or Foreign Passport Number with Country of Issuance'
        }

        // If passport is partially filled, require both fields
        if ((formData.foreign_passport_number.trim().length > 0 || formData.country_of_issuance.trim().length > 0) && !hasPassport) {
          if (!formData.foreign_passport_number.trim()) {
            newErrors.foreign_passport_number = 'Passport number is required when country is provided'
          }
          if (!formData.country_of_issuance.trim()) {
            newErrors.country_of_issuance = 'Country is required when passport number is provided'
          }
        }

        if (!formData.expiration_date) {
          newErrors.expiration_date = 'Work authorization expiration date is required'
        } else {
          // Check if expiration date is in the future
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const expDate = new Date(formData.expiration_date)
          if (expDate <= today) {
            newErrors.expiration_date = 'Work authorization expiration date must be in the future'
          }
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    console.log('I9Section1FormClean: handleNext called, current formData:', {
      citizenship_status: formData.citizenship_status,
      step: currentStep
    })
    
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        // All steps complete - pass the complete form data
        console.log('I9Section1FormClean: Completing form with data:', formData)
        
        if (showPreview) {
          // Show internal preview
          generatePdfPreview()
        } else {
          // Pass data to parent without preview - ensure we pass the complete formData
          onComplete({ ...formData })
        }
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const generatePdfPreview = async () => {
    setIsGeneratingPdf(true)
    try {
      // Generate PDF client-side using official I-9 form
      const pdfBytes = await generateMappedI9Pdf(formData)
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(pdfBlob)
      setPdfUrl(url)
      
      // Save to backend only if real employee ID (not demo or test)
      if (employeeId && !employeeId.startsWith('test-') && !employeeId.startsWith('demo-')) {
        try {
          await axios.post(`/api/onboarding/${employeeId}/i9-section1`, {
            formData,
            signed: false
          })
        } catch (error) {
          console.error('Error saving to backend:', error)
        }
      }
      
      // Always show review
      setShowReview(true)
    } catch (error) {
      console.error('Error generating PDF:', error)
      // Continue to review even if PDF generation fails
      setShowReview(true)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const base64ToBlob = (base64: string, contentType: string): Blob => {
    const byteCharacters = atob(base64)
    const byteArrays = []
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512)
      const byteNumbers = new Array(slice.length)
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i)
      }
      
      const byteArray = new Uint8Array(byteNumbers)
      byteArrays.push(byteArray)
    }
    
    return new Blob(byteArrays, { type: contentType })
  }

  const handleSign = async (signatureData: any) => {
    console.log('I9Section1FormClean: handleSign called with formData:', {
      citizenship_status: formData.citizenship_status,
      hasSignature: !!signatureData
    })
    
    try {
      if (employeeId && !employeeId.startsWith('test-') && !employeeId.startsWith('demo-')) {
        // Only save to backend for real employee IDs (not demo or test)
        await axios.post(`/api/onboarding/${employeeId}/i9-section1`, {
          formData,
          signed: true,
          signatureData: signatureData.signature,
          completedAt: new Date().toISOString()
        })
      }
      
      const completeData = {
        ...formData,
        signature: signatureData,
        completedAt: new Date().toISOString()
      }
      
      console.log('I9Section1FormClean: Completing with signed data:', {
        citizenship_status: completeData.citizenship_status
      })
      
      onComplete(completeData)
    } catch (error) {
      console.error('Error saving signed form:', error)
      // Still complete even if save fails
      const completeData = {
        ...formData,
        signature: signatureData,
        completedAt: new Date().toISOString()
      }
      onComplete(completeData)
    }
  }

  // Show review and sign view
  if (showReview) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Review Form I-9 Section 1</CardTitle>
            <p className="text-sm text-gray-600">
              Please review the information you provided before signing
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PDF Preview */}
            <PDFViewerWithControls 
              pdfUrl={pdfUrl} 
              title="Form I-9 Section 1 - Employment Eligibility Verification"
              initialZoom={100}
            />
            
            {/* Federal Compliance Notice */}
            <Alert>
              <AlertDescription>
                <strong>By signing below, you attest under penalty of perjury that:</strong>
                <ul className="list-disc list-inside mt-2">
                  <li>The information you have provided is true and correct</li>
                  <li>You are aware that federal law provides for imprisonment and/or fines for false statements</li>
                  <li>You are the individual who completed Section 1 of this form</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            {/* Signature Capture */}
            <DigitalSignatureCapture
              documentName="Form I-9 Section 1 - Employment Eligibility Verification"
              signerName={`${formData.first_name} ${formData.last_name}`}
              signerTitle="Employee"
              acknowledgments={[
                "I attest, under penalty of perjury, that I am (check one of the following boxes)",
                "The information I have provided is true and correct"
              ]}
              requireIdentityVerification={true}
              language={language}
              onSignatureComplete={(signatureData) => {
                handleSign({ signature: signatureData.signatureData })
              }}
              onCancel={() => {
                setShowReview(false)
                setCurrentStep(steps.length - 1)
              }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }


  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="sr-only">Form I-9, Section 1</CardTitle>
          <p className="sr-only text-sm text-gray-600">Employment Eligibility Verification</p>
          
          {/* Progress bar */}
          <div className="mt-[clamp(1rem,3vw,1.5rem)]">
            <div className="flex justify-between text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600 mb-[clamp(0.5rem,2vw,0.75rem)] gap-2 flex-wrap">
              <span className="font-medium">{steps[currentStep].title}</span>
              <span className="text-gray-500">Step {currentStep + 1} of {steps.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-[clamp(0.5rem,1.5vw,0.625rem)]">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Personal Information */}
          {currentStep === 0 && (
            <div className="space-y-[clamp(1rem,3vw,1.5rem)]">
              <h3 className="text-[clamp(1rem,3vw,1.125rem)] font-semibold">Personal Information</h3>
              <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600">Enter your legal name as it appears on your identification documents</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(1rem,3vw,1.5rem)]">
                <div>
                  <MobileLabel htmlFor="last_name">Last Name *</MobileLabel>
                  <MobileInput
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className={errors.last_name ? 'border-red-500' : ''}
                    type="text"
                    inputMode="text"
                  />
                  {errors.last_name && (
                    <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.last_name}</p>
                  )}
                </div>

                <div>
                  <MobileLabel htmlFor="first_name">First Name *</MobileLabel>
                  <MobileInput
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className={errors.first_name ? 'border-red-500' : ''}
                    type="text"
                    inputMode="text"
                  />
                  {errors.first_name && (
                    <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.first_name}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(1rem,3vw,1.5rem)]">
                <div>
                  <MobileLabel htmlFor="middle_initial">Middle Initial</MobileLabel>
                  <MobileInput
                    id="middle_initial"
                    value={formData.middle_initial}
                    onChange={(e) => handleInputChange('middle_initial', e.target.value.slice(0, 1).toUpperCase())}
                    maxLength={1}
                    type="text"
                    inputMode="text"
                  />
                </div>

                <div>
                  <MobileLabel htmlFor="other_names">Other Last Names Used</MobileLabel>
                  <MobileInput
                    id="other_names"
                    value={formData.other_names}
                    onChange={(e) => handleInputChange('other_names', e.target.value)}
                    placeholder="Maiden name, aliases, etc."
                    type="text"
                    inputMode="text"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address */}
          {currentStep === 1 && (
            <div className="space-y-[clamp(1rem,3vw,1.5rem)]">
              <h3 className="text-[clamp(1rem,3vw,1.125rem)] font-semibold">Address Information</h3>
              <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600">Provide your current residential address</p>

              <div>
                <MobileLabel htmlFor="address">Street Address *</MobileLabel>
                <MobileInput
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={errors.address ? 'border-red-500' : ''}
                  placeholder="123 Main Street"
                  type="text"
                  inputMode="text"
                />
                {errors.address && (
                  <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-[clamp(1rem,3vw,1.5rem)]">
                <div className="sm:col-span-1">
                  <MobileLabel htmlFor="apt_number">Apt #</MobileLabel>
                  <MobileInput
                    id="apt_number"
                    value={formData.apt_number}
                    onChange={(e) => handleInputChange('apt_number', e.target.value)}
                    placeholder="Optional"
                    type="text"
                    inputMode="text"
                  />
                </div>

                <div className="sm:col-span-3">
                  <MobileLabel htmlFor="city">City *</MobileLabel>
                  <MobileInput
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={errors.city ? 'border-red-500' : ''}
                    type="text"
                    inputMode="text"
                  />
                  {errors.city && (
                    <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.city}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(1rem,3vw,1.5rem)]">
                <div>
                  <MobileLabel htmlFor="state">State *</MobileLabel>
                  <MobileSelect
                    value={formData.state}
                    onValueChange={(value) => handleInputChange('state', value)}
                    options={STATES.map(state => ({ value: state, label: state }))}
                    placeholder="Select State"
                    className={errors.state ? 'border-red-500' : ''}
                  />
                  {errors.state && (
                    <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.state}</p>
                  )}
                </div>

                <div>
                  <MobileLabel htmlFor="zip_code">ZIP Code *</MobileLabel>
                  <MobileInput
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => handleInputChange('zip_code', e.target.value)}
                    className={errors.zip_code ? 'border-red-500' : ''}
                    placeholder="12345"
                    type="text"
                    inputMode="numeric"
                  />
                  {errors.zip_code && (
                    <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.zip_code}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contact & Details */}
          {currentStep === 2 && (
            <div className="space-y-[clamp(1rem,3vw,1.5rem)]">
              <h3 className="text-[clamp(1rem,3vw,1.125rem)] font-semibold">Contact Information & Personal Details</h3>
              <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600">Provide your contact information and personal details</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(1rem,3vw,1.5rem)]">
                <div>
                  <MobileLabel htmlFor="date_of_birth">Date of Birth *</MobileLabel>
                  <MobileInput
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    className={errors.date_of_birth ? 'border-red-500' : ''}
                  />
                  {errors.date_of_birth && (
                    <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.date_of_birth}</p>
                  )}
                </div>

                <div>
                  <MobileLabel htmlFor="ssn">Social Security Number *</MobileLabel>
                  <MobileInput
                    id="ssn"
                    value={formData.ssn}
                    onChange={(e) => {
                      const formatted = formatSSN(e.target.value)
                      handleInputChange('ssn', formatted)
                    }}
                    className={errors.ssn ? 'border-red-500' : ''}
                    placeholder="123-45-6789"
                    maxLength={11}
                    type="text"
                    inputMode="numeric"
                  />
                  {errors.ssn && (
                    <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.ssn}</p>
                  )}
                </div>
              </div>

              <div>
                <MobileLabel htmlFor="email">Email Address *</MobileLabel>
                <MobileInput
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                  placeholder="your.email@example.com"
                  inputMode="email"
                />
                {errors.email && (
                  <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <MobileLabel htmlFor="phone">Phone Number *</MobileLabel>
                <MobileInput
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value)
                    handleInputChange('phone', formatted)
                  }}
                  className={errors.phone ? 'border-red-500' : ''}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                  type="tel"
                  inputMode="tel"
                />
                {errors.phone && (
                  <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Citizenship Status */}
          {currentStep === 3 && (
            <div className="space-y-[clamp(1rem,3vw,1.5rem)]">
              <h3 className="text-[clamp(1rem,3vw,1.125rem)] font-semibold">Citizenship Status</h3>
              <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600">Select your citizenship or immigration status</p>

              <div>
                <MobileLabel>I attest, under penalty of perjury, that I am: *</MobileLabel>
                <MobileRadioGroup
                  value={formData.citizenship_status}
                  onValueChange={(value) => {
                    console.log('RadioGroup citizenship_status onValueChange:', value)
                    handleInputChange('citizenship_status', value)
                  }}
                  options={[
                    { value: 'citizen', label: 'A citizen of the United States' },
                    { value: 'national', label: 'A noncitizen national of the United States' },
                    { value: 'permanent_resident', label: 'A lawful permanent resident' },
                    { value: 'authorized_alien', label: 'An alien authorized to work' }
                  ]}
                  className="mt-[clamp(0.75rem,2vw,1rem)]"
                />
                {errors.citizenship_status && (
                  <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.citizenship_status}</p>
                )}
              </div>

              {/* Additional fields for permanent residents */}
              {formData.citizenship_status === 'permanent_resident' && (
                <div className="space-y-[clamp(1rem,3vw,1.5rem)] mt-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,3vw,1.5rem)] bg-gray-50 rounded-lg">
                  <p className="text-[clamp(0.875rem,2.5vw,1rem)] font-medium text-gray-700">Additional Information Required</p>

                  <div>
                    <MobileLabel htmlFor="alien_registration_number">
                      USCIS Number *
                    </MobileLabel>
                    <MobileInput
                      id="alien_registration_number"
                      value={formData.alien_registration_number}
                      onChange={(e) => {
                        const formatted = formatUSCISNumber(e.target.value)
                        handleInputChange('alien_registration_number', formatted)
                      }}
                      className={errors.alien_registration_number ? 'border-red-500' : ''}
                      placeholder="A-123456789"
                      maxLength={11}
                      type="text"
                      inputMode="text"
                    />
                    {errors.alien_registration_number && (
                      <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.alien_registration_number}</p>
                    )}
                  </div>

                  <div>
                    <MobileLabel htmlFor="expiration_date">
                      Card Expiration Date *
                    </MobileLabel>
                    <MobileInput
                      id="expiration_date"
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => handleInputChange('expiration_date', e.target.value)}
                      className={errors.expiration_date ? 'border-red-500' : ''}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.expiration_date && (
                      <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.expiration_date}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Additional fields for authorized aliens */}
              {formData.citizenship_status === 'authorized_alien' && (
                <div className="space-y-[clamp(1rem,3vw,1.5rem)] mt-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,3vw,1.5rem)] bg-gray-50 rounded-lg">
                  <p className="text-[clamp(0.875rem,2.5vw,1rem)] font-medium text-gray-700">Additional Information Required</p>

                  <Alert className="mb-[clamp(1rem,3vw,1.5rem)]">
                    <AlertDescription className="text-[clamp(0.875rem,2.5vw,1rem)]">
                      Please provide <strong>ONE</strong> of the following: USCIS Number, Form I-94 Admission Number, or Foreign Passport Number with Country of Issuance.
                    </AlertDescription>
                  </Alert>

                  {/* USCIS Number (A-Number) */}
                  <div>
                    <MobileLabel htmlFor="alien_registration_number">
                      USCIS Number (A-Number)
                    </MobileLabel>
                    <MobileInput
                      id="alien_registration_number"
                      value={formData.alien_registration_number}
                      onChange={(e) => {
                        const formatted = formatUSCISNumber(e.target.value)
                        handleInputChange('alien_registration_number', formatted)
                      }}
                      className={errors.alien_registration_number ? 'border-red-500' : ''}
                      placeholder="A-123456789"
                      maxLength={11}
                      type="text"
                      inputMode="text"
                    />
                    <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-500 mt-1">Format: A-123456789</p>
                  </div>

                  {/* Form I-94 Admission Number */}
                  <div>
                    <MobileLabel htmlFor="i94_admission_number">
                      Form I-94 Admission Number
                    </MobileLabel>
                    <MobileInput
                      id="i94_admission_number"
                      value={formData.i94_admission_number || ''}
                      onChange={(e) => handleInputChange('i94_admission_number', e.target.value)}
                      placeholder="12345678901"
                      maxLength={11}
                      type="text"
                      inputMode="numeric"
                    />
                    <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-500 mt-1">11-digit number from your I-94 arrival/departure record</p>
                  </div>

                  {/* Foreign Passport Number and Country */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(1rem,3vw,1.5rem)]">
                    <div>
                      <MobileLabel htmlFor="foreign_passport_number">
                        Foreign Passport Number
                      </MobileLabel>
                      <MobileInput
                        id="foreign_passport_number"
                        value={formData.foreign_passport_number}
                        onChange={(e) => handleInputChange('foreign_passport_number', e.target.value)}
                        placeholder="Passport number"
                        type="text"
                        inputMode="text"
                      />
                    </div>
                    <div>
                      <MobileLabel htmlFor="country_of_issuance">
                        Country of Issuance
                      </MobileLabel>
                      <MobileInput
                        id="country_of_issuance"
                        value={formData.country_of_issuance}
                        onChange={(e) => handleInputChange('country_of_issuance', e.target.value)}
                        placeholder="Country"
                        type="text"
                        inputMode="text"
                      />
                    </div>
                  </div>

                  {errors.authorized_alien_docs && (
                    <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.authorized_alien_docs}</p>
                  )}

                  {/* Work Authorization Expiration Date */}
                  <div>
                    <MobileLabel htmlFor="expiration_date">
                      Work Authorization Expiration Date *
                    </MobileLabel>
                    <MobileInput
                      id="expiration_date"
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => handleInputChange('expiration_date', e.target.value)}
                      className={errors.expiration_date ? 'border-red-500' : ''}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.expiration_date && (
                      <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-500 mt-1">{errors.expiration_date}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Federal compliance notice */}
              <Alert className="mt-6">
                <AlertDescription>
                  <strong>Important:</strong> Federal law requires that you complete Form I-9. Providing false information 
                  may subject you to criminal prosecution. All information will be verified with federal databases.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between gap-[clamp(0.5rem,2vw,0.75rem)] pt-[clamp(1rem,3vw,1.5rem)] flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="h-[clamp(2.75rem,6vw,3rem)] px-[clamp(1rem,3vw,1.5rem)] text-[clamp(0.875rem,2.5vw,1rem)]"
            >
              <ChevronLeft className="mr-2 h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)]" />
              Previous
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              disabled={isGeneratingPdf}
              className="h-[clamp(2.75rem,6vw,3rem)] px-[clamp(1rem,3vw,1.5rem)] text-[clamp(0.875rem,2.5vw,1rem)]"
            >
              {currentStep === steps.length - 1 ? (
                showPreview ? (
                  isGeneratingPdf ? (
                    <>Generating Preview...</>
                  ) : (
                    <>
                      <Eye className="mr-2 h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)]" />
                      Preview & Sign
                    </>
                  )
                ) : (
                  <>
                    Continue
                    <ChevronRight className="ml-2 h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)]" />
                  </>
                )
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-2 h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)]" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}