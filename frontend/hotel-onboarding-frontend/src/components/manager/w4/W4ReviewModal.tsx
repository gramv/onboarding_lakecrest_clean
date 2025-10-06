import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Clock, FileText, Image as ImageIcon, CheckCircle } from 'lucide-react';
import PDFViewer from '@/components/PDFViewer';
import { ImageViewer } from '../i9/ImageViewer';
import { reviewDataService } from '@/services/managerReviewService';
import { SignaturePadModal } from '../SignaturePadModal';

interface W4ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onComplete: () => void;
}

interface UploadedDocument {
  id: string;
  document_type: string;
  file_name: string;
  url: string;
}

interface W4ReviewData {
  pdfUrl: string;
  uploadedDocuments: UploadedDocument[];
  employeeData: {
    name: string;
    ssn: string;
    address: string;
  };
  employeeStartDate: string;
  employerProfile?: {
    ein: string;
    business_legal_name: string;
    street_address: string;
    suite_apt?: string;
    city: string;
    state: string;
    zip_code: string;
    i9_employer_name: string;
    i9_employer_title: string;
  };
}

interface SignatureData {
  dataUrl: string;
  timestamp: string;
}

export const W4ReviewModal: React.FC<W4ReviewModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  onComplete
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<W4ReviewData | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1); // Step 1: Review, Step 2: Employer Info
  const [ssnVerified, setSsnVerified] = useState(false);
  const [notes, setNotes] = useState('');
  const [showSignatureCapture, setShowSignatureCapture] = useState(false);
  
  // Employer form data
  const [employerData, setEmployerData] = useState({
    employerName: '',
    employerAddress: '',
    employerEIN: '',
    firstDayOfEmployment: '',
    signature: null as SignatureData | null
  });

  useEffect(() => {
    if (isOpen) {
      loadW4Data();
    }
  }, [isOpen, employeeId]);

  const loadW4Data = async () => {
    try {
      setLoading(true);
      console.log('[W4-MODAL] Loading W-4 data for employee:', employeeId);

      const response = await reviewDataService.getW4ReviewDetail(employeeId);
      console.log('[W4-MODAL] Received W-4 data:', response);

      setData(response);

      // Auto-fill employer data from profile
      if (response.employerProfile) {
        const profile = response.employerProfile;
        // W-4 Employer's name and address should show:
        // Line 1: Business legal name (e.g., "rci")
        // Line 2+: Street address, city, state, zip
        const addressOnly = `${profile.street_address}${profile.suite_apt ? ` ${profile.suite_apt}` : ''}, ${profile.city}, ${profile.state} ${profile.zip_code}`;

        setEmployerData({
          employerName: profile.business_legal_name,  // Business name (e.g., "rci")
          employerAddress: addressOnly,  // Address only, no name
          employerEIN: profile.ein,
          firstDayOfEmployment: response.employeeStartDate || new Date().toISOString().split('T')[0],  // Default to today if not set
          signature: null
        });

        console.log('[W4-MODAL] Auto-filled employer data:', {
          employerName: profile.business_legal_name,
          employerAddress: addressOnly,
          employerEIN: profile.ein
        });
      }

    } catch (error) {
      console.error('[W4-MODAL] Failed to load W-4 data:', error);
      alert(`Failed to load W-4 data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNextToStep2 = () => {
    if (!ssnVerified) {
      alert('Please verify the SSN matches the SSN card before proceeding.');
      return;
    }
    setCurrentStep(2);
  };

  const handleSignatureComplete = (signatureData: any) => {
    setEmployerData({
      ...employerData,
      signature: {
        dataUrl: signatureData.dataUrl,
        timestamp: signatureData.timestamp
      }
    });
    setShowSignatureCapture(false);
  };

  const handleComplete = async () => {
    // Signature is optional, so no validation needed

    try {
      setLoading(true);

      await reviewDataService.completeW4(employeeId, {
        employerName: employerData.employerName,
        employerAddress: employerData.employerAddress,
        employerEIN: employerData.employerEIN,
        firstDayOfEmployment: employerData.firstDayOfEmployment,
        signature: employerData.signature || null,  // Can be null
        ssnVerified,
        notes
      });
      
      onComplete();
      onClose();
      
    } catch (error) {
      console.error('[W4-MODAL] Failed to complete W-4:', error);
      alert('Failed to complete W-4. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full h-full max-w-7xl bg-white rounded-lg shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                W-4 Federal Tax Withholding Review
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {currentStep === 1 ? 'Step 1: Review & Verify SSN' : 'Step 2: Add Employer Information'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading W-4 data...</p>
                </div>
              </div>
            ) : currentStep === 1 ? (
              // Step 1: Review & Verify
              <div className="h-full p-6">
                <div className="grid grid-cols-2 gap-6 h-full">
                  
                  {/* Left: W-4 PDF */}
                  <div className="col-span-1">
                    <div className="border rounded-lg overflow-hidden bg-white h-full">
                      <div className="bg-gray-50 border-b px-4 py-3">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          W-4 Form (Employee Completed)
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Employee completed on {data?.employeeStartDate ? new Date(data.employeeStartDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="p-4">
                        <PDFViewer
                          pdfUrl={data?.pdfUrl || ''}
                          title="W-4 Form"
                          height="600px"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Uploaded Documents (SSN Card, DL, etc.) + Verification */}
                  <div className="col-span-1">
                    <div className="border rounded-lg overflow-hidden bg-white h-full">
                      <div className="bg-gray-50 border-b px-4 py-3">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <ImageIcon className="h-5 w-5 text-green-600" />
                          Verification Documents
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Verify SSN, name, and address match these documents
                        </p>
                      </div>
                      <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
                        {/* All Uploaded Documents */}
                        {data?.uploadedDocuments && data.uploadedDocuments.length > 0 ? (
                          <ImageViewer images={data.uploadedDocuments.map(doc => ({
                            type: doc.document_type,
                            url: doc.url,
                            filename: doc.file_name
                          }))} />
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                            <p>No verification documents uploaded</p>
                          </div>
                        )}

                        {/* Verification Checkbox */}
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ssnVerified}
                              onChange={(e) => setSsnVerified(e.target.checked)}
                              className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div>
                              <p className="font-semibold text-gray-900">
                                ✓ I verify the following information matches the uploaded documents:
                              </p>
                              <ul className="text-sm text-gray-700 mt-2 space-y-1 ml-4 list-disc">
                                <li>Social Security Number: ***-**-{data?.employeeData.ssn?.slice(-4) || '****'}</li>
                                <li>Full legal name: {data?.employeeData.name}</li>
                                <li>Current address: {data?.employeeData.address}</li>
                              </ul>
                              <p className="text-xs text-gray-600 mt-2">
                                Required before proceeding to employer information
                              </p>
                            </div>
                          </label>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes (Optional)
                          </label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Add any notes about this W-4..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Step 2: Employer Information
              <div className="p-6">
                <div className="max-w-3xl mx-auto">
                  <div className="bg-white border rounded-lg p-6 space-y-6">
                    <div className="text-center mb-6">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                      <h3 className="text-xl font-bold text-gray-900">Add Employer Information</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Complete the W-4 by adding employer details and your signature
                      </p>
                    </div>

                  {/* Employer Name and Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employer Name and Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={employerData.employerAddress}
                      onChange={(e) => setEmployerData({ ...employerData, employerAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Company Name, Street Address, City, State ZIP"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Full employer name and address as it should appear on the W-4
                    </p>
                  </div>

                  {/* Employer EIN */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employer Identification Number (EIN) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={employerData.employerEIN}
                      onChange={(e) => setEmployerData({ ...employerData, employerEIN: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="XX-XXXXXXX"
                      pattern="[0-9]{2}-[0-9]{7}"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: XX-XXXXXXX (e.g., 12-3456789)
                    </p>
                  </div>

                  {/* First Day of Employment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Day of Employment <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={employerData.firstDayOfEmployment}
                      onChange={(e) => setEmployerData({ ...employerData, firstDayOfEmployment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Manager Signature */}
                  <div className="border-t pt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manager Signature <span className="text-gray-500">(Optional)</span>
                    </label>
                    <p className="text-xs text-gray-600 mb-3">
                      Note: Employer signature is not required by IRS for W-4, but recommended for internal records
                    </p>
                    {!employerData.signature ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <button
                          onClick={() => setShowSignatureCapture(true)}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                          Add Signature (Optional)
                        </button>
                        <p className="text-sm text-gray-500 mt-2">
                          Click to add your digital signature for internal records
                        </p>
                      </div>
                    ) : (
                      <div className="border border-gray-300 rounded-lg p-4">
                        <img
                          src={employerData.signature.dataUrl}
                          alt="Manager Signature"
                          className="h-20 mx-auto"
                        />
                        <p className="text-xs text-gray-500 text-center mt-2">
                          Signed on {new Date(employerData.signature.timestamp).toLocaleString()}
                        </p>
                        <button
                          onClick={() => setEmployerData({ ...employerData, signature: null })}
                          className="text-sm text-red-600 hover:text-red-700 mt-2 block mx-auto"
                        >
                          Clear Signature
                        </button>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-6 bg-gray-50 flex items-center justify-between">
            <button
              onClick={currentStep === 1 ? onClose : () => setCurrentStep(1)}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>

            {currentStep === 1 ? (
              <button
                onClick={handleNextToStep2}
                disabled={!ssnVerified}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Add Employer Info →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Completing...' : 'Complete W-4 ✓'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Signature Capture Modal */}
      {showSignatureCapture && (
        <SignaturePadModal
          title="W-4 Employer Signature"
          onComplete={handleSignatureComplete}
          onClose={() => setShowSignatureCapture(false)}
        />
      )}
    </div>
  );
};

