import { PDFDocument } from 'pdf-lib'

export async function findSignatureFieldPosition() {
  try {
    // Load the I-9 form
    const formUrl = '/i9-form-template.pdf'
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(formBytes)
    const form = pdfDoc.getForm()
    
    // Try to find the signature field
    const fields = form.getFields()
    console.log('=== ALL FORM FIELDS ===')
    
    fields.forEach(field => {
      const fieldName = field.getName()
      console.log(`Field: "${fieldName}" (Type: ${field.constructor.name})`)
      
      // Look for signature-related fields
      if (fieldName.toLowerCase().includes('signature') || 
          fieldName.toLowerCase().includes('sign')) {
        console.log(`  >>> SIGNATURE FIELD FOUND: "${fieldName}"`)
        
        // Try to get position for text fields
        if (field.constructor.name === 'PDFTextField') {
          try {
            const textField = field as any
            const widgets = textField.acroField.getWidgets()
            if (widgets && widgets.length > 0) {
              const widget = widgets[0]
              const rect = widget.getRectangle()
              console.log(`  >>> Position: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`)
            }
          } catch (e) {
            console.log('  >>> Could not get position:', e)
          }
        }
      }
    })
    
    // Also check the first page dimensions
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    const { width, height } = firstPage.getSize()
    console.log(`\nPage dimensions: ${width} x ${height}`)
    
  } catch (error) {
    console.error('Error finding signature field:', error)
  }
}