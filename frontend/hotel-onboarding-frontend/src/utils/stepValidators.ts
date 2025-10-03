import { ValidationResult } from '@/hooks/useStepValidation'

/**
 * Validators for each onboarding step
 */

export const personalInfoValidator = (data: any): ValidationResult => {
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  // Handle nested structure from PersonalInfoStep
  const personalInfo = data.personalInfo || data
  const emergencyContacts = data.emergencyContacts || {}

  // Validate personal info fields
  if (!personalInfo.firstName?.trim()) {
    fieldErrors['personalInfo.firstName'] = 'First name is required'
  }
  if (!personalInfo.lastName?.trim()) {
    fieldErrors['personalInfo.lastName'] = 'Last name is required'
  }
  if (!personalInfo.email?.trim()) {
    fieldErrors['personalInfo.email'] = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalInfo.email)) {
    fieldErrors['personalInfo.email'] = 'Please enter a valid email address'
  }
  if (!personalInfo.phone?.trim()) {
    fieldErrors['personalInfo.phone'] = 'Phone number is required'
  }
  if (!personalInfo.address?.trim()) {
    fieldErrors['personalInfo.address'] = 'Address is required'
  }
  if (!personalInfo.city?.trim()) {
    fieldErrors['personalInfo.city'] = 'City is required'
  }
  if (!personalInfo.state?.trim()) {
    fieldErrors['personalInfo.state'] = 'State is required'
  }
  if (!personalInfo.zipCode?.trim()) {
    fieldErrors['personalInfo.zipCode'] = 'ZIP code is required'
  }

  // Validate emergency contact (primary contact required)
  const primaryContact = emergencyContacts.primaryContact || {}
  if (!primaryContact.name?.trim()) {
    fieldErrors['emergencyContacts.primaryContact.name'] = 'Primary emergency contact name is required'
  }
  if (!primaryContact.relationship?.trim()) {
    fieldErrors['emergencyContacts.primaryContact.relationship'] = 'Primary emergency contact relationship is required'
  }
  if (!primaryContact.phoneNumber?.trim()) {
    fieldErrors['emergencyContacts.primaryContact.phoneNumber'] = 'Primary emergency contact phone is required'
  }

  // Convert field errors to general errors if needed
  const personalInfoErrorCount = Object.keys(fieldErrors).filter(k => k.startsWith('personalInfo')).length
  const emergencyErrorCount = Object.keys(fieldErrors).filter(k => k.startsWith('emergencyContacts')).length
  
  if (personalInfoErrorCount > 0) {
    errors.push(`Please complete all required personal information fields (${personalInfoErrorCount} missing)`)
  }
  if (emergencyErrorCount > 0) {
    errors.push(`Please complete all required emergency contact fields (${emergencyErrorCount} missing)`)
  }

  return {
    valid: errors.length === 0 && Object.keys(fieldErrors).length === 0,
    errors,
    fieldErrors
  }
}

export const i9Section1Validator = (data: any): ValidationResult => {
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  // Handle both direct data and nested formData structure (for i9-complete step)
  const formData = data.formData || data
  
  // Personal Information
  if (!formData.last_name?.trim() && !formData.lastName?.trim()) {
    fieldErrors.lastName = 'Last name is required for I-9'
  }
  if (!formData.first_name?.trim() && !formData.firstName?.trim()) {
    fieldErrors.firstName = 'First name is required for I-9'
  }
  if (!formData.date_of_birth && !formData.dateOfBirth) {
    fieldErrors.dateOfBirth = 'Date of birth is required'
  }
  if (!formData.ssn?.trim()) {
    fieldErrors.ssn = 'Social Security Number is required'
  }

  // Citizenship Status - check both field name variations
  const citizenshipStatus = formData.citizenship_status || formData.citizenshipStatus
  if (!citizenshipStatus) {
    errors.push('You must select your citizenship status')
  }

  // Alien Number/USCIS Number for non-citizens
  if ((citizenshipStatus === 'alien_authorized' || citizenshipStatus === 'authorized_alien') && 
      !formData.alien_registration_number?.trim() && !formData.alienNumber?.trim() && 
      !formData.uscisNumber?.trim()) {
    errors.push('Alien Registration Number or USCIS Number is required for work-authorized aliens')
  }

  // Signature - check both nested and direct signature data
  const hasSignature = data.signed || formData.signed || data.signatureData || formData.signatureData || data.isSigned
  if (!hasSignature) {
    errors.push('Electronic signature is required')
  }

  const fieldErrorCount = Object.keys(fieldErrors).length
  return {
    valid: errors.length === 0 && fieldErrorCount === 0,
    errors,
    fieldErrors
  }
}

export const w4FormValidator = (data: any): ValidationResult => {
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  // Handle both direct data and nested formData structure
  const formData = data.formData || data

  // If the form is already signed, bypass validation
  if (data.signed || data.isSigned || formData.signed || formData.isSigned) {
    return {
      valid: true,
      errors: [],
      fieldErrors: {}
    }
  }

  // Step 1 - Personal Information
  // Check both underscore and camelCase field names like I-9 does
  if (!formData.first_name?.trim() && !formData.firstName?.trim()) {
    fieldErrors.firstName = 'First name is required'
  }
  if (!formData.last_name?.trim() && !formData.lastName?.trim()) {
    fieldErrors.lastName = 'Last name is required'
  }
  if (!formData.ssn?.trim()) {
    fieldErrors.ssn = 'Social Security Number is required'
  }
  if (!formData.address?.trim()) {
    fieldErrors.address = 'Address is required'
  }

  // Step 2 - Filing Status
  // Check both field name variations
  const filingStatus = formData.filing_status || formData.filingStatus
  if (!filingStatus) {
    errors.push('You must select a filing status')
  }

  // Note: Signature validation removed - signature happens after preview in ReviewAndSign component
  // The validator should only check form fields, not signature status

  const fieldErrorCount = Object.keys(fieldErrors).length
  return {
    valid: errors.length === 0 && fieldErrorCount === 0,
    errors,
    fieldErrors
  }
}

export const directDepositValidator = (data: any): ValidationResult => {
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  // Only validate banking details if direct deposit is selected
  if (data.paymentMethod === 'direct_deposit') {
    // Check for account type - handle both flat and nested structure
    const accountType = data.accountType || data.primaryAccount?.accountType
    if (!accountType) {
      errors.push('Please select an account type')
    }

    // Check bank name - handle both flat and nested structure
    const bankName = data.bankName || data.primaryAccount?.bankName
    if (!bankName?.trim()) {
      fieldErrors.bankName = 'Bank name is required'
    }
    
    // Check routing number - handle both flat and nested structure
    const routingNumber = data.routingNumber || data.primaryAccount?.routingNumber
    if (!routingNumber?.trim()) {
      fieldErrors.routingNumber = 'Routing number is required'
    } else if (!/^\d{9}$/.test(routingNumber)) {
      fieldErrors.routingNumber = 'Routing number must be 9 digits'
    }
    
    // Check account number - handle both flat and nested structure
    const accountNumber = data.accountNumber || data.primaryAccount?.accountNumber
    const confirmAccountNumber = data.confirmAccountNumber || data.primaryAccount?.accountNumberConfirm
    if (!accountNumber?.trim()) {
      fieldErrors.accountNumber = 'Account number is required'
    }
    if (!confirmAccountNumber?.trim()) {
      fieldErrors.confirmAccountNumber = 'Please confirm account number'
    } else if (accountNumber !== confirmAccountNumber) {
      fieldErrors.confirmAccountNumber = 'Account numbers do not match'
    }

    // Voided check upload - only required for direct deposit
    if (!data.voidedCheckUploaded && !data.bankLetterUploaded && !data.accountVerified) {
      errors.push('Please upload a voided check or bank letter for verification')
    }
  }
  // For paper check, no additional validation needed

  const fieldErrorCount = Object.keys(fieldErrors).length
  return {
    valid: errors.length === 0 && fieldErrorCount === 0,
    errors,
    fieldErrors
  }
}

export const companyPoliciesValidator = (data: any): ValidationResult => {
  const errors: string[] = []

  // Check for required initials
  if (!data.sexualHarassmentInitials?.trim() || data.sexualHarassmentInitials.trim().length < 2) {
    errors.push('Sexual Harassment Policy initials are required (at least 2 characters)')
  }
  if (!data.eeoInitials?.trim() || data.eeoInitials.trim().length < 2) {
    errors.push('Equal Employment Opportunity Policy initials are required (at least 2 characters)')
  }

  // Check acknowledgment
  if (!data.acknowledgmentChecked) {
    errors.push('You must acknowledge that you have read and understood all policies')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export const healthInsuranceValidator = (data: any): ValidationResult => {
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  // Check if either waived or plan selected
  if (!data.isWaived && !data.medicalPlan) {
    errors.push('Please select a health insurance plan or decline coverage')
  }

  // If enrolling (not waived), check for required information
  if (!data.isWaived && data.medicalPlan) {
    // Check if coverage tier requires dependents
    if ((data.medicalTier === 'employee_spouse' || 
         data.medicalTier === 'employee_children' || 
         data.medicalTier === 'family') && 
        (!data.dependents || data.dependents.length === 0)) {
      errors.push('Dependent information is required for the selected coverage tier')
    }
    
    // Check dependent information if provided
    if (data.dependents && data.dependents.length > 0) {
      data.dependents.forEach((dep: any, index: number) => {
        if (!dep.firstName?.trim()) {
          fieldErrors[`dependent_${index}_firstName`] = 'Dependent first name is required'
        }
        if (!dep.lastName?.trim()) {
          fieldErrors[`dependent_${index}_lastName`] = 'Dependent last name is required'
        }
        if (!dep.dateOfBirth) {
          fieldErrors[`dependent_${index}_dob`] = 'Dependent date of birth is required'
        }
        if (!dep.relationship) {
          fieldErrors[`dependent_${index}_relationship`] = 'Dependent relationship is required'
        }
      })
      
      // Verify IRS confirmation if dependents are added
      if (!data.irsDependentConfirmation) {
        errors.push('Please confirm the IRS dependent certification')
      }
    }
  }

  const fieldErrorCount = Object.keys(fieldErrors).length
  return {
    valid: errors.length === 0 && fieldErrorCount === 0,
    errors,
    fieldErrors
  }
}

export const documentUploadValidator = (data: any): ValidationResult => {
  const errors: string[] = []

  if (data.documentStrategy === 'listA') {
    if (!data.selectedDocuments || data.selectedDocuments.length === 0) {
      errors.push('Please select and upload one List A document')
    }
  } else if (data.documentStrategy === 'listBC') {
    const hasListB = data.selectedDocuments?.some((docId: string) => 
      docId.includes('drivers-license') || docId.includes('military-id')
    )
    const hasListC = data.selectedDocuments?.some((docId: string) => 
      docId.includes('social-security') || docId.includes('birth-certificate')
    )
    
    if (!hasListB) {
      errors.push('Please select and upload one List B document (identity)')
    }
    if (!hasListC) {
      errors.push('Please select and upload one List C document (work authorization)')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export const finalReviewValidator = (data: any): ValidationResult => {
  const errors: string[] = []

  // Check all final acknowledgments
  if (!data.finalAcknowledgments || !data.finalAcknowledgments.every((ack: boolean) => ack)) {
    errors.push('Please check all final acknowledgments before signing')
  }

  // ✅ FIX: Check for signature - DigitalSignatureCapture sends signature object with signatureData field
  // The signature object has: signatureData, timestamp, signedByName, etc.
  const hasSignature = data.signature?.signatureData ||
                       data.signatureData ||
                       data.signature?.signature ||
                       (data.signature && typeof data.signature === 'object' && Object.keys(data.signature).length > 0)

  if (!hasSignature) {
    errors.push('Final employee signature is required to complete onboarding')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Map step IDs to validators
export const welcomeValidator = (data: any = {}): ValidationResult => {
  const acknowledged = Boolean(data.welcomeAcknowledged ?? data.timerComplete)
  return {
    valid: acknowledged,
    errors: acknowledged ? [] : ['Preparing your onboarding experience...']
  }
}

export const jobDetailsValidator = (data: any = {}): ValidationResult => {
  const acknowledged = Boolean(data.acknowledged)
  return {
    valid: acknowledged,
    errors: acknowledged ? [] : ['Please accept the job details before continuing.']
  }
}

export const traffickingValidator = (data: any = {}): ValidationResult => {
  const complete = Boolean(data.trainingComplete || data.training_completed)
  return {
    valid: complete,
    errors: complete ? [] : ['Complete the human trafficking training to proceed.']
  }
}

export const weaponsPolicyValidator = (data: any = {}): ValidationResult => {
  const signed = Boolean(data.isSigned || data.signed)
  return {
    valid: signed,
    errors: signed ? [] : ['Please review and sign the weapons policy acknowledgment.']
  }
}

export const documentUploadValidatorEnhanced = (data: any): ValidationResult => {
  const baseResult = documentUploadValidator(data)
  const hasUploads = Array.isArray(data?.selectedDocuments) && data.selectedDocuments.length > 0
  return {
    ...baseResult,
    valid: baseResult.valid && hasUploads,
    errors: baseResult.valid && !hasUploads
      ? ['Select and upload the required documents before continuing']
      : baseResult.errors
  }
}

export const stepValidators: Record<string, (data: any) => ValidationResult> = {
  welcome: welcomeValidator,
  'personal-info': personalInfoValidator,
  'job-details': jobDetailsValidator,
  'company-policies': companyPoliciesValidator,
  'i9-section1': i9Section1Validator,
  'i9-complete': i9Section1Validator,
  'document-upload': documentUploadValidatorEnhanced,
  'w4-form': w4FormValidator,
  'direct-deposit': directDepositValidator,
  'trafficking-awareness': traffickingValidator,
  'weapons-policy': weaponsPolicyValidator,
  'health-insurance': healthInsuranceValidator,
  'final-review': finalReviewValidator
}
