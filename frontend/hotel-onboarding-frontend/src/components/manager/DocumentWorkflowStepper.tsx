/**
 * Document Workflow Stepper
 * Shows sequential document approval workflow with progress
 */

import React from 'react';
import { CheckCircle, Circle, Lock, AlertCircle, Clock } from 'lucide-react';
import { DocumentVerificationStatus } from '@/services/documentVerificationService';

interface DocumentWorkflowStepperProps {
  documents: DocumentVerificationStatus[];
  currentStep: number;
  onStepClick: (documentType: string) => void;
}

export const DocumentWorkflowStepper: React.FC<DocumentWorkflowStepperProps> = ({
  documents,
  currentStep,
  onStepClick
}) => {
  const getStepIcon = (doc: DocumentVerificationStatus) => {
    if (doc.status === 'approved') {
      return <CheckCircle className="w-8 h-8 text-green-500" />;
    }
    if (doc.status === 'rejected') {
      return <AlertCircle className="w-8 h-8 text-red-500" />;
    }
    if (doc.status === 'in_review') {
      return <Clock className="w-8 h-8 text-blue-500 animate-pulse" />;
    }
    if (doc.canReview) {
      return <Circle className="w-8 h-8 text-gray-400" />;
    }
    return <Lock className="w-8 h-8 text-gray-300" />;
  };

  const getStepColor = (doc: DocumentVerificationStatus) => {
    if (doc.status === 'approved') return 'border-green-500 bg-green-50';
    if (doc.status === 'rejected') return 'border-red-500 bg-red-50';
    if (doc.status === 'in_review') return 'border-blue-500 bg-blue-50';
    if (doc.canReview) return 'border-blue-400 bg-white hover:bg-blue-50';
    return 'border-gray-300 bg-gray-50';
  };

  const getStepCursor = (doc: DocumentVerificationStatus) => {
    return doc.canReview ? 'cursor-pointer' : 'cursor-not-allowed';
  };

  return (
    <div className="w-full py-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Overall Progress
          </span>
          <span className="text-sm font-medium text-gray-700">
            {documents.filter(d => d.status === 'approved').length} / {documents.length} Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${(documents.filter(d => d.status === 'approved').length / documents.length) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {documents.map((doc, index) => (
          <div key={doc.documentType} className="relative">
            {/* Connector Line */}
            {index < documents.length - 1 && (
              <div
                className={`absolute left-4 top-12 w-0.5 h-8 ${
                  doc.status === 'approved' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            )}

            {/* Step Card */}
            <div
              className={`
                relative flex items-start p-4 border-2 rounded-lg transition-all
                ${getStepColor(doc)}
                ${getStepCursor(doc)}
              `}
              onClick={() => doc.canReview && onStepClick(doc.documentType)}
            >
              {/* Step Number & Icon */}
              <div className="flex-shrink-0 mr-4">
                <div className="relative">
                  {getStepIcon(doc)}
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-gray-300">
                    <span className="text-xs font-bold text-gray-700">{doc.order}</span>
                  </div>
                </div>
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {doc.documentName}
                  </h3>
                  <StatusBadge status={doc.status} canReview={doc.canReview} />
                </div>

                {/* Status Details */}
                {doc.status === 'approved' && doc.approvedAt && (
                  <p className="text-sm text-gray-600">
                    ✅ Approved on {new Date(doc.approvedAt).toLocaleDateString()} at{' '}
                    {new Date(doc.approvedAt).toLocaleTimeString()}
                  </p>
                )}

                {doc.status === 'rejected' && doc.notes && (
                  <p className="text-sm text-red-600">
                    ❌ Rejected: {doc.notes}
                  </p>
                )}

                {doc.status === 'in_review' && (
                  <p className="text-sm text-blue-600">
                    🔍 Currently under review
                  </p>
                )}

                {doc.status === 'pending' && doc.canReview && (
                  <p className="text-sm text-gray-600">
                    👉 Click to review this document
                  </p>
                )}

                {doc.status === 'pending' && !doc.canReview && (
                  <p className="text-sm text-gray-500">
                    🔒 Complete previous step to unlock
                  </p>
                )}

                {/* Notes */}
                {doc.notes && doc.status === 'approved' && (
                  <p className="text-sm text-gray-500 mt-1">
                    Note: {doc.notes}
                  </p>
                )}
              </div>

              {/* Action Indicator */}
              {doc.canReview && doc.status === 'pending' && (
                <div className="flex-shrink-0 ml-4">
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Review
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string; canReview: boolean }> = ({ status, canReview }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'in_review':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending':
        return canReview
          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
          : 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'in_review':
        return 'In Review';
      case 'pending':
        return canReview ? 'Ready to Review' : 'Locked';
      default:
        return 'Pending';
    }
  };

  return (
    <span
      className={`
        px-3 py-1 text-xs font-semibold rounded-full border
        ${getBadgeStyle()}
      `}
    >
      {getStatusText()}
    </span>
  );
};

export default DocumentWorkflowStepper;

