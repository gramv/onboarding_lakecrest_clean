import React, { useState } from 'react';
import { X } from 'lucide-react';
import { US_STATES } from '../../../types/i9ManagerReview';

interface EmployerSetupModalProps {
  onSave: (employerData: any) => void;
  onClose: () => void;
}

export const EmployerSetupModal: React.FC<EmployerSetupModalProps> = ({ onSave, onClose }) => {
  const [formData, setFormData] = useState({
    i9_employer_name: '',
    i9_employer_title: '',
    i9_business_name: '',
    i9_business_address: '',
    city: '',
    state: '',
    zip_code: '',
    ein: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields are filled
    if (!formData.i9_employer_name || !formData.i9_employer_title || !formData.i9_business_name ||
        !formData.i9_business_address || !formData.city || !formData.state || !formData.zip_code || !formData.ein) {
      alert('Please fill all required fields');
      return;
    }

    // Validate EIN format (XX-XXXXXXX)
    const einPattern = /^\d{2}-?\d{7}$/;
    if (!einPattern.test(formData.ein.replace(/-/g, ''))) {
      alert('Please enter a valid EIN (format: XX-XXXXXXX)');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Employer Information Setup</h3>
            <p className="text-sm text-gray-600 mt-1">
              This is your first I-9 review. Please provide your employer information below.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Your Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800">Your Information</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.i9_employer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, i9_employer_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">As it will appear on I-9 forms</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.i9_employer_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, i9_employer_title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="General Manager"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Your job title</p>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800">Business Information</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.i9_business_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, i9_business_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Hilton Downtown Los Angeles"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employer Identification Number (EIN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ein}
                  onChange={(e) => {
                    // Auto-format EIN as XX-XXXXXXX
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 2) {
                      value = value.slice(0, 2) + '-' + value.slice(2, 9);
                    }
                    setFormData(prev => ({ ...prev, ein: value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="12-3456789"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Required for W-4 forms</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.i9_business_address}
                onChange={(e) => setFormData(prev => ({ ...prev, i9_business_address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="123 Main Street, Suite 100"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
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
                  value={formData.zip_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="90001"
                  maxLength={10}
                  required
                />
              </div>
            </div>
          </div>

          {/* Info Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> This information will be saved to your employer profile and 
              automatically filled in for all future I-9 Section 2 reviews. You can update it 
              anytime from your profile settings.
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save & Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

