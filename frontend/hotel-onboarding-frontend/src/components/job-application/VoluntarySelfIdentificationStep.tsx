import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Info } from 'lucide-react'
import {
  MobileSelect,
  MobileLabel,
  MobileRadioGroup,
  MobileCheckbox,
  MobileErrorMessage,
  MobileFormField
} from './mobile-optimized'

interface VoluntarySelfIdentificationStepProps {
  formData: any
  updateFormData: (data: any) => void
  validationErrors: Record<string, string>
  onComplete: (isComplete: boolean) => void
}

export default function VoluntarySelfIdentificationStep({
  formData,
  updateFormData,
  validationErrors: externalErrors,
  onComplete
}: VoluntarySelfIdentificationStepProps) {
  const { t } = useTranslation()
  const [declineToIdentify, setDeclineToIdentify] = useState(formData.decline_to_identify || false)
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [hasInitialized, setHasInitialized] = useState(false)

  const raceEthnicityOptions = [
    { value: 'hispanic_latino', label: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.hispanicLatino.label'), description: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.hispanicLatino.description') },
    { value: 'white', label: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.white.label'), description: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.white.description') },
    { value: 'black_african_american', label: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.blackAfricanAmerican.label'), description: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.blackAfricanAmerican.description') },
    { value: 'native_hawaiian_pacific_islander', label: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.nativeHawaiianPacificIslander.label'), description: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.nativeHawaiianPacificIslander.description') },
    { value: 'asian', label: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.asian.label'), description: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.asian.description') },
    { value: 'american_indian_alaska_native', label: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.americanIndianAlaskaNative.label'), description: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.americanIndianAlaskaNative.description') },
    { value: 'two_or_more', label: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.twoOrMore.label'), description: t('jobApplication.steps.voluntaryIdentification.raceEthnicity.twoOrMore.description') },
  ]

  useEffect(() => {
    // This step is always optional, so mark as complete once on mount
    if (!hasInitialized) {
      onComplete(true)
      setHasInitialized(true)
    }
  }, [hasInitialized])

  const handleInputChange = (field: string, value: any) => {
    updateFormData({ [field]: value })
    setTouched(prev => ({ ...prev, [field]: true }))
    
    // Clear other fields if declining to identify
    if (field === 'decline_to_identify' && value) {
      updateFormData({
        decline_to_identify: true,
        race_ethnicity: '',
        gender: '',
        referral_source: ''
      })
    }
  }

  const getError = (field: string) => {
    return touched[field] ? (localErrors[field] || externalErrors[field]) : ''
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              {t('jobApplication.steps.voluntaryIdentification.header', { propertyName: formData.property_name || 'This hotel' })}
            </p>
            
            <p className="text-sm text-gray-600">
              {t('jobApplication.steps.voluntaryIdentification.invitation')}
            </p>
            
            <p className="text-sm text-gray-600">
              {t('jobApplication.steps.voluntaryIdentification.notice')}
            </p>
            
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-sm font-semibold text-gray-800">
                {t('jobApplication.steps.voluntaryIdentification.refusal')}
              </AlertDescription>
            </Alert>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-4">
              {t('jobApplication.steps.voluntaryIdentification.instruction')}
            </p>
            
            {/* Decline to Identify Option */}
            <div className="mb-6">
              <MobileCheckbox
                id="decline_to_identify"
                checked={declineToIdentify}
                onCheckedChange={(checked) => {
                  setDeclineToIdentify(checked as boolean)
                  handleInputChange('decline_to_identify', checked)
                }}
                label={t('jobApplication.steps.voluntaryIdentification.declineToIdentify')}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              />
            </div>

            {!declineToIdentify && (
              <>
                {/* Race or Ethnic Identity */}
                <MobileFormField className="mb-6">
                  <MobileLabel className="text-base font-semibold">{t('jobApplication.steps.voluntaryIdentification.raceEthnicity.title')}</MobileLabel>
                  <div className="space-y-3">
                    {raceEthnicityOptions.map((option) => (
                      <div key={option.value} className="border rounded-lg p-4 hover:bg-gray-50">
                        <MobileCheckbox
                          id={option.value}
                          checked={formData[`race_${option.value}`] || false}
                          onCheckedChange={(checked) => handleInputChange(`race_${option.value}`, checked)}
                          label={
                            <div className="space-y-1">
                              <div className="font-medium">{option.label}</div>
                              <p className="text-xs text-gray-500">{option.description}</p>
                            </div>
                          }
                        />
                      </div>
                    ))}
                  </div>
                </MobileFormField>

                {/* Gender */}
                <MobileFormField className="mb-6">
                  <MobileLabel className="text-base font-semibold">{t('jobApplication.steps.voluntaryIdentification.gender.title')}</MobileLabel>
                  <MobileRadioGroup
                    value={formData.gender || ''}
                    onValueChange={(value) => handleInputChange('gender', value)}
                    columns={1}
                    options={[
                      { value: 'male', label: t('jobApplication.steps.voluntaryIdentification.gender.male'), id: 'gender_male' },
                      { value: 'female', label: t('jobApplication.steps.voluntaryIdentification.gender.female'), id: 'gender_female' },
                      { value: 'decline_gender', label: t('jobApplication.steps.voluntaryIdentification.gender.decline'), id: 'gender_decline' }
                    ]}
                  />
                </MobileFormField>

                {/* How did you hear about our job opening */}
                <MobileFormField>
                  <MobileLabel htmlFor="referral_source_voluntary" className="text-base font-semibold">
                    {t('jobApplication.steps.voluntaryIdentification.referralSource')}
                  </MobileLabel>
                  <MobileSelect
                    id="referral_source_voluntary"
                    value={formData.referral_source_voluntary || ''}
                    onValueChange={(value) => handleInputChange('referral_source_voluntary', value)}
                    placeholder={t('jobApplication.steps.voluntaryIdentification.placeholders.referralSource')}
                    options={[
                      { value: 'employee', label: t('jobApplication.steps.voluntaryIdentification.referralOptions.employee') },
                      { value: 'indeed', label: t('jobApplication.steps.voluntaryIdentification.referralOptions.indeed') },
                      { value: 'linkedin', label: t('jobApplication.steps.voluntaryIdentification.referralOptions.linkedin') },
                      { value: 'company_website', label: t('jobApplication.steps.voluntaryIdentification.referralOptions.companyWebsite') },
                      { value: 'job_fair', label: t('jobApplication.steps.voluntaryIdentification.referralOptions.jobFair') },
                      { value: 'recruitment_agency', label: t('jobApplication.steps.voluntaryIdentification.referralOptions.recruitmentAgency') },
                      { value: 'social_media', label: t('jobApplication.steps.voluntaryIdentification.referralOptions.socialMedia') },
                      { value: 'other', label: t('jobApplication.steps.voluntaryIdentification.referralOptions.other') }
                    ]}
                  />
                </MobileFormField>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}