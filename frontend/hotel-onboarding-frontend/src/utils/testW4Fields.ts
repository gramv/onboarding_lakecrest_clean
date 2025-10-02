import { PDFDocument } from 'pdf-lib'

export async function testW4Fields() {
  console.log('=== W-4 Form Field Analysis ===')
  
  try {
    // Load the official W-4 form template
    const formUrl = '/w4-form-template.pdf'
    console.log('Loading W-4 form from:', formUrl)
    
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    console.log('Form loaded, size:', formBytes.byteLength)
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(formBytes)
    const form = pdfDoc.getForm()
    
    // Get all form fields
    const fields = form.getFields()
    console.log('\nTotal fields found:', fields.length)
    console.log('\n=== W-4 FORM FIELDS ===\n')
    
    // Categorize fields
    const textFields: { name: string; index: number }[] = []
    const checkboxes: { name: string; index: number }[] = []
    const dropdowns: { name: string; index: number }[] = []
    
    fields.forEach((field, index) => {
      const name = field.getName()
      const type = field.constructor.name
      
      console.log(`[${index}] ${type}: "${name}"`)
      
      if (type === 'PDFTextField') {
        textFields.push({ name, index })
      } else if (type === 'PDFCheckBox') {
        checkboxes.push({ name, index })
      } else if (type === 'PDFDropdown') {
        dropdowns.push({ name, index })
      }
    })
    
    console.log('\n=== FIELD CATEGORIZATION ===\n')
    
    console.log('Text Fields:')
    textFields.forEach(({ name, index }) => {
      console.log(`  [${index}] ${name}`)
    })
    
    console.log('\nCheckboxes:')
    checkboxes.forEach(({ name, index }) => {
      console.log(`  [${index}] ${name}`)
    })
    
    console.log('\nDropdowns:')
    dropdowns.forEach(({ name, index }) => {
      console.log(`  [${index}] ${name}`)
    })
    
    console.log('\n=== FIELD MAPPING SUGGESTIONS ===\n')
    
    // Try to identify key fields
    console.log('Identified fields by content:')
    textFields.forEach(({ name }) => {
      const lowerName = name.toLowerCase()
      if (lowerName.includes('first') && lowerName.includes('name')) {
        console.log(`  First Name: "${name}"`)
      } else if (lowerName.includes('last') && lowerName.includes('name')) {
        console.log(`  Last Name: "${name}"`)
      } else if (lowerName.includes('middle')) {
        console.log(`  Middle Initial: "${name}"`)
      } else if (lowerName.includes('ssn') || lowerName.includes('social')) {
        console.log(`  SSN: "${name}"`)
      } else if (lowerName.includes('address')) {
        console.log(`  Address: "${name}"`)
      } else if (lowerName.includes('city')) {
        console.log(`  City: "${name}"`)
      } else if (lowerName.includes('state')) {
        console.log(`  State: "${name}"`)
      } else if (lowerName.includes('zip')) {
        console.log(`  ZIP: "${name}"`)
      } else if (lowerName.includes('filing') && lowerName.includes('status')) {
        console.log(`  Filing Status: "${name}"`)
      } else if (lowerName.includes('dependent')) {
        console.log(`  Dependents: "${name}"`)
      } else if (lowerName.includes('other') && lowerName.includes('income')) {
        console.log(`  Other Income: "${name}"`)
      } else if (lowerName.includes('deduction')) {
        console.log(`  Deductions: "${name}"`)
      } else if (lowerName.includes('extra') || lowerName.includes('additional')) {
        console.log(`  Extra Withholding: "${name}"`)
      }
    })
    
    console.log('\nCheckbox fields:')
    checkboxes.forEach(({ name }) => {
      console.log(`  ${name}`)
    })
    
  } catch (error) {
    console.error('Error analyzing W-4 form:', error)
  }
}

// Function to create a test button for W-4
export function addW4FieldTestButton() {
  const button = document.createElement('button')
  button.textContent = 'Test W-4 Field Names'
  button.style.cssText = `
    position: fixed;
    bottom: 70px;
    right: 20px;
    z-index: 9999;
    padding: 10px 20px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  `
  button.onclick = testW4Fields
  document.body.appendChild(button)
}