import { PDFDocument } from 'pdf-lib'
import { W4_FORM_FIELDS } from './federalFormFieldMappings'

interface W4FormData {
  // Personal Information
  first_name: string
  middle_initial?: string
  last_name: string
  address: string
  apt_number?: string
  city: string
  state: string
  zip_code: string
  ssn: string
  
  // Filing Status
  filing_status: 'single' | 'married_filing_jointly' | 'head_of_household'
  
  // Multiple Jobs
  multiple_jobs: boolean
  
  // Dependents
  qualifying_children?: number
  other_dependents?: number
  
  // Other Adjustments
  other_income?: number
  deductions?: number
  extra_withholding?: number
  
  // Employer Info (if provided)
  employer_name?: string
  employer_address?: string
  employer_ein?: string
  first_date_employment?: string
}

export async function generateW4Pdf(formData: W4FormData): Promise<Uint8Array> {
  console.log('generateW4Pdf called with data:', formData)
  
  try {
    // Load the official W-4 form template
    const formUrl = '/w4-form-template.pdf'
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(formBytes)
    const form = pdfDoc.getForm()
    
    // Fill Step 1(a) - Name and Address
    try {
      // First name and middle initial combined
      const firstNameMI = formData.middle_initial 
        ? `${formData.first_name} ${formData.middle_initial}` 
        : formData.first_name
      const field1 = form.getTextField(W4_FORM_FIELDS.PERSONAL_INFO.FIRST_NAME_MI)
      field1.setText(firstNameMI)
      console.log('Filled first name and MI:', firstNameMI)
    } catch (e) {
      console.error('Error filling first name:', e)
    }
    
    try {
      const field2 = form.getTextField(W4_FORM_FIELDS.PERSONAL_INFO.LAST_NAME)
      field2.setText(formData.last_name)
      console.log('Filled last name:', formData.last_name)
    } catch (e) {
      console.error('Error filling last name:', e)
    }
    
    try {
      // Address and apartment number combined
      const fullAddress = formData.apt_number 
        ? `${formData.address} Apt ${formData.apt_number}`
        : formData.address
      const field3 = form.getTextField(W4_FORM_FIELDS.PERSONAL_INFO.ADDRESS)
      field3.setText(fullAddress)
      console.log('Filled address:', fullAddress)
    } catch (e) {
      console.error('Error filling address:', e)
    }
    
    try {
      // City, State ZIP combined
      const cityStateZip = `${formData.city}, ${formData.state} ${formData.zip_code}`
      const field4 = form.getTextField(W4_FORM_FIELDS.PERSONAL_INFO.CITY_STATE_ZIP)
      field4.setText(cityStateZip)
      console.log('Filled city/state/zip:', cityStateZip)
    } catch (e) {
      console.error('Error filling city/state/zip:', e)
    }
    
    // Fill Step 1(b) - SSN
    try {
      const ssnField = form.getTextField(W4_FORM_FIELDS.PERSONAL_INFO.SSN)
      ssnField.setText(formatSSN(formData.ssn))
      console.log('Filled SSN')
    } catch (e) {
      console.error('Error filling SSN:', e)
    }
    
    // Fill Step 1(c) - Filing Status
    try {
      let checkboxField: string
      switch (formData.filing_status) {
        case 'single':
          checkboxField = W4_FORM_FIELDS.FILING_STATUS.SINGLE_OR_MARRIED_FILING_SEPARATELY
          break
        case 'married_filing_jointly':
          checkboxField = W4_FORM_FIELDS.FILING_STATUS.MARRIED_FILING_JOINTLY
          break
        case 'head_of_household':
          checkboxField = W4_FORM_FIELDS.FILING_STATUS.HEAD_OF_HOUSEHOLD
          break
        default:
          checkboxField = W4_FORM_FIELDS.FILING_STATUS.SINGLE_OR_MARRIED_FILING_SEPARATELY
      }
      
      const checkbox = form.getCheckBox(checkboxField)
      checkbox.check()
      console.log('Checked filing status:', formData.filing_status)
    } catch (e) {
      console.error('Error checking filing status:', e)
    }
    
    // Fill Step 2 - Multiple Jobs
    if (formData.multiple_jobs) {
      try {
        const multipleJobsCheckbox = form.getCheckBox(W4_FORM_FIELDS.MULTIPLE_JOBS_CHECKBOX)
        multipleJobsCheckbox.check()
        console.log('Checked multiple jobs checkbox')
      } catch (e) {
        console.error('Error checking multiple jobs:', e)
      }
    }
    
    // Fill Step 3 - Claim Dependents
    if (formData.qualifying_children || formData.other_dependents) {
      try {
        // Calculate amounts
        const childrenAmount = (formData.qualifying_children || 0) * 2000
        const otherDependentsAmount = (formData.other_dependents || 0) * 500
        const totalDependents = childrenAmount + otherDependentsAmount
        
        if (childrenAmount > 0) {
          const childrenField = form.getTextField(W4_FORM_FIELDS.DEPENDENTS.QUALIFYING_CHILDREN)
          childrenField.setText(childrenAmount.toString())
          console.log('Filled qualifying children amount:', childrenAmount)
        }
        
        if (otherDependentsAmount > 0) {
          const otherField = form.getTextField(W4_FORM_FIELDS.DEPENDENTS.OTHER_DEPENDENTS)
          otherField.setText(otherDependentsAmount.toString())
          console.log('Filled other dependents amount:', otherDependentsAmount)
        }
        
        if (totalDependents > 0) {
          const totalField = form.getTextField(W4_FORM_FIELDS.DEPENDENTS.TOTAL)
          totalField.setText(totalDependents.toString())
          console.log('Filled total dependents:', totalDependents)
        }
      } catch (e) {
        console.error('Error filling dependents:', e)
      }
    }
    
    // Fill Step 4 - Other Adjustments
    if (formData.other_income) {
      try {
        const otherIncomeField = form.getTextField(W4_FORM_FIELDS.OTHER_ADJUSTMENTS.OTHER_INCOME)
        otherIncomeField.setText(formData.other_income.toString())
        console.log('Filled other income:', formData.other_income)
      } catch (e) {
        console.error('Error filling other income:', e)
      }
    }
    
    if (formData.deductions) {
      try {
        const deductionsField = form.getTextField(W4_FORM_FIELDS.OTHER_ADJUSTMENTS.DEDUCTIONS)
        deductionsField.setText(formData.deductions.toString())
        console.log('Filled deductions:', formData.deductions)
      } catch (e) {
        console.error('Error filling deductions:', e)
      }
    }
    
    if (formData.extra_withholding) {
      try {
        const extraField = form.getTextField(W4_FORM_FIELDS.OTHER_ADJUSTMENTS.EXTRA_WITHHOLDING)
        extraField.setText(formData.extra_withholding.toString())
        console.log('Filled extra withholding:', formData.extra_withholding)
      } catch (e) {
        console.error('Error filling extra withholding:', e)
      }
    }
    
    // Fill date
    try {
      const dateField = form.getTextField(W4_FORM_FIELDS.SIGNATURE.DATE)
      dateField.setText(formatDate(new Date()))
      console.log('Filled date')
    } catch (e) {
      console.error('Error filling date:', e)
    }
    
    // Fill Employer Section (if provided)
    if (formData.employer_name && formData.employer_address) {
      try {
        const employerField = form.getTextField(W4_FORM_FIELDS.EMPLOYER.NAME_ADDRESS)
        employerField.setText(`${formData.employer_name}\n${formData.employer_address}`)
        console.log('Filled employer info')
      } catch (e) {
        console.error('Error filling employer info:', e)
      }
    }
    
    if (formData.employer_ein) {
      try {
        const einField = form.getTextField(W4_FORM_FIELDS.EMPLOYER.EIN)
        einField.setText(formData.employer_ein)
        console.log('Filled EIN')
      } catch (e) {
        console.error('Error filling EIN:', e)
      }
    }
    
    if (formData.first_date_employment) {
      try {
        const dateField = form.getTextField(W4_FORM_FIELDS.EMPLOYER.FIRST_DATE_EMPLOYMENT)
        dateField.setText(formatDateString(formData.first_date_employment))
        console.log('Filled first date of employment')
      } catch (e) {
        console.error('Error filling employment date:', e)
      }
    }
    
    // Save the filled PDF
    const pdfBytes = await pdfDoc.save()
    console.log('W-4 PDF generated successfully')
    return pdfBytes
    
  } catch (error) {
    console.error('Error in generateW4Pdf:', error)
    throw error
  }
}

// Format SSN with dashes (XXX-XX-XXXX)
function formatSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`
}

// Format date as MM/DD/YYYY
function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

// Format date string without timezone conversion issues
function formatDateString(dateString: string): string {
  if (!dateString) return ''
  
  try {
    // Parse the date string components to avoid timezone issues
    // Expected format: YYYY-MM-DD
    const parts = dateString.split('-')
    if (parts.length !== 3) {
      console.error('Invalid date format:', dateString)
      return ''
    }
    
    const year = parseInt(parts[0])
    const month = parseInt(parts[1])
    const day = parseInt(parts[2])
    
    // Validate the parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('Invalid date components:', dateString)
      return ''
    }
    
    // Format as MM/DD/YYYY
    const monthStr = String(month).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const yearStr = String(year)
    
    return `${monthStr}/${dayStr}/${yearStr}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}