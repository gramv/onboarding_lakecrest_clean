import { PDFDocument, PDFForm, rgb, StandardFonts } from 'pdf-lib'

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

export async function generateI9Pdf(formData: I9FormData): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create()
  
  // Load a standard font
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  // Add a page with US Letter size
  const page = pdfDoc.addPage([612, 792]) // 8.5" x 11"
  
  // Get the dimensions of the page
  const { width, height } = page.getSize()
  
  // Define colors
  const black = rgb(0, 0, 0)
  const darkGray = rgb(0.2, 0.2, 0.2)
  
  // Title
  page.drawText('Form I-9', {
    x: 50,
    y: height - 50,
    size: 20,
    font: helveticaBold,
    color: black,
  })
  
  page.drawText('Employment Eligibility Verification', {
    x: 50,
    y: height - 75,
    size: 16,
    font: helveticaBold,
    color: black,
  })
  
  page.drawText('Department of Homeland Security', {
    x: 50,
    y: height - 95,
    size: 12,
    font: helveticaFont,
    color: darkGray,
  })
  
  page.drawText('U.S. Citizenship and Immigration Services', {
    x: 50,
    y: height - 110,
    size: 12,
    font: helveticaFont,
    color: darkGray,
  })
  
  // Section 1 Header
  page.drawRectangle({
    x: 50,
    y: height - 150,
    width: width - 100,
    height: 30,
    color: rgb(0.9, 0.9, 0.9),
  })
  
  page.drawText('Section 1. Employee Information and Attestation', {
    x: 60,
    y: height - 140,
    size: 14,
    font: helveticaBold,
    color: black,
  })
  
  page.drawText('(Employees must complete and sign Section 1 of Form I-9 no later than the first day of employment)', {
    x: 60,
    y: height - 170,
    size: 10,
    font: helveticaFont,
    color: darkGray,
  })
  
  // Define field positions
  let yPosition = height - 200
  const lineHeight = 25
  const labelX = 60
  const valueX = 200
  
  // Helper function to draw a field
  const drawField = (label: string, value: string, y: number, bold: boolean = false) => {
    page.drawText(label + ':', {
      x: labelX,
      y: y,
      size: 11,
      font: helveticaFont,
      color: darkGray,
    })
    
    page.drawText(value || '', {
      x: valueX,
      y: y,
      size: 11,
      font: bold ? helveticaBold : helveticaFont,
      color: black,
    })
  }
  
  // Draw fields
  drawField('Last Name (Family Name)', formData.last_name, yPosition, true)
  yPosition -= lineHeight
  
  drawField('First Name (Given Name)', formData.first_name, yPosition, true)
  yPosition -= lineHeight
  
  drawField('Middle Initial', formData.middle_initial, yPosition)
  yPosition -= lineHeight
  
  drawField('Other Last Names Used', formData.other_names, yPosition)
  yPosition -= lineHeight
  
  // Address section
  yPosition -= 10
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  yPosition -= 20
  
  drawField('Address (Street Number and Name)', formData.address + (formData.apt_number ? ` Apt. ${formData.apt_number}` : ''), yPosition)
  yPosition -= lineHeight
  
  drawField('City or Town', formData.city, yPosition)
  yPosition -= lineHeight
  
  drawField('State', formData.state, yPosition)
  yPosition -= lineHeight
  
  drawField('ZIP Code', formData.zip_code, yPosition)
  yPosition -= lineHeight
  
  // Personal Information section
  yPosition -= 10
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  yPosition -= 20
  
  drawField('Date of Birth (mm/dd/yyyy)', formatDate(formData.date_of_birth), yPosition)
  yPosition -= lineHeight
  
  drawField('Social Security Number', formData.ssn, yPosition)
  yPosition -= lineHeight
  
  drawField('Employee\'s Email Address', formData.email, yPosition)
  yPosition -= lineHeight
  
  drawField('Employee\'s Telephone Number', formData.phone, yPosition)
  yPosition -= lineHeight
  
  // Citizenship Status section
  yPosition -= 10
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  yPosition -= 20
  
  page.drawText('I attest, under penalty of perjury, that I am (check one of the following boxes):', {
    x: labelX,
    y: yPosition,
    size: 11,
    font: helveticaBold,
    color: black,
  })
  yPosition -= 20
  
  // Citizenship checkboxes
  const drawCheckbox = (text: string, checked: boolean, y: number) => {
    // Draw checkbox
    page.drawRectangle({
      x: labelX + 10,
      y: y - 3,
      width: 12,
      height: 12,
      borderColor: black,
      borderWidth: 1,
    })
    
    if (checked) {
      page.drawText('X', {
        x: labelX + 13,
        y: y - 1,
        size: 10,
        font: helveticaBold,
        color: black,
      })
    }
    
    page.drawText(text, {
      x: labelX + 30,
      y: y,
      size: 10,
      font: helveticaFont,
      color: black,
    })
  }
  
  drawCheckbox('1. A citizen of the United States', formData.citizenship_status === 'citizen', yPosition)
  yPosition -= 20
  
  drawCheckbox('2. A noncitizen national of the United States', formData.citizenship_status === 'national', yPosition)
  yPosition -= 20
  
  drawCheckbox('3. A lawful permanent resident', formData.citizenship_status === 'permanent_resident', yPosition)
  if (formData.citizenship_status === 'permanent_resident' && formData.alien_registration_number) {
    page.drawText(`(Alien Registration Number/USCIS Number): ${formData.alien_registration_number}`, {
      x: labelX + 250,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: black,
    })
  }
  yPosition -= 20
  
  drawCheckbox('4. An alien authorized to work', formData.citizenship_status === 'authorized_alien', yPosition)
  if (formData.citizenship_status === 'authorized_alien') {
    yPosition -= 20
    if (formData.alien_registration_number) {
      page.drawText(`Alien Registration Number/USCIS Number: ${formData.alien_registration_number}`, {
        x: labelX + 50,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: black,
      })
      yPosition -= 15
    }
    if (formData.expiration_date) {
      page.drawText(`Work authorization expires on: ${formatDate(formData.expiration_date)}`, {
        x: labelX + 50,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: black,
      })
    }
  }
  
  // Employee Signature section
  yPosition = 150
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  yPosition -= 20
  
  page.drawText('Employee Attestation and Signature', {
    x: labelX,
    y: yPosition,
    size: 12,
    font: helveticaBold,
    color: black,
  })
  yPosition -= 20
  
  page.drawText('I attest, under penalty of perjury, that I am the individual who completed Section 1 of this form and that', {
    x: labelX,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: black,
  })
  yPosition -= 15
  
  page.drawText('the information is true and correct.', {
    x: labelX,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: black,
  })
  yPosition -= 30
  
  // Signature line
  page.drawLine({
    start: { x: labelX, y: yPosition },
    end: { x: 300, y: yPosition },
    thickness: 1,
    color: black,
  })
  
  page.drawText('Signature of Employee', {
    x: labelX,
    y: yPosition - 15,
    size: 9,
    font: helveticaFont,
    color: darkGray,
  })
  
  // Date line
  page.drawLine({
    start: { x: 350, y: yPosition },
    end: { x: 500, y: yPosition },
    thickness: 1,
    color: black,
  })
  
  page.drawText('Today\'s Date (mm/dd/yyyy)', {
    x: 350,
    y: yPosition - 15,
    size: 9,
    font: helveticaFont,
    color: darkGray,
  })
  
  page.drawText(formatDate(new Date().toISOString()), {
    x: 360,
    y: yPosition + 5,
    size: 10,
    font: helveticaFont,
    color: black,
  })
  
  // Form footer
  page.drawText('Form I-9 11/14/2023', {
    x: 50,
    y: 30,
    size: 8,
    font: helveticaFont,
    color: darkGray,
  })
  
  page.drawText('Page 1 of 3', {
    x: width - 100,
    y: 30,
    size: 8,
    font: helveticaFont,
    color: darkGray,
  })
  
  // Serialize the PDFDocument to bytes
  const pdfBytes = await pdfDoc.save()
  
  return pdfBytes
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}