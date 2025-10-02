import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
        if (!formData.alien_registration_number.trim()) {
          newErrors.alien_registration_number = 'Alien Registration Number is required'
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
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{steps[currentStep].title}</span>
              <span>Step {currentStep + 1} of {steps.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Personal Information */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              <p className="text-sm text-gray-600">Enter your legal name as it appears on your identification documents</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className={errors.last_name ? 'border-red-500' : ''}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-red-500 mt-1">{errors.last_name}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className={errors.first_name ? 'border-red-500' : ''}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-red-500 mt-1">{errors.first_name}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="middle_initial">Middle Initial</Label>
                  <Input
                    id="middle_initial"
                    value={formData.middle_initial}
                    onChange={(e) => handleInputChange('middle_initial', e.target.value.slice(0, 1).toUpperCase())}
                    maxLength={1}
                  />
                </div>
                
                <div>
                  <Label htmlFor="other_names">Other Last Names Used</Label>
                  <Input
                    id="other_names"
                    value={formData.other_names}
                    onChange={(e) => handleInputChange('other_names', e.target.value)}
                    placeholder="Maiden name, aliases, etc."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address Information</h3>
              <p className="text-sm text-gray-600">Provide your current residential address</p>
              
              <div>
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={errors.address ? 'border-red-500' : ''}
                  placeholder="123 Main Street"
                />
                {errors.address && (
                  <p className="text-sm text-red-500 mt-1">{errors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="apt_number">Apt #</Label>
                  <Input
                    id="apt_number"
                    value={formData.apt_number}
                    onChange={(e) => handleInputChange('apt_number', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                
                <div className="col-span-3">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={errors.city ? 'border-red-500' : ''}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500 mt-1">{errors.city}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State *</Label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className={`w-full h-10 px-3 rounded-md border ${errors.state ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Select State</option>
                    {STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {errors.state && (
                    <p className="text-sm text-red-500 mt-1">{errors.state}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="zip_code">ZIP Code *</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => handleInputChange('zip_code', e.target.value)}
                    className={errors.zip_code ? 'border-red-500' : ''}
                    placeholder="12345"
                  />
                  {errors.zip_code && (
                    <p className="text-sm text-red-500 mt-1">{errors.zip_code}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contact & Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information & Personal Details</h3>
              <p className="text-sm text-gray-600">Provide your contact information and personal details</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    className={errors.date_of_birth ? 'border-red-500' : ''}
                  />
                  {errors.date_of_birth && (
                    <p className="text-sm text-red-500 mt-1">{errors.date_of_birth}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="ssn">Social Security Number *</Label>
                  <Input
                    id="ssn"
                    value={formData.ssn}
                    onChange={(e) => {
                      const formatted = formatSSN(e.target.value)
                      handleInputChange('ssn', formatted)
                    }}
                    className={errors.ssn ? 'border-red-500' : ''}
                    placeholder="123-45-6789"
                    maxLength={11}
                  />
                  {errors.ssn && (
                    <p className="text-sm text-red-500 mt-1">{errors.ssn}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                  placeholder="your.email@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value)
                    handleInputChange('phone', formatted)
                  }}
                  className={errors.phone ? 'border-red-500' : ''}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Citizenship Status */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Citizenship Status</h3>
              <p className="text-sm text-gray-600">Select your citizenship or immigration status</p>
              
              <div>
                <Label>I attest, under penalty of perjury, that I am: *</Label>
                <RadioGroup
                  value={formData.citizenship_status}
                  onValueChange={(value) => {
                    console.log('RadioGroup citizenship_status onValueChange:', value)
                    handleInputChange('citizenship_status', value)
                  }}
                  className="mt-3 space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="citizen" id="citizen" />
                    <Label htmlFor="citizen" className="font-normal cursor-pointer">
                      A citizen of the United States
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="national" id="national" />
                    <Label htmlFor="national" className="font-normal cursor-pointer">
                      A noncitizen national of the United States
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="permanent_resident" id="permanent_resident" />
                    <Label htmlFor="permanent_resident" className="font-normal cursor-pointer">
                      A lawful permanent resident
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="authorized_alien" id="authorized_alien" />
                    <Label htmlFor="authorized_alien" className="font-normal cursor-pointer">
                      An alien authorized to work
                    </Label>
                  </div>
                </RadioGroup>
                {errors.citizenship_status && (
                  <p className="text-sm text-red-500 mt-1">{errors.citizenship_status}</p>
                )}
              </div>

              {/* Additional fields for permanent residents and authorized aliens */}
              {(formData.citizenship_status === 'permanent_resident' || formData.citizenship_status === 'authorized_alien') && (
                <div className="space-y-4 mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Additional Information Required</p>
                  
                  <div>
                    <Label htmlFor="alien_registration_number">
                      {formData.citizenship_status === 'permanent_resident' ? 'USCIS Number' : 'Alien Registration Number'} *
                    </Label>
                    <Input
                      id="alien_registration_number"
                      value={formData.alien_registration_number}
                      onChange={(e) => {
                        if (formData.citizenship_status === 'permanent_resident') {
                          const formatted = formatUSCISNumber(e.target.value)
                          handleInputChange('alien_registration_number', formatted)
                        } else {
                          handleInputChange('alien_registration_number', e.target.value)
                        }
                      }}
                      className={errors.alien_registration_number ? 'border-red-500' : ''}
                      placeholder={formData.citizenship_status === 'permanent_resident' ? "A-123456789" : "123456789"}
                      maxLength={formData.citizenship_status === 'permanent_resident' ? 11 : undefined}
                    />
                    {errors.alien_registration_number && (
                      <p className="text-sm text-red-500 mt-1">{errors.alien_registration_number}</p>
                    )}
                  </div>

                  {/* Expiration date for both permanent residents and authorized aliens */}
                  <div>
                    <Label htmlFor="expiration_date">
                      {formData.citizenship_status === 'permanent_resident' ? 'Card Expiration Date' : 'Work Authorization Expiration Date'} *
                    </Label>
                    <Input
                      id="expiration_date"
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => handleInputChange('expiration_date', e.target.value)}
                      className={errors.expiration_date ? 'border-red-500' : ''}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.expiration_date && (
                      <p className="text-sm text-red-500 mt-1">{errors.expiration_date}</p>
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
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            <Button
              type="button"
              onClick={handleNext}
              disabled={isGeneratingPdf}
            >
              {currentStep === steps.length - 1 ? (
                showPreview ? (
                  isGeneratingPdf ? (
                    <>Generating Preview...</>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview & Sign
                    </>
                  )
                ) : (
                  <>
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}