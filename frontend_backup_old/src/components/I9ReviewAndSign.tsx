import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { FileText, CheckCircle, Eye, FileCheck, Users, RefreshCw, AlertCircle } from 'lucide-react';
import DigitalSignatureCapture from './DigitalSignatureCapture';
import OfficialI9Display from './OfficialI9Display';

interface I9ReviewData {
  section1Data: any;
  supplementAData?: any;
  supplementBData?: any;
  reviewAcknowledgments: boolean[];
  finalSignature?: string;
  reviewCompletedAt?: string;
}

interface I9ReviewAndSignProps {
  section1Data: any;
  supplementAData?: any;
  supplementBData?: any;
  language: 'en' | 'es';
  onComplete: (data: I9ReviewData) => void;
  onBack: () => void;
}

export default function I9ReviewAndSign({
  section1Data,
  supplementAData,
  supplementBData,
  language,
  onComplete,
  onBack
}: I9ReviewAndSignProps) {
  const [showSignature, setShowSignature] = useState(false);
  const [reviewAcknowledgments, setReviewAcknowledgments] = useState<boolean[]>([false, false, false]);

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'i9_review_title': 'Review & Sign Form I-9',
        'i9_review_subtitle': 'Employment Eligibility Verification',
        'i9_review_desc': 'Please carefully review all information you have provided in your I-9 form and supplements before signing.',
        'section1_title': 'Section 1: Employee Information and Attestation',
        'supplement_a_title': 'Supplement A: Preparer and/or Translator Certification',
        'supplement_b_title': 'Supplement B: Reverification and Rehire',
        'personal_info': 'Personal Information',
        'contact_info': 'Contact Information',
        'citizenship_info': 'Citizenship and Work Authorization',
        'preparer_info': 'Preparer Information',
        'translator_info': 'Translator Information',
        'reverification_info': 'Reverification Information',
        'document_info': 'Document Information',
        'review_acknowledgments': 'Review Acknowledgments',
        'acknowledge_1': 'I have carefully reviewed all information provided in Section 1 of Form I-9 and certify that it is complete and accurate.',
        'acknowledge_2': 'I understand that knowingly and willfully making false statements or using false documents may subject me to criminal penalties under federal law.',
        'acknowledge_3': 'I attest, under penalty of perjury, that I am eligible to work in the United States and that the information I have provided is true and correct.',
        'all_acknowledgments_required': 'All acknowledgments must be checked before signing.',
        'final_certification': 'Final Employee Certification',
        'final_cert_statement': 'I attest, under penalty of perjury, that I have reviewed the information I provided in Section 1 of this form, and any applicable supplements, and that it is complete, true and correct.',
        'first_name': 'First Name',
        'last_name': 'Last Name',
        'middle_initial': 'Middle Initial',
        'other_names': 'Other Last Names Used',
        'address': 'Address',
        'city': 'City',
        'state': 'State',
        'zip_code': 'ZIP Code',
        'date_of_birth': 'Date of Birth',
        'ssn': 'Social Security Number',
        'email': 'Email',
        'phone': 'Phone',
        'citizenship_status': 'Citizenship Status',
        'us_citizen': 'U.S. Citizen',
        'noncitizen_national': 'Noncitizen National',
        'permanent_resident': 'Lawful Permanent Resident',
        'authorized_alien': 'Alien Authorized to Work',
        'preparer_name': 'Preparer Name',
        'translator_name': 'Translator Name',
        'language_spoken': 'Language Spoken',
        'assistance_provided': 'Assistance Provided',
        'reverification_reason': 'Reverification Reason',
        'new_document': 'New Document',
        'previous_document': 'Previous Document',
        'back': 'Back',
        'sign_form': 'Sign Form I-9',
        'complete_review': 'Complete I-9 Review'
      },
      es: {
        'i9_review_title': 'Revisar y Firmar Formulario I-9',
        'i9_review_subtitle': 'Verificación de Elegibilidad para el Empleo',
        'i9_review_desc': 'Por favor revise cuidadosamente toda la información que ha proporcionado en su formulario I-9 y suplementos antes de firmar.',
        'back': 'Atrás',
        'sign_form': 'Firmar Formulario I-9',
        'complete_review': 'Completar Revisión I-9'
      }
    };
    return translations[language][key] || key;
  };

  const getCitizenshipStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'us_citizen': t('us_citizen'),
      'noncitizen_national': t('noncitizen_national'),
      'permanent_resident': t('permanent_resident'),
      'authorized_alien': t('authorized_alien')
    };
    return statusMap[status] || status;
  };

  const handleAcknowledgmentChange = (index: number, checked: boolean) => {
    const newAcknowledgments = [...reviewAcknowledgments];
    newAcknowledgments[index] = checked;
    setReviewAcknowledgments(newAcknowledgments);
  };

  const canProceedToSignature = () => {
    return reviewAcknowledgments.every(ack => ack);
  };

  const handleSignature = (signatureData: any) => {
    const reviewData: I9ReviewData = {
      section1Data,
      supplementAData,
      supplementBData,
      reviewAcknowledgments,
      finalSignature: signatureData.signatureData,
      reviewCompletedAt: new Date().toISOString()
    };
    onComplete(reviewData);
  };

  const renderSection1Review = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>{t('section1_title')}</span>
        </CardTitle>
        <CardDescription>Employee Information and Attestation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personal Information */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">{t('personal_info')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">{t('last_name')}:</span>
              <p className="mt-1">{section1Data?.employee_last_name || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">{t('first_name')}:</span>
              <p className="mt-1">{section1Data?.employee_first_name || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">{t('middle_initial')}:</span>
              <p className="mt-1">{section1Data?.employee_middle_initial || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">{t('other_names')}:</span>
              <p className="mt-1">{section1Data?.other_last_names || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">{t('date_of_birth')}:</span>
              <p className="mt-1">{section1Data?.date_of_birth ? new Date(section1Data.date_of_birth).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">{t('ssn')}:</span>
              <p className="mt-1">{section1Data?.ssn ? `***-**-${section1Data.ssn.slice(-4)}` : 'N/A'}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Address Information */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">{t('contact_info')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">{t('address')}:</span>
              <p className="mt-1">
                {section1Data?.address_street}
                {section1Data?.address_apt && `, ${section1Data.address_apt}`}
              </p>
              <p className="mt-1">
                {section1Data?.address_city}, {section1Data?.address_state} {section1Data?.address_zip}
              </p>
            </div>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-600">{t('email')}:</span>
                <p className="mt-1">{section1Data?.email || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">{t('phone')}:</span>
                <p className="mt-1">{section1Data?.phone || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Citizenship Information */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">{t('citizenship_info')}</h4>
          <div className="text-sm">
            <span className="font-medium text-gray-600">{t('citizenship_status')}:</span>
            <p className="mt-1">{getCitizenshipStatusText(section1Data?.citizenship_status)}</p>
            
            {section1Data?.citizenship_status === 'authorized_alien' && (
              <div className="mt-3 space-y-2">
                {section1Data?.uscis_number && (
                  <p><strong>USCIS Number:</strong> {section1Data.uscis_number}</p>
                )}
                {section1Data?.i94_admission_number && (
                  <p><strong>I-94 Admission Number:</strong> {section1Data.i94_admission_number}</p>
                )}
                {section1Data?.passport_number && (
                  <p><strong>Foreign Passport Number:</strong> {section1Data.passport_number}</p>
                )}
                {section1Data?.work_authorization_expiration && (
                  <p><strong>Work Authorization Expires:</strong> {new Date(section1Data.work_authorization_expiration).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSupplementAReview = () => {
    if (!supplementAData) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>{t('supplement_a_title')}</span>
          </CardTitle>
          <CardDescription>Preparer and/or Translator Certification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">{t('preparer_info')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">{t('preparer_name')}:</span>
                <p className="mt-1">{supplementAData.preparerFirstName} {supplementAData.preparerLastName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">{t('language_spoken')}:</span>
                <p className="mt-1">{supplementAData.languageSpoken}</p>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-gray-600">{t('assistance_provided')}:</span>
                <p className="mt-1">{supplementAData.assistanceProvided}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSupplementBReview = () => {
    if (!supplementBData) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5" />
            <span>{t('supplement_b_title')}</span>
          </CardTitle>
          <CardDescription>Reverification and Rehire</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">{t('reverification_info')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">{t('reverification_reason')}:</span>
                <p className="mt-1">{supplementBData.reverificationReason}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Reverification Date:</span>
                <p className="mt-1">{new Date(supplementBData.reverificationDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">{t('document_info')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-800 mb-2">{t('new_document')}</h5>
                <div className="text-sm space-y-1">
                  <p><strong>Document:</strong> {supplementBData.newDocumentTitle}</p>
                  <p><strong>Number:</strong> {supplementBData.newDocumentNumber}</p>
                  {supplementBData.newExpirationDate && (
                    <p><strong>Expires:</strong> {new Date(supplementBData.newExpirationDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              <div>
                <h5 className="font-medium text-gray-800 mb-2">{t('previous_document')}</h5>
                <div className="text-sm space-y-1">
                  <p><strong>Document:</strong> {supplementBData.previousDocumentTitle}</p>
                  {supplementBData.previousDocumentNumber && (
                    <p><strong>Number:</strong> {supplementBData.previousDocumentNumber}</p>
                  )}
                  {supplementBData.previousExpirationDate && (
                    <p><strong>Expired:</strong> {new Date(supplementBData.previousExpirationDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (showSignature) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <FileCheck className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900">{t('final_certification')}</h2>
          <p className="text-gray-600 mt-2">Final Employee Signature Required</p>
        </div>

        <DigitalSignatureCapture
          documentName="Form I-9 - Employee Review and Final Certification"
          signerName={`${section1Data?.employee_first_name} ${section1Data?.employee_last_name}`}
          signerTitle="Employee"
          acknowledgments={[
            t('final_cert_statement')
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
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">{t('i9_review_title')}</h2>
        <p className="text-lg text-gray-600 mt-2">{t('i9_review_subtitle')}</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Eye className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          {t('i9_review_desc')}
        </AlertDescription>
      </Alert>

      {/* Section 1 Review */}
      {renderSection1Review()}

      {/* Supplement A Review */}
      {renderSupplementAReview()}

      {/* Supplement B Review */}
      {renderSupplementBReview()}

      {/* Official I-9 PDF Display */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center space-x-2 text-blue-900">
            <FileCheck className="h-5 w-5" />
            <span>Official Form I-9 Preview</span>
          </CardTitle>
          <CardDescription>
            Review the official completed I-9 form with your information
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <OfficialI9Display
            employeeData={section1Data}
            employerData={undefined}
            language={language}
            onSignatureComplete={(signedPdfData) => {
              const reviewData: I9ReviewData = {
                section1Data,
                supplementAData,
                supplementBData,
                reviewAcknowledgments,
                finalSignature: signedPdfData,
                reviewCompletedAt: new Date().toISOString()
              };
              onComplete(reviewData);
            }}
            onBack={onBack}
            showSignature={showSignature}
            setShowSignature={() => {
              // Only allow signature if all acknowledgments are checked
              if (canProceedToSignature()) {
                setShowSignature(true);
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Government-Required Acknowledgments */}
      <Card className="border-2 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-amber-900">
            <CheckCircle className="h-5 w-5" />
            <span>{t('review_acknowledgments')}</span>
          </CardTitle>
          <CardDescription className="text-amber-800">
            You must acknowledge all statements before signing the I-9 form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="acknowledge-1"
                checked={reviewAcknowledgments[0]}
                onCheckedChange={(checked) => handleAcknowledgmentChange(0, checked as boolean)}
                className="mt-1"
              />
              <label htmlFor="acknowledge-1" className="text-sm text-gray-800 cursor-pointer">
                {t('acknowledge_1')}
              </label>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox
                id="acknowledge-2"
                checked={reviewAcknowledgments[1]}
                onCheckedChange={(checked) => handleAcknowledgmentChange(1, checked as boolean)}
                className="mt-1"
              />
              <label htmlFor="acknowledge-2" className="text-sm text-gray-800 cursor-pointer">
                {t('acknowledge_2')}
              </label>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox
                id="acknowledge-3"
                checked={reviewAcknowledgments[2]}
                onCheckedChange={(checked) => handleAcknowledgmentChange(2, checked as boolean)}
                className="mt-1"
              />
              <label htmlFor="acknowledge-3" className="text-sm text-gray-800 cursor-pointer">
                {t('acknowledge_3')}
              </label>
            </div>
          </div>

          {!canProceedToSignature() && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {t('all_acknowledgments_required')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        
        <Button 
          onClick={() => setShowSignature(true)}
          disabled={!canProceedToSignature()}
          className={`px-8 ${
            !canProceedToSignature() 
              ? 'opacity-50 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {t('sign_form')}
        </Button>
      </div>
    </div>
  );
}