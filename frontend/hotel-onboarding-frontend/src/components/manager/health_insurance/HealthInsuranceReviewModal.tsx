/**
 * Health Insurance Review Modal
 * Manager reviews employee's health insurance selections and fills employer section
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2, FileText, Building2, Calendar } from 'lucide-react';
import { reviewDataService } from '@/services/managerReviewService';

interface HealthInsuranceReviewModalProps {
  isOpen: boolean;
  employeeId: string;
  onClose: () => void;
  onComplete: () => void;
}

export const HealthInsuranceReviewModal: React.FC<HealthInsuranceReviewModalProps> = ({
  isOpen,
  employeeId,
  onClose,
  onComplete
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  
  // Form data
  const [propertyName, setPropertyName] = useState('');
  const [deadlineToSubmit, setDeadlineToSubmit] = useState('');
  const [reasonForRequest, setReasonForRequest] = useState('new_hire');
  const [dateOfHire, setDateOfHire] = useState('');
  const [qualifyingEventDescription, setQualifyingEventDescription] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, employeeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[HEALTH-INSURANCE-MODAL] Loading data for employee:', employeeId);
      const response = await reviewDataService.getHealthInsuranceDetail(employeeId);
      
      console.log('[HEALTH-INSURANCE-MODAL] Received data:', response);
      setData(response);

      // Auto-fill employer data
      if (response.autoFillData) {
        setPropertyName(response.autoFillData.propertyName || '');
        setDeadlineToSubmit(response.autoFillData.deadlineToSubmit || '');
        setReasonForRequest(response.autoFillData.reasonForRequest || 'new_hire');
        setDateOfHire(response.autoFillData.dateOfHire || '');
      }

    } catch (err: any) {
      console.error('[HEALTH-INSURANCE-MODAL] Failed to load data:', err);
      setError(err.message || 'Failed to load Health Insurance data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      setError(null);

      console.log('[HEALTH-INSURANCE-MODAL] Submitting approval...');

      await reviewDataService.completeHealthInsurance(employeeId, {
        propertyName,
        deadlineToSubmit,
        reasonForRequest,
        dateOfHire: reasonForRequest === 'new_hire' ? dateOfHire : undefined,
        qualifyingEventDescription: reasonForRequest === 'qualifying_event' ? qualifyingEventDescription : undefined,
        notes: notes || undefined
      });

      console.log('[HEALTH-INSURANCE-MODAL] Health Insurance approved successfully');
      onComplete();
      onClose();
    } catch (err: any) {
      console.error('[HEALTH-INSURANCE-MODAL] Failed to approve:', err);
      setError(err.message || 'Failed to approve Health Insurance');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Health Insurance Approval</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={loadData}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Left: PDF Viewer */}
                <div className="flex-1 border-r border-gray-200 overflow-hidden">
                  {data?.pdfUrl ? (
                    <iframe
                      src={data.pdfUrl}
                      className="w-full h-full"
                      title="Health Insurance Form"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No PDF available</p>
                    </div>
                  )}
                </div>

                {/* Right: Employer Information Form */}
                <div className="w-96 overflow-y-auto p-6 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Employer Information
                  </h3>

                  <div className="space-y-4">
                    {/* Property Name */}
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                        <Building2 className="w-4 h-4 mr-2" />
                        Property Name
                      </label>
                      <input
                        type="text"
                        value={propertyName}
                        onChange={(e) => setPropertyName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter property name"
                      />
                    </div>

                    {/* Deadline to Submit */}
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="w-4 h-4 mr-2" />
                        Deadline to Submit
                      </label>
                      <input
                        type="text"
                        value={deadlineToSubmit}
                        onChange={(e) => setDeadlineToSubmit(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="MM/DD/YYYY"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Auto-calculated: 30 days from hire date
                      </p>
                    </div>

                    {/* Reason for Request */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Reason for Request
                      </label>
                      
                      <div className="space-y-2">
                        {/* New Hire */}
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="reasonForRequest"
                            value="new_hire"
                            checked={reasonForRequest === 'new_hire'}
                            onChange={(e) => setReasonForRequest(e.target.value)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">New Hire</span>
                            {reasonForRequest === 'new_hire' && (
                              <input
                                type="text"
                                value={dateOfHire}
                                onChange={(e) => setDateOfHire(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Date of Hire (MM/DD/YYYY)"
                              />
                            )}
                          </div>
                        </label>

                        {/* Open Enrollment */}
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="reasonForRequest"
                            value="open_enrollment"
                            checked={reasonForRequest === 'open_enrollment'}
                            onChange={(e) => setReasonForRequest(e.target.value)}
                          />
                          <span className="text-sm font-medium text-gray-900">Open Enrollment</span>
                        </label>

                        {/* Qualifying Event */}
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="reasonForRequest"
                            value="qualifying_event"
                            checked={reasonForRequest === 'qualifying_event'}
                            onChange={(e) => setReasonForRequest(e.target.value)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">Qualifying Event</span>
                            {reasonForRequest === 'qualifying_event' && (
                              <input
                                type="text"
                                value={qualifyingEventDescription}
                                onChange={(e) => setQualifyingEventDescription(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="State event & date"
                              />
                            )}
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Add any notes..."
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!loading && !error && (
            <div className="p-6 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-end space-x-4">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={submitting || !propertyName || !deadlineToSubmit}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Approving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Approve Health Insurance</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

