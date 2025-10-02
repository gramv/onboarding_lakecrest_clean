import { PDFDocument, rgb } from 'pdf-lib'
import { processSignatureForPDF } from './signatureProcessor'

interface W4FormData {
  first_name: string
  middle_initial: string
  last_name: string
  address: string
  apt_number: string
  city: string
  state: string
  zip_code: string
  ssn: string
  filing_status: string
  multiple_jobs: boolean
  qualifying_children: number
  other_dependents: number
  other_income: string
  deductions: string
  extra_withholding: string
  signatureData?: {
    signature: string
    signedAt: string
  }
}

/**
 * Generate a filled W-4 PDF with federal compliance
 */
export async function generateCleanW4Pdf(formData: W4FormData): Promise<Uint8Array> {
  try {
    console.log('=== GENERATING W-4 PDF ===')
    console.log('Form data:', {
      ...formData,
      ssn: formData.ssn ? '***-**-' + formData.ssn.slice(-4) : 'none'
    })
    
    // Load the official W-4 template
    const w4TemplatePath = '/w4-form-template.pdf'
    const templateResponse = await fetch(w4TemplatePath)
    
    if (!templateResponse.ok) {
      throw new Error(`Failed to load W-4 template: ${templateResponse.status}`)
    }
    
    const templateBytes = await templateResponse.arrayBuffer()
    const pdfDoc = await PDFDocument.load(templateBytes)
    
    // Get the form
    const form = pdfDoc.getForm()
    
    // SECTION 1: Fill employee information
    const section1Fields = {
      // Personal Information - Step 1
      'topmostSubform[0].Page1[0].Step1a[0].f1_01[0]': formData.first_name || '',
      'topmostSubform[0].Page1[0].Step1a[0].f1_02[0]': formData.last_name || '',
      'topmostSubform[0].Page1[0].Step1a[0].f1_03[0]': formData.address || '',
      'topmostSubform[0].Page1[0].Step1a[0].f1_04[0]': `${formData.city || ''}, ${formData.state || ''} ${formData.zip_code || ''}`.trim(),
      'topmostSubform[0].Page1[0].f1_05[0]': formData.ssn || '',
      
      // Step 3 - Dependents (if any)
      'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_06[0]': formData.qualifying_children > 0 ? String(formData.qualifying_children * 2000) : '',
      'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_07[0]': formData.other_dependents > 0 ? String(formData.other_dependents * 500) : '',
      
      // Step 4 - Other Adjustments
      'topmostSubform[0].Page1[0].f1_09[0]': formData.other_income || '',
      'topmostSubform[0].Page1[0].f1_10[0]': formData.deductions || '',
      'topmostSubform[0].Page1[0].f1_11[0]': formData.extra_withholding || '',
    }
    
    // Fill text fields
    for (const [fieldName, value] of Object.entries(section1Fields)) {
      if (value) {
        try {
          const field = form.getTextField(fieldName)
          field.setText(value)
          console.log(`✓ Filled field: ${fieldName} = ${value}`)
        } catch (e) {
          console.log(`⚠️ Could not fill field ${fieldName}:`, e)
        }
      }
    }
    
    // Handle filing status checkboxes
    try {
      const filingStatusFields = {
        'single': 'topmostSubform[0].Page1[0].c1_1[0]',
        'married_filing_jointly': 'topmostSubform[0].Page1[0].c1_1[1]',
        'head_of_household': 'topmostSubform[0].Page1[0].c1_1[2]'
      }
      
      const checkboxField = filingStatusFields[formData.filing_status as keyof typeof filingStatusFields]
      if (checkboxField) {
        const checkbox = form.getCheckBox(checkboxField)
        checkbox.check()
        console.log(`✓ Checked filing status: ${formData.filing_status}`)
      }
    } catch (e) {
      console.log('⚠️ Could not set filing status checkbox:', e)
    }
    
    // Handle multiple jobs checkbox
    if (formData.multiple_jobs) {
      try {
        const multipleJobsCheckbox = form.getCheckBox('topmostSubform[0].Page1[0].c1_2[0]')
        multipleJobsCheckbox.check()
        console.log('✓ Checked multiple jobs checkbox')
      } catch (e) {
        console.log('⚠️ Could not set multiple jobs checkbox:', e)
      }
    }
    
    // Get signature date
    const signatureDate = formData.signatureData?.signedAt ? new Date(formData.signatureData.signedAt) : new Date()
    const dateFormatted = `${(signatureDate.getMonth() + 1).toString().padStart(2, '0')}/${signatureDate.getDate().toString().padStart(2, '0')}/${signatureDate.getFullYear()}`
    
    // Fill signature date field
    try {
      const dateField = form.getTextField('topmostSubform[0].Page1[0].f1_14[0]')
      dateField.setText(dateFormatted)
      console.log(`✓ Filled signature date: ${dateFormatted}`)
    } catch (e) {
      console.log('⚠️ Could not fill date field:', e)
    }
    
    // Handle Employee Signature
    if (formData.signatureData?.signature) {
      try {
        console.log('Processing signature for W-4...')
        
        // Process signature to remove white background
        const processedSignature = await processSignatureForPDF(formData.signatureData.signature)
        
        // Extract the base64 data
        const base64Data = processedSignature.split(',')[1]
        const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
        
        // Embed as PNG
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes)
        
        // Get the first page
        const pages = pdfDoc.getPages()
        const firstPage = pages[0]
        
        // W-4 signature position - matching backend coordinates
        // The actual signature line on the W-4 form
        const scale = 0.25
        const scaledWidth = signatureImage.width * scale
        const scaledHeight = signatureImage.height * scale
        
        // Position signature in the signature field area
        // Note: pdf-lib uses bottom-left origin like PyMuPDF
        firstPage.drawImage(signatureImage, {
          x: 100,     // Left side of signature field
          y: 102,     // From bottom (792 - 690 = 102) - properly aligned with Step 5
          width: scaledWidth,
          height: scaledHeight,
        })
        
        console.log('✓ Added signature to W-4 form')
        
        // Add date text next to signature
        // The form field f1_14[0] is filled, but we also need visual text
        try {
          firstPage.drawText(dateFormatted, {
            x: 390,  // Position at the date field location based on field mapping
            y: 82,   // Align with signature line (slightly below signature)
            size: 10,
            color: rgb(0, 0, 0),
          })
          console.log('✓ Added date next to signature')
        } catch (e) {
          console.log('⚠️ Could not add date text:', e)
        }
        
      } catch (error) {
        console.error('Error adding signature to W-4:', error)
      }
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save()
    console.log('=== W-4 PDF GENERATION COMPLETE ===')
    
    return pdfBytes
    
  } catch (error) {
    console.error('Error generating W-4 PDF:', error)
    throw error
  }
}