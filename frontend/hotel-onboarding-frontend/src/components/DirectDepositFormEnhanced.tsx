import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CreditCard, Building, Plus, Trash2, AlertTriangle, Info, Upload, Check, Clock, FileText, Save } from 'lucide-react'
import { useAutoSave } from '@/hooks/useAutoSave'
import { uploadOnboardingDocument } from '@/services/onboardingDocuments'

interface BankAccount {
  bankName: string
  routingNumber: string
  accountNumber: string
  accountNumberConfirm: string
  accountType: 'checking' | 'savings'
  depositAmount: number
  percentage: number
}

interface DirectDepositData {
  paymentMethod: 'direct_deposit' | 'paper_check'
  depositType: 'full' | 'partial' | 'split'
  primaryAccount: BankAccount
  additionalAccounts: BankAccount[]
  voidedCheckUploaded: boolean
  bankLetterUploaded: boolean
  voidedCheckDocument?: DocumentMetadata
  bankLetterDocument?: DocumentMetadata
  totalPercentage: number
  authorizeDeposit: boolean
  employeeSignature: string
  dateOfAuth: string
}

interface DirectDepositFormEnhancedProps {
  initialData?: Partial<DirectDepositData>
  language: 'en' | 'es'
  onSave: (data: DirectDepositData) => void
  onNext?: () => void
  onBack?: () => void
  onValidationChange?: (isValid: boolean, errors?: Record<string, string>) => void
  useMainNavigation?: boolean
  employee?: any
  property?: any
  sessionToken?: string
  employeeSSN?: string
}

// Routing number validation using ABA checksum
const validateRoutingNumber = (routing: string): boolean => {
  if (!/^\d{9}$/.test(routing)) return false

  // ABA checksum algorithm
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(routing[i]) * weights[i]
  }
  return sum % 10 === 0
}

// Helper: Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data:image/...;base64, prefix
      const base64 = result.split(',')[1] || result
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

// No hardcoded bank list - ABA checksum validation works for all US banks

export default function DirectDepositFormEnhanced({
  initialData = {},
  language,
  onSave,
  onNext,
  onBack,
  onValidationChange,
  useMainNavigation = false,
  employee,
  property,
  sessionToken,
  employeeSSN
}: DirectDepositFormEnhancedProps) {
  const [formData, setFormData] = useState<DirectDepositData>({
    paymentMethod: 'direct_deposit',
    depositType: 'full',
    primaryAccount: {
      bankName: '',
      routingNumber: '',
      accountNumber: '',
      accountNumberConfirm: '',
      accountType: 'checking',
      depositAmount: 0,
      percentage: 100
    },
    additionalAccounts: [],
    voidedCheckUploaded: false,
    bankLetterUploaded: false,
    totalPercentage: 100,
    authorizeDeposit: false,
    employeeSignature: '',
    dateOfAuth: new Date().toISOString().split('T')[0],
    ...initialData
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [showErrors, setShowErrors] = useState(false)
  const [isValid, setIsValid] = useState(false)

  // OCR suggestion state
  const [ocrSuggestion, setOcrSuggestion] = useState<{
    bankName: string
    routingNumber: string
    accountNumber: string
  } | null>(null)
  const [isProcessingOcr, setIsProcessingOcr] = useState(false)

  // Upload states
  const [isUploadingVoidedCheck, setIsUploadingVoidedCheck] = useState(false)
  const [isUploadingBankLetter, setIsUploadingBankLetter] = useState(false)

  // Update form data when initialData changes (for navigation back)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log('DirectDepositFormEnhanced - Updating from initialData:', initialData)
      setFormData(prevData => ({
        ...prevData,
        ...initialData,
        // Ensure primaryAccount is properly merged
        primaryAccount: {
          ...prevData.primaryAccount,
          ...(initialData.primaryAccount || {})
        }
      }))
    }
  }, [initialData])

  // Auto-save hook configuration
  const { saveStatus, triggerSave } = useAutoSave(formData, {
    onSave: async (data) => {
      // Save to sessionStorage
      sessionStorage.setItem('direct_deposit_form_data', JSON.stringify(data))
      // Also call the parent's onSave if it needs to track changes
      if (onSave && Object.keys(touchedFields).length > 0) {
        onSave(data)
      }
    },
    delay: 2000,
    enabled: true
  })

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'direct_deposit': 'Payment Method Setup',
        'payment_method': 'How would you like to receive your pay?',
        'direct_deposit_option': 'Direct Deposit',
        'paper_check_option': 'Paper Check',
        'direct_deposit_desc': 'Fast, secure electronic deposit to your bank account',
        'paper_check_desc': 'Physical check available for pickup on payday',
        'deposit_types': 'Deposit Options',
        'full_deposit': 'Full Direct Deposit',
        'partial_deposit': 'Partial Direct Deposit',
        'split_deposit': 'Split Between Multiple Accounts',
        'full_desc': 'Entire paycheck deposited to one account',
        'partial_desc': 'Specific amount deposited, remainder by check',
        'split_desc': 'Divide paycheck between multiple accounts',
        'primary_account': 'Primary Bank Account',
        'additional_accounts': 'Additional Accounts',
        'bank_name': 'Bank Name',
        'routing_number': 'Routing Number',
        'account_number': 'Account Number',
        'confirm_account': 'Confirm Account Number',
        'account_type': 'Account Type',
        'select_account_type': 'Select account type',
        'checking': 'Checking',
        'savings': 'Savings',
        'deposit_amount': 'Deposit Amount',
        'percentage': 'Percentage',
        'add_account': 'Add Another Account',
        'remove_account': 'Remove Account',
        'verification_docs': 'Account Verification (Required)',
        'voided_check': 'Voided Check',
        'bank_letter': 'Bank Letter',
        'upload_voided_check': 'Upload Voided Check',
        'upload_bank_letter': 'Upload Bank Letter or Statement',
        'voided_check_desc': 'Write "VOID" across a blank check from your account',
        'bank_letter_desc': 'Official letter from bank with account details',
        'authorization': 'Authorization',
        'authorize_text': 'I authorize my employer to deposit my pay to the account(s) specified above',
        'paper_check_acknowledge': 'I understand paper checks must be picked up on payday at the hotel',
        'signature_required': 'Employee signature required',
        'date_of_auth': 'Date of Authorization',
        'important_info': 'Important Information',
        'routing_help': '9-digit number at bottom left of check',
        'account_help': 'Account number at bottom center of check',
        'changes_notice': 'Changes take 1-2 pay periods to take effect',
        'security_notice': 'Your banking information is encrypted and secure',
        'total_percentage': 'Total Percentage',
        'percentage_error': 'Total percentage must equal 100%',
        'required_field': 'This field is required',
        'invalid_routing': 'Invalid routing number',
        'invalid_account': 'Please enter a valid account number',
        'account_mismatch': 'Account numbers do not match',
        'next': 'Next',
        'back': 'Back',
        'save_continue': 'Save & Continue',
        'file_uploaded': 'File uploaded',
        'remove_file': 'Remove file',
        'bank_detected': 'Bank detected',
        'check_routing': 'Verifying routing number...',
        'routing_valid': 'Valid routing number',
        'max_3_accounts': 'Maximum 3 additional accounts allowed'
      },
      es: {
        'direct_deposit': 'Configuración de Método de Pago',
        'payment_method': '¿Cómo le gustaría recibir su pago?',
        'direct_deposit_option': 'Depósito Directo',
        'paper_check_option': 'Cheque en Papel',
        'direct_deposit_desc': 'Depósito electrónico rápido y seguro a su cuenta bancaria',
        'paper_check_desc': 'Cheque físico disponible para recoger el día de pago',
        'account_type': 'Tipo de Cuenta',
        'select_account_type': 'Seleccionar tipo de cuenta',
        'checking': 'Corriente',
        'savings': 'Ahorros',
        'next': 'Siguiente',
        'back': 'Atrás',
        'save_continue': 'Guardar y Continuar'
      }
    }
    return translations[language]?.[key] || key
  }

  // Handle voided check upload to Supabase (resilient like I9Section2Step)
  const handleVoidedCheckUpload = async (file: File) => {
    console.log('📤 handleVoidedCheckUpload called')
    console.log('  - file:', file.name)
    console.log('  - employee.id:', employee?.id)

    setIsUploadingVoidedCheck(true)

    // Track file locally FIRST (even if upload fails - can retry later)
    setFormData(prev => ({
      ...prev,
      voidedCheckFile: file,
      voidedCheckUploaded: true  // Mark as "uploaded" (tracked locally)
    }))

    // Try to upload to Supabase if employee.id exists
    if (employee?.id) {
      try {
        // Use dynamic import like I9 does
        const { uploadOnboardingDocument } = await import('@/services/onboardingDocuments')
        const uploadResult = await uploadOnboardingDocument({
          employeeId: employee.id,
          documentType: 'voided_check',
          documentCategory: 'financial_documents',
          file
        })
        console.log('✅ Voided check uploaded to Supabase:', uploadResult)
      } catch (error) {
        console.error('⚠️ Failed to upload to Supabase (file stored locally, will retry later):', error)
        // Don't alert - file is tracked locally, can retry in DirectDepositStep or final save
      }
    } else {
      console.warn('⚠️ employee.id not available - file stored locally, will upload when employee data loads')
    }

    setIsUploadingVoidedCheck(false)
  }

  // Handle bank letter upload to Supabase (resilient like I9Section2Step)
  const handleBankLetterUpload = async (file: File) => {
    console.log('📤 handleBankLetterUpload called')
    console.log('  - file:', file.name)
    console.log('  - employee.id:', employee?.id)

    setIsUploadingBankLetter(true)

    // Track file locally FIRST (even if upload fails - can retry later)
    setFormData(prev => ({
      ...prev,
      bankLetterFile: file,
      bankLetterUploaded: true  // Mark as "uploaded" (tracked locally)
    }))

    // Try to upload to Supabase if employee.id exists
    if (employee?.id) {
      try {
        // Use dynamic import like I9 does
        const { uploadOnboardingDocument } = await import('@/services/onboardingDocuments')
        const uploadResult = await uploadOnboardingDocument({
          employeeId: employee.id,
          documentType: 'bank_letter',
          documentCategory: 'financial_documents',
          file
        })
        console.log('✅ Bank letter uploaded to Supabase:', uploadResult)
      } catch (error) {
        console.error('⚠️ Failed to upload to Supabase (file stored locally, will retry later):', error)
        // Don't alert - file is tracked locally, can retry in DirectDepositStep or final save
      }
    } else {
      console.warn('⚠️ employee.id not available - file stored locally, will upload when employee data loads')
    }

    setIsUploadingBankLetter(false)
  }

  // OCR validation for voided check/bank letter (optional feature)
  const validateCheckWithOCR = async (file: File) => {
    // Skip OCR if employee.id is not available (graceful degradation)
    if (!employee?.id) {
      console.warn('⚠️ Skipping OCR - employee.id not available. OCR will run when employee data loads.')
      return
    }

    setIsProcessingOcr(true)
    try {
      const base64Data = await fileToBase64(file)
      const apiUrl = window.location.origin.includes('localhost')
        ? 'http://localhost:8000'
        : window.location.origin.replace(':3000', ':8000')

      const response = await fetch(
        `${apiUrl}/api/onboarding/${employee.id}/direct-deposit/validate-check`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_data: base64Data,
            file_name: file.name
          })
        }
      )

      if (!response.ok) {
        console.warn('OCR validation failed:', response.status)
        return
      }

      const result = await response.json()

      // Only show suggestion if confidence is good (>75%)
      if (result.confidence_scores?.overall > 0.75 && result.extracted_data) {
        const extracted = result.extracted_data
        setOcrSuggestion({
          bankName: extracted.bank_name || extracted.suggested_bank_name || '',
          routingNumber: extracted.routing_number || '',
          accountNumber: extracted.account_number || ''
        })
        console.log('✅ OCR suggestions available (confidence:', result.confidence_scores.overall, ')')
      } else {
        console.log('ℹ️ OCR completed but confidence too low or no data extracted')
      }
    } catch (error) {
      console.error('⚠️ OCR validation error (optional feature):', error)
      // Don't alert - OCR is optional, silent failure is acceptable
    } finally {
      setIsProcessingOcr(false)
    }
  }

  // Enhanced validation with bank routing verification
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    // Only validate banking info if direct deposit is selected
    if (formData.paymentMethod === 'direct_deposit') {
      // Validate primary account
      if (!formData.primaryAccount.bankName.trim()) {
        newErrors['primaryAccount.bankName'] = t('required_field')
      }
      if (!formData.primaryAccount.routingNumber.trim()) {
        newErrors['primaryAccount.routingNumber'] = t('required_field')
      } else if (!validateRoutingNumber(formData.primaryAccount.routingNumber)) {
        newErrors['primaryAccount.routingNumber'] = t('invalid_routing')
      }
      if (!formData.primaryAccount.accountNumber.trim()) {
        newErrors['primaryAccount.accountNumber'] = t('required_field')
      } else if (formData.primaryAccount.accountNumber.length < 4 || formData.primaryAccount.accountNumber.length > 17) {
        newErrors['primaryAccount.accountNumber'] = 'Account number must be between 4-17 digits'
      }
      if (!formData.primaryAccount.accountNumberConfirm.trim()) {
        newErrors['primaryAccount.accountNumberConfirm'] = t('required_field')
      } else if (formData.primaryAccount.accountNumber !== formData.primaryAccount.accountNumberConfirm) {
        newErrors['primaryAccount.accountNumberConfirm'] = t('account_mismatch')
      }

      // Check total percentage for split deposits
      if (formData.depositType === 'split') {
        const totalPercentage = formData.primaryAccount.percentage + 
          formData.additionalAccounts.reduce((sum, acc) => sum + acc.percentage, 0)
        
        if (Math.abs(totalPercentage - 100) > 0.01) {
          newErrors.totalPercentage = t('percentage_error')
        }
      }

      // Validate additional accounts for split deposits
      if (formData.depositType === 'split') {
        formData.additionalAccounts.forEach((account, index) => {
          if (!account.bankName.trim()) {
            newErrors[`additionalAccounts.${index}.bankName`] = t('required_field')
          }
          if (!account.routingNumber.trim()) {
            newErrors[`additionalAccounts.${index}.routingNumber`] = t('required_field')
          } else if (!validateRoutingNumber(account.routingNumber)) {
            newErrors[`additionalAccounts.${index}.routingNumber`] = t('invalid_routing')
          }
          if (!account.accountNumber.trim()) {
            newErrors[`additionalAccounts.${index}.accountNumber`] = t('required_field')
          }
          if (!account.accountNumberConfirm.trim()) {
            newErrors[`additionalAccounts.${index}.accountNumberConfirm`] = t('required_field')
          } else if (account.accountNumber !== account.accountNumberConfirm) {
            newErrors[`additionalAccounts.${index}.accountNumberConfirm`] = t('account_mismatch')
          }
        })
      }

      // Verification document required for direct deposit
      if (!formData.voidedCheckUploaded && !formData.bankLetterUploaded) {
        newErrors.verification = 'Please upload either a voided check or bank letter for verification'
      }
    }

    // Authorization always required
    if (!formData.authorizeDeposit) {
      newErrors.authorizeDeposit = 'Authorization is required to process payments'
    }

    setErrors(newErrors)
    const formIsValid = Object.keys(newErrors).length === 0
    setIsValid(formIsValid)
    
    // Notify parent component of validation status
    if (onValidationChange) {
      onValidationChange(formIsValid, newErrors)
    }
    
    return formIsValid
  }, [formData, t, onValidationChange])

  // Load saved data on mount
  useEffect(() => {
    const savedData = sessionStorage.getItem('direct_deposit_form_data')
    if (savedData && !initialData) {
      try {
        const parsed = JSON.parse(savedData)
        setFormData(parsed)
      } catch (e) {
        console.error('Failed to load saved direct deposit data:', e)
      }
    }
  }, [])

  // Auto-validate when form data changes
  useEffect(() => {
    validateForm()
  }, [formData, validateForm])


  const handleInputChange = (field: string, value: any) => {
    const keys = field.split('.')
    if (keys.length === 1) {
      setFormData(prev => ({ ...prev, [field]: value }))
    } else if (keys[0] === 'primaryAccount') {
      setFormData(prev => ({
        ...prev,
        primaryAccount: { ...prev.primaryAccount, [keys[1]]: value }
      }))
    }
    
    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [field]: true }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
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

  const handleAdditionalAccountChange = (index: number, field: string, value: any) => {
    const newAccounts = [...formData.additionalAccounts]
    newAccounts[index] = { ...newAccounts[index], [field]: value }
    setFormData(prev => ({ ...prev, additionalAccounts: newAccounts }))
    
    // Mark field as touched
    const fieldKey = `additionalAccounts.${index}.${field}`
    setTouchedFields(prev => ({ ...prev, [fieldKey]: true }))
    // Trigger save on next change (handled by useAutoSave hook)
    
    // Clear error when user starts typing
    if (errors[fieldKey]) {
      setErrors(prev => ({ ...prev, [fieldKey]: '' }))
    }
  }

  const addAdditionalAccount = () => {
    if (formData.additionalAccounts.length >= 3) {
      return // Max 3 additional accounts
    }
    
    const newAccount: BankAccount = {
      bankName: '',
      routingNumber: '',
      accountNumber: '',
      accountNumberConfirm: '',
      accountType: 'checking',
      depositAmount: 0,
      percentage: 0
    }
    setFormData(prev => ({
      ...prev,
      additionalAccounts: [...prev.additionalAccounts, newAccount]
    }))
  }

  const removeAdditionalAccount = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalAccounts: prev.additionalAccounts.filter((_, i) => i !== index)
    }))
  }


  const handleSubmit = () => {
    setShowErrors(true) // Show all errors when user tries to submit
    if (validateForm()) {
      onSave(formData)
      // Clear saved data after successful submission
      sessionStorage.removeItem('direct_deposit_form_data')
      if (!useMainNavigation && onNext) onNext()
    }
  }

  const formatRoutingNumber = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 9)
  }

  const formatAccountNumber = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 17)
  }


  return (
    <div className="space-y-4">
      {/* Save Status Indicator */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {saveStatus === 'saving' ? (
              <>
                <Clock className="h-4 w-4 text-blue-600 animate-spin" />
                <span className="text-sm text-blue-600 font-medium">
                  {language === 'es' ? 'Guardando...' : 'Saving...'}
                </span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">
                  {language === 'es' ? 'Guardado automáticamente' : 'Auto-saved'}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-600">
                  {language === 'es' ? 'Sin guardar' : 'Unsaved changes'}
                </span>
              </>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {language === 'es' ? 'Auto-guardado cada 30 segundos' : 'Auto-saves every 30 seconds'}
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span>{t('payment_method')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={formData.paymentMethod} 
            onValueChange={(value) => handleInputChange('paymentMethod', value)}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="direct_deposit" id="direct_deposit" className="mt-0.5" />
              <div>
                <Label htmlFor="direct_deposit" className="font-medium text-sm cursor-pointer">
                  {t('direct_deposit_option')}
                </Label>
                <p className="text-xs text-gray-600 mt-0.5">{t('direct_deposit_desc')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="paper_check" id="paper_check" className="mt-0.5" />
              <div>
                <Label htmlFor="paper_check" className="font-medium text-sm cursor-pointer">
                  {t('paper_check_option')}
                </Label>
                <p className="text-xs text-gray-600 mt-0.5">{t('paper_check_desc')}</p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* OCR Suggestion - Simple and friendly */}
      {ocrSuggestion && formData.paymentMethod === 'direct_deposit' && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="text-3xl">💡</div>
            <div className="flex-1">
              <p className="font-semibold text-blue-900 mb-2 text-base">
                We detected your banking information!
              </p>
              <div className="text-sm text-blue-800 space-y-1 mb-3 bg-white/50 rounded p-3">
                <p><span className="font-medium">Bank:</span> {ocrSuggestion.bankName}</p>
                <p><span className="font-medium">Routing:</span> {ocrSuggestion.routingNumber}</p>
                <p><span className="font-medium">Account:</span> {ocrSuggestion.accountNumber}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    // Auto-fill the form
                    setFormData(prev => ({
                      ...prev,
                      primaryAccount: {
                        ...prev.primaryAccount,
                        bankName: ocrSuggestion.bankName,
                        routingNumber: ocrSuggestion.routingNumber,
                        accountNumber: ocrSuggestion.accountNumber,
                        accountNumberConfirm: ocrSuggestion.accountNumber
                      }
                    }))
                    setOcrSuggestion(null) // Hide suggestion
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Use This Info
                </Button>
                <Button
                  type="button"
                  onClick={() => setOcrSuggestion(null)}
                  variant="outline"
                  size="sm"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Deposit Options - Only show if direct deposit selected */}
      {formData.paymentMethod === 'direct_deposit' && (
        <>
          {/* Deposit Type Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('deposit_types')}</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={formData.depositType} 
                onValueChange={(value) => handleInputChange('depositType', value)}
                className="grid grid-cols-1 md:grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2 p-2 border rounded">
                  <RadioGroupItem value="full" id="full" />
                  <div>
                    <Label htmlFor="full" className="font-medium text-sm">{t('full_deposit')}</Label>
                    <p className="text-xs text-gray-600">{t('full_desc')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-2 border rounded">
                  <RadioGroupItem value="partial" id="partial" />
                  <div>
                    <Label htmlFor="partial" className="font-medium text-sm">{t('partial_deposit')}</Label>
                    <p className="text-xs text-gray-600">{t('partial_desc')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-2 border rounded">
                  <RadioGroupItem value="split" id="split" />
                  <div>
                    <Label htmlFor="split" className="font-medium text-sm">{t('split_deposit')}</Label>
                    <p className="text-xs text-gray-600">{t('split_desc')}</p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Primary Account */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Building className="h-4 w-4" />
                <span>{t('primary_account')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bank name and account type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label htmlFor="bankName" className="text-sm">{t('bank_name')} *</Label>
                  <Input
                    id="bankName"
                    value={formData.primaryAccount.bankName}
                    onChange={(e) => handleInputChange('primaryAccount.bankName', e.target.value)}
                    onBlur={() => handleFieldBlur('primaryAccount.bankName')}
                    className={shouldShowError('primaryAccount.bankName') && errors['primaryAccount.bankName'] ? 'border-red-500' : ''}
                    placeholder=""
                  />
                  {shouldShowError('primaryAccount.bankName') && errors['primaryAccount.bankName'] && (
                    <p className="text-red-600 text-xs mt-1">{errors['primaryAccount.bankName']}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="accountType" className="text-sm">{t('account_type')} *</Label>
                  <Select 
                    value={formData.primaryAccount.accountType} 
                    onValueChange={(value) => handleInputChange('primaryAccount.accountType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_account_type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">{t('checking')}</SelectItem>
                      <SelectItem value="savings">{t('savings')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Routing number */}
              <div>
                <Label htmlFor="routingNumber" className="text-sm">{t('routing_number')} *</Label>
                <div className="relative">
                  <Input
                    id="routingNumber"
                    value={formData.primaryAccount.routingNumber}
                    onChange={(e) => handleInputChange('primaryAccount.routingNumber', formatRoutingNumber(e.target.value))}
                    onBlur={() => handleFieldBlur('primaryAccount.routingNumber')}
                    className={shouldShowError('primaryAccount.routingNumber') && errors['primaryAccount.routingNumber'] ? 'border-red-500' : ''}
                    placeholder="9-digit routing number"
                    maxLength={9}
                  />
                  {formData.primaryAccount.routingNumber.length === 9 && !errors['primaryAccount.routingNumber'] && (
                    <Check className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                  )}
                </div>
                {shouldShowError('primaryAccount.routingNumber') && errors['primaryAccount.routingNumber'] && (
                  <p className="text-red-600 text-xs mt-1">{errors['primaryAccount.routingNumber']}</p>
                )}
              </div>
              
              {/* Account number and confirmation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="accountNumber" className="text-sm">{t('account_number')} *</Label>
                  <Input
                    id="accountNumber"
                    type="password"
                    value={formData.primaryAccount.accountNumber}
                    onChange={(e) => handleInputChange('primaryAccount.accountNumber', formatAccountNumber(e.target.value))}
                    onBlur={() => handleFieldBlur('primaryAccount.accountNumber')}
                    className={shouldShowError('primaryAccount.accountNumber') && errors['primaryAccount.accountNumber'] ? 'border-red-500' : ''}
                    placeholder=""
                    maxLength={17}
                  />
                  {shouldShowError('primaryAccount.accountNumber') && errors['primaryAccount.accountNumber'] && (
                    <p className="text-red-600 text-xs mt-1">{errors['primaryAccount.accountNumber']}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="accountNumberConfirm" className="text-sm">{t('confirm_account')} *</Label>
                  <Input
                    id="accountNumberConfirm"
                    value={formData.primaryAccount.accountNumberConfirm}
                    onChange={(e) => handleInputChange('primaryAccount.accountNumberConfirm', formatAccountNumber(e.target.value))}
                    onBlur={() => handleFieldBlur('primaryAccount.accountNumberConfirm')}
                    className={shouldShowError('primaryAccount.accountNumberConfirm') && errors['primaryAccount.accountNumberConfirm'] ? 'border-red-500' : ''}
                    placeholder=""
                    maxLength={17}
                  />
                  {shouldShowError('primaryAccount.accountNumberConfirm') && errors['primaryAccount.accountNumberConfirm'] && (
                    <p className="text-red-600 text-xs mt-1">{errors['primaryAccount.accountNumberConfirm']}</p>
                  )}
                </div>
              </div>
              
              {/* Additional fields for partial/split */}
              {(formData.depositType === 'partial' || formData.depositType === 'split') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                  {formData.depositType === 'partial' && (
                    <div>
                      <Label htmlFor="depositAmount" className="text-sm">{t('deposit_amount')} *</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.primaryAccount.depositAmount || ''}
                        onChange={(e) => handleInputChange('primaryAccount.depositAmount', parseFloat(e.target.value) || 0)}
                        placeholder="Amount per paycheck"
                      />
                    </div>
                  )}
                  {formData.depositType === 'split' && (
                    <div>
                      <Label htmlFor="percentage" className="text-sm">{t('percentage')} *</Label>
                      <Input
                        id="percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={formData.primaryAccount.percentage || ''}
                        onChange={(e) => handleInputChange('primaryAccount.percentage', parseFloat(e.target.value) || 0)}
                        placeholder="%"
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Helper text */}
              <Alert className="py-2">
                <Info className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  <strong>Finding your numbers:</strong> Look at the bottom of your check. The routing number is the 
                  9-digit number on the left, and the account number is in the middle (usually 10-12 digits).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Additional Accounts for Split Deposit */}
          {formData.depositType === 'split' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('additional_accounts')}</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addAdditionalAccount}
                    disabled={formData.additionalAccounts.length >= 3}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('add_account')}
                  </Button>
                </div>
                {formData.additionalAccounts.length >= 3 && (
                  <p className="text-xs text-orange-600 mt-1">{t('max_3_accounts')}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.additionalAccounts.map((account, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Account {index + 2}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAdditionalAccount(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('remove_account')}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">{t('bank_name')} *</Label>
                        <Input
                          value={account.bankName}
                          onChange={(e) => handleAdditionalAccountChange(index, 'bankName', e.target.value)}
                          onBlur={() => handleFieldBlur(`additionalAccounts.${index}.bankName`)}
                          className={shouldShowError(`additionalAccounts.${index}.bankName`) && errors[`additionalAccounts.${index}.bankName`] ? 'border-red-500' : ''}
                          placeholder=""
                        />
                        {shouldShowError(`additionalAccounts.${index}.bankName`) && errors[`additionalAccounts.${index}.bankName`] && (
                          <p className="text-red-600 text-xs mt-1">{errors[`additionalAccounts.${index}.bankName`]}</p>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm">{t('account_type')} *</Label>
                        <Select 
                          value={account.accountType} 
                          onValueChange={(value) => handleAdditionalAccountChange(index, 'accountType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_account_type')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking">{t('checking')}</SelectItem>
                            <SelectItem value="savings">{t('savings')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm">{t('routing_number')} *</Label>
                        <Input
                          value={account.routingNumber}
                          onChange={(e) => handleAdditionalAccountChange(index, 'routingNumber', formatRoutingNumber(e.target.value))}
                          onBlur={() => handleFieldBlur(`additionalAccounts.${index}.routingNumber`)}
                          className={shouldShowError(`additionalAccounts.${index}.routingNumber`) && errors[`additionalAccounts.${index}.routingNumber`] ? 'border-red-500' : ''}
                          placeholder=""
                          maxLength={9}
                        />
                        {shouldShowError(`additionalAccounts.${index}.routingNumber`) && errors[`additionalAccounts.${index}.routingNumber`] && (
                          <p className="text-red-600 text-xs mt-1">{errors[`additionalAccounts.${index}.routingNumber`]}</p>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm">{t('account_number')} *</Label>
                        <Input
                          type="password"
                          value={account.accountNumber}
                          onChange={(e) => handleAdditionalAccountChange(index, 'accountNumber', formatAccountNumber(e.target.value))}
                          onBlur={() => handleFieldBlur(`additionalAccounts.${index}.accountNumber`)}
                          className={shouldShowError(`additionalAccounts.${index}.accountNumber`) && errors[`additionalAccounts.${index}.accountNumber`] ? 'border-red-500' : ''}
                          placeholder=""
                        />
                        {shouldShowError(`additionalAccounts.${index}.accountNumber`) && errors[`additionalAccounts.${index}.accountNumber`] && (
                          <p className="text-red-600 text-xs mt-1">{errors[`additionalAccounts.${index}.accountNumber`]}</p>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm">{t('confirm_account')} *</Label>
                        <Input
                          value={account.accountNumberConfirm}
                          onChange={(e) => handleAdditionalAccountChange(index, 'accountNumberConfirm', formatAccountNumber(e.target.value))}
                          onBlur={() => handleFieldBlur(`additionalAccounts.${index}.accountNumberConfirm`)}
                          className={shouldShowError(`additionalAccounts.${index}.accountNumberConfirm`) && errors[`additionalAccounts.${index}.accountNumberConfirm`] ? 'border-red-500' : ''}
                          placeholder=""
                        />
                        {shouldShowError(`additionalAccounts.${index}.accountNumberConfirm`) && errors[`additionalAccounts.${index}.accountNumberConfirm`] && (
                          <p className="text-red-600 text-xs mt-1">{errors[`additionalAccounts.${index}.accountNumberConfirm`]}</p>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm">{t('percentage')} *</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={account.percentage || ''}
                          onChange={(e) => handleAdditionalAccountChange(index, 'percentage', parseFloat(e.target.value) || 0)}
                          placeholder="%"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total Percentage Display */}
                {formData.depositType === 'split' && formData.additionalAccounts.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t('total_percentage')}:</span>
                      <Badge variant={Math.abs((formData.primaryAccount.percentage + formData.additionalAccounts.reduce((sum, acc) => sum + acc.percentage, 0)) - 100) > 0.01 ? 'destructive' : 'default'}>
                        {(formData.primaryAccount.percentage + formData.additionalAccounts.reduce((sum, acc) => sum + acc.percentage, 0)).toFixed(1)}%
                      </Badge>
                    </div>
                    {shouldShowError('totalPercentage') && errors.totalPercentage && (
                      <p className="text-red-600 text-xs mt-1">{errors.totalPercentage}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Account Verification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Upload className="h-4 w-4" />
                <span>{t('verification_docs')}</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Please upload one of the following documents to verify your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Voided Check Upload with OCR */}
                <div>
                  <Label className="block mb-2">{t('voided_check')}</Label>
                  <p className="text-sm text-gray-600 mb-3">{t('voided_check_desc')}</p>

                  <input
                    type="file"
                    id="voided-check-upload"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        // Upload to storage
                        await handleVoidedCheckUpload(file)
                        // Also trigger OCR for auto-fill
                        await validateCheckWithOCR(file)
                      }
                    }}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mb-2"
                    onClick={() => document.getElementById('voided-check-upload')?.click()}
                    disabled={isUploadingVoidedCheck}
                  >
                    {isUploadingVoidedCheck ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : formData.voidedCheckUploaded ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-green-600" />
                        Upload Voided Check
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Voided Check
                      </>
                    )}
                  </Button>
                </div>

                {/* Bank Letter Upload */}
                <div>
                  <Label className="block mb-2">{t('bank_letter')}</Label>
                  <p className="text-sm text-gray-600 mb-3">{t('bank_letter_desc')}</p>

                  <input
                    type="file"
                    id="bank-letter-upload"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        // Upload to storage
                        await handleBankLetterUpload(file)
                        // Also trigger OCR for auto-fill
                        await validateCheckWithOCR(file)
                      }
                    }}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mb-2"
                    onClick={() => document.getElementById('bank-letter-upload')?.click()}
                    disabled={isUploadingBankLetter}
                  >
                    {isUploadingBankLetter ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : formData.bankLetterUploaded ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-green-600" />
                        Upload Bank Letter
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Bank Letter
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {shouldShowError('verification') && errors.verification && (
                <Alert className="mt-3 py-2">
                  <AlertTriangle className="h-3 w-3" />
                  <AlertDescription className="text-red-600 text-xs">
                    {errors.verification}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Authorization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('authorization')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="authorizeDeposit"
              checked={formData.authorizeDeposit}
              onCheckedChange={(checked) => handleInputChange('authorizeDeposit', !!checked)}
              className="mt-1"
            />
            <Label htmlFor="authorizeDeposit" className="text-sm leading-relaxed cursor-pointer">
              {formData.paymentMethod === 'direct_deposit' 
                ? `${t('authorize_text')}. I understand this authorization remains in effect until I provide written notice to revoke it.`
                : t('paper_check_acknowledge')
              }
            </Label>
          </div>
          {shouldShowError('authorizeDeposit') && errors.authorizeDeposit && (
            <p className="text-red-600 text-xs">{errors.authorizeDeposit}</p>
          )}

          <div>
            <Label htmlFor="dateOfAuth" className="text-sm">{t('date_of_auth')} *</Label>
            <Input
              id="dateOfAuth"
              type="date"
              value={formData.dateOfAuth}
              onChange={(e) => handleInputChange('dateOfAuth', e.target.value)}
              className="max-w-xs"
              readOnly
            />
          </div>
        </CardContent>
      </Card>

      {/* Important Information */}
      <Alert className="py-2">
        <Info className="h-3 w-3" />
        <AlertDescription className="text-xs">
          <p className="font-medium mb-1">{t('important_info')}:</p>
          <ul className="space-y-1">
            <li>• {t('changes_notice')}</li>
            <li>• {t('security_notice')}</li>
            {formData.paymentMethod === 'paper_check' && (
              <li>• Paper checks must be picked up from HR on payday</li>
            )}
          </ul>
        </AlertDescription>
      </Alert>

      {/* Navigation */}
      {!useMainNavigation && (
        <div className="flex justify-between items-center pt-4">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              {t('back')}
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={!isValid}>
            {t('save_continue')}
          </Button>
        </div>
      )}
      
      {/* Hidden save button for main navigation */}
      {useMainNavigation && (
        <Button onClick={handleSubmit} className="hidden" disabled={!isValid}>
          Save Direct Deposit
        </Button>
      )}
    </div>
  )
}