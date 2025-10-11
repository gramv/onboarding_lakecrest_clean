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
  healthInsuranceCopay: string;
  notes?: string;
}

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
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ id: string; document_type: string; file_name: string; url?: string }>>([]);

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

  const togglePlanSelection = (key: string) => {
    setForm(prev => {
      const current = new Set(prev.healthInsuranceSelections || []);

      // If selecting "Insurance Declined", clear all other selections
      if (key === 'insurance_declined') {
        if (current.has(key)) {
          current.delete(key);
        } else {
          current.clear();
          current.add(key);
        }
      } else {
        // If selecting any other plan, remove "Insurance Declined"
        current.delete('insurance_declined');

        if (current.has(key)) {
          current.delete(key);
        } else {
          current.add(key);
        }
      }

      return {
        ...prev,
        healthInsuranceSelections: Array.from(current)
      };
    });
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
              <h3 className="text-sm font-semibold text-gray-800">Uploaded Identification Documents</h3>
              <ul className="space-y-2">
                {uploadedDocs.map(doc => (
                  <li key={doc.id} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="truncate mr-3">
                      {doc.document_type?.replace('_', ' ')} – {doc.file_name}
                    </span>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                      >
                        View
                      </a>
                    )}
                  </li>
                ))}
              </ul>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {planOptions.map(option => (
                    <label key={option.key} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planSelectionSet.has(option.key)}
                        onChange={() => togglePlanSelection(option.key)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-800">{option.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700">Copay per Pay Period</label>
                  <input
                    value={form.healthInsuranceCopay}
                    onChange={(e) => handleFieldChange('healthInsuranceCopay', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
