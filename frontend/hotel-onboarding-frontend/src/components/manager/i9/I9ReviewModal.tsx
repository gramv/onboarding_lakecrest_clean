import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Clock, FileText, Image as ImageIcon, Edit3 } from 'lucide-react';
import PDFViewer from '@/components/PDFViewer';
import { ImageViewer } from './ImageViewer';
import { EmployerForm } from './EmployerForm';
import { EmployerSetupModal } from './EmployerSetupModal';
import { reviewDataService } from '@/services/managerReviewService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface I9ReviewModalProps {
  employeeId: string;
  onClose: () => void;
  onComplete: () => void;
}

interface UploadedImage {
  id: string;
  document_type: string;
  file_name: string;
  url: string;
}

interface EmployerProfileRecord {
  i9_employer_name: string;
  i9_employer_title: string;
  i9_business_name: string;
  i9_business_address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface I9ReviewState {
  pdfUrl: string;
  uploadedImages: UploadedImage[];
  employerProfile: EmployerProfileRecord | null;
  employeeStartDate: string | null;
  i9Deadline: string | null;
  employeeName: string;
  documentsMetadata: any[];
}

export const I9ReviewModal: React.FC<I9ReviewModalProps> = ({
  employeeId,
  onClose,
  onComplete
}) => {
  const [data, setData] = useState<I9ReviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmployerModal, setShowEmployerModal] = useState(false);
  const [shouldPersistProfile, setShouldPersistProfile] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1); // Step 1: Review, Step 2: Sign
  const [pdfBytesInMemory, setPdfBytesInMemory] = useState<string | null>(null); // Store edited PDF as base64
  const [showEditPanel, setShowEditPanel] = useState(false); // Show download/upload panel
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadedEditedPdf, setUploadedEditedPdf] = useState<File | null>(null); // Store uploaded edited PDF

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await reviewDataService.getI9ReviewDetail(employeeId);
      setData({
        pdfUrl: response.pdfUrl,
        uploadedImages: response.uploadedDocuments || [],
        employerProfile: response.employerProfile || null,
        employeeStartDate: response.employeeStartDate || null,
        i9Deadline: response.i9Deadline || null,
        employeeName: response.employeeName || '',
        documentsMetadata: response.documentsMetadata || []
      });

      // Check if employer profile exists
      const hasProfile = !!response.employerProfile;
      setShouldPersistProfile(!hasProfile);
      if (!hasProfile) {
        setShowEmployerModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load I-9 data');
    } finally {
      setLoading(false);
    }
  };

  // Handle download of PDF for editing
  const handleDownloadPdf = () => {
    if (!data?.pdfUrl) return;

    console.log('[I9-MODAL] Opening PDF in new tab for download...');

    // Open in new tab so user can download from there
    window.open(data.pdfUrl, '_blank');
  };

  // Handle file upload of edited PDF
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[I9-MODAL] Manager uploaded edited PDF:', file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPdfBytesInMemory(base64.split(',')[1]);
      console.log('[I9-MODAL] Edited PDF loaded into memory, size:', base64.split(',')[1].length, 'bytes');
    };
    reader.readAsDataURL(file);

    // Reset file input so same file can be uploaded again if needed
    e.target.value = '';
  };



  // Download PDF and save as verified when moving to Step 2
  const handleNextToStep2 = async () => {
    if (!data?.pdfUrl) {
      console.error('No PDF URL available');
      setCurrentStep(2);
      return;
    }

    try {
      let pdfBytesToSave: string;

      if (pdfBytesInMemory) {
        // Use the edited PDF uploaded by manager
        console.log('[I9-MODAL] Using edited PDF uploaded by manager');
        pdfBytesToSave = pdfBytesInMemory;
      } else {
        // Download the original PDF
        console.log('[I9-MODAL] No edits - downloading original PDF to save as verified:', data.pdfUrl);
        const response = await fetch(data.pdfUrl);
        if (!response.ok) {
          throw new Error('Failed to download PDF');
        }

        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        pdfBytesToSave = base64.split(',')[1];
      }

      console.log('[I9-MODAL] Saving verified PDF, size:', pdfBytesToSave.length, 'bytes');

      // Save as verified PDF to backend
      try {
        await reviewDataService.saveVerifiedI9(employeeId, pdfBytesToSave);
        console.log('[I9-MODAL] Verified PDF saved successfully');
      } catch (saveErr) {
        console.error('[I9-MODAL] Failed to save verified PDF:', saveErr);
        // Continue anyway, backend will use original
      }

      setCurrentStep(2);

    } catch (err) {
      console.error('[I9-MODAL] Failed to process PDF:', err);
      // Continue anyway, backend will load from database
      setCurrentStep(2);
    }
  };

  const handleEmployerSave = async (employerData: any) => {
    try {
      await reviewDataService.saveEmployerProfileQuick({
        employerName: employerData.i9_employer_name,
        employerTitle: employerData.i9_employer_title,
        businessName: employerData.i9_business_name,
        businessAddress: employerData.i9_business_address,
        city: employerData.city,
        state: employerData.state,
        zipCode: employerData.zip_code,
        ein: employerData.ein
      });

      setData(prev => prev ? { ...prev, employerProfile: employerData } : prev);
      setShowEmployerModal(false);
      setShouldPersistProfile(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save employer profile');
    }
  };

  const handleComplete = async (section2Data: any) => {
    try {
      console.log('[I9-MODAL] Completing I-9 (verified PDF should be in storage)');

      await reviewDataService.completeI9Review(employeeId, {
        firstDayOfEmployment: section2Data.firstDayOfEmployment,
        employerName: section2Data.employerName,
        employerTitle: section2Data.employerTitle,
        businessName: section2Data.businessName,
        businessAddress: section2Data.businessAddress,
        city: section2Data.city,
        state: section2Data.state,
        zipCode: section2Data.zipCode,
        signature: section2Data.signature,
        signatureDate: section2Data.signatureDate,
        additionalInfo: section2Data.additionalInfo,
        updateEmployerProfile: shouldPersistProfile
      });

      onComplete();
    } catch (err: any) {
      alert(err.message || 'Failed to complete I-9 review');
    }
  };

  const isOverdue = () => {
    if (!data?.i9Deadline) return false;
    return new Date(data.i9Deadline) < new Date();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading I-9 data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-red-600 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-bold text-center mb-2">Error Loading I-9</h3>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen p-4">
        <div className="bg-white rounded-lg max-w-7xl mx-auto my-4">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 rounded-t-lg">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentStep === 1 ? 'Review I-9 Form' : 'Complete I-9 Section 2'} - {data.employeeName}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {currentStep === 1
                  ? 'Review employee\'s Section 1 and verify documents'
                  : 'Verify employment eligibility and sign'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded ${currentStep === 1 ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-600'}`}>
                  Step 1: Review
                </span>
                <span className="text-gray-400">→</span>
                <span className={`text-xs px-2 py-1 rounded ${currentStep === 2 ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-600'}`}>
                  Step 2: Sign
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Deadline Warning */}
              {data.i9Deadline && (isOverdue() ? (
                <div className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <p className="font-semibold text-sm">OVERDUE</p>
                    <p className="text-xs">Deadline: {new Date(data.i9Deadline).toLocaleDateString()}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg">
                  <Clock className="h-5 w-5" />
                  <div>
                    <p className="font-semibold text-sm">Deadline</p>
                    <p className="text-xs">{new Date(data.i9Deadline).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}

              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Step 1: Review Documents */}
          {currentStep === 1 && (
            <>
              <div className="grid grid-cols-2 gap-6 p-6">
                {/* Left: I-9 Section 1 PDF */}
                <div className="col-span-1">
                  <div className="border rounded-lg overflow-hidden bg-white h-full">
                    <div className="bg-gray-50 border-b px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            I-9 Section 1 (Employee Completed)
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Employee completed on {data.employeeStartDate ? new Date(data.employeeStartDate).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        {pdfBytesInMemory && (
                          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                            ✓ Edited version loaded
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <PDFViewer
                        pdfUrl={data.pdfUrl}
                        title="I-9 Form Section 1"
                        height="500px"
                      />
                    </div>
                    <div className="border-t p-3 bg-gray-50">
                      {!showEditPanel ? (
                        <button
                          onClick={() => setShowEditPanel(true)}
                          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span>Need to Edit This PDF?</span>
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-xs text-gray-700 bg-blue-50 border border-blue-200 p-3 rounded">
                            <p className="font-semibold text-blue-900 mb-2">📝 How to edit the PDF:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-1">
                              <li>Click "Download PDF" below to save it to your computer</li>
                              <li>Open the PDF in Adobe Acrobat, Preview, or any PDF editor</li>
                              <li>Make your corrections to the form fields</li>
                              <li>Save the edited PDF</li>
                              <li>Click "Upload Edited PDF" below and select your edited file</li>
                            </ol>
                          </div>

                          {pdfBytesInMemory && (
                            <div className="text-xs text-gray-700 bg-green-50 border border-green-200 p-2 rounded">
                              <p className="font-semibold text-green-900">✓ Your edited PDF is loaded!</p>
                              <p className="mt-1">Click "Next" to proceed with this version.</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={handleDownloadPdf}
                              className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
                            >
                              <span>⬇️</span>
                              <span>Download PDF</span>
                            </button>

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf"
                              onChange={handleFileUpload}
                              className="hidden"
                            />

                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
                            >
                              <span>⬆️</span>
                              <span>{pdfBytesInMemory ? 'Replace PDF' : 'Upload Edited PDF'}</span>
                            </button>
                          </div>

                          <button
                            onClick={() => setShowEditPanel(false)}
                            className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                          >
                            Cancel / No edits needed
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Uploaded Documents */}
                <div className="col-span-1">
                  <ImageViewer images={data.uploadedImages} />
                </div>
              </div>

              {/* Navigation */}
              <div className="border-t px-6 py-4 flex items-center justify-between bg-gray-50">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNextToStep2}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Next: Complete Section 2 →
                </button>
              </div>
            </>
          )}

          {/* Step 2: Complete Section 2 */}
          {currentStep === 2 && (
            <>
              <div className="p-6">
                <div className="max-w-3xl mx-auto">
                  <EmployerForm
                    employerProfile={data.employerProfile}
                    employeeStartDate={data.employeeStartDate || ''}
                    onComplete={handleComplete}
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="border-t px-6 py-4 flex items-center justify-between bg-gray-50">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ← Back to Review
                </button>
                <p className="text-sm text-gray-600">
                  Complete the form above to finish I-9 verification
                </p>
              </div>
            </>
          )}

          {/* Employer Setup Modal */}
          {showEmployerModal && (
            <EmployerSetupModal
              onSave={handleEmployerSave}
              onClose={() => setShowEmployerModal(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
