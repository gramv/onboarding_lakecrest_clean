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
    const dependentsCredit = (Number(formData.qualifying_children) || 0) * 2000
    const otherDependentsCredit = (Number(formData.other_dependents) || 0) * 500
    const section1Fields = {
      // Personal Information - Step 1
      'topmostSubform[0].Page1[0].Step1a[0].f1_01[0]': formData.first_name || '',
      'topmostSubform[0].Page1[0].Step1a[0].f1_02[0]': formData.last_name || '',
      'topmostSubform[0].Page1[0].Step1a[0].f1_03[0]': formData.address || '',
      'topmostSubform[0].Page1[0].Step1a[0].f1_04[0]': `${formData.city || ''}, ${formData.state || ''} ${formData.zip_code || ''}`.trim(),
      'topmostSubform[0].Page1[0].f1_05[0]': formData.ssn || '',
      
      // Step 3 - Dependents (if any)
      'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_06[0]': String(dependentsCredit),
      'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_07[0]': String(otherDependentsCredit),
      'topmostSubform[0].Page1[0].f1_09[0]': String(dependentsCredit + otherDependentsCredit),
      
      // Step 4 - Other Adjustments
      'topmostSubform[0].Page1[0].f1_10[0]': formData.other_income ? String(formData.other_income) : '0',
      'topmostSubform[0].Page1[0].f1_11[0]': formData.deductions ? String(formData.deductions) : '0',
      'topmostSubform[0].Page1[0].f1_12[0]': formData.extra_withholding ? String(formData.extra_withholding) : '0',
    }
    
    // Fill text fields
    for (const [fieldName, value] of Object.entries(section1Fields)) {
      if (value !== undefined && value !== null) {
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
        console.log(`✓ Checked filing status: ${formData.filing_status} -> ${checkboxField}`)
      } else {
        console.log(`❌ No matching checkbox field for filing status: "${formData.filing_status}"`)
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
        // Coordinates adjusted: half inch right (+36) and half inch up (+36)
        try {
          firstPage.drawText(dateFormatted, {
            x: 426,  // 390 + 36 (half inch right)
            y: 118,  // 82 + 36 (half inch up)
            size: 10,
            color: rgb(0, 0, 0),
          })
          console.log('✓ Added date next to signature at adjusted position (426, 118)')
        } catch (e) {
          console.log('⚠️ Could not add date text:', e)
        }
        
      } catch (error) {
        console.error('Error adding signature to W-4:', error)
      }
    }
    
    try {
      form.updateFieldAppearances()
    } catch (appearanceError) {
      console.log('⚠️ Could not update field appearances:', appearanceError)
    }

    // Save the PDF
    const pdfBytes = await pdfDoc.save({ updateFieldAppearances: false })
    console.log('=== W-4 PDF GENERATION COMPLETE ===')
    
    return pdfBytes
    
  } catch (error) {
    console.error('Error generating W-4 PDF:', error)
    throw error
  }
}

/**
 * Add signature to an existing W-4 PDF (overlay signature without regenerating)
 * This function takes an already-generated W-4 preview PDF and overlays the signature
 */
export async function addSignatureToExistingW4Pdf(existingPdfBase64: string, signatureData: any): Promise<string> {
  console.log('Adding signature to existing W-4 PDF preview')

  try {
    // Clean base64 string (remove data URL prefix if present)
    const cleanedBase64 = existingPdfBase64.startsWith('data:')
      ? existingPdfBase64.split(',')[1]
      : existingPdfBase64

    // Convert base64 to bytes and load PDF
    const pdfBytes = Uint8Array.from(atob(cleanedBase64), c => c.charCodeAt(0))
    const pdfDoc = await PDFDocument.load(pdfBytes)

    console.log('🖊️ Processing signature for W-4 PDF...')
    const processedSignature = await processSignatureForPDF(signatureData.signature)
    console.log('✅ Signature processed, embedding in PDF...')

    // Extract base64 data from processed signature
    const base64Data = processedSignature.split(',')[1]
    const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    console.log('📊 W-4 Signature embedding details:', {
      originalDataUrl: signatureData.signature.substring(0, 50) + '...',
      processedDataUrl: processedSignature.substring(0, 50) + '...',
      base64Length: base64Data.length,
      bytesLength: signatureImageBytes.length,
      isPNG: processedSignature.startsWith('data:image/png')
    })

    // Embed signature image as PNG
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes)
    console.log('✅ Signature embedded in W-4 PDF successfully:', {
      width: signatureImage.width,
      height: signatureImage.height
    })

    // Get first page
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]

    // W-4 signature position - matching the coordinates from generateCleanW4Pdf
    // Note: pdf-lib uses bottom-left origin
    const scale = 0.25
    const scaledWidth = signatureImage.width * scale
    const scaledHeight = signatureImage.height * scale

    const signatureX = 100  // Left side of signature field
    const signatureY = 102  // From bottom (792 - 690 = 102) - aligned with Step 5

    console.log('🎯 Drawing signature at W-4 coordinates:', {
      x: signatureX,
      y: signatureY,
      width: scaledWidth,
      height: scaledHeight,
      originalImageSize: { width: signatureImage.width, height: signatureImage.height }
    })

    // Draw signature on PDF
    firstPage.drawImage(signatureImage, {
      x: signatureX,
      y: signatureY,
      width: scaledWidth,
      height: scaledHeight,
      opacity: 1.0  // Ensure full opacity for non-transparent pixels
    })

    console.log('✅ Signature drawn successfully on W-4 PDF')

    // Add date text next to signature
    const signatureDate = signatureData?.signedAt ? new Date(signatureData.signedAt) : new Date()
    const dateFormatted = `${(signatureDate.getMonth() + 1).toString().padStart(2, '0')}/${signatureDate.getDate().toString().padStart(2, '0')}/${signatureDate.getFullYear()}`

    try {
      firstPage.drawText(dateFormatted, {
        x: 426,  // 390 + 36 (half inch right)
        y: 118,  // 82 + 36 (half inch up)
        size: 10,
        color: rgb(0, 0, 0),
      })
      console.log('✅ Added date next to signature:', dateFormatted, 'at position (426, 118)')
    } catch (e) {
      console.log('⚠️ Could not add date text:', e)
    }

    // Save the signed PDF
    const signedPdfBytes = await pdfDoc.save()

    // Convert to base64 string efficiently (in chunks to avoid stack overflow)
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < signedPdfBytes.length; i += chunkSize) {
      const chunk = signedPdfBytes.slice(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, Array.from(chunk))
    }

    const base64String = btoa(binary)
    console.log('✓ Signature added to W-4 PDF preview, base64 length:', base64String.length)
    return base64String

  } catch (error) {
    console.error('Error adding signature to existing W-4 PDF:', error)
    throw error
  }
}