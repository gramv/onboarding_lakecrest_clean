import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Users, Info, AlertCircle, Shield } from 'lucide-react';
import DigitalSignatureCapture from './DigitalSignatureCapture';

interface I9SupplementAData {
  // Preparer Information
  preparerLastName: string;
  preparerFirstName: string;
  preparerAddress: string;
  preparerCity: string;
  preparerState: string;
  preparerZipCode: string;
  preparerPhoneNumber: string;
  preparerEmail: string;
  
  // Translator Information (if different)
  translatorLastName: string;
  translatorFirstName: string;
  translatorAddress: string;
  translatorCity: string;
  translatorState: string;
  translatorZipCode: string;
  translatorPhoneNumber: string;
  translatorEmail: string;
  
  // Certification
  preparationDate: string;
  preparerSignature?: string;
  translatorSignature?: string;
  
  // Language information
  languageSpoken: string;
  assistanceProvided: string;
}

interface I9SupplementAProps {
  initialData?: Partial<I9SupplementAData>;
  language: 'en' | 'es';
  onComplete: (data: I9SupplementAData) => void;
  onSkip: () => void;
  onBack: () => void;
  employeeData?: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  currentUserRole?: 'hr' | 'manager' | 'employee';
}

export default function I9SupplementA({
  initialData = {},
  language,
  onComplete,
  onSkip,
  onBack,
  employeeData,
  currentUserRole = 'employee'
}: I9SupplementAProps) {
  const [formData, setFormData] = useState<I9SupplementAData>({
    // CRITICAL FIX: Supplement A should ALWAYS start completely blank
    // This is for preparer/translator information ONLY - never auto-fill employee data
    preparerLastName: '',
    preparerFirstName: '',
    preparerAddress: '',
    preparerCity: '',
    preparerState: '',
    preparerZipCode: '',
    preparerPhoneNumber: '',
    preparerEmail: '',
    translatorLastName: '',
    translatorFirstName: '',
    translatorAddress: '',
    translatorCity: '',
    translatorState: '',
    translatorZipCode: '',
    translatorPhoneNumber: '',
    translatorEmail: '',
    preparationDate: new Date().toISOString().split('T')[0],
    languageSpoken: '',
    assistanceProvided: '',
    // FEDERAL COMPLIANCE: Supplement A must NEVER be pre-filled with employee data
    // This ensures preparer/translator provide their own information as required by law
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [showSignature, setShowSignature] = useState(false);
  const [isTranslatorDifferent, setIsTranslatorDifferent] = useState(false);
  const [showComplianceWarning, setShowComplianceWarning] = useState(false);
  const [preparerValidationError, setPreparerValidationError] = useState<string>('');

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'supplement_a_title': 'Form I-9 Supplement A',
        'supplement_a_subtitle': 'Preparer and/or Translator Certification',
        'supplement_a_desc': 'This supplement must be completed if someone other than the employee prepared Section 1 or if a translator assisted.',
        'preparer_info': 'Preparer Information',
        'preparer_info_desc': 'Person who helped prepare or complete Section 1',
        'translator_info': 'Translator Information',
        'translator_info_desc': 'Person who provided translation assistance (if different from preparer)',
        'different_translator': 'The translator is different from the preparer',
        'first_name': 'First Name',
        'last_name': 'Last Name',
        'address': 'Address',
        'city': 'City',
        'state': 'State',
        'zip_code': 'ZIP Code',
        'phone': 'Phone Number',
        'email': 'Email Address',
        'language_spoken': 'Language Spoken by Employee',
        'assistance_provided': 'Type of Assistance Provided',
        'preparation_date': 'Date Prepared',
        'certification': 'Certification',
        'preparer_certification': 'I attest, under penalty of perjury, that I have assisted in the completion of Section 1 of this form and that to the best of my knowledge the information is true and correct.',
        'translator_certification': 'I attest, under penalty of perjury, that I have assisted in the completion of Section 1 of this form by translating from [language] to English and that to the best of my knowledge the information is true and correct.',
        'required': 'Required',
        'next': 'Next',
        'back': 'Back',
        'skip': 'Skip This Supplement',
        'sign_document': 'Sign Document',
        'complete': 'Complete Supplement A',
        'compliance_warning': 'Federal Compliance Warning',
        'preparer_cannot_be_employee': 'The preparer/translator cannot be the employee themselves. A third party must complete this form.',
        'auto_fill_disabled': 'Auto-fill is disabled for federal compliance. All fields must be entered manually.',
        'role_restriction': 'This form should only be completed by the person who helped prepare or translate Section 1.',
        'employee_warning': 'Employees cannot complete their own Supplement A. Please have your preparer/translator complete this form.'
      },
      es: {
        'supplement_a_title': 'Formulario I-9 Suplemento A',
        'supplement_a_subtitle': 'Certificación del Preparador y/o Traductor',
        'supplement_a_desc': 'Este suplemento debe completarse si alguien que no sea el empleado preparó la Sección 1 o si un traductor ayudó.',
        'preparer_info': 'Información del Preparador',
        'first_name': 'Nombre',
        'last_name': 'Apellido',
        'next': 'Siguiente',
        'back': 'Atrás',
        'skip': 'Omitir Este Suplemento',
        'complete': 'Completar Suplemento A'
      }
    };
    return translations[language][key] || key;
  };

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 0) {
      // FEDERAL COMPLIANCE: Validate preparer is not the employee
      if (employeeData && 
          formData.preparerFirstName.toLowerCase().trim() === employeeData.firstName.toLowerCase().trim() &&
          formData.preparerLastName.toLowerCase().trim() === employeeData.lastName.toLowerCase().trim()) {
        setPreparerValidationError(t('preparer_cannot_be_employee'));
        return false;
      }
      
      // Clear previous validation error
      setPreparerValidationError('');
      
      // Validate preparer information
      if (!formData.preparerFirstName.trim()) {
        newErrors.preparerFirstName = t('required');
      }
      if (!formData.preparerLastName.trim()) {
        newErrors.preparerLastName = t('required');
      }
      if (!formData.preparerAddress.trim()) {
        newErrors.preparerAddress = t('required');
      }
      if (!formData.languageSpoken.trim()) {
        newErrors.languageSpoken = t('required');
      }
      if (!formData.assistanceProvided.trim()) {
        newErrors.assistanceProvided = t('required');
      }
    } else if (currentStep === 1 && isTranslatorDifferent) {
      // Validate translator information if different
      if (!formData.translatorFirstName.trim()) {
        newErrors.translatorFirstName = t('required');
      }
      if (!formData.translatorLastName.trim()) {
        newErrors.translatorLastName = t('required');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof I9SupplementAData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep === 0) {
        if (isTranslatorDifferent) {
          setCurrentStep(1);
        } else {
          // Copy preparer info to translator if same person
          setFormData(prev => ({
            ...prev,
            translatorFirstName: prev.preparerFirstName,
            translatorLastName: prev.preparerLastName,
            translatorAddress: prev.preparerAddress,
            translatorCity: prev.preparerCity,
            translatorState: prev.preparerState,
            translatorZipCode: prev.preparerZipCode,
            translatorPhoneNumber: prev.preparerPhoneNumber,
            translatorEmail: prev.preparerEmail
          }));
          setShowSignature(true);
        }
      } else if (currentStep === 1) {
        setShowSignature(true);
      }
    }
  };

  const handleSignature = (signatureData: any) => {
    const updatedData = {
      ...formData,
      preparerSignature: signatureData.signatureData
    };
    onComplete(updatedData);
  };

  const renderPreparerInfo = () => (
    <div className="space-y-3">
      <details className="group">
        <summary className="cursor-pointer bg-blue-50 border border-blue-200 rounded p-2 hover:bg-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-semibold text-blue-900">Form Instructions</span>
            </div>
            <svg className="h-3 w-3 text-blue-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div className="mt-1 text-xs text-blue-800 px-3 pb-2">
          {t('supplement_a_desc')}
        </div>
      </details>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-base">
            <Users className="h-4 w-4" />
            <span>{t('preparer_info')}</span>
          </CardTitle>
          <CardDescription className="text-sm">{t('preparer_info_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="preparerFirstName" className="text-xs font-medium">{t('first_name')} *</Label>
              <Input
                id="preparerFirstName"
                value={formData.preparerFirstName}
                onChange={(e) => handleInputChange('preparerFirstName', e.target.value)}
                className={`h-8 text-sm ${errors.preparerFirstName ? 'border-red-500' : ''}`}
              />
              {errors.preparerFirstName && (
                <p className="text-red-600 text-xs mt-1">{errors.preparerFirstName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="preparerLastName" className="text-xs font-medium">{t('last_name')} *</Label>
              <Input
                id="preparerLastName"
                value={formData.preparerLastName}
                onChange={(e) => handleInputChange('preparerLastName', e.target.value)}
                className={`h-8 text-sm ${errors.preparerLastName ? 'border-red-500' : ''}`}
              />
              {errors.preparerLastName && (
                <p className="text-red-600 text-xs mt-1">{errors.preparerLastName}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="preparerAddress" className="text-xs font-medium">{t('address')} *</Label>
              <Input
                id="preparerAddress"
                value={formData.preparerAddress}
                onChange={(e) => handleInputChange('preparerAddress', e.target.value)}
                className={`h-8 text-sm ${errors.preparerAddress ? 'border-red-500' : ''}`}
              />
              {errors.preparerAddress && (
                <p className="text-red-600 text-xs mt-1">{errors.preparerAddress}</p>
              )}
            </div>

            <div>
              <Label htmlFor="preparerCity" className="text-xs font-medium">{t('city')}</Label>
              <Input
                id="preparerCity"
                value={formData.preparerCity}
                onChange={(e) => handleInputChange('preparerCity', e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="preparerState" className="text-xs font-medium">{t('state')}</Label>
              <Input
                id="preparerState"
                value={formData.preparerState}
                onChange={(e) => handleInputChange('preparerState', e.target.value)}
                maxLength={2}
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="preparerZipCode" className="text-xs font-medium">{t('zip_code')}</Label>
              <Input
                id="preparerZipCode"
                value={formData.preparerZipCode}
                onChange={(e) => handleInputChange('preparerZipCode', e.target.value)}
                maxLength={10}
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="preparerPhoneNumber" className="text-xs font-medium">{t('phone')}</Label>
              <Input
                id="preparerPhoneNumber"
                value={formData.preparerPhoneNumber}
                onChange={(e) => handleInputChange('preparerPhoneNumber', e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="preparerEmail" className="text-xs font-medium">{t('email')}</Label>
              <Input
                id="preparerEmail"
                type="email"
                value={formData.preparerEmail}
                onChange={(e) => handleInputChange('preparerEmail', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Preparer Validation Error */}
      {preparerValidationError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            {preparerValidationError}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Assistance Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="languageSpoken" className="text-xs font-medium">{t('language_spoken')} *</Label>
            <Input
              id="languageSpoken"
              value={formData.languageSpoken}
              onChange={(e) => handleInputChange('languageSpoken', e.target.value)}
              className={`h-8 text-sm ${errors.languageSpoken ? 'border-red-500' : ''}`}
              placeholder="e.g., Spanish, Mandarin, Arabic"
            />
            {errors.languageSpoken && (
              <p className="text-red-600 text-xs mt-1">{errors.languageSpoken}</p>
            )}
          </div>

          <div>
            <Label htmlFor="assistanceProvided" className="text-xs font-medium">{t('assistance_provided')} *</Label>
            <textarea
              id="assistanceProvided"
              value={formData.assistanceProvided}
              onChange={(e) => handleInputChange('assistanceProvided', e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                errors.assistanceProvided ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={2}
              placeholder="Describe the type of assistance provided (translation, help filling out form, etc.)"
            />
            {errors.assistanceProvided && (
              <p className="text-red-600 text-xs mt-1">{errors.assistanceProvided}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="differentTranslator"
              checked={isTranslatorDifferent}
              onChange={(e) => setIsTranslatorDifferent(e.target.checked)}
            />
            <Label htmlFor="differentTranslator">{t('different_translator')}</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTranslatorInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>{t('translator_info')}</span>
        </CardTitle>
        <CardDescription>{t('translator_info_desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="translatorFirstName">{t('first_name')} *</Label>
            <Input
              id="translatorFirstName"
              value={formData.translatorFirstName}
              onChange={(e) => handleInputChange('translatorFirstName', e.target.value)}
              className={errors.translatorFirstName ? 'border-red-500' : ''}
            />
            {errors.translatorFirstName && (
              <p className="text-red-600 text-sm mt-1">{errors.translatorFirstName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="translatorLastName">{t('last_name')} *</Label>
            <Input
              id="translatorLastName"
              value={formData.translatorLastName}
              onChange={(e) => handleInputChange('translatorLastName', e.target.value)}
              className={errors.translatorLastName ? 'border-red-500' : ''}
            />
            {errors.translatorLastName && (
              <p className="text-red-600 text-sm mt-1">{errors.translatorLastName}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="translatorAddress">{t('address')}</Label>
            <Input
              id="translatorAddress"
              value={formData.translatorAddress}
              onChange={(e) => handleInputChange('translatorAddress', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="translatorCity">{t('city')}</Label>
            <Input
              id="translatorCity"
              value={formData.translatorCity}
              onChange={(e) => handleInputChange('translatorCity', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="translatorState">{t('state')}</Label>
            <Input
              id="translatorState"
              value={formData.translatorState}
              onChange={(e) => handleInputChange('translatorState', e.target.value)}
              maxLength={2}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Show compliance warning for employees
  if (currentUserRole === 'employee' && !showComplianceWarning) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <Alert className="max-w-2xl border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">{t('compliance_warning')}</h3>
              <p>{t('employee_warning')}</p>
              <p className="text-sm">{t('role_restriction')}</p>
              <div className="flex justify-end space-x-3 mt-4">
                <Button variant="outline" onClick={onBack}>
                  {t('back')}
                </Button>
                <Button variant="outline" onClick={onSkip}>
                  {t('skip')}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (showSignature) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <FileText className="h-12 w-12 text-blue-600 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900">{t('supplement_a_title')}</h2>
          <p className="text-gray-600 mt-2">Preparer/Translator Signature Required</p>
        </div>

        <DigitalSignatureCapture
          documentName="Form I-9 Supplement A - Preparer and/or Translator Certification"
          signerName={`${formData.preparerFirstName} ${formData.preparerLastName}`}
          signerTitle="Preparer/Translator"
          acknowledgments={[
            t('preparer_certification'),
            isTranslatorDifferent ? t('translator_certification').replace('[language]', formData.languageSpoken) : ''
          ].filter(Boolean)}
          requireIdentityVerification={false}
          language={language}
          onSignatureComplete={handleSignature}
          onCancel={() => setShowSignature(false)}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="text-center mb-3">
        <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">{t('supplement_a_title')}</h2>
        <p className="text-gray-600 text-sm mt-1">{t('supplement_a_subtitle')}</p>
      </div>
      
      {/* Federal Compliance Notice */}
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <p className="text-sm font-medium">{t('auto_fill_disabled')}</p>
        </AlertDescription>
      </Alert>

      <div className="flex-1 overflow-auto">
        {currentStep === 0 && renderPreparerInfo()}
        {currentStep === 1 && renderTranslatorInfo()}
      </div>

      {/* Navigation - Prominent buttons */}
      <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onBack} className="h-12 px-6">
          {t('back')}
        </Button>
        
        <div className="flex space-x-3">
          <Button variant="ghost" onClick={onSkip} className="h-12 px-6">
            {t('skip')}
          </Button>
          <Button onClick={handleNext} className="h-12 px-8 text-base font-semibold">
            {currentStep === 0 && !isTranslatorDifferent ? t('sign_document') : 
             currentStep === 1 ? t('sign_document') : t('next')}
          </Button>
        </div>
      </div>
    </div>
  );
}