import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import { formValidator, ValidationRule } from '@/utils/formValidation'
import {
  MobileInput,
  MobileLabel,
  MobileTextarea,
  MobileCheckbox,
  MobileErrorMessage,
  MobileFormField,
  MobileFormGrid
} from './mobile-optimized'

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

  // Function to mark all required fields as touched
  const markAllFieldsTouched = () => {
    // Only mark fields as touched if user hasn't checked "no work history"
    if (!hasNoWorkHistory) {
      setHasInteracted(true)
    }
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
    <div className="space-y-[clamp(1.5rem,4vw,2rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-[clamp(1.125rem,3vw,1.5rem)] font-semibold">
          {t('jobApplication.steps.employmentHistory.title')}
        </h3>

        <MobileCheckbox
          id="no_work_history"
          checked={hasNoWorkHistory}
          onCheckedChange={handleNoWorkHistoryChange}
          label={t('jobApplication.steps.employmentHistory.noExperience')}
          className="bg-gray-50 rounded-lg border border-gray-200 p-3"
        />
      </div>

      {!hasNoWorkHistory && (
        <>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600">
            {t('jobApplication.steps.employmentHistory.instruction')}
          </p>

          {employmentHistory.map((entry, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[clamp(1rem,2.5vw,1.125rem)]">
                    {t('jobApplication.steps.employmentHistory.employment')} #{index + 1}
                    {entry.is_current && <span className="ml-2 text-[clamp(0.875rem,2vw,1rem)] text-green-600">({t('jobApplication.steps.employmentHistory.current')})</span>}
                  </CardTitle>
                  {employmentHistory.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEmploymentEntry(index)}
                      className="h-[clamp(2.75rem,5vw,3rem)]"
                    >
                      <Trash2 className="w-[clamp(1rem,2.5vw,1.25rem)] h-[clamp(1rem,2.5vw,1.25rem)]" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-[clamp(1rem,3vw,1.5rem)]">
                {/* Company Information */}
                <MobileFormGrid columns={2}>
                  <MobileFormField>
                    <MobileLabel htmlFor={`employer_name_${index}`} required>
                      {t('jobApplication.steps.employmentHistory.fields.companyName')}
                    </MobileLabel>
                    <MobileInput
                      id={`employer_name_${index}`}
                      value={entry.employer_name}
                      onChange={(e) => updateEmploymentEntry(index, 'employer_name', e.target.value)}
                      error={!!localErrors[`employment_${index}_employer_name`]}
                      placeholder=""
                    />
                    {hasInteracted && (
                      <MobileErrorMessage>{localErrors[`employment_${index}_employer_name`]}</MobileErrorMessage>
                    )}
                  </MobileFormField>

                  <MobileFormField>
                    <MobileLabel htmlFor={`employer_phone_${index}`} required>
                      {t('jobApplication.steps.employmentHistory.fields.companyPhone')}
                    </MobileLabel>
                    <MobileInput
                      id={`employer_phone_${index}`}
                      type="tel"
                      mobileKeyboard="tel"
                      value={entry.employer_phone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value)
                        updateEmploymentEntry(index, 'employer_phone', formatted)
                      }}
                      error={!!localErrors[`employment_${index}_employer_phone`]}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                    {hasInteracted && (
                      <MobileErrorMessage>{localErrors[`employment_${index}_employer_phone`]}</MobileErrorMessage>
                    )}
                  </MobileFormField>
                </MobileFormGrid>

                {/* Address */}
                <MobileFormField>
                  <MobileLabel htmlFor={`employer_address_${index}`} required>
                    {t('jobApplication.steps.employmentHistory.fields.companyAddress')}
                  </MobileLabel>
                  <MobileInput
                    id={`employer_address_${index}`}
                    value={entry.employer_address}
                    onChange={(e) => updateEmploymentEntry(index, 'employer_address', e.target.value)}
                    error={!!localErrors[`employment_${index}_employer_address`]}
                    placeholder=""
                  />
                  {hasInteracted && (
                    <MobileErrorMessage>{localErrors[`employment_${index}_employer_address`]}</MobileErrorMessage>
                  )}
                </MobileFormField>

                {/* Job Titles */}
                <MobileFormGrid columns={2}>
                  <MobileFormField>
                    <MobileLabel htmlFor={`starting_job_title_${index}`} required>
                      {t('jobApplication.steps.employmentHistory.fields.startingJobTitle')}
                    </MobileLabel>
                    <MobileInput
                      id={`starting_job_title_${index}`}
                      value={entry.starting_job_title}
                      onChange={(e) => updateEmploymentEntry(index, 'starting_job_title', e.target.value)}
                      error={!!localErrors[`employment_${index}_starting_job_title`]}
                      placeholder=""
                    />
                    {hasInteracted && (
                      <MobileErrorMessage>{localErrors[`employment_${index}_starting_job_title`]}</MobileErrorMessage>
                    )}
                  </MobileFormField>

                  <MobileFormField>
                    <MobileLabel htmlFor={`ending_job_title_${index}`} required={!entry.is_current}>
                      {t('jobApplication.steps.employmentHistory.fields.finalJobTitle')}
                    </MobileLabel>
                    <MobileInput
                      id={`ending_job_title_${index}`}
                      value={entry.ending_job_title}
                      onChange={(e) => updateEmploymentEntry(index, 'ending_job_title', e.target.value)}
                      error={!!localErrors[`employment_${index}_ending_job_title`]}
                      placeholder=""
                      disabled={entry.is_current}
                    />
                    {hasInteracted && (
                      <MobileErrorMessage>{localErrors[`employment_${index}_ending_job_title`]}</MobileErrorMessage>
                    )}
                  </MobileFormField>
                </MobileFormGrid>

                {/* Current Employment Checkbox */}
                <MobileCheckbox
                  id={`is_current_${index}`}
                  checked={entry.is_current}
                  onCheckedChange={(checked) => updateEmploymentEntry(index, 'is_current', checked)}
                  label={t('jobApplication.steps.employmentHistory.fields.currentlyWork')}
                />

                {/* Dates */}
                <MobileFormGrid columns={2}>
                  <MobileFormField>
                    <MobileLabel htmlFor={`start_date_${index}`} required>
                      {t('jobApplication.steps.employmentHistory.fields.startDate')}
                    </MobileLabel>
                    <MobileInput
                      id={`start_date_${index}`}
                      type="date"
                      value={entry.start_date}
                      onChange={(e) => updateEmploymentEntry(index, 'start_date', e.target.value)}
                      error={!!localErrors[`employment_${index}_start_date`]}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {hasInteracted && (
                      <MobileErrorMessage>{localErrors[`employment_${index}_start_date`]}</MobileErrorMessage>
                    )}
                  </MobileFormField>

                  <MobileFormField>
                    <MobileLabel htmlFor={`end_date_${index}`} required={!entry.is_current}>
                      {t('jobApplication.steps.employmentHistory.fields.endDate')}
                    </MobileLabel>
                    <MobileInput
                      id={`end_date_${index}`}
                      type="date"
                      value={entry.end_date}
                      onChange={(e) => updateEmploymentEntry(index, 'end_date', e.target.value)}
                      error={!!localErrors[`employment_${index}_end_date`]}
                      disabled={entry.is_current}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {hasInteracted && (
                      <>
                        <MobileErrorMessage>{localErrors[`employment_${index}_end_date`]}</MobileErrorMessage>
                        <MobileErrorMessage>{localErrors[`employment_${index}_dates`]}</MobileErrorMessage>
                      </>
                    )}
                  </MobileFormField>
                </MobileFormGrid>

                {/* Salary */}
                <MobileFormGrid columns={2}>
                  <MobileFormField>
                    <MobileLabel htmlFor={`starting_salary_${index}`} required>
                      {t('jobApplication.steps.employmentHistory.fields.startingSalary')}
                    </MobileLabel>
                    <MobileInput
                      id={`starting_salary_${index}`}
                      type="text"
                      mobileKeyboard="decimal"
                      value={entry.starting_salary}
                      onChange={(e) => updateEmploymentEntry(index, 'starting_salary', e.target.value)}
                      error={!!localErrors[`employment_${index}_starting_salary`]}
                      placeholder="$12"
                    />
                    {hasInteracted && (
                      <MobileErrorMessage>{localErrors[`employment_${index}_starting_salary`]}</MobileErrorMessage>
                    )}
                  </MobileFormField>

                  <MobileFormField>
                    <MobileLabel htmlFor={`ending_salary_${index}`} required={!entry.is_current}>
                      {t('jobApplication.steps.employmentHistory.fields.endingSalary')}
                    </MobileLabel>
                    <MobileInput
                      id={`ending_salary_${index}`}
                      type="text"
                      mobileKeyboard="decimal"
                      value={entry.ending_salary}
                      onChange={(e) => updateEmploymentEntry(index, 'ending_salary', e.target.value)}
                      error={!!localErrors[`employment_${index}_ending_salary`]}
                      placeholder="$12"
                      disabled={entry.is_current}
                    />
                    {hasInteracted && (
                      <MobileErrorMessage>{localErrors[`employment_${index}_ending_salary`]}</MobileErrorMessage>
                    )}
                  </MobileFormField>
                </MobileFormGrid>

                {/* Responsibilities */}
                <MobileFormField>
                  <MobileLabel htmlFor={`responsibilities_${index}`}>
                    {t('jobApplication.steps.employmentHistory.fields.responsibilities')}
                  </MobileLabel>
                  <MobileTextarea
                    id={`responsibilities_${index}`}
                    value={entry.responsibilities}
                    onChange={(e) => updateEmploymentEntry(index, 'responsibilities', e.target.value)}
                    placeholder=""
                    rows={3}
                  />
                </MobileFormField>

                {/* Reason for Leaving */}
                {!entry.is_current && (
                  <MobileFormField>
                    <MobileLabel htmlFor={`reason_for_leaving_${index}`} required>
                      {t('jobApplication.steps.employmentHistory.fields.reasonForLeaving')}
                    </MobileLabel>
                    <MobileInput
                      id={`reason_for_leaving_${index}`}
                      value={entry.reason_for_leaving}
                      onChange={(e) => updateEmploymentEntry(index, 'reason_for_leaving', e.target.value)}
                      error={!!localErrors[`employment_${index}_reason_for_leaving`]}
                      placeholder=""
                    />
                    {hasInteracted && (
                      <MobileErrorMessage>{localErrors[`employment_${index}_reason_for_leaving`]}</MobileErrorMessage>
                    )}
                  </MobileFormField>
                )}

                {/* Supervisor Information */}
                <MobileFormGrid columns={2}>
                  <MobileFormField>
                    <MobileLabel htmlFor={`supervisor_name_${index}`}>
                      {t('jobApplication.steps.employmentHistory.fields.supervisorName')}
                    </MobileLabel>
                    <MobileInput
                      id={`supervisor_name_${index}`}
                      value={entry.supervisor_name}
                      onChange={(e) => updateEmploymentEntry(index, 'supervisor_name', e.target.value)}
                      placeholder=""
                    />
                  </MobileFormField>

                  <MobileFormField>
                    <MobileLabel htmlFor={`supervisor_phone_${index}`}>
                      {t('jobApplication.steps.employmentHistory.fields.supervisorPhone')}
                    </MobileLabel>
                    <MobileInput
                      id={`supervisor_phone_${index}`}
                      type="tel"
                      mobileKeyboard="tel"
                      value={entry.supervisor_phone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value)
                        updateEmploymentEntry(index, 'supervisor_phone', formatted)
                      }}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                  </MobileFormField>
                </MobileFormGrid>

                {/* May Contact Checkbox */}
                <MobileCheckbox
                  id={`may_contact_${index}`}
                  checked={entry.may_contact}
                  onCheckedChange={(checked) => updateEmploymentEntry(index, 'may_contact', checked as boolean)}
                  label={t('jobApplication.steps.employmentHistory.fields.mayContact')}
                />
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addEmploymentEntry}
            className="w-full h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)]"
          >
            <Plus className="w-[clamp(1rem,2.5vw,1.25rem)] h-[clamp(1rem,2.5vw,1.25rem)] mr-2" />
            {t('jobApplication.steps.employmentHistory.addAnother')}
          </Button>

          <div className="space-y-[clamp(1rem,3vw,1.5rem)]">
            <h4 className="text-[clamp(1rem,2.5vw,1.125rem)] font-medium">
              {t('jobApplication.steps.employmentHistory.fields.employmentGaps')}
            </h4>
            <MobileFormField>
              <MobileLabel htmlFor="employment_gaps">
                {t('jobApplication.steps.employmentHistory.fields.gapsExplanation')}
              </MobileLabel>
              <MobileTextarea
                id="employment_gaps"
                value={formData.employment_gaps || ''}
                onChange={(e) => updateFormData({ employment_gaps: e.target.value })}
                placeholder=""
                rows={2}
              />
            </MobileFormField>
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