import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Phone, Shield, Car, AlertCircle } from 'lucide-react'

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

    // Validate driving record questions if applicable
    if ((formData.has_driving_denied === 'yes' || formData.has_driving_issues === 'yes') && !formData.driving_explanation) {
      errors.driving_explanation = t('jobApplication.steps.additionalInfo.validation.drivingExplanationRequired')
      isValid = false
    }

    // Personal reference is optional, so we don't validate it

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
          <CardTitle className="flex items-center text-lg">
            <Car className="w-5 h-5 mr-2" />
            {t('jobApplication.steps.additionalInfo.conviction.title')}
            <sup className="text-blue-600 text-sm ml-1">*</sup>
          </CardTitle>
          <p className="text-sm font-semibold text-gray-700 mt-2">
            {t('jobApplication.steps.additionalInfo.conviction.notice')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Notice Alert */}
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-gray-700">
              <strong>{t('jobApplication.steps.additionalInfo.conviction.applicantNoticeTitle')}:</strong> {t('jobApplication.steps.additionalInfo.conviction.applicantNotice')}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>{t('jobApplication.steps.additionalInfo.conviction.convictionQuestion')} *</Label>
            <RadioGroup 
              value={formData.has_conviction || ''} 
              onValueChange={(value) => handleInputChange('has_conviction', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="conviction_yes" />
                <Label htmlFor="conviction_yes" className="font-normal">{t('common.yes')}</Label>
              </div>
              <div className="flex items-center space-x-2">
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
              <Label htmlFor="conviction_explanation">
                {t('jobApplication.steps.additionalInfo.conviction.convictionExplain')} *
              </Label>
              <Textarea
                id="conviction_explanation"
                value={formData.conviction_explanation || ''}
                onChange={(e) => handleInputChange('conviction_explanation', e.target.value)}
                className={getError('conviction_explanation') ? 'border-red-500' : ''}
                placeholder={t('jobApplication.steps.additionalInfo.placeholders.convictionDetails')}
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
                <Label>{t('jobApplication.steps.additionalInfo.conviction.licenseDenied')}</Label>
                <RadioGroup 
                  value={formData.has_driving_denied || ''} 
                  onValueChange={(value) => handleInputChange('has_driving_denied', value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="driving_denied_yes" />
                    <Label htmlFor="driving_denied_yes" className="font-normal">{t('common.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="driving_denied_no" />
                    <Label htmlFor="driving_denied_no" className="font-normal">{t('common.no')}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>{t('jobApplication.steps.additionalInfo.conviction.licenseSuspended')}</Label>
                <RadioGroup 
                  value={formData.has_driving_issues || ''} 
                  onValueChange={(value) => handleInputChange('has_driving_issues', value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="driving_yes" />
                    <Label htmlFor="driving_yes" className="font-normal">{t('common.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
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
                  <Label htmlFor="driving_explanation">{t('jobApplication.steps.additionalInfo.conviction.explainBelow')} *</Label>
                  <Textarea
                    id="driving_explanation"
                    value={formData.driving_explanation || ''}
                    onChange={(e) => handleInputChange('driving_explanation', e.target.value)}
                    className={getError('driving_explanation') ? 'border-red-500' : ''}
                    placeholder={t('jobApplication.steps.additionalInfo.placeholders.drivingDetails')}
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
          <CardTitle className="flex items-center text-lg">
            <Users className="w-5 h-5 mr-2" />
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
              <Label htmlFor="reference_name">{t('jobApplication.steps.additionalInfo.personalReference.name')}</Label>
              <Input
                id="reference_name"
                value={formData.reference_name || ''}
                onChange={(e) => handleInputChange('reference_name', e.target.value)}
                placeholder={t('jobApplication.steps.additionalInfo.placeholders.referenceName')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_years_known">{t('jobApplication.steps.additionalInfo.personalReference.yearsKnown')}</Label>
              <Input
                id="reference_years_known"
                type="number"
                value={formData.reference_years_known || ''}
                onChange={(e) => handleInputChange('reference_years_known', e.target.value)}
                placeholder="5"
                min="0"
                max="99"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_phone">{t('jobApplication.steps.additionalInfo.personalReference.phone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="reference_phone"
                  type="tel"
                  value={formData.reference_phone || ''}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value)
                    handleInputChange('reference_phone', formatted)
                  }}
                  className="pl-10"
                  placeholder="(555) 123-4567"
                  maxLength={14}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_relationship">{t('jobApplication.steps.additionalInfo.personalReference.relationship')}</Label>
              <Input
                id="reference_relationship"
                value={formData.reference_relationship || ''}
                onChange={(e) => handleInputChange('reference_relationship', e.target.value)}
                placeholder={t('jobApplication.steps.additionalInfo.placeholders.referenceRelationship')}
              />
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Military Service Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Shield className="w-5 h-5 mr-2" />
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
              <Label htmlFor="military_branch">{t('jobApplication.steps.additionalInfo.military.branch')}</Label>
              <Input
                id="military_branch"
                value={formData.military_branch || ''}
                onChange={(e) => handleInputChange('military_branch', e.target.value)}
                placeholder={t('jobApplication.steps.additionalInfo.placeholders.militaryBranch')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="military_from_to">{t('jobApplication.steps.additionalInfo.military.fromTo')}</Label>
              <Input
                id="military_from_to"
                value={formData.military_from_to || ''}
                onChange={(e) => handleInputChange('military_from_to', e.target.value)}
                placeholder="MM/YYYY - MM/YYYY"
              />
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="military_rank_duties">{t('jobApplication.steps.additionalInfo.military.rankDuties')}</Label>
              <Textarea
                id="military_rank_duties"
                value={formData.military_rank_duties || ''}
                onChange={(e) => handleInputChange('military_rank_duties', e.target.value)}
                placeholder={t('jobApplication.steps.additionalInfo.placeholders.militaryRankDuties')}
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="military_discharge_date">{t('jobApplication.steps.additionalInfo.military.dischargeDate')}</Label>
              <Input
                id="military_discharge_date"
                type="date"
                value={formData.military_discharge_date || ''}
                onChange={(e) => handleInputChange('military_discharge_date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}