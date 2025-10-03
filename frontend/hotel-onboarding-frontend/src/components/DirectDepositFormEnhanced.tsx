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
    }

    if (!formData.authorizeDeposit) {
      newErrors.authorizeDeposit = 'Authorization is required'
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Method</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Choose how you would like to receive your pay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={formData.paymentMethod}
            onValueChange={(value) => handleInputChange('paymentMethod', value)}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <RadioGroupItem value="direct_deposit" id="direct_deposit" className="mt-0.5" />
              <div>
                <Label htmlFor="direct_deposit" className="font-medium text-sm">Direct Deposit</Label>
                <p className="text-xs text-gray-600 mt-0.5">Fast, secure electronic deposit to your bank account.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <RadioGroupItem value="paper_check" id="paper_check" className="mt-0.5" />
              <div>
                <Label htmlFor="paper_check" className="font-medium text-sm">Paper Check</Label>
                <p className="text-xs text-gray-600 mt-0.5">Pick up physical checks on payday.</p>
              </div>
            </div>
          </RadioGroup>

          {formData.paymentMethod === 'direct_deposit' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Deposit Type</Label>
              <RadioGroup
                value={formData.depositType}
                onValueChange={(value) => handleInputChange('depositType', value)}
                className="grid grid-cols-1 md:grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2 p-2 border rounded">
                  <RadioGroupItem value="full" id="deposit_full" />
                  <Label htmlFor="deposit_full" className="text-sm">Full Deposit</Label>
                </div>
                <div className="flex items-center space-x-2 p-2 border rounded">
                  <RadioGroupItem value="partial" id="deposit_partial" />
                  <Label htmlFor="deposit_partial" className="text-sm">Partial Deposit</Label>
                </div>
                <div className="flex items-center space-x-2 p-2 border rounded">
                  <RadioGroupItem value="split" id="deposit_split" />
                  <Label htmlFor="deposit_split" className="text-sm">Split Accounts</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </CardContent>
      </Card>

      {formData.paymentMethod === 'direct_deposit' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Primary Account</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label htmlFor="bankName" className="text-sm">Bank Name *</Label>
                <Input
                  id="bankName"
                  value={formData.primaryAccount.bankName}
                  onChange={(e) => handleInputChange('primaryAccount.bankName', e.target.value)}
                  className={showErrors && errors['primaryAccount.bankName'] ? 'border-red-500' : ''}
                />
                {showErrors && errors['primaryAccount.bankName'] && (
                  <p className="text-xs text-red-600 mt-1">{errors['primaryAccount.bankName']}</p>
                )}
              </div>
              <div>
                <Label htmlFor="accountType" className="text-sm">Account Type *</Label>
                <Select
                  value={formData.primaryAccount.accountType}
                  onValueChange={(value) => handleInputChange('primaryAccount.accountType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="routingNumber" className="text-sm">Routing Number (9 digits) *</Label>
              <div className="relative">
                <Input
                  id="routingNumber"
                  value={formData.primaryAccount.routingNumber}
                  onChange={(e) => handleInputChange('primaryAccount.routingNumber', e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className={showErrors && errors['primaryAccount.routingNumber'] ? 'border-red-500' : ''}
                  placeholder="123456789"
                />
                {routingValidation.primary?.validating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
                {!routingValidation.primary?.validating && routingValidation.primary?.bankInfo && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              {routingValidation.primary?.bankInfo && (
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {routingValidation.primary.bankInfo.bank_name || routingValidation.primary.bankInfo.short_name}
                </p>
              )}
              {routingValidation.primary?.error && (
                <p className="text-xs text-amber-600 mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {routingValidation.primary.error}
                </p>
              )}
              {showErrors && errors['primaryAccount.routingNumber'] && (
                <p className="text-xs text-red-600 mt-1">{errors['primaryAccount.routingNumber']}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="accountNumber" className="text-sm">Account Number *</Label>
                <Input
                  id="accountNumber"
                  value={formData.primaryAccount.accountNumber}
                  onChange={(e) => handleInputChange('primaryAccount.accountNumber', e.target.value.replace(/\D/g, '').slice(0, 17))}
                  className={showErrors && errors['primaryAccount.accountNumber'] ? 'border-red-500' : ''}
                />
                {showErrors && errors['primaryAccount.accountNumber'] && (
                  <p className="text-xs text-red-600 mt-1">{errors['primaryAccount.accountNumber']}</p>
                )}
              </div>
              <div>
                <Label htmlFor="accountNumberConfirm" className="text-sm">Confirm Account Number *</Label>
                <Input
                  id="accountNumberConfirm"
                  value={formData.primaryAccount.accountNumberConfirm}
                  onChange={(e) => handleInputChange('primaryAccount.accountNumberConfirm', e.target.value.replace(/\D/g, '').slice(0, 17))}
                  className={showErrors && errors['primaryAccount.accountNumberConfirm'] ? 'border-red-500' : ''}
                />
                {showErrors && errors['primaryAccount.accountNumberConfirm'] && (
                  <p className="text-xs text-red-600 mt-1">{errors['primaryAccount.accountNumberConfirm']}</p>
                )}
              </div>
            </div>

            {formData.depositType === 'partial' && (
              <div>
                <Label htmlFor="depositAmount" className="text-sm">Direct Deposit Amount *</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.primaryAccount.depositAmount || ''}
                  onChange={(e) => handleInputChange('primaryAccount.depositAmount', parseFloat(e.target.value) || 0)}
                />
              </div>
            )}

            {formData.depositType === 'split' && (
              <div>
                <Label htmlFor="percentage" className="text-sm">Percentage *</Label>
                <Input
                  id="percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.primaryAccount.percentage || ''}
                  onChange={(e) => handleInputChange('primaryAccount.percentage', parseFloat(e.target.value) || 0)}
                />
              </div>
            )}

            <Alert className="py-2">
              <CreditCard className="h-3 w-3" />
              <AlertDescription className="text-xs">
                Find these numbers at the bottom of your checks.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {formData.paymentMethod === 'direct_deposit' && formData.depositType === 'split' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Additional Accounts</CardTitle>
              <Button variant="outline" size="sm" onClick={addAdditionalAccount} disabled={formData.additionalAccounts.length >= 3}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              Distribute your paycheck between multiple accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.additionalAccounts.map((account, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Account {index + 2}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeAdditionalAccount(index)}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm" htmlFor={`account-${index}-bank`}>Bank Name *</Label>
                    <Input
                      id={`account-${index}-bank`}
                      value={account.bankName}
                      onChange={(e) => handleInputChange(`additionalAccounts.${index}.bankName`, e.target.value)}
                      className={showErrors && errors[`additionalAccounts.${index}.bankName`] ? 'border-red-500' : ''}
                    />
                    {showErrors && errors[`additionalAccounts.${index}.bankName`] && (
                      <p className="text-xs text-red-600 mt-1">{errors[`additionalAccounts.${index}.bankName`]}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm" htmlFor={`account-${index}-type`}>Account Type *</Label>
                    <Select
                      value={account.accountType}
                      onValueChange={(value) => handleInputChange(`additionalAccounts.${index}.accountType`, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm" htmlFor={`account-${index}-routing`}>Routing Number *</Label>
                    <Input
                      id={`account-${index}-routing`}
                      value={account.routingNumber}
                      onChange={(e) => handleInputChange(`additionalAccounts.${index}.routingNumber`, e.target.value.replace(/\D/g, '').slice(0, 9))}
                      className={showErrors && errors[`additionalAccounts.${index}.routingNumber`] ? 'border-red-500' : ''}
                    />
                    {showErrors && errors[`additionalAccounts.${index}.routingNumber`] && (
                      <p className="text-xs text-red-600 mt-1">{errors[`additionalAccounts.${index}.routingNumber`]}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm" htmlFor={`account-${index}-number`}>Account Number *</Label>
                    <Input
                      id={`account-${index}-number`}
                      value={account.accountNumber}
                      onChange={(e) => handleInputChange(`additionalAccounts.${index}.accountNumber`, e.target.value.replace(/\D/g, '').slice(0, 17))}
                      className={showErrors && errors[`additionalAccounts.${index}.accountNumber`] ? 'border-red-500' : ''}
                    />
                    {showErrors && errors[`additionalAccounts.${index}.accountNumber`] && (
                      <p className="text-xs text-red-600 mt-1">{errors[`additionalAccounts.${index}.accountNumber`]}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm" htmlFor={`account-${index}-confirm`}>Confirm Account Number *</Label>
                    <Input
                      id={`account-${index}-confirm`}
                      value={account.accountNumberConfirm}
                      onChange={(e) => handleInputChange(`additionalAccounts.${index}.accountNumberConfirm`, e.target.value.replace(/\D/g, '').slice(0, 17))}
                      className={showErrors && errors[`additionalAccounts.${index}.accountNumberConfirm`] ? 'border-red-500' : ''}
                    />
                    {showErrors && errors[`additionalAccounts.${index}.accountNumberConfirm`] && (
                      <p className="text-xs text-red-600 mt-1">{errors[`additionalAccounts.${index}.accountNumberConfirm`]}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm" htmlFor={`account-${index}-percentage`}>Percentage *</Label>
                    <Input
                      id={`account-${index}-percentage`}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={account.percentage || ''}
                      onChange={(e) => handleInputChange(`additionalAccounts.${index}.percentage`, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            ))}

            {formData.additionalAccounts.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Percentage</span>
                  <Badge variant={Math.abs(totalSplitPercentage - 100) < 0.5 ? 'default' : 'destructive'}>
                    {totalSplitPercentage.toFixed(1)}%
                  </Badge>
                </div>
                {showErrors && errors.totalPercentage && (
                  <p className="text-xs text-red-600 mt-1">{errors.totalPercentage}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verification & Authorization</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Upload verification documents and authorize deposits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Voided Check</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('voided-check-upload')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
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
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <Check className="h-3 w-3 text-green-500 mr-1" />
                  {formData.voidedCheckDocument.original_filename}
                </p>
              )}
            </div>
            <div>
              <Label className="mb-2 block">Bank Letter / Statement</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('bank-letter-upload')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
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
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <Check className="h-3 w-3 text-green-500 mr-1" />
                  {formData.bankLetterDocument.original_filename}
                </p>
              )}
            </div>
          </div>

          {showErrors && errors.verification && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-xs text-red-600">
                {errors.verification}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-start space-x-2">
            <Checkbox
              id="authorizeDeposit"
              checked={formData.authorizeDeposit}
              onCheckedChange={(checked) => handleInputChange('authorizeDeposit', !!checked)}
            />
            <Label htmlFor="authorizeDeposit" className="text-sm leading-relaxed">
              I authorize my employer to deposit my pay to the account(s) specified above.
            </Label>
          </div>

          {showErrors && errors.authorizeDeposit && (
            <p className="text-xs text-red-600">{errors.authorizeDeposit}</p>
          )}

          <Alert className="py-2">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Deposits may take one to two pay periods to take effect.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSubmit} disabled={!isValid}>
              <Save className="h-4 w-4 mr-2" />
              Continue to Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}