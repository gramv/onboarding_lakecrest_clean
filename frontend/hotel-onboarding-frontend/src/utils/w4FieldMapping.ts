/**
 * W-4 Form Field Mappings
 * Based on analysis of the 2025 W-4 form structure
 * The W-4 uses generic field names, so we need to map them to their actual purposes
 */

export const W4_FIELD_MAPPINGS = {
  // Step 1: Personal Information
  PERSONAL_INFO: {
    // Step 1(a) - Name and address
    FIRST_NAME_MI: 'topmostSubform[0].Page1[0].Step1a[0].f1_01[0]', // First name and middle initial
    LAST_NAME: 'topmostSubform[0].Page1[0].Step1a[0].f1_02[0]', // Last name
    ADDRESS: 'topmostSubform[0].Page1[0].Step1a[0].f1_03[0]', // Address and apartment number
    CITY_STATE_ZIP: 'topmostSubform[0].Page1[0].Step1a[0].f1_04[0]', // City, state, and ZIP code
    
    // Step 1(b) - SSN
    SSN: 'topmostSubform[0].Page1[0].f1_05[0]', // Social security number
  },
  
  // Step 1(c) - Filing Status Checkboxes
  FILING_STATUS: {
    SINGLE_OR_MARRIED_FILING_SEPARATELY: 'topmostSubform[0].Page1[0].c1_1[0]', // Checkbox 1
    MARRIED_FILING_JOINTLY: 'topmostSubform[0].Page1[0].c1_1[1]', // Checkbox 2
    HEAD_OF_HOUSEHOLD: 'topmostSubform[0].Page1[0].c1_1[2]', // Checkbox 3
  },
  
  // Step 2 - Multiple Jobs or Spouse Works
  MULTIPLE_JOBS: {
    // Checkbox for Step 2
    MULTIPLE_JOBS_CHECKBOX: 'topmostSubform[0].Page1[0].c1_2[0]',
  },
  
  // Step 3 - Claim Dependents
  DEPENDENTS: {
    QUALIFYING_CHILDREN: 'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_06[0]', // Number of qualifying children × $2,000
    OTHER_DEPENDENTS: 'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_07[0]', // Number of other dependents × $500
    TOTAL_DEPENDENTS: 'topmostSubform[0].Page1[0].f1_09[0]', // Line 3 total
  },
  
  // Step 4 - Other Adjustments
  OTHER_ADJUSTMENTS: {
    // 4(a) Other income
    OTHER_INCOME: 'topmostSubform[0].Page1[0].f1_10[0]',
    
    // 4(b) Deductions
    DEDUCTIONS: 'topmostSubform[0].Page1[0].f1_11[0]',
    
    // 4(c) Extra withholding
    EXTRA_WITHHOLDING: 'topmostSubform[0].Page1[0].f1_12[0]',
  },
  
  // Step 5 - Sign Here (Employee section)
  SIGNATURE: {
    EMPLOYEE_SIGNATURE: 'topmostSubform[0].Page1[0].f1_13[0]',
    DATE: 'topmostSubform[0].Page1[0].f1_14[0]',
  },
  
  // Employers Only section
  EMPLOYER: {
    EMPLOYER_NAME_ADDRESS: 'topmostSubform[0].Page1[0].f1_15[0]', // Employer's name and address
    FIRST_DATE_EMPLOYMENT: 'topmostSubform[0].Page1[0].f1_16[0]', // First date of employment
    EIN: 'topmostSubform[0].Page1[0].f1_17[0]', // Employer identification number (EIN)
  },
  
  // Page 3 - Multiple Jobs Worksheet (if applicable)
  WORKSHEET: {
    JOB1_ANNUAL_WAGES: 'topmostSubform[0].Page3[0].f3_01[0]',
    JOB2_ANNUAL_WAGES: 'topmostSubform[0].Page3[0].f3_02[0]',
    JOB1_PLUS_JOB2: 'topmostSubform[0].Page3[0].f3_03[0]',
    TABLE_LOOKUP_VALUE: 'topmostSubform[0].Page3[0].f3_04[0]',
    LINE3_TIMES_JOBS: 'topmostSubform[0].Page3[0].f3_05[0]',
    LINE1_MINUS_LINE4: 'topmostSubform[0].Page3[0].f3_06[0]',
    WITHHOLDING_AMOUNT: 'topmostSubform[0].Page3[0].f3_07[0]',
    HIGHEST_PAYING_JOB_ANNUAL: 'topmostSubform[0].Page3[0].f3_08[0]',
    DIVIDE_LINE6_BY_LINE7: 'topmostSubform[0].Page3[0].f3_09[0]',
    ADDITIONAL_WITHHOLDING: 'topmostSubform[0].Page3[0].f3_10[0]',
    DEDUCTIONS_WORKSHEET_LINE5: 'topmostSubform[0].Page3[0].f3_11[0]',
  }
}

// Helper function to format SSN for W-4 (XXX-XX-XXXX)
export function formatSSNForW4(ssn: string): string {
  const digits = ssn.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`
}

// Helper function to format dollar amounts
export function formatDollarAmount(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount
  return isNaN(numericAmount) ? '' : numericAmount.toFixed(2)
}

// Helper function to calculate dependent amounts
export function calculateDependentAmount(qualifyingChildren: number, otherDependents: number): number {
  return (qualifyingChildren * 2000) + (otherDependents * 500)
}