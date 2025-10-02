import { PDFDocument } from 'pdf-lib'

async function testI9DateFormats() {
  console.log('Testing I-9 date formats...')
  
  try {
    // Load the official I-9 form
    const formUrl = '/i9-form-template.pdf'
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(formBytes)
    const form = pdfDoc.getForm()
    
    // Test different date formats
    const testDate = '05/19/1998'
    const formats = [
      '05191998',      // mmddyyyy
      '05/19/1998',    // mm/dd/yyyy
      '5/19/1998',     // m/d/yyyy
      '05-19-1998',    // mm-dd-yyyy
      '19980519',      // yyyymmdd
    ]
    
    console.log('Testing DOB field with different formats:')
    for (const format of formats) {
      try {
        const field = form.getTextField('Date of Birth mmddyyyy')
        field.setText(format)
        console.log(`✓ Format "${format}" accepted`)
        
        // Check what the field actually contains
        const value = field.getText()
        console.log(`  Field value: "${value}"`)
      } catch (e) {
        console.log(`✗ Format "${format}" failed:`, e.message)
      }
    }
    
    // Also test the signature date field
    console.log('\nTesting signature date field:')
    for (const format of formats) {
      try {
        const field = form.getTextField("Today's Date mmddyyyy")
        field.setText(format)
        console.log(`✓ Format "${format}" accepted`)
        
        const value = field.getText()
        console.log(`  Field value: "${value}"`)
      } catch (e) {
        console.log(`✗ Format "${format}" failed:`, e.message)
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testI9DateFormats()