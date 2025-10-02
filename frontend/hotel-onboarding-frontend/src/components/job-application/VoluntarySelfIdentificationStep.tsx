import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Info } from 'lucide-react'

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
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Checkbox
                  id="decline_to_identify"
                  checked={declineToIdentify}
                  onCheckedChange={(checked) => {
                    setDeclineToIdentify(checked as boolean)
                    handleInputChange('decline_to_identify', checked)
                  }}
                  className="h-5 w-5"
                />
                <Label htmlFor="decline_to_identify" className="text-base font-medium cursor-pointer">
                  {t('jobApplication.steps.voluntaryIdentification.declineToIdentify')}
                </Label>
              </div>
            </div>

            {!declineToIdentify && (
              <>
                {/* Race or Ethnic Identity */}
                <div className="space-y-4 mb-6">
                  <Label className="text-base font-semibold">{t('jobApplication.steps.voluntaryIdentification.raceEthnicity.title')}</Label>
                  <div className="space-y-3">
                    {raceEthnicityOptions.map((option) => (
                      <div key={option.value} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={option.value}
                            checked={formData[`race_${option.value}`] || false}
                            onCheckedChange={(checked) => handleInputChange(`race_${option.value}`, checked)}
                            className="mt-1"
                          />
                          <div className="space-y-1">
                            <Label htmlFor={option.value} className="font-medium cursor-pointer">
                              {option.label}
                            </Label>
                            <p className="text-xs text-gray-500">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-2 mb-6">
                  <Label className="text-base font-semibold">{t('jobApplication.steps.voluntaryIdentification.gender.title')}</Label>
                  <RadioGroup 
                    value={formData.gender || ''} 
                    onValueChange={(value) => handleInputChange('gender', value)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="gender_male" />
                        <Label htmlFor="gender_male" className="font-normal">{t('jobApplication.steps.voluntaryIdentification.gender.male')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="gender_female" />
                        <Label htmlFor="gender_female" className="font-normal">{t('jobApplication.steps.voluntaryIdentification.gender.female')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="decline_gender" id="gender_decline" />
                        <Label htmlFor="gender_decline" className="font-normal">{t('jobApplication.steps.voluntaryIdentification.gender.decline')}</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* How did you hear about our job opening */}
                <div className="space-y-2">
                  <Label htmlFor="referral_source_voluntary" className="text-base font-semibold">
                    {t('jobApplication.steps.voluntaryIdentification.referralSource')}
                  </Label>
                  <Select 
                    value={formData.referral_source_voluntary || ''} 
                    onValueChange={(value) => handleInputChange('referral_source_voluntary', value)}
                  >
                    <SelectTrigger id="referral_source_voluntary">
                      <SelectValue placeholder={t('jobApplication.steps.voluntaryIdentification.placeholders.referralSource')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">{t('jobApplication.steps.voluntaryIdentification.referralOptions.employee')}</SelectItem>
                      <SelectItem value="indeed">{t('jobApplication.steps.voluntaryIdentification.referralOptions.indeed')}</SelectItem>
                      <SelectItem value="linkedin">{t('jobApplication.steps.voluntaryIdentification.referralOptions.linkedin')}</SelectItem>
                      <SelectItem value="company_website">{t('jobApplication.steps.voluntaryIdentification.referralOptions.companyWebsite')}</SelectItem>
                      <SelectItem value="job_fair">{t('jobApplication.steps.voluntaryIdentification.referralOptions.jobFair')}</SelectItem>
                      <SelectItem value="recruitment_agency">{t('jobApplication.steps.voluntaryIdentification.referralOptions.recruitmentAgency')}</SelectItem>
                      <SelectItem value="social_media">{t('jobApplication.steps.voluntaryIdentification.referralOptions.socialMedia')}</SelectItem>
                      <SelectItem value="other">{t('jobApplication.steps.voluntaryIdentification.referralOptions.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}