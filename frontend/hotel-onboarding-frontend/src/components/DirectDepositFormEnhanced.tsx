import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  MobileInput,
  MobileLabel,
  MobileRadioGroup,
  MobileSelect,
  MobileSelectItem,
  MobileCheckbox
} from '@/components/job-application/mobile-optimized'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Building, Plus, Trash2, AlertTriangle, Info, Upload, Save, Check, CheckCircle2, Loader2 } from 'lucide-react'
import { useAutoSave } from '@/hooks/useAutoSave'
import { uploadOnboardingDocument } from '@/services/onboardingDocuments'
import { getApiUrl } from '@/config/api'

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
  voidedCheckDocument?: any
  bankLetterDocument?: any
  totalPercentage: number
  authorizeDeposit: boolean
  employeeSignature: string
  dateOfAuth: string
}

interface DirectDepositFormEnhancedProps {
  initialData?: Partial<DirectDepositData>
  language: 'en' | 'es'
  onSave: (data: DirectDepositData) => void
  onValidationChange?: (isValid: boolean, errors?: Record<string, string>) => void
  employee?: any
  property?: any
  onDocumentMetadata?: (payload: { type: 'voided_check' | 'bank_letter'; metadata: any }) => void
}

const validateRoutingNumber = (routing: string): boolean => {
  if (!/^\d{9}$/.test(routing)) return false
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(routing[i]) * weights[i]
  }
  return sum % 10 === 0
}

const additionalAccountTemplate: BankAccount = {
  bankName: '',
  routingNumber: '',
  accountNumber: '',
  accountNumberConfirm: '',
  accountType: 'checking',
  depositAmount: 0,
  percentage: 0
}

export default function DirectDepositFormEnhanced({
  initialData = {},
  language,
  onSave,
  onValidationChange,
  employee,
  property,
  onDocumentMetadata
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
  const [showErrors, setShowErrors] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [routingValidation, setRoutingValidation] = useState<Record<string, { validating: boolean; bankInfo?: any; error?: string }>>({})
  const [routingValidationTimer, setRoutingValidationTimer] = useState<NodeJS.Timeout | null>(null)

  const { triggerSave } = useAutoSave(formData, {
    onSave: async (data) => {
      sessionStorage.setItem('direct_deposit_form_data', JSON.stringify(data))
      onSave(data)
    },
    delay: 2000,
    enabled: true
  })

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        primaryAccount: {
          ...prev.primaryAccount,
          ...(initialData.primaryAccount || {})
        },
        additionalAccounts: initialData.additionalAccounts || prev.additionalAccounts
      }))
    }
  }, [initialData])

  useEffect(() => {
    const saved = sessionStorage.getItem('direct_deposit_form_data')
    if (saved && !initialData) {
      try {
        setFormData(JSON.parse(saved))
      } catch (err) {
        console.error('Failed to restore direct deposit data:', err)
      }
    }
  }, [initialData])

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (formData.paymentMethod === 'direct_deposit') {
      const primary = formData.primaryAccount
      if (!primary.bankName.trim()) newErrors['primaryAccount.bankName'] = 'Bank name is required'
      if (!primary.routingNumber.trim()) {
        newErrors['primaryAccount.routingNumber'] = 'Routing number is required'
      } else if (!validateRoutingNumber(primary.routingNumber)) {
        newErrors['primaryAccount.routingNumber'] = 'Invalid routing number'
      }
      if (!primary.accountNumber.trim()) newErrors['primaryAccount.accountNumber'] = 'Account number is required'
      if (!primary.accountNumberConfirm.trim()) {
        newErrors['primaryAccount.accountNumberConfirm'] = 'Please confirm account number'
      } else if (primary.accountNumber !== primary.accountNumberConfirm) {
        newErrors['primaryAccount.accountNumberConfirm'] = 'Account numbers do not match'
      }

      if (formData.depositType === 'split') {
        const totalPercentage = primary.percentage + formData.additionalAccounts.reduce((sum, acc) => sum + (acc.percentage || 0), 0)
        if (Math.abs(totalPercentage - 100) > 0.5) {
          newErrors.totalPercentage = 'Total percentage must equal 100%'
        }

        formData.additionalAccounts.forEach((acc, index) => {
          if (!acc.bankName.trim()) newErrors[`additionalAccounts.${index}.bankName`] = 'Bank name is required'
          if (!acc.routingNumber.trim()) {
            newErrors[`additionalAccounts.${index}.routingNumber`] = 'Routing number is required'
          } else if (!validateRoutingNumber(acc.routingNumber)) {
            newErrors[`additionalAccounts.${index}.routingNumber`] = 'Invalid routing number'
          }
          if (!acc.accountNumber.trim()) newErrors[`additionalAccounts.${index}.accountNumber`] = 'Account number is required'
          if (!acc.accountNumberConfirm.trim()) {
            newErrors[`additionalAccounts.${index}.accountNumberConfirm`] = 'Please confirm account number'
          } else if (acc.accountNumber !== acc.accountNumberConfirm) {
            newErrors[`additionalAccounts.${index}.accountNumberConfirm`] = 'Account numbers do not match'
          }
        })
      }

      if (!formData.voidedCheckUploaded && !formData.bankLetterUploaded) {
        newErrors.verification = 'Please upload either a voided check or bank letter'
      }

      if (!formData.authorizeDeposit) {
        newErrors.authorizeDeposit = 'Authorization is required'
      }
    } else if (formData.paymentMethod === 'paper_check') {
      // Paper check only requires authorization
      if (!formData.authorizeDeposit) {
        newErrors.authorizeDeposit = 'Authorization is required'
      }
    }

    setErrors(newErrors)
    const valid = Object.keys(newErrors).length === 0
    setIsValid(valid)
    onValidationChange?.(valid, newErrors)
    return valid
  }, [formData, onValidationChange])

  useEffect(() => {
    validateForm()
  }, [formData, validateForm])

  const updateFormData = (updater: (current: DirectDepositData) => DirectDepositData) => {
    setFormData(prev => {
      const next = updater(prev)
      triggerSave()
      return next
    })
  }

  const validateRoutingNumberAPI = async (routingNumber: string, accountKey: string) => {
    if (!routingNumber || routingNumber.length !== 9) {
      setRoutingValidation(prev => ({ ...prev, [accountKey]: { validating: false } }))
      return
    }

    setRoutingValidation(prev => ({ ...prev, [accountKey]: { validating: true } }))

    try {
      const response = await fetch(`${getApiUrl()}/onboarding/validate-routing-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routing_number: routingNumber })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setRoutingValidation(prev => ({
          ...prev,
          [accountKey]: {
            validating: false,
            bankInfo: result.data?.bank,
            error: undefined
          }
        }))
      } else {
        setRoutingValidation(prev => ({
          ...prev,
          [accountKey]: {
            validating: false,
            error: result.message || 'Invalid routing number'
          }
        }))
      }
    } catch (error) {
      console.error('Routing validation error:', error)
      setRoutingValidation(prev => ({
        ...prev,
        [accountKey]: {
          validating: false,
          error: 'Unable to validate routing number'
        }
      }))
    }
  }

  const handleInputChange = (field: string, value: any) => {
    const keys = field.split('.')

    // Handle routing number validation with debounce
    if (keys[keys.length - 1] === 'routingNumber' && typeof value === 'string') {
      const accountKey = keys.length === 2 ? 'primary' : `additional_${keys[1]}`

      // Clear existing timer
      if (routingValidationTimer) {
        clearTimeout(routingValidationTimer)
      }

      // Set new timer for validation (500ms debounce)
      const timer = setTimeout(() => {
        validateRoutingNumberAPI(value, accountKey)
      }, 500)

      setRoutingValidationTimer(timer)
    }

    updateFormData(prev => {
      if (keys.length === 1) {
        return { ...prev, [field]: value }
      }
      if (keys[0] === 'primaryAccount') {
        return {
          ...prev,
          primaryAccount: { ...prev.primaryAccount, [keys[1]]: value }
        }
      }
      if (keys[0] === 'additionalAccounts') {
        const index = Number(keys[1])
        const fieldKey = keys[2]
        const updatedAccounts = prev.additionalAccounts.map((acc, idx) =>
          idx === index ? { ...acc, [fieldKey]: value } : acc
        )
        return { ...prev, additionalAccounts: updatedAccounts }
      }
      return prev
    })
  }

  const addAdditionalAccount = () => {
    updateFormData(prev => ({
      ...prev,
      additionalAccounts: [...prev.additionalAccounts, { ...additionalAccountTemplate }]
    }))
  }

  const removeAdditionalAccount = (index: number) => {
    updateFormData(prev => ({
      ...prev,
      additionalAccounts: prev.additionalAccounts.filter((_, idx) => idx !== index)
    }))
  }

  // ✅ OPTIMIZATION: Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleUpload = async (type: 'voided_check' | 'bank_letter', file: File) => {
    try {
      // ✅ OPTIMIZATION: Convert to base64 and store in memory (NO upload to storage)
      // This eliminates redundant storage operations:
      // - Before: Upload file → Download file → Merge → Upload merged PDF (3 operations)
      // - After: Keep in memory → Merge → Upload merged PDF (1 operation)
      const base64 = await fileToBase64(file)

      const fileData = {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        base64Data: base64,
        uploadedAt: new Date().toISOString()
      }

      console.log(`✅ ${type} loaded into memory (${(file.size / 1024).toFixed(2)} KB) - NO storage upload`)

      updateFormData(prev => ({
        ...prev,
        voidedCheckUploaded: type === 'voided_check' ? true : prev.voidedCheckUploaded,
        bankLetterUploaded: type === 'bank_letter' ? true : prev.bankLetterUploaded,
        voidedCheckFile: type === 'voided_check' ? fileData : prev.voidedCheckFile,
        bankLetterFile: type === 'bank_letter' ? fileData : prev.bankLetterFile,
        // Keep old metadata fields for backward compatibility
        voidedCheckDocument: type === 'voided_check' ? fileData : prev.voidedCheckDocument,
        bankLetterDocument: type === 'bank_letter' ? fileData : prev.bankLetterDocument
      }))

      onDocumentMetadata?.({ type, metadata: fileData })
    } catch (err) {
      console.error('❌ Failed to load document:', err)
      // Show error to user
      alert(`Failed to load ${type === 'voided_check' ? 'voided check' : 'bank letter'}. Please try again.`)
    }
  }

  const handleSubmit = () => {
    setShowErrors(true)
    if (validateForm()) {
      onSave(formData)
      sessionStorage.removeItem('direct_deposit_form_data')
    }
  }

  const totalSplitPercentage = formData.primaryAccount.percentage + formData.additionalAccounts.reduce((sum, acc) => sum + (acc.percentage || 0), 0)

  return (
    <div className="space-y-[clamp(0.75rem,2vw,1rem)]">
      {/* Payment Method Section */}
      <div className="space-y-[clamp(0.5rem,1.5vw,0.75rem)]">
        <div className="space-y-[clamp(0.25rem,1vw,0.5rem)]">
          <h3 className="text-[clamp(1.125rem,3vw,1.25rem)] font-semibold">Payment Method</h3>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
            Choose how you would like to receive your pay.
          </p>
        </div>

        <MobileRadioGroup
          value={formData.paymentMethod}
          onValueChange={(value) => handleInputChange('paymentMethod', value)}
          options={[
            {
              value: 'direct_deposit',
              label: 'Direct Deposit',
              description: 'Fast, secure electronic deposit to your bank account.'
            },
            {
              value: 'paper_check',
              label: 'Paper Check',
              description: 'Pick up physical checks on payday.'
            }
          ]}
        />

        {formData.paymentMethod === 'direct_deposit' && (
          <div className="space-y-[clamp(0.5rem,1.5vw,0.75rem)] pt-[clamp(0.5rem,1.5vw,0.75rem)]">
            <MobileLabel>Deposit Type</MobileLabel>
            <MobileRadioGroup
              value={formData.depositType}
              onValueChange={(value) => handleInputChange('depositType', value)}
              options={[
                {
                  value: 'full',
                  label: 'Full Deposit',
                  description: 'Deposit entire paycheck to one account'
                },
                {
                  value: 'partial',
                  label: 'Partial Deposit',
                  description: 'Deposit a fixed amount, receive rest as check'
                },
                {
                  value: 'split',
                  label: 'Split Accounts',
                  description: 'Split paycheck across multiple accounts'
                }
              ]}
            />
          </div>
        )}
      </div>

      {formData.paymentMethod === 'direct_deposit' && (
        <div className="space-y-[clamp(0.75rem,2vw,1rem)] p-[clamp(0.75rem,2vw,1rem)] border rounded-lg bg-white">
          <div className="flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)]">
            <Building className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-gray-600" />
            <h3 className="text-[clamp(1.125rem,3vw,1.25rem)] font-semibold">Primary Account</h3>
          </div>

          <div className="space-y-[clamp(0.75rem,2vw,1rem)]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[clamp(0.5rem,1.5vw,0.75rem)]">
              <div className="sm:col-span-2">
                <MobileLabel htmlFor="bankName" required>Bank Name</MobileLabel>
                <MobileInput
                  id="bankName"
                  value={formData.primaryAccount.bankName}
                  onChange={(e) => handleInputChange('primaryAccount.bankName', e.target.value)}
                  error={showErrors && !!errors['primaryAccount.bankName']}
                  placeholder="Enter bank name"
                />
                {showErrors && errors['primaryAccount.bankName'] && (
                  <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-600 mt-1">{errors['primaryAccount.bankName']}</p>
                )}
              </div>
              <div>
                <MobileLabel htmlFor="accountType" required>Account Type</MobileLabel>
                <MobileSelect
                  value={formData.primaryAccount.accountType}
                  onValueChange={(value) => handleInputChange('primaryAccount.accountType', value)}
                >
                  <MobileSelectItem value="checking">Checking</MobileSelectItem>
                  <MobileSelectItem value="savings">Savings</MobileSelectItem>
                </MobileSelect>
              </div>
            </div>

            <div>
              <MobileLabel htmlFor="routingNumber" required>Routing Number (9 digits)</MobileLabel>
              <div className="relative">
                <MobileInput
                  id="routingNumber"
                  value={formData.primaryAccount.routingNumber}
                  onChange={(e) => handleInputChange('primaryAccount.routingNumber', e.target.value.replace(/\D/g, '').slice(0, 9))}
                  error={showErrors && !!errors['primaryAccount.routingNumber']}
                  placeholder="123456789"
                  mobileKeyboard="numeric"
                  maxLength={9}
                />
                {routingValidation.primary?.validating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] animate-spin text-gray-400" />
                  </div>
                )}
                {!routingValidation.primary?.validating && routingValidation.primary?.bankInfo && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle2 className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-green-500" />
                  </div>
                )}
              </div>
              {routingValidation.primary?.bankInfo && (
                <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-[clamp(0.75rem,2vw,0.875rem)] w-[clamp(0.75rem,2vw,0.875rem)]" />
                  {routingValidation.primary.bankInfo.bank_name || routingValidation.primary.bankInfo.short_name}
                </p>
              )}
              {routingValidation.primary?.error && (
                <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-[clamp(0.75rem,2vw,0.875rem)] w-[clamp(0.75rem,2vw,0.875rem)]" />
                  {routingValidation.primary.error}
                </p>
              )}
              {showErrors && errors['primaryAccount.routingNumber'] && (
                <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-600 mt-1">{errors['primaryAccount.routingNumber']}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(0.5rem,1.5vw,0.75rem)]">
              <div>
                <MobileLabel htmlFor="accountNumber" required>Account Number</MobileLabel>
                <MobileInput
                  id="accountNumber"
                  value={formData.primaryAccount.accountNumber}
                  onChange={(e) => handleInputChange('primaryAccount.accountNumber', e.target.value.replace(/\D/g, '').slice(0, 17))}
                  error={showErrors && !!errors['primaryAccount.accountNumber']}
                  placeholder="Enter account number"
                  mobileKeyboard="numeric"
                  maxLength={17}
                />
                {showErrors && errors['primaryAccount.accountNumber'] && (
                  <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-600 mt-1">{errors['primaryAccount.accountNumber']}</p>
                )}
              </div>
              <div>
                <MobileLabel htmlFor="accountNumberConfirm" required>Confirm Account Number</MobileLabel>
                <MobileInput
                  id="accountNumberConfirm"
                  value={formData.primaryAccount.accountNumberConfirm}
                  onChange={(e) => handleInputChange('primaryAccount.accountNumberConfirm', e.target.value.replace(/\D/g, '').slice(0, 17))}
                  error={showErrors && !!errors['primaryAccount.accountNumberConfirm']}
                  placeholder="Re-enter account number"
                  mobileKeyboard="numeric"
                  maxLength={17}
                />
                {showErrors && errors['primaryAccount.accountNumberConfirm'] && (
                  <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-600 mt-1">{errors['primaryAccount.accountNumberConfirm']}</p>
                )}
              </div>
            </div>

            {formData.depositType === 'partial' && (
              <div>
                <MobileLabel htmlFor="depositAmount" required>Direct Deposit Amount</MobileLabel>
                <MobileInput
                  id="depositAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.primaryAccount.depositAmount || ''}
                  onChange={(e) => handleInputChange('primaryAccount.depositAmount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  mobileKeyboard="decimal"
                />
              </div>
            )}

            {formData.depositType === 'split' && (
              <div>
                <MobileLabel htmlFor="percentage" required>Percentage</MobileLabel>
                <MobileInput
                  id="percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.primaryAccount.percentage || ''}
                  onChange={(e) => handleInputChange('primaryAccount.percentage', parseFloat(e.target.value) || 0)}
                  placeholder="0-100"
                  mobileKeyboard="numeric"
                />
              </div>
            )}

            <Alert className="py-[clamp(0.5rem,1.5vw,0.75rem)]">
              <CreditCard className="h-[clamp(0.75rem,2vw,0.875rem)] w-[clamp(0.75rem,2vw,0.875rem)]" />
              <AlertDescription className="text-[clamp(0.75rem,2vw,0.875rem)]">
                Find these numbers at the bottom of your checks.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {formData.paymentMethod === 'direct_deposit' && formData.depositType === 'split' && (
        <div className="space-y-[clamp(0.75rem,2vw,1rem)] p-[clamp(0.75rem,2vw,1rem)] border rounded-lg bg-white">
          <div className="flex items-center justify-between gap-[clamp(0.5rem,1.5vw,0.75rem)]">
            <h3 className="text-[clamp(1.125rem,3vw,1.25rem)] font-semibold">Additional Accounts</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={addAdditionalAccount}
              disabled={formData.additionalAccounts.length >= 3}
              className="h-[clamp(2rem,4vw,2.25rem)] px-[clamp(0.75rem,2vw,1rem)] text-[clamp(0.875rem,2.5vw,1rem)]"
            >
              <Plus className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] mr-1" />
              Add Account
            </Button>
          </div>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
            Distribute your paycheck between multiple accounts.
          </p>

          <div className="space-y-[clamp(0.75rem,2vw,1rem)]">
            {formData.additionalAccounts.map((account, index) => (
              <div key={index} className="p-[clamp(0.75rem,2vw,1rem)] border rounded-lg space-y-[clamp(0.5rem,1.5vw,0.75rem)] bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[clamp(1rem,2.5vw,1.125rem)]">Account {index + 2}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAdditionalAccount(index)}
                    className="h-[clamp(2rem,4vw,2.25rem)] px-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(0.875rem,2.5vw,1rem)]"
                  >
                    <Trash2 className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] mr-1" />
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(0.5rem,1.5vw,0.75rem)]">
                  <div>
                    <MobileLabel htmlFor={`account-${index}-bank`} required>Bank Name</MobileLabel>
                    <MobileInput
                      id={`account-${index}-bank`}
                      value={account.bankName}
                      onChange={(e) => handleInputChange(`additionalAccounts.${index}.bankName`, e.target.value)}
                      error={showErrors && !!errors[`additionalAccounts.${index}.bankName`]}
                      placeholder="Enter bank name"
                    />
                    {showErrors && errors[`additionalAccounts.${index}.bankName`] && (
                      <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-600 mt-1">{errors[`additionalAccounts.${index}.bankName`]}</p>
                    )}
                  </div>
                  <div>
                    <MobileLabel htmlFor={`account-${index}-type`} required>Account Type</MobileLabel>
                    <MobileSelect
                      value={account.accountType}
                      onValueChange={(value) => handleInputChange(`additionalAccounts.${index}.accountType`, value)}
                    >
                      <MobileSelectItem value="checking">Checking</MobileSelectItem>
                      <MobileSelectItem value="savings">Savings</MobileSelectItem>
                    </MobileSelect>
                  </div>
                  <div>
                    <MobileLabel htmlFor={`account-${index}-routing`} required>Routing Number</MobileLabel>
                    <MobileInput
                      id={`account-${index}-routing`}
                      value={account.routingNumber}
                      onChange={(e) => handleInputChange(`additionalAccounts.${index}.routingNumber`, e.target.value.replace(/\D/g, '').slice(0, 9))}
                      error={showErrors && !!errors[`additionalAccounts.${index}.routingNumber`]}
                      placeholder="123456789"
                      mobileKeyboard="numeric"
                      maxLength={9}
                    />
                    {showErrors && errors[`additionalAccounts.${index}.routingNumber`] && (
                      <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-600 mt-1">{errors[`additionalAccounts.${index}.routingNumber`]}</p>
                    )}
                  </div>
                  <div>
                    <MobileLabel htmlFor={`account-${index}-number`} required>Account Number</MobileLabel>
                    <MobileInput
                      id={`account-${index}-number`}
                      value={account.accountNumber}
                      onChange={(e) => handleInputChange(`additionalAccounts.${index}.accountNumber`, e.target.value.replace(/\D/g, '').slice(0, 17))}
                      error={showErrors && !!errors[`additionalAccounts.${index}.accountNumber`]}
                      placeholder="Enter account number"
                      mobileKeyboard="numeric"
                      maxLength={17}
                    />
                    {showErrors && errors[`additionalAccounts.${index}.accountNumber`] && (
                      <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-600 mt-1">{errors[`additionalAccounts.${index}.accountNumber`]}</p>
                    )}
                  </div>
                  <div>
                    <MobileLabel htmlFor={`account-${index}-confirm`} required>Confirm Account Number</MobileLabel>
                    <MobileInput
                      id={`account-${index}-confirm`}
                      value={account.accountNumberConfirm}
                      onChange={(e) => handleInputChange(`additionalAccounts.${index}.accountNumberConfirm`, e.target.value.replace(/\D/g, '').slice(0, 17))}
                      error={showErrors && !!errors[`additionalAccounts.${index}.accountNumberConfirm`]}
                      placeholder="Re-enter account number"
                      mobileKeyboard="numeric"
                      maxLength={17}
                    />
                    {showErrors && errors[`additionalAccounts.${index}.accountNumberConfirm`] && (
                      <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-600 mt-1">{errors[`additionalAccounts.${index}.accountNumberConfirm`]}</p>
                    )}
                  </div>
                  <div>
                    <MobileLabel htmlFor={`account-${index}-percentage`} required>Percentage</MobileLabel>
                    <MobileInput
                      id={`account-${index}-percentage`}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={account.percentage || ''}
                      onChange={(e) => handleInputChange(`additionalAccounts.${index}.percentage`, parseFloat(e.target.value) || 0)}
                      placeholder="0-100"
                      mobileKeyboard="numeric"
                    />
                  </div>
                </div>
              </div>
            ))}

            {formData.additionalAccounts.length > 0 && (
              <div className="p-[clamp(0.5rem,1.5vw,0.75rem)] bg-blue-50 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-[clamp(0.875rem,2.5vw,1rem)] font-medium">Total Percentage</span>
                  <Badge variant={Math.abs(totalSplitPercentage - 100) < 0.5 ? 'default' : 'destructive'}>
                    {totalSplitPercentage.toFixed(1)}%
                  </Badge>
                </div>
                {showErrors && errors.totalPercentage && (
                  <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-600 mt-1">{errors.totalPercentage}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verification & Authorization Section */}
      <div className="space-y-[clamp(0.75rem,2vw,1rem)] p-[clamp(0.75rem,2vw,1rem)] border rounded-lg bg-white">
        <div className="space-y-[clamp(0.25rem,1vw,0.5rem)]">
          <h3 className="text-[clamp(1.125rem,3vw,1.25rem)] font-semibold">Verification & Authorization</h3>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
            {formData.paymentMethod === 'direct_deposit'
              ? 'Upload verification documents and authorize deposits.'
              : 'Authorize paper check payment method.'}
          </p>
        </div>

        <div className="space-y-[clamp(0.75rem,2vw,1rem)]">
          {/* Only show upload fields for direct deposit */}
          {formData.paymentMethod === 'direct_deposit' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(0.75rem,2vw,1rem)]">
                <div>
                  <MobileLabel className="mb-2">Voided Check</MobileLabel>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('voided-check-upload')?.click()}
                    className="w-full h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)]"
                  >
                    <Upload className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] mr-2" />
                    {formData.voidedCheckUploaded ? 'Replace Voided Check' : 'Upload Voided Check'}
                  </Button>
                  <input
                    id="voided-check-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      await handleUpload('voided_check', file)
                    }}
                  />
                  {formData.voidedCheckDocument?.original_filename && (
                    <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-muted-foreground mt-1 flex items-center gap-1">
                      <Check className="h-[clamp(0.75rem,2vw,0.875rem)] w-[clamp(0.75rem,2vw,0.875rem)] text-green-500" />
                      {formData.voidedCheckDocument.original_filename}
                    </p>
                  )}
                </div>
                <div>
                  <MobileLabel className="mb-2">Bank Letter / Statement</MobileLabel>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('bank-letter-upload')?.click()}
                    className="w-full h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)]"
                  >
                    <Upload className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] mr-2" />
                    {formData.bankLetterUploaded ? 'Replace Bank Letter' : 'Upload Bank Letter'}
                  </Button>
                  <input
                    id="bank-letter-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      await handleUpload('bank_letter', file)
                    }}
                  />
                  {formData.bankLetterDocument?.original_filename && (
                    <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-muted-foreground mt-1 flex items-center gap-1">
                      <Check className="h-[clamp(0.75rem,2vw,0.875rem)] w-[clamp(0.75rem,2vw,0.875rem)] text-green-500" />
                      {formData.bankLetterDocument.original_filename}
                    </p>
                  )}
                </div>
              </div>

              {showErrors && errors.verification && (
                <Alert className="bg-red-50 border-red-200 p-[clamp(0.5rem,1.5vw,0.75rem)]">
                  <AlertTriangle className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-red-600" />
                  <AlertDescription className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-600">
                    {errors.verification}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <MobileCheckbox
            id="authorizeDeposit"
            checked={formData.authorizeDeposit}
            onCheckedChange={(checked) => handleInputChange('authorizeDeposit', !!checked)}
            label={
              formData.paymentMethod === 'direct_deposit'
                ? "I authorize my employer to deposit my pay to the account(s) specified above."
                : "I authorize my employer to issue my pay via paper check."
            }
          />

          {showErrors && errors.authorizeDeposit && (
            <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-red-600">{errors.authorizeDeposit}</p>
          )}

          <Alert className="py-[clamp(0.5rem,1.5vw,0.75rem)]">
            <Info className="h-[clamp(0.75rem,2vw,0.875rem)] w-[clamp(0.75rem,2vw,0.875rem)]" />
            <AlertDescription className="text-[clamp(0.75rem,2vw,0.875rem)]">
              {formData.paymentMethod === 'direct_deposit'
                ? 'Deposits may take one to two pay periods to take effect.'
                : 'Paper checks will be available on payday at the designated pickup location.'}
            </AlertDescription>
          </Alert>

          <div className="flex justify-end pt-[clamp(0.75rem,2vw,1rem)]">
            <Button
              onClick={handleSubmit}
              disabled={!isValid}
              className="h-[clamp(2.75rem,6vw,3rem)] px-[clamp(1rem,3vw,1.5rem)] text-[clamp(0.875rem,2.5vw,1rem)]"
            >
              <Save className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] mr-2" />
              Continue to Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}