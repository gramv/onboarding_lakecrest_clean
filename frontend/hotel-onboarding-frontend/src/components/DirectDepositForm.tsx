import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Building, Plus, Trash2, AlertTriangle, Info, Upload } from 'lucide-react';

interface BankAccount {
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  depositAmount: number;
  percentage: number;
}

interface DirectDepositData {
  depositType: 'full' | 'partial' | 'split';
  primaryAccount: BankAccount;
  additionalAccounts: BankAccount[];
  voidedCheckUploaded: boolean;
  bankLetterUploaded: boolean;
  totalPercentage: number;
  authorizeDeposit: boolean;
  employeeSignature: string;
  dateOfAuth: string;
}

interface DirectDepositFormProps {
  initialData?: Partial<DirectDepositData>;
  language: 'en' | 'es';
  onSave: (data: DirectDepositData) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function DirectDepositForm({
  initialData = {},
  language,
  onSave,
  onNext,
  onBack
}: DirectDepositFormProps) {
  const [formData, setFormData] = useState<DirectDepositData>({
    depositType: 'full',
    primaryAccount: {
      bankName: '',
      routingNumber: '',
      accountNumber: '',
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [showErrors, setShowErrors] = useState(false);

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'direct_deposit': 'Direct Deposit Authorization',
        'direct_deposit_desc': 'Set up direct deposit to have your paycheck deposited directly into your bank account(s).',
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
        'account_type': 'Account Type',
        'checking': 'Checking',
        'savings': 'Savings',
        'deposit_amount': 'Deposit Amount',
        'percentage': 'Percentage',
        'add_account': 'Add Another Account',
        'remove_account': 'Remove Account',
        'verification_docs': 'Account Verification',
        'voided_check': 'Voided Check',
        'bank_letter': 'Bank Letter',
        'upload_voided_check': 'Upload Voided Check',
        'upload_bank_letter': 'Upload Bank Letter or Account Statement',
        'voided_check_desc': 'Attach a voided check for account verification',
        'bank_letter_desc': 'Or attach an official bank letter/statement with account details',
        'authorization': 'Authorization',
        'authorize_text': 'I authorize my employer to deposit my pay as indicated above',
        'signature_required': 'Employee signature required',
        'date_of_auth': 'Date of Authorization',
        'important_info': 'Important Information',
        'routing_help': '9-digit number at bottom left of check',
        'account_help': 'Account number at bottom center of check',
        'changes_notice': 'Changes to direct deposit may take 1-2 pay periods to take effect',
        'security_notice': 'Your banking information is encrypted and securely stored',
        'total_percentage': 'Total Percentage',
        'percentage_error': 'Total percentage must equal 100%',
        'required_field': 'This field is required',
        'invalid_routing': 'Routing number must be 9 digits',
        'invalid_account': 'Please enter a valid account number',
        'next': 'Next',
        'back': 'Back',
        'save_continue': 'Save & Continue',
        'file_uploaded': 'File uploaded successfully',
        'remove_file': 'Remove file'
      },
      es: {
        'direct_deposit': 'Autorización de Depósito Directo',
        'direct_deposit_desc': 'Configure el depósito directo para que su cheque de pago se deposite directamente en su(s) cuenta(s) bancaria(s).',
        'deposit_types': 'Opciones de Depósito',
        'full_deposit': 'Depósito Directo Completo',
        'partial_deposit': 'Depósito Directo Parcial',
        'split_deposit': 'Dividir Entre Múltiples Cuentas',
        'full_desc': 'Todo el cheque de pago depositado en una cuenta',
        'partial_desc': 'Cantidad específica depositada, resto en cheque',
        'split_desc': 'Dividir el cheque de pago entre múltiples cuentas',
        'primary_account': 'Cuenta Bancaria Principal',
        'bank_name': 'Nombre del Banco',
        'routing_number': 'Número de Ruta',
        'account_number': 'Número de Cuenta',
        'account_type': 'Tipo de Cuenta',
        'checking': 'Corriente',
        'savings': 'Ahorros',
        'next': 'Siguiente',
        'back': 'Atrás',
        'save_continue': 'Guardar y Continuar'
      }
    };
    return translations[language][key] || key;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate primary account
    if (!formData.primaryAccount.bankName.trim()) {
      newErrors['primaryAccount.bankName'] = t('required_field');
    }
    if (!formData.primaryAccount.routingNumber.trim()) {
      newErrors['primaryAccount.routingNumber'] = t('required_field');
    } else if (!/^\d{9}$/.test(formData.primaryAccount.routingNumber)) {
      newErrors['primaryAccount.routingNumber'] = t('invalid_routing');
    }
    if (!formData.primaryAccount.accountNumber.trim()) {
      newErrors['primaryAccount.accountNumber'] = t('required_field');
    }

    // Check total percentage for split deposits
    if (formData.depositType === 'split') {
      const totalPercentage = formData.primaryAccount.percentage + 
        formData.additionalAccounts.reduce((sum, acc) => sum + acc.percentage, 0);
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        newErrors.totalPercentage = t('percentage_error');
      }
    }

    // Validate additional accounts for split deposits
    if (formData.depositType === 'split') {
      formData.additionalAccounts.forEach((account, index) => {
        if (!account.bankName.trim()) {
          newErrors[`additionalAccounts.${index}.bankName`] = t('required_field');
        }
        if (!account.routingNumber.trim()) {
          newErrors[`additionalAccounts.${index}.routingNumber`] = t('required_field');
        } else if (!/^\d{9}$/.test(account.routingNumber)) {
          newErrors[`additionalAccounts.${index}.routingNumber`] = t('invalid_routing');
        }
        if (!account.accountNumber.trim()) {
          newErrors[`additionalAccounts.${index}.accountNumber`] = t('required_field');
        }
      });
    }

    // Authorization required
    if (!formData.authorizeDeposit) {
      newErrors.authorizeDeposit = 'Authorization is required';
    }

    // Verification document required
    if (!formData.voidedCheckUploaded && !formData.bankLetterUploaded) {
      newErrors.verification = 'Please upload either a voided check or bank letter for verification';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    const keys = field.split('.');
    if (keys.length === 1) {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else if (keys[0] === 'primaryAccount') {
      setFormData(prev => ({
        ...prev,
        primaryAccount: { ...prev.primaryAccount, [keys[1]]: value }
      }));
    }
    
    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle field blur to show validation errors
  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  // Function to determine if error should be shown
  const shouldShowError = (field: string) => {
    return showErrors || touchedFields[field];
  };

  const handleAdditionalAccountChange = (index: number, field: string, value: any) => {
    const newAccounts = [...formData.additionalAccounts];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    setFormData(prev => ({ ...prev, additionalAccounts: newAccounts }));
    
    // Mark field as touched
    const fieldKey = `additionalAccounts.${index}.${field}`;
    setTouchedFields(prev => ({ ...prev, [fieldKey]: true }));
    
    // Clear error when user starts typing
    if (errors[fieldKey]) {
      setErrors(prev => ({ ...prev, [fieldKey]: '' }));
    }
  };

  const addAdditionalAccount = () => {
    const newAccount: BankAccount = {
      bankName: '',
      routingNumber: '',
      accountNumber: '',
      accountType: 'checking',
      depositAmount: 0,
      percentage: 0
    };
    setFormData(prev => ({
      ...prev,
      additionalAccounts: [...prev.additionalAccounts, newAccount]
    }));
  };

  const removeAdditionalAccount = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalAccounts: prev.additionalAccounts.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (type: 'voided_check' | 'bank_letter', file: File) => {
    setUploadedFiles(prev => ({ ...prev, [type]: file }));
    if (type === 'voided_check') {
      setFormData(prev => ({ ...prev, voidedCheckUploaded: true }));
    } else {
      setFormData(prev => ({ ...prev, bankLetterUploaded: true }));
    }
  };

  const handleSubmit = () => {
    setShowErrors(true); // Show all errors when user tries to submit
    if (validateForm()) {
      onSave(formData);
      onNext();
    }
  };

  const formatRoutingNumber = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 9);
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">{t('direct_deposit')}</h2>
        <p className="text-gray-600 text-sm mt-1">{t('direct_deposit_desc')}</p>
      </div>

      {/* Deposit Type Selection - Compact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('deposit_types')}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={formData.depositType} 
            onValueChange={(value) => handleInputChange('depositType', value)}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"
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

      {/* Primary Account - Compact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Building className="h-4 w-4" />
            <span>{t('primary_account')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="bankName" className="text-sm">{t('bank_name')} *</Label>
              <Input
                id="bankName"
                value={formData.primaryAccount.bankName}
                onChange={(e) => handleInputChange('primaryAccount.bankName', e.target.value)}
                onBlur={() => handleFieldBlur('primaryAccount.bankName')}
                className={shouldShowError('primaryAccount.bankName') && errors['primaryAccount.bankName'] ? 'border-red-500' : ''}
                placeholder=""
                size="sm"
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
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">{t('checking')}</SelectItem>
                  <SelectItem value="savings">{t('savings')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="routingNumber" className="text-sm">{t('routing_number')} *</Label>
              <Input
                id="routingNumber"
                value={formData.primaryAccount.routingNumber}
                onChange={(e) => handleInputChange('primaryAccount.routingNumber', formatRoutingNumber(e.target.value))}
                onBlur={() => handleFieldBlur('primaryAccount.routingNumber')}
                className={shouldShowError('primaryAccount.routingNumber') && errors['primaryAccount.routingNumber'] ? 'border-red-500' : ''}
                placeholder=""
                maxLength={9}
                size="sm"
              />
              {shouldShowError('primaryAccount.routingNumber') && errors['primaryAccount.routingNumber'] && (
                <p className="text-red-600 text-xs mt-1">{errors['primaryAccount.routingNumber']}</p>
              )}
            </div>
            <div>
              <Label htmlFor="accountNumber" className="text-sm">{t('account_number')} *</Label>
              <Input
                id="accountNumber"
                value={formData.primaryAccount.accountNumber}
                onChange={(e) => handleInputChange('primaryAccount.accountNumber', e.target.value)}
                onBlur={() => handleFieldBlur('primaryAccount.accountNumber')}
                className={shouldShowError('primaryAccount.accountNumber') && errors['primaryAccount.accountNumber'] ? 'border-red-500' : ''}
                placeholder=""
                size="sm"
              />
              {shouldShowError('primaryAccount.accountNumber') && errors['primaryAccount.accountNumber'] && (
                <p className="text-red-600 text-xs mt-1">{errors['primaryAccount.accountNumber']}</p>
              )}
            </div>
          </div>
          
          {/* Additional fields for partial/split */}
          {(formData.depositType === 'partial' || formData.depositType === 'split') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
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
                    placeholder=""
                    size="sm"
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
                    placeholder=""
                    size="sm"
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Helper text - compact */}
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            <p><strong>Routing:</strong> 9-digit number (bottom left of check)</p>
            <p><strong>Account:</strong> Account number (bottom center of check)</p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Accounts for Split Deposit */}
      {formData.depositType === 'split' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('additional_accounts')}</CardTitle>
              <Button variant="outline" size="sm" onClick={addAdditionalAccount}>
                <Plus className="h-4 w-4 mr-2" />
                {t('add_account')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.additionalAccounts.map((account, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('bank_name')} *</Label>
                    <Input
                      value={account.bankName}
                      onChange={(e) => handleAdditionalAccountChange(index, 'bankName', e.target.value)}
                      onBlur={() => handleFieldBlur(`additionalAccounts.${index}.bankName`)}
                      className={shouldShowError(`additionalAccounts.${index}.bankName`) && errors[`additionalAccounts.${index}.bankName`] ? 'border-red-500' : ''}
                      placeholder=""
                    />
                    {shouldShowError(`additionalAccounts.${index}.bankName`) && errors[`additionalAccounts.${index}.bankName`] && (
                      <p className="text-red-600 text-sm mt-1">{errors[`additionalAccounts.${index}.bankName`]}</p>
                    )}
                  </div>

                  <div>
                    <Label>{t('account_type')} *</Label>
                    <Select 
                      value={account.accountType} 
                      onValueChange={(value) => handleAdditionalAccountChange(index, 'accountType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">{t('checking')}</SelectItem>
                        <SelectItem value="savings">{t('savings')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('routing_number')} *</Label>
                    <Input
                      value={account.routingNumber}
                      onChange={(e) => handleAdditionalAccountChange(index, 'routingNumber', formatRoutingNumber(e.target.value))}
                      onBlur={() => handleFieldBlur(`additionalAccounts.${index}.routingNumber`)}
                      className={shouldShowError(`additionalAccounts.${index}.routingNumber`) && errors[`additionalAccounts.${index}.routingNumber`] ? 'border-red-500' : ''}
                      placeholder=""
                      maxLength={9}
                    />
                    {shouldShowError(`additionalAccounts.${index}.routingNumber`) && errors[`additionalAccounts.${index}.routingNumber`] && (
                      <p className="text-red-600 text-sm mt-1">{errors[`additionalAccounts.${index}.routingNumber`]}</p>
                    )}
                  </div>

                  <div>
                    <Label>{t('account_number')} *</Label>
                    <Input
                      value={account.accountNumber}
                      onChange={(e) => handleAdditionalAccountChange(index, 'accountNumber', e.target.value)}
                      onBlur={() => handleFieldBlur(`additionalAccounts.${index}.accountNumber`)}
                      className={shouldShowError(`additionalAccounts.${index}.accountNumber`) && errors[`additionalAccounts.${index}.accountNumber`] ? 'border-red-500' : ''}
                      placeholder=""
                    />
                    {shouldShowError(`additionalAccounts.${index}.accountNumber`) && errors[`additionalAccounts.${index}.accountNumber`] && (
                      <p className="text-red-600 text-sm mt-1">{errors[`additionalAccounts.${index}.accountNumber`]}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label>{t('percentage')} *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={account.percentage || ''}
                      onChange={(e) => handleAdditionalAccountChange(index, 'percentage', parseFloat(e.target.value) || 0)}
                      placeholder=""
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Total Percentage Display */}
            {formData.depositType === 'split' && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t('total_percentage')}:</span>
                  <Badge variant={Math.abs((formData.primaryAccount.percentage + formData.additionalAccounts.reduce((sum, acc) => sum + acc.percentage, 0)) - 100) > 0.01 ? 'destructive' : 'default'}>
                    {(formData.primaryAccount.percentage + formData.additionalAccounts.reduce((sum, acc) => sum + acc.percentage, 0)).toFixed(1)}%
                  </Badge>
                </div>
                {shouldShowError('totalPercentage') && errors.totalPercentage && (
                  <p className="text-red-600 text-sm mt-1">{errors.totalPercentage}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Account Verification - Compact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Upload className="h-4 w-4" />
            <span>{t('verification_docs')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border rounded p-3">
              <h4 className="font-medium text-sm mb-1">{t('voided_check')}</h4>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('voided_check', file);
                }}
                className="hidden"
                id="voided-check-upload"
              />
              <Label htmlFor="voided-check-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded p-3 text-center hover:border-blue-500 transition-colors">
                  {formData.voidedCheckUploaded ? (
                    <div className="text-green-600">
                      <Upload className="h-4 w-4 mx-auto mb-1" />
                      <p className="text-xs">{t('file_uploaded')}</p>
                      {uploadedFiles.voided_check && (
                        <p className="text-xs text-gray-600 truncate">{uploadedFiles.voided_check.name}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="h-4 w-4 mx-auto mb-1" />
                      <p className="text-xs">{t('upload_voided_check')}</p>
                    </div>
                  )}
                </div>
              </Label>
            </div>

            <div className="border rounded p-3">
              <h4 className="font-medium text-sm mb-1">{t('bank_letter')}</h4>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('bank_letter', file);
                }}
                className="hidden"
                id="bank-letter-upload"
              />
              <Label htmlFor="bank-letter-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded p-3 text-center hover:border-blue-500 transition-colors">
                  {formData.bankLetterUploaded ? (
                    <div className="text-green-600">
                      <Upload className="h-4 w-4 mx-auto mb-1" />
                      <p className="text-xs">{t('file_uploaded')}</p>
                      {uploadedFiles.bank_letter && (
                        <p className="text-xs text-gray-600 truncate">{uploadedFiles.bank_letter.name}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="h-4 w-4 mx-auto mb-1" />
                      <p className="text-xs">{t('upload_bank_letter')}</p>
                    </div>
                  )}
                </div>
              </Label>
            </div>
          </div>

          {shouldShowError('verification') && errors.verification && (
            <Alert className="mt-2 py-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-red-600 text-xs">
                {errors.verification}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Authorization - Compact */}
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
            <Label htmlFor="authorizeDeposit" className="text-sm leading-tight">
              {t('authorize_text')}. I understand this remains in effect until I provide written notice to revoke.
            </Label>
          </div>
          {shouldShowError('authorizeDeposit') && errors.authorizeDeposit && (
            <p className="text-red-600 text-xs">{errors.authorizeDeposit}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dateOfAuth" className="text-sm">{t('date_of_auth')} *</Label>
              <Input
                id="dateOfAuth"
                type="date"
                value={formData.dateOfAuth}
                onChange={(e) => handleInputChange('dateOfAuth', e.target.value)}
                size="sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Information - Compact */}
      <Alert className="py-2">
        <Info className="h-3 w-3" />
        <AlertDescription className="text-xs">
          <p className="font-medium">{t('important_info')}:</p>
          <div className="mt-1 space-y-1">
            <p>• {t('changes_notice')}</p>
            <p>• {t('security_notice')}</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Navigation - Compact */}
      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={onBack} size="sm">
          {t('back')}
        </Button>
        <Button onClick={handleSubmit} className="px-6" size="sm">
          {t('save_continue')}
        </Button>
      </div>
    </div>
  );
}