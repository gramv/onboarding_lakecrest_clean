import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import DocumentVerificationService from '@/services/documentVerificationService';

interface NewHireSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onApproved: () => void;
}

interface SummaryFormState {
  hotelName: string;
  hotelAddress: string;
  hotelCity: string;
  hotelState: string;
  hotelZipCode: string;
  stateOfEmployment: string;
  employeeFirstName: string;
  employeeLastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  employmentType: string;
  gender: string;
  employeePhone: string;
  employeeEmail: string;
  ssn: string;
  maritalStatus: string;
  dependents: string;
  dateOfBirth: string;
  rateOfPay: string;
  payFrequency: string;
  hireDate: string;
  department: string;
  position: string;
  healthInsuranceSelections: string[];
  healthInsuranceDisplay?: any; // Structured health insurance display data
  healthInsuranceCopay: string;
  notes?: string;
}

// Legacy plan options - kept for backward compatibility but not used in new display
const planOptions = [
  { key: 'uhc_hra_base', label: 'UHC HRA Base Plan' },
  { key: 'uhc_hra_buy_up', label: 'UHC HRA Buy Up Plan' },
  { key: 'cwi_minimum_essential', label: 'CWI Minimum Essential Plan' },
  { key: 'cwi_minimum_indemnity', label: 'CWI Minimum Indemnity Plan' },
  { key: 'uhc_dental', label: 'UHC Dental' },
  { key: 'uhc_vision', label: 'UHC Vision' },
  { key: 'insurance_declined', label: 'Insurance Declined', isDeclined: true }
];

const emptyState: SummaryFormState = {
  hotelName: '',
  hotelAddress: '',
  hotelCity: '',
  hotelState: '',
  hotelZipCode: '',
  stateOfEmployment: '',
  employeeFirstName: '',
  employeeLastName: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zipCode: '',
  employmentType: '',
  gender: '',
  employeePhone: '',
  employeeEmail: '',
  ssn: '',
  maritalStatus: '',
  dependents: '',
  dateOfBirth: '',
  rateOfPay: '',
  payFrequency: 'bi-weekly',
  hireDate: '',
  department: '',
  position: '',
  healthInsuranceSelections: [],
  healthInsuranceDisplay: undefined,
  healthInsuranceCopay: '',
  notes: ''
};

const allowedKeys = Object.keys(emptyState);

const NewHireSummaryModal: React.FC<NewHireSummaryModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  onApproved
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<SummaryFormState>(emptyState);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ id: string; document_type: string; file_name: string; url?: string; data?: string }>>([]);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await DocumentVerificationService.getNewHireSummary(employeeId);
      const payload = result?.data?.summary || {};
      const selections = Array.isArray(payload.healthInsuranceSelections)
        ? payload.healthInsuranceSelections.filter((key: string) => typeof key === 'string')
        : [];
      const nextState: SummaryFormState = {
        ...emptyState,
        ...payload,
        healthInsuranceSelections: selections
      };
      setForm(nextState);
      setPdfUrl(result?.data?.pdfUrl || null);
      setUploadedDocs(Array.isArray(result?.data?.uploadedDocuments) ? result?.data?.uploadedDocuments : []);
    } catch (err: any) {
      console.error('Failed to load new hire summary:', err);
      setError(err.message || 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (isOpen) {
      loadSummary();
    } else {
      setForm(emptyState);
      setPdfUrl(null);
      setUploadedDocs([]);
      setError(null);
    }
  }, [isOpen, employeeId, loadSummary]);

  const handleFieldChange = (field: keyof SummaryFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Legacy function - no longer used with read-only display
  const togglePlanSelection = (key: string) => {
    // This function is kept for backward compatibility but not used
    console.warn('togglePlanSelection is deprecated - health insurance is now read-only');
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const payload: Record<string, any> = {};
      allowedKeys.forEach(key => {
        const value = (form as any)[key];
        if (value !== undefined) {
          payload[key] = value;
        }
      });
      await DocumentVerificationService.approveNewHireSummary(employeeId, payload);
      onApproved();
      onClose();
    } catch (err: any) {
      console.error('Failed to approve new hire summary:', err);
      setError(err.message || 'Failed to approve summary');
    } finally {
      setSubmitting(false);
    }
  };

  // Legacy variable - no longer used with read-only display
  const planSelectionSet = useMemo(() => new Set(form.healthInsuranceSelections || []), [form.healthInsuranceSelections]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-2xl font-bold text-gray-900">New Hire Summary</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Close summary modal"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

          {pdfUrl && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <span className="text-sm text-blue-700">Existing approved summary available for download.</span>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View Current Summary
              </a>
            </div>
          )}

          {uploadedDocs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Uploaded Identification Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {uploadedDocs.map((doc, index) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
                    {/* Document Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-2 border-b">
                      <h4 className="font-semibold text-xs text-gray-900">
                        {doc.document_type?.replace(/_/g, ' ').toUpperCase()}
                      </h4>
                    </div>

                    {/* Image Preview */}
                    <div className="relative h-40 bg-gray-50">
                      {doc.data ? (
                        <img
                          src={`data:image/jpeg;base64,${doc.data}`}
                          alt={doc.file_name}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : doc.url ? (
                        <img
                          src={doc.url}
                          alt={doc.file_name}
                          className="w-full h-full object-contain p-2"
                          onError={(e) => {
                            // Fallback if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `
                              <div class="flex items-center justify-center h-full text-gray-500">
                                <div class="text-center">
                                  <svg class="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <p class="text-xs">Document not available</p>
                                </div>
                              </div>
                            `;
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">
                            <svg className="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-xs">Document not available</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="px-3 py-2 bg-gray-50 border-t">
                      <p className="text-xs text-gray-600 truncate" title={doc.file_name}>
                        📎 {doc.file_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Property Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Hotel Name</label>
                    <input
                      value={form.hotelName}
                      onChange={(e) => handleFieldChange('hotelName', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">State of Employment</label>
                    <input
                      value={form.stateOfEmployment}
                      onChange={(e) => handleFieldChange('stateOfEmployment', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Hotel Address</label>
                    <input
                      value={form.hotelAddress}
                      onChange={(e) => handleFieldChange('hotelAddress', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">City</label>
                      <input
                        value={form.hotelCity}
                        onChange={(e) => handleFieldChange('hotelCity', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">State</label>
                      <input
                        value={form.hotelState}
                        onChange={(e) => handleFieldChange('hotelState', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ZIP</label>
                      <input
                        value={form.hotelZipCode}
                        onChange={(e) => handleFieldChange('hotelZipCode', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Employee Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">First Name</label>
                    <input
                      value={form.employeeFirstName}
                      onChange={(e) => handleFieldChange('employeeFirstName', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      value={form.employeeLastName}
                      onChange={(e) => handleFieldChange('employeeLastName', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Address 1</label>
                    <input
                      value={form.address1}
                      onChange={(e) => handleFieldChange('address1', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Address 2</label>
                    <input
                      value={form.address2}
                      onChange={(e) => handleFieldChange('address2', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">City</label>
                      <input
                        value={form.city}
                        onChange={(e) => handleFieldChange('city', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">State</label>
                      <input
                        value={form.state}
                        onChange={(e) => handleFieldChange('state', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ZIP</label>
                      <input
                        value={form.zipCode}
                        onChange={(e) => handleFieldChange('zipCode', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Employment Type</label>
                    <input
                      value={form.employmentType}
                      onChange={(e) => handleFieldChange('employmentType', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Gender</label>
                    <input
                      value={form.gender}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <input
                      value={form.employeePhone}
                      onChange={(e) => handleFieldChange('employeePhone', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input
                      value={form.employeeEmail}
                      onChange={(e) => handleFieldChange('employeeEmail', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Social Security Number</label>
                    <input
                      value={form.ssn}
                      onChange={(e) => handleFieldChange('ssn', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Marital Status</label>
                    <input
                      value={form.maritalStatus}
                      onChange={(e) => handleFieldChange('maritalStatus', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Dependents</label>
                    <input
                      value={form.dependents}
                      onChange={(e) => handleFieldChange('dependents', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      value={form.dateOfBirth}
                      onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Rate of Pay</label>
                    <input
                      value={form.rateOfPay}
                      onChange={(e) => handleFieldChange('rateOfPay', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., $15.00/hour"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Pay Frequency</label>
                    <select
                      value={form.payFrequency}
                      onChange={(e) => handleFieldChange('payFrequency', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Hire Date</label>
                    <input
                      value={form.hireDate}
                      onChange={(e) => handleFieldChange('hireDate', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Department</label>
                    <input
                      value={form.department}
                      onChange={(e) => handleFieldChange('department', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Position</label>
                    <input
                      value={form.position}
                      onChange={(e) => handleFieldChange('position', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Health Insurance</h3>
                
                {/* Read-only Health Insurance Display */}
                {form.healthInsuranceDisplay && Object.keys(form.healthInsuranceDisplay).length > 0 ? (
                  <div className="space-y-4">
                    {form.healthInsuranceDisplay.is_waived || 
                     form.healthInsuranceDisplay.display_text?.toLowerCase().includes('declined') ||
                     form.healthInsuranceDisplay.selections?.includes('declined') ? (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-yellow-800">Health Insurance Declined</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              {form.healthInsuranceDisplay.display_text || 'Employee has waived health insurance coverage'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : form.healthInsuranceDisplay.medical_plan || 
                         form.healthInsuranceDisplay.dental || 
                         form.healthInsuranceDisplay.vision ? (
                      <div className="space-y-3">
                        {/* Medical Plan */}
                        {form.healthInsuranceDisplay.medical_plan && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-medium text-blue-900">Medical Plan</h4>
                                <p className="text-sm text-blue-800 mt-1">
                                  {form.healthInsuranceDisplay.medical_plan} - {form.healthInsuranceDisplay.medical_tier}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-blue-900">
                                  ${form.healthInsuranceDisplay.medical_cost?.toFixed(2) || '0.00'}
                                </p>
                                <p className="text-xs text-blue-600">bi-weekly</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Dental Coverage */}
                        {form.healthInsuranceDisplay.dental && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-medium text-green-900">Dental Coverage</h4>
                                <p className="text-sm text-green-800 mt-1">
                                  {form.healthInsuranceDisplay.dental.tier}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-green-900">
                                  ${form.healthInsuranceDisplay.dental.cost?.toFixed(2) || '0.00'}
                                </p>
                                <p className="text-xs text-green-600">bi-weekly</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Vision Coverage */}
                        {form.healthInsuranceDisplay.vision && (
                          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-medium text-purple-900">Vision Coverage</h4>
                                <p className="text-sm text-purple-800 mt-1">
                                  {form.healthInsuranceDisplay.vision.tier}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-purple-900">
                                  ${form.healthInsuranceDisplay.vision.cost?.toFixed(2) || '0.00'}
                                </p>
                                <p className="text-xs text-purple-600">bi-weekly</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Total Cost */}
                        {form.healthInsuranceDisplay.total_biweekly_cost > 0 && (
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-medium text-gray-900">Total Bi-weekly Cost</h4>
                              <p className="text-lg font-bold text-gray-900">
                                ${form.healthInsuranceDisplay.total_biweekly_cost?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Health insurance information incomplete - please verify with employee
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600">No health insurance information available</p>
                  </div>
                )}

                {/* Editable Copay Field */}
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700">Copay per Pay Period</label>
                  <input
                    value={form.healthInsuranceCopay}
                    onChange={(e) => handleFieldChange('healthInsuranceCopay', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={form.healthInsuranceDisplay?.total_biweekly_cost ? `Calculated: $${form.healthInsuranceDisplay.total_biweekly_cost.toFixed(2)}` : ''}
                  />
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Manager Notes</h3>
                <textarea
                  value={form.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional notes for HR reviewer"
                />
              </section>
            </div>
          )}

          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting || loading}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Approve Summary'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewHireSummaryModal;
