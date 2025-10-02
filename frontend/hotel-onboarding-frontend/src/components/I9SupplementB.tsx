import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, RefreshCw, Info, AlertCircle, Shield, Lock } from 'lucide-react';
import DigitalSignatureCapture from './DigitalSignatureCapture';
import { useAuth } from '@/contexts/AuthContext';

interface I9SupplementBData {
  // Employee Information (from Section 1)
  employeeLastName: string;
  employeeFirstName: string;
  employeeMiddleInitial: string;
  
  // New Document Information
  newDocumentTitle: string;
  newDocumentNumber: string;
  newExpirationDate: string;
  
  // Previous Document Information (what's being reverified)
  previousDocumentTitle: string;
  previousDocumentNumber: string;
  previousExpirationDate: string;
  
  // Reverification Details
  reverificationReason: 'expiration' | 'name_change' | 'employment_authorization_renewal' | 'other';
  reverificationReasonOther: string;
  reverificationDate: string;
  
  // Signature
  employeeSignature?: string;
  signatureDate: string;
}

interface I9SupplementBProps {
  employeeData: any; // Data from I-9 Section 1
  initialData?: Partial<I9SupplementBData>;
  language: 'en' | 'es';
  onComplete: (data: I9SupplementBData) => void;
  onSkip: () => void;
  onBack: () => void;
  currentUserRole?: 'hr' | 'manager' | 'employee';
}

// Common I-9 acceptable documents
const ACCEPTABLE_DOCUMENTS = [
  'U.S. Passport',
  'U.S. Passport Card',
  'Permanent Resident Card (Form I-551)',
  'Employment Authorization Document (Form I-766)',
  'Driver\'s License',
  'State ID Card',
  'Social Security Account Number Card',
  'Certification of Birth Abroad',
  'Original Birth Certificate',
  'U.S. Military Card',
  'Native American Tribal Document'
];

export default function I9SupplementB({
  employeeData,
  initialData = {},
  language,
  onComplete,
  onSkip,
  onBack,
  currentUserRole
}: I9SupplementBProps) {
  const { user } = useAuth();
  const userRole = currentUserRole || user?.role || 'employee';
  const [formData, setFormData] = useState<I9SupplementBData>({
    // CRITICAL FIX: Use employeeData for display ONLY, not for form input auto-fill
    // Employee information should be read-only display from Section 1, not editable
    employeeLastName: employeeData?.employee_last_name || '',
    employeeFirstName: employeeData?.employee_first_name || '',
    employeeMiddleInitial: employeeData?.employee_middle_initial || '',
    newDocumentTitle: '',
    newDocumentNumber: '',
    newExpirationDate: '',
    previousDocumentTitle: '',
    previousDocumentNumber: '',
    previousExpirationDate: '',
    reverificationReason: 'expiration',
    reverificationReasonOther: '',
    reverificationDate: new Date().toISOString().split('T')[0],
    signatureDate: new Date().toISOString().split('T')[0],
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSignature, setShowSignature] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'supplement_b_title': 'Form I-9 Supplement B',
        'supplement_b_subtitle': 'Reverification and Rehire',
        'supplement_b_desc': 'This supplement is used when an employee\'s work authorization expires and needs to be renewed, or when rehiring within three years.',
        'employee_info': 'Employee Information',
        'employee_info_desc': 'Information from original I-9 Section 1',
        'reverification_details': 'Reverification Details',
        'new_document_info': 'New Document Information',
        'new_document_desc': 'Present new document(s) that establish continued work authorization',
        'previous_document_info': 'Previous Document Information',
        'previous_document_desc': 'Document(s) that are being renewed or replaced',
        'first_name': 'First Name',
        'last_name': 'Last Name',
        'middle_initial': 'Middle Initial',
        'document_title': 'Document Title',
        'document_number': 'Document Number',
        'expiration_date': 'Expiration Date',
        'reverification_reason': 'Reason for Reverification',
        'reverification_date': 'Date of Reverification',
        'reason_expiration': 'Work authorization expired',
        'reason_name_change': 'Name change',
        'reason_renewal': 'Employment authorization renewal',
        'reason_other': 'Other (specify)',
        'other_reason': 'Other Reason (specify)',
        'certification': 'Employee Certification',
        'certification_statement': 'I attest, under penalty of perjury, that I am eligible to work in the United States and that the document(s) I have presented are genuine and relate to me.',
        'required': 'Required',
        'next': 'Next',
        'back': 'Back',
        'skip': 'Skip This Supplement',
        'sign_document': 'Sign Document',
        'complete': 'Complete Supplement B',
        'access_denied': 'Access Denied',
        'employee_access_denied': 'Employees cannot complete Form I-9 Supplement B. This form must be completed by your employer (HR or Manager).',
        'federal_requirement': 'Federal law requires that reverification and rehire documentation be completed by the employer only.',
        'contact_hr': 'Please contact your HR department or manager if work authorization reverification is needed.',
        'role_restriction': 'Role Restriction: {role} access',
        'manager_only': 'Manager/HR Use Only',
        'compliance_notice': 'Federal Compliance Notice',
        'reverification_notice': 'This form is used for reverifying employee work authorization. Only authorized employer representatives may complete this form.'
      },
      es: {
        'supplement_b_title': 'Formulario I-9 Suplemento B',
        'supplement_b_subtitle': 'Reverificación y Recontratación',
        'supplement_b_desc': 'Este suplemento se usa cuando la autorización de trabajo de un empleado expira y necesita renovarse, o al recontratar dentro de tres años.',
        'first_name': 'Nombre',
        'last_name': 'Apellido',
        'next': 'Siguiente',
        'back': 'Atrás',
        'skip': 'Omitir Este Suplemento',
        'complete': 'Completar Suplemento B'
      }
    };
    return translations[language][key] || key;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate new document information
    if (!formData.newDocumentTitle.trim()) {
      newErrors.newDocumentTitle = t('required');
    }
    if (!formData.newDocumentNumber.trim()) {
      newErrors.newDocumentNumber = t('required');
    }

    // Validate previous document information
    if (!formData.previousDocumentTitle.trim()) {
      newErrors.previousDocumentTitle = t('required');
    }

    // Validate reverification reason
    if (formData.reverificationReason === 'other' && !formData.reverificationReasonOther.trim()) {
      newErrors.reverificationReasonOther = t('required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof I9SupplementBData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNext = () => {
    if (validateForm()) {
      setShowSignature(true);
    }
  };

  const handleSignature = (signatureData: any) => {
    const updatedData = {
      ...formData,
      employeeSignature: signatureData.signatureData
    };
    onComplete(updatedData);
  };

  // Show access denied screen for employees
  if (userRole === 'employee') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <Alert className="max-w-2xl border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <Lock className="h-5 w-5 text-red-600 mt-0.5" />
            <AlertDescription className="text-red-900">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {t('access_denied')}
                </h3>
                <p className="font-medium">{t('employee_access_denied')}</p>
                <div className="bg-red-100 p-3 rounded-md border border-red-300">
                  <p className="text-sm">
                    <strong>{t('federal_requirement')}</strong>
                  </p>
                </div>
                <p className="text-sm">{t('contact_hr')}</p>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button variant="outline" onClick={onBack}>
                    {t('back')}
                  </Button>
                  <Button variant="outline" onClick={onSkip}>
                    {t('skip')}
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </div>
        </Alert>
      </div>
    );
  }

  if (showSignature) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <FileText className="h-12 w-12 text-blue-600 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900">{t('supplement_b_title')}</h2>
          <p className="text-gray-600 mt-2">Employer Representative Signature Required</p>
        </div>

        <DigitalSignatureCapture
          documentName="Form I-9 Supplement B - Reverification and Rehire"
          signerName={user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : 'Employer Representative'}
          signerTitle={userRole === 'hr' ? 'HR Representative' : 'Manager'}
          acknowledgments={[
            'I attest, under penalty of perjury, that I have examined the document(s) presented by the above-named employee, that the document(s) reasonably appear to be genuine and to relate to the employee named, and that the employee is authorized to work in the United States.',
            'I am aware that federal law provides for imprisonment and/or fines for false statements or use of false documents in connection with the completion of this form.'
          ]}
          requireIdentityVerification={true}
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
        <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">{t('supplement_b_title')}</h2>
        <p className="text-gray-600 text-sm mt-1">{t('supplement_b_subtitle')}</p>
        {/* Role Badge */}
        <div className="mt-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Shield className="h-3 w-3 mr-1" />
            {t('manager_only')}
          </Badge>
        </div>
      </div>
      
      {/* Compliance Notice */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <Info className="h-4 w-4 text-yellow-700" />
        <AlertDescription className="text-yellow-900">
          <p className="text-sm font-medium">{t('compliance_notice')}</p>
          <p className="text-xs mt-1">{t('reverification_notice')}</p>
        </AlertDescription>
      </Alert>

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
          {t('supplement_b_desc')}
        </div>
      </details>

      <div className="flex-1 overflow-auto space-y-3">

      {/* Employee Information */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('employee_info')}</CardTitle>
          <CardDescription className="text-sm">{t('employee_info_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs font-medium">{t('last_name')}</Label>
              <div className="p-2 bg-gray-50 rounded border text-sm">
                {formData.employeeLastName}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('first_name')}</Label>
              <div className="p-2 bg-gray-50 rounded border text-sm">
                {formData.employeeFirstName}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('middle_initial')}</Label>
              <div className="p-2 bg-gray-50 rounded border text-sm">
                {formData.employeeMiddleInitial || 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reverification Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reverification_details')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reverificationReason">{t('reverification_reason')} *</Label>
              <Select 
                value={formData.reverificationReason} 
                onValueChange={(value) => handleInputChange('reverificationReason', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expiration">{t('reason_expiration')}</SelectItem>
                  <SelectItem value="name_change">{t('reason_name_change')}</SelectItem>
                  <SelectItem value="employment_authorization_renewal">{t('reason_renewal')}</SelectItem>
                  <SelectItem value="other">{t('reason_other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reverificationDate">{t('reverification_date')} *</Label>
              <Input
                id="reverificationDate"
                type="date"
                value={formData.reverificationDate}
                onChange={(e) => handleInputChange('reverificationDate', e.target.value)}
              />
            </div>
          </div>

          {formData.reverificationReason === 'other' && (
            <div>
              <Label htmlFor="reverificationReasonOther">{t('other_reason')} *</Label>
              <Input
                id="reverificationReasonOther"
                value={formData.reverificationReasonOther}
                onChange={(e) => handleInputChange('reverificationReasonOther', e.target.value)}
                className={errors.reverificationReasonOther ? 'border-red-500' : ''}
                placeholder="Please specify the reason"
              />
              {errors.reverificationReasonOther && (
                <p className="text-red-600 text-sm mt-1">{errors.reverificationReasonOther}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Document Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('new_document_info')}</CardTitle>
          <CardDescription>{t('new_document_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="newDocumentTitle">{t('document_title')} *</Label>
              <Select 
                value={formData.newDocumentTitle} 
                onValueChange={(value) => handleInputChange('newDocumentTitle', value)}
              >
                <SelectTrigger className={errors.newDocumentTitle ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  {ACCEPTABLE_DOCUMENTS.map(doc => (
                    <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.newDocumentTitle && (
                <p className="text-red-600 text-sm mt-1">{errors.newDocumentTitle}</p>
              )}
            </div>

            <div>
              <Label htmlFor="newDocumentNumber">{t('document_number')} *</Label>
              <Input
                id="newDocumentNumber"
                value={formData.newDocumentNumber}
                onChange={(e) => handleInputChange('newDocumentNumber', e.target.value)}
                className={errors.newDocumentNumber ? 'border-red-500' : ''}
                placeholder="Document number"
              />
              {errors.newDocumentNumber && (
                <p className="text-red-600 text-sm mt-1">{errors.newDocumentNumber}</p>
              )}
            </div>

            <div>
              <Label htmlFor="newExpirationDate">{t('expiration_date')}</Label>
              <Input
                id="newExpirationDate"
                type="date"
                value={formData.newExpirationDate}
                onChange={(e) => handleInputChange('newExpirationDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Previous Document Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('previous_document_info')}</CardTitle>
          <CardDescription>{t('previous_document_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="previousDocumentTitle">{t('document_title')} *</Label>
              <Select 
                value={formData.previousDocumentTitle} 
                onValueChange={(value) => handleInputChange('previousDocumentTitle', value)}
              >
                <SelectTrigger className={errors.previousDocumentTitle ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  {ACCEPTABLE_DOCUMENTS.map(doc => (
                    <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.previousDocumentTitle && (
                <p className="text-red-600 text-sm mt-1">{errors.previousDocumentTitle}</p>
              )}
            </div>

            <div>
              <Label htmlFor="previousDocumentNumber">{t('document_number')}</Label>
              <Input
                id="previousDocumentNumber"
                value={formData.previousDocumentNumber}
                onChange={(e) => handleInputChange('previousDocumentNumber', e.target.value)}
                placeholder="Previous document number"
              />
            </div>

            <div>
              <Label htmlFor="previousExpirationDate">{t('expiration_date')}</Label>
              <Input
                id="previousExpirationDate"
                type="date"
                value={formData.previousExpirationDate}
                onChange={(e) => handleInputChange('previousExpirationDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
            {t('sign_document')}
          </Button>
        </div>
      </div>
    </div>
  );
}