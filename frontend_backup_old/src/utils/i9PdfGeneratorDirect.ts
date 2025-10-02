import { PDFDocument, PDFTextField, PDFCheckBox } from 'pdf-lib'

interface I9FormData {
  last_name: string
  first_name: string
  middle_initial: string
  other_names: string
  address: string
  apt_number: string
  city: string
  state: string
  zip_code: string
  date_of_birth: string
  ssn: string
  email: string
  phone: string
  citizenship_status: string
  alien_registration_number?: string
  foreign_passport_number?: string
  country_of_issuance?: string
  expiration_date?: string
}

export async function generateDirectI9Pdf(formData: I9FormData): Promise<Uint8Array> {
  console.log('generateDirectI9Pdf called with data:', formData)
  try {
    // Load the official I-9 form template
    const formUrl = '/i9-form-template.pdf'
    console.log('Fetching I-9 template from:', formUrl)
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    console.log('Template loaded, size:', formBytes.byteLength)
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(formBytes)
    
    // Get the form
    const form = pdfDoc.getForm()
    
    // Get all form fields
    const fields = form.getFields()
    console.log('Total form fields found:', fields.length)
    
    // Create a map of field names to fields for easier access
    const fieldMap = new Map<string, any>()
    fields.forEach((field, index) => {
      const name = field.getName()
      fieldMap.set(name, field)
      console.log(`Field ${index}: ${name} (${field.constructor.name})`)
    })
    
    // Helper to find and fill text field by partial name match
    const fillTextFieldByPartialName = (partialName: string, value: string): boolean => {
      for (const [fieldName, field] of fieldMap) {
        if (fieldName.toLowerCase().includes(partialName.toLowerCase())) {
          try {
            if (field.constructor.name === 'PDFTextField') {
              (field as PDFTextField).setText(value)
              console.log(`Filled "${fieldName}" with "${value}"`)
              return true
            }
          } catch (e) {
            console.error(`Error filling field ${fieldName}:`, e)
          }
        }
      }
      return false
    }
    
    // Helper to check checkbox by name
    const checkCheckboxByName = (exactName: string): boolean => {
      const field = fieldMap.get(exactName)
      if (field && field.constructor.name === 'PDFCheckBox') {
        try {
          (field as PDFCheckBox).check()
          console.log(`Checked checkbox: ${exactName}`)
          return true
        } catch (e) {
          console.error(`Error checking checkbox ${exactName}:`, e)
        }
      }
      return false
    }
    
    // Fill Section 1 fields
    // Based on the field list, we need to be very specific about field names
    
    // Personal Information
    fillTextFieldByPartialName('last name (family name)', formData.last_name.toUpperCase())
    fillTextFieldByPartialName('first name given name', formData.first_name.toUpperCase())
    fillTextFieldByPartialName('employee middle initial', formData.middle_initial.toUpperCase())
    fillTextFieldByPartialName('employee other last names', formData.other_names.toUpperCase())
    
    // Address
    fillTextFieldByPartialName('address street number and name', formData.address)
    fillTextFieldByPartialName('apt number', formData.apt_number)
    fillTextFieldByPartialName('city or town', formData.city)
    
    // State - handle dropdown separately
    const stateField = fieldMap.get('State')
    if (stateField && stateField.constructor.name === 'PDFDropdown') {
      try {
        form.getDropdown('State').select(formData.state)
        console.log(`Set state dropdown to: ${formData.state}`)
      } catch (e) {
        console.error('Error setting state dropdown:', e)
      }
    }
    
    // ZIP and other info
    fillTextFieldByPartialName('zip code', formData.zip_code)
    fillTextFieldByPartialName('date of birth mmddyyyy', formatDateNoSlashes(formData.date_of_birth))
    fillTextFieldByPartialName('us social security number', formData.ssn.replace(/\D/g, ''))
    fillTextFieldByPartialName('employees e-mail address', formData.email)
    fillTextFieldByPartialName('telephone number', formData.phone.replace(/\D/g, ''))
    
    // Citizenship status checkboxes
    if (formData.citizenship_status === 'citizen') {
      checkCheckboxByName('CB_1')
    } else if (formData.citizenship_status === 'national') {
      checkCheckboxByName('CB_2')
    } else if (formData.citizenship_status === 'permanent_resident') {
      checkCheckboxByName('CB_3')
      // Special field name for LPR A-Number
      const lprField = fieldMap.get('3 A lawful permanent resident Enter USCIS or ANumber')
      if (lprField && lprField.constructor.name === 'PDFTextField') {
        (lprField as PDFTextField).setText(formData.alien_registration_number || '')
        console.log('Filled LPR A-Number field')
      }
    } else if (formData.citizenship_status === 'authorized_alien') {
      checkCheckboxByName('CB_4')
      fillTextFieldByPartialName('exp date mmddyyyy', formatDateNoSlashes(formData.expiration_date || ''))
      fillTextFieldByPartialName('uscis anumber', formData.alien_registration_number || '')
      fillTextFieldByPartialName('form i94 admission number', '')
      
      // Foreign passport is a combined field
      if (formData.foreign_passport_number && formData.country_of_issuance) {
        fillTextFieldByPartialName('foreign passport number and country', 
          `${formData.foreign_passport_number} ${formData.country_of_issuance}`)
      }
    }
    
    // Today's date for signature
    fillTextFieldByPartialName("today's date mmddyyy", formatDateNoSlashes(new Date().toISOString()))
    
    // Save the filled PDF
    const pdfBytes = await pdfDoc.save()
    return pdfBytes
    
  } catch (error) {
    console.error('Error in generateDirectI9Pdf:', error)
    throw error
  }
}

function formatDateNoSlashes(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}${day}${year}`
}