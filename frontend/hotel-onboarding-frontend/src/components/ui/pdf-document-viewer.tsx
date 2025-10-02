/**
 * Enhanced PDF Document Viewer
 * 
 * A comprehensive component for displaying official government documents
 * and other PDFs with review, signature, and compliance features.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  FileText, 
  Download, 
  Eye, 
  Shield, 
  CheckCircle,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  Minimize
} from 'lucide-react';

interface PDFDocumentViewerProps {
  documentType: 'i9' | 'w4' | 'direct_deposit' | 'health_insurance' | 'emergency_contacts' | 'background_check' | 'employee_handbook' | 'policy_acknowledgment';
  employeeData: any;
  propertyData?: any;
  language?: 'en' | 'es';
  onSignatureRequired?: () => void;
  onDownload?: (pdfData: string) => void;
  onError?: (error: string) => void;
  showActions?: boolean;
  height?: string;
  className?: string;
}

interface DocumentConfig {
  title: string;
  subtitle: string;
  apiEndpoint: string;
  requiresSignature: boolean;
  complianceLevel: 'federal' | 'state' | 'company';
  description: string;
  estimatedReviewTime: string;
}

const DOCUMENT_CONFIGS: Record<string, DocumentConfig> = {
  i9: {
    title: 'Form I-9',
    subtitle: 'Employment Eligibility Verification',
    apiEndpoint: '/api/forms/i9/generate',
    requiresSignature: true,
    complianceLevel: 'federal',
    description: 'Official USCIS Form I-9 with your employment eligibility information.',
    estimatedReviewTime: '5-7 minutes'
  },
  w4: {
    title: 'Form W-4',
    subtitle: 'Employee\'s Withholding Certificate',
    apiEndpoint: '/api/forms/w4/generate',
    requiresSignature: true,
    complianceLevel: 'federal',
    description: 'Official IRS Form W-4 with your tax withholding preferences.',
    estimatedReviewTime: '3-5 minutes'
  },
  direct_deposit: {
    title: 'Direct Deposit Authorization',
    subtitle: 'Electronic Payroll Authorization',
    apiEndpoint: '/api/forms/direct-deposit/generate',
    requiresSignature: true,
    complianceLevel: 'company',
    description: 'Authorization form for electronic deposit of your payroll.',
    estimatedReviewTime: '2-3 minutes'
  },
  health_insurance: {
    title: 'Health Insurance Enrollment',
    subtitle: 'Employee Benefits Election',
    apiEndpoint: '/api/forms/health-insurance/generate',
    requiresSignature: true,
    complianceLevel: 'company',
    description: 'Health insurance plan selection and beneficiary information.',
    estimatedReviewTime: '4-6 minutes'
  },
  emergency_contacts: {
    title: 'Emergency Contact Information',
    subtitle: 'Emergency Notification Form',
    apiEndpoint: '/api/forms/emergency-contacts/generate',
    requiresSignature: false,
    complianceLevel: 'company',
    description: 'Emergency contact and medical information for workplace safety.',
    estimatedReviewTime: '2-3 minutes'
  },
  background_check: {
    title: 'Background Check Authorization',
    subtitle: 'Employment Screening Consent',
    apiEndpoint: '/api/forms/background-check/generate',
    requiresSignature: true,
    complianceLevel: 'federal',
    description: 'Authorization for pre-employment background verification.',
    estimatedReviewTime: '3-4 minutes'
  },
  employee_handbook: {
    title: 'Employee Handbook',
    subtitle: 'Company Policies and Procedures',
    apiEndpoint: '/api/forms/employee-handbook/generate',
    requiresSignature: false,
    complianceLevel: 'company',
    description: 'Complete guide to company policies, procedures, and expectations.',
    estimatedReviewTime: '15-20 minutes'
  },
  policy_acknowledgment: {
    title: 'Policy Acknowledgments',
    subtitle: 'Company Policy Receipt Confirmation',
    apiEndpoint: '/api/forms/policy-acknowledgment/generate',
    requiresSignature: true,
    complianceLevel: 'company',
    description: 'Acknowledgment of receipt and understanding of company policies.',
    estimatedReviewTime: '5-8 minutes'
  }
};

export default function PDFDocumentViewer({
  documentType,
  employeeData,
  propertyData,
  language = 'en',
  onSignatureRequired,
  onDownload,
  onError,
  showActions = true,
  height = '600px',
  className = ''
}: PDFDocumentViewerProps) {
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const config = DOCUMENT_CONFIGS[documentType];

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        loading: 'Loading document...',
        error_loading: 'Error loading document',
        retry: 'Retry',
        download: 'Download',
        signature_required: 'Signature Required',
        review_carefully: 'Please review this document carefully before proceeding',
        estimated_time: 'Estimated review time',
        compliance_notice: 'This document is subject to compliance requirements',
        federal_compliance: 'Federal Compliance Required',
        state_compliance: 'State Compliance Required',
        company_policy: 'Company Policy Document',
        zoom_in: 'Zoom In',
        zoom_out: 'Zoom Out',
        fullscreen: 'Fullscreen',
        exit_fullscreen: 'Exit Fullscreen',
        rotate: 'Rotate',
        pdf_not_supported: 'Your browser does not support PDF viewing. Please download the document.',
        document_generated: 'Document generated successfully',
        review_instructions: 'Please review the entire document before signing or acknowledging.'
      },
      es: {
        loading: 'Cargando documento...',
        error_loading: 'Error cargando documento',
        retry: 'Reintentar',
        download: 'Descargar',
        signature_required: 'Firma Requerida',
        review_carefully: 'Por favor revise este documento cuidadosamente antes de continuar',
        estimated_time: 'Tiempo estimado de revisión'
      }
    };
    return translations[language][key] || key;
  };

  useEffect(() => {
    generateDocument();
  }, [documentType, employeeData, propertyData]);

  const generateDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔄 Generating ${documentType} document for employee:`, employeeData?.employee_first_name);

      const response = await fetch(`http://127.0.0.1:8000${config.apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        },
        body: JSON.stringify({
          employee_data: employeeData,
          property_data: propertyData,
          document_type: documentType,
          use_official_template: config.complianceLevel === 'federal',
          compliance_level: config.complianceLevel,
          language: language,
          generation_timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate ${documentType}: ${response.status} - ${errorText}`);
      }

      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPdfData(pdfUrl);
      
      console.log(`✅ ${documentType} document generated successfully`);

    } catch (error) {
      console.error(`Error generating ${documentType}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfData) {
      const link = document.createElement('a');
      link.href = pdfData;
      link.download = `${documentType}-document.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onDownload?.(pdfData);
    }
  };

  const getComplianceBadge = () => {
    switch (config.complianceLevel) {
      case 'federal':
        return (
          <Badge variant="destructive" className="mb-2">
            <Shield className="h-3 w-3 mr-1" />
            {t('federal_compliance')}
          </Badge>
        );
      case 'state':
        return (
          <Badge variant="secondary" className="mb-2">
            <Shield className="h-3 w-3 mr-1" />
            {t('state_compliance')}
          </Badge>
        );
      case 'company':
        return (
          <Badge variant="outline" className="mb-2">
            <FileText className="h-3 w-3 mr-1" />
            {t('company_policy')}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Document Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Eye className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
        </div>
        <p className="text-gray-600">{config.subtitle}</p>
        {getComplianceBadge()}
      </div>

      {/* Document Info Alert */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>{config.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t('estimated_time')}: {config.estimatedReviewTime}</span>
              {config.requiresSignature && (
                <span className="text-orange-600 font-medium">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  {t('signature_required')}
                </span>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>{t('loading')}</span>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <p className="font-bold text-red-800">{t('error_loading')}</p>
              </div>
              <p className="text-red-800">{error}</p>
              {config.complianceLevel === 'federal' && (
                <div className="bg-red-100 p-4 rounded border border-red-300">
                  <p className="text-sm text-red-700 font-medium">
                    CRITICAL: This document cannot be processed without official compliance templates.
                  </p>
                </div>
              )}
              <Button onClick={generateDocument} variant="outline" className="border-red-300 text-red-700">
                {t('retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Viewer */}
      {pdfData && !loading && !error && (
        <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{config.title} Preview</CardTitle>
                <CardDescription>{t('review_instructions')}</CardDescription>
              </div>
              
              {showActions && (
                <div className="flex items-center space-x-2">
                  {/* Zoom Controls */}
                  <div className="flex items-center space-x-1 border rounded px-2 py-1">
                    <Button 
                      onClick={() => setZoom(Math.max(50, zoom - 25))} 
                      variant="ghost" 
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <ZoomOut className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-medium min-w-12 text-center">{zoom}%</span>
                    <Button 
                      onClick={() => setZoom(Math.min(200, zoom + 25))} 
                      variant="ghost" 
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <ZoomIn className="h-3 w-3" />
                    </Button>
                  </div>

                  <Button onClick={handleDownload} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    {t('download')}
                  </Button>

                  <Button 
                    onClick={() => setIsFullscreen(!isFullscreen)} 
                    variant="outline" 
                    size="sm"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div 
              className="border rounded-lg overflow-hidden bg-gray-50" 
              style={{ 
                height: isFullscreen ? 'calc(100vh - 200px)' : height,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                width: `${10000 / zoom}%`
              }}
            >
              <object
                data={pdfData}
                type="application/pdf"
                width="100%"
                height="100%"
                className="w-full h-full"
              >
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-gray-600">{t('pdf_not_supported')}</p>
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      {t('download')}
                    </Button>
                  </div>
                </div>
              </object>
            </div>

            {/* Action Buttons */}
            {showActions && (
              <div className="flex justify-between items-center mt-6 pt-6 border-t">
                <div className="text-sm text-gray-500">
                  {t('review_carefully')}
                </div>
                
                {config.requiresSignature && onSignatureRequired && (
                  <Button onClick={onSignatureRequired} className="px-8">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('signature_required')}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}