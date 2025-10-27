import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  MobileInput,
  MobileLabel,
  MobileTextarea,
  MobileRadioGroup,
  MobileCheckbox,
  MobileErrorMessage,
  MobileFormField,
  MobileFormGrid
} from './mobile-optimized'
// Icons removed for cleaner professional look

interface AdditionalInformationStepProps {
  formData: any
  updateFormData: (data: any) => void
  validationErrors: Record<string, string>
  onComplete: (isComplete: boolean) => void
}

export default function AdditionalInformationStep({
  formData,
  updateFormData,
  validationErrors: externalErrors,
  onComplete
}: AdditionalInformationStepProps) {
  const { t } = useTranslation()
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [hasNoReference, setHasNoReference] = useState(formData.has_no_reference || false)
  const [hasNoMilitaryService, setHasNoMilitaryService] = useState(formData.has_no_military_service || false)

  useEffect(() => {
    validateStep()
  }, [formData])

  // Function to mark all required fields as touched
  const markAllFieldsTouched = () => {
    const requiredFields = ['has_conviction', 'has_driving_denied', 'has_driving_issues']
    
    // Add reference fields if not checked "no reference"
    if (!formData.has_no_reference) {
      requiredFields.push('reference_name', 'reference_phone', 'reference_relationship', 'reference_years_known')
    }
    
    // Add military fields if not checked "no military service"
    if (!formData.has_no_military_service) {
      requiredFields.push('military_branch', 'military_from_to', 'military_rank_duties', 'military_discharge_date')
    }
    
    // Add conditional required fields
    if (formData.has_conviction === 'yes') {
      requiredFields.push('conviction_explanation')
    }
    if (formData.has_driving_denied === 'yes' || formData.has_driving_issues === 'yes') {
      requiredFields.push('driving_explanation')
    }
    
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
    let isValid = true
    const errors: Record<string, string> = {}

    // Validate conviction question
    if (!formData.has_conviction) {
      errors.has_conviction = t('jobApplication.steps.additionalInfo.validation.convictionRequired')
      isValid = false
    }

    if (formData.has_conviction === 'yes' && !formData.conviction_explanation) {
      errors.conviction_explanation = t('jobApplication.steps.additionalInfo.validation.convictionExplanationRequired')
      isValid = false
    }

    // Validate driving record questions - REQUIRED fields
    if (!formData.has_driving_denied) {
      errors.has_driving_denied = 'Please answer the driving license denial question'
      isValid = false
    }

    if (!formData.has_driving_issues) {
      errors.has_driving_issues = 'Please answer the driving license suspension/revocation question'
      isValid = false
    }

    // Validate driving explanation if answered yes to either
    if ((formData.has_driving_denied === 'yes' || formData.has_driving_issues === 'yes') && !formData.driving_explanation) {
      errors.driving_explanation = t('jobApplication.steps.additionalInfo.validation.drivingExplanationRequired')
      isValid = false
    }

    // Validate reference fields (unless has_no_reference is checked)
    if (!formData.has_no_reference) {
      if (!formData.reference_name) {
        errors.reference_name = 'Reference name is required'
        isValid = false
      }
      if (!formData.reference_phone) {
        errors.reference_phone = 'Reference phone number is required'
        isValid = false
      }
      if (!formData.reference_relationship) {
        errors.reference_relationship = 'Relationship is required'
        isValid = false
      }
      if (!formData.reference_years_known) {
        errors.reference_years_known = 'Years known is required'
        isValid = false
      }
    }

    // Validate military fields (unless has_no_military_service is checked)
    if (!formData.has_no_military_service) {
      if (!formData.military_branch) {
        errors.military_branch = 'Military branch is required'
        isValid = false
      }
      if (!formData.military_from_to) {
        errors.military_from_to = 'Service dates are required'
        isValid = false
      }
      if (!formData.military_rank_duties) {
        errors.military_rank_duties = 'Rank and duties are required'
        isValid = false
      }
      if (!formData.military_discharge_date) {
        errors.military_discharge_date = 'Discharge date is required'
        isValid = false
      }
    }

    setLocalErrors(errors)
    onComplete(isValid)
  }

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const getError = (field: string) => {
    return touched[field] ? localErrors[field] : ''
  }

  const handleInputChange = (field: string, value: any) => {
    updateFormData({ [field]: value })
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  return (
    <div className="space-y-6">
      {/* Conviction & Driving Record Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('jobApplication.steps.additionalInfo.conviction.title')}
            <sup className="text-blue-600 text-sm ml-1">†</sup>
          </CardTitle>
          <p className="text-sm font-semibold text-gray-700 mt-2">
            {t('jobApplication.steps.additionalInfo.conviction.notice')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Notice Alert */}
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-sm text-gray-700">
              <strong>{t('jobApplication.steps.additionalInfo.conviction.applicantNoticeTitle')}:</strong> {t('jobApplication.steps.additionalInfo.conviction.applicantNotice')}
            </AlertDescription>
          </Alert>

          <MobileFormField>
            <MobileLabel required>{t('jobApplication.steps.additionalInfo.conviction.convictionQuestion')}</MobileLabel>
            <MobileRadioGroup
              value={formData.has_conviction || ''}
              onValueChange={(value) => handleInputChange('has_conviction', value)}
              columns={2}
              options={[
                { value: 'yes', label: t('common.yes'), id: 'conviction_yes' },
                { value: 'no', label: t('common.no'), id: 'conviction_no' }
              ]}
            />
            <MobileErrorMessage>{getError('has_conviction')}</MobileErrorMessage>
          </MobileFormField>

          {formData.has_conviction === 'yes' && (
            <MobileFormField>
              <MobileLabel htmlFor="conviction_explanation" required>
                {t('jobApplication.steps.additionalInfo.conviction.convictionExplain')}
              </MobileLabel>
              <MobileTextarea
                id="conviction_explanation"
                value={formData.conviction_explanation || ''}
                onChange={(e) => handleInputChange('conviction_explanation', e.target.value)}
                error={!!getError('conviction_explanation')}
                placeholder=""
                rows={4}
              />
              <MobileErrorMessage>{getError('conviction_explanation')}</MobileErrorMessage>
            </MobileFormField>
          )}

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold text-sm mb-3">
              {t('jobApplication.steps.additionalInfo.conviction.driverSection')}
            </h4>
            
            <div className="space-y-[clamp(1rem,3vw,1.5rem)]">
              <MobileFormField>
                <MobileLabel required>{t('jobApplication.steps.additionalInfo.conviction.licenseDenied')}</MobileLabel>
                <MobileRadioGroup
                  value={formData.has_driving_denied || ''}
                  onValueChange={(value) => handleInputChange('has_driving_denied', value)}
                  columns={2}
                  options={[
                    { value: 'yes', label: t('common.yes'), id: 'driving_denied_yes' },
                    { value: 'no', label: t('common.no'), id: 'driving_denied_no' }
                  ]}
                />
                <MobileErrorMessage>{getError('has_driving_denied')}</MobileErrorMessage>
              </MobileFormField>

              <MobileFormField>
                <MobileLabel required>{t('jobApplication.steps.additionalInfo.conviction.licenseSuspended')}</MobileLabel>
                <MobileRadioGroup
                  value={formData.has_driving_issues || ''}
                  onValueChange={(value) => handleInputChange('has_driving_issues', value)}
                  columns={2}
                  options={[
                    { value: 'yes', label: t('common.yes'), id: 'driving_yes' },
                    { value: 'no', label: t('common.no'), id: 'driving_no' }
                  ]}
                />
                <MobileErrorMessage>{getError('has_driving_issues')}</MobileErrorMessage>
              </MobileFormField>

              {(formData.has_driving_denied === 'yes' || formData.has_driving_issues === 'yes') && (
                <MobileFormField>
                  <MobileLabel htmlFor="driving_explanation" required>
                    {t('jobApplication.steps.additionalInfo.conviction.explainBelow')}
                  </MobileLabel>
                  <MobileTextarea
                    id="driving_explanation"
                    value={formData.driving_explanation || ''}
                    onChange={(e) => handleInputChange('driving_explanation', e.target.value)}
                    error={!!getError('driving_explanation')}
                    placeholder=""
                    rows={3}
                  />
                  <MobileErrorMessage>{getError('driving_explanation')}</MobileErrorMessage>
                </MobileFormField>
              )}
            </div>
          </div>

          <MobileCheckbox
            id="additional_info"
            checked={formData.has_additional_info || false}
            onCheckedChange={(checked) => handleInputChange('has_additional_info', checked)}
            label={t('jobApplication.steps.additionalInfo.conviction.additionalPages')}
            className="mt-4"
          />
        </CardContent>
      </Card>

      {/* Personal Reference Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('jobApplication.steps.additionalInfo.personalReference.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MobileCheckbox
            id="no_reference"
            checked={hasNoReference}
            onCheckedChange={(checked) => {
              setHasNoReference(checked as boolean)
              handleInputChange('has_no_reference', checked)
              if (checked) {
                updateFormData({
                  has_no_reference: true,
                  reference_name: '',
                  reference_years_known: '',
                  reference_phone: '',
                  reference_relationship: ''
                })
              }
            }}
            label={t('jobApplication.steps.additionalInfo.personalReference.noReference')}
            className="mb-4 bg-gray-50 rounded-lg border border-gray-200 p-3"
          />

          {!hasNoReference && (
            <MobileFormGrid columns={2}>
              <MobileFormField>
                <MobileLabel htmlFor="reference_name">{t('jobApplication.steps.additionalInfo.personalReference.name')}</MobileLabel>
                <MobileInput
                  id="reference_name"
                  value={formData.reference_name || ''}
                  onChange={(e) => handleInputChange('reference_name', e.target.value)}
                  error={!!getError('reference_name')}
                  placeholder=""
                />
                <MobileErrorMessage>{getError('reference_name')}</MobileErrorMessage>
              </MobileFormField>

              <MobileFormField>
                <MobileLabel htmlFor="reference_years_known">{t('jobApplication.steps.additionalInfo.personalReference.yearsKnown')}</MobileLabel>
                <MobileInput
                  id="reference_years_known"
                  type="number"
                  mobileKeyboard="numeric"
                  value={formData.reference_years_known || ''}
                  onChange={(e) => handleInputChange('reference_years_known', e.target.value)}
                  error={!!getError('reference_years_known')}
                  placeholder="5"
                  min="0"
                  max="99"
                />
                <MobileErrorMessage>{getError('reference_years_known')}</MobileErrorMessage>
              </MobileFormField>

              <MobileFormField>
                <MobileLabel htmlFor="reference_phone">{t('jobApplication.steps.additionalInfo.personalReference.phone')}</MobileLabel>
                <MobileInput
                  id="reference_phone"
                  type="tel"
                  mobileKeyboard="tel"
                  value={formData.reference_phone || ''}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value)
                    handleInputChange('reference_phone', formatted)
                  }}
                  error={!!getError('reference_phone')}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                />
                <MobileErrorMessage>{getError('reference_phone')}</MobileErrorMessage>
              </MobileFormField>

              <MobileFormField>
                <MobileLabel htmlFor="reference_relationship">{t('jobApplication.steps.additionalInfo.personalReference.relationship')}</MobileLabel>
                <MobileInput
                  id="reference_relationship"
                  value={formData.reference_relationship || ''}
                  onChange={(e) => handleInputChange('reference_relationship', e.target.value)}
                  error={!!getError('reference_relationship')}
                  placeholder=""
                />
                <MobileErrorMessage>{getError('reference_relationship')}</MobileErrorMessage>
              </MobileFormField>
            </MobileFormGrid>
          )}
        </CardContent>
      </Card>

      {/* Military Service Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('jobApplication.steps.additionalInfo.military.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-[clamp(1rem,3vw,1.5rem)]">
          <MobileCheckbox
            id="no_military"
            checked={hasNoMilitaryService}
            onCheckedChange={(checked) => {
              setHasNoMilitaryService(checked as boolean)
              handleInputChange('has_no_military_service', checked)
              if (checked) {
                updateFormData({
                  has_no_military_service: true,
                  military_branch: '',
                  military_from_to: '',
                  military_rank_duties: '',
                  military_discharge_date: ''
                })
              }
            }}
            label={t('jobApplication.steps.additionalInfo.military.noService')}
            className="mb-4 bg-gray-50 rounded-lg border border-gray-200 p-3"
          />

          {!hasNoMilitaryService && (
            <MobileFormGrid columns={2}>
              <MobileFormField>
                <MobileLabel htmlFor="military_branch" required>{t('jobApplication.steps.additionalInfo.military.branch')}</MobileLabel>
                <MobileInput
                  id="military_branch"
                  value={formData.military_branch || ''}
                  onChange={(e) => handleInputChange('military_branch', e.target.value)}
                  error={!!getError('military_branch')}
                  placeholder=""
                />
                <MobileErrorMessage>{getError('military_branch')}</MobileErrorMessage>
              </MobileFormField>

              <MobileFormField>
                <MobileLabel htmlFor="military_from_to" required>{t('jobApplication.steps.additionalInfo.military.fromTo')}</MobileLabel>
                <MobileInput
                  id="military_from_to"
                  value={formData.military_from_to || ''}
                  onChange={(e) => handleInputChange('military_from_to', e.target.value)}
                  error={!!getError('military_from_to')}
                  placeholder="MM/YYYY - MM/YYYY"
                />
                <MobileErrorMessage>{getError('military_from_to')}</MobileErrorMessage>
              </MobileFormField>

              <MobileFormField className="md:col-span-2">
                <MobileLabel htmlFor="military_rank_duties" required>{t('jobApplication.steps.additionalInfo.military.rankDuties')}</MobileLabel>
                <MobileTextarea
                  id="military_rank_duties"
                  value={formData.military_rank_duties || ''}
                  onChange={(e) => handleInputChange('military_rank_duties', e.target.value)}
                  error={!!getError('military_rank_duties')}
                  placeholder=""
                  rows={2}
                />
                <MobileErrorMessage>{getError('military_rank_duties')}</MobileErrorMessage>
              </MobileFormField>

              <MobileFormField>
                <MobileLabel htmlFor="military_discharge_date" required>{t('jobApplication.steps.additionalInfo.military.dischargeDate')}</MobileLabel>
                <MobileInput
                  id="military_discharge_date"
                  type="date"
                  value={formData.military_discharge_date || ''}
                  onChange={(e) => handleInputChange('military_discharge_date', e.target.value)}
                  error={!!getError('military_discharge_date')}
                  max={new Date().toISOString().split('T')[0]}
                />
                <MobileErrorMessage>{getError('military_discharge_date')}</MobileErrorMessage>
              </MobileFormField>
            </MobileFormGrid>
          )}
        </CardContent>
      </Card>
    </div>
  )
}