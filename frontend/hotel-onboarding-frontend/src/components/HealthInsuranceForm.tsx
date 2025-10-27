import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Shield, Users, DollarSign, Info, Plus, Trash2, AlertTriangle } from 'lucide-react'
// Standard UI components (still needed for custom RadioGroup implementations in plan selection)
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
// Mobile-optimized components
import { MobileInput } from '@/components/job-application/mobile-optimized/MobileInput'
import { MobileLabel } from '@/components/job-application/mobile-optimized/MobileLabel'
import { MobileSelect, MobileSelectItem } from '@/components/job-application/mobile-optimized/MobileSelect'
import { MobileRadioGroup } from '@/components/job-application/mobile-optimized/MobileRadioGroup'
import { MobileCheckbox } from '@/components/job-application/mobile-optimized/MobileCheckbox'

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

// Medical plan options from the paper packet - Organized by category
const MEDICAL_PLAN_CATEGORIES = {
  'uhc_medical': {
    label: 'Medical: United Healthcare',
    plans: {
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
      }
    }
  },
  'aci_limited': {
    label: 'Limited ACI Benefits',
    plans: {
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
  }
}

// Flatten for backward compatibility
const MEDICAL_PLANS = Object.values(MEDICAL_PLAN_CATEGORIES).reduce((acc, category) => {
  return { ...acc, ...category.plans }
}, {} as Record<string, any>)

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
  const [isDirty, setIsDirty] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Update form data when initialData changes (for navigation back)
  // Only apply if form is not dirty (user hasn't made local changes)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0 && !isDirty) {
      console.log('HealthInsuranceForm - Updating from initialData:', initialData)
      setFormData(prevData => ({
        ...prevData,
        ...initialData
      }))
    }
  }, [initialData])

  // Clear plan selections when declining insurance
  useEffect(() => {
    if (formData.isWaived) {
      console.log('HealthInsuranceForm - Clearing plan data because insurance is waived')
      setFormData(prev => ({
        ...prev,
        medicalPlan: '',
        medicalTier: 'employee',
        medicalCost: 0,
        dentalCoverage: false,
        dentalTier: 'employee',
        dentalCost: 0,
        visionCoverage: false,
        visionTier: 'employee',
        visionCost: 0,
        totalBiweeklyCost: 0,
        dependents: [],
        hasStepchildren: false,
        stepchildrenNames: '',
        dependentsSupported: false,
        irsDependentConfirmation: false,
      }))
    }
  }, [formData.isWaived])

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
    const errors: string[] = []
    
    // If insurance is waived, only validate waive reason
    if (formData.isWaived) {
      if (!formData.waiveReason || formData.waiveReason.trim() === '') {
        errors.push('Please provide a reason for declining health insurance coverage')
      }
      const formIsValid = errors.length === 0
      setIsValid(formIsValid)
      setValidationErrors(errors)
      
      if (onValidationChange) {
        onValidationChange(formIsValid)
      }
      
      return formIsValid
    }
    
    // Basic validation for plan selection
    const basicValid = formData.medicalPlan !== ''
    if (!basicValid) {
      errors.push('Please select a medical plan or decline coverage')
    }
    
    // Dependent validation
    let dependentsValid = true
    if (requiresDependents()) {
      if (formData.dependents.length === 0) {
        errors.push('Please add at least one dependent for your selected coverage tier')
        dependentsValid = false
      }
      
      if (!formData.irsDependentConfirmation) {
        errors.push('Please confirm that all dependents meet the IRS Section 152 definition')
        dependentsValid = false
      }
    }
    
    const formIsValid = basicValid && dependentsValid
    setIsValid(formIsValid)
    setValidationErrors(errors)
    
    // Notify parent component
    if (onValidationChange) {
      onValidationChange(formIsValid)
    }
    
    return formIsValid
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
      setIsDirty(false) // Reset dirty flag after successful save
      if (onNext) onNext()
    } else {
      console.log('Form validation failed')
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Handler for plan changes that marks form as dirty
  const handlePlanChange = (value: string) => {
    setFormData(prev => ({ ...prev, medicalPlan: value }))
    setIsDirty(true)
  }

  if (formData.isWaived) {
    return (
      <div className="space-y-[clamp(2rem,5vw,3rem)]">
        {/* Waiver Header - Enhanced */}
        <div className="text-center space-y-[clamp(1rem,3vw,1.5rem)]">
          <div className="inline-flex items-center justify-center w-[clamp(5rem,12vw,6rem)] h-[clamp(5rem,12vw,6rem)] rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
            <Shield className="h-[clamp(2.5rem,6vw,3rem)] w-[clamp(2.5rem,6vw,3rem)] text-white" />
          </div>
          <div>
            <h2 className="text-[clamp(1.875rem,5vw,2.5rem)] font-bold text-gray-900">{t('health_insurance')}</h2>
            <p className="text-[clamp(1.125rem,3vw,1.5rem)] text-red-600 font-medium mt-[clamp(0.5rem,1.5vw,0.75rem)]">Coverage Waiver</p>
          </div>

          {/* Professional divider */}
          <div className="flex items-center justify-center gap-[clamp(1rem,3vw,1.5rem)] py-[clamp(0.75rem,2vw,1rem)]">
            <div className="h-px w-[clamp(5rem,12vw,6rem)] bg-gradient-to-r from-transparent to-red-300"></div>
            <Shield className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-red-500" />
            <div className="h-px w-[clamp(5rem,12vw,6rem)] bg-gradient-to-l from-transparent to-red-300"></div>
          </div>
        </div>

        <Card className="border-l-4 border-l-red-500 shadow-lg max-w-3xl mx-auto">
          <CardHeader className="bg-gradient-to-r from-red-50 to-white p-[clamp(1rem,3vw,1.5rem)]">
            <CardTitle className="text-red-700 flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(1.125rem,3vw,1.25rem)]">
              <AlertTriangle className="h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)]" />
              Coverage Waiver
            </CardTitle>
            <CardDescription className="text-red-600 text-[clamp(0.875rem,2.5vw,1rem)]">
              You have chosen to decline health insurance coverage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-[clamp(1.5rem,4vw,2rem)] pt-[clamp(1.5rem,4vw,2rem)] p-[clamp(1rem,3vw,1.5rem)]">
            <div>
              <MobileLabel>Reason for declining coverage</MobileLabel>
              <MobileRadioGroup
                value={formData.waiveReason}
                onValueChange={(value) => setFormData(prev => ({ ...prev, waiveReason: value }))}
                options={[
                  { value: 'no_coverage_preference', label: t('no_coverage_preference') },
                  { value: 'spouse_coverage', label: t('spouse_coverage') },
                  { value: 'other_coverage', label: t('other_coverage') }
                ]}
              />
            </div>

            {formData.waiveReason === 'other_coverage' && (
              <div className="space-y-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,3vw,1.5rem)] bg-gray-50 rounded-lg">
                <div>
                  <MobileLabel>{t('other_coverage_type')}</MobileLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(0.5rem,1.5vw,0.75rem)] mt-[clamp(0.5rem,1.5vw,0.75rem)]">
                    {['employer_group', 'individual_policy', 'medicare', 'cobra', 'tricare', 'medicaid'].map(type => (
                      <MobileCheckbox
                        key={type}
                        id={type}
                        label={t(type)}
                        checked={formData.otherCoverageType.includes(type)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ ...prev, otherCoverageType: prev.otherCoverageType + ' ' + type }))
                          } else {
                            setFormData(prev => ({ ...prev, otherCoverageType: prev.otherCoverageType.replace(type, '').trim() }))
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => {
                console.log('HealthInsuranceForm - Switching back to plan selection, clearing waive data')
                setFormData(prev => ({
                  ...prev,
                  isWaived: false,
                  waiveReason: '',
                  otherCoverageType: '',
                  otherCoverageDetails: ''
                }))
                setIsDirty(true)
              }}
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)] flex items-center justify-center"
            >
              Change Mind - Select Coverage
            </Button>
          </CardContent>
        </Card>

        {/* Navigation - Enhanced */}
        <div className="flex justify-between items-center pt-[clamp(1rem,3vw,1.5rem)] max-w-3xl mx-auto border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onBack}
            className="px-[clamp(1.5rem,4vw,2rem)] h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)] flex items-center justify-center"
          >
            {t('back')}
          </Button>
          <Button
            onClick={handleSubmit}
            className="px-[clamp(2rem,5vw,3rem)] bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-md h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)] flex items-center justify-center"
          >
            {t('save_continue')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-[clamp(1.5rem,4vw,2rem)]">
      {/* Validation Errors Alert */}
      {showErrors && validationErrors.length > 0 && (
        <Alert className="bg-red-50 border-red-300 shadow-sm p-[clamp(1rem,3vw,1.5rem)]">
          <div className="flex items-start gap-[clamp(0.75rem,2vw,1rem)]">
            <div className="flex-shrink-0 w-[clamp(2.5rem,6vw,3rem)] h-[clamp(2.5rem,6vw,3rem)] rounded-full bg-red-500 flex items-center justify-center">
              <AlertTriangle className="h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)] text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(0.875rem,2.5vw,1rem)]">Please complete the following:</h3>
              <ul className="list-disc list-inside space-y-[clamp(0.25rem,1vw,0.5rem)]">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-[clamp(0.875rem,2.5vw,1rem)] text-red-800">{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </Alert>
      )}

      {/* Medical Coverage - Enhanced */}
      <Card className="border-l-4 border-l-blue-500 shadow-md">
        <CardHeader className="pb-[clamp(1rem,3vw,1.5rem)] bg-gradient-to-r from-blue-50/50 to-transparent p-[clamp(1rem,3vw,1.5rem)]">
          <CardTitle className="flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(1.125rem,3vw,1.5rem)]">
            <div className="w-[clamp(2rem,5vw,2.5rem)] h-[clamp(2rem,5vw,2.5rem)] rounded-lg bg-blue-100 flex items-center justify-center">
              <Shield className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-blue-600" />
            </div>
            <span>{t('medical_coverage')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,3vw,1.5rem)]">
          {/* Two-column grid for UHC and ACI sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[clamp(1rem,3vw,1.5rem)] mb-[clamp(1rem,3vw,1.5rem)]">
            {/* UHC Medical Section */}
            <Card className={`border-2 transition-all ${
              formData.medicalPlan && Object.keys(MEDICAL_PLAN_CATEGORIES.uhc_medical.plans).includes(formData.medicalPlan)
                ? 'border-blue-500 shadow-md'
                : 'border-gray-200 hover:border-blue-300'
            }`}>
              <CardHeader className="pb-[clamp(0.75rem,2vw,1rem)] p-[clamp(1rem,3vw,1.5rem)]">
                <CardTitle className="text-[clamp(1rem,2.5vw,1.125rem)] text-blue-700">
                  {MEDICAL_PLAN_CATEGORIES.uhc_medical.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-[clamp(1rem,3vw,1.5rem)]">
                <RadioGroup value={formData.medicalPlan} onValueChange={handlePlanChange}>
                  <div className="space-y-[clamp(0.75rem,2vw,1rem)]">
                    {Object.entries(MEDICAL_PLAN_CATEGORIES.uhc_medical.plans).map(([key, plan]) => (
                      <div key={key} className={`flex items-start gap-[clamp(0.75rem,2vw,1rem)] p-[clamp(0.75rem,2vw,1rem)] rounded-lg border transition-colors ${
                        formData.medicalPlan === key
                          ? 'bg-blue-50 border-blue-300'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <RadioGroupItem value={key} id={key} className="mt-[clamp(0.25rem,1vw,0.375rem)]" />
                        <Label htmlFor={key} className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-start">
                            <span className="text-[clamp(0.875rem,2.5vw,1rem)] font-medium">{plan.name}</span>
                          </div>
                          <div className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-600 mt-[clamp(0.25rem,1vw,0.375rem)]">
                            ${plan.costs.employee} bi-weekly
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* ACI Limited Benefits Section */}
            <Card className={`border-2 transition-all ${
              formData.medicalPlan && Object.keys(MEDICAL_PLAN_CATEGORIES.aci_limited.plans).includes(formData.medicalPlan)
                ? 'border-purple-500 shadow-md'
                : 'border-gray-200 hover:border-purple-300'
            }`}>
              <CardHeader className="pb-[clamp(0.75rem,2vw,1rem)] p-[clamp(1rem,3vw,1.5rem)]">
                <CardTitle className="text-[clamp(1rem,2.5vw,1.125rem)] text-purple-700">
                  {MEDICAL_PLAN_CATEGORIES.aci_limited.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-[clamp(1rem,3vw,1.5rem)]">
                <RadioGroup value={formData.medicalPlan} onValueChange={handlePlanChange}>
                  <div className="space-y-[clamp(0.75rem,2vw,1rem)]">
                    {Object.entries(MEDICAL_PLAN_CATEGORIES.aci_limited.plans).map(([key, plan]) => (
                      <div key={key} className={`flex items-start gap-[clamp(0.75rem,2vw,1rem)] p-[clamp(0.75rem,2vw,1rem)] rounded-lg border transition-colors ${
                        formData.medicalPlan === key
                          ? 'bg-purple-50 border-purple-300'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <RadioGroupItem value={key} id={key} className="mt-[clamp(0.25rem,1vw,0.375rem)]" />
                        <Label htmlFor={key} className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-start">
                            <span className="text-[clamp(0.875rem,2.5vw,1rem)] font-medium">{plan.name}</span>
                          </div>
                          <div className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-600 mt-[clamp(0.25rem,1vw,0.375rem)]">
                            ${plan.costs.employee} bi-weekly
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Coverage Tier Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(0.75rem,2vw,1rem)]">
            <div>
              <MobileLabel>{t('select_tier')}</MobileLabel>
              <MobileSelect
                value={formData.medicalTier}
                onValueChange={(value) => setFormData(prev => ({ ...prev, medicalTier: value }))}
                placeholder="Select coverage tier"
              >
                {TIER_OPTIONS.map(tier => {
                  const selectedPlan = MEDICAL_PLANS[formData.medicalPlan as keyof typeof MEDICAL_PLANS];
                  const cost = selectedPlan?.costs[tier.value as keyof typeof selectedPlan.costs] || 0;
                  return (
                    <MobileSelectItem key={tier.value} value={tier.value}>
                      {language === 'es' ? tier.labelEs : tier.label} - ${cost}
                    </MobileSelectItem>
                  );
                })}
              </MobileSelect>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Coverage - Enhanced */}
      <Card className="border-l-4 border-l-purple-500 shadow-md">
        <CardHeader className="pb-[clamp(1rem,3vw,1.5rem)] bg-gradient-to-r from-purple-50/50 to-transparent p-[clamp(1rem,3vw,1.5rem)]">
          <CardTitle className="text-[clamp(1.125rem,3vw,1.5rem)]">{t('additional_coverage')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,3vw,1.5rem)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(1rem,3vw,1.5rem)]">
            {/* Dental Coverage */}
            <div className="border rounded p-[clamp(0.75rem,2vw,1rem)]">
              <MobileCheckbox
                id="dental-coverage"
                label={t('dental_coverage')}
                checked={formData.dentalCoverage}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dentalCoverage: !!checked }))}
              />

              {formData.dentalCoverage && (
                <div className="mt-[clamp(0.75rem,2vw,1rem)]">
                  <MobileSelect
                    value={formData.dentalTier}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, dentalTier: value }))}
                    placeholder="Select dental tier"
                  >
                    {TIER_OPTIONS.map(tier => (
                      <MobileSelectItem key={tier.value} value={tier.value}>
                        {language === 'es' ? tier.labelEs : tier.label} - ${DENTAL_COSTS[tier.value as keyof typeof DENTAL_COSTS]}
                      </MobileSelectItem>
                    ))}
                  </MobileSelect>
                </div>
              )}
            </div>

            {/* Vision Coverage */}
            <div className="border rounded p-[clamp(0.75rem,2vw,1rem)]">
              <MobileCheckbox
                id="vision-coverage"
                label={t('vision_coverage')}
                checked={formData.visionCoverage}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, visionCoverage: !!checked }))}
              />

              {formData.visionCoverage && (
                <div className="mt-[clamp(0.75rem,2vw,1rem)]">
                  <MobileSelect
                    value={formData.visionTier}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, visionTier: value }))}
                    placeholder="Select vision tier"
                  >
                    {TIER_OPTIONS.map(tier => (
                      <MobileSelectItem key={tier.value} value={tier.value}>
                        {language === 'es' ? tier.labelEs : tier.label} - ${VISION_COSTS[tier.value as keyof typeof VISION_COSTS]}
                      </MobileSelectItem>
                    ))}
                  </MobileSelect>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dependents Section - Enhanced */}
      {requiresDependents() && (
        <Card className="border-l-4 border-l-green-500 shadow-md">
          <CardHeader className="pb-[clamp(1rem,3vw,1.5rem)] bg-gradient-to-r from-green-50/50 to-transparent p-[clamp(1rem,3vw,1.5rem)]">
            <CardTitle className="flex items-center justify-between text-[clamp(1.125rem,3vw,1.5rem)]">
              <div className="flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)]">
                <div className="w-[clamp(2rem,5vw,2.5rem)] h-[clamp(2rem,5vw,2.5rem)] rounded-lg bg-green-100 flex items-center justify-center">
                  <Users className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-green-600" />
                </div>
                <span>{t('dependents_info')}</span>
              </div>
              <Badge variant="destructive" className="text-[clamp(0.75rem,2vw,0.875rem)]">Required</Badge>
            </CardTitle>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600 mt-[clamp(0.5rem,1.5vw,0.75rem)]">
              Your selected coverage tier requires dependent information. Please add at least one dependent below.
            </p>
          </CardHeader>
          <CardContent className="space-y-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,3vw,1.5rem)]">
            {formData.dependents.map((dependent, index) => (
              <div key={index} className="p-[clamp(0.75rem,2vw,1rem)] border rounded space-y-[clamp(0.5rem,1.5vw,0.75rem)]">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-[clamp(0.875rem,2.5vw,1rem)]">Dependent {index + 1}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeDependent(index)}
                    className="h-[clamp(2rem,5vw,2.5rem)] px-[clamp(0.75rem,2vw,1rem)]"
                  >
                    <Trash2 className="h-[clamp(0.75rem,2vw,1rem)] w-[clamp(0.75rem,2vw,1rem)]" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[clamp(0.5rem,1.5vw,0.75rem)]">
                  <div>
                    <MobileLabel required>
                      {t('first_name')}
                    </MobileLabel>
                    <MobileInput
                      value={dependent.firstName}
                      onChange={(e) => updateDependent(index, 'firstName', e.target.value)}
                      onBlur={() => handleFieldBlur(`dependent.${index}.firstName`)}
                      placeholder=""
                    />
                  </div>
                  <div>
                    <MobileLabel required>
                      {t('last_name')}
                    </MobileLabel>
                    <MobileInput
                      value={dependent.lastName}
                      onChange={(e) => updateDependent(index, 'lastName', e.target.value)}
                      onBlur={() => handleFieldBlur(`dependent.${index}.lastName`)}
                      placeholder=""
                    />
                  </div>
                  <div>
                    <MobileLabel required>
                      {t('relationship')}
                    </MobileLabel>
                    <MobileSelect
                      value={dependent.relationship}
                      onValueChange={(value) => updateDependent(index, 'relationship', value)}
                      placeholder="Select"
                    >
                      {RELATIONSHIP_OPTIONS.map(rel => (
                        <MobileSelectItem key={rel} value={rel}>{rel}</MobileSelectItem>
                      ))}
                    </MobileSelect>
                  </div>
                  <div>
                    <MobileLabel required>
                      {t('date_of_birth')}
                    </MobileLabel>
                    <MobileInput
                      type="date"
                      value={dependent.dateOfBirth}
                      onChange={(e) => updateDependent(index, 'dateOfBirth', e.target.value)}
                      onBlur={() => handleFieldBlur(`dependent.${index}.dateOfBirth`)}
                      mobileKeyboard="numeric"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(0.5rem,1.5vw,0.75rem)]">
                  <div>
                    <MobileLabel>{t('ssn')}</MobileLabel>
                    <MobileInput
                      value={dependent.ssn}
                      onChange={(e) => updateDependent(index, 'ssn', e.target.value)}
                      onBlur={() => handleFieldBlur(`dependent.${index}.ssn`)}
                      placeholder="XXX-XX-XXXX"
                      mobileKeyboard="numeric"
                    />
                  </div>
                  <div>
                    <MobileLabel>{t('gender')}</MobileLabel>
                    <MobileSelect
                      value={dependent.gender}
                      onValueChange={(value) => updateDependent(index, 'gender', value as 'M' | 'F')}
                      placeholder="Select"
                    >
                      <MobileSelectItem value="M">{t('male')}</MobileSelectItem>
                      <MobileSelectItem value="F">{t('female')}</MobileSelectItem>
                    </MobileSelect>
                  </div>
                </div>
              </div>
            ))}

            {formData.dependents.length === 0 && (
              <Alert className="bg-blue-50 border-blue-200 p-[clamp(1rem,3vw,1.5rem)]">
                <Info className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-blue-600" />
                <AlertDescription className="text-[clamp(0.875rem,2.5vw,1rem)] text-blue-900">
                  Click "Add Dependent" below to add spouse, children, or other eligible dependents to your coverage.
                </AlertDescription>
              </Alert>
            )}

            <Button
              variant="outline"
              onClick={addDependent}
              className="w-full border-green-500 text-green-700 hover:bg-green-50 hover:border-green-600 h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)] flex items-center justify-center gap-[clamp(0.5rem,1.5vw,0.75rem)]"
            >
              <Plus className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)]" />
              {t('add_dependent')}
            </Button>

            {/* Compact Questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(0.75rem,2vw,1rem)] pt-[clamp(0.5rem,1.5vw,0.75rem)] border-t">
              <div>
                <MobileLabel>{t('stepchildren_question')}</MobileLabel>
                <MobileRadioGroup
                  value={formData.hasStepchildren ? 'yes' : 'no'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, hasStepchildren: value === 'yes' }))}
                  options={[
                    { value: 'yes', label: t('yes') },
                    { value: 'no', label: t('no') }
                  ]}
                />
              </div>

              <div>
                <MobileLabel>{t('support_question')}</MobileLabel>
                <MobileRadioGroup
                  value={formData.dependentsSupported ? 'yes' : 'no'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dependentsSupported: value === 'yes' }))}
                  options={[
                    { value: 'yes', label: t('yes') },
                    { value: 'no', label: t('no') }
                  ]}
                />
              </div>
            </div>

            {formData.hasStepchildren && (
              <div>
                <MobileLabel>{t('stepchildren_names')}</MobileLabel>
                <MobileInput
                  value={formData.stepchildrenNames}
                  onChange={(e) => setFormData(prev => ({ ...prev, stepchildrenNames: e.target.value }))}
                  onBlur={() => handleFieldBlur('stepchildrenNames')}
                  placeholder=""
                />
              </div>
            )}

            <div className="flex items-start gap-[clamp(0.75rem,2vw,1rem)] p-[clamp(1rem,3vw,1.5rem)] bg-yellow-50 border-2 border-yellow-300 rounded-lg">
              <MobileCheckbox
                id="irs_confirmation"
                label={`Required: ${t('irs_confirmation')}`}
                checked={formData.irsDependentConfirmation}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, irsDependentConfirmation: !!checked }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Summary & Options - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(1.5rem,4vw,2rem)]">
        {/* Cost Summary Card */}
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-md">
          <CardHeader className="pb-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,3vw,1.5rem)]">
            <CardTitle className="flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(1.125rem,3vw,1.5rem)]">
              <div className="w-[clamp(2rem,5vw,2.5rem)] h-[clamp(2rem,5vw,2.5rem)] rounded-lg bg-blue-500 flex items-center justify-center">
                <DollarSign className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-white" />
              </div>
              <span className="text-blue-900">{t('cost_summary')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-[clamp(1rem,3vw,1.5rem)]">
            <div className="space-y-[clamp(0.5rem,1.5vw,0.75rem)]">
              <div className="flex justify-between text-[clamp(0.875rem,2.5vw,1rem)]">
                <span>{t('medical')}:</span>
                <span className="font-medium">${formData.medicalCost.toFixed(2)}</span>
              </div>
              {formData.dentalCoverage && (
                <div className="flex justify-between text-[clamp(0.875rem,2.5vw,1rem)]">
                  <span>{t('dental')}:</span>
                  <span className="font-medium">${formData.dentalCost.toFixed(2)}</span>
                </div>
              )}
              {formData.visionCoverage && (
                <div className="flex justify-between text-[clamp(0.875rem,2.5vw,1rem)]">
                  <span>{t('vision')}:</span>
                  <span className="font-medium">${formData.visionCost.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-[clamp(1rem,2.5vw,1.125rem)]">
                <span>{t('total')}:</span>
                <span>${formData.totalBiweeklyCost.toFixed(2)}</span>
              </div>
              <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-600">
                Bi-weekly payroll deduction
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Waiver Options Card */}
        <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-white shadow-md">
          <CardHeader className="pb-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,3vw,1.5rem)]">
            <CardTitle className="flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(1.125rem,3vw,1.5rem)]">
              <div className="w-[clamp(2rem,5vw,2.5rem)] h-[clamp(2rem,5vw,2.5rem)] rounded-lg bg-red-500 flex items-center justify-center">
                <AlertTriangle className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-white" />
              </div>
              <span className="text-red-900">Coverage Options</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,3vw,1.5rem)]">
            <MobileCheckbox
              id="decline_coverage"
              label={t('decline_coverage')}
              checked={formData.isWaived}
              onCheckedChange={(checked) => {
                setFormData(prev => ({ ...prev, isWaived: !!checked }))
                setIsDirty(true)
              }}
            />

            <Alert className="bg-blue-50 border-blue-200 p-[clamp(0.75rem,2vw,1rem)]">
              <div className="flex gap-[clamp(0.5rem,1.5vw,0.75rem)]">
                <Info className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-blue-600 flex-shrink-0 mt-[clamp(0.125rem,0.5vw,0.25rem)]" />
                <AlertDescription className="text-[clamp(0.75rem,2vw,0.875rem)] text-blue-900">
                  <strong>{t('special_enrollment')}</strong><br />
                  <span className="text-blue-800">{t('enrollment_notice')}</span>
                </AlertDescription>
              </div>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Navigation - Enhanced */}
      <div className="flex justify-between items-center pt-[clamp(1.5rem,4vw,2rem)] border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onBack}
          className="px-[clamp(1.5rem,4vw,2rem)] h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)] flex items-center justify-center"
        >
          {t('back')}
        </Button>
        <Button
          onClick={handleSubmit}
          className="px-[clamp(2rem,5vw,3rem)] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)] flex items-center justify-center"
        >
          {t('save_continue')}
        </Button>
      </div>
    </div>
  )
}