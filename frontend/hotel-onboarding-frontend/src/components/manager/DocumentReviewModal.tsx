/**
 * Document Review Modal
 * Full-screen modal for reviewing and approving/rejecting documents
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import DocumentPDFViewer from './DocumentPDFViewer';
import DocumentVerificationService from '@/services/documentVerificationService';

interface DocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  documentType: string;
  documentName: string;
  onApprove: () => void;
  onReject: () => void;
}

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  documentType,
  documentName,
  onApprove,
  onReject
}) => {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDocument();
    }
  }, [isOpen, employeeId, documentType]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      setPdfDataUrl(undefined);

      const data = await DocumentVerificationService.getDocumentForReview(
        employeeId,
        documentType
      );

      console.log(`[DocumentReviewModal] Loaded ${documentType}:`, {
        hasPdfUrl: !!data.pdfUrl,
        hasPdfData: !!data.pdfData,
        hasPdfDataUrl: !!data.pdfDataUrl,
        pdfDataLength: data.pdfData?.length
      });

      setPdfUrl(data.pdfUrl);
      const constructedPdfDataUrl = data.pdfDataUrl ?? (data.pdfData ? `data:application/pdf;base64,${data.pdfData}` : undefined);
      setPdfDataUrl(constructedPdfDataUrl);
      
      console.log(`[DocumentReviewModal] Using ${constructedPdfDataUrl ? 'decrypted pdfDataUrl' : 'signed pdfUrl'} for ${documentType}`);
      
      setUploadedDocs(data.uploadedDocsUrls || []);
    } catch (err: any) {
      console.error('Error loading document:', err);
      setError(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      setError(null);

      await DocumentVerificationService.approveDocument(
        employeeId,
        documentType,
        undefined, // formData (for I-9 Section 2)
        undefined, // signature (for I-9 Section 2)
        notes || undefined
      );

      onApprove();
      onClose();
    } catch (err: any) {
      console.error('Error approving document:', err);
      setError(err.message || 'Failed to approve document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await DocumentVerificationService.rejectDocument(
        employeeId,
        documentType,
        rejectReason
      );

      onReject();
      onClose();
    } catch (err: any) {
      console.error('Error rejecting document:', err);
      setError(err.message || 'Failed to reject document');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Determine if this document should show side-by-side view
  const showSideBySide = documentType === 'i9' || documentType === 'w4';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full h-full max-w-7xl bg-white rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              Review: {documentName}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={loadDocument}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <DocumentPDFViewer
                pdfUrl={pdfUrl}
                pdfDataUrl={pdfDataUrl}
                documentName={documentName}
                uploadedDocs={uploadedDocs}
                showSideBySide={showSideBySide}
              />
            )}
          </div>

          {/* Footer - Actions */}
          {!loading && !error && (
            <div className="p-6 border-t bg-gray-50">
              {!showRejectForm ? (
                <div className="space-y-4">
                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes about this document..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-4">
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={submitting}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-5 h-5" />
                      )}
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Reject Form */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Rejection *
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Please explain why this document is being rejected..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      rows={3}
                      autoFocus
                    />
                  </div>

                  {/* Reject Action Buttons */}
                  <div className="flex items-center justify-end space-x-4">
                    <button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason('');
                      }}
                      disabled={submitting}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={submitting || !rejectReason.trim()}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                      <span>Confirm Rejection</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentReviewModal;
