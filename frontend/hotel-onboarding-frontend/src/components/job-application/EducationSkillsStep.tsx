import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { GraduationCap, Plus, Trash2, School, Briefcase, Award } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

interface EducationSkillsStepProps {
  formData: any
  updateFormData: (data: any) => void
  validationErrors: Record<string, string>
  onComplete: (isComplete: boolean) => void
}

interface EducationEntry {
  name: string
  location: string
  years_attended: string
  graduated: string
  major_minor: string
  degree_received: string
}

const defaultEducation = {
  high_school: {
    name: '',
    location: '',
    years_attended: '',
    graduated: '',
    major_minor: '',
    degree_received: ''
  },
  colleges: [
    {
      name: '',
      location: '',
      years_attended: '',
      graduated: '',
      major_minor: '',
      degree_received: ''
    }
  ],
  technical: {
    name: '',
    location: '',
    years_attended: '',
    graduated: '',
    major_minor: '',
    degree_received: ''
  },
  other: {
    name: '',
    location: '',
    years_attended: '',
    graduated: '',
    major_minor: '',
    degree_received: ''
  }
}

export default function EducationSkillsStep({
  formData,
  updateFormData,
  validationErrors: externalErrors,
  onComplete
}: EducationSkillsStepProps) {
  const { t } = useTranslation()
  const [education, setEducation] = useState(() => {
    const saved = formData.education || defaultEducation
    // Ensure colleges is an array
    if (!Array.isArray(saved.colleges)) {
      saved.colleges = saved.college1 || saved.college2 ? 
        [saved.college1 || {}, saved.college2 || {}].filter(c => c.name) : 
        []
    }
    return saved
  })
  const [skills_certifications, setSkillsCertifications] = useState(formData.skills_certifications || '')
  const [hasNoTechnicalEducation, setHasNoTechnicalEducation] = useState(formData.has_no_technical_education || false)
  const [hasNoOtherEducation, setHasNoOtherEducation] = useState(formData.has_no_other_education || false)
  const [hasNoSkillsCertifications, setHasNoSkillsCertifications] = useState(formData.has_no_skills_certifications || false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Education is optional, so always mark as complete
    updateFormData({ 
      education,
      skills_certifications 
    })
    onComplete(true)
  }, [education, skills_certifications])

  // Function to mark all fields as touched (even though education is optional)
  const markAllFieldsTouched = () => {
    // Since education is optional, we'll mark basic education fields as touched for visual consistency
    const touchedState: Record<string, boolean> = {
      'high_school_name': true,
      'high_school_location': true,
      'skills_certifications': true
    }
    setTouched(touchedState)
  }

  // Force validation when requested by parent (even though education is optional)
  useEffect(() => {
    if (externalErrors._forceValidation) {
      markAllFieldsTouched()
    }
  }, [externalErrors._forceValidation])

  const updateEducationEntry = (school: string, field: string, value: string) => {
    setEducation({
      ...education,
      [school]: {
        ...education[school],
        [field]: value
      }
    })
  }

  const updateCollegeEntry = (index: number, field: string, value: string) => {
    const newColleges = [...education.colleges]
    newColleges[index] = {
      ...newColleges[index],
      [field]: value
    }
    setEducation({
      ...education,
      colleges: newColleges
    })
  }

  const addCollege = () => {
    setEducation({
      ...education,
      colleges: [...education.colleges, {
        name: '',
        location: '',
        years_attended: '',
        graduated: '',
        major_minor: '',
        degree_received: ''
      }]
    })
  }

  const removeCollege = (index: number) => {
    const newColleges = education.colleges.filter((_, i) => i !== index)
    setEducation({
      ...education,
      colleges: newColleges
    })
  }

  const renderEducationEntryWithCheckbox = (label: string, schoolKey: string, icon: React.ReactNode, accentColor: string = "blue", hasNoEducation: boolean, setHasNoEducation: (value: boolean) => void) => {
    const school = education[schoolKey] || {}
    
    return (
      <Card key={schoolKey} className="mb-4 overflow-hidden">
        <div className={`h-2 ${
          accentColor === 'blue' ? 'bg-blue-500' : 
          accentColor === 'green' ? 'bg-green-500' : 
          accentColor === 'orange' ? 'bg-orange-500' : 
          'bg-gray-500'
        }`} />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Checkbox
                id={`no_${schoolKey}`}
                checked={hasNoEducation}
                onCheckedChange={(checked) => {
                  setHasNoEducation(checked as boolean)
                  updateFormData({ [`has_no_${schoolKey}_education`]: checked })
                  if (checked) {
                    // Clear education fields when checked
                    setEducation({
                      ...education,
                      [schoolKey]: {
                        name: '',
                        location: '',
                        years_attended: '',
                        graduated: '',
                        major_minor: '',
                        degree_received: ''
                      }
                    })
                  }
                }}
                className="h-5 w-5"
              />
              <Label htmlFor={`no_${schoolKey}`} className="text-base font-medium cursor-pointer">
                {t(`jobApplication.steps.education.no${schoolKey.charAt(0).toUpperCase() + schoolKey.slice(1)}Education`)}
              </Label>
            </div>
          </div>
          
          {!hasNoEducation && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`${schoolKey}_name`}>{t('jobApplication.steps.education.fields.schoolName')}</Label>
                  <Input
                    id={`${schoolKey}_name`}
                    value={school.name || ''}
                    onChange={(e) => updateEducationEntry(schoolKey, 'name', e.target.value)}
                    placeholder=""
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${schoolKey}_location`}>{t('jobApplication.steps.education.fields.location')}</Label>
                  <Input
                    id={`${schoolKey}_location`}
                    value={school.location || ''}
                    onChange={(e) => updateEducationEntry(schoolKey, 'location', e.target.value)}
                    placeholder=""
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`${schoolKey}_years`}>{t('jobApplication.steps.education.fields.yearsAttended')}</Label>
                  <Input
                    id={`${schoolKey}_years`}
                    value={school.years_attended || ''}
                    onChange={(e) => updateEducationEntry(schoolKey, 'years_attended', e.target.value)}
                    placeholder="4"
                    className="text-center"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('jobApplication.steps.education.fields.graduated')}</Label>
                  <RadioGroup 
                    value={school.graduated || ''} 
                    onValueChange={(value) => updateEducationEntry(schoolKey, 'graduated', value)}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id={`${schoolKey}_grad_yes`} />
                      <Label htmlFor={`${schoolKey}_grad_yes`} className="font-normal">{t('common.yes')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`${schoolKey}_grad_no`} />
                      <Label htmlFor={`${schoolKey}_grad_no`} className="font-normal">{t('common.no')}</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${schoolKey}_degree`}>{t('jobApplication.steps.education.fields.degreeReceived')}</Label>
                  <Input
                    id={`${schoolKey}_degree`}
                    value={school.degree_received || ''}
                    onChange={(e) => updateEducationEntry(schoolKey, 'degree_received', e.target.value)}
                    placeholder=""
                  />
                </div>
              </div>
              
              {schoolKey !== 'high_school' && (
                <div className="space-y-2">
                  <Label htmlFor={`${schoolKey}_major`}>{t('jobApplication.steps.education.fields.major')}</Label>
                  <Input
                    id={`${schoolKey}_major`}
                    value={school.major_minor || ''}
                    onChange={(e) => updateEducationEntry(schoolKey, 'major_minor', e.target.value)}
                    placeholder=""
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderEducationEntry = (label: string, schoolKey: string, icon: React.ReactNode, accentColor: string = "blue") => {
    const school = education[schoolKey] || {}
    
    return (
      <Card key={schoolKey} className="mb-4 overflow-hidden">
        <div className={`h-2 ${
          accentColor === 'blue' ? 'bg-blue-500' : 
          accentColor === 'green' ? 'bg-green-500' : 
          accentColor === 'orange' ? 'bg-orange-500' : 
          'bg-gray-500'
        }`} />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${schoolKey}_name`}>{t('jobApplication.steps.education.fields.schoolName')}</Label>
              <Input
                id={`${schoolKey}_name`}
                value={school.name || ''}
                onChange={(e) => updateEducationEntry(schoolKey, 'name', e.target.value)}
                placeholder=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${schoolKey}_location`}>{t('jobApplication.steps.education.fields.location')}</Label>
              <Input
                id={`${schoolKey}_location`}
                value={school.location || ''}
                onChange={(e) => updateEducationEntry(schoolKey, 'location', e.target.value)}
                placeholder=""
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${schoolKey}_years`}>{t('jobApplication.steps.education.fields.yearsAttended')}</Label>
              <Input
                id={`${schoolKey}_years`}
                value={school.years_attended || ''}
                onChange={(e) => updateEducationEntry(schoolKey, 'years_attended', e.target.value)}
                placeholder="4"
                className="text-center"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('jobApplication.steps.education.fields.graduated')}</Label>
              <RadioGroup 
                value={school.graduated || ''} 
                onValueChange={(value) => updateEducationEntry(schoolKey, 'graduated', value)}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id={`${schoolKey}_grad_yes`} />
                  <Label htmlFor={`${schoolKey}_grad_yes`} className="font-normal">{t('common.yes')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id={`${schoolKey}_grad_no`} />
                  <Label htmlFor={`${schoolKey}_grad_no`} className="font-normal">{t('common.no')}</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${schoolKey}_degree`}>{t('jobApplication.steps.education.fields.degreeReceived')}</Label>
              <Input
                id={`${schoolKey}_degree`}
                value={school.degree_received || ''}
                onChange={(e) => updateEducationEntry(schoolKey, 'degree_received', e.target.value)}
                placeholder=""
              />
            </div>
          </div>
          
          {schoolKey !== 'high_school' && (
            <div className="space-y-2">
              <Label htmlFor={`${schoolKey}_major`}>{t('jobApplication.steps.education.fields.major')}</Label>
              <Input
                id={`${schoolKey}_major`}
                value={school.major_minor || ''}
                onChange={(e) => updateEducationEntry(schoolKey, 'major_minor', e.target.value)}
                placeholder=""
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderCollegeEntry = (college: any, index: number) => {
    return (
      <Card key={`college_${index}`} className="mb-4 overflow-hidden">
        <div className="h-2 bg-purple-500" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              {t('jobApplication.steps.education.schools.college')} #{index + 1}
            </CardTitle>
            {education.colleges.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCollege(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`college_${index}_name`}>{t('jobApplication.steps.education.fields.schoolName')}</Label>
              <Input
                id={`college_${index}_name`}
                value={college.name || ''}
                onChange={(e) => updateCollegeEntry(index, 'name', e.target.value)}
                placeholder=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`college_${index}_location`}>{t('jobApplication.steps.education.fields.location')}</Label>
              <Input
                id={`college_${index}_location`}
                value={college.location || ''}
                onChange={(e) => updateCollegeEntry(index, 'location', e.target.value)}
                placeholder=""
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`college_${index}_years`}>{t('jobApplication.steps.education.fields.yearsAttended')}</Label>
              <Input
                id={`college_${index}_years`}
                value={college.years_attended || ''}
                onChange={(e) => updateCollegeEntry(index, 'years_attended', e.target.value)}
                placeholder="4"
                className="text-center"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('jobApplication.steps.education.fields.graduated')}</Label>
              <RadioGroup 
                value={college.graduated || ''} 
                onValueChange={(value) => updateCollegeEntry(index, 'graduated', value)}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id={`college_${index}_grad_yes`} />
                  <Label htmlFor={`college_${index}_grad_yes`} className="font-normal">{t('common.yes')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id={`college_${index}_grad_no`} />
                  <Label htmlFor={`college_${index}_grad_no`} className="font-normal">{t('common.no')}</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`college_${index}_degree`}>{t('jobApplication.steps.education.fields.degreeReceived')}</Label>
              <Input
                id={`college_${index}_degree`}
                value={college.degree_received || ''}
                onChange={(e) => updateCollegeEntry(index, 'degree_received', e.target.value)}
                placeholder=""
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`college_${index}_major`}>{t('jobApplication.steps.education.fields.major')}</Label>
            <Input
              id={`college_${index}_major`}
              value={college.major_minor || ''}
              onChange={(e) => updateCollegeEntry(index, 'major_minor', e.target.value)}
              placeholder=""
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center text-lg font-semibold mb-4">
        <GraduationCap className="w-5 h-5 mr-2" />
        {t('jobApplication.steps.education.title')}
      </div>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('jobApplication.steps.education.instruction')}
        </AlertDescription>
      </Alert>

      {/* High School */}
      {renderEducationEntry(
        t('jobApplication.steps.education.schools.highSchool'), 
        'high_school',
        <School className="w-5 h-5 text-blue-600" />,
        "blue"
      )}

      {/* Colleges/Universities Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-700">{t('jobApplication.steps.education.collegeSection')}</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCollege}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('jobApplication.steps.education.addCollege')}
          </Button>
        </div>
        {education.colleges.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-gray-500">
              <GraduationCap className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>{t('jobApplication.steps.education.noCollege')}</p>
              <Button
                type="button"
                variant="link"
                onClick={addCollege}
                className="mt-2"
              >
                {t('jobApplication.steps.education.addFirstCollege')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          education.colleges.map((college, index) => renderCollegeEntry(college, index))
        )}
      </div>

      {/* Technical/Vocational School */}
      {renderEducationEntryWithCheckbox(
        t('jobApplication.steps.education.schools.technical'), 
        'technical',
        <Briefcase className="w-5 h-5 text-green-600" />,
        "green",
        hasNoTechnicalEducation,
        setHasNoTechnicalEducation
      )}

      {/* Other Education */}
      {renderEducationEntryWithCheckbox(
        t('jobApplication.steps.education.schools.other'), 
        'other',
        <Award className="w-5 h-5 text-orange-600" />,
        "orange",
        hasNoOtherEducation,
        setHasNoOtherEducation
      )}
      
      {/* Skills and Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('jobApplication.steps.education.fields.skills')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="mb-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Checkbox
                id="no_skills"
                checked={hasNoSkillsCertifications}
                onCheckedChange={(checked) => {
                  setHasNoSkillsCertifications(checked as boolean)
                  updateFormData({ has_no_skills_certifications: checked })
                  if (checked) {
                    setSkillsCertifications('')
                  }
                }}
                className="h-5 w-5"
              />
              <Label htmlFor="no_skills" className="text-base font-medium cursor-pointer">
                {t('jobApplication.steps.education.noSkillsCertifications')}
              </Label>
            </div>
          </div>
          
          {!hasNoSkillsCertifications && (
            <>
              <Label htmlFor="skills_certifications">
                {t('jobApplication.steps.education.fields.skillsDescription')}
              </Label>
              <Textarea
                id="skills_certifications"
                value={skills_certifications}
                onChange={(e) => setSkillsCertifications(e.target.value)}
                placeholder=""
                rows={4}
                className="text-sm"
              />
              <p className="text-xs text-gray-500">
                {t('jobApplication.steps.education.fields.skillsNote')}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}