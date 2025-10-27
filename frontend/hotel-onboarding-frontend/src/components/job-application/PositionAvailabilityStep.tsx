import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
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
import {
  MobileInput,
  MobileLabel,
  MobileSelect,
  MobileSelectItem,
  MobileRadioGroup,
  MobileTextarea,
  MobileErrorMessage,
  MobileFormField,
  MobileFormGrid
} from './mobile-optimized'

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
        <CardContent className="pt-6 space-y-[clamp(1rem,3vw,1.5rem)]">
          <MobileFormGrid columns={2}>
            <MobileFormField>
              <MobileLabel htmlFor="department" required>
                {t('jobApplication.steps.positionAvailability.fields.department')}
              </MobileLabel>
              <MobileSelect
                value={formData.department || ''}
                onValueChange={(value) => {
                  handleInputChange('department', value)
                  handleInputChange('position', '') // Reset position when department changes
                }}
                placeholder={t('jobApplication.steps.positionAvailability.placeholders.selectDepartment')}
                error={!!getError('department')}
              >
                {departments.map((dept: string) => (
                  <MobileSelectItem key={dept} value={dept}>{dept}</MobileSelectItem>
                ))}
              </MobileSelect>
              <MobileErrorMessage>{getError('department')}</MobileErrorMessage>
            </MobileFormField>

            <MobileFormField>
              <MobileLabel htmlFor="position" required>
                {t('jobApplication.steps.positionAvailability.fields.position')}
              </MobileLabel>
              <MobileSelect
                value={formData.position || ''}
                onValueChange={(value) => handleInputChange('position', value)}
                disabled={!formData.department}
                placeholder={formData.department ?
                  t('jobApplication.steps.positionAvailability.placeholders.selectPosition') :
                  t('jobApplication.steps.positionAvailability.placeholders.selectDepartmentFirst')
                }
                error={!!getError('position')}
              >
                {positions && positions.map((pos: string) => (
                  <MobileSelectItem key={pos} value={pos}>{pos}</MobileSelectItem>
                ))}
              </MobileSelect>
              <MobileErrorMessage>{getError('position')}</MobileErrorMessage>
            </MobileFormField>

            <MobileFormField>
              <MobileLabel htmlFor="employment_type" required>
                {t('jobApplication.steps.positionAvailability.fields.employmentType')}
              </MobileLabel>
              <MobileSelect
                value={formData.employment_type || ''}
                onValueChange={(value) => handleInputChange('employment_type', value)}
                placeholder={t('jobApplication.steps.positionAvailability.placeholders.selectEmploymentType')}
                error={!!getError('employment_type')}
              >
                <MobileSelectItem value="full_time">{t('jobApplication.steps.positionAvailability.employmentTypes.fullTime')}</MobileSelectItem>
                <MobileSelectItem value="part_time">{t('jobApplication.steps.positionAvailability.employmentTypes.partTime')}</MobileSelectItem>
                <MobileSelectItem value="temporary">{t('jobApplication.steps.positionAvailability.employmentTypes.temporary')}</MobileSelectItem>
                <MobileSelectItem value="contract">{t('jobApplication.steps.positionAvailability.employmentTypes.contract')}</MobileSelectItem>
              </MobileSelect>
              <MobileErrorMessage>{getError('employment_type')}</MobileErrorMessage>
            </MobileFormField>

            <MobileFormField>
              <MobileLabel htmlFor="desired_salary">
                {t('jobApplication.steps.positionAvailability.fields.hourlyRate')}
              </MobileLabel>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)] text-gray-400" />
                <MobileInput
                  id="desired_salary"
                  type="text"
                  mobileKeyboard="decimal"
                  value={formData.desired_salary || ''}
                  onChange={(e) => handleInputChange('desired_salary', e.target.value)}
                  className="pl-10"
                  placeholder="15.00"
                />
              </div>
            </MobileFormField>
          </MobileFormGrid>
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
        <CardContent className="pt-6 space-y-[clamp(1rem,3vw,1.5rem)]">
          <MobileFormGrid columns={2}>
            <MobileFormField>
              <MobileLabel htmlFor="start_date" required>
                {t('jobApplication.steps.positionAvailability.fields.startDate')}
              </MobileLabel>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)] text-gray-400" />
                <MobileInput
                  id="start_date"
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                  error={!!getError('start_date')}
                  required
                />
              </div>
              <MobileErrorMessage>{getError('start_date')}</MobileErrorMessage>
            </MobileFormField>

            <MobileFormField>
              <MobileLabel htmlFor="shift_preference">
                {t('jobApplication.steps.positionAvailability.fields.shiftPreference')}
              </MobileLabel>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)] text-gray-400 z-10" />
                <MobileSelect
                  value={formData.shift_preference || ''}
                  onValueChange={(value) => handleInputChange('shift_preference', value)}
                  placeholder={t('jobApplication.steps.positionAvailability.placeholders.selectShift')}
                  className="pl-10"
                >
                  <MobileSelectItem value="morning">{t('jobApplication.steps.positionAvailability.shiftOptions.morning')}</MobileSelectItem>
                  <MobileSelectItem value="afternoon">{t('jobApplication.steps.positionAvailability.shiftOptions.afternoon')}</MobileSelectItem>
                  <MobileSelectItem value="evening">{t('jobApplication.steps.positionAvailability.shiftOptions.evening')}</MobileSelectItem>
                  <MobileSelectItem value="night">{t('jobApplication.steps.positionAvailability.shiftOptions.night')}</MobileSelectItem>
                  <MobileSelectItem value="rotating">{t('jobApplication.steps.positionAvailability.shiftOptions.rotating')}</MobileSelectItem>
                  <MobileSelectItem value="any">{t('jobApplication.steps.positionAvailability.shiftOptions.any')}</MobileSelectItem>
                </MobileSelect>
              </div>
            </MobileFormField>
          </MobileFormGrid>

          <MobileFormGrid columns={2}>
            <MobileFormField>
              <MobileLabel required>
                {t('jobApplication.steps.positionAvailability.fields.weekends')}
              </MobileLabel>
              <MobileRadioGroup
                value={formData.availability_weekends || ''}
                onValueChange={(value) => handleInputChange('availability_weekends', value)}
                columns={2}
                options={[
                  { value: 'yes', label: t('common.yes'), id: 'weekends_yes' },
                  { value: 'no', label: t('common.no'), id: 'weekends_no' }
                ]}
              />
              <MobileErrorMessage>{getError('availability_weekends')}</MobileErrorMessage>
            </MobileFormField>

            <MobileFormField>
              <MobileLabel required>
                {t('jobApplication.steps.positionAvailability.fields.holidays')}
              </MobileLabel>
              <MobileRadioGroup
                value={formData.availability_holidays || ''}
                onValueChange={(value) => handleInputChange('availability_holidays', value)}
                columns={2}
                options={[
                  { value: 'yes', label: t('common.yes'), id: 'holidays_yes' },
                  { value: 'no', label: t('common.no'), id: 'holidays_no' }
                ]}
              />
              <MobileErrorMessage>{getError('availability_holidays')}</MobileErrorMessage>
            </MobileFormField>
          </MobileFormGrid>
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
        <CardContent className="pt-6 space-y-[clamp(1rem,3vw,1.5rem)]">
          <MobileFormField>
            <MobileLabel required>
              {t('jobApplication.steps.positionAvailability.fields.previouslyEmployed')}
            </MobileLabel>
            <MobileRadioGroup
              value={formData.previously_employed || ''}
              onValueChange={(value) => handleInputChange('previously_employed', value)}
              columns={2}
              options={[
                { value: 'no', label: t('common.no'), id: 'prev_emp_no' },
                { value: 'yes', label: t('common.yes'), id: 'prev_emp_yes' }
              ]}
            />
            <MobileErrorMessage>{getError('previously_employed')}</MobileErrorMessage>
          </MobileFormField>

          {formData.previously_employed === 'yes' && (
            <MobileFormField className="animate-in slide-in-from-top-2">
              <MobileLabel htmlFor="previous_employment_details" required>
                {t('jobApplication.steps.positionAvailability.fields.previousDetails')}
              </MobileLabel>
              <MobileTextarea
                id="previous_employment_details"
                value={formData.previous_employment_details || ''}
                onChange={(e) => handleInputChange('previous_employment_details', e.target.value)}
                error={!!getError('previous_employment_details')}
                placeholder={t('jobApplication.steps.positionAvailability.placeholders.previousDetails')}
                rows={3}
              />
              <MobileErrorMessage>{getError('previous_employment_details')}</MobileErrorMessage>
            </MobileFormField>
          )}

          <MobileFormField>
            <MobileLabel htmlFor="relatives_employed">
              {t('jobApplication.steps.positionAvailability.fields.relatives')}
            </MobileLabel>
            <MobileInput
              id="relatives_employed"
              value={formData.relatives_employed || ''}
              onChange={(e) => handleInputChange('relatives_employed', e.target.value)}
              placeholder={t('jobApplication.steps.positionAvailability.placeholders.relatives')}
            />
            <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-500">
              {t('jobApplication.steps.positionAvailability.hints.relatives')}
            </p>
          </MobileFormField>
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
        <CardContent className="pt-6 space-y-[clamp(1rem,3vw,1.5rem)]">
          <MobileFormField>
            <MobileLabel required>
              {t('jobApplication.steps.positionAvailability.fields.currentlyEmployed')}
            </MobileLabel>
            <MobileRadioGroup
              value={formData.currently_employed || ''}
              onValueChange={(value) => handleInputChange('currently_employed', value)}
              columns={2}
              options={[
                { value: 'yes', label: t('common.yes'), id: 'currently_employed_yes' },
                { value: 'no', label: t('common.no'), id: 'currently_employed_no' }
              ]}
            />
            <MobileErrorMessage>{getError('currently_employed')}</MobileErrorMessage>
          </MobileFormField>

          {formData.currently_employed === 'yes' && (
            <MobileFormField className="animate-in slide-in-from-top-2">
              <MobileLabel required>
                {t('jobApplication.steps.positionAvailability.fields.contactEmployer')}
              </MobileLabel>
              <MobileRadioGroup
                value={formData.may_contact_current_employer || ''}
                onValueChange={(value) => handleInputChange('may_contact_current_employer', value)}
                columns={2}
                options={[
                  { value: 'yes', label: t('common.yes'), id: 'contact_employer_yes' },
                  { value: 'no', label: t('common.no'), id: 'contact_employer_no' }
                ]}
              />
              <MobileErrorMessage>{getError('may_contact_current_employer')}</MobileErrorMessage>
            </MobileFormField>
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
        <CardContent className="pt-6 space-y-[clamp(1rem,3vw,1.5rem)]">
          <MobileFormField>
            <MobileRadioGroup
              value={formData.referral_source || ''}
              onValueChange={(value) => handleInputChange('referral_source', value)}
              columns={2}
              options={[
                { value: 'employee', label: t('jobApplication.steps.positionAvailability.fields.referralOptions.employee'), id: 'ref_employee' },
                { value: 'indeed', label: t('jobApplication.steps.positionAvailability.fields.referralOptions.indeed'), id: 'ref_indeed' },
                { value: 'newspaper', label: t('jobApplication.steps.positionAvailability.fields.referralOptions.newspaper'), id: 'ref_newspaper' },
                { value: 'craigslist', label: t('jobApplication.steps.positionAvailability.fields.referralOptions.craigslist'), id: 'ref_craigslist' },
                { value: 'walkin', label: t('jobApplication.steps.positionAvailability.fields.referralOptions.walkin'), id: 'ref_walkin' },
                { value: 'dol', label: t('jobApplication.steps.positionAvailability.fields.referralOptions.dol'), id: 'ref_dol' },
                { value: 'other', label: t('jobApplication.steps.positionAvailability.fields.referralOptions.other'), id: 'ref_other' }
              ]}
            />
            <MobileErrorMessage>{getError('referral_source')}</MobileErrorMessage>
          </MobileFormField>

          {formData.referral_source === 'employee' && (
            <MobileFormField className="animate-in slide-in-from-top-2">
              <MobileLabel htmlFor="employee_referral_name" required>
                {t('jobApplication.steps.positionAvailability.fields.employeeReferralName')}
              </MobileLabel>
              <MobileInput
                id="employee_referral_name"
                value={formData.employee_referral_name || ''}
                onChange={(e) => handleInputChange('employee_referral_name', e.target.value)}
                error={!!getError('employee_referral_name')}
                placeholder={t('jobApplication.steps.positionAvailability.placeholders.employeeReferralName')}
              />
              <MobileErrorMessage>{getError('employee_referral_name')}</MobileErrorMessage>
            </MobileFormField>
          )}

          {formData.referral_source === 'other' && (
            <MobileFormField className="animate-in slide-in-from-top-2">
              <MobileLabel htmlFor="referral_source_other" required>
                {t('jobApplication.steps.positionAvailability.fields.referralSourceOther')}
              </MobileLabel>
              <MobileInput
                id="referral_source_other"
                value={formData.referral_source_other || ''}
                onChange={(e) => handleInputChange('referral_source_other', e.target.value)}
                error={!!getError('referral_source_other')}
                placeholder={t('jobApplication.steps.positionAvailability.placeholders.referralSourceOther')}
              />
              <MobileErrorMessage>{getError('referral_source_other')}</MobileErrorMessage>
            </MobileFormField>
          )}
        </CardContent>
      </Card>
    </div>
  )
}