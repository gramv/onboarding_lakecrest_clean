import { PDFDocument, PDFForm, rgb } from 'pdf-lib'

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

export async function generateOfficialI9Pdf(formData: I9FormData): Promise<Uint8Array> {
  try {
    // Load the official I-9 form template
    const formUrl = '/i9-form-template.pdf'
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(formBytes)
    
    // Get the form from the PDF
    const form = pdfDoc.getForm()
    
    // Get the first page (Section 1 is on page 1)
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    
    // Draw text directly on the PDF at specific positions
    // These positions are based on the actual I-9 form layout
    const fontSize = 10
    const color = rgb(0, 0, 0)
    
    // Last Name field (approximately at x: 95, y: 594)
    firstPage.drawText(formData.last_name.toUpperCase(), {
      x: 95,
      y: 594,
      size: fontSize,
      color: color,
    })
    
    // First Name field (approximately at x: 245, y: 594)
    firstPage.drawText(formData.first_name.toUpperCase(), {
      x: 245,
      y: 594,
      size: fontSize,
      color: color,
    })
    
    // Middle Initial field (approximately at x: 395, y: 594)
    if (formData.middle_initial) {
      firstPage.drawText(formData.middle_initial.toUpperCase(), {
        x: 395,
        y: 594,
        size: fontSize,
        color: color,
      })
    }
    
    // Other Last Names field (approximately at x: 445, y: 594)
    if (formData.other_names) {
      firstPage.drawText(formData.other_names.toUpperCase(), {
        x: 445,
        y: 594,
        size: fontSize,
        color: color,
      })
    }
    
    // Address field (approximately at x: 95, y: 567)
    firstPage.drawText(formData.address, {
      x: 95,
      y: 567,
      size: fontSize,
      color: color,
    })
    
    // Apt Number field (approximately at x: 320, y: 567)
    if (formData.apt_number) {
      firstPage.drawText(formData.apt_number, {
        x: 320,
        y: 567,
        size: fontSize,
        color: color,
      })
    }
    
    // City field (approximately at x: 370, y: 567)
    firstPage.drawText(formData.city, {
      x: 370,
      y: 567,
      size: fontSize,
      color: color,
    })
    
    // State field (approximately at x: 95, y: 540)
    firstPage.drawText(formData.state, {
      x: 95,
      y: 540,
      size: fontSize,
      color: color,
    })
    
    // ZIP Code field (approximately at x: 145, y: 540)
    firstPage.drawText(formData.zip_code, {
      x: 145,
      y: 540,
      size: fontSize,
      color: color,
    })
    
    // Date of Birth field (approximately at x: 245, y: 540)
    firstPage.drawText(formatDate(formData.date_of_birth), {
      x: 245,
      y: 540,
      size: fontSize,
      color: color,
    })
    
    // SSN field (approximately at x: 350, y: 540)
    // Format SSN without dashes for the form
    const ssnDigits = formData.ssn.replace(/\D/g, '')
    firstPage.drawText(ssnDigits, {
      x: 350,
      y: 540,
      size: fontSize,
      color: color,
    })
    
    // Email field (approximately at x: 95, y: 513)
    firstPage.drawText(formData.email, {
      x: 95,
      y: 513,
      size: fontSize,
      color: color,
    })
    
    // Phone field (approximately at x: 350, y: 513)
    // Format phone without formatting for the form
    const phoneDigits = formData.phone.replace(/\D/g, '')
    firstPage.drawText(phoneDigits, {
      x: 350,
      y: 513,
      size: fontSize,
      color: color,
    })
    
    // Citizenship status checkboxes
    // These are approximate positions for the checkboxes in Section 1
    const checkboxSize = 8
    const checkMark = 'X'
    
    if (formData.citizenship_status === 'citizen') {
      // Checkbox 1 position (approximately at x: 95, y: 425)
      firstPage.drawText(checkMark, {
        x: 96,
        y: 425,
        size: checkboxSize,
        color: color,
      })
    } else if (formData.citizenship_status === 'national') {
      // Checkbox 2 position (approximately at x: 95, y: 410)
      firstPage.drawText(checkMark, {
        x: 96,
        y: 410,
        size: checkboxSize,
        color: color,
      })
    } else if (formData.citizenship_status === 'permanent_resident') {
      // Checkbox 3 position (approximately at x: 95, y: 395)
      firstPage.drawText(checkMark, {
        x: 96,
        y: 395,
        size: checkboxSize,
        color: color,
      })
      
      // USCIS Number field (approximately at x: 315, y: 395)
      if (formData.alien_registration_number) {
        firstPage.drawText(formData.alien_registration_number, {
          x: 315,
          y: 395,
          size: fontSize,
          color: color,
        })
      }
    } else if (formData.citizenship_status === 'authorized_alien') {
      // Checkbox 4 position (approximately at x: 95, y: 365)
      firstPage.drawText(checkMark, {
        x: 96,
        y: 365,
        size: checkboxSize,
        color: color,
      })
      
      // Work authorization expiration date (approximately at x: 315, y: 365)
      if (formData.expiration_date) {
        firstPage.drawText(formatDate(formData.expiration_date), {
          x: 315,
          y: 365,
          size: fontSize,
          color: color,
        })
      }
      
      // USCIS or A-Number field (approximately at x: 240, y: 340)
      if (formData.alien_registration_number) {
        firstPage.drawText(formData.alien_registration_number, {
          x: 240,
          y: 340,
          size: fontSize,
          color: color,
        })
      }
      
      // Foreign Passport Number (approximately at x: 95, y: 315)
      if (formData.foreign_passport_number) {
        firstPage.drawText(formData.foreign_passport_number, {
          x: 95,
          y: 315,
          size: fontSize,
          color: color,
        })
      }
      
      // Country of Issuance (approximately at x: 280, y: 315)
      if (formData.country_of_issuance) {
        firstPage.drawText(formData.country_of_issuance, {
          x: 280,
          y: 315,
          size: fontSize,
          color: color,
        })
      }
    }
    
    // Today's date for the form (approximately at x: 480, y: 175)
    firstPage.drawText(formatDate(new Date().toISOString()), {
      x: 480,
      y: 175,
      size: fontSize,
      color: color,
    })
    
    // Save the filled PDF
    const pdfBytes = await pdfDoc.save()
    return pdfBytes
    
  } catch (error) {
    console.error('Error loading official I-9 form:', error)
    throw new Error('Failed to load official I-9 form template')
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}