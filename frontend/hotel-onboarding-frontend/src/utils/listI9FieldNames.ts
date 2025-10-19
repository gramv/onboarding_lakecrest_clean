import { PDFDocument } from 'pdf-lib'

/**
 * Diagnostic utility to list all field names in the I-9 PDF template
 * Run this in browser console to identify exact field names
 */
export async function listAllI9FieldNames() {
  try {
    console.log('🔍 Loading I-9 PDF template...')

    // Load the official I-9 form template
    const formUrl = '/i9-form-template.pdf'
    const formBytes = await fetch(formUrl).then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(formBytes)
    const form = pdfDoc.getForm()

    const allFields = form.getFields()
    const fieldNames = allFields.map(f => f.getName())

    console.log('\n' + '='.repeat(80))
    console.log('📋 I-9 PDF TEMPLATE - ALL FIELD NAMES')
    console.log('='.repeat(80))
    console.log(`Total fields found: ${fieldNames.length}\n`)

    // Filter for authorized alien related fields (Section 1, Line 9/Item 4)
    console.log('🎯 AUTHORIZED ALIEN RELATED FIELDS (Section 1, Item 4):')
    console.log('-'.repeat(80))

    const alienRelatedFields: string[] = []
    fieldNames.forEach(name => {
      const nameLower = name.toLowerCase()
      if (nameLower.includes('alien') ||
          nameLower.includes('uscis') ||
          nameLower.includes('a-number') ||
          nameLower.includes('anumber') ||
          nameLower.includes('i94') ||
          nameLower.includes('i-94') ||
          nameLower.includes('admission') ||
          nameLower.includes('passport') ||
          nameLower.includes('country') ||
          nameLower.includes('issuance') ||
          (nameLower.includes('authorization') && nameLower.includes('work')) ||
          (nameLower.includes('exp') && nameLower.includes('date') && nameLower.includes('4'))) {
        alienRelatedFields.push(name)
        console.log(`  📌 "${name}"`)
      }
    })

    if (alienRelatedFields.length === 0) {
      console.log('  ⚠️ No fields found with keywords: alien, uscis, i94, passport, country, authorization')
      console.log('  Searching for fields containing "4" (checkbox option 4)...\n')

      fieldNames.forEach(name => {
        if (name.includes('4') && !name.includes('I-94')) {
          console.log(`  🔸 "${name}"`)
        }
      })
    }

    console.log('\n' + '-'.repeat(80))
    console.log(`Found ${alienRelatedFields.length} authorized alien related fields\n`)

    // List fields by type
    console.log('📊 FIELDS BY TYPE:')
    console.log('-'.repeat(80))

    const textFields: string[] = []
    const checkBoxes: string[] = []
    const dropdowns: string[] = []
    const others: string[] = []

    allFields.forEach(field => {
      const name = field.getName()
      const type = field.constructor.name

      if (type === 'PDFTextField') {
        textFields.push(name)
      } else if (type === 'PDFCheckBox') {
        checkBoxes.push(name)
      } else if (type === 'PDFDropdown') {
        dropdowns.push(name)
      } else {
        others.push(name)
      }
    })

    console.log(`\n✏️  Text Fields (${textFields.length}):`)
    if (textFields.length < 50) {
      textFields.forEach(name => console.log(`   - "${name}"`))
    } else {
      console.log('   (Too many to display - see full list below)')
    }

    console.log(`\n☑️  Checkboxes (${checkBoxes.length}):`)
    checkBoxes.forEach(name => console.log(`   - "${name}"`))

    console.log(`\n📋 Dropdowns (${dropdowns.length}):`)
    dropdowns.forEach(name => console.log(`   - "${name}"`))

    if (others.length > 0) {
      console.log(`\n❓ Other Fields (${others.length}):`)
      others.forEach(name => console.log(`   - "${name}"`))
    }

    // Full alphabetical list
    console.log('\n' + '='.repeat(80))
    console.log('📜 COMPLETE ALPHABETICAL LIST OF ALL FIELDS:')
    console.log('='.repeat(80))

    const sortedFields = [...fieldNames].sort()
    sortedFields.forEach((name, idx) => {
      console.log(`${(idx + 1).toString().padStart(3, ' ')}. "${name}"`)
    })

    console.log('\n' + '='.repeat(80))
    console.log('✅ Field name listing complete!')
    console.log('='.repeat(80))

    // Return the data for programmatic access
    return {
      totalFields: fieldNames.length,
      alienRelatedFields,
      textFields,
      checkBoxes,
      dropdowns,
      allFieldNames: fieldNames
    }

  } catch (error) {
    console.error('❌ Error loading I-9 PDF template:', error)
    throw error
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).listI9Fields = listAllI9FieldNames
}
