import React, { useState, useEffect } from 'react';
import { CheckCircle, Edit2, AlertCircle } from 'lucide-react';
import { SignaturePadModal } from '../SignaturePadModal';
import { SignatureData, US_STATES } from '../../../types/i9ManagerReview';

interface EmployerFormProps {
  employerProfile: {
    i9_employer_name: string;
    i9_employer_title: string;
    i9_business_name: string;
    i9_business_address: string;
    city: string;
    state: string;
    zip_code: string;
  } | null;
  employeeStartDate: string;
  onComplete: (data: any) => void;
}

export const EmployerForm: React.FC<EmployerFormProps> = ({
  employerProfile,
  employeeStartDate,
  onComplete
}) => {
  const [formData, setFormData] = useState({
    firstDayOfEmployment: '',
    employerName: '',
    employerTitle: '',
    businessName: '',
    businessAddress: '',
    city: '',
    state: '',
    zipCode: '',
    signature: null as SignatureData | null,
    signatureDate: new Date().toISOString().split('T')[0]
  });

  const [showSignaturePad, setShowSignaturePad] = useState(false);

  // Auto-fill on mount
  useEffect(() => {
    console.log('[EmployerForm] Auto-fill triggered:', { employeeStartDate, employerProfile });
    
    // Auto-fill employment date - convert to YYYY-MM-DD if needed
    if (employeeStartDate) {
      try {
        // Handle various date formats
        let formattedDate = employeeStartDate;
        
        // If it's an ISO string with time, extract just the date part
        if (employeeStartDate.includes('T')) {
          formattedDate = employeeStartDate.split('T')[0];
        }
        
        // Validate it's YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
          console.log('[EmployerForm] Setting firstDayOfEmployment:', formattedDate);
          setFormData(prev => ({ ...prev, firstDayOfEmployment: formattedDate }));
        } else {
          console.warn('[EmployerForm] Invalid date format:', employeeStartDate);
        }
      } catch (err) {
        console.error('[EmployerForm] Error processing date:', err);
      }
    } else {
      console.warn('[EmployerForm] No employeeStartDate provided - field will be empty');
    }

    // Auto-fill employer data if profile exists
    if (employerProfile) {
      console.log('[EmployerForm] Auto-filling employer profile');
      setFormData(prev => ({
        ...prev,
        employerName: employerProfile.i9_employer_name || '',
        employerTitle: employerProfile.i9_employer_title || '',
        businessName: employerProfile.i9_business_name || '',
        businessAddress: employerProfile.i9_business_address || '',
        city: employerProfile.city || '',
        state: employerProfile.state || '',
        zipCode: employerProfile.zip_code || ''
      }));
    } else {
      console.warn('[EmployerForm] No employer profile provided');
    }
  }, [employerProfile, employeeStartDate]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignatureComplete = (signature: SignatureData) => {
    setFormData(prev => ({ ...prev, signature }));
    setShowSignaturePad(false);
  };

  const handleSubmit = () => {
    if (!formData.signature) {
      alert('Please sign the form before submitting');
      return;
    }

    // Validate required fields
    if (!formData.firstDayOfEmployment || !formData.employerName || !formData.employerTitle ||
        !formData.businessName || !formData.businessAddress || !formData.city ||
        !formData.state || !formData.zipCode) {
      alert('Please fill all required fields');
      return;
    }

    onComplete(formData);
  };

  return (
    <div className="h-full flex flex-col border rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b px-4 py-3">
        <h3 className="font-semibold text-gray-900">Section 2: Employer Verification</h3>
        <p className="text-sm text-gray-600 mt-1">
          Complete employer information and sign
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Employment Information */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            Employment Information
            {employeeStartDate && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Auto-filled</span>
            )}
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Day of Employment <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.firstDayOfEmployment}
              onChange={(e) => handleFieldChange('firstDayOfEmployment', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Employer Attestation */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            Employer Attestation
            {employerProfile && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Auto-filled from profile</span>
            )}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.employerName}
                onChange={(e) => handleFieldChange('employerName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="John Smith"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.employerTitle}
                onChange={(e) => handleFieldChange('employerTitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="General Manager"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => handleFieldChange('businessName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Hilton Downtown Los Angeles"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.businessAddress}
              onChange={(e) => handleFieldChange('businessAddress', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main Street, Suite 100"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Los Angeles"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.state}
                onChange={(e) => handleFieldChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select...</option>
                {US_STATES.map(state => (
                  <option key={state.code} value={state.code}>{state.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => handleFieldChange('zipCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="90001"
                maxLength={10}
                required
              />
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-800">
            Signature <span className="text-red-500">*</span>
          </h4>

          {formData.signature ? (
            <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Signature Captured</span>
                </div>
                <button
                  onClick={() => setShowSignaturePad(true)}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Change
                </button>
              </div>
              <img
                src={formData.signature.dataUrl}
                alt="Signature"
                className="h-24 bg-white border border-green-300 rounded px-4 py-2"
              />
              <p className="text-xs text-gray-600 mt-2">
                Signed on {new Date(formData.signature.timestamp).toLocaleString()}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowSignaturePad(true)}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600 font-medium"
            >
              Click to Sign
            </button>
          )}

          <p className="text-sm text-gray-600">
            <strong>Date:</strong> {new Date(formData.signatureDate).toLocaleDateString()}
          </p>
        </div>

        {/* Federal Compliance Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Federal Compliance Attestation</p>
              <p>
                By signing this form, you attest under penalty of perjury that you have examined 
                the documentation presented by the employee, the documentation appears to be genuine 
                and relates to the employee named, and to the best of your knowledge, the employee 
                is authorized to work in the United States.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t p-4 bg-gray-50">
        <button
          onClick={handleSubmit}
          disabled={!formData.signature}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Complete & Sign I-9 Section 2
        </button>
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <SignaturePadModal
          title="Sign I-9 Section 2"
          onComplete={handleSignatureComplete}
          onClose={() => setShowSignaturePad(false)}
        />
      )}
    </div>
  );
};

