import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Checkbox } from './ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import DigitalSignatureCapture from './DigitalSignatureCapture'
import { AlertTriangle, Shield, Info, CheckCircle } from 'lucide-react'
import { validateW4Form, FederalValidationError, generateComplianceAuditEntry } from '@/utils/federalValidation'
interface W4FormProps {
  onSubmit: (formData: any) => void
  ocrData?: any
  language?: 'en' | 'es'
}

export default function W4Form({ onSubmit, ocrData = {}, language = 'en' }: W4FormProps) {
  const [federalValidationResult, setFederalValidationResult] = useState<any>(null)
  const [complianceErrors, setComplianceErrors] = useState<string[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [dataSource, setDataSource] = useState<'manual' | 'auto-filled' | 'mixed'>('manual')
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [showErrors, setShowErrors] = useState(false)
  // Simple translation function for W4 form
  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'w4_form': 'Form W-4',
        'tax_withholding': 'Employee\'s Withholding Certificate',
        'personal_info': 'Personal Information',
        'first_name': 'First Name',
        'last_name': 'Last Name',
        'middle_initial': 'Middle Initial',
        'next': 'Next',
        'previous': 'Previous',
        'submit': 'Submit'
      },
      es: {
        'w4_form': 'Formulario W-4',
        'tax_withholding': 'Certificado de Retención del Empleado',
        'personal_info': 'Información Personal',
        'first_name': 'Nombre',
        'last_name': 'Apellido',
        'middle_initial': 'Inicial del Segundo Nombre',
        'next': 'Siguiente',
        'previous': 'Anterior',
        'submit': 'Enviar'
      }
    }
    return translations[language][key] || key
  }
  const [formData, setFormData] = useState({
    first_name: ocrData.first_name || '',
    middle_initial: ocrData.middle_initial || '',
    last_name: ocrData.last_name || '',
    address: ocrData.address || '',
    city: ocrData.city || '',
    state: ocrData.state || '',
    zip_code: ocrData.zip_code || '',
    ssn: ocrData.ssn || '',
    filing_status: ocrData.filing_status || '',
    
    multiple_jobs_checkbox: ocrData.multiple_jobs_checkbox || false,
    spouse_works_checkbox: ocrData.spouse_works_checkbox || false,
    
    dependents_amount: ocrData.dependents_amount || 0,
    other_credits: ocrData.other_credits || 0,
    
    other_income: ocrData.other_income || 0,
    deductions: ocrData.deductions || 0,
    extra_withholding: ocrData.extra_withholding || 0,
    
    signature: ocrData.signature || '',
    signature_date: ocrData.signature_date || new Date().toISOString().split('T')[0]
  })

  // Track if data was auto-filled for user feedback
  useEffect(() => {
    const hasAutoFillData = ocrData.first_name || ocrData.last_name || ocrData.address || ocrData.ssn;
    if (hasAutoFillData) {
      setDataSource('auto-filled');
    }
  }, [ocrData])

  // Real-time federal validation
  useEffect(() => {
    const validateFederalCompliance = async () => {
      setIsValidating(true)
      const validation = validateW4Form(formData)
      setFederalValidationResult(validation)
      
      const errors: string[] = []
      for (const error of validation.errors) {
        errors.push(`${error.legalCode}: ${error.message}`)
        if (error.complianceNote) {
          errors.push(`Compliance Note: ${error.complianceNote}`)
        }
      }
      setComplianceErrors(errors)
      setIsValidating(false)
    }
    
    // Only validate if we have some data
    if (formData.first_name || formData.last_name || formData.ssn) {
      validateFederalCompliance()
    }
  }, [formData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowErrors(true) // Show all errors when user tries to submit
    
    // Federal compliance check
    const validation = validateW4Form(formData)
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(error => 
        `${error.legalCode}: ${error.message}${error.complianceNote ? '\n  Compliance Note: ' + error.complianceNote : ''}`
      ).join('\n\n')
      
      alert(
        'FEDERAL TAX COMPLIANCE VIOLATIONS DETECTED\n\n' +
        errorMessages +
        '\n\nAll violations must be corrected before W-4 can be submitted.\n\n' +
        'Reference: Internal Revenue Code Section 3402'
      )
      return
    }
    
    if (!formData.signature || !formData.filing_status) {
      alert('Please complete all required fields including signature')
      return
    }
    
    // Add compliance audit trail
    const auditTrail = generateComplianceAuditEntry(
      'W4_Form',
      validation,
      { id: 'current_user', email: 'employee@company.com' }
    )
    
    onSubmit({
      ...formData,
      federal_compliance_verified: true,
      compliance_audit_trail: auditTrail
    })
  }

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [field]: true }))
    
    // Track when user modifies auto-filled data
    if (dataSource === 'auto-filled' && value !== ocrData[field]) {
      setDataSource('mixed')
    }
  }

  // Handle field blur to show validation errors
  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }))
  }

  // Function to determine if error should be shown
  const shouldShowError = (field: string) => {
    return showErrors || touchedFields[field]
  }

  return (
    <div className="flex-container-adaptive container-responsive spacing-responsive-md">
      {/* CRITICAL: IRS COMPLIANCE NOTICE - Collapsible */}
      <details className="group">
        <summary className="cursor-pointer bg-red-50 border border-red-200 rounded p-2 sm:p-3 hover:bg-red-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-red-900 text-responsive-sm">🚨 CRITICAL: IRS COMPLIANCE REQUIREMENT</span>
            </div>
            <svg className="h-4 w-4 text-red-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div className="mt-2 text-red-800 spacing-responsive-sm px-2 sm:px-3 pb-2">
          <p className="font-semibold text-responsive-sm">This Form W-4 MUST generate the official IRS template to be legally compliant.</p>
          <p className="text-responsive-sm">Any custom HTML forms or unofficial templates violate federal tax law requirements.</p>
          <p className="text-responsive-sm font-medium bg-red-200 px-2 py-1 rounded">Reference: Internal Revenue Code Section 3402 | IRS Publication 15</p>
        </div>
      </details>

      {/* Federal Compliance Status Bar - Compact */}
      {federalValidationResult && (
        <div className={`flex-shrink-0 ${
          !federalValidationResult.isValid ? 'bg-red-600' : 
          federalValidationResult.warnings.length > 0 ? 'bg-yellow-600' : 'bg-green-600'
        } text-white px-4 py-1 rounded-lg`}>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Shield className="h-3 w-3" />
              <span className="font-medium">
                {!federalValidationResult.isValid 
                  ? 'IRS COMPLIANCE VIOLATIONS DETECTED' 
                  : federalValidationResult.warnings.length > 0 
                    ? 'IRS COMPLIANCE WARNINGS' 
                    : 'IRS COMPLIANCE VERIFIED'
                }
              </span>
            </div>
            <div className="text-xs">
              {federalValidationResult.errors.length} Errors | {federalValidationResult.warnings.length} Warnings
            </div>
          </div>
        </div>
      )}
      
      {/* Federal Compliance Errors Display */}
      {federalValidationResult && (federalValidationResult.errors.length > 0 || federalValidationResult.warnings.length > 0) && (
        <div className="space-y-4">
          {federalValidationResult.errors.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-bold text-red-800">🚨 IRS TAX COMPLIANCE VIOLATIONS</h3>
              </div>
              <div className="space-y-2">
                {federalValidationResult.errors.map((error: FederalValidationError, index: number) => (
                  <div key={index} className="bg-white border-l-4 border-red-500 p-3 rounded">
                    <div className="font-semibold text-red-800">{error.legalCode}: {error.message}</div>
                    {error.complianceNote && (
                      <div className="text-red-700 text-sm mt-1">⚖️ {error.complianceNote}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {federalValidationResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Info className="h-5 w-5 text-yellow-600" />
                <h3 className="font-bold text-yellow-800">⚠️ IRS TAX COMPLIANCE WARNINGS</h3>
              </div>
              <div className="space-y-2">
                {federalValidationResult.warnings.map((warning: FederalValidationError, index: number) => (
                  <div key={index} className="bg-white border-l-4 border-yellow-500 p-3 rounded">
                    <div className="font-semibold text-yellow-800">{warning.legalCode}: {warning.message}</div>
                    {warning.complianceNote && (
                      <div className="text-yellow-700 text-sm mt-1">📋 {warning.complianceNote}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto-Fill Status Notification */}
      {dataSource === 'auto-filled' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-800 text-sm">
              ✅ Form Pre-filled from Personal Information
            </span>
          </div>
          <p className="text-green-700 text-xs mt-1">
            Your personal information has been automatically filled in. Please review and modify as needed.
          </p>
        </div>
      )}
      
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4 overflow-auto">
      {/* Official W-4 Header - IRS COMPLIANT - Compact */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-center space-x-2 mb-3">
          <Shield className="h-6 w-6 text-blue-600" />
          <div className="text-center">
            <h1 className="text-xl font-bold text-blue-900">Form W-4</h1>
            <p className="text-sm font-semibold text-blue-800">Department of the Treasury - Internal Revenue Service</p>
            <p className="text-base font-bold text-blue-900">Employee's Withholding Certificate</p>
            <p className="text-xs text-blue-700">OMB No. 1545-0074 | 2025</p>
          </div>
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-2">
          <p className="text-xs text-blue-800 text-center font-semibold mb-1">
            🛡️ OFFICIAL IRS FORM: Complete Form W-4 so that your employer can withhold the correct federal income tax from your pay.
          </p>
          <p className="text-xs text-blue-700 text-center">
            Give Form W-4 to your employer. Your withholding is subject to review by the IRS.
          </p>
          <p className="text-xs text-blue-700 text-center mt-1 font-medium">
            Reference: Internal Revenue Code Section 3402 | IRS Publication 15
          </p>
        </div>
      </div>

      {/* Step 1: Enter Personal Information - IRS OFFICIAL LAYOUT */}
      <div className="space-y-4 border-2 border-gray-300 rounded-lg p-6 bg-white">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Step 1: Enter Personal Information</h2>
          <p className="text-sm text-gray-700">Complete this step to ensure accurate tax withholding calculations.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="first_name" className="text-sm">First Name *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => updateField('first_name', e.target.value)}
              onBlur={() => handleFieldBlur('first_name')}
              required
              size="sm"
              placeholder=""
            />
          </div>
          <div>
            <Label htmlFor="middle_initial" className="text-sm">M.I.</Label>
            <Input
              id="middle_initial"
              value={formData.middle_initial}
              onChange={(e) => updateField('middle_initial', e.target.value)}
              onBlur={() => handleFieldBlur('middle_initial')}
              maxLength={1}
              size="sm"
              placeholder=""
            />
          </div>
          <div>
            <Label htmlFor="last_name" className="text-sm">Last Name *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => updateField('last_name', e.target.value)}
              onBlur={() => handleFieldBlur('last_name')}
              required
              size="sm"
              placeholder=""
            />
          </div>
          <div>
            <Label htmlFor="ssn" className="text-sm">SSN *</Label>
            <Input
              id="ssn"
              value={formData.ssn}
              onChange={(e) => {
                // Format SSN as user types
                const formatted = e.target.value.replace(/\D/g, '').replace(/(\d{3})(\d{2})(\d{4})/, '$1-$2-$3')
                updateField('ssn', formatted)
              }}
              onBlur={() => handleFieldBlur('ssn')}
              required
              placeholder=""
              maxLength={11}
              size="sm"
              className={shouldShowError('ssn') && federalValidationResult?.errors.find((e: any) => e.field === 'ssn') ? 'border-red-500' : ''}
            />
            {shouldShowError('ssn') && federalValidationResult?.errors.find((e: any) => e.field === 'ssn') && (
              <p className="text-red-600 text-xs mt-1 font-semibold">
                ⚠️ Federal SSN validation failed - check format and validity
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Label htmlFor="address" className="text-sm">Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              onBlur={() => handleFieldBlur('address')}
              required
              size="sm"
              placeholder=""
            />
          </div>
          <div>
            <Label htmlFor="city" className="text-sm">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              onBlur={() => handleFieldBlur('city')}
              required
              size="sm"
              placeholder=""
            />
          </div>
          <div>
            <Label htmlFor="state" className="text-sm">State *</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
              onBlur={() => handleFieldBlur('state')}
              required
              size="sm"
              placeholder=""
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="zip_code" className="text-sm">ZIP Code *</Label>
            <Input
              id="zip_code"
              value={formData.zip_code}
              onChange={(e) => {
                // Format ZIP code as user types
                const formatted = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d{4})/, '$1-$2')
                updateField('zip_code', formatted)
              }}
              onBlur={() => handleFieldBlur('zip_code')}
              required
              placeholder=""
              maxLength={10}
              size="sm"
              className={shouldShowError('zip_code') && federalValidationResult?.errors.find((e: any) => e.field === 'zip_code') ? 'border-red-500' : ''}
            />
            {shouldShowError('zip_code') && federalValidationResult?.errors.find((e: any) => e.field === 'zip_code') && (
              <p className="text-red-600 text-xs mt-1 font-semibold">
                ⚠️ Valid US ZIP code required for tax purposes
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="filing_status" className="text-sm">Filing Status *</Label>
            <Select value={formData.filing_status} onValueChange={(value) => updateField('filing_status', value)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select filing status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single/Married filing separately</SelectItem>
                <SelectItem value="Married filing jointly">Married filing jointly/Qualifying spouse</SelectItem>
                <SelectItem value="Head of household">Head of household</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Step 2: Multiple Jobs or Spouse Works - IRS OFFICIAL LAYOUT */}
      <div className="space-y-4 border-2 border-gray-300 rounded-lg p-6 bg-white">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Step 2: Multiple Jobs or Spouse Works</h2>
          <p className="text-sm text-gray-700 mb-3">Complete this step if you (1) hold more than one job at a time, or (2) are married filing jointly and your spouse also works. The correct amount of withholding depends on income earned from all of these jobs.</p>
          <p className="text-xs text-gray-600 bg-yellow-50 p-2 rounded border">Complete Steps 2–4 ONLY if they apply to you; otherwise, skip to Step 5.</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="multiple_jobs"
            checked={formData.multiple_jobs_checkbox}
            onCheckedChange={(checked) => updateField('multiple_jobs_checkbox', checked)}
          />
          <Label htmlFor="multiple_jobs" className="text-sm">
            I have multiple jobs or my spouse works
          </Label>
        </div>
        
        {formData.multiple_jobs_checkbox && (
          <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
            <p className="text-xs text-gray-700">
              <strong>Note:</strong> Use IRS.gov/W4App or Multiple Jobs Worksheet for correct withholding.
            </p>
          </div>
        )}
      </div>

      {/* Step 3: Claim Dependent and Other Credits - IRS OFFICIAL LAYOUT */}
      <div className="space-y-4 border-2 border-gray-300 rounded-lg p-6 bg-white">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Step 3: Claim Dependent and Other Credits</h2>
          <p className="text-sm text-gray-700 mb-2">If your total income will be $200,000 or less ($400,000 or less if married filing jointly):</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="dependents_amount" className="text-sm font-medium text-gray-700">
              Multiply the number of qualifying children under age 17 by $2,000
            </Label>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-lg">$</span>
              <Input
                id="dependents_amount"
                type="number"
                value={formData.dependents_amount}
                onChange={(e) => updateField('dependents_amount', parseFloat(e.target.value) || 0)}
                placeholder=""
                min="0"
                step="2000"
                className="text-lg font-medium"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="other_credits" className="text-sm font-medium text-gray-700">
              Multiply the number of other dependents by $500
            </Label>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-lg">$</span>
              <Input
                id="other_credits"
                type="number"
                value={formData.other_credits}
                onChange={(e) => updateField('other_credits', parseFloat(e.target.value) || 0)}
                placeholder=""
                min="0"
                step="500"
                className="text-lg font-medium"
              />
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded border">
            <Label className="text-sm font-medium text-gray-700">
              Add the amounts above for qualifying children and other dependents. You may add to this the amount of any other credits. Enter the total here:
            </Label>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-lg font-bold">3</span>
              <span className="text-lg">$</span>
              <div className="text-xl font-bold text-blue-900 px-3 py-2 bg-white border-2 border-blue-300 rounded">
                {(formData.dependents_amount + formData.other_credits).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 4 (optional): Other Adjustments - IRS OFFICIAL LAYOUT */}
      <div className="space-y-4 border-2 border-gray-300 rounded-lg p-6 bg-white">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Step 4 (optional): Other Adjustments</h2>
          <p className="text-sm text-gray-700">Complete this step if you want additional tax withheld or have other adjustments.</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <Label htmlFor="other_income" className="text-sm font-medium text-gray-700">
              (a) Other income (not from jobs). If you want tax withheld for other income you expect this year that won't have withholding, enter the amount of other income here. This may include interest, dividends, and retirement income
            </Label>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-lg font-bold">4(a)</span>
              <span className="text-lg">$</span>
              <Input
                id="other_income"
                type="number"
                value={formData.other_income}
                onChange={(e) => updateField('other_income', parseFloat(e.target.value) || 0)}
                placeholder=""
                min="0"
                className="text-lg font-medium"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="deductions" className="text-sm font-medium text-gray-700">
              (b) Deductions. If you expect to claim deductions other than the standard deduction and want to reduce your withholding, use the Deductions Worksheet on page 3 and enter the result here
            </Label>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-lg font-bold">4(b)</span>
              <span className="text-lg">$</span>
              <Input
                id="deductions"
                type="number"
                value={formData.deductions}
                onChange={(e) => updateField('deductions', parseFloat(e.target.value) || 0)}
                placeholder=""
                min="0"
                className="text-lg font-medium"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="extra_withholding" className="text-sm font-medium text-gray-700">
              (c) Extra withholding. Enter any additional tax you want withheld each pay period
            </Label>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-lg font-bold">4(c)</span>
              <span className="text-lg">$</span>
              <Input
                id="extra_withholding"
                type="number"
                value={formData.extra_withholding}
                onChange={(e) => updateField('extra_withholding', parseFloat(e.target.value) || 0)}
                placeholder=""
                min="0"
                className="text-lg font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step 5: Sign Here - IRS OFFICIAL LAYOUT */}
      <div className="space-y-4 border-2 border-red-300 rounded-lg p-6 bg-red-50">
        <div className="bg-red-100 border border-red-200 rounded-lg p-4">
          <h2 className="text-xl font-bold text-red-900 mb-2">Step 5: Sign Here</h2>
          <p className="text-sm text-red-800 font-medium">Under penalties of perjury, I declare that this certificate, to the best of my knowledge and belief, is true, correct, and complete.</p>
        </div>
        
        <div className="bg-gradient-to-r from-red-100 to-red-200 p-4 rounded-lg border-2 border-red-300">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-700" />
            <p className="text-sm font-bold text-red-900">FEDERAL PERJURY WARNING</p>
          </div>
          <p className="text-sm text-red-800 font-medium">
            Under penalties of perjury, I declare that this certificate, to the best of my knowledge and belief, is true, correct, and complete.
          </p>
          <p className="text-xs text-red-700 mt-2">
            False statements on this form may result in criminal prosecution under 26 USC 7206.
          </p>
        </div>

        <div className="space-y-4">
          <DigitalSignatureCapture
            documentName="Form W-4 - Employee's Withholding Certificate"
            signerName={`${formData.first_name} ${formData.last_name}`}
            signerTitle="Employee"
            acknowledgments={[
              "I declare that this certificate, to the best of my knowledge and belief, is true, correct, and complete",
              "I understand that false statements may result in penalties under federal tax law"
            ]}
            requireIdentityVerification={true}
            language={language}
            onSignatureComplete={(signatureData) => updateField('signature', signatureData.signatureData)}
            onCancel={() => {}}
          />
          <div>
            <Label htmlFor="signature_date" className="text-sm">Date *</Label>
            <Input
              id="signature_date"
              type="date"
              value={formData.signature_date}
              onChange={(e) => updateField('signature_date', e.target.value)}
              required
              size="sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Federal Compliance Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-blue-800">🛡️ Federal Tax Compliance Notice</span>
          </div>
          <p className="text-xs text-blue-700">
            This W-4 form is validated against IRS requirements (IRC Section 3402). 
            Under penalties of perjury, the information provided must be true, correct, and complete.
            False statements may result in penalties under federal tax law.
          </p>
        </div>
        
        <Button 
          type="submit" 
          disabled={!federalValidationResult?.isValid || isValidating}
          className={`w-full h-14 text-base font-bold transition-all ${
            !federalValidationResult?.isValid || isValidating
              ? 'bg-red-100 text-red-400 cursor-not-allowed border-2 border-red-200'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {isValidating ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
              <span>Validating Federal Compliance...</span>
            </div>
          ) : !federalValidationResult?.isValid ? (
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>BLOCKED - Fix Compliance Violations</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Complete W-4 Form (Federal Compliance Verified)</span>
            </div>
          )}
        </Button>
      </div>
    </form>
    </div>
  )
}
