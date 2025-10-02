import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Info,
  Building2,
  UserCheck,
  MessageSquare
} from 'lucide-react'
import { formValidator, ValidationRule } from '@/utils/formValidation'

interface PositionAvailabilityStepProps {
  formData: any
  updateFormData: (data: any) => void
  validationErrors: Record<string, string>
  propertyInfo: any
  onComplete: (isComplete: boolean) => void
}

// Default departments and positions if not provided by property
const defaultDepartments = [
  'Management',
  'Front Desk',
  'Housekeeping',
  'Food & Beverage',
  'Maintenance'
]

const defaultPositions = {
  'Management': ['General Manager', 'Assistant General Manager'],
  'Front Desk': ['Front Desk Agent', 'Night Auditor', 'Manager on Duty'],
  'Housekeeping': ['Housekeeper', 'Housekeeping Supervisor', 'Laundry Attendant'],
  'Food & Beverage': ['Breakfast Attendant'],
  'Maintenance': ['Maintenance Technician', 'Groundskeeper']
}

export default function PositionAvailabilityStep({
  formData,
  updateFormData,
  validationErrors: externalErrors,
  propertyInfo,
  onComplete
}: PositionAvailabilityStepProps) {
  const { t } = useTranslation()
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Function to mark all required fields as touched
  const markAllFieldsTouched = () => {
    const requiredFields = [
      'department', 'position', 'employment_type', 'start_date',
      'availability_weekends', 'availability_holidays', 'previously_employed',
      'currently_employed', 'referral_source'
    ]
    const touchedState: Record<string, boolean> = {}
    requiredFields.forEach(field => {
      touchedState[field] = true
    })
    // Also mark conditional fields if they're required
    if (formData.previously_employed === 'yes') {
      touchedState['previous_employment_details'] = true
    }
    if (formData.currently_employed === 'yes') {
      touchedState['may_contact_current_employer'] = true
    }
    if (formData.referral_source === 'employee') {
      touchedState['employee_referral_name'] = true
    }
    if (formData.referral_source === 'other') {
      touchedState['referral_source_other'] = true
    }
    setTouched(touchedState)
  }

  // Validation rules
  const validationRules: ValidationRule[] = [
    { field: 'department', required: true, type: 'string' },
    { field: 'position', required: true, type: 'string' },
    { field: 'employment_type', required: true, type: 'string' },
    { field: 'start_date', required: true, type: 'date', customValidator: (value) => {
      const today = new Date()
      const startDate = new Date(value)
      if (startDate < today) {
        return t('jobApplication.steps.positionAvailability.validation.startDatePast')
      }
      return null
    }},
    { field: 'availability_weekends', required: true, type: 'string' },
    { field: 'availability_holidays', required: true, type: 'string' },
    { field: 'previously_employed', required: true, type: 'string' },
    { field: 'currently_employed', required: true, type: 'string' },
    { field: 'referral_source', required: true, type: 'string' }
  ]

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
      department: formData.department,
      position: formData.position,
      employment_type: formData.employment_type,
      start_date: formData.start_date,
      availability_weekends: formData.availability_weekends,
      availability_holidays: formData.availability_holidays,
      previously_employed: formData.previously_employed,
      currently_employed: formData.currently_employed,
      referral_source: formData.referral_source
    }

    const result = formValidator.validateForm(stepData, validationRules)
    setLocalErrors(result.errors)

    // Additional validation for conditional fields
    let additionalErrors = { ...result.errors }
    if (formData.previously_employed === 'yes' && !formData.previous_employment_details) {
      additionalErrors.previous_employment_details = t('jobApplication.steps.positionAvailability.validation.previousEmploymentDetails')
    }
    if (formData.currently_employed === 'yes' && !formData.may_contact_current_employer) {
      additionalErrors.may_contact_current_employer = t('jobApplication.steps.positionAvailability.validation.contactEmployerRequired')
    }
    if (formData.referral_source === 'employee' && !formData.employee_referral_name) {
      additionalErrors.employee_referral_name = t('jobApplication.steps.positionAvailability.validation.employeeReferralName')
    }
    if (formData.referral_source === 'other' && !formData.referral_source_other) {
      additionalErrors.referral_source_other = t('jobApplication.steps.positionAvailability.validation.referralSourceOther')
    }

    setLocalErrors(additionalErrors)

    // Check if all required fields are filled and valid
    const isComplete = result.isValid &&
      Object.values(stepData).every(value => value !== '' && value !== undefined) &&
      Object.keys(additionalErrors).length === 0

    onComplete(isComplete)
  }

  const handleInputChange = (field: string, value: any) => {
    updateFormData({ [field]: value })
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const getError = (field: string) => {
    return touched[field] ? (localErrors[field] || externalErrors[field]) : ''
  }

  // All properties use the same departments - no variations
  const departments = defaultDepartments

  // All properties use the same positions for each department
  const positions = formData.department ?
    (defaultPositions[formData.department as keyof typeof defaultPositions] || []) : []

  return (
    <div className="space-y-6">
      {/* Position Selection Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {t('jobApplication.steps.positionAvailability.positionDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department" className="font-semibold text-gray-900">
                {t('jobApplication.steps.positionAvailability.fields.department')} *
              </Label>
              <Select
                value={formData.department || ''}
                onValueChange={(value) => {
                  handleInputChange('department', value)
                  handleInputChange('position', '') // Reset position when department changes
                }}
              >
                <SelectTrigger
                  className={`min-h-[44px] ${getError('department') ? 'border-red-500' : ''}`}
                >
                  <SelectValue placeholder={t('jobApplication.steps.positionAvailability.placeholders.selectDepartment')} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept: string) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getError('department') && (
                <p className="text-sm text-red-600">{getError('department')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position" className="font-semibold text-gray-900">
                {t('jobApplication.steps.positionAvailability.fields.position')} *
              </Label>
              <Select
                value={formData.position || ''}
                onValueChange={(value) => handleInputChange('position', value)}
                disabled={!formData.department}
              >
                <SelectTrigger
                  className={`min-h-[44px] ${getError('position') ? 'border-red-500' : ''}`}
                >
                  <SelectValue
                    placeholder={formData.department ?
                      t('jobApplication.steps.positionAvailability.placeholders.selectPosition') :
                      t('jobApplication.steps.positionAvailability.placeholders.selectDepartmentFirst')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {positions && positions.map((pos: string) => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getError('position') && (
                <p className="text-sm text-red-600">{getError('position')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employment_type" className="font-semibold text-gray-900">
                {t('jobApplication.steps.positionAvailability.fields.employmentType')} *
              </Label>
              <Select
                value={formData.employment_type || ''}
                onValueChange={(value) => handleInputChange('employment_type', value)}
              >
                <SelectTrigger
                  className={`min-h-[44px] ${getError('employment_type') ? 'border-red-500' : ''}`}
                >
                  <SelectValue placeholder={t('jobApplication.steps.positionAvailability.placeholders.selectEmploymentType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">{t('jobApplication.steps.positionAvailability.employmentTypes.fullTime')}</SelectItem>
                  <SelectItem value="part_time">{t('jobApplication.steps.positionAvailability.employmentTypes.partTime')}</SelectItem>
                  <SelectItem value="temporary">{t('jobApplication.steps.positionAvailability.employmentTypes.temporary')}</SelectItem>
                  <SelectItem value="contract">{t('jobApplication.steps.positionAvailability.employmentTypes.contract')}</SelectItem>
                </SelectContent>
              </Select>
              {getError('employment_type') && (
                <p className="text-sm text-red-600">{getError('employment_type')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="desired_salary" className="font-semibold text-gray-900">
                {t('jobApplication.steps.positionAvailability.fields.hourlyRate')}
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="desired_salary"
                  value={formData.desired_salary || ''}
                  onChange={(e) => handleInputChange('desired_salary', e.target.value)}
                  className="pl-10 h-12 text-base"
                  placeholder="15.00"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
            {t('jobApplication.steps.positionAvailability.availability')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="font-semibold text-gray-900">
                {t('jobApplication.steps.positionAvailability.fields.startDate')} *
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className={`pl-10 min-h-[44px] ${getError('start_date') ? 'border-red-500' : ''}`}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              {getError('start_date') && (
                <p className="text-sm text-red-600">{getError('start_date')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift_preference" className="font-semibold text-gray-900">
                {t('jobApplication.steps.positionAvailability.fields.shiftPreference')}
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Select
                  value={formData.shift_preference || ''}
                  onValueChange={(value) => handleInputChange('shift_preference', value)}
                >
                  <SelectTrigger className="pl-10 min-h-[44px]">
                    <SelectValue placeholder={t('jobApplication.steps.positionAvailability.placeholders.selectShift')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">{t('jobApplication.steps.positionAvailability.shiftOptions.morning')}</SelectItem>
                    <SelectItem value="afternoon">{t('jobApplication.steps.positionAvailability.shiftOptions.afternoon')}</SelectItem>
                    <SelectItem value="evening">{t('jobApplication.steps.positionAvailability.shiftOptions.evening')}</SelectItem>
                    <SelectItem value="night">{t('jobApplication.steps.positionAvailability.shiftOptions.night')}</SelectItem>
                    <SelectItem value="rotating">{t('jobApplication.steps.positionAvailability.shiftOptions.rotating')}</SelectItem>
                    <SelectItem value="any">{t('jobApplication.steps.positionAvailability.shiftOptions.any')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-3">
              <Label className="font-semibold text-gray-900">
                {t('jobApplication.steps.positionAvailability.fields.weekends')} *
              </Label>
              <RadioGroup
                value={formData.availability_weekends || ''}
                onValueChange={(value) => handleInputChange('availability_weekends', value)}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="weekends_yes" className="min-w-[20px] min-h-[20px]" />
                  <Label htmlFor="weekends_yes" className="font-normal cursor-pointer">
                    {t('common.yes')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="weekends_no" className="min-w-[20px] min-h-[20px]" />
                  <Label htmlFor="weekends_no" className="font-normal cursor-pointer">
                    {t('common.no')}
                  </Label>
                </div>
              </RadioGroup>
              {getError('availability_weekends') && (
                <p className="text-sm text-red-600">{getError('availability_weekends')}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="font-semibold text-gray-900">
                {t('jobApplication.steps.positionAvailability.fields.holidays')} *
              </Label>
              <RadioGroup
                value={formData.availability_holidays || ''}
                onValueChange={(value) => handleInputChange('availability_holidays', value)}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="holidays_yes" className="min-w-[20px] min-h-[20px]" />
                  <Label htmlFor="holidays_yes" className="font-normal cursor-pointer">
                    {t('common.yes')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="holidays_no" className="min-w-[20px] min-h-[20px]" />
                  <Label htmlFor="holidays_no" className="font-normal cursor-pointer">
                    {t('common.no')}
                  </Label>
                </div>
              </RadioGroup>
              {getError('availability_holidays') && (
                <p className="text-sm text-red-600">{getError('availability_holidays')}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Previous Employment Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            {t('jobApplication.steps.positionAvailability.previousEmployment')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-3">
            <Label className="font-semibold text-gray-900">
              {t('jobApplication.steps.positionAvailability.fields.previouslyEmployed')} *
            </Label>
            <RadioGroup
              value={formData.previously_employed || ''}
              onValueChange={(value) => handleInputChange('previously_employed', value)}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="prev_emp_no" className="min-w-[20px] min-h-[20px]" />
                <Label htmlFor="prev_emp_no" className="font-normal cursor-pointer">
                  {t('common.no')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="prev_emp_yes" className="min-w-[20px] min-h-[20px]" />
                <Label htmlFor="prev_emp_yes" className="font-normal cursor-pointer">
                  {t('common.yes')}
                </Label>
              </div>
            </RadioGroup>
            {getError('previously_employed') && (
              <p className="text-sm text-red-600">{getError('previously_employed')}</p>
            )}
          </div>

          {formData.previously_employed === 'yes' && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <Label htmlFor="previous_employment_details" className="font-semibold text-gray-900">
                {t('jobApplication.steps.positionAvailability.fields.previousDetails')} *
              </Label>
              <Textarea
                id="previous_employment_details"
                value={formData.previous_employment_details || ''}
                onChange={(e) => handleInputChange('previous_employment_details', e.target.value)}
                className={`min-h-[88px] ${getError('previous_employment_details') ? 'border-red-500' : ''}`}
                placeholder={t('jobApplication.steps.positionAvailability.placeholders.previousDetails')}
                rows={3}
              />
              {getError('previous_employment_details') && (
                <p className="text-sm text-red-600">{getError('previous_employment_details')}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="relatives_employed" className="font-semibold text-gray-900">
              {t('jobApplication.steps.positionAvailability.fields.relatives')}
            </Label>
            <Input
              id="relatives_employed"
              value={formData.relatives_employed || ''}
              onChange={(e) => handleInputChange('relatives_employed', e.target.value)}
              className="min-h-[44px]"
              placeholder={t('jobApplication.steps.positionAvailability.placeholders.relatives')}
            />
            <p className="text-xs text-gray-500">{t('jobApplication.steps.positionAvailability.hints.relatives')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Current Employment Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            {t('jobApplication.steps.positionAvailability.currentEmployment')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-3">
            <Label className="font-semibold text-gray-900">
              {t('jobApplication.steps.positionAvailability.fields.currentlyEmployed')} *
            </Label>
            <RadioGroup
              value={formData.currently_employed || ''}
              onValueChange={(value) => handleInputChange('currently_employed', value)}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="currently_employed_yes" className="min-w-[20px] min-h-[20px]" />
                <Label htmlFor="currently_employed_yes" className="font-normal cursor-pointer">
                  {t('common.yes')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="currently_employed_no" className="min-w-[20px] min-h-[20px]" />
                <Label htmlFor="currently_employed_no" className="font-normal cursor-pointer">
                  {t('common.no')}
                </Label>
              </div>
            </RadioGroup>
            {getError('currently_employed') && (
              <p className="text-sm text-red-600">{getError('currently_employed')}</p>
            )}
          </div>

          {formData.currently_employed === 'yes' && (
            <div className="space-y-3 animate-in slide-in-from-top-2">
              <Label className="font-semibold text-gray-900">
                {t('jobApplication.steps.positionAvailability.fields.contactEmployer')} *
              </Label>
              <RadioGroup
                value={formData.may_contact_current_employer || ''}
                onValueChange={(value) => handleInputChange('may_contact_current_employer', value)}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="contact_employer_yes" className="min-w-[20px] min-h-[20px]" />
                  <Label htmlFor="contact_employer_yes" className="font-normal cursor-pointer">
                    {t('common.yes')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="contact_employer_no" className="min-w-[20px] min-h-[20px]" />
                  <Label htmlFor="contact_employer_no" className="font-normal cursor-pointer">
                    {t('common.no')}
                  </Label>
                </div>
              </RadioGroup>
              {getError('may_contact_current_employer') && (
                <p className="text-sm text-red-600">{getError('may_contact_current_employer')}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Source Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            {t('jobApplication.steps.positionAvailability.fields.referralSource')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <RadioGroup
            value={formData.referral_source || ''}
            onValueChange={(value) => handleInputChange('referral_source', value)}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="employee" id="ref_employee" className="min-w-[20px] min-h-[20px]" />
                <Label htmlFor="ref_employee" className="font-normal cursor-pointer flex-1">
                  {t('jobApplication.steps.positionAvailability.fields.referralOptions.employee')}
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="indeed" id="ref_indeed" className="min-w-[20px] min-h-[20px]" />
                <Label htmlFor="ref_indeed" className="font-normal cursor-pointer flex-1">
                  {t('jobApplication.steps.positionAvailability.fields.referralOptions.indeed')}
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="newspaper" id="ref_newspaper" className="min-w-[20px] min-h-[20px]" />
                <Label htmlFor="ref_newspaper" className="font-normal cursor-pointer flex-1">
                  {t('jobApplication.steps.positionAvailability.fields.referralOptions.newspaper')}
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="craigslist" id="ref_craigslist" className="min-w-[20px] min-h-[20px]" />
                <Label htmlFor="ref_craigslist" className="font-normal cursor-pointer flex-1">
                  {t('jobApplication.steps.positionAvailability.fields.referralOptions.craigslist')}
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="walkin" id="ref_walkin" className="min-w-[20px] min-h-[20px]" />
                <Label htmlFor="ref_walkin" className="font-normal cursor-pointer flex-1">
                  {t('jobApplication.steps.positionAvailability.fields.referralOptions.walkin')}
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="dol" id="ref_dol" className="min-w-[20px] min-h-[20px]" />
                <Label htmlFor="ref_dol" className="font-normal cursor-pointer flex-1">
                  {t('jobApplication.steps.positionAvailability.fields.referralOptions.dol')}
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="other" id="ref_other" className="min-w-[20px] min-h-[20px]" />
                <Label htmlFor="ref_other" className="font-normal cursor-pointer flex-1">
                  {t('jobApplication.steps.positionAvailability.fields.referralOptions.other')}
                </Label>
              </div>
            </div>
          </RadioGroup>
          {getError('referral_source') && (
            <p className="text-sm text-red-600">{getError('referral_source')}</p>
          )}

          {formData.referral_source === 'employee' && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <Label htmlFor="employee_referral_name" className="font-semibold text-gray-900">
                {t('jobApplication.steps.positionAvailability.fields.employeeReferralName')} *
              </Label>
              <Input
                id="employee_referral_name"
                value={formData.employee_referral_name || ''}
                onChange={(e) => handleInputChange('employee_referral_name', e.target.value)}
                className={`min-h-[44px] ${getError('employee_referral_name') ? 'border-red-500' : ''}`}
                placeholder={t('jobApplication.steps.positionAvailability.placeholders.employeeReferralName')}
              />
              {getError('employee_referral_name') && (
                <p className="text-sm text-red-600">{getError('employee_referral_name')}</p>
              )}
            </div>
          )}

          {formData.referral_source === 'other' && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <Label htmlFor="referral_source_other" className="font-semibold text-gray-900">
                {t('jobApplication.steps.positionAvailability.fields.referralSourceOther')} *
              </Label>
              <Input
                id="referral_source_other"
                value={formData.referral_source_other || ''}
                onChange={(e) => handleInputChange('referral_source_other', e.target.value)}
                className={`min-h-[44px] ${getError('referral_source_other') ? 'border-red-500' : ''}`}
                placeholder={t('jobApplication.steps.positionAvailability.placeholders.referralSourceOther')}
              />
              {getError('referral_source_other') && (
                <p className="text-sm text-red-600">{getError('referral_source_other')}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}