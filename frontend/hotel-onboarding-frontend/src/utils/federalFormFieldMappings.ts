/**
 * Federal Form Field Mappings
 * This file contains the exact field names from official US government forms
 * obtained by analyzing the PDF form structures.
 */

export const I9_FORM_FIELDS = {
  // Section 1 - Employee Information and Attestation
  PERSONAL_INFO: {
    LAST_NAME: 'Last Name (Family Name)',
    FIRST_NAME: 'First Name Given Name',
    MIDDLE_INITIAL: 'Employee Middle Initial (if any)',
    OTHER_NAMES: 'Employee Other Last Names Used (if any)',
  },
  
  ADDRESS: {
    STREET: 'Address Street Number and Name',
    APT: 'Apt Number (if any)',
    CITY: 'City or Town',
    STATE: 'State', // This is a dropdown
    ZIP: 'ZIP Code',
  },
  
  CONTACT: {
    DOB: 'Date of Birth mmddyyyy',
    SSN: 'US Social Security Number',
    EMAIL: 'Employees E-mail Address',
    PHONE: 'Telephone Number',
  },
  
  CITIZENSHIP: {
    // Checkboxes
    CITIZEN: 'CB_1',
    NATIONAL: 'CB_2',
    PERMANENT_RESIDENT: 'CB_3',
    AUTHORIZED_ALIEN: 'CB_4',
    
    // Additional fields
    PERMANENT_RESIDENT_NUMBER: '3 A lawful permanent resident Enter USCIS or ANumber',
    USCIS_NUMBER: 'USCIS ANumber',
    EXPIRATION_DATE: 'Exp Date mmddyyyy',
    FOREIGN_PASSPORT: 'Foreign Passport Number and Country of IssuanceRow1',
    I94_NUMBER: 'Form I94 Admission Number',
  },
  
  SIGNATURE: {
    EMPLOYEE_SIGNATURE: 'Signature of Employee',
    DATE: "Today's Date mmddyyyy",
  },
  
  // Section 2 - Employer or Authorized Representative Review (for reference)
  SECTION2: {
    LAST_NAME: 'Last Name Family Name from Section 1',
    FIRST_NAME: 'First Name Given Name from Section 1',
    MIDDLE_INITIAL: 'Middle initial if any from Section 1',
    CITIZENSHIP_STATUS: 'Citizenship Immigration Status from Section 1',
    
    // Document fields
    LIST_A_DOC1_TITLE: 'Document Title 1',
    LIST_A_DOC1_ISSUING_AUTHORITY: 'Issuing Authority 1',
    LIST_A_DOC1_NUMBER: 'Document Number 0 (if any)',
    LIST_A_DOC1_EXPIRATION: 'List A.  Document 2. Expiration Date (if any)',
    
    LIST_B_DOC_TITLE: 'List B Document 1 Title',
    LIST_B_ISSUING_AUTHORITY: 'List B Issuing Authority 1',
    LIST_B_DOC_NUMBER: 'List B Document Number 1',
    LIST_B_EXPIRATION: 'List B Expiration Date 1',
    
    LIST_C_DOC_TITLE: 'List C Document Title 1',
    LIST_C_ISSUING_AUTHORITY: 'List C Issuing Authority 1',
    LIST_C_DOC_NUMBER: 'List C Document Number 1',
    LIST_C_EXPIRATION: 'List C Expiration Date 1',
    
    // Employment dates
    FIRST_DAY_EMPLOYED: 'FirstDayEmployed mmddyyyy',
    
    // Employer info
    EMPLOYER_NAME: 'Last Name First Name and Title of Employer or Authorized Representative',
    EMPLOYER_SIGNATURE: 'Signature of Employer or AR',
    EMPLOYER_DATE: 'S2 Todays Date mmddyyyy',
    EMPLOYER_BUSINESS_NAME: 'Employers Business or Org Name',
    EMPLOYER_BUSINESS_ADDRESS: 'Employers Business or Org Address',
  },
  
  // Additional fields found in the form
  ADDITIONAL_INFO: 'Additional Information',
  
  // Alternative procedure checkboxes
  ALTERNATIVE_PROCEDURE: {
    CB_ALT: 'CB_Alt',
    CB_ALT_0: 'CB_Alt_0',
    CB_ALT_1: 'CB_Alt_1',
    CB_ALT_2: 'CB_Alt_2',
  },
  
  // Preparer/Translator fields (if applicable)
  PREPARER: {
    LAST_NAME: [
      'Preparer or Translator Last Name (Family Name) 0',
      'Preparer or Translator Last Name (Family Name) 1',
      'Preparer or Translator Last Name (Family Name) 2',
      'Preparer or Translator Last Name (Family Name) 3',
    ],
    FIRST_NAME: [
      'Preparer or Translator First Name (Given Name) 0',
      'Preparer or Translator First Name (Given Name) 1',
      'Preparer or Translator First Name (Given Name) 2',
      'Preparer or Translator First Name (Given Name) 3',
    ],
    ADDRESS: [
      'Preparer or Translator Address (Street Number and Name) 0',
      'Preparer or Translator Address (Street Number and Name) 1',
      'Preparer or Translator Address (Street Number and Name) 2',
      'Preparer or Translator Address (Street Number and Name) 3',
    ],
    CITY: [
      'Preparer or Translator City or Town 0',
      'Preparer or Translator City or Town 1',
      'Preparer or Translator City or Town 2',
      'Preparer or Translator City or Town 3',
    ],
    STATE: [
      'Preparer State 0', // Dropdown
      'Preparer State 1', // Dropdown
      'Preparer State 2', // Dropdown
      'Preparer State 3', // Dropdown
    ],
    ZIP: [
      'Zip Code 0',
      'Zip Code 1',
      'Zip Code 2',
      'Zip Code 3',
    ],
    SIGNATURE: [
      'Signature of Preparer or Translator 0',
      'Signature of Preparer or Translator 1',
      'Signature of Preparer or Translator 2',
      'Signature of Preparer or Translator 3',
    ],
    DATE: [
      'Sig Date mmddyyyy 0',
      'Sig Date mmddyyyy 1',
      'Sig Date mmddyyyy 2',
      'Sig Date mmddyyyy 3',
    ],
  },
}

// W-4 Form Fields (2025 version)
export const W4_FORM_FIELDS = {
  // Step 1: Personal Information
  PERSONAL_INFO: {
    FIRST_NAME_MI: 'topmostSubform[0].Page1[0].Step1a[0].f1_01[0]',
    LAST_NAME: 'topmostSubform[0].Page1[0].Step1a[0].f1_02[0]',
    ADDRESS: 'topmostSubform[0].Page1[0].Step1a[0].f1_03[0]',
    CITY_STATE_ZIP: 'topmostSubform[0].Page1[0].Step1a[0].f1_04[0]',
    SSN: 'topmostSubform[0].Page1[0].f1_05[0]',
  },
  
  // Filing Status Checkboxes
  FILING_STATUS: {
    SINGLE_OR_MARRIED_FILING_SEPARATELY: 'topmostSubform[0].Page1[0].c1_1[0]',
    MARRIED_FILING_JOINTLY: 'topmostSubform[0].Page1[0].c1_1[1]',
    HEAD_OF_HOUSEHOLD: 'topmostSubform[0].Page1[0].c1_1[2]',
  },
  
  // Multiple Jobs
  MULTIPLE_JOBS_CHECKBOX: 'topmostSubform[0].Page1[0].c1_2[0]',
  
  // Dependents
  DEPENDENTS: {
    QUALIFYING_CHILDREN: 'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_06[0]',
    OTHER_DEPENDENTS: 'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_07[0]',
    TOTAL: 'topmostSubform[0].Page1[0].f1_09[0]',
  },
  
  // Other Adjustments
  OTHER_ADJUSTMENTS: {
    OTHER_INCOME: 'topmostSubform[0].Page1[0].f1_10[0]',
    DEDUCTIONS: 'topmostSubform[0].Page1[0].f1_11[0]',
    EXTRA_WITHHOLDING: 'topmostSubform[0].Page1[0].f1_12[0]',
  },
  
  // Signature
  SIGNATURE: {
    EMPLOYEE_SIGNATURE: 'topmostSubform[0].Page1[0].f1_13[0]',
    DATE: 'topmostSubform[0].Page1[0].f1_14[0]',
  },
  
  // Employer Section
  EMPLOYER: {
    NAME_ADDRESS: 'topmostSubform[0].Page1[0].f1_15[0]',
    FIRST_DATE_EMPLOYMENT: 'topmostSubform[0].Page1[0].f1_16[0]',
    EIN: 'topmostSubform[0].Page1[0].f1_17[0]',
  }
}

// Helper function to format dates for federal forms (mmddyyyy)
export function formatDateForFederalForm(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}${day}${year}`
}

// Helper function to format SSN without dashes
export function formatSSNForFederalForm(ssn: string): string {
  return ssn.replace(/\D/g, '')
}

// Helper function to format phone without formatting
export function formatPhoneForFederalForm(phone: string): string {
  return phone.replace(/\D/g, '')
}