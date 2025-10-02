import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, Download, Eye, Calculator, AlertTriangle } from 'lucide-react';
import DigitalSignatureCapture from './DigitalSignatureCapture';

interface OfficialW4DisplayProps {
  employeeData: any;
  language: 'en' | 'es';
  onSignatureComplete: (signedPdfData: string) => void;
  onBack: () => void;
  showSignature: boolean;
  setShowSignature: (show: boolean) => void;
}

export default function OfficialW4Display({
  employeeData,
  language,
  onSignatureComplete,
  onBack,
  showSignature,
  setShowSignature
}: OfficialW4DisplayProps) {
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'w4_form_title': 'Official Form W-4',
        'withholding_certificate': 'Employee\'s Withholding Certificate',
        'loading_form': 'Loading official W-4 form...',
        'form_description': 'This is the official IRS Form W-4 with your tax withholding information. Please review all details carefully before signing.',
        'review_instructions': 'Please scroll through the entire form to review your tax withholding elections. Once you have reviewed everything, click "Sign Form" to provide your digital signature.',
        'download_form': 'Download Form',
        'sign_form': 'Sign Form W-4',
        'back': 'Back',
        'error_loading': 'Error loading W-4 form. Please try again.',
        'retry': 'Retry',
        'pdf_not_supported': 'Your browser does not support PDF viewing. Please download the form to view it.',
        'signature_required': 'Digital signature required to complete Form W-4',
        'final_certification': 'Employee Certification',
        'tax_notice': 'Tax Withholding Notice',
        'tax_notice_text': 'This certificate is subject to review by the IRS. Complete a new Form W-4 when your personal or financial situation changes.'
      },
      es: {
        'w4_form_title': 'Formulario Oficial W-4',
        'withholding_certificate': 'Certificado de Retención del Empleado',
        'loading_form': 'Cargando formulario oficial W-4...',
        'form_description': 'Este es el formulario oficial IRS W-4 con su información de retención de impuestos. Por favor revise todos los detalles cuidadosamente antes de firmar.',
        'download_form': 'Descargar Formulario',
        'sign_form': 'Firmar Formulario W-4',
        'back': 'Atrás',
        'error_loading': 'Error cargando el formulario W-4. Por favor intente de nuevo.',
        'retry': 'Reintentar'
      }
    };
    return translations[language][key] || key;
  };

  useEffect(() => {
    generateW4PDF();
  }, [employeeData]);

  const generateW4PDF = async () => {
    try {
      setLoading(true);
      setError(null);

      // CRITICAL: Use official IRS W-4 PDF template for tax compliance
      console.log('🚨 IRS COMPLIANCE: Generating official W-4 PDF with employee data:', employeeData);
      
      // Validate that we have all required fields for IRS compliance
      const requiredFields = ['first_name', 'last_name', 'ssn', 'address', 'city', 'state', 'zip_code', 'filing_status'];
      const missingFields = requiredFields.filter(field => !employeeData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`IRS compliance violation: Missing required W-4 fields: ${missingFields.join(', ')}`);
      }
      
      const response = await fetch('/api/api/forms/w4/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        },
        body: JSON.stringify({
          employee_data: {
            ...employeeData,
            signature_date: new Date().toISOString().split('T')[0]
          },
          use_official_template: true, // ENFORCE official IRS template only
          irs_compliance_required: true, // Flag for backend validation
          form_type: 'w4_2025_official',
          tax_year: 2025
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate official W-4 form: ${response.status} ${response.statusText}`);
      }

      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPdfData(pdfUrl);
      console.log('✅ Official W-4 PDF generated successfully');

    } catch (error) {
      console.error('Error generating W-4 PDF:', error);
      setError('Failed to load W-4 form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // REMOVED: Mock form display - Federal compliance requires official templates only

  const handleDownload = () => {
    if (pdfData) {
      const link = document.createElement('a');
      link.href = pdfData;
      link.download = 'w4-form.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const calculateEstimatedTax = () => {
    // Simplified tax calculation for display purposes
    const income = parseFloat(employeeData?.annual_income || '0');
    const otherIncome = parseFloat(employeeData?.other_income || '0');
    const deductions = parseFloat(employeeData?.deductions || '0');
    const totalIncome = income + otherIncome;
    const taxableIncome = Math.max(0, totalIncome - deductions - 12950); // Standard deduction estimate
    
    // Simplified tax brackets (2025 rates for single filer)
    let tax = 0;
    if (taxableIncome > 0) {
      if (taxableIncome <= 11000) {
        tax = taxableIncome * 0.10;
      } else if (taxableIncome <= 44725) {
        tax = 1100 + (taxableIncome - 11000) * 0.12;
      } else if (taxableIncome <= 95375) {
        tax = 5147 + (taxableIncome - 44725) * 0.22;
      } else {
        tax = 16290 + (taxableIncome - 95375) * 0.24;
      }
    }
    
    return tax;
  };

  const handleSignature = async (signatureData: any) => {
    try {
      setLoading(true);
      
      // OFFICIAL SIGNATURE PROCESSING: Use only backend API for signature embedding
      const response = await fetch(pdfData!);
      const pdfBlob = await response.blob();
      const pdfArrayBuffer = await pdfBlob.arrayBuffer();
      const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));

      // Add signature to official PDF
      const signatureResponse = await fetch('/api/forms/w4/add-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        },
        body: JSON.stringify({
          pdf_data: pdfBase64,
          signature: signatureData.signatureData,
          signature_type: 'employee_w4',
          page_num: 0,
          use_official_template: true
        })
      });

      if (!signatureResponse.ok) {
        throw new Error(`Failed to add signature to official W-4: ${signatureResponse.status}`);
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
          documentName="Form W-4 - Employee's Withholding Certificate"
          signerName={`${employeeData?.first_name} ${employeeData?.last_name}`}
          signerTitle="Employee"
          acknowledgments={[
            "Under penalties of perjury, I declare that this certificate, to the best of my knowledge and belief, is true, correct, and complete."
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
        <h2 className="text-2xl font-bold text-gray-900">{t('w4_form_title')}</h2>
        <p className="text-gray-600 mt-2">{t('withholding_certificate')}</p>
      </div>

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          {t('form_description')}
        </AlertDescription>
      </Alert>

      {/* Tax Summary Card */}
      {employeeData?.annual_income && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-900">
              <Calculator className="h-5 w-5" />
              <span>Tax Withholding Summary</span>
            </CardTitle>
            <CardDescription className="text-green-700">
              Estimated annual tax calculation based on your entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="font-medium text-gray-600">Estimated Annual Tax</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(calculateEstimatedTax())}
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="font-medium text-gray-600">Filing Status</p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  {employeeData?.filing_status?.replace('_', ' ')?.replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Single'}
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="font-medium text-gray-600">Extra Withholding</p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  {formatCurrency(employeeData?.extra_withholding || 0)} per pay period
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert className="border-blue-200 bg-blue-50">
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>{t('tax_notice')}:</strong> {t('tax_notice_text')}
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
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <p className="text-lg font-bold text-red-800">IRS COMPLIANCE ERROR</p>
              </div>
              <p className="text-red-800 mb-4">{error}</p>
              <div className="bg-red-100 p-4 rounded border border-red-300">
                <p className="text-sm text-red-700 font-medium">
                  CRITICAL: The W-4 form cannot be legally processed without the official IRS template.
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Reference: Internal Revenue Code Section 3402
                </p>
              </div>
              <Button onClick={generateW4PDF} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
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
              <span>Form W-4 Preview</span>
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