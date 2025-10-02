import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { User, MapPin, Phone, Mail, Calendar, AlertTriangle } from 'lucide-react'
import { AutoFillManager, extractAutoFillData } from '@/utils/autoFill'
import { FormValidator, getValidationRules } from '@/utils/formValidation'
import { validateAge, validateSSN, FederalValidationResult, formatSSNForDisplay } from '@/utils/federalValidation'

interface PersonalInformationData {
  firstName: string
  lastName: string
  middleInitial: string
  preferredName: string
  dateOfBirth: string
  ssn: string
  phone: string
  email: string
  address: string
  aptNumber: string
  city: string
  state: string
  zipCode: string
  gender: string
  maritalStatus: string
}

interface PersonalInformationFormProps {
  initialData?: Partial<PersonalInformationData>
  language: 'en' | 'es'
  onSave: (data: PersonalInformationData) => void
  onNext?: () => void
  onBack?: () => void
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void
  useMainNavigation?: boolean
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function PersonalInformationForm({
  initialData = {},
  language,
  onSave,
  onNext,
  onBack,
  onValidationChange,
  useMainNavigation = false
}: PersonalInformationFormProps) {
  const [formData, setFormData] = useState<PersonalInformationData>({
    firstName: '',
    lastName: '',
    middleInitial: '',
    preferredName: '',
    dateOfBirth: '',
    ssn: '',
    phone: '',
    email: '',
    address: '',
    aptNumber: '',
    city: '',
    state: '',
    zipCode: '',
    gender: '',
    maritalStatus: '',
    ...initialData
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [warnings, setWarnings] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)
  const [formValidator] = useState(() => FormValidator.getInstance())
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [showErrors, setShowErrors] = useState(false)
  const [initialValidationDone, setInitialValidationDone] = useState(false)

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'personal_info': 'Personal Information',
        'personal_info_desc': 'Please provide your personal information as it appears on your official documents.',
        'basic_info': 'Basic Information',
        'first_name': 'First Name',
        'last_name': 'Last Name',
        'middle_initial': 'Middle Initial',
        'preferred_name': 'Preferred Name',
        'date_of_birth': 'Date of Birth',
        'ssn': 'Social Security Number',
        'contact_info': 'Contact Information',
        'phone': 'Phone Number',
        'email': 'Email Address',
        'address_info': 'Address Information',
        'address': 'Street Address',
        'apt_number': 'Apt/Unit Number',
        'city': 'City',
        'state': 'State',
        'zip_code': 'ZIP Code',
        'demographics': 'Demographics (Optional)',
        'gender': 'Gender',
        'marital_status': 'Marital Status',
        'male': 'Male',
        'female': 'Female',
        'other': 'Other',
        'prefer_not_say': 'Prefer not to say',
        'single': 'Single',
        'married': 'Married',
        'divorced': 'Divorced',
        'widowed': 'Widowed',
        'separated': 'Separated',
        'optional': 'Optional',
        'required': 'Required',
        'save_continue': 'Save & Continue',
        'back': 'Back',
        'privacy_notice': 'Your personal information is protected and will only be used for employment purposes in accordance with our privacy policy.'
      },
      es: {
        'personal_info': 'Información Personal',
        'personal_info_desc': 'Por favor proporcione su información personal tal como aparece en sus documentos oficiales.',
        'basic_info': 'Información Básica',
        'first_name': 'Primer Nombre',
        'last_name': 'Apellido',
        'middle_initial': 'Inicial del Segundo Nombre',
        'preferred_name': 'Nombre Preferido',
        'date_of_birth': 'Fecha de Nacimiento',
        'ssn': 'Número de Seguro Social',
        'contact_info': 'Información de Contacto',
        'phone': 'Número de Teléfono',
        'email': 'Dirección de Correo Electrónico',
        'address_info': 'Información de Dirección',
        'address': 'Dirección',
        'apt_number': 'Número de Apartamento/Unidad',
        'city': 'Ciudad',
        'state': 'Estado',
        'zip_code': 'Código Postal',
        'demographics': 'Demografía (Opcional)',
        'gender': 'Género',
        'marital_status': 'Estado Civil',
        'male': 'Masculino',
        'female': 'Femenino',
        'other': 'Otro',
        'prefer_not_say': 'Prefiero no decir',
        'single': 'Soltero(a)',
        'married': 'Casado(a)',
        'divorced': 'Divorciado(a)',
        'widowed': 'Viudo(a)',
        'separated': 'Separado(a)',
        'optional': 'Opcional',
        'required': 'Requerido',
        'save_continue': 'Guardar y Continuar',
        'back': 'Atrás',
        'privacy_notice': 'Su información personal está protegida y solo se utilizará para fines de empleo de acuerdo con nuestra política de privacidad.'
      }
    }
    return translations[language][key] || key
  }

  // Initial validation without showing errors to user
  useEffect(() => {
    if (!initialValidationDone) {
      const validationRules = getValidationRules('personal_info')
      const result = formValidator.validateForm(formData, validationRules)
      setIsValid(result.isValid)
      setInitialValidationDone(true)
      
      // Notify parent but don't set visible errors
      if (onValidationChange) {
        onValidationChange(result.isValid, {})
      }
    }
  }, [formData, initialValidationDone])

  useEffect(() => {
    // Only validate and show errors if form has been interacted with or if we're showing errors
    if (initialValidationDone && (showErrors || Object.keys(touchedFields).length > 0)) {
      validateForm()
    }
  }, [formData, showErrors, touchedFields, initialValidationDone])

  useEffect(() => {
    // Apply auto-fill formatting when user types
    const autoFormatFields = ['ssn', 'phone', 'zipCode']
    autoFormatFields.forEach(field => {
      if (formData[field]) {
        const formatted = formValidator.formatField(formData[field], field === 'phone' ? 'phone' : field === 'ssn' ? 'ssn' : 'zipCode')
        if (formatted !== formData[field]) {
          setFormData(prev => ({ ...prev, [field]: formatted }))
        }
      }
    })
  }, [formData.ssn, formData.phone, formData.zipCode])

  // Auto-save form data whenever it changes
  useEffect(() => {
    if (initialValidationDone && Object.keys(touchedFields).length > 0) {
      // Call onSave to notify parent of data changes
      onSave(formData)
    }
  }, [formData, initialValidationDone, touchedFields, onSave])

  const validateForm = () => {
    // Use unified validation system
    const validationRules = getValidationRules('personal_info')
    const result = formValidator.validateForm(formData, validationRules)
    
    const newErrors = { ...result.errors }
    const newWarnings = { ...result.warnings }
    
    // Basic age validation - must be 18 or older for employment
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age
      
      if (actualAge < 18) {
        newErrors.dateOfBirth = 'Must be at least 18 years old for employment'
      }
    }
    
    // Basic SSN format validation
    if (formData.ssn) {
      const ssnClean = formData.ssn.replace(/-/g, '')
      if (ssnClean.length !== 9 || !/^\d{9}$/.test(ssnClean)) {
        newErrors.ssn = 'SSN must be 9 digits (XXX-XX-XXXX)'
      }
    }
    
    setErrors(newErrors)
    setWarnings(newWarnings)
    setIsValid(result.isValid && Object.keys(newErrors).length === 0)
    
    // Notify parent of validation state changes
    if (onValidationChange) {
      onValidationChange(result.isValid && Object.keys(newErrors).length === 0, { ...newErrors, ...newWarnings })
    }
  }

  const handleInputChange = (field: keyof PersonalInformationData, value: string) => {
    // Use unified formatting system
    let formattedValue = value
    if (['ssn', 'phone', 'zipCode'].includes(field)) {
      formattedValue = formValidator.formatField(value, field === 'phone' ? 'phone' : field === 'ssn' ? 'ssn' : 'zipCode')
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }))
    
    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [field]: true }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    if (warnings[field]) {
      setWarnings(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Handle field blur to show validation errors
  const handleFieldBlur = (field: keyof PersonalInformationData) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }))
  }

  const handleSubmit = () => {
    setShowErrors(true) // Show all errors when user tries to submit
    
    if (isValid) {
      // Extract and save data for auto-fill in other forms
      extractAutoFillData(formData, 'personal_info')
      
      onSave(formData)
      if (!useMainNavigation && onNext) onNext()
    }
  }

  // Function to determine if error should be shown
  const shouldShowError = (field: string) => {
    return showErrors || touchedFields[field]
  }

  return (
    <div className="flex-container-adaptive">
      <div className="text-center container-responsive">
        <h2 className="sr-only text-responsive-lg font-bold text-gray-900">{t('personal_info')}</h2>
        <p className="sr-only text-responsive-base text-gray-600 mt-1 max-w-4xl mx-auto leading-relaxed">{t('personal_info_desc')}</p>
      </div>

      {/* Consolidated Personal Information - Single Card */}
      <Card className="flex-1 flex flex-col w-full max-w-none">
        <CardHeader className="flex-shrink-0 p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span>{t('basic_info')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 sm:space-y-6 overflow-auto min-h-0 p-4 sm:p-6">
          {/* Name Fields - Auto-adaptive grid */}
          <div className="grid-responsive-forms">
            <div className="input-group">
              <Label htmlFor="firstName" className="text-responsive-sm font-medium block mb-1">{t('first_name')} <span className="text-red-500">*</span></Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                onBlur={() => handleFieldBlur('firstName')}
                className={`form-input-enhanced w-full ${shouldShowError('firstName') && errors.firstName ? 'border-red-500' : ''}`}
                placeholder=""
              />
              {shouldShowError('firstName') && errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>
            <div className="input-group">
              <Label htmlFor="lastName" className="text-responsive-sm font-medium block mb-1">{t('last_name')} <span className="text-red-500">*</span></Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                onBlur={() => handleFieldBlur('lastName')}
                className={`form-input-enhanced w-full ${shouldShowError('lastName') && errors.lastName ? 'border-red-500' : ''}`}
                placeholder=""
              />
              {shouldShowError('lastName') && errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>
            <div className="input-group">
              <Label htmlFor="middleInitial" className="text-responsive-sm font-medium block mb-1">{t('middle_initial')}</Label>
              <Input
                id="middleInitial"
                value={formData.middleInitial}
                onChange={(e) => handleInputChange('middleInitial', e.target.value.slice(0, 1).toUpperCase())}
                placeholder=""
                maxLength={1}
                className="form-input-enhanced w-full"
              />
            </div>
            <div className="input-group">
              <Label htmlFor="preferredName" className="text-responsive-sm font-medium block mb-1">{t('preferred_name')}</Label>
              <Input
                id="preferredName"
                value={formData.preferredName}
                onChange={(e) => handleInputChange('preferredName', e.target.value)}
                placeholder=""
                className="form-input-enhanced w-full"
              />
            </div>
          </div>

          {/* Personal Details - Auto-adaptive grid */}
          <div className="grid-responsive-forms">
            <div className="input-group">
              <Label htmlFor="dateOfBirth" className="text-responsive-sm font-medium block mb-1">{t('date_of_birth')} <span className="text-red-500">*</span></Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                onBlur={() => handleFieldBlur('dateOfBirth')}
                className={`form-input-enhanced w-full ${shouldShowError('dateOfBirth') && errors.dateOfBirth ? 'border-red-500' : ''}`}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
              />
              {shouldShowError('dateOfBirth') && errors.dateOfBirth && (
                <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>
              )}
            </div>
            <div className="input-group">
              <Label htmlFor="ssn" className="text-responsive-sm font-medium block mb-1">{t('ssn')} <span className="text-red-500">*</span></Label>
              <Input
                id="ssn"
                value={formData.ssn}
                onChange={(e) => handleInputChange('ssn', e.target.value)}
                onBlur={() => handleFieldBlur('ssn')}
                className={`form-input-enhanced w-full ${shouldShowError('ssn') && errors.ssn ? 'border-red-500' : ''}`}
                placeholder=""
                maxLength={11}
              />
              {shouldShowError('ssn') && errors.ssn && (
                <p className="text-red-500 text-xs mt-1">{errors.ssn}</p>
              )}
            </div>
            <div className="input-group">
              <Label htmlFor="phone" className="text-responsive-sm font-medium block mb-1">{t('phone')} <span className="text-red-500">*</span></Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onBlur={() => handleFieldBlur('phone')}
                className={`form-input-enhanced w-full ${shouldShowError('phone') && errors.phone ? 'border-red-500' : ''}`}
                placeholder=""
              />
              {shouldShowError('phone') && errors.phone && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Email - full width */}
          <div className="input-group">
            <Label htmlFor="email" className="text-responsive-sm font-medium block mb-1">{t('email')} <span className="text-red-500">*</span></Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => handleFieldBlur('email')}
              className={`form-input-enhanced w-full ${shouldShowError('email') && errors.email ? 'border-red-500' : ''}`}
              placeholder=""
            />
            {shouldShowError('email') && errors.email && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Address Section - Responsive layout */}
          <div className="border-t pt-4 sm:pt-6 mt-4 sm:mt-6">
            <h4 className="text-sm sm:text-base font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
              {t('address_info')}
            </h4>
            <div className="space-y-3 sm:space-y-4">
              {/* Street Address and Apt Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="address" className="text-sm font-medium block mb-1.5">{t('address')} <span className="text-red-500">*</span></Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    onBlur={() => handleFieldBlur('address')}
                    className={`min-h-[48px] text-sm sm:text-base w-full ${shouldShowError('address') && errors.address ? 'border-red-500' : ''}`}
                    placeholder=""
                    inputMode="text"
                  />
                  {shouldShowError('address') && errors.address && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.address}</p>}
                </div>
                <div className="sm:col-span-1 lg:col-span-1">
                  <Label htmlFor="aptNumber" className="text-sm font-medium block mb-1.5">{t('apt_number')}</Label>
                  <Input
                    id="aptNumber"
                    value={formData.aptNumber}
                    onChange={(e) => handleInputChange('aptNumber', e.target.value)}
                    placeholder=""
                    className="min-h-[48px] text-sm sm:text-base w-full"
                    inputMode="text"
                  />
                </div>
              </div>
              
              {/* City, State, ZIP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="sm:col-span-1">
                  <Label htmlFor="city" className="text-sm font-medium block mb-1.5">{t('city')} <span className="text-red-500">*</span></Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    onBlur={() => handleFieldBlur('city')}
                    className={`min-h-[48px] text-sm sm:text-base w-full ${shouldShowError('city') && errors.city ? 'border-red-500' : ''}`}
                    placeholder=""
                    inputMode="text"
                  />
                  {shouldShowError('city') && errors.city && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.city}</p>}
                </div>
                <div className="sm:col-span-1 lg:col-span-1">
                  <Label htmlFor="state" className="text-sm font-medium block mb-1.5">{t('state')} <span className="text-red-500">*</span></Label>
                  <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                    <SelectTrigger className={`min-h-[48px] text-sm sm:text-base w-full ${shouldShowError('state') && errors.state ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {shouldShowError('state') && errors.state && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.state}</p>}
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="zipCode" className="text-sm font-medium block mb-1.5">{t('zip_code')} <span className="text-red-500">*</span></Label>
                  <Input
                    id="zipCode"
                    type="tel"
                    inputMode="numeric"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    onBlur={() => handleFieldBlur('zipCode')}
                    className={`min-h-[48px] text-sm sm:text-base w-full ${shouldShowError('zipCode') && errors.zipCode ? 'border-red-500' : ''}`}
                    placeholder=""
                  />
                  {shouldShowError('zipCode') && errors.zipCode && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.zipCode}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Demographics - Horizontal layout */}
          <div className="border-t pt-4 mt-4 sm:mt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('demographics')} <span className="text-xs text-gray-500">(Optional)</span></h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <Label className="text-sm font-medium block mb-2">{t('gender')}</Label>
                <RadioGroup value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)} className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2 min-h-[44px]">
                    <RadioGroupItem value="male" id="male" className="h-5 w-5" />
                    <Label htmlFor="male" className="text-sm font-normal cursor-pointer">{t('male')}</Label>
                  </div>
                  <div className="flex items-center space-x-2 min-h-[44px]">
                    <RadioGroupItem value="female" id="female" className="h-5 w-5" />
                    <Label htmlFor="female" className="text-sm font-normal cursor-pointer">{t('female')}</Label>
                  </div>
                  <div className="flex items-center space-x-2 min-h-[44px]">
                    <RadioGroupItem value="other" id="other" className="h-5 w-5" />
                    <Label htmlFor="other" className="text-sm font-normal cursor-pointer">{t('other')}</Label>
                  </div>
                  <div className="flex items-center space-x-2 min-h-[44px]">
                    <RadioGroupItem value="prefer_not_say" id="prefer_not_say" className="h-5 w-5" />
                    <Label htmlFor="prefer_not_say" className="text-sm font-normal cursor-pointer">{t('prefer_not_say')}</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label className="text-sm font-medium block mb-2">{t('marital_status')}</Label>
                <RadioGroup value={formData.maritalStatus} onValueChange={(value) => handleInputChange('maritalStatus', value)} className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2 min-h-[44px]">
                    <RadioGroupItem value="single" id="single" className="h-5 w-5" />
                    <Label htmlFor="single" className="text-sm font-normal cursor-pointer">{t('single')}</Label>
                  </div>
                  <div className="flex items-center space-x-2 min-h-[44px]">
                    <RadioGroupItem value="married" id="married" className="h-5 w-5" />
                    <Label htmlFor="married" className="text-sm font-normal cursor-pointer">{t('married')}</Label>
                  </div>
                  <div className="flex items-center space-x-2 min-h-[44px]">
                    <RadioGroupItem value="divorced" id="divorced" className="h-5 w-5" />
                    <Label htmlFor="divorced" className="text-sm font-normal cursor-pointer">{t('divorced')}</Label>
                  </div>
                  <div className="flex items-center space-x-2 min-h-[44px]">
                    <RadioGroupItem value="widowed" id="widowed" className="h-5 w-5" />
                    <Label htmlFor="widowed" className="text-sm font-normal cursor-pointer">{t('widowed')}</Label>
                  </div>
                  <div className="flex items-center space-x-2 min-h-[44px]">
                    <RadioGroupItem value="separated" id="separated" className="h-5 w-5" />
                    <Label htmlFor="separated" className="text-sm font-normal cursor-pointer">{t('separated')}</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings Display */}
      {Object.keys(warnings).length > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200 p-3 sm:p-4">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
          <AlertDescription className="text-xs sm:text-sm">
            {Object.values(warnings).map((warning, index) => (
              <p key={index} className="text-yellow-800">{warning}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Privacy Notice - Compact */}
      <div className="text-xs sm:text-sm text-gray-500 flex items-start sm:items-center space-x-2 leading-snug px-2 sm:px-0">
        <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5 sm:mt-0" />
        <span>{t('privacy_notice')}</span>
      </div>

      {/* Hidden submit allows parent navigation to trigger validation */}
      <Button onClick={handleSubmit} className="hidden" disabled={!isValid}>
        Save Personal Info
      </Button>

      {/* Form validation indicator for parent component */}
      <div className="hidden" data-form-valid={isValid} data-form-errors={JSON.stringify(errors)} />
    </div>
  )
}