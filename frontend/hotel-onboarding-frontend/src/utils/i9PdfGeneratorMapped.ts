import { PDFDocument, rgb } from 'pdf-lib'

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
  // Section 2 data
  section2?: {
    documents: any[] | any
    documentVerificationDate: string
  }
  // Supplement A data
  supplementA?: any
  // Signature data
  signatureData?: {
    signature: string
    timestamp: string
    ipAddress?: string
    userAgent?: string
  }
}

// Helper function to format dates for PDF fields
function formatDateForPdf(dateString: string): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}${day}${year}` // mmddyyyy format
  } catch (e) {
    console.error('Error formatting date:', e)
    return dateString
  }
}

// Helper function to get proper document title for PDF
function getDocumentTitle(documentType: string): string {
  const documentTitles: Record<string, string> = {
    'us_passport': 'U.S. Passport',
    'permanent_resident_card': 'Permanent Resident Card',
    'drivers_license': 'Driver\'s License',
    'social_security_card': 'Social Security Card',
    'birth_certificate': 'Birth Certificate'
  }
  
  return documentTitles[documentType] || documentType
}

export async function generateMappedI9Pdf(formData: I9FormData): Promise<Uint8Array> {
  console.log('generateMappedI9Pdf called with data:', formData)
  
  try {
    // Load the official I-9 form template
    const formUrl = '/i9-form-template.pdf'
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(formBytes)
    const form = pdfDoc.getForm()
    
    // Map data to exact field names from the official I-9 form
    const fieldMappings = {
      // Personal Information - Using exact field names from the form
      'Last Name (Family Name)': (formData.last_name || '').toUpperCase(),
      'First Name Given Name': (formData.first_name || '').toUpperCase(),
      'Employee Middle Initial (if any)': (formData.middle_initial || '').toUpperCase(),
      'Employee Other Last Names Used (if any)': (formData.other_names || '').toUpperCase(),
      
      // Address Information
      'Address Street Number and Name': formData.address || '',
      'Apt Number (if any)': formData.apt_number || '',
      'City or Town': formData.city || '',
      'ZIP Code': formData.zip_code || '',
      
      // Personal Details
      'Date of Birth mmddyyyy': formatDateWithSlashes(formData.date_of_birth || ''),
      'US Social Security Number': (formData.ssn || '').replace(/\D/g, ''),
      'Employees E-mail Address': formData.email || '',
      'Telephone Number': (formData.phone || '').replace(/\D/g, ''),
      
      // Signature Date - try multiple possible field names
      "Today's Date mmddyyyy": formatDateWithSlashes(new Date().toISOString()),
      "Today's Date (mm/dd/yyyy)": formatDateWithSlashes(new Date().toISOString()),
      "Todays Date mmddyyyy": formatDateWithSlashes(new Date().toISOString()),
      "Date": formatDateWithSlashes(new Date().toISOString())
    }
    
    // Fill text fields - but check all form fields first to avoid Supplement A contamination
    const allFields = form.getFields()
    const fieldNames = allFields.map(f => f.getName())
    
    // Log which fields we're about to fill
    console.log('=== FILLING SECTION 1 FIELDS ===')
    console.log('Available fields in PDF:', fieldNames.filter(n => n.toLowerCase().includes('name')).slice(0, 10))
    
    for (const [fieldName, value] of Object.entries(fieldMappings)) {
      if (value) {
        try {
          // Skip if this looks like a Supplement A field
          if (fieldName.toLowerCase().includes('preparer') || 
              fieldName.toLowerCase().includes('translator')) {
            console.log(`Skipping Supplement A field: "${fieldName}"`)
            continue
          }
          
          const field = form.getTextField(fieldName)
          field.setText(value)
          console.log(`Filled "${fieldName}" with "${value}"`)
        } catch (e) {
          // Only log errors for fields other than date fields (which may not exist in all versions)
          if (!fieldName.toLowerCase().includes('date') && !fieldName.toLowerCase().includes('today')) {
            console.error(`Failed to fill field "${fieldName}":`, e)
          }
        }
      }
    }
    
    // Handle State dropdown separately
    try {
      const stateField = form.getDropdown('State')
      // Check if the state value exists in dropdown options
      const options = stateField.getOptions()
      if (options.includes(formData.state)) {
        stateField.select(formData.state)
        console.log(`Set state dropdown to: ${formData.state}`)
      } else {
        console.error(`State "${formData.state}" not found in dropdown options:`, options)
        // Try to set as text field instead if dropdown fails
        try {
          const stateTextField = form.getTextField('State')
          stateTextField.setText(formData.state)
          console.log(`Set state as text field: ${formData.state}`)
        } catch (textError) {
          console.error('Failed to set state as text field:', textError)
        }
      }
    } catch (e) {
      console.error('Failed to set state dropdown:', e)
      // Try alternate field name
      try {
        const stateTextField = form.getTextField('State')
        stateTextField.setText(formData.state)
        console.log(`Set state as text field: ${formData.state}`)
      } catch (textError) {
        console.error('Failed to set state as text field:', textError)
      }
    }
    
    // Handle citizenship checkboxes
    const citizenshipCheckboxes: Record<string, string> = {
      'citizen': 'CB_1',
      'national': 'CB_2', 
      'permanent_resident': 'CB_3',
      'authorized_alien': 'CB_4'
    }
    
    const checkboxName = citizenshipCheckboxes[formData.citizenship_status as keyof typeof citizenshipCheckboxes]
    if (checkboxName) {
      try {
        const checkbox = form.getCheckBox(checkboxName)
        checkbox.check()
        console.log(`Checked citizenship checkbox: ${checkboxName}`)
      } catch (e) {
        console.error(`Failed to check checkbox ${checkboxName}:`, e)
      }
    }
    
    // Handle additional fields for specific citizenship statuses
    if (formData.citizenship_status === 'permanent_resident') {
      if (formData.alien_registration_number) {
        try {
          // This field has a unique name for permanent residents
          const field = form.getTextField('3 A lawful permanent resident Enter USCIS or ANumber')
          field.setText(formData.alien_registration_number)
          console.log('Filled permanent resident USCIS number')
        } catch (e) {
          console.error('Failed to fill permanent resident USCIS number:', e)
        }
      }
      
      // Try to fill expiration date for permanent resident card
      if (formData.expiration_date) {
        try {
          const expField = form.getTextField('Card Expiration Date mmddyyyy')
          expField.setText(formatDateWithSlashes(formData.expiration_date))
          console.log('Filled permanent resident card expiration date')
        } catch (e) {
          // Try alternate field names
          try {
            const expField = form.getTextField('Expiration Date mmddyyyy')
            expField.setText(formatDateWithSlashes(formData.expiration_date))
            console.log('Filled permanent resident expiration date (alternate field)')
          } catch (e2) {
            // Suppress error - the PDF template may not have this field
            // console.error('Failed to fill permanent resident expiration date:', e2)
          }
        }
      }
    }
    
    if (formData.citizenship_status === 'authorized_alien') {
      // Additional fields for authorized aliens
      const alienFields = {
        'USCIS ANumber': formData.alien_registration_number || '',
        'Exp Date mmddyyyy': formatDateWithSlashes(formData.expiration_date || ''),
        'Foreign Passport Number and Country of IssuanceRow1': 
          formData.foreign_passport_number && formData.country_of_issuance 
            ? `${formData.foreign_passport_number} ${formData.country_of_issuance}` 
            : ''
      }
      
      for (const [fieldName, value] of Object.entries(alienFields)) {
        if (value) {
          try {
            const field = form.getTextField(fieldName)
            field.setText(value)
            console.log(`Filled alien field "${fieldName}" with "${value}"`)
          } catch (e) {
            console.error(`Failed to fill alien field "${fieldName}":`, e)
          }
        }
      }
    }
    
    // Handle Employee Signature if provided
    if (formData.signatureData?.signature) {
      try {
        const signatureBase64 = formData.signatureData.signature
        const signatureImageBytes = Uint8Array.from(atob(signatureBase64.split(',')[1]), c => c.charCodeAt(0))
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes)

        const pages = pdfDoc.getPages()
        const firstPage = pages[0]

        const signatureField = form.getTextField('Signature of Employee')
        const signatureWidget = signatureField.acroField.getWidgets()[0]
        const fieldRect = signatureWidget?.getRectangle?.()

        if (fieldRect) {
          const [left, bottom, right, top] = fieldRect
          const padding = 4
          const targetWidth = Math.max(0, right - left - padding * 2)
          const targetHeight = Math.max(0, top - bottom - padding * 2)
          const { width: imgWidth, height: imgHeight } = signatureImage.scale(1)
          const scale = Math.min(targetWidth / imgWidth, targetHeight / imgHeight, 1)
          const width = imgWidth * scale
          const height = imgHeight * scale
          const x = left + (targetWidth - width) / 2 + padding
          const y = bottom + (targetHeight - height) / 2 + padding

          firstPage.drawImage(signatureImage, {
            x,
            y,
            width,
            height
          })
          console.log('Added employee signature image using field coordinates')
        } else {
          throw new Error('Signature field rectangle not found')
        }
      } catch (e) {
        console.error('Failed to add employee signature image:', e)

        try {
          const signatureField = form.getTextField('Signature of Employee')
          const fullName = `${formData.first_name || ''} ${formData.last_name || ''}`.trim()
          signatureField.setText(fullName)
          console.log('Added employee signature as text fallback:', fullName)
        } catch (textError) {
          console.error('Failed to add signature text:', textError)
        }
      }
    }
    
    // Handle Section 2 data if provided
    if (formData.section2?.documents) {
      console.log('Filling Section 2 data:', formData.section2)
      
      // Handle both array and single document formats
      const documentsList = Array.isArray(formData.section2.documents) 
        ? formData.section2.documents 
        : [formData.section2.documents]
      
      console.log('Documents list:', documentsList)
      
      // Find different document types
      const usPassport = documentsList.find(doc => doc.documentType === 'us_passport')
      const permanentResidentCard = documentsList.find(doc => doc.documentType === 'permanent_resident_card')
      const driversLicense = documentsList.find(doc => doc.documentType === 'drivers_license')
      const ssnCard = documentsList.find(doc => doc.documentType === 'social_security_card')
      
      console.log('Driver\'s License data:', driversLicense)
      console.log('SSN Card data:', ssnCard)
      
      if (driversLicense) {
        console.log('DL documentNumber:', driversLicense.documentNumber)
        console.log('DL issuingAuthority:', driversLicense.issuingAuthority)
        console.log('DL expirationDate:', driversLicense.expirationDate)
      }
      
      if (ssnCard) {
        console.log('SSN ssn:', ssnCard.ssn)
        console.log('SSN documentNumber:', ssnCard.documentNumber)
      }
      
      const section2Fields = {
        // Copy employee info from Section 1
        'Last Name Family Name from Section 1': (formData.last_name || '').toUpperCase(),
        'First Name Given Name from Section 1': (formData.first_name || '').toUpperCase(),
        'Middle initial if any from Section 1': (formData.middle_initial || '').toUpperCase(),
      }
      
      // Fill List A document (Identity AND Employment Authorization)
      if (usPassport) {
        Object.assign(section2Fields, {
          'Document Title 1': 'U.S. Passport',
          'Issuing Authority 1': 'United States of America',
          'Document Number 0 (if any)': usPassport.documentNumber || '',
          'Expiration Date if any': usPassport.expirationDate ? formatDateForPdf(usPassport.expirationDate) : ''
        })
      } else if (permanentResidentCard) {
        Object.assign(section2Fields, {
          'Document Title 1': 'Permanent Resident Card',
          'Issuing Authority 1': 'USCIS',
          'Document Number 0 (if any)': permanentResidentCard.documentNumber || '',
          'Expiration Date if any': permanentResidentCard.expirationDate ? formatDateForPdf(permanentResidentCard.expirationDate) : '',
          'Additional Information': permanentResidentCard.alienNumber || ''
        })
      }
      
      // Only fill List B and C if List A is not present
      // (Employee must provide either one List A document OR one List B + one List C document)
      if (!usPassport && !permanentResidentCard) {
        // Fill List B document (Driver's License)
        if (driversLicense) {
          Object.assign(section2Fields, {
            'List B Document 1 Title': 'Driver\'s License',
            'List B Issuing Authority 1': driversLicense.issuingAuthority || '',
            'List B Document Number 1': driversLicense.documentNumber || '',
            'List B Expiration Date 1': driversLicense.expirationDate ? formatDateForPdf(driversLicense.expirationDate) : ''
          })
        }
        
        // Fill List C document (Social Security Card)
        if (ssnCard) {
          Object.assign(section2Fields, {
            'List C Document Title 1': 'Social Security Card',
            'List C Issuing Authority 1': 'Social Security Administration',
            'List C Document Number 1': ssnCard.ssn || ssnCard.documentNumber || '',
            // SSN cards don't expire, so we don't fill List C Expiration Date 1
          })
        }
      }
      
      // First day of employment should be filled by manager, not auto-filled
      
      // Fill Section 2 fields
      for (const [fieldName, value] of Object.entries(section2Fields)) {
        if (value) {
          try {
            const field = form.getTextField(fieldName)
            field.setText(value)
            console.log(`Filled Section 2 field ${fieldName}: ${value}`)
          } catch (e) {
            console.error(`Failed to fill Section 2 field ${fieldName}:`, e)
          }
        }
      }
      
      // Note: Section 2 citizenship checkboxes are handled differently in the official form
      // They will be filled by the manager during review
    }
    
    // Save the filled PDF
    const pdfBytes = await pdfDoc.save()
    console.log('PDF generated successfully')
    return pdfBytes
    
  } catch (error) {
    console.error('Error in generateMappedI9Pdf:', error)
    throw error
  }
}

function formatDateWithSlashes(dateString: string): string {
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
    
    // Format as mm/dd/yyyy (with slashes) as required by the form
    const monthStr = String(month).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const yearStr = String(year)
    
    return `${monthStr}/${dayStr}/${yearStr}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}