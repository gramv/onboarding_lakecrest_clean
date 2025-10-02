import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Plus, Trash2, Briefcase, Calendar, Phone, DollarSign } from 'lucide-react'
import { formValidator, ValidationRule } from '@/utils/formValidation'

interface EmploymentHistoryStepProps {
  formData: any
  updateFormData: (data: any) => void
  validationErrors: Record<string, string>
  onComplete: (isComplete: boolean) => void
}

interface EmploymentEntry {
  employer_name: string
  employer_address: string
  employer_phone: string
  starting_job_title: string
  ending_job_title: string
  start_date: string
  end_date: string
  starting_salary: string
  ending_salary: string
  is_current: boolean
  responsibilities: string
  reason_for_leaving: string
  supervisor_name: string
  supervisor_phone: string
  may_contact: boolean
}

const emptyEmploymentEntry: EmploymentEntry = {
  employer_name: '',
  employer_address: '',
  employer_phone: '',
  starting_job_title: '',
  ending_job_title: '',
  start_date: '',
  end_date: '',
  starting_salary: '',
  ending_salary: '',
  is_current: false,
  responsibilities: '',
  reason_for_leaving: '',
  supervisor_name: '',
  supervisor_phone: '',
  may_contact: true
}

export default function EmploymentHistoryStep({
  formData,
  updateFormData,
  validationErrors: externalErrors,
  onComplete
}: EmploymentHistoryStepProps) {
  const { t } = useTranslation()
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentEntry[]>(
    formData.employment_history?.length > 0 ? formData.employment_history : [{ ...emptyEmploymentEntry }]
  )
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [hasNoWorkHistory, setHasNoWorkHistory] = useState(formData.has_no_work_history || false)
  const [hasInteracted, setHasInteracted] = useState(false)

  useEffect(() => {
    if (hasInteracted) {
      validateStep()
    }
  }, [employmentHistory, hasNoWorkHistory, hasInteracted])

  const validateStep = () => {
    let isValid = true
    const errors: Record<string, string> = {}

    if (hasNoWorkHistory) {
      // If no work history, that's valid
      updateFormData({ 
        employment_history: [],
        has_no_work_history: true 
      })
      onComplete(true)
      return
    }

    // Validate each employment entry
    employmentHistory.forEach((entry, index) => {
      if (!entry.employer_name) {
        errors[`employment_${index}_employer_name`] = t('jobApplication.steps.employmentHistory.validation.employerNameRequired')
        isValid = false
      }
      if (!entry.starting_job_title) {
        errors[`employment_${index}_starting_job_title`] = t('jobApplication.steps.employmentHistory.validation.startingJobTitleRequired')
        isValid = false
      }
      if (!entry.is_current && !entry.ending_job_title) {
        errors[`employment_${index}_ending_job_title`] = t('jobApplication.steps.employmentHistory.validation.endingJobTitleRequired')
        isValid = false
      }
      if (!entry.starting_salary) {
        errors[`employment_${index}_starting_salary`] = t('jobApplication.steps.employmentHistory.validation.startingSalaryRequired')
        isValid = false
      }
      if (!entry.is_current && !entry.ending_salary) {
        errors[`employment_${index}_ending_salary`] = t('jobApplication.steps.employmentHistory.validation.endingSalaryRequired')
        isValid = false
      }
      if (!entry.start_date) {
        errors[`employment_${index}_start_date`] = t('jobApplication.steps.employmentHistory.validation.startDateRequired')
        isValid = false
      }
      if (!entry.is_current && !entry.end_date) {
        errors[`employment_${index}_end_date`] = t('jobApplication.steps.employmentHistory.validation.endDateRequired')
        isValid = false
      }
      if (entry.start_date && entry.end_date && new Date(entry.start_date) > new Date(entry.end_date)) {
        errors[`employment_${index}_dates`] = t('jobApplication.steps.employmentHistory.validation.endDateBeforeStart')
        isValid = false
      }
      if (!entry.is_current && !entry.reason_for_leaving) {
        errors[`employment_${index}_reason_for_leaving`] = t('jobApplication.steps.employmentHistory.validation.reasonForLeavingRequired')
        isValid = false
      }
    })

    setLocalErrors(errors)
    updateFormData({ 
      employment_history: employmentHistory,
      has_no_work_history: false 
    })
    onComplete(isValid && employmentHistory.length > 0)
  }

  const addEmploymentEntry = () => {
    setEmploymentHistory([...employmentHistory, { ...emptyEmploymentEntry }])
  }

  const removeEmploymentEntry = (index: number) => {
    if (employmentHistory.length > 1) {
      const newHistory = employmentHistory.filter((_, i) => i !== index)
      setEmploymentHistory(newHistory)
    }
  }

  const updateEmploymentEntry = (index: number, field: keyof EmploymentEntry, value: any) => {
    setHasInteracted(true)
    const newHistory = [...employmentHistory]
    newHistory[index] = { ...newHistory[index], [field]: value }
    
    // Clear end date, ending job title, ending salary and reason for leaving if marking as current
    if (field === 'is_current' && value) {
      newHistory[index].end_date = ''
      newHistory[index].ending_job_title = ''
      newHistory[index].ending_salary = ''
      newHistory[index].reason_for_leaving = ''
    }
    
    setEmploymentHistory(newHistory)
  }

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const handleNoWorkHistoryChange = (checked: boolean) => {
    setHasInteracted(true)
    setHasNoWorkHistory(checked)
    if (checked) {
      setEmploymentHistory([])
    } else {
      setEmploymentHistory([{ ...emptyEmploymentEntry }])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center">
          <Briefcase className="w-5 h-5 mr-2" />
          {t('jobApplication.steps.employmentHistory.title')}
        </h3>
        
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <Checkbox
            id="no_work_history"
            checked={hasNoWorkHistory}
            onCheckedChange={handleNoWorkHistoryChange}
            className="h-5 w-5"
          />
          <Label htmlFor="no_work_history" className="text-base font-medium cursor-pointer">
            {t('jobApplication.steps.employmentHistory.noExperience')}
          </Label>
        </div>
      </div>

      {!hasNoWorkHistory && (
        <>
          <p className="text-sm text-gray-600">
            {t('jobApplication.steps.employmentHistory.instruction')}
          </p>

          {employmentHistory.map((entry, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {t('jobApplication.steps.employmentHistory.employment')} #{index + 1}
                    {entry.is_current && <span className="ml-2 text-sm text-green-600">({t('jobApplication.steps.employmentHistory.current')})</span>}
                  </CardTitle>
                  {employmentHistory.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEmploymentEntry(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {/* Company Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`employer_name_${index}`}>{t('jobApplication.steps.employmentHistory.fields.companyName')} *</Label>
                      <Input
                        id={`employer_name_${index}`}
                        value={entry.employer_name}
                        onChange={(e) => updateEmploymentEntry(index, 'employer_name', e.target.value)}
                        className={localErrors[`employment_${index}_employer_name`] ? 'border-red-500' : ''}
                        placeholder={t('jobApplication.steps.employmentHistory.placeholders.companyName')}
                      />
                      {hasInteracted && localErrors[`employment_${index}_employer_name`] && (
                        <p className="text-sm text-red-600">{localErrors[`employment_${index}_employer_name`]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`employer_phone_${index}`}>{t('jobApplication.steps.employmentHistory.fields.companyPhone')} *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id={`employer_phone_${index}`}
                          type="tel"
                          value={entry.employer_phone}
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value)
                            updateEmploymentEntry(index, 'employer_phone', formatted)
                          }}
                          className={`pl-10 ${localErrors[`employment_${index}_employer_phone`] ? 'border-red-500' : ''}`}
                          placeholder="(555) 123-4567"
                          maxLength={14}
                        />
                      </div>
                      {hasInteracted && localErrors[`employment_${index}_employer_phone`] && (
                        <p className="text-sm text-red-600">{localErrors[`employment_${index}_employer_phone`]}</p>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor={`employer_address_${index}`}>{t('jobApplication.steps.employmentHistory.fields.companyAddress')} *</Label>
                    <Input
                      id={`employer_address_${index}`}
                      value={entry.employer_address}
                      onChange={(e) => updateEmploymentEntry(index, 'employer_address', e.target.value)}
                      className={localErrors[`employment_${index}_employer_address`] ? 'border-red-500' : ''}
                      placeholder={t('jobApplication.steps.employmentHistory.placeholders.companyAddress')}
                    />
                    {hasInteracted && localErrors[`employment_${index}_employer_address`] && (
                      <p className="text-sm text-red-600">{localErrors[`employment_${index}_employer_address`]}</p>
                    )}
                  </div>

                  {/* Job Titles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`starting_job_title_${index}`}>{t('jobApplication.steps.employmentHistory.fields.startingJobTitle')} *</Label>
                      <Input
                        id={`starting_job_title_${index}`}
                        value={entry.starting_job_title}
                        onChange={(e) => updateEmploymentEntry(index, 'starting_job_title', e.target.value)}
                        className={localErrors[`employment_${index}_starting_job_title`] ? 'border-red-500' : ''}
                        placeholder={t('jobApplication.steps.employmentHistory.placeholders.jobTitle')}
                      />
                      {hasInteracted && localErrors[`employment_${index}_starting_job_title`] && (
                        <p className="text-sm text-red-600">{localErrors[`employment_${index}_starting_job_title`]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`ending_job_title_${index}`}>{t('jobApplication.steps.employmentHistory.fields.finalJobTitle')} {!entry.is_current && '*'}</Label>
                      <Input
                        id={`ending_job_title_${index}`}
                        value={entry.ending_job_title}
                        onChange={(e) => updateEmploymentEntry(index, 'ending_job_title', e.target.value)}
                        className={localErrors[`employment_${index}_ending_job_title`] ? 'border-red-500' : ''}
                        placeholder={t('jobApplication.steps.employmentHistory.placeholders.finalJobTitle')}
                        disabled={entry.is_current}
                      />
                      {hasInteracted && localErrors[`employment_${index}_ending_job_title`] && (
                        <p className="text-sm text-red-600">{localErrors[`employment_${index}_ending_job_title`]}</p>
                      )}
                    </div>
                  </div>
                  {/* Current Employment Checkbox */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`is_current_${index}`}
                      checked={entry.is_current}
                      onCheckedChange={(checked) => updateEmploymentEntry(index, 'is_current', checked)}
                    />
                    <Label htmlFor={`is_current_${index}`} className="text-sm font-normal cursor-pointer">
                      {t('jobApplication.steps.employmentHistory.fields.currentlyWork')}
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`start_date_${index}`}>{t('jobApplication.steps.employmentHistory.fields.startDate')} *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id={`start_date_${index}`}
                        type="date"
                        value={entry.start_date}
                        onChange={(e) => updateEmploymentEntry(index, 'start_date', e.target.value)}
                        className={`pl-10 ${localErrors[`employment_${index}_start_date`] ? 'border-red-500' : ''}`}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    {hasInteracted && localErrors[`employment_${index}_start_date`] && (
                      <p className="text-sm text-red-600">{localErrors[`employment_${index}_start_date`]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`end_date_${index}`}>{t('jobApplication.steps.employmentHistory.fields.endDate')} {!entry.is_current && '*'}</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id={`end_date_${index}`}
                        type="date"
                        value={entry.end_date}
                        onChange={(e) => updateEmploymentEntry(index, 'end_date', e.target.value)}
                        className={`pl-10 ${localErrors[`employment_${index}_end_date`] ? 'border-red-500' : ''}`}
                        disabled={entry.is_current}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    {hasInteracted && localErrors[`employment_${index}_end_date`] && (
                      <p className="text-sm text-red-600">{localErrors[`employment_${index}_end_date`]}</p>
                    )}
                    {hasInteracted && localErrors[`employment_${index}_dates`] && (
                      <p className="text-sm text-red-600">{localErrors[`employment_${index}_dates`]}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`starting_salary_${index}`}>{t('jobApplication.steps.employmentHistory.fields.startingSalary')} *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id={`starting_salary_${index}`}
                        value={entry.starting_salary}
                        onChange={(e) => updateEmploymentEntry(index, 'starting_salary', e.target.value)}
                        className={`pl-10 ${localErrors[`employment_${index}_starting_salary`] ? 'border-red-500' : ''}`}
                        placeholder={t('jobApplication.steps.employmentHistory.placeholders.salary')}
                      />
                    </div>
                    {hasInteracted && localErrors[`employment_${index}_starting_salary`] && (
                      <p className="text-sm text-red-600">{localErrors[`employment_${index}_starting_salary`]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`ending_salary_${index}`}>{t('jobApplication.steps.employmentHistory.fields.endingSalary')} {!entry.is_current && '*'}</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id={`ending_salary_${index}`}
                        value={entry.ending_salary}
                        onChange={(e) => updateEmploymentEntry(index, 'ending_salary', e.target.value)}
                        className={`pl-10 ${localErrors[`employment_${index}_ending_salary`] ? 'border-red-500' : ''}`}
                        placeholder={t('jobApplication.steps.employmentHistory.placeholders.endingSalary')}
                        disabled={entry.is_current}
                      />
                    </div>
                    {hasInteracted && localErrors[`employment_${index}_ending_salary`] && (
                      <p className="text-sm text-red-600">{localErrors[`employment_${index}_ending_salary`]}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`responsibilities_${index}`}>{t('jobApplication.steps.employmentHistory.fields.responsibilities')}</Label>
                  <Textarea
                    id={`responsibilities_${index}`}
                    value={entry.responsibilities}
                    onChange={(e) => updateEmploymentEntry(index, 'responsibilities', e.target.value)}
                    placeholder={t('jobApplication.steps.employmentHistory.placeholders.responsibilities')}
                    rows={3}
                  />
                </div>

                {!entry.is_current && (
                  <div className="space-y-2">
                    <Label htmlFor={`reason_for_leaving_${index}`}>{t('jobApplication.steps.employmentHistory.fields.reasonForLeaving')} *</Label>
                    <Input
                      id={`reason_for_leaving_${index}`}
                      value={entry.reason_for_leaving}
                      onChange={(e) => updateEmploymentEntry(index, 'reason_for_leaving', e.target.value)}
                      className={localErrors[`employment_${index}_reason_for_leaving`] ? 'border-red-500' : ''}
                      placeholder={t('jobApplication.steps.employmentHistory.placeholders.reasonForLeaving')}
                    />
                    {hasInteracted && localErrors[`employment_${index}_reason_for_leaving`] && (
                      <p className="text-sm text-red-600">{localErrors[`employment_${index}_reason_for_leaving`]}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`supervisor_name_${index}`}>{t('jobApplication.steps.employmentHistory.fields.supervisorName')}</Label>
                    <Input
                      id={`supervisor_name_${index}`}
                      value={entry.supervisor_name}
                      onChange={(e) => updateEmploymentEntry(index, 'supervisor_name', e.target.value)}
                      placeholder={t('jobApplication.steps.employmentHistory.placeholders.supervisorName')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`supervisor_phone_${index}`}>{t('jobApplication.steps.employmentHistory.fields.supervisorPhone')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id={`supervisor_phone_${index}`}
                        type="tel"
                        value={entry.supervisor_phone}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value)
                          updateEmploymentEntry(index, 'supervisor_phone', formatted)
                        }}
                        className="pl-10"
                        placeholder="(555) 123-4567"
                        maxLength={14}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`may_contact_${index}`}
                    checked={entry.may_contact}
                    onCheckedChange={(checked) => updateEmploymentEntry(index, 'may_contact', checked as boolean)}
                  />
                  <Label htmlFor={`may_contact_${index}`} className="text-sm font-normal cursor-pointer">
                    {t('jobApplication.steps.employmentHistory.fields.mayContact')}
                  </Label>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addEmploymentEntry}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('jobApplication.steps.employmentHistory.addAnother')}
          </Button>

          <div className="space-y-4">
            <h4 className="font-medium">{t('jobApplication.steps.employmentHistory.fields.employmentGaps')}</h4>
            <div className="space-y-2">
              <Label htmlFor="employment_gaps">
                {t('jobApplication.steps.employmentHistory.fields.gapsExplanation')}
              </Label>
              <Textarea
                id="employment_gaps"
                value={formData.employment_gaps || ''}
                onChange={(e) => updateFormData({ employment_gaps: e.target.value })}
                placeholder={t('jobApplication.steps.employmentHistory.placeholders.employmentGaps')}
                rows={2}
              />
            </div>
          </div>
        </>
      )}

      {hasNoWorkHistory && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{t('jobApplication.steps.employmentHistory.note.title')}:</strong> {t('jobApplication.steps.employmentHistory.note.noExperienceText')}
          </p>
        </div>
      )}
    </div>
  )
}