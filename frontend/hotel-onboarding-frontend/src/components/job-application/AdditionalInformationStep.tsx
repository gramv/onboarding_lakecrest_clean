import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

          <div className="space-y-2">
            <Label className="font-semibold text-gray-900">{t('jobApplication.steps.additionalInfo.conviction.convictionQuestion')} *</Label>
            <RadioGroup 
              value={formData.has_conviction || ''} 
              onValueChange={(value) => handleInputChange('has_conviction', value)}
            >
              <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                <RadioGroupItem value="yes" id="conviction_yes" />
                <Label htmlFor="conviction_yes" className="font-normal">{t('common.yes')}</Label>
              </div>
              <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                <RadioGroupItem value="no" id="conviction_no" />
                <Label htmlFor="conviction_no" className="font-normal">{t('common.no')}</Label>
              </div>
            </RadioGroup>
            {getError('has_conviction') && (
              <p className="text-sm text-red-600">{getError('has_conviction')}</p>
            )}
          </div>

          {formData.has_conviction === 'yes' && (
            <div className="space-y-2">
              <Label htmlFor="conviction_explanation" className="font-semibold text-gray-900">
                {t('jobApplication.steps.additionalInfo.conviction.convictionExplain')} *
              </Label>
              <Textarea
                id="conviction_explanation"
                value={formData.conviction_explanation || ''}
                onChange={(e) => handleInputChange('conviction_explanation', e.target.value)}
                className={getError('conviction_explanation') ? 'border-red-500' : ''}
                placeholder=""
                rows={4}
              />
              {getError('conviction_explanation') && (
                <p className="text-sm text-red-600">{getError('conviction_explanation')}</p>
              )}
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold text-sm mb-3">
              {t('jobApplication.steps.additionalInfo.conviction.driverSection')}
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold text-gray-900">{t('jobApplication.steps.additionalInfo.conviction.licenseDenied')} *</Label>
                <RadioGroup 
                  value={formData.has_driving_denied || ''} 
                  onValueChange={(value) => handleInputChange('has_driving_denied', value)}
                >
                  <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                    <RadioGroupItem value="yes" id="driving_denied_yes" />
                    <Label htmlFor="driving_denied_yes" className="font-normal">{t('common.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                    <RadioGroupItem value="no" id="driving_denied_no" />
                    <Label htmlFor="driving_denied_no" className="font-normal">{t('common.no')}</Label>
                  </div>
                </RadioGroup>
                {getError('has_driving_denied') && (
                  <p className="text-sm text-red-600">{getError('has_driving_denied')}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-900">{t('jobApplication.steps.additionalInfo.conviction.licenseSuspended')} *</Label>
                <RadioGroup 
                  value={formData.has_driving_issues || ''} 
                  onValueChange={(value) => handleInputChange('has_driving_issues', value)}
                >
                  <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                    <RadioGroupItem value="yes" id="driving_yes" />
                    <Label htmlFor="driving_yes" className="font-normal">{t('common.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2 py-0.5 sm:space-x-3 sm:py-1">
                    <RadioGroupItem value="no" id="driving_no" />
                    <Label htmlFor="driving_no" className="font-normal">{t('common.no')}</Label>
                  </div>
                </RadioGroup>
                {getError('has_driving_issues') && (
                  <p className="text-sm text-red-600">{getError('has_driving_issues')}</p>
                )}
              </div>

              {(formData.has_driving_denied === 'yes' || formData.has_driving_issues === 'yes') && (
                <div className="space-y-2">
                  <Label htmlFor="driving_explanation" className="font-semibold text-gray-900">{t('jobApplication.steps.additionalInfo.conviction.explainBelow')} *</Label>
                  <Textarea
                    id="driving_explanation"
                    value={formData.driving_explanation || ''}
                    onChange={(e) => handleInputChange('driving_explanation', e.target.value)}
                    className={getError('driving_explanation') ? 'border-red-500' : ''}
                    placeholder=""
                    rows={3}
                  />
                  {getError('driving_explanation') && (
                    <p className="text-sm text-red-600">{getError('driving_explanation')}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <Checkbox
              id="additional_info"
              checked={formData.has_additional_info || false}
              onCheckedChange={(checked) => handleInputChange('has_additional_info', checked)}
            />
            <Label htmlFor="additional_info" className="text-sm font-normal cursor-pointer">
              {t('jobApplication.steps.additionalInfo.conviction.additionalPages')}
            </Label>
          </div>
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
          <div className="mb-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Checkbox
                id="no_reference"
                checked={hasNoReference}
                onCheckedChange={(checked) => {
                  setHasNoReference(checked as boolean)
                  handleInputChange('has_no_reference', checked)
                  if (checked) {
                    // Clear reference fields when checked
                    updateFormData({
                      has_no_reference: true,
                      reference_name: '',
                      reference_years_known: '',
                      reference_phone: '',
                      reference_relationship: ''
                    })
                  }
                }}
                className="h-5 w-5"
              />
              <Label htmlFor="no_reference" className="text-base font-medium cursor-pointer">
                {t('jobApplication.steps.additionalInfo.personalReference.noReference')}
              </Label>
            </div>
          </div>
          
          {!hasNoReference && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference_name" className="font-semibold text-gray-900">{t('jobApplication.steps.additionalInfo.personalReference.name')}</Label>
              <Input
                id="reference_name"
                value={formData.reference_name || ''}
                onChange={(e) => handleInputChange('reference_name', e.target.value)}
                className={getError('reference_name') ? 'border-red-500' : ''}
                placeholder=""
              />
              {getError('reference_name') && (
                <p className="text-sm text-red-600">{getError('reference_name')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_years_known" className="font-semibold text-gray-900">{t('jobApplication.steps.additionalInfo.personalReference.yearsKnown')}</Label>
              <Input
                id="reference_years_known"
                type="number"
                value={formData.reference_years_known || ''}
                onChange={(e) => handleInputChange('reference_years_known', e.target.value)}
                className={getError('reference_years_known') ? 'border-red-500' : ''}
                placeholder="5"
                min="0"
                max="99"
              />
              {getError('reference_years_known') && (
                <p className="text-sm text-red-600">{getError('reference_years_known')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_phone" className="font-semibold text-gray-900">{t('jobApplication.steps.additionalInfo.personalReference.phone')}</Label>
              <Input
                id="reference_phone"
                type="tel"
                value={formData.reference_phone || ''}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value)
                  handleInputChange('reference_phone', formatted)
                }}
                className={getError('reference_phone') ? 'border-red-500' : ''}
                placeholder="(555) 123-4567"
                maxLength={14}
              />
              {getError('reference_phone') && (
                <p className="text-sm text-red-600">{getError('reference_phone')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_relationship" className="font-semibold text-gray-900">{t('jobApplication.steps.additionalInfo.personalReference.relationship')}</Label>
              <Input
                id="reference_relationship"
                value={formData.reference_relationship || ''}
                onChange={(e) => handleInputChange('reference_relationship', e.target.value)}
                className={getError('reference_relationship') ? 'border-red-500' : ''}
                placeholder=""
              />
              {getError('reference_relationship') && (
                <p className="text-sm text-red-600">{getError('reference_relationship')}</p>
              )}
            </div>
          </div>
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
        <CardContent className="space-y-4">
          <div className="mb-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Checkbox
                id="no_military"
                checked={hasNoMilitaryService}
                onCheckedChange={(checked) => {
                  setHasNoMilitaryService(checked as boolean)
                  handleInputChange('has_no_military_service', checked)
                  if (checked) {
                    // Clear military fields when checked
                    updateFormData({
                      has_no_military_service: true,
                      military_branch: '',
                      military_from_to: '',
                      military_rank_duties: '',
                      military_discharge_date: ''
                    })
                  }
                }}
                className="h-5 w-5"
              />
              <Label htmlFor="no_military" className="text-base font-medium cursor-pointer">
                {t('jobApplication.steps.additionalInfo.military.noService')}
              </Label>
            </div>
          </div>
          
          {!hasNoMilitaryService && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="military_branch" className="font-semibold text-gray-900">{t('jobApplication.steps.additionalInfo.military.branch')} *</Label>
              <Input
                id="military_branch"
                value={formData.military_branch || ''}
                onChange={(e) => handleInputChange('military_branch', e.target.value)}
                className={getError('military_branch') ? 'border-red-500' : ''}
                placeholder=""
              />
              {getError('military_branch') && (
                <p className="text-sm text-red-600">{getError('military_branch')}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="military_from_to" className="font-semibold text-gray-900">{t('jobApplication.steps.additionalInfo.military.fromTo')} *</Label>
              <Input
                id="military_from_to"
                value={formData.military_from_to || ''}
                onChange={(e) => handleInputChange('military_from_to', e.target.value)}
                className={getError('military_from_to') ? 'border-red-500' : ''}
                placeholder="MM/YYYY - MM/YYYY"
              />
              {getError('military_from_to') && (
                <p className="text-sm text-red-600">{getError('military_from_to')}</p>
              )}
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="military_rank_duties" className="font-semibold text-gray-900">{t('jobApplication.steps.additionalInfo.military.rankDuties')} *</Label>
              <Textarea
                id="military_rank_duties"
                value={formData.military_rank_duties || ''}
                onChange={(e) => handleInputChange('military_rank_duties', e.target.value)}
                className={getError('military_rank_duties') ? 'border-red-500' : ''}
                placeholder=""
                rows={2}
              />
              {getError('military_rank_duties') && (
                <p className="text-sm text-red-600">{getError('military_rank_duties')}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="military_discharge_date" className="font-semibold text-gray-900">{t('jobApplication.steps.additionalInfo.military.dischargeDate')} *</Label>
              <Input
                id="military_discharge_date"
                type="date"
                value={formData.military_discharge_date || ''}
                onChange={(e) => handleInputChange('military_discharge_date', e.target.value)}
                className={getError('military_discharge_date') ? 'border-red-500' : ''}
                max={new Date().toISOString().split('T')[0]}
              />
              {getError('military_discharge_date') && (
                <p className="text-sm text-red-600">{getError('military_discharge_date')}</p>
              )}
            </div>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}