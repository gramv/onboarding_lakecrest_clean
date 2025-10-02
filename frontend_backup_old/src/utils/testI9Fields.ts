import { PDFDocument } from 'pdf-lib'

export async function testI9Fields() {
  console.log('=== I-9 Form Field Analysis ===')
  
  try {
    // Load the official I-9 form template
    const formUrl = '/i9-form-template.pdf'
    console.log('Loading I-9 form from:', formUrl)
    
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    console.log('Form loaded, size:', formBytes.byteLength)
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(formBytes)
    const form = pdfDoc.getForm()
    
    // Get all form fields
    const fields = form.getFields()
    console.log('\nTotal fields found:', fields.length)
    console.log('\n=== SECTION 1 FIELDS (Employee Information) ===\n')
    
    // Categorize fields by type and section
    const textFields: string[] = []
    const checkboxes: string[] = []
    const dropdowns: string[] = []
    
    fields.forEach((field, index) => {
      const name = field.getName()
      const type = field.constructor.name
      
      // Try to identify Section 1 fields (usually in the first part of the form)
      if (index < 50 || name.toLowerCase().includes('employee') || 
          name.toLowerCase().includes('last name') || name.toLowerCase().includes('first name') ||
          name.toLowerCase().includes('address') || name.toLowerCase().includes('city') ||
          name.toLowerCase().includes('state') || name.toLowerCase().includes('zip') ||
          name.toLowerCase().includes('birth') || name.toLowerCase().includes('ssn') ||
          name.toLowerCase().includes('social security') || name.toLowerCase().includes('email') ||
          name.toLowerCase().includes('telephone') || name.toLowerCase().includes('cb_')) {
        
        console.log(`[${index}] ${type}: "${name}"`)
        
        if (type === 'PDFTextField') {
          textFields.push(name)
        } else if (type === 'PDFCheckBox') {
          checkboxes.push(name)
        } else if (type === 'PDFDropdown') {
          dropdowns.push(name)
        }
      }
    })
    
    console.log('\n=== FIELD MAPPING SUGGESTIONS ===\n')
    
    // Find best matches for each required field
    const requiredFields = [
      'last_name', 'first_name', 'middle_initial', 'other_names',
      'address', 'apt_number', 'city', 'state', 'zip_code',
      'date_of_birth', 'ssn', 'email', 'phone',
      'citizenship_checkbox_1', 'citizenship_checkbox_2', 
      'citizenship_checkbox_3', 'citizenship_checkbox_4',
      'alien_registration_number', 'expiration_date'
    ]
    
    console.log('Text Fields that might match our needs:')
    textFields.forEach(fieldName => {
      // Try to guess what this field is for
      const lowerName = fieldName.toLowerCase()
      if (lowerName.includes('last name') && lowerName.includes('family')) {
        console.log(`  Last Name: "${fieldName}"`)
      } else if (lowerName.includes('first name') && lowerName.includes('given')) {
        console.log(`  First Name: "${fieldName}"`)
      } else if (lowerName.includes('middle initial') && lowerName.includes('employee')) {
        console.log(`  Middle Initial: "${fieldName}"`)
      } else if (lowerName.includes('other') && lowerName.includes('last name')) {
        console.log(`  Other Names: "${fieldName}"`)
      } else if (lowerName.includes('address') && lowerName.includes('street')) {
        console.log(`  Street Address: "${fieldName}"`)
      } else if (lowerName.includes('apt') && lowerName.includes('number')) {
        console.log(`  Apartment: "${fieldName}"`)
      } else if (lowerName.includes('city') || lowerName.includes('town')) {
        console.log(`  City: "${fieldName}"`)
      } else if (lowerName.includes('zip')) {
        console.log(`  ZIP Code: "${fieldName}"`)
      } else if (lowerName.includes('birth') && lowerName.includes('date')) {
        console.log(`  Date of Birth: "${fieldName}"`)
      } else if (lowerName.includes('social security') || lowerName.includes('ssn')) {
        console.log(`  SSN: "${fieldName}"`)
      } else if (lowerName.includes('email')) {
        console.log(`  Email: "${fieldName}"`)
      } else if (lowerName.includes('telephone') || lowerName.includes('phone')) {
        console.log(`  Phone: "${fieldName}"`)
      } else if (lowerName.includes('uscis') || lowerName.includes('anumber')) {
        console.log(`  Alien/USCIS Number: "${fieldName}"`)
      } else if (lowerName.includes('exp') && lowerName.includes('date')) {
        console.log(`  Expiration Date: "${fieldName}"`)
      }
    })
    
    console.log('\nCheckboxes (citizenship status):')
    checkboxes.forEach(fieldName => {
      if (fieldName.startsWith('CB_')) {
        console.log(`  ${fieldName}`)
      }
    })
    
    console.log('\nDropdowns:')
    dropdowns.forEach(fieldName => {
      console.log(`  ${fieldName}`)
    })
    
    // Test filling a field to verify it works
    console.log('\n=== TESTING FIELD FILL ===\n')
    try {
      // Try to fill the last name field
      const lastNameField = fields.find(f => 
        f.getName().toLowerCase().includes('last name') && 
        f.getName().toLowerCase().includes('family')
      )
      
      if (lastNameField && lastNameField.constructor.name === 'PDFTextField') {
        const textField = form.getTextField(lastNameField.getName())
        textField.setText('TEST')
        console.log(`Successfully filled field: "${lastNameField.getName()}" with "TEST"`)
        
        // Save and check
        const testBytes = await pdfDoc.save()
        console.log('PDF saved successfully, size:', testBytes.length)
      }
    } catch (e) {
      console.error('Error testing field fill:', e)
    }
    
  } catch (error) {
    console.error('Error analyzing I-9 form:', error)
  }
}

// Function to create a test button on the page
export function addI9FieldTestButton() {
  const button = document.createElement('button')
  button.textContent = 'Test I-9 Field Names'
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    padding: 10px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  `
  button.onclick = testI9Fields
  document.body.appendChild(button)
}