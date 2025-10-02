import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronRight, ChevronLeft, Eye, Calculator, DollarSign, Users } from 'lucide-react'

interface W4FormCleanProps {
  onComplete: (data: any) => void
  initialData?: any
  language?: 'en' | 'es'
  employeeId?: string
}

interface FormData {
  // Personal Information
  first_name: string
  middle_initial: string
  last_name: string
  address: string
  apt_number: string
  city: string
  state: string
  zip_code: string
  ssn: string
  
  // Filing Status
  filing_status: 'single' | 'married_filing_jointly' | 'head_of_household'
  
  // Multiple Jobs
  multiple_jobs: boolean
  
  // Dependents
  qualifying_children: number
  other_dependents: number
  
  // Other Adjustments
  other_income: string
  deductions: string
  extra_withholding: string
}

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function W4FormClean({
  onComplete,
  initialData = {},
  language = 'en',
  employeeId
}: W4FormCleanProps) {
  const [currentStep, setCurrentStep] = useState(0)
  
  const [formData, setFormData] = useState<FormData>({
    first_name: initialData.first_name || '',
    middle_initial: initialData.middle_initial || '',
    last_name: initialData.last_name || '',
    address: initialData.address || '',
    apt_number: initialData.apt_number || '',
    city: initialData.city || '',
    state: initialData.state || '',
    zip_code: initialData.zip_code || '',
    ssn: initialData.ssn || '',
    filing_status: initialData.filing_status || 'single',
    multiple_jobs: initialData.multiple_jobs || false,
    qualifying_children: initialData.qualifying_children || 0,
    other_dependents: initialData.other_dependents || 0,
    other_income: initialData.other_income || '',
    deductions: initialData.deductions || '',
    extra_withholding: initialData.extra_withholding || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log('W4FormClean - Updating form data from initialData:', initialData)
      setFormData({
        first_name: initialData.first_name || '',
        middle_initial: initialData.middle_initial || '',
        last_name: initialData.last_name || '',
        address: initialData.address || '',
        apt_number: initialData.apt_number || '',
        city: initialData.city || '',
        state: initialData.state || '',
        zip_code: initialData.zip_code || '',
        ssn: initialData.ssn || '',
        filing_status: initialData.filing_status || 'single',
        multiple_jobs: initialData.multiple_jobs || false,
        qualifying_children: initialData.qualifying_children || 0,
        other_dependents: initialData.other_dependents || 0,
        other_income: initialData.other_income || '',
        deductions: initialData.deductions || '',
        extra_withholding: initialData.extra_withholding || ''
      })
    }
  }, [initialData])

  const steps = [
    {
      title: 'Personal Information',
      icon: <Users className="h-5 w-5" />,
      fields: ['first_name', 'middle_initial', 'last_name', 'address', 'apt_number', 'city', 'state', 'zip_code', 'ssn']
    },
    {
      title: 'Filing Status',
      icon: <Calculator className="h-5 w-5" />,
      fields: ['filing_status', 'multiple_jobs']
    },
    {
      title: 'Dependents',
      icon: <Users className="h-5 w-5" />,
      fields: ['qualifying_children', 'other_dependents']
    },
    {
      title: 'Other Adjustments',
      icon: <DollarSign className="h-5 w-5" />,
      fields: ['other_income', 'deductions', 'extra_withholding']
    }
  ]

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatSSN = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 9)}`
  }

  const formatCurrency = (value: string) => {
    // Remove all non-numeric characters except decimal
    const numbers = value.replace(/[^0-9.]/g, '')
    // Ensure only one decimal point
    const parts = numbers.split('.')
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('')
    }
    return numbers
  }

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {}
    const step = steps[stepIndex]

    step.fields.forEach(field => {
      switch (field) {
        case 'first_name':
          if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
          break
        case 'last_name':
          if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
          break
        case 'address':
          if (!formData.address.trim()) newErrors.address = 'Address is required'
          break
        case 'city':
          if (!formData.city.trim()) newErrors.city = 'City is required'
          break
        case 'state':
          if (!formData.state) newErrors.state = 'State is required'
          break
        case 'zip_code':
          if (!formData.zip_code.trim()) newErrors.zip_code = 'ZIP code is required'
          else if (!/^\d{5}(-\d{4})?$/.test(formData.zip_code)) newErrors.zip_code = 'Invalid ZIP code'
          break
        case 'ssn':
          if (!formData.ssn.trim()) newErrors.ssn = 'SSN is required'
          else if (formData.ssn.replace(/\D/g, '').length !== 9) newErrors.ssn = 'SSN must be 9 digits'
          break
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        // Ensure numeric fields default to 0 before completing
        const finalFormData = {
          ...formData,
          qualifying_children: formData.qualifying_children || 0,
          other_dependents: formData.other_dependents || 0,
          other_income: formData.other_income || '0',
          deductions: formData.deductions || '0',
          extra_withholding: formData.extra_withholding || '0'
        }
        // Pass the form data directly to parent
        onComplete(finalFormData)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const calculateDependentAmount = () => {
    const childrenAmount = formData.qualifying_children * 2000
    const otherAmount = formData.other_dependents * 500
    return childrenAmount + otherAmount
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="sr-only">Form W-4</CardTitle>
          <p className="sr-only text-sm text-gray-600">Employee's Withholding Certificate</p>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-2">
                {steps[currentStep].icon}
                {steps[currentStep].title}
              </span>
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
              <p className="text-sm text-gray-600">Enter your personal details as they appear on your Social Security card</p>
              
              <div className="grid grid-cols-2 gap-4">
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
                
                <div>
                  <Label htmlFor="middle_initial">Middle Initial</Label>
                  <Input
                    id="middle_initial"
                    value={formData.middle_initial}
                    onChange={(e) => handleInputChange('middle_initial', e.target.value.slice(0, 1).toUpperCase())}
                    maxLength={1}
                    className="w-20"
                  />
                </div>
              </div>

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
          )}

          {/* Step 2: Filing Status */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Filing Status</h3>
              <p className="text-sm text-gray-600">Select your tax filing status</p>
              
              <div>
                <Label>Check the box that describes your filing status *</Label>
                <RadioGroup
                  value={formData.filing_status}
                  onValueChange={(value: any) => handleInputChange('filing_status', value)}
                  className="mt-3 space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="font-normal cursor-pointer">
                      Single or Married filing separately
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="married_filing_jointly" id="married" />
                    <Label htmlFor="married" className="font-normal cursor-pointer">
                      Married filing jointly (or Qualifying surviving spouse)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="head_of_household" id="head" />
                    <Label htmlFor="head" className="font-normal cursor-pointer">
                      Head of household (Check only if you're unmarried and pay more than half the costs of keeping up a home for yourself and a qualifying individual)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <Label className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.multiple_jobs}
                    onCheckedChange={(checked) => handleInputChange('multiple_jobs', checked)}
                  />
                  <span className="font-normal">
                    Complete this step if you (1) hold more than one job at a time, or (2) are married filing jointly and your spouse also works
                  </span>
                </Label>
                <p className="text-sm text-gray-600 mt-2 ml-6">
                  The correct amount of withholding depends on income earned from all of these jobs.
                </p>
              </div>

              <Alert className="mt-4">
                <AlertDescription>
                  <strong>Note:</strong> If you have multiple jobs or your spouse works, you should complete the Multiple Jobs Worksheet or use the IRS Tax Withholding Estimator for most accurate withholding.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 3: Dependents */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Claim Dependents</h3>
              <p className="text-sm text-gray-600">If your income will be $200,000 or less ($400,000 or less if married filing jointly)</p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="qualifying_children">
                    Number of qualifying children under age 17
                  </Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      id="qualifying_children"
                      type="number"
                      min="0"
                      value={formData.qualifying_children}
                      onChange={(e) => handleInputChange('qualifying_children', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600">× $2,000 = ${formData.qualifying_children * 2000}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Multiply the number of qualifying children by $2,000
                  </p>
                </div>

                <div>
                  <Label htmlFor="other_dependents">
                    Number of other dependents
                  </Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      id="other_dependents"
                      type="number"
                      min="0"
                      value={formData.other_dependents}
                      onChange={(e) => handleInputChange('other_dependents', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600">× $500 = ${formData.other_dependents * 500}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Multiply the number of other dependents by $500
                  </p>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="font-semibold">Total amount for dependents:</p>
                  <p className="text-2xl font-bold text-blue-600">${calculateDependentAmount()}</p>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Qualifying children:</strong> Must be under age 17, have a valid SSN, and meet other IRS requirements.
                  <br />
                  <strong>Other dependents:</strong> Include children 17 or older and other qualifying relatives.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 4: Other Adjustments */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Other Adjustments (Optional)</h3>
              <p className="text-sm text-gray-600">Use this step if you want tax withheld for other income or want to reduce your withholding</p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="other_income">
                    (a) Other income (not from jobs)
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-gray-600">$</span>
                    <Input
                      id="other_income"
                      value={formData.other_income}
                      onChange={(e) => handleInputChange('other_income', formatCurrency(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    If you want tax withheld on other income you expect this year (interest, dividends, retirement income, etc.)
                  </p>
                </div>

                <div>
                  <Label htmlFor="deductions">
                    (b) Deductions
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-gray-600">$</span>
                    <Input
                      id="deductions"
                      value={formData.deductions}
                      onChange={(e) => handleInputChange('deductions', formatCurrency(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    If you expect to claim deductions other than the standard deduction and want to reduce your withholding
                  </p>
                </div>

                <div>
                  <Label htmlFor="extra_withholding">
                    (c) Extra withholding
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-gray-600">$</span>
                    <Input
                      id="extra_withholding"
                      value={formData.extra_withholding}
                      onChange={(e) => handleInputChange('extra_withholding', formatCurrency(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter any additional tax you want withheld each pay period
                  </p>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Note:</strong> You can use the IRS Tax Withholding Estimator at www.irs.gov/W4App to determine a more accurate withholding amount.
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
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Continue to Preview
                </>
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