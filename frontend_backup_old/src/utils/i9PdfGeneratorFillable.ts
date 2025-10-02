import { PDFDocument, PDFTextField, PDFCheckBox, rgb } from 'pdf-lib'

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

export async function generateFillableI9Pdf(formData: I9FormData): Promise<Uint8Array> {
  try {
    // Load the official I-9 form template
    const formUrl = '/i9-form-template.pdf'
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(formBytes)
    
    // Get the form
    const form = pdfDoc.getForm()
    
    // Get all form fields to understand the structure
    const fields = form.getFields()
    console.log('Form fields found:', fields.length)
    
    // Log field names to help map them correctly
    fields.forEach((field, index) => {
      const fieldName = field.getName()
      console.log(`Field ${index}: ${fieldName} (${field.constructor.name})`)
    })
    
    // Try to fill fields by common naming patterns
    // Note: Field names vary by form version, so we'll try multiple approaches
    
    // Helper function to safely set text field
    const setTextField = (fieldNames: string[], value: string) => {
      for (const fieldName of fieldNames) {
        try {
          const field = form.getTextField(fieldName)
          if (field) {
            field.setText(value)
            console.log(`Successfully set field "${fieldName}" to "${value}"`)
            return true
          }
        } catch (e) {
          console.log(`Failed to find field: ${fieldName}`)
        }
      }
      console.log(`Could not find any field from: ${fieldNames.join(', ')}`)
      return false
    }
    
    // Helper function to safely check checkbox
    const checkBox = (fieldNames: string[]) => {
      for (const fieldName of fieldNames) {
        try {
          const field = form.getCheckBox(fieldName)
          if (field) {
            field.check()
            console.log(`Successfully checked checkbox: ${fieldName}`)
            return true
          }
        } catch (e) {
          console.log(`Failed to find checkbox: ${fieldName}`)
        }
      }
      console.log(`Could not find any checkbox from: ${fieldNames.join(', ')}`)
      return false
    }
    
    // Try to fill Section 1 fields using the actual field names from the form
    // Last Name - Field 98
    setTextField(['Last Name (Family Name)'], formData.last_name.toUpperCase())
    
    // First Name - Field 5
    setTextField(['First Name Given Name'], formData.first_name.toUpperCase())
    
    // Middle Initial
    setTextField(['Employee Middle Initial (if any)'], formData.middle_initial.toUpperCase())
    
    // Other Last Names
    setTextField(['Employee Other Last Names Used (if any)'], formData.other_names.toUpperCase())
    
    // Address
    setTextField(['Address Street Number and Name'], formData.address)
    
    // Apt Number
    setTextField(['Apt Number (if any)'], formData.apt_number)
    
    // City
    setTextField(['City or Town'], formData.city)
    
    // State - This is a dropdown, so we need to handle it differently
    try {
      const stateField = form.getDropdown('State')
      if (stateField) {
        stateField.select(formData.state)
      }
    } catch (e) {
      console.log('Could not set state dropdown:', e)
    }
    
    // ZIP Code
    setTextField(['ZIP Code'], formData.zip_code)
    
    // Date of Birth
    setTextField(['Date of Birth mmddyyyy'], formatDate(formData.date_of_birth))
    
    // SSN
    setTextField(['US Social Security Number'], formData.ssn.replace(/\D/g, ''))
    
    // Email
    setTextField(['Employees E-mail Address'], formData.email)
    
    // Phone
    setTextField(['Telephone Number'], formData.phone.replace(/\D/g, ''))
    
    // Citizenship status checkboxes
    if (formData.citizenship_status === 'citizen') {
      checkBox(['CB_1'])
    } else if (formData.citizenship_status === 'national') {
      checkBox(['CB_2'])
    } else if (formData.citizenship_status === 'permanent_resident') {
      checkBox(['CB_3'])
      // USCIS Number - this field name includes the full label
      setTextField(['3 A lawful permanent resident Enter USCIS or ANumber'], formData.alien_registration_number || '')
    } else if (formData.citizenship_status === 'authorized_alien') {
      checkBox(['CB_4'])
      // Expiration Date
      setTextField(['Exp Date mmddyyyy'], formatDate(formData.expiration_date || ''))
      // USCIS/A-Number
      setTextField(['USCIS ANumber'], formData.alien_registration_number || '')
      // I-94 Number (if they have it)
      setTextField(['Form I94 Admission Number'], '')
      // Foreign Passport and Country
      if (formData.foreign_passport_number && formData.country_of_issuance) {
        setTextField(['Foreign Passport Number and Country of IssuanceRow1'], 
                     `${formData.foreign_passport_number} ${formData.country_of_issuance}`)
      }
    }
    
    // Today's Date for signature
    setTextField(["Today's Date mmddyyy"], formatDate(new Date().toISOString()))
    
    // If form fields approach doesn't work, fall back to drawing text
    // This is a backup in case the form isn't fillable or field names don't match
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    
    // Check if we successfully filled any fields
    let fieldsFilled = false
    fields.forEach(field => {
      if (field.constructor.name === 'PDFTextField') {
        const textField = field as PDFTextField
        if (textField.getText()) {
          fieldsFilled = true
          console.log(`Filled field: ${field.getName()} = ${textField.getText()}`)
        }
      } else if (field.constructor.name === 'PDFCheckBox') {
        const checkBox = field as PDFCheckBox
        if (checkBox.isChecked()) {
          fieldsFilled = true
          console.log(`Checked field: ${field.getName()}`)
        }
      }
    })
    
    // If no fields were filled, provide feedback
    if (!fieldsFilled) {
      console.warn('No form fields were successfully filled. The PDF may not be fillable or field names may not match.')
      console.log('Attempting to fill fields again with exact field names...')
      
      // Fall back to the manual position approach
      // Import the manual positioning function
      const { generateOfficialI9Pdf } = await import('./i9PdfGeneratorOfficial')
      return await generateOfficialI9Pdf(formData)
    }
    
    // Save the filled PDF
    const pdfBytes = await pdfDoc.save()
    return pdfBytes
    
  } catch (error) {
    console.error('Error filling I-9 form:', error)
    
    // Fall back to manual positioning approach
    try {
      const { generateOfficialI9Pdf } = await import('./i9PdfGeneratorOfficial')
      return await generateOfficialI9Pdf(formData)
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
      throw new Error('Failed to generate I-9 form')
    }
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  // Return without slashes for mmddyyyy format
  return `${month}${day}${year}`
}