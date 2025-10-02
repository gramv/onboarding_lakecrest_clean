import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formValidator, ValidationRule } from '@/utils/formValidation'
// Icons removed for cleaner professional look

interface PersonalInformationStepProps {
  formData: any
  updateFormData: (data: any) => void
  validationErrors: Record<string, string>
  onComplete: (isComplete: boolean) => void
}

const states = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]


export default function PersonalInformationStep({
  formData,
  updateFormData,
  validationErrors: externalErrors,
  onComplete
}: PersonalInformationStepProps) {
  const { t } = useTranslation()
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Validation rules for personal information
  const validationRules: ValidationRule[] = [
    { field: 'first_name', required: true, type: 'string', minLength: 1, maxLength: 50 },
    { field: 'last_name', required: true, type: 'string', minLength: 1, maxLength: 50 },
    { field: 'email', required: true, type: 'email' },
    { field: 'phone', required: true, type: 'phone' },
    { field: 'phone_is_cell', required: false, type: 'boolean' },
    { field: 'phone_is_home', required: false, type: 'boolean' },
    { field: 'address', required: true, type: 'string', minLength: 5, maxLength: 100 },
    { field: 'city', required: true, type: 'string', minLength: 2, maxLength: 50 },
    { field: 'state', required: true, type: 'string', minLength: 2, maxLength: 2 },
    { field: 'zip_code', required: true, type: 'zipCode' },
    { field: 'age_verification', required: true, type: 'boolean' },
    { field: 'work_authorized', required: true, type: 'string' },
    { field: 'sponsorship_required', required: true, type: 'string' },
    { field: 'reliable_transportation', required: true, type: 'string' }
  ]

  // Function to mark all required fields as touched
  const markAllFieldsTouched = () => {
    const requiredFields = [
      'first_name', 'last_name', 'email', 'phone',
      'address', 'city', 'state', 'zip_code',
      'age_verification', 'work_authorized', 'sponsorship_required',
      'reliable_transportation'
    ]
    const touchedState: Record<string, boolean> = {}
    requiredFields.forEach(field => {
      touchedState[field] = true
    })
    setTouched(touchedState)
  }

  useEffect(() => {
    validateStep()
  }, [formData])

  // Force validation when requested by parent
  useEffect(() => {
    if (externalErrors._forceValidation) {
      markAllFieldsTouched()
    }
  }, [externalErrors._forceValidation])

  const validateStep = () => {
    const stepData = {
      first_name: formData.first_name,
      middle_name: formData.middle_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      phone_is_cell: formData.phone_is_cell,
      phone_is_home: formData.phone_is_home,
      address: formData.address,
      apartment_unit: formData.apartment_unit,
      city: formData.city,
      state: formData.state,
      zip_code: formData.zip_code,
      age_verification: formData.age_verification,
      work_authorized: formData.work_authorized,
      sponsorship_required: formData.sponsorship_required,
      reliable_transportation: formData.reliable_transportation,
      transportation_method: formData.transportation_method,
      transportation_other: formData.transportation_other
    }

    const result = formValidator.validateForm(stepData, validationRules)
    let errors = { ...result.errors }
    
    // Additional validation for conditional fields
    if (formData.reliable_transportation === 'yes' && !formData.transportation_method) {
      errors.transportation_method = t('jobApplication.steps.personalInfo.validation.transportationMethodRequired')
    }
    if (formData.transportation_method === 'other' && !formData.transportation_other) {
      errors.transportation_other = t('jobApplication.steps.personalInfo.validation.transportationOtherRequired')
    }
    
    setLocalErrors(errors)
    
    // Check if all required fields are filled and valid
    const isComplete = result.isValid && 
      stepData.first_name && 
      stepData.last_name && 
      stepData.email && 
      stepData.phone &&
      (stepData.phone_is_cell || stepData.phone_is_home) &&
      stepData.address &&
      stepData.city &&
      stepData.state &&
      stepData.zip_code &&
      stepData.age_verification &&
      stepData.work_authorized &&
      stepData.sponsorship_required &&
      stepData.reliable_transportation &&
      (stepData.reliable_transportation === 'no' || 
        (stepData.transportation_method && 
          (stepData.transportation_method !== 'other' || stepData.transportation_other))) &&
      Object.keys(errors).length === 0

    onComplete(isComplete)
  }

  const handleInputChange = (field: string, value: any) => {
    updateFormData({ [field]: value })
    setTouched(prev => ({ ...prev, [field]: true }))
    // Also mark phone type as touched when either checkbox is changed
    if (field === 'phone_type_cell' || field === 'phone_type_home') {
      setTouched(prev => ({ ...prev, phone_type_cell: true, phone_type_home: true }))
    }
  }

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const getError = (field: string) => {
    return touched[field] ? (localErrors[field] || externalErrors[field]) : ''
  }

  return (
    <div className="space-y-6">
      {/* Name Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('jobApplication.steps.personalInfo.fields.firstName').split(' ')[0]}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.firstName')} *</Label>
            <Input
              id="first_name"
              value={formData.first_name || ''}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              className={getError('first_name') ? 'border-red-500' : ''}
              placeholder=""
              required
            />
            {getError('first_name') && (
              <p className="text-sm text-red-600">{getError('first_name')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="middle_name" className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.middleName')}</Label>
            <Input
              id="middle_name"
              value={formData.middle_name || ''}
              onChange={(e) => handleInputChange('middle_name', e.target.value)}
              placeholder=""
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name" className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.lastName')} *</Label>
            <Input
              id="last_name"
              value={formData.last_name || ''}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              className={getError('last_name') ? 'border-red-500' : ''}
              placeholder=""
              required
            />
            {getError('last_name') && (
              <p className="text-sm text-red-600">{getError('last_name')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('jobApplication.steps.personalInfo.description')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.email')} *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={getError('email') ? 'border-red-500' : ''}
              placeholder=""
              required
            />
            {getError('email') && (
              <p className="text-sm text-red-600">{getError('email')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.phone')} *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value)
                handleInputChange('phone', formatted)
              }}
              className={getError('phone') ? 'border-red-500' : ''}
              placeholder="(555) 123-4567"
              maxLength={14}
              required
            />
            {getError('phone') && (
              <p className="text-sm text-red-600">{getError('phone')}</p>
            )}
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                <Checkbox
                  id="phone_cell"
                  checked={formData.phone_is_cell || false}
                  onCheckedChange={(checked) => handleInputChange('phone_is_cell', checked)}
                />
                <Label htmlFor="phone_cell" className="text-sm font-normal cursor-pointer">{t('jobApplication.steps.personalInfo.fields.phoneType.cell')}</Label>
              </div>
              <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                <Checkbox
                  id="phone_home"
                  checked={formData.phone_is_home || false}
                  onCheckedChange={(checked) => handleInputChange('phone_is_home', checked)}
                />
                <Label htmlFor="phone_home" className="text-sm font-normal cursor-pointer">{t('jobApplication.steps.personalInfo.fields.phoneType.home')}</Label>
              </div>
            </div>
            {!formData.phone_is_cell && !formData.phone_is_home && touched.phone_is_cell && (
              <p className="text-sm text-red-600">{t('jobApplication.messages.phoneTypeRequired')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="alternate_phone" className="font-semibold text-gray-900">Alternate Phone</Label>
            <Input
              id="alternate_phone"
              type="tel"
              value={formData.alternate_phone || ''}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value)
                handleInputChange('alternate_phone', formatted)
              }}
              placeholder="(555) 123-4567"
              maxLength={14}
            />
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                <Checkbox
                  id="alternate_phone_cell"
                  checked={formData.alternate_phone_is_cell || false}
                  onCheckedChange={(checked) => handleInputChange('alternate_phone_is_cell', checked)}
                />
                <Label htmlFor="alternate_phone_cell" className="text-sm font-normal cursor-pointer">Cell</Label>
              </div>
              <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                <Checkbox
                  id="alternate_phone_home"
                  checked={formData.alternate_phone_is_home || false}
                  onCheckedChange={(checked) => handleInputChange('alternate_phone_is_home', checked)}
                />
                <Label htmlFor="alternate_phone_home" className="text-sm font-normal cursor-pointer">Home</Label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('jobApplication.steps.personalInfo.fields.address')}</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address" className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.address')} *</Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={getError('address') ? 'border-red-500' : ''}
                placeholder=""
                required
              />
              {getError('address') && (
                <p className="text-sm text-red-600">{getError('address')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="apartment_unit" className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.unit')}</Label>
              <Input
                id="apartment_unit"
                value={formData.apartment_unit || ''}
                onChange={(e) => handleInputChange('apartment_unit', e.target.value)}
                placeholder=""
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.city')} *</Label>
              <Input
                id="city"
                value={formData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className={getError('city') ? 'border-red-500' : ''}
                placeholder=""
                required
              />
              {getError('city') && (
                <p className="text-sm text-red-600">{getError('city')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state" className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.state')} *</Label>
              <Select 
                value={formData.state || ''} 
                onValueChange={(value) => handleInputChange('state', value)}
              >
                <SelectTrigger className={getError('state') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getError('state') && (
                <p className="text-sm text-red-600">{getError('state')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code" className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.zipCode')} *</Label>
              <Input
                id="zip_code"
                value={formData.zip_code || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 5)
                  handleInputChange('zip_code', value)
                }}
                className={getError('zip_code') ? 'border-red-500' : ''}
                placeholder="12345"
                maxLength={5}
                required
              />
              {getError('zip_code') && (
                <p className="text-sm text-red-600">{getError('zip_code')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('jobApplication.steps.additionalInfo.title')}</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
            <Checkbox
              id="age_verification"
              checked={formData.age_verification || false}
              onCheckedChange={(checked) => handleInputChange('age_verification', checked)}
              className={getError('age_verification') ? 'border-red-500' : ''}
            />
            <Label htmlFor="age_verification" className="font-semibold text-gray-900 cursor-pointer">
              {t('jobApplication.steps.personalInfo.fields.eligibility.ageVerification')} *
            </Label>
          </div>
          {getError('age_verification') && (
            <p className="text-sm text-red-600">{getError('age_verification')}</p>
          )}

          <div className="space-y-2">
            <Label className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.eligibility.workAuth')} *</Label>
            <RadioGroup
              value={formData.work_authorized || ''}
              onValueChange={(value) => handleInputChange('work_authorized', value)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 py-1 px-1 rounded-md hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="yes" id="work_auth_yes" className="flex-shrink-0" />
                <Label htmlFor="work_auth_yes" className="font-normal cursor-pointer flex-1 text-sm sm:text-base">{t('common.yes')}</Label>
              </div>
              <div className="flex items-center space-x-2 py-1 px-1 rounded-md hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="no" id="work_auth_no" className="flex-shrink-0" />
                <Label htmlFor="work_auth_no" className="font-normal cursor-pointer flex-1 text-sm sm:text-base">{t('common.no')}</Label>
              </div>
            </RadioGroup>
            {getError('work_authorized') && (
              <p className="text-sm text-red-600">{getError('work_authorized')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.eligibility.sponsorship', { propertyName: formData.property_name || 'this hotel' })} *</Label>
            <RadioGroup
              value={formData.sponsorship_required || ''}
              onValueChange={(value) => handleInputChange('sponsorship_required', value)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 py-1 px-1 rounded-md hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="yes" id="sponsor_yes" className="flex-shrink-0" />
                <Label htmlFor="sponsor_yes" className="font-normal cursor-pointer flex-1 text-sm sm:text-base">{t('common.yes')}</Label>
              </div>
              <div className="flex items-center space-x-2 py-1 px-1 rounded-md hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="no" id="sponsor_no" className="flex-shrink-0" />
                <Label htmlFor="sponsor_no" className="font-normal cursor-pointer flex-1 text-sm sm:text-base">{t('common.no')}</Label>
              </div>
            </RadioGroup>
            {getError('sponsorship_required') && (
              <p className="text-sm text-red-600">{getError('sponsorship_required')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.eligibility.transportation')} *</Label>
            <RadioGroup
              value={formData.reliable_transportation || ''}
              onValueChange={(value) => handleInputChange('reliable_transportation', value)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 py-1 px-1 rounded-md hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="yes" id="transport_yes" className="flex-shrink-0" />
                <Label htmlFor="transport_yes" className="font-normal cursor-pointer flex-1 text-sm sm:text-base">{t('common.yes')}</Label>
              </div>
              <div className="flex items-center space-x-2 py-1 px-1 rounded-md hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="no" id="transport_no" className="flex-shrink-0" />
                <Label htmlFor="transport_no" className="font-normal cursor-pointer flex-1 text-sm sm:text-base">{t('common.no')}</Label>
              </div>
            </RadioGroup>
            {getError('reliable_transportation') && (
              <p className="text-sm text-red-600">{getError('reliable_transportation')}</p>
            )}
          </div>

          {formData.reliable_transportation === 'yes' && (
            <div className="space-y-2 ml-6">
              <Label className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.transportationMethod')} *</Label>
              <RadioGroup 
                value={formData.transportation_method || ''} 
                onValueChange={(value) => handleInputChange('transportation_method', value)}
              >
                <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                  <RadioGroupItem value="public_transport" id="method_public" />
                  <Label htmlFor="method_public" className="font-normal cursor-pointer">{t('jobApplication.steps.personalInfo.fields.transportationOptions.publicTransport')}</Label>
                </div>
                <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                  <RadioGroupItem value="own_vehicle" id="method_own" />
                  <Label htmlFor="method_own" className="font-normal cursor-pointer">{t('jobApplication.steps.personalInfo.fields.transportationOptions.ownVehicle')}</Label>
                </div>
                <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                  <RadioGroupItem value="family_friend" id="method_family" />
                  <Label htmlFor="method_family" className="font-normal cursor-pointer">{t('jobApplication.steps.personalInfo.fields.transportationOptions.familyFriend')}</Label>
                </div>
                <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                  <RadioGroupItem value="rideshare" id="method_rideshare" />
                  <Label htmlFor="method_rideshare" className="font-normal cursor-pointer">{t('jobApplication.steps.personalInfo.fields.transportationOptions.rideshare')}</Label>
                </div>
                <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                  <RadioGroupItem value="other" id="method_other" />
                  <Label htmlFor="method_other" className="font-normal cursor-pointer">{t('jobApplication.steps.personalInfo.fields.transportationOptions.other')}</Label>
                </div>
              </RadioGroup>
              {getError('transportation_method') && (
                <p className="text-sm text-red-600">{getError('transportation_method')}</p>
              )}

              {formData.transportation_method === 'other' && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="transportation_other" className="font-semibold text-gray-900">{t('jobApplication.steps.personalInfo.fields.transportationOther')} *</Label>
                  <Input
                    id="transportation_other"
                    value={formData.transportation_other || ''}
                    onChange={(e) => handleInputChange('transportation_other', e.target.value)}
                    className={getError('transportation_other') ? 'border-red-500' : ''}
                    placeholder=""
                  />
                  {getError('transportation_other') && (
                    <p className="text-sm text-red-600">{getError('transportation_other')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> All fields marked with * are required. Your personal information will be kept confidential 
          and used only for employment purposes.
        </p>
      </div>
    </div>
  )
}