import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, Download, Eye } from 'lucide-react';
import DigitalSignatureCapture from './DigitalSignatureCapture';

interface OfficialI9DisplayProps {
  employeeData: any;
  employerData?: any;
  language: 'en' | 'es';
  onSignatureComplete: (signedPdfData: string) => void;
  onBack: () => void;
  showSignature: boolean;
  setShowSignature: (show: boolean) => void;
}

export default function OfficialI9Display({
  employeeData,
  employerData,
  language,
  onSignatureComplete,
  onBack,
  showSignature,
  setShowSignature
}: OfficialI9DisplayProps) {
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'i9_form_title': 'Official Form I-9',
        'employment_verification': 'Employment Eligibility Verification',
        'loading_form': 'Loading official I-9 form...',
        'form_description': 'This is the official USCIS Form I-9 with your information filled in. Please review all details carefully before signing.',
        'review_instructions': 'Please scroll through the entire form to review all information. Once you have reviewed everything, click "Sign Form" to provide your digital signature.',
        'download_form': 'Download Form',
        'sign_form': 'Sign Form I-9',
        'back': 'Back',
        'error_loading': 'Error loading I-9 form. Please try again.',
        'retry': 'Retry',
        'pdf_not_supported': 'Your browser does not support PDF viewing. Please download the form to view it.',
        'signature_required': 'Digital signature required to complete Form I-9',
        'final_certification': 'Final Employee Certification'
      },
      es: {
        'i9_form_title': 'Formulario Oficial I-9',
        'employment_verification': 'Verificación de Elegibilidad para el Empleo',
        'loading_form': 'Cargando formulario oficial I-9...',
        'form_description': 'Este es el formulario oficial USCIS I-9 con su información completada. Por favor revise todos los detalles cuidadosamente antes de firmar.',
        'download_form': 'Descargar Formulario',
        'sign_form': 'Firmar Formulario I-9',
        'back': 'Atrás',
        'error_loading': 'Error cargando el formulario I-9. Por favor intente de nuevo.',
        'retry': 'Reintentar'
      }
    };
    return translations[language][key] || key;
  };

  useEffect(() => {
    generateI9PDF();
  }, [employeeData, employerData]);

  const generateI9PDF = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate that we have employee data
      if (!employeeData || Object.keys(employeeData).length === 0) {
        throw new Error('Employee data is required to generate I-9 form');
      }

      // CRITICAL: Use official USCIS I-9 PDF template for federal compliance
      console.log('🚨 FEDERAL COMPLIANCE: Generating official I-9 PDF with employee data:', employeeData);
      
      // Validate that we have all required fields for federal compliance
      const requiredFields = ['employee_first_name', 'employee_last_name', 'citizenship_status', 'date_of_birth', 'ssn', 'address_street', 'address_city', 'address_state', 'address_zip'];
      const missingFields = requiredFields.filter(field => !employeeData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Federal compliance violation: Missing required I-9 fields: ${missingFields.join(', ')}`);
      }
      
      const response = await fetch('/api/api/forms/i9/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'test-token'}`
        },
        body: JSON.stringify({
          employee_data: employeeData,
          employer_data: employerData,
          use_official_template: true, // ENFORCE official USCIS template only
          federal_compliance_required: true, // Flag for backend validation
          form_type: 'i9_section1_official'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate official I-9 form: ${response.status} ${response.statusText}`);
      }

      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPdfData(pdfUrl);
      console.log('✅ Official I-9 PDF generated successfully');

    } catch (error) {
      console.error('Critical error generating I-9 PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to load I-9 form: ${errorMessage}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // REMOVED: Mock form display - Federal compliance requires official templates only

  const handleDownload = () => {
    if (pdfData) {
      const link = document.createElement('a');
      link.href = pdfData;
      link.download = 'i9-form.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSignature = async (signatureData: any) => {
    try {
      setLoading(true);
      
      // Convert PDF URL to base64 for signature embedding
      const response = await fetch(pdfData!);
      const pdfBlob = await response.blob();
      const pdfArrayBuffer = await pdfBlob.arrayBuffer();
      const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));

      // Add signature to PDF
      const signatureResponse = await fetch('/api/forms/i9/add-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pdf_data: pdfBase64,
          signature: signatureData.signatureData,
          signature_type: 'employee_i9',
          page_num: 0
        })
      });

      if (!signatureResponse.ok) {
        throw new Error('Failed to add signature to I-9');
      }

      const signedPdfBlob = await signatureResponse.blob();
      const signedPdfArrayBuffer = await signedPdfBlob.arrayBuffer();
      const signedPdfBase64 = btoa(String.fromCharCode(...new Uint8Array(signedPdfArrayBuffer)));

      // Pass signed PDF back to parent component
      onSignatureComplete(signedPdfBase64);

    } catch (error) {
      console.error('Error adding signature:', error);
      setError('Failed to add signature. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showSignature) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <FileText className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900">{t('final_certification')}</h2>
          <p className="text-gray-600 mt-2">{t('signature_required')}</p>
        </div>

        <DigitalSignatureCapture
          documentName="Form I-9 - Employment Eligibility Verification"
          signerName={`${employeeData?.employee_first_name} ${employeeData?.employee_last_name}`}
          signerTitle="Employee"
          acknowledgments={[
            "I attest, under penalty of perjury, that I have reviewed the information I provided in Section 1 of this form, and any applicable supplements, and that it is complete, true and correct."
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
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Eye className="h-12 w-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900">{t('i9_form_title')}</h2>
        <p className="text-gray-600 mt-2">{t('employment_verification')}</p>
      </div>

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          {t('form_description')}
        </AlertDescription>
      </Alert>

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>{t('loading_form')}</span>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-red-800 mb-4">{error}</p>
              <Button onClick={generateI9PDF} variant="outline">
                {t('retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pdfData && !loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Form I-9 Preview</span>
              <div className="flex space-x-2">
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {t('download_form')}
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              {t('review_instructions')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* PDF Viewer */}
            <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
              <object
                data={pdfData}
                type="application/pdf"
                width="100%"
                height="100%"
                className="w-full h-full"
              >
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">{t('pdf_not_supported')}</p>
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      {t('download_form')}
                    </Button>
                  </div>
                </div>
              </object>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-6 pt-6 border-t">
              <Button variant="outline" onClick={onBack}>
                {t('back')}
              </Button>
              
              <Button onClick={() => setShowSignature(true)} className="px-8">
                {t('sign_form')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}