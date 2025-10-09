/**
 * Manager Review Interface
 * Side-by-side view for reviewing and editing employee forms
 */

import React, { useState, useEffect } from 'react';
import { Eye, AlertCircle, CheckCircle } from 'lucide-react';
import OTPVerificationModal from './OTPVerificationModal';
import SessionStorageService from '@/services/sessionStorageService';
import DocumentVerificationService, { AllDocumentsStatus } from '@/services/documentVerificationService';
import DocumentWorkflowStepper from './DocumentWorkflowStepper';
import DocumentReviewModal from './DocumentReviewModal';
import { I9ReviewModal } from './i9';
import { W4ReviewModal } from './w4/W4ReviewModal';
import { HealthInsuranceReviewModal } from './health_insurance/HealthInsuranceReviewModal';
import { CompleteReviewModal } from './CompleteReviewModal';
import NewHireSummaryModal from './NewHireSummaryModal';

interface ManagerReviewInterfaceProps {
  employeeId: string;
  employeeName: string;
  managerEmail: string;
}

export const ManagerReviewInterface: React.FC<ManagerReviewInterfaceProps> = ({
  employeeId,
  employeeName,
  managerEmail
}) => {
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New workflow state
  const [documentsStatus, setDocumentsStatus] = useState<AllDocumentsStatus | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showI9Modal, setShowI9Modal] = useState(false);
  const [showW4Modal, setShowW4Modal] = useState(false);
  const [showHealthInsuranceModal, setShowHealthInsuranceModal] = useState(false);
  const [showCompleteReviewModal, setShowCompleteReviewModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const existingSession = SessionStorageService.getSession(employeeId);

    if (existingSession) {
      console.log('✅ Found existing session, restoring...');
      setSessionToken(existingSession.token);

      // Session restored
      console.log('✅ Session restored');
    } else {
      // No session, show OTP modal
      setShowOTPModal(true);
    }
  }, [employeeId]);



  // Load documents status after OTP verification
  useEffect(() => {
    if (sessionToken) {
      loadDocumentsStatus();
    }
  }, [sessionToken]);



  const handleOTPVerified = (token: string) => {
    setSessionToken(token);
    setShowOTPModal(false);

    // Save session to sessionStorage (no expiration check - lasts until browser closed)
    SessionStorageService.saveSession(employeeId, token);
    console.log('✅ Session saved to sessionStorage');
  };

  const loadDocumentsStatus = async () => {
    try {
      setLoading(true);
      const status = await DocumentVerificationService.getAllDocumentsStatus(employeeId);
      setDocumentsStatus(status);
      console.log('✅ Documents status loaded:', status);
    } catch (err: any) {
      console.error('Error loading documents status:', err);
      setError(err.message || 'Failed to load documents status');
    } finally {
      setLoading(false);
    }
  };

  // Check if all documents are approved
  const allDocumentsApproved = documentsStatus?.documents.every(
    doc => doc.status === 'approved'
  ) || false;

  // Debug logging
  useEffect(() => {
    if (documentsStatus) {
      console.log('[COMPLETE-REVIEW] Documents status:', documentsStatus.documents.map(d => ({
        type: d.documentType,
        status: d.status
      })));
      console.log('[COMPLETE-REVIEW] All approved?', allDocumentsApproved);
    }
  }, [documentsStatus, allDocumentsApproved]);

  const handleStepClick = (documentType: string) => {
    setSelectedDocument(documentType);

    if (documentType === 'new_hire_summary') {
      setShowSummaryModal(true);
      setShowReviewModal(false);
      setShowI9Modal(false);
      setShowW4Modal(false);
      setShowHealthInsuranceModal(false);
      return;
    }

    if (documentType === 'i9') {
      setShowI9Modal(true);
      setShowReviewModal(false);
      setShowW4Modal(false);
      setShowHealthInsuranceModal(false);
      setShowSummaryModal(false);
      return;
    }

    if (documentType === 'w4') {
      setShowW4Modal(true);
      setShowReviewModal(false);
      setShowI9Modal(false);
      setShowHealthInsuranceModal(false);
      setShowSummaryModal(false);
      return;
    }

    if (documentType === 'health_insurance') {
      setShowHealthInsuranceModal(true);
      setShowReviewModal(false);
      setShowI9Modal(false);
      setShowW4Modal(false);
      setShowSummaryModal(false);
      return;
    }

    setShowReviewModal(true);
    setShowI9Modal(false);
    setShowW4Modal(false);
    setShowHealthInsuranceModal(false);
    setShowSummaryModal(false);
  };

  const handleDocumentApproved = () => {
    // Reload documents status to update workflow
    loadDocumentsStatus();
  };

  const handleDocumentRejected = () => {
    // Reload documents status to update workflow
    loadDocumentsStatus();
  };



  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Secure Document Access
          </h2>
          <p className="text-gray-600 mb-6">
            To view and edit documents for <strong>{employeeName}</strong>, please verify your identity.
          </p>
          <button
            onClick={() => setShowOTPModal(true)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Verify Identity
          </button>
        </div>

        <OTPVerificationModal
          isOpen={showOTPModal}
          onClose={() => setShowOTPModal(false)}
          onVerified={handleOTPVerified}
          employeeId={employeeId}
          employeeName={employeeName}
          managerEmail={managerEmail}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Review: {employeeName}
              </h1>
              <p className="text-sm text-gray-600">
                Employee ID: {employeeId.slice(0, 8)}...
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Session Active Indicator */}
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  Session Active
                </span>
              </div>


            </div>
          </div>


        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : documentsStatus ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Document Approval Workflow
            </h2>

            <DocumentWorkflowStepper
              documents={documentsStatus.documents}
              currentStep={documentsStatus.currentStep}
              onStepClick={handleStepClick}
            />
          </div>
        ) : null}
      </div>

      {showI9Modal && selectedDocument === 'i9' && (
        <I9ReviewModal
          employeeId={employeeId}
          onClose={() => {
            setShowI9Modal(false);
            setSelectedDocument(null);
          }}
          onComplete={() => {
            setShowI9Modal(false);
            setSelectedDocument(null);
            loadDocumentsStatus();
          }}
        />
      )}

      {showW4Modal && selectedDocument === 'w4' && (
        <W4ReviewModal
          isOpen={showW4Modal}
          employeeId={employeeId}
          onClose={() => {
            setShowW4Modal(false);
            setSelectedDocument(null);
          }}
          onComplete={() => {
            setShowW4Modal(false);
            setSelectedDocument(null);
            loadDocumentsStatus();
          }}
        />
      )}

      {showHealthInsuranceModal && selectedDocument === 'health_insurance' && (
        <HealthInsuranceReviewModal
          isOpen={showHealthInsuranceModal}
          employeeId={employeeId}
          onClose={() => {
            setShowHealthInsuranceModal(false);
            setSelectedDocument(null);
          }}
          onComplete={() => {
            setShowHealthInsuranceModal(false);
            setSelectedDocument(null);
            loadDocumentsStatus();
          }}
        />
      )}

      {showSummaryModal && (
        <NewHireSummaryModal
          isOpen={showSummaryModal}
          employeeId={employeeId}
          onClose={() => {
            setShowSummaryModal(false);
            setSelectedDocument(null);
          }}
          onApproved={() => {
            setShowSummaryModal(false);
            setSelectedDocument(null);
            handleDocumentApproved();
          }}
        />
      )}

      {showReviewModal && selectedDocument && selectedDocument !== 'i9' && selectedDocument !== 'w4' && selectedDocument !== 'health_insurance' && selectedDocument !== 'new_hire_summary' && (
        <DocumentReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedDocument(null);
          }}
          employeeId={employeeId}
          documentType={selectedDocument}
          documentName={
            documentsStatus?.documents.find(d => d.documentType === selectedDocument)?.documentName || ''
          }
          onApprove={handleDocumentApproved}
          onReject={handleDocumentRejected}
        />
      )}

      {/* Complete Review Modal */}
      {showCompleteReviewModal && (
        <CompleteReviewModal
          isOpen={showCompleteReviewModal}
          employeeId={employeeId}
          employeeName={employeeName}
          onClose={() => setShowCompleteReviewModal(false)}
          onComplete={() => {
            setShowCompleteReviewModal(false);
            loadDocumentsStatus();
          }}
        />
      )}

      {/* Complete Review Button - Shows when all documents are approved and modal is NOT open */}
      {(() => {
        console.log('[COMPLETE-REVIEW-RENDER] Checking render conditions:', {
          allDocumentsApproved,
          hasDocumentsStatus: !!documentsStatus,
          modalOpen: showCompleteReviewModal,
          shouldRender: allDocumentsApproved && documentsStatus && !showCompleteReviewModal
        });

        if (allDocumentsApproved && documentsStatus && !showCompleteReviewModal) {
          console.log('[COMPLETE-REVIEW-RENDER] ✅ RENDERING BUTTON!');
        } else {
          console.log('[COMPLETE-REVIEW-RENDER] ❌ NOT rendering button');
        }

        return null;
      })()}
      {allDocumentsApproved && documentsStatus && !showCompleteReviewModal ? (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-green-500 shadow-2xl p-6 z-[9999]"
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  ✅ All Documents Approved!
                </h3>
                <p className="text-sm text-gray-600">
                  Ready to activate employee and complete review
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                console.log('[COMPLETE-REVIEW] Button clicked!');
                setShowCompleteReviewModal(true);
              }}
              className="px-8 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-3 transition-all transform hover:scale-105 shadow-lg font-semibold text-lg"
            >
              <CheckCircle className="w-6 h-6" />
              <span>Complete Review & Activate Employee</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ManagerReviewInterface;
