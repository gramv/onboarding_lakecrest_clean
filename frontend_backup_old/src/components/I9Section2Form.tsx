import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, CheckCircle, AlertTriangle, Info, Building } from 'lucide-react';
import DigitalSignatureCapture from './DigitalSignatureCapture';

interface I9Section2Data {
  // Document List A (Identity and Work Authorization)
  listADocuments: {
    documentTitle: string;
    issuingAuthority: string;
    documentNumber: string;
    expirationDate: string;
  }[];
  
  // Document List B (Identity) + List C (Work Authorization)
  listBDocument: {
    documentTitle: string;
    issuingAuthority: string;
    documentNumber: string;
    expirationDate: string;
  };
  
  listCDocument: {
    documentTitle: string;
    issuingAuthority: string;
    documentNumber: string;
    expirationDate: string;
  };
  
  // Employment information
  firstDayOfEmployment: string;
  employerName: string;
  employerAddress: string;
  
  // Manager/HR representative information
  reviewerName: string;
  reviewerTitle: string;
  reviewerDate: string;
  reviewerSignature: string;
  
  // Additional information
  additionalInfo: string;
  documentVerificationMethod: 'in_person' | 'remote' | 'alternative';
  
  // Reverification (if applicable)
  isReverification: boolean;
  reverificationDate: string;
  reverificationDocuments: string;
}

interface I9Section2FormProps {
  employeeData: any; // Data from Section 1
  onSave: (data: I9Section2Data) => void;
  onNext: () => void;
  onBack: () => void;
  language?: 'en' | 'es';
}

// Common acceptable documents for I-9
const LIST_A_DOCUMENTS = [
  'U.S. Passport',
  'U.S. Passport Card',
  'Permanent Resident Card',
  'Employment Authorization Document (EAD)',
  'Driver\'s License and Social Security Card',
  'Foreign Passport with I-551 stamp',
  'Driver\'s License and I-94'
];

const LIST_B_DOCUMENTS = [
  'Driver\'s License',
  'State ID Card',
  'U.S. Military Card',
  'Military Dependent ID Card',
  'U.S. Coast Guard Merchant Mariner Card',
  'Native American Tribal Document',
  'School ID with Photo'
];

const LIST_C_DOCUMENTS = [
  'Social Security Account Number Card',
  'Certification of Birth Abroad',
  'Original Birth Certificate',
  'Native American Tribal Document',
  'U.S. Citizen ID Card',
  'Employment Authorization Document'
];

export default function I9Section2Form({
  employeeData,
  onSave,
  onNext,
  onBack,
  language = 'en'
}: I9Section2FormProps) {
  const [formData, setFormData] = useState<I9Section2Data>({
    listADocuments: [],
    listBDocument: {
      documentTitle: '',
      issuingAuthority: '',
      documentNumber: '',
      expirationDate: ''
    },
    listCDocument: {
      documentTitle: '',
      issuingAuthority: '',
      documentNumber: '',
      expirationDate: ''
    },
    firstDayOfEmployment: '',
    employerName: 'Hotel Property Name', // This would come from company data
    employerAddress: '',
    reviewerName: '',
    reviewerTitle: '',
    reviewerDate: new Date().toISOString().split('T')[0],
    reviewerSignature: '',
    additionalInfo: '',
    documentVerificationMethod: 'in_person',
    isReverification: false,
    reverificationDate: '',
    reverificationDocuments: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState<'listA' | 'listB_and_C'>('listA');

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'i9_section2': 'Form I-9, Section 2: Employer or Authorized Representative Review and Verification',
        'i9_section2_desc': 'Complete this section within 3 business days of the employee\'s first day of employment.',
        'employee_info': 'Employee Information (from Section 1)',
        'document_verification': 'Document Verification',
        'employment_info': 'Employment Information', 
        'employer_certification': 'Employer Certification',
        'list_a_option': 'List A - Documents that Establish Both Identity and Employment Authorization',
        'list_b_c_option': 'List B - Identity Document AND List C - Employment Authorization Document',
        'document_title': 'Document Title',
        'issuing_authority': 'Issuing Authority',
        'document_number': 'Document Number',
        'expiration_date': 'Expiration Date',
        'first_day_employment': 'Employee\'s First Day of Employment',
        'employer_name': 'Employer Name',
        'employer_address': 'Employer Address',
        'reviewer_name': 'Name of Employer or Authorized Representative',
        'reviewer_title': 'Title',
        'reviewer_signature': 'Signature',
        'verification_method': 'Document Verification Method',
        'in_person': 'In Person',
        'remote': 'Remote (with acceptable alternative procedures)',
        'alternative': 'Alternative procedure (if authorized)',
        'additional_info': 'Additional Information',
        'reverification': 'Reverification',
        'reverification_required': 'This is a reverification',
        'certification_statement': 'I attest, under penalty of perjury, that (1) I have examined the document(s) presented by the above-named employee, (2) the above-listed document(s) appear to be genuine and to relate to the employee named, and (3) to the best of my knowledge the employee is authorized to work in the United States.',
        'next': 'Next',
        'back': 'Back',
        'save_continue': 'Save & Continue',
        'complete_section2': 'Complete Section 2',
        'required': 'Required',
        'step_of': 'Step {current} of {total}'
      },
      es: {
        'i9_section2': 'Formulario I-9, Sección 2: Revisión y Verificación del Empleador o Representante Autorizado',
        'i9_section2_desc': 'Complete esta sección dentro de 3 días hábiles del primer día de empleo del empleado.',
        'next': 'Siguiente',
        'back': 'Atrás',
        'save_continue': 'Guardar y Continuar'
      }
    };
    return translations[language][key] || key;
  };

  const steps = [
    { id: 'documents', title: 'Document Verification' },
    { id: 'employment', title: 'Employment Information' },
    { id: 'certification', title: 'Employer Certification' }
  ];

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepIndex) {
      case 0: // Document Verification
        if (selectedDocumentCategory === 'listA') {
          if (formData.listADocuments.length === 0) {
            newErrors.listADocuments = 'At least one List A document is required';
          } else {
            formData.listADocuments.forEach((doc, index) => {
              if (!doc.documentTitle) newErrors[`listA_${index}_title`] = 'Document title is required';
              if (!doc.documentNumber) newErrors[`listA_${index}_number`] = 'Document number is required';
            });
          }
        } else {
          if (!formData.listBDocument.documentTitle) {
            newErrors.listB_title = 'List B document is required';
          }
          if (!formData.listCDocument.documentTitle) {
            newErrors.listC_title = 'List C document is required';
          }
        }
        break;

      case 1: // Employment Information
        if (!formData.firstDayOfEmployment) {
          newErrors.firstDayOfEmployment = 'First day of employment is required';
        }
        if (!formData.employerName.trim()) {
          newErrors.employerName = 'Employer name is required';
        }
        break;

      case 2: // Certification
        if (!formData.reviewerName.trim()) {
          newErrors.reviewerName = 'Reviewer name is required';
        }
        if (!formData.reviewerTitle.trim()) {
          newErrors.reviewerTitle = 'Reviewer title is required';
        }
        if (!formData.reviewerSignature) {
          newErrors.reviewerSignature = 'Signature is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    const keys = field.split('.');
    if (keys.length === 1) {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else if (keys[0] === 'listBDocument') {
      setFormData(prev => ({
        ...prev,
        listBDocument: { ...prev.listBDocument, [keys[1]]: value }
      }));
    } else if (keys[0] === 'listCDocument') {
      setFormData(prev => ({
        ...prev,
        listCDocument: { ...prev.listCDocument, [keys[1]]: value }
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addListADocument = () => {
    setFormData(prev => ({
      ...prev,
      listADocuments: [...prev.listADocuments, {
        documentTitle: '',
        issuingAuthority: '',
        documentNumber: '',
        expirationDate: ''
      }]
    }));
  };

  const updateListADocument = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      listADocuments: prev.listADocuments.map((doc, i) => 
        i === index ? { ...doc, [field]: value } : doc
      )
    }));
  };

  const removeListADocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      listADocuments: prev.listADocuments.filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const handleSubmit = () => {
    onSave(formData);
    onNext();
  };

  const handleSignature = (signatureData: any) => {
    setFormData(prev => ({ 
      ...prev, 
      reviewerSignature: signatureData.signatureData
    }));
  };

  const renderEmployeeInfo = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-semibold text-blue-900 mb-3">{t('employee_info')}</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <Label>Employee Name</Label>
          <p className="font-medium">{employeeData?.firstName} {employeeData?.lastName}</p>
        </div>
        <div>
          <Label>Date of Birth</Label>
          <p>{employeeData?.dateOfBirth || 'Not provided'}</p>
        </div>
        <div>
          <Label>Social Security Number</Label>
          <p>{employeeData?.ssn ? `***-**-${employeeData.ssn.slice(-4)}` : 'Not provided'}</p>
        </div>
        <div>
          <Label>Citizenship Status</Label>
          <p>{employeeData?.citizenshipStatus || 'Not provided'}</p>
        </div>
      </div>
    </div>
  );

  const renderDocumentVerification = () => (
    <div className="space-y-6">
      {renderEmployeeInfo()}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Examine one document from List A OR examine one document from List B and one document from List C. All documents must be originals or certified copies.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t('document_verification')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Document Category Selection</Label>
            <RadioGroup 
              value={selectedDocumentCategory} 
              onValueChange={(value) => setSelectedDocumentCategory(value as 'listA' | 'listB_and_C')}
            >
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="listA" id="listA" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="listA" className="font-medium">{t('list_a_option')}</Label>
                  <p className="text-sm text-gray-600">One document that establishes both identity and work authorization</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="listB_and_C" id="listB_and_C" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="listB_and_C" className="font-medium">{t('list_b_c_option')}</Label>
                  <p className="text-sm text-gray-600">One identity document AND one work authorization document</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {selectedDocumentCategory === 'listA' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">List A Documents</h4>
                <Button variant="outline" size="sm" onClick={addListADocument}>
                  Add Document
                </Button>
              </div>
              
              {formData.listADocuments.map((doc, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium">Document {index + 1}</h5>
                    {formData.listADocuments.length > 1 && (
                      <Button variant="outline" size="sm" onClick={() => removeListADocument(index)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>{t('document_title')} *</Label>
                      <Select 
                        value={doc.documentTitle} 
                        onValueChange={(value) => updateListADocument(index, 'documentTitle', value)}
                      >
                        <SelectTrigger className={errors[`listA_${index}_title`] ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select document" />
                        </SelectTrigger>
                        <SelectContent>
                          {LIST_A_DOCUMENTS.map(docType => (
                            <SelectItem key={docType} value={docType}>{docType}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors[`listA_${index}_title`] && (
                        <p className="text-red-600 text-sm mt-1">{errors[`listA_${index}_title`]}</p>
                      )}
                    </div>

                    <div>
                      <Label>{t('issuing_authority')}</Label>
                      <Input
                        value={doc.issuingAuthority}
                        onChange={(e) => updateListADocument(index, 'issuingAuthority', e.target.value)}
                        placeholder="e.g., Department of State"
                      />
                    </div>

                    <div>
                      <Label>{t('document_number')} *</Label>
                      <Input
                        value={doc.documentNumber}
                        onChange={(e) => updateListADocument(index, 'documentNumber', e.target.value)}
                        className={errors[`listA_${index}_number`] ? 'border-red-500' : ''}
                        placeholder="Document number"
                      />
                      {errors[`listA_${index}_number`] && (
                        <p className="text-red-600 text-sm mt-1">{errors[`listA_${index}_number`]}</p>
                      )}
                    </div>

                    <div>
                      <Label>{t('expiration_date')}</Label>
                      <Input
                        type="date"
                        value={doc.expirationDate}
                        onChange={(e) => updateListADocument(index, 'expirationDate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formData.listADocuments.length === 0 && (
                <div className="text-center py-4">
                  <Button onClick={addListADocument}>Add List A Document</Button>
                </div>
              )}

              {errors.listADocuments && (
                <p className="text-red-600 text-sm">{errors.listADocuments}</p>
              )}
            </div>
          )}

          {selectedDocumentCategory === 'listB_and_C' && (
            <div className="space-y-6">
              {/* List B Document */}
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-medium">List B - Identity Document</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('document_title')} *</Label>
                    <Select 
                      value={formData.listBDocument.documentTitle} 
                      onValueChange={(value) => handleInputChange('listBDocument.documentTitle', value)}
                    >
                      <SelectTrigger className={errors.listB_title ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select document" />
                      </SelectTrigger>
                      <SelectContent>
                        {LIST_B_DOCUMENTS.map(docType => (
                          <SelectItem key={docType} value={docType}>{docType}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.listB_title && (
                      <p className="text-red-600 text-sm mt-1">{errors.listB_title}</p>
                    )}
                  </div>

                  <div>
                    <Label>{t('issuing_authority')}</Label>
                    <Input
                      value={formData.listBDocument.issuingAuthority}
                      onChange={(e) => handleInputChange('listBDocument.issuingAuthority', e.target.value)}
                      placeholder="e.g., State DMV"
                    />
                  </div>

                  <div>
                    <Label>{t('document_number')}</Label>
                    <Input
                      value={formData.listBDocument.documentNumber}
                      onChange={(e) => handleInputChange('listBDocument.documentNumber', e.target.value)}
                      placeholder="Document number"
                    />
                  </div>

                  <div>
                    <Label>{t('expiration_date')}</Label>
                    <Input
                      type="date"
                      value={formData.listBDocument.expirationDate}
                      onChange={(e) => handleInputChange('listBDocument.expirationDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* List C Document */}
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-medium">List C - Employment Authorization Document</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('document_title')} *</Label>
                    <Select 
                      value={formData.listCDocument.documentTitle} 
                      onValueChange={(value) => handleInputChange('listCDocument.documentTitle', value)}
                    >
                      <SelectTrigger className={errors.listC_title ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select document" />
                      </SelectTrigger>
                      <SelectContent>
                        {LIST_C_DOCUMENTS.map(docType => (
                          <SelectItem key={docType} value={docType}>{docType}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.listC_title && (
                      <p className="text-red-600 text-sm mt-1">{errors.listC_title}</p>
                    )}
                  </div>

                  <div>
                    <Label>{t('issuing_authority')}</Label>
                    <Input
                      value={formData.listCDocument.issuingAuthority}
                      onChange={(e) => handleInputChange('listCDocument.issuingAuthority', e.target.value)}
                      placeholder="e.g., Social Security Administration"
                    />
                  </div>

                  <div>
                    <Label>{t('document_number')}</Label>
                    <Input
                      value={formData.listCDocument.documentNumber}
                      onChange={(e) => handleInputChange('listCDocument.documentNumber', e.target.value)}
                      placeholder="Document number"
                    />
                  </div>

                  <div>
                    <Label>{t('expiration_date')}</Label>
                    <Input
                      type="date"
                      value={formData.listCDocument.expirationDate}
                      onChange={(e) => handleInputChange('listCDocument.expirationDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>{t('verification_method')}</Label>
            <RadioGroup 
              value={formData.documentVerificationMethod} 
              onValueChange={(value) => handleInputChange('documentVerificationMethod', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="in_person" id="in_person" />
                <Label htmlFor="in_person">{t('in_person')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="remote" id="remote" />
                <Label htmlFor="remote">{t('remote')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="alternative" id="alternative" />
                <Label htmlFor="alternative">{t('alternative')}</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEmploymentInfo = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('employment_info')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstDayOfEmployment">{t('first_day_employment')} *</Label>
              <Input
                id="firstDayOfEmployment"
                type="date"
                value={formData.firstDayOfEmployment}
                onChange={(e) => handleInputChange('firstDayOfEmployment', e.target.value)}
                className={errors.firstDayOfEmployment ? 'border-red-500' : ''}
              />
              {errors.firstDayOfEmployment && (
                <p className="text-red-600 text-sm mt-1">{errors.firstDayOfEmployment}</p>
              )}
            </div>

            <div>
              <Label htmlFor="employerName">{t('employer_name')} *</Label>
              <Input
                id="employerName"
                value={formData.employerName}
                onChange={(e) => handleInputChange('employerName', e.target.value)}
                className={errors.employerName ? 'border-red-500' : ''}
                placeholder="Company name"
              />
              {errors.employerName && (
                <p className="text-red-600 text-sm mt-1">{errors.employerName}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="employerAddress">{t('employer_address')}</Label>
              <Input
                id="employerAddress"
                value={formData.employerAddress}
                onChange={(e) => handleInputChange('employerAddress', e.target.value)}
                placeholder="Company address"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="additionalInfo">{t('additional_info')}</Label>
            <textarea
              id="additionalInfo"
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Any additional information or comments"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCertification = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('employer_certification')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('certification_statement')}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reviewerName">{t('reviewer_name')} *</Label>
              <Input
                id="reviewerName"
                value={formData.reviewerName}
                onChange={(e) => handleInputChange('reviewerName', e.target.value)}
                className={errors.reviewerName ? 'border-red-500' : ''}
                placeholder="Full name"
              />
              {errors.reviewerName && (
                <p className="text-red-600 text-sm mt-1">{errors.reviewerName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="reviewerTitle">{t('reviewer_title')} *</Label>
              <Input
                id="reviewerTitle"
                value={formData.reviewerTitle}
                onChange={(e) => handleInputChange('reviewerTitle', e.target.value)}
                className={errors.reviewerTitle ? 'border-red-500' : ''}
                placeholder="Job title"
              />
              {errors.reviewerTitle && (
                <p className="text-red-600 text-sm mt-1">{errors.reviewerTitle}</p>
              )}
            </div>

            <div>
              <Label htmlFor="reviewerDate">Date *</Label>
              <Input
                id="reviewerDate"
                type="date"
                value={formData.reviewerDate}
                onChange={(e) => handleInputChange('reviewerDate', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>{t('reviewer_signature')} *</Label>
            <DigitalSignatureCapture
              documentName="Form I-9 Section 2 Employer Verification"
              signerName={formData.reviewerName || 'Manager'}
              signerTitle={formData.reviewerTitle}
              acknowledgments={[
                'I have examined the documentation presented by the employee',
                'The documentation appears to be genuine and to relate to the employee named',
                'To the best of my knowledge, the employee is authorized to work in the United States'
              ]}
              requireIdentityVerification={true}
              language={language}
              onSignatureComplete={handleSignature}
              onCancel={() => {}}
            />
            {errors.reviewerSignature && (
              <p className="text-red-600 text-sm mt-1">{errors.reviewerSignature}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderDocumentVerification();
      case 1: return renderEmploymentInfo();
      case 2: return renderCertification();
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <FileText className="h-12 w-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900">{t('i9_section2')}</h2>
        <p className="text-gray-600 mt-2">{t('i9_section2_desc')}</p>
        <Badge variant="destructive" className="mt-2">Must Complete Within 3 Business Days</Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{steps[currentStep].title}</CardTitle>
              <CardDescription>
                {t('step_of').replace('{current}', (currentStep + 1).toString()).replace('{total}', steps.length.toString())}
              </CardDescription>
            </div>
            <div className="text-sm text-gray-500">
              {currentStep + 1} / {steps.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {renderCurrentStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={handlePrevious}>
          {t('back')}
        </Button>
        <Button onClick={handleNext} className="px-8">
          {currentStep === steps.length - 1 ? t('complete_section2') : t('next')}
        </Button>
      </div>
    </div>
  );
}