import { PDFDocument } from 'pdf-lib'

export async function testI9FieldFilling() {
  try {
    // Load the I-9 form
    const formUrl = '/i9-form-template.pdf'
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(formBytes)
    const form = pdfDoc.getForm()
    
    // Get all fields
    const fields = form.getFields()
    
    console.log('=== ANALYZING I-9 FORM FIELDS ===')
    console.log(`Total fields: ${fields.length}`)
    
    // Group fields by name to find duplicates
    const fieldsByName: Record<string, Array<{field: any, index: number}>> = {}
    
    fields.forEach((field, index) => {
      const fieldName = field.getName()
      if (!fieldsByName[fieldName]) {
        fieldsByName[fieldName] = []
      }
      fieldsByName[fieldName].push({field, index})
    })
    
    // Find duplicate field names
    console.log('\n=== DUPLICATE FIELD NAMES ===')
    Object.entries(fieldsByName).forEach(([name, instances]) => {
      if (instances.length > 1) {
        console.log(`\nField "${name}" appears ${instances.length} times:`)
        instances.forEach(({field, index}) => {
          try {
            // Try to get more info about the field
            const acroField = (field as any).acroField
            const widgets = acroField?.getWidgets?.() || []
            if (widgets.length > 0) {
              const widget = widgets[0]
              const pageIndex = pdfDoc.getPages().findIndex(page => {
                const annotations = page.node.Annots()
                return annotations?.asArray()?.some((ann: any) => ann === widget.dict)
              })
              console.log(`  - Instance ${index}: Page ${pageIndex + 1}`)
            }
          } catch (e) {
            console.log(`  - Instance ${index}: Could not determine page`)
          }
        })
      }
    })
    
    // Test filling specific fields
    console.log('\n=== TESTING FIELD FILLING ===')
    const testFields = [
      'Last Name (Family Name)',
      'First Name Given Name',
      'Employee Middle Initial (if any)',
      'Date of Birth mmddyyyy'
    ]
    
    testFields.forEach(fieldName => {
      try {
        const field = form.getTextField(fieldName)
        console.log(`\nField "${fieldName}":`)
        
        // Check if this field name exists multiple times
        if (fieldsByName[fieldName] && fieldsByName[fieldName].length > 1) {
          console.log(`  WARNING: This field appears ${fieldsByName[fieldName].length} times in the PDF!`)
          console.log('  When using form.getTextField(), it might fill ALL instances')
        }
        
        // Try to get the actual field object info
        const acroField = (field as any).acroField
        console.log(`  Field type: ${acroField?.constructor?.name || 'Unknown'}`)
        
      } catch (e) {
        console.log(`\nField "${fieldName}": NOT FOUND`)
      }
    })
    
  } catch (error) {
    console.error('Error testing I-9 fields:', error)
  }
}