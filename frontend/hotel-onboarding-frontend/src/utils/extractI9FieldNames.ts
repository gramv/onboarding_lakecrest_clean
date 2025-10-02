import { PDFDocument } from 'pdf-lib'

/**
 * Script to extract all field names from the I-9 PDF form
 * This helps us map fields accurately, especially for Section 2
 */
async function extractI9FieldNames() {
  try {
    // Load the I-9 form template
    const formUrl = '/i9-form-template.pdf'
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(formBytes)
    const form = pdfDoc.getForm()
    
    // Get all fields
    const fields = form.getFields()
    
    console.log('=== TOTAL FIELDS FOUND:', fields.length, '===\n')
    
    // Categorize fields by section
    const section1Fields: string[] = []
    const section2Fields: string[] = []
    const section3Fields: string[] = []
    const otherFields: string[] = []
    
    fields.forEach(field => {
      const fieldName = field.getName()
      const fieldType = field.constructor.name
      
      // Log each field with its type
      console.log(`Field: "${fieldName}" (Type: ${fieldType})`)
      
      // Categorize based on common patterns
      if (fieldName.toLowerCase().includes('section 1') || 
          fieldName.includes('Last Name (Family Name)') ||
          fieldName.includes('First Name Given Name') ||
          fieldName.includes('Date of Birth') ||
          fieldName.includes('Social Security Number') ||
          fieldName.includes('E-mail Address') ||
          fieldName.includes('Telephone Number') ||
          fieldName.includes('citizen') ||
          fieldName.includes('CB_')) {
        section1Fields.push(fieldName)
      } else if (fieldName.toLowerCase().includes('section 2') ||
                 fieldName.toLowerCase().includes('from section 1') ||
                 fieldName.toLowerCase().includes('list a') ||
                 fieldName.toLowerCase().includes('list b') ||
                 fieldName.toLowerCase().includes('list c') ||
                 fieldName.toLowerCase().includes('employer') ||
                 fieldName.toLowerCase().includes('authorized representative') ||
                 fieldName.toLowerCase().includes('document title') ||
                 fieldName.toLowerCase().includes('issuing authority') ||
                 fieldName.toLowerCase().includes('document number') ||
                 fieldName.toLowerCase().includes('expiration date') ||
                 fieldName.includes('Checkbox')) {
        section2Fields.push(fieldName)
      } else if (fieldName.toLowerCase().includes('section 3') ||
                 fieldName.toLowerCase().includes('reverification') ||
                 fieldName.toLowerCase().includes('rehire')) {
        section3Fields.push(fieldName)
      } else {
        otherFields.push(fieldName)
      }
    })
    
    // Print categorized fields
    console.log('\n=== SECTION 1 FIELDS ===')
    section1Fields.sort().forEach(field => console.log(`  "${field}"`))
    
    console.log('\n=== SECTION 2 FIELDS ===')
    section2Fields.sort().forEach(field => console.log(`  "${field}"`))
    
    console.log('\n=== SECTION 3 FIELDS ===')
    section3Fields.sort().forEach(field => console.log(`  "${field}"`))
    
    console.log('\n=== OTHER FIELDS ===')
    otherFields.sort().forEach(field => console.log(`  "${field}"`))
    
    // Look specifically for List B and List C fields
    console.log('\n=== LIST B FIELDS (Identity Documents) ===')
    fields.forEach(field => {
      const fieldName = field.getName()
      if (fieldName.toLowerCase().includes('list b')) {
        console.log(`  "${fieldName}"`)
      }
    })
    
    console.log('\n=== LIST C FIELDS (Employment Authorization) ===')
    fields.forEach(field => {
      const fieldName = field.getName()
      if (fieldName.toLowerCase().includes('list c')) {
        console.log(`  "${fieldName}"`)
      }
    })
    
    // Create a mapping object for Section 2
    console.log('\n=== SECTION 2 FIELD MAPPING ===')
    console.log('const section2FieldMapping = {')
    console.log('  // Employee Information (from Section 1)')
    console.log('  employeeLastName: "Last Name Family Name from Section 1",')
    console.log('  employeeFirstName: "First Name Given Name from Section 1",')
    console.log('  employeeMiddleInitial: "Middle initial if any from Section 1",')
    console.log('  citizenshipStatus: "Citizenship Immigration Status from Section 1",')
    console.log('  ')
    console.log('  // List A Documents (Identity AND Employment Authorization)')
    section2Fields.filter(f => f.includes('List A') || f.includes('Document Title 1')).forEach(field => {
      console.log(`  // "${field}"`)
    })
    console.log('  ')
    console.log('  // List B Documents (Identity)')
    section2Fields.filter(f => f.includes('List B')).forEach(field => {
      console.log(`  // "${field}"`)
    })
    console.log('  ')
    console.log('  // List C Documents (Employment Authorization)')
    section2Fields.filter(f => f.includes('List C')).forEach(field => {
      console.log(`  // "${field}"`)
    })
    console.log('  ')
    console.log('  // Employer Certification')
    section2Fields.filter(f => f.includes('Employer') || f.includes('Authorized Representative')).forEach(field => {
      console.log(`  // "${field}"`)
    })
    console.log('}')
    
  } catch (error) {
    console.error('Error extracting field names:', error)
  }
}

// Run the extraction
if (typeof window !== 'undefined') {
  // Add a button to run the extraction
  const button = document.createElement('button')
  button.textContent = 'Extract I-9 Field Names'
  button.style.position = 'fixed'
  button.style.bottom = '20px'
  button.style.right = '20px'
  button.style.zIndex = '9999'
  button.style.padding = '10px 20px'
  button.style.backgroundColor = '#4CAF50'
  button.style.color = 'white'
  button.style.border = 'none'
  button.style.borderRadius = '5px'
  button.style.cursor = 'pointer'
  
  button.onclick = extractI9FieldNames
  
  document.body.appendChild(button)
}

export { extractI9FieldNames }