import { PDFDocument, rgb } from 'pdf-lib'
import { processSignatureForPDF } from './signatureProcessor'

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
  // Signature data
  signatureData?: {
    signature: string
    timestamp: string
    ipAddress?: string
    userAgent?: string
  }
}

// Helper function to format dates for PDF fields
function formatDateWithSlashes(dateString: string): string {
  if (!dateString) return ''
  
  try {
    // Parse the date string components to avoid timezone issues
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

export async function generateCleanI9Pdf(formData: I9FormData): Promise<Uint8Array> {
  console.log('generateCleanI9Pdf called with data:', formData)
  
  try {
    // Load the official I-9 form template
    const formUrl = '/i9-form-template.pdf'
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(formBytes)
    const form = pdfDoc.getForm()
    
    // Get all fields to understand the form structure
    const allFields = form.getFields()
    console.log(`Total fields in PDF: ${allFields.length}`)
    
    // Create a map of fields by page (approximately)
    const section1Fields = new Set<string>()
    const section2Fields = new Set<string>()
    const supplementFields = new Set<string>()
    
    // Categorize fields based on their names
    allFields.forEach(field => {
      const fieldName = field.getName()
      const fieldLower = fieldName.toLowerCase()
      
      if (fieldLower.includes('preparer') || fieldLower.includes('translator')) {
        supplementFields.add(fieldName)
      } else if (fieldLower.includes('list a') || fieldLower.includes('list b') || 
                 fieldLower.includes('list c') || fieldLower.includes('section 2') ||
                 fieldLower.includes('document title') || fieldLower.includes('issuing authority')) {
        section2Fields.add(fieldName)
      } else {
        section1Fields.add(fieldName)
      }
    })
    
    console.log(`Section 1 fields: ${section1Fields.size}`)
    console.log(`Section 2 fields: ${section2Fields.size}`)
    console.log(`Supplement fields: ${supplementFields.size}`)
    
    // SECTION 1: Fill employee information
    console.log('\n=== FILLING SECTION 1 ===')
    
    // Only fill fields that we're certain belong to Section 1
    const section1Mappings: Record<string, string> = {
      'Last Name (Family Name)': (formData.last_name || '').toUpperCase(),
      'First Name Given Name': (formData.first_name || '').toUpperCase(),
      'Employee Middle Initial (if any)': (formData.middle_initial || '').toUpperCase(),
      'Employee Other Last Names Used (if any)': (formData.other_names || '').toUpperCase(),
      'Address Street Number and Name': formData.address || '',
      'Apt Number (if any)': formData.apt_number || '',
      'City or Town': formData.city || '',
      'ZIP Code': formData.zip_code || '',
      'Date of Birth mmddyyyy': formatDateWithSlashes(formData.date_of_birth || ''),
      'US Social Security Number': (formData.ssn || '').replace(/\D/g, ''),
      'Employees E-mail Address': formData.email || '',
      'Telephone Number': (formData.phone || '').replace(/\D/g, ''),
    }
    
    // Fill Section 1 fields only if they're not in supplement fields
    for (const [fieldName, value] of Object.entries(section1Mappings)) {
      if (value && !supplementFields.has(fieldName)) {
        try {
          const field = form.getTextField(fieldName)
          field.setText(value)
          console.log(`✓ Filled Section 1 field: "${fieldName}"`)
        } catch (e) {
          console.error(`✗ Failed to fill Section 1 field "${fieldName}":`, e)
        }
      }
    }
    
    // Handle State dropdown
    if (formData.state && !supplementFields.has('State')) {
      try {
        const stateField = form.getDropdown('State')
        const options = stateField.getOptions()
        if (options.includes(formData.state)) {
          stateField.select(formData.state)
          console.log(`✓ Set state dropdown: ${formData.state}`)
        }
      } catch (e) {
        // Try as text field
        try {
          const stateTextField = form.getTextField('State')
          stateTextField.setText(formData.state)
          console.log(`✓ Set state as text field: ${formData.state}`)
        } catch (textError) {
          console.error('✗ Failed to set state:', textError)
        }
      }
    }
    
    // Handle citizenship checkboxes
    const citizenshipCheckboxes: Record<string, string> = {
      'citizen': 'CB_1',
      'national': 'CB_2', 
      'permanent_resident': 'CB_3',
      'authorized_alien': 'CB_4'
    }
    
    const checkboxName = citizenshipCheckboxes[formData.citizenship_status]
    if (checkboxName) {
      try {
        const checkbox = form.getCheckBox(checkboxName)
        checkbox.check()
        console.log(`✓ Checked citizenship: ${checkboxName}`)
      } catch (e) {
        console.error(`✗ Failed to check citizenship:`, e)
      }
    }
    
    // Handle citizenship-specific fields
    if (formData.citizenship_status === 'permanent_resident' && formData.alien_registration_number) {
      try {
        const field = form.getTextField('3 A lawful permanent resident Enter USCIS or ANumber')
        field.setText(formData.alien_registration_number)
        console.log('✓ Filled permanent resident USCIS number')
      } catch (e) {
        console.error('✗ Failed to fill USCIS number:', e)
      }
    }
    
    // Handle today's date
    const todayFormatted = formatDateWithSlashes(new Date().toISOString())
    
    // Fill Section 1 employee signature date field
    try {
      const section1DateField = form.getTextField("Today's Date mmddyyy")
      section1DateField.setText(todayFormatted)
      console.log(`✓ Filled Section 1 employee signature date: ${todayFormatted}`)
    } catch (e) {
      console.log('⚠️ Could not fill Section 1 date field:', e)
    }
    
    // Handle Employee Signature
    if (formData.signatureData?.signature) {
      try {
        // First try to use the signature field directly
        let signatureFieldUsed = false
        
        try {
          // Try to find the signature field
          const signatureField = form.getTextField('Signature of Employee')
          
          // Process signature to remove white background
          const processedSignature = await processSignatureForPDF(formData.signatureData.signature)
          
          // If we can use the field, try to get its position
          const acroField = (signatureField as any).acroField
          const widgets = acroField.getWidgets()
          
          if (widgets && widgets.length > 0) {
            const widget = widgets[0]
            const rect = widget.getRectangle()
            
            // Extract the base64 data
            const base64Data = processedSignature.split(',')[1]
            const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
            
            // Embed as PNG
            const signatureImage = await pdfDoc.embedPng(signatureImageBytes)
            
            // Get the page
            const pages = pdfDoc.getPages()
            const firstPage = pages[0]
            
            // Calculate scale to fit in field rectangle
            const fieldWidth = rect.width
            const fieldHeight = rect.height
            const maxWidth = fieldWidth * 1.5   // Allow signature to be much larger
            const maxHeight = fieldHeight * 1.5  // Allow signature to be much larger
            
            const originalWidth = signatureImage.width
            const originalHeight = signatureImage.height
            const widthScale = maxWidth / originalWidth
            const heightScale = maxHeight / originalHeight
            const scale = Math.min(widthScale, heightScale, 0.35) // Even larger cap
            
            const scaledWidth = originalWidth * scale
            const scaledHeight = originalHeight * scale
            
            // Position in the field
            const xPosition = rect.x + (fieldWidth - scaledWidth) / 2
            const yPosition = rect.y + (fieldHeight - scaledHeight) / 2
            
            // Draw the signature
            firstPage.drawImage(signatureImage, {
              x: xPosition,
              y: yPosition,
              width: scaledWidth,
              height: scaledHeight,
            })
            
            signatureFieldUsed = true
            console.log(`✓ Added signature to field at: ${xPosition.toFixed(1)}, ${yPosition.toFixed(1)}`)
          }
        } catch (fieldError) {
          console.log('Could not use signature field directly:', fieldError)
        }
        
        // Fallback to manual positioning if field approach didn't work
        if (!signatureFieldUsed) {
          // Process signature
          const processedSignature = await processSignatureForPDF(formData.signatureData.signature)
          const base64Data = processedSignature.split(',')[1]
          const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
          const signatureImage = await pdfDoc.embedPng(signatureImageBytes)
          
          const pages = pdfDoc.getPages()
          const firstPage = pages[0]
          
          // Use conservative positioning based on typical I-9 layout
          const scale = 0.22  // Much larger
          const scaledWidth = signatureImage.width * scale
          const scaledHeight = signatureImage.height * scale
          
          firstPage.drawImage(signatureImage, {
            x: 50,   // Left margin
            y: 330,  // Above bottom section
            width: scaledWidth,
            height: scaledHeight,
          })
          
          console.log('✓ Added signature using fallback positioning')
        }
      } catch (e) {
        console.error('✗ Failed to add signature image:', e)
        // Don't fail the whole PDF generation if signature fails
      }
    }
    
    // SECTION 2: Fill employer verification (if provided)
    if (formData.section2?.documents) {
      console.log('\n=== FILLING SECTION 2 ===')
      
      // Handle document data
      const documentsList = Array.isArray(formData.section2.documents) 
        ? formData.section2.documents 
        : [formData.section2.documents]
      
      // Copy employee info to Section 2
      const section2EmployeeFields = {
        'Last Name Family Name from Section 1': (formData.last_name || '').toUpperCase(),
        'First Name Given Name from Section 1': (formData.first_name || '').toUpperCase(),
        'Middle initial if any from Section 1': (formData.middle_initial || '').toUpperCase(),
      }
      
      for (const [fieldName, value] of Object.entries(section2EmployeeFields)) {
        if (value && section2Fields.has(fieldName)) {
          try {
            const field = form.getTextField(fieldName)
            field.setText(value)
            console.log(`✓ Filled Section 2 employee field: "${fieldName}"`)
          } catch (e) {
            console.error(`✗ Failed to fill Section 2 field:`, e)
          }
        }
      }
      
      // Fill document information (simplified to avoid errors)
      
      // Handle List A documents first (establish identity AND work authorization)
      const usPassport = documentsList.find(doc => doc.documentType === 'us_passport')
      const permanentResidentCard = documentsList.find(doc => doc.documentType === 'permanent_resident_card')
      const foreignPassport = documentsList.find(doc => doc.documentType === 'foreign_passport')
      const employmentAuthCard = documentsList.find(doc => doc.documentType === 'employment_authorization_card')
      
      // Fill List A document fields if any List A document is present
      if (usPassport) {
        try {
          form.getTextField('Document Title 1').setText('U.S. Passport')
          form.getTextField('Issuing Authority 1').setText('U.S. Department of State')
          form.getTextField('Document Number 0 (if any)').setText(usPassport.documentNumber || '')
          
          if (usPassport.expirationDate) {
            form.getTextField('Expiration Date if any').setText(formatDateWithSlashes(usPassport.expirationDate))
          }
          
          console.log('✓ Filled List A (U.S. Passport) fields')
        } catch (e) {
          console.error('✗ Failed to fill U.S. Passport fields:', e)
        }
      } else if (permanentResidentCard) {
        try {
          form.getTextField('Document Title 1').setText('Permanent Resident Card')
          form.getTextField('Issuing Authority 1').setText('USCIS')
          form.getTextField('Document Number 0 (if any)').setText(permanentResidentCard.documentNumber || '')
          
          if (permanentResidentCard.expirationDate) {
            form.getTextField('Expiration Date if any').setText(formatDateWithSlashes(permanentResidentCard.expirationDate))
          }
          
          console.log('✓ Filled List A (Permanent Resident Card) fields')
        } catch (e) {
          console.error('✗ Failed to fill Permanent Resident Card fields:', e)
        }
      } else if (foreignPassport) {
        try {
          const issuingCountry = foreignPassport.issuingCountry || foreignPassport.issuingAuthority || ''
          form.getTextField('Document Title 1').setText('Foreign Passport')
          form.getTextField('Issuing Authority 1').setText(issuingCountry)
          form.getTextField('Document Number 0 (if any)').setText(foreignPassport.documentNumber || '')
          
          if (foreignPassport.expirationDate) {
            form.getTextField('Expiration Date if any').setText(formatDateWithSlashes(foreignPassport.expirationDate))
          }
          
          console.log('✓ Filled List A (Foreign Passport) fields')
        } catch (e) {
          console.error('✗ Failed to fill Foreign Passport fields:', e)
        }
      } else if (employmentAuthCard) {
        try {
          form.getTextField('Document Title 1').setText('Employment Authorization Document')
          form.getTextField('Issuing Authority 1').setText('USCIS')
          form.getTextField('Document Number 0 (if any)').setText(employmentAuthCard.documentNumber || '')
          
          if (employmentAuthCard.expirationDate) {
            form.getTextField('Expiration Date if any').setText(formatDateWithSlashes(employmentAuthCard.expirationDate))
          }
          
          console.log('✓ Filled List A (Employment Authorization Document) fields')
        } catch (e) {
          console.error('✗ Failed to fill Employment Authorization Document fields:', e)
        }
      }
      
      // Handle List B and List C documents (only if no List A document was used)
      const hasListADocument = usPassport || permanentResidentCard || foreignPassport || employmentAuthCard
      
      const driversLicense = documentsList.find(doc => doc.documentType === 'drivers_license')
      const ssnCard = documentsList.find(doc => doc.documentType === 'social_security_card')
      
      // Only fill List B and List C if no List A document was provided
      if (!hasListADocument) {
        if (driversLicense) {
          try {
            form.getTextField('List B Document 1 Title').setText("Driver's License")
            form.getTextField('List B Issuing Authority 1').setText(driversLicense.issuingAuthority || '')
            form.getTextField('List B Document Number 1').setText(driversLicense.documentNumber || '')
            
            // Add expiration date for DL
            if (driversLicense.expirationDate) {
              form.getTextField('List B Expiration Date 1').setText(formatDateWithSlashes(driversLicense.expirationDate))
              console.log(`✓ Added DL expiration date: ${driversLicense.expirationDate}`)
            }
            
            console.log('✓ Filled List B (Driver\'s License) fields')
          } catch (e) {
            console.error('✗ Failed to fill List B fields:', e)
          }
        }
        
        if (ssnCard) {
          try {
            form.getTextField('List C Document Title 1').setText('Social Security Card')
            form.getTextField('List C Issuing Authority 1').setText('Social Security Administration')
            // Use user-entered SSN from formData, not OCR-extracted SSN
            form.getTextField('List C Document Number 1').setText(formData.ssn || '')
            console.log('✓ Filled List C (SSN) fields')
          } catch (e) {
            console.error('✗ Failed to fill List C fields:', e)
          }
        }
      } else {
        console.log('ℹ️ Skipping List B/C documents since List A document was provided')
      }
      
      // Add Section 2 verification date
      try {
        const section2DateField = form.getTextField('S2 Todays Date mmddyyyy')
        section2DateField.setText(todayFormatted)
        console.log(`✓ Filled Section 2 employer verification date: ${todayFormatted}`)
      } catch (e) {
        console.error('✗ Failed to fill Section 2 date field:', e)
      }
    }
    
    // Save the filled PDF
    const pdfBytes = await pdfDoc.save()
    console.log('\n✓ PDF generated successfully')
    return pdfBytes
    
  } catch (error) {
    console.error('Error in generateCleanI9Pdf:', error)
    throw error
  }
}