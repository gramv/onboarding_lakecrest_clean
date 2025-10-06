/**
 * Complete Review Modal
 * Manager finalizes review and activates employee
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2, Calendar, User, Building2, Clock } from 'lucide-react';
import { reviewDataService } from '@/services/managerReviewService';
import { useNavigate } from 'react-router-dom';

interface CompleteReviewModalProps {
  isOpen: boolean;
  employeeId: string;
  employeeName: string;
  onClose: () => void;
  onComplete: () => void;
}

export const CompleteReviewModal: React.FC<CompleteReviewModalProps> = ({
  isOpen,
  employeeId,
  employeeName,
  onClose,
  onComplete
}) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('9:00 AM');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [dressCode, setDressCode] = useState('Business casual');
  const [parkingDetails, setParkingDetails] = useState('Employee parking available on-site');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Set default start date to today
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);

      // Auto-generate employee number from employee ID
      const empNumber = `EMP-${employeeId.substring(0, 8).toUpperCase()}`;
      setEmployeeNumber(empNumber);
    }
  }, [isOpen, employeeId]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      console.log('[COMPLETE-REVIEW-MODAL] Submitting review completion...');

      // Call backend endpoint
      const result = await reviewDataService.completeReview(employeeId, {
        startDate,
        startTime,
        employeeNumber,
        dressCode,
        parkingDetails,
        notes
      });

      console.log('[COMPLETE-REVIEW-MODAL] Review completed successfully:', result);

      // Show success message
      alert(`✅ Employee Activated Successfully!\n\nEmployee Number: ${result.employee.employeeNumber}\nStatus: ${result.employee.status}\n${result.employee.emailSent ? '📧 Welcome email sent!' : '⚠️ Email failed to send'}\n\nRedirecting to dashboard...`);

      onComplete();
      onClose();

      // Redirect to manager dashboard
      setTimeout(() => {
        navigate('/manager/dashboard');
      }, 500);
    } catch (err: any) {
      console.error('[COMPLETE-REVIEW-MODAL] Failed to complete review:', err);
      setError(err.message || 'Failed to complete review');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Complete Review</h2>
                <p className="text-sm text-gray-600">Activate employee and send welcome email</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Employee Info */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Employee Information</h3>
              </div>
              <p className="text-gray-700">
                <strong>Name:</strong> {employeeName}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                All documents have been reviewed and approved
              </p>
            </div>

            <div className="space-y-4">
              {/* Employee Number */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 mr-2" />
                  Employee Number
                </label>
                <input
                  type="text"
                  value={employeeNumber}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  placeholder="EMP-2025-001"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-generated from employee ID</p>
              </div>

              {/* Start Date */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-4 h-4 mr-2" />
                  Start Time
                </label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="9:00 AM"
                  required
                />
              </div>

              {/* Dress Code */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="w-4 h-4 mr-2" />
                  Dress Code
                </label>
                <input
                  type="text"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Business casual"
                />
              </div>

              {/* Parking Details */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Parking Information
                </label>
                <input
                  type="text"
                  value={parkingDetails}
                  onChange={(e) => setParkingDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Employee parking available on-site"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional information for the employee..."
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Employee status will be changed to "Active"</li>
                <li>✓ Employee will receive a welcome email with all details</li>
                <li>✓ You will be CC'd on the email</li>
                <li>✓ Employee will appear in your employee list</li>
                <li>✓ All documents will be accessible from employee profile</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !startDate || !startTime}
                className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Activating Employee...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Complete Review & Send Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

