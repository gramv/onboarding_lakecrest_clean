import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Shield, Users, DollarSign, Info, Plus, Trash2, AlertTriangle } from 'lucide-react'

interface Dependent {
  firstName: string
  lastName: string
  middleInitial: string
  relationship: string
  dateOfBirth: string
  ssn: string
  gender: 'M' | 'F'
}

interface HealthInsuranceData {
  // Medical Coverage
  medicalPlan: string
  medicalTier: string
  medicalCost: number
  
  // Additional Coverage
  dentalCoverage: boolean
  dentalTier: string
  dentalCost: number
  
  visionCoverage: boolean
  visionTier: string
  visionCost: number
  
  // Dependents
  dependents: Dependent[]
  hasStepchildren: boolean
  stepchildrenNames: string
  dependentsSupported: boolean
  irsDependentConfirmation: boolean
  
  // Total costs
  totalBiweeklyCost: number
  
  // Waiver
  isWaived: boolean
  waiveReason: string
  otherCoverageType: string
  otherCoverageDetails: string
}

interface HealthInsuranceFormProps {
  initialData?: Partial<HealthInsuranceData>
  language: 'en' | 'es'
  onSave: (data: HealthInsuranceData) => void
  onNext?: () => void
  onBack?: () => void
  onValidationChange?: (isValid: boolean) => void
}

// Medical plan options from the paper packet
const MEDICAL_PLANS = {
  'hra_6k': {
    name: 'UHC HRA $6K Plan',
    costs: {
      'employee': 59.91,
      'employee_spouse': 319.29,
      'employee_children': 264.10,
      'family': 390.25
    }
  },
  'hra_4k': {
    name: 'UHC HRA $4K Plan',
    costs: {
      'employee': 136.84,
      'employee_spouse': 396.21,
      'employee_children': 341.02,
      'family': 467.17
    }
  },
  'hra_2k': {
    name: 'UHC HRA $2K Plan',
    costs: {
      'employee': 213.76,
      'employee_spouse': 473.13,
      'employee_children': 417.95,
      'family': 544.09
    }
  },
  'minimum_essential': {
    name: 'ACI Minimum Essential Coverage Plan',
    costs: {
      'employee': 7.77,
      'employee_spouse': 17.55,
      'employee_children': 19.03,
      'family': 27.61
    }
  },
  'indemnity': {
    name: 'ACI Indemnity Plan',
    costs: {
      'employee': 19.61,
      'employee_spouse': 37.24,
      'employee_children': 31.45,
      'family': 49.12
    }
  },
  'minimum_plus_indemnity': {
    name: 'Minimum Essential + Indemnity',
    costs: {
      'employee': 27.37,
      'employee_spouse': 54.79,
      'employee_children': 50.48,
      'family': 76.74
    }
  }
}

const DENTAL_COSTS = {
  'employee': 13.45,
  'employee_spouse': 27.44,
  'employee_children': 31.13,
  'family': 45.63
}

const VISION_COSTS = {
  'employee': 3.04,
  'employee_spouse': 5.59,
  'employee_children': 5.86,
  'family': 8.78
}

const TIER_OPTIONS = [
  { value: 'employee', label: 'Employee Only', labelEs: 'Solo Empleado' },
  { value: 'employee_spouse', label: 'Employee + Spouse', labelEs: 'Empleado + Cónyuge' },
  { value: 'employee_children', label: 'Employee + Child(ren)', labelEs: 'Empleado + Hijo(s)' },
  { value: 'family', label: 'Employee + Family', labelEs: 'Empleado + Familia' }
]

const RELATIONSHIP_OPTIONS = [
  'Spouse', 'Child', 'Stepchild', 'Adopted Child', 'Domestic Partner'
]

export default function HealthInsuranceForm({
  initialData = {},
  language,
  onSave,
  onNext,
  onBack,
  onValidationChange
}: HealthInsuranceFormProps) {
  const [formData, setFormData] = useState<HealthInsuranceData>({
    medicalPlan: '',
    medicalTier: 'employee',
    medicalCost: 0,
    dentalCoverage: false,
    dentalTier: 'employee',
    dentalCost: 0,
    visionCoverage: false,
    visionTier: 'employee',
    visionCost: 0,
    dependents: [],
    hasStepchildren: false,
    stepchildrenNames: '',
    dependentsSupported: false,
    irsDependentConfirmation: false,
    totalBiweeklyCost: 0,
    isWaived: false,
    waiveReason: '',
    otherCoverageType: '',
    otherCoverageDetails: '',
    ...initialData
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showDependentForm, setShowDependentForm] = useState(false)
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [showErrors, setShowErrors] = useState(false)
  const [isValid, setIsValid] = useState(false)

  // Update form data when initialData changes (for navigation back)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log('HealthInsuranceForm - Updating from initialData:', initialData)
      setFormData(prevData => ({
        ...prevData,
        ...initialData
      }))
    }
  }, [initialData])

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'health_insurance': 'Health Insurance Election',
        'health_insurance_desc': 'Select your health insurance coverage options. Coverage is effective on the first day of the month following your hire date.',
        'plan_year': 'Plan Year: January 1, 2025 – December 31, 2025',
        'medical_coverage': 'Medical Coverage',
        'select_plan': 'Select Medical Plan',
        'select_tier': 'Select Coverage Tier',
        'biweekly_cost': 'Bi-weekly Cost',
        'additional_coverage': 'Additional Coverage',
        'dental_coverage': 'Dental Coverage',
        'vision_coverage': 'Vision Coverage',
        'dependents_info': 'Dependent Information',
        'add_dependent': 'Add Dependent',
        'dependent_required': 'This section must be completed for all dependent coverages',
        'first_name': 'First Name',
        'last_name': 'Last Name',
        'middle_initial': 'Middle Initial',
        'relationship': 'Relationship',
        'date_of_birth': 'Date of Birth',
        'ssn': 'Social Security Number',
        'gender': 'Gender',
        'male': 'Male',
        'female': 'Female',
        'stepchildren_question': 'Have you included stepchildren as dependents?',
        'stepchildren_names': 'If yes, indicate names:',
        'support_question': 'Are they dependent on you for support and maintenance?',
        'irs_confirmation': 'I affirm that all dependents listed meet the IRS Section 152 definition of "dependent" so that premiums can be paid with pre-tax dollars, if applicable',
        'cost_summary': 'Cost Summary',
        'medical': 'Medical',
        'dental': 'Dental',
        'vision': 'Vision',
        'total': 'Total Bi-weekly Cost',
        'waiver_section': 'Coverage Waiver',
        'decline_coverage': 'I decline all health insurance coverage',
        'waiver_reason': 'Reason for declining coverage',
        'no_coverage_preference': 'My preference not to have coverage',
        'spouse_coverage': 'Coverage under my spouse\'s/domestic partner\'s plan',
        'other_coverage': 'Other coverage',
        'other_coverage_type': 'This other coverage is:',
        'employer_group': 'Employer-sponsored Group Plan',
        'individual_policy': 'Individual policy',
        'medicare': 'Medicare',
        'cobra': 'COBRA',
        'tricare': 'TRICARE',
        'medicaid': 'Medicaid',
        'special_enrollment': 'Special Enrollment Notice',
        'enrollment_notice': 'By signing below, I certify that I have been given an opportunity to apply for coverage for myself and my eligible dependents, if any. I understand the special enrollment rules and my rights to make changes during qualifying life events.',
        'save_continue': 'Save & Continue',
        'back': 'Back',
        'yes': 'Yes',
        'no': 'No',
        'remove': 'Remove'
      },
      es: {
        'health_insurance': 'Elección de Seguro de Salud',
        'health_insurance_desc': 'Seleccione sus opciones de cobertura de seguro de salud. La cobertura es efectiva el primer día del mes siguiente a su fecha de contratación.',
        'plan_year': 'Año del Plan: 1 de enero de 2025 – 31 de diciembre de 2025',
        'medical_coverage': 'Cobertura Médica',
        'select_plan': 'Seleccionar Plan Médico',
        'select_tier': 'Seleccionar Nivel de Cobertura',
        'biweekly_cost': 'Costo Quincenal',
        'additional_coverage': 'Cobertura Adicional',
        'dental_coverage': 'Cobertura Dental',
        'vision_coverage': 'Cobertura de Visión',
        'dependents_info': 'Información de Dependientes',
        'add_dependent': 'Agregar Dependiente',
        'save_continue': 'Guardar y Continuar',
        'back': 'Atrás',
        'yes': 'Sí',
        'no': 'No'
      }
    }
    return translations[language][key] || key
  }

  useEffect(() => {
    calculateCosts()
  }, [formData.medicalPlan, formData.medicalTier, formData.dentalCoverage, formData.dentalTier, formData.visionCoverage, formData.visionTier])

  useEffect(() => {
    validateForm()
  }, [formData.isWaived, formData.medicalPlan, formData.dependents, formData.irsDependentConfirmation])

  const calculateCosts = () => {
    let totalCost = 0

    // Medical cost
    if (formData.medicalPlan && MEDICAL_PLANS[formData.medicalPlan as keyof typeof MEDICAL_PLANS]) {
      const medicalCost = MEDICAL_PLANS[formData.medicalPlan as keyof typeof MEDICAL_PLANS].costs[formData.medicalTier as keyof typeof MEDICAL_PLANS['hra_6k']['costs']] || 0
      totalCost += medicalCost
      setFormData(prev => ({ ...prev, medicalCost }))
    }

    // Dental cost
    if (formData.dentalCoverage) {
      const dentalCost = DENTAL_COSTS[formData.dentalTier as keyof typeof DENTAL_COSTS] || 0
      totalCost += dentalCost
      setFormData(prev => ({ ...prev, dentalCost }))
    }

    // Vision cost
    if (formData.visionCoverage) {
      const visionCost = VISION_COSTS[formData.visionTier as keyof typeof VISION_COSTS] || 0
      totalCost += visionCost
      setFormData(prev => ({ ...prev, visionCost }))
    }

    setFormData(prev => ({ ...prev, totalBiweeklyCost: totalCost }))
  }

  const addDependent = () => {
    const newDependent: Dependent = {
      firstName: '',
      lastName: '',
      middleInitial: '',
      relationship: '',
      dateOfBirth: '',
      ssn: '',
      gender: 'M'
    }
    setFormData(prev => ({
      ...prev,
      dependents: [...prev.dependents, newDependent]
    }))
  }

  const removeDependent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dependents: prev.dependents.filter((_, i) => i !== index)
    }))
  }

  const updateDependent = (index: number, field: keyof Dependent, value: string) => {
    setFormData(prev => ({
      ...prev,
      dependents: prev.dependents.map((dep, i) => 
        i === index ? { ...dep, [field]: value } : dep
      )
    }))
    
    // Mark field as touched
    const fieldKey = `dependent.${index}.${field}`
    setTouchedFields(prev => ({ ...prev, [fieldKey]: true }))
  }

  // Handle field blur to show validation errors
  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }))
  }

  // Function to determine if error should be shown
  const shouldShowError = (field: string) => {
    return showErrors || touchedFields[field]
  }

  const requiresDependents = () => {
    return formData.medicalTier.includes('spouse') || 
           formData.medicalTier.includes('children') || 
           formData.medicalTier.includes('family') ||
           (formData.dentalCoverage && (formData.dentalTier.includes('spouse') || formData.dentalTier.includes('children') || formData.dentalTier.includes('family'))) ||
           (formData.visionCoverage && (formData.visionTier.includes('spouse') || formData.visionTier.includes('children') || formData.visionTier.includes('family')))
  }

  const validateForm = (): boolean => {
    // For health insurance, basic form is valid if either:
    // 1. Coverage is waived OR
    // 2. At least medical plan is selected
    const basicValid = formData.isWaived || formData.medicalPlan !== '';
    
    // If dependents are required, ensure they are filled
    let dependentsValid = true;
    if (requiresDependents() && !formData.isWaived) {
      dependentsValid = formData.dependents.length > 0 && formData.irsDependentConfirmation;
    }
    
    const formIsValid = basicValid && dependentsValid;
    setIsValid(formIsValid);
    
    // Notify parent component
    if (onValidationChange) {
      onValidationChange(formIsValid);
    }
    
    return formIsValid;
  };

  const handleSubmit = () => {
    console.log('Health Insurance Form - handleSubmit called')
    console.log('Form data:', formData)
    setShowErrors(true) // Show all errors when user tries to submit
    const isFormValid = validateForm()
    console.log('Is form valid?', isFormValid)
    if (isFormValid) {
      console.log('Calling onSave with formData:', formData)
      onSave(formData)
      if (onNext) onNext()
    } else {
      console.log('Form validation failed')
    }
  }

  if (formData.isWaived) {
    return (
      <div className="space-y-8">
        {/* Waiver Header - Enhanced */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{t('health_insurance')}</h2>
            <p className="text-lg text-red-600 font-medium mt-2">Coverage Waiver</p>
          </div>

          {/* Professional divider */}
          <div className="flex items-center justify-center space-x-4 py-3">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-red-300"></div>
            <Shield className="h-4 w-4 text-red-500" />
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-red-300"></div>
          </div>
        </div>

        <Card className="border-l-4 border-l-red-500 shadow-lg max-w-3xl mx-auto">
          <CardHeader className="bg-gradient-to-r from-red-50 to-white">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Coverage Waiver
            </CardTitle>
            <CardDescription className="text-red-600">
              You have chosen to decline health insurance coverage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <Label>Reason for declining coverage</Label>
              <RadioGroup 
                value={formData.waiveReason} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, waiveReason: value }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no_coverage_preference" id="no_coverage_preference" />
                  <Label htmlFor="no_coverage_preference">{t('no_coverage_preference')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spouse_coverage" id="spouse_coverage" />
                  <Label htmlFor="spouse_coverage">{t('spouse_coverage')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other_coverage" id="other_coverage" />
                  <Label htmlFor="other_coverage">{t('other_coverage')}</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.waiveReason === 'other_coverage' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>{t('other_coverage_type')}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {['employer_group', 'individual_policy', 'medicare', 'cobra', 'tricare', 'medicaid'].map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={formData.otherCoverageType.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({ ...prev, otherCoverageType: prev.otherCoverageType + ' ' + type }))
                            } else {
                              setFormData(prev => ({ ...prev, otherCoverageType: prev.otherCoverageType.replace(type, '').trim() }))
                            }
                          }}
                        />
                        <Label htmlFor={type}>{t(type)}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setFormData(prev => ({ ...prev, isWaived: false }))}
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Change Mind - Select Coverage
            </Button>
          </CardContent>
        </Card>

        {/* Navigation - Enhanced */}
        <div className="flex justify-between items-center pt-4 max-w-3xl mx-auto border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onBack}
            className="px-6"
          >
            {t('back')}
          </Button>
          <Button
            onClick={handleSubmit}
            className="px-8 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-md"
          >
            {t('save_continue')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section - Enhanced */}
      <div className="text-center space-y-3 pb-4 border-b border-gray-200">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('health_insurance')}</h2>
          <p className="text-gray-600 text-sm mt-2 leading-relaxed">{t('health_insurance_desc')}</p>
          <Badge variant="outline" className="mt-2 text-xs font-medium">{t('plan_year')}</Badge>
        </div>
      </div>

      {/* Medical Coverage - Enhanced */}
      <Card className="border-l-4 border-l-blue-500 shadow-md">
        <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/50 to-transparent">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
            <span>{t('medical_coverage')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">{t('select_plan')}</Label>
              <Select 
                value={formData.medicalPlan} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, medicalPlan: value }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select medical plan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEDICAL_PLANS).map(([key, plan]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-sm">{plan.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          ${plan.costs.employee}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">{t('select_tier')}</Label>
              <Select 
                value={formData.medicalTier} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, medicalTier: value }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select coverage tier" />
                </SelectTrigger>
                <SelectContent>
                  {TIER_OPTIONS.map(tier => (
                    <SelectItem key={tier.value} value={tier.value}>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-sm">{language === 'es' ? tier.labelEs : tier.label}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          ${formData.medicalPlan ? MEDICAL_PLANS[formData.medicalPlan as keyof typeof MEDICAL_PLANS]?.costs[tier.value as keyof typeof MEDICAL_PLANS['hra_6k']['costs']] || 0 : 0}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Coverage - Enhanced */}
      <Card className="border-l-4 border-l-purple-500 shadow-md">
        <CardHeader className="pb-4 bg-gradient-to-r from-purple-50/50 to-transparent">
          <CardTitle className="text-lg">{t('additional_coverage')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dental Coverage */}
            <div className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">{t('dental_coverage')}</Label>
                <Checkbox
                  checked={formData.dentalCoverage}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dentalCoverage: !!checked }))}
                />
              </div>
              
              {formData.dentalCoverage && (
                <Select 
                  value={formData.dentalTier} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dentalTier: value }))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select dental tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_OPTIONS.map(tier => (
                      <SelectItem key={tier.value} value={tier.value}>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-sm">{language === 'es' ? tier.labelEs : tier.label}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            ${DENTAL_COSTS[tier.value as keyof typeof DENTAL_COSTS]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Vision Coverage */}
            <div className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">{t('vision_coverage')}</Label>
                <Checkbox
                  checked={formData.visionCoverage}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, visionCoverage: !!checked }))}
                />
              </div>
              
              {formData.visionCoverage && (
                <Select 
                  value={formData.visionTier} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, visionTier: value }))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select vision tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_OPTIONS.map(tier => (
                      <SelectItem key={tier.value} value={tier.value}>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-sm">{language === 'es' ? tier.labelEs : tier.label}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            ${VISION_COSTS[tier.value as keyof typeof VISION_COSTS]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dependents Section - Enhanced */}
      {requiresDependents() && (
        <Card className="border-l-4 border-l-green-500 shadow-md">
          <CardHeader className="pb-4 bg-gradient-to-r from-green-50/50 to-transparent">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <span>{t('dependents_info')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.dependents.map((dependent, index) => (
              <div key={index} className="p-3 border rounded space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-sm">Dependent {index + 1}</h4>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => removeDependent(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">{t('first_name')}</Label>
                    <Input
                      value={dependent.firstName}
                      onChange={(e) => updateDependent(index, 'firstName', e.target.value)}
                      onBlur={() => handleFieldBlur(`dependent.${index}.firstName`)}
                      size="xs"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t('last_name')}</Label>
                    <Input
                      value={dependent.lastName}
                      onChange={(e) => updateDependent(index, 'lastName', e.target.value)}
                      onBlur={() => handleFieldBlur(`dependent.${index}.lastName`)}
                      size="xs"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t('relationship')}</Label>
                    <Select 
                      value={dependent.relationship} 
                      onValueChange={(value) => updateDependent(index, 'relationship', value)}
                    >
                      <SelectTrigger className="h-6">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIP_OPTIONS.map(rel => (
                          <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t('date_of_birth')}</Label>
                    <Input
                      type="date"
                      value={dependent.dateOfBirth}
                      onChange={(e) => updateDependent(index, 'dateOfBirth', e.target.value)}
                      onBlur={() => handleFieldBlur(`dependent.${index}.dateOfBirth`)}
                      size="xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t('ssn')}</Label>
                    <Input
                      value={dependent.ssn}
                      onChange={(e) => updateDependent(index, 'ssn', e.target.value)}
                      onBlur={() => handleFieldBlur(`dependent.${index}.ssn`)}
                      placeholder=""
                      size="xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t('gender')}</Label>
                    <Select 
                      value={dependent.gender} 
                      onValueChange={(value) => updateDependent(index, 'gender', value as 'M' | 'F')}
                    >
                      <SelectTrigger className="h-6">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">{t('male')}</SelectItem>
                        <SelectItem value="F">{t('female')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addDependent} size="sm" className="w-full">
              <Plus className="h-3 w-3 mr-1" />
              {t('add_dependent')}
            </Button>

            {/* Compact Questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <Label className="text-xs">{t('stepchildren_question')}</Label>
                <div className="flex space-x-3 mt-1">
                  <label className="flex items-center space-x-1">
                    <input 
                      type="radio" 
                      name="stepchildren" 
                      checked={formData.hasStepchildren} 
                      onChange={() => setFormData(prev => ({ ...prev, hasStepchildren: true }))}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">{t('yes')}</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input 
                      type="radio" 
                      name="stepchildren" 
                      checked={!formData.hasStepchildren} 
                      onChange={() => setFormData(prev => ({ ...prev, hasStepchildren: false }))}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">{t('no')}</span>
                  </label>
                </div>
              </div>
              
              <div>
                <Label className="text-xs">{t('support_question')}</Label>
                <div className="flex space-x-3 mt-1">
                  <label className="flex items-center space-x-1">
                    <input 
                      type="radio" 
                      name="support" 
                      checked={formData.dependentsSupported} 
                      onChange={() => setFormData(prev => ({ ...prev, dependentsSupported: true }))}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">{t('yes')}</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input 
                      type="radio" 
                      name="support" 
                      checked={!formData.dependentsSupported} 
                      onChange={() => setFormData(prev => ({ ...prev, dependentsSupported: false }))}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">{t('no')}</span>
                  </label>
                </div>
              </div>
            </div>

            {formData.hasStepchildren && (
              <div>
                <Label className="text-xs">{t('stepchildren_names')}</Label>
                <Input
                  value={formData.stepchildrenNames}
                  onChange={(e) => setFormData(prev => ({ ...prev, stepchildrenNames: e.target.value }))}
                  onBlur={() => handleFieldBlur('stepchildrenNames')}
                  placeholder=""
                  size="xs"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="irs_confirmation"
                checked={formData.irsDependentConfirmation}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, irsDependentConfirmation: !!checked }))}
                className="w-3 h-3"
              />
              <Label htmlFor="irs_confirmation" className="text-xs">
                {t('irs_confirmation')}
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Summary & Options - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cost Summary Card */}
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <span className="text-blue-900">{t('cost_summary')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('medical')}:</span>
                <span className="font-medium">${formData.medicalCost.toFixed(2)}</span>
              </div>
              {formData.dentalCoverage && (
                <div className="flex justify-between text-sm">
                  <span>{t('dental')}:</span>
                  <span className="font-medium">${formData.dentalCost.toFixed(2)}</span>
                </div>
              )}
              {formData.visionCoverage && (
                <div className="flex justify-between text-sm">
                  <span>{t('vision')}:</span>
                  <span className="font-medium">${formData.visionCost.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>{t('total')}:</span>
                <span>${formData.totalBiweeklyCost.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-600">
                Bi-weekly payroll deduction
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Waiver Options Card */}
        <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-white shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <span className="text-red-900">Coverage Options</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="decline_coverage"
                checked={formData.isWaived}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isWaived: !!checked }))}
              />
              <Label htmlFor="decline_coverage" className="text-red-600 font-medium text-sm">
                {t('decline_coverage')}
              </Label>
            </div>
            
            <Alert className="bg-blue-50 border-blue-200">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <AlertDescription className="text-xs text-blue-900">
                  <strong>{t('special_enrollment')}</strong><br />
                  <span className="text-blue-800">{t('enrollment_notice')}</span>
                </AlertDescription>
              </div>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Navigation - Enhanced */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onBack}
          size="default"
          className="px-6"
        >
          {t('back')}
        </Button>
        <Button
          onClick={handleSubmit}
          className="px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
          size="default"
        >
          {t('save_continue')}
        </Button>
      </div>
    </div>
  )
}