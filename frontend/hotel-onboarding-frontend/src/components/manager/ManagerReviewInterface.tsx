/**
 * Manager Review Interface
 * Side-by-side view for reviewing and editing employee forms
 */

import React, { useState, useEffect } from 'react';
import { Eye, Edit2, Save, X, AlertCircle, CheckCircle, FileText, Clock } from 'lucide-react';
import OTPVerificationModal from './OTPVerificationModal';

interface FieldData {
  value: string;
  source: 'employee' | 'ocr' | 'employer_profile' | 'uploaded_document';
  editable: boolean;
  confidence?: number;
  original_value?: string;
}

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
  const [sessionExpires, setSessionExpires] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, FieldData>>({});
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'i9' | 'w4' | 'insurance'>('i9');

  // Session countdown
  useEffect(() => {
    if (!sessionExpires) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(sessionExpires).getTime();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        setSessionToken(null);
        setError('Session expired. Please verify again to continue.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionExpires]);

  // Load employee data after OTP verification
  useEffect(() => {
    if (sessionToken) {
      loadEmployeeData();
    }
  }, [sessionToken]);

  const handleOTPVerified = (token: string, expires: string) => {
    setSessionToken(token);
    setSessionExpires(expires);
    setShowOTPModal(false);
  };

  const loadEmployeeData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/manager/review/employees/${employeeId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to load employee data');
      }

      setEmployeeData(data);
      
      // Load I-9 Section 2 data with auto-fill
      if (activeTab === 'i9') {
        await loadI9Section2Data();
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadI9Section2Data = async () => {
    try {
      const response = await fetch(
        `/api/manager/review/employees/${employeeId}/i9-section-2-data`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();

      if (response.ok && data.form_data) {
        setFormData(data.form_data);
      }
    } catch (err) {
      console.error('Error loading I-9 data:', err);
    }
  };

  const handleFieldEdit = (fieldName: string, newValue: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        value: newValue
      }
    }));
    
    setEditedFields(prev => new Set(prev).add(fieldName));
  };

  const trackEdit = async (fieldName: string, originalValue: string, editedValue: string) => {
    try {
      await fetch('/api/manager/edits/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          employee_id: employeeId,
          form_type: activeTab === 'i9' ? 'i9_section_2' : activeTab === 'w4' ? 'w4' : 'health_insurance',
          field_name: fieldName,
          field_label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          original_value: originalValue,
          edited_value: editedValue,
          ocr_confidence: formData[fieldName]?.confidence,
          edit_reason: 'manager_review',
          edit_notes: 'Corrected during manager review'
        })
      });
    } catch (err) {
      console.error('Error tracking edit:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Track all edits
      for (const fieldName of editedFields) {
        const field = formData[fieldName];
        if (field.original_value && field.value !== field.original_value) {
          await trackEdit(fieldName, field.original_value, field.value);
        }
      }

      // Save the form data
      // TODO: Implement save endpoint
      
      setEditedFields(new Set());
      
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
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
              {/* Session Timer */}
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Session: {formatTime(timeRemaining)}
                </span>
              </div>

              {/* Save Button */}
              {editedFields.size > 0 && (
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300"
                >
                  <Save className="w-4 h-4" />
                  Save Changes ({editedFields.size})
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('i9')}
              className={`px-4 py-2 font-semibold border-b-2 ${
                activeTab === 'i9'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              I-9 Section 2
            </button>
            <button
              onClick={() => setActiveTab('w4')}
              className={`px-4 py-2 font-semibold border-b-2 ${
                activeTab === 'w4'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              W-4
            </button>
            <button
              onClick={() => setActiveTab('insurance')}
              className={`px-4 py-2 font-semibold border-b-2 ${
                activeTab === 'insurance'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Health Insurance
            </button>
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
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Form fields will be rendered here based on activeTab */}
            <div className="space-y-6">
              {Object.entries(formData).map(([fieldName, field]) => (
                <FormField
                  key={fieldName}
                  fieldName={fieldName}
                  field={field}
                  onEdit={handleFieldEdit}
                  isEdited={editedFields.has(fieldName)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Form Field Component
interface FormFieldProps {
  fieldName: string;
  field: FieldData;
  onEdit: (fieldName: string, value: string) => void;
  isEdited: boolean;
}

const FormField: React.FC<FormFieldProps> = ({ fieldName, field, onEdit, isEdited }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(field.value);

  const handleSave = () => {
    onEdit(fieldName, value);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(field.value);
    setIsEditing(false);
  };

  const getSourceBadge = (source: string) => {
    const badges = {
      employee: { label: 'Employee', color: 'bg-blue-100 text-blue-800' },
      ocr: { label: 'OCR', color: 'bg-purple-100 text-purple-800' },
      employer_profile: { label: 'Auto-filled', color: 'bg-green-100 text-green-800' },
      uploaded_document: { label: 'Document', color: 'bg-yellow-100 text-yellow-800' }
    };

    const badge = badges[source as keyof typeof badges] || badges.employee;

    return (
      <span className={`text-xs px-2 py-1 rounded ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className={`border rounded-lg p-4 ${isEdited ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <label className="font-medium text-gray-900">
              {fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
            {getSourceBadge(field.source)}
            {field.confidence && (
              <span className={`text-xs ${field.confidence >= 0.9 ? 'text-green-600' : field.confidence >= 0.7 ? 'text-yellow-600' : 'text-red-600'}`}>
                {Math.round(field.confidence * 100)}% confidence
              </span>
            )}
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={handleSave}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-gray-700">{field.value || '(empty)'}</p>
              {field.editable && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerReviewInterface;

