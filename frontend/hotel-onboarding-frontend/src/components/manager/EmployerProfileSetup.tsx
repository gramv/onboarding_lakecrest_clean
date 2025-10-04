/**
 * Employer Profile Setup Wizard
 * One-time setup to auto-fill all future forms
 */

import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, FileText, Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface EmployerProfileData {
  // Company Info
  business_legal_name: string;
  dba_name: string;
  
  // Address
  street_address: string;
  suite_apt: string;
  city: string;
  state: string;
  zip_code: string;
  
  // Contact
  phone: string;
  fax: string;
  email: string;
  website: string;
  
  // Tax Info
  ein: string;
  state_tax_id: string;
  
  // I-9 Specific
  i9_employer_name: string;
  i9_employer_title: string;
  i9_business_name: string;
  i9_business_address: string;
  
  // W-4 Specific
  w4_employer_name_address: string;
  
  // Health Insurance
  health_insurance_provider: string;
  health_insurance_group_number: string;
  health_insurance_contact: string;
}

interface EmployerProfileSetupProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export const EmployerProfileSetup: React.FC<EmployerProfileSetupProps> = ({
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  
  const [formData, setFormData] = useState<EmployerProfileData>({
    business_legal_name: '',
    dba_name: '',
    street_address: '',
    suite_apt: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    fax: '',
    email: '',
    website: '',
    ein: '',
    state_tax_id: '',
    i9_employer_name: '',
    i9_employer_title: '',
    i9_business_name: '',
    i9_business_address: '',
    w4_employer_name_address: '',
    health_insurance_provider: '',
    health_insurance_group_number: '',
    health_insurance_contact: ''
  });

  const steps = [
    { number: 1, title: 'Company Info', icon: Building2 },
    { number: 2, title: 'Contact Details', icon: Phone },
    { number: 3, title: 'Tax Information', icon: FileText },
    { number: 4, title: 'Form Settings', icon: Shield },
    { number: 5, title: 'Review', icon: CheckCircle }
  ];

  // Check for existing profile
  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const response = await fetch('/api/manager/employer-profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.exists && data.profile) {
        setExistingProfile(data.profile);
        setFormData(data.profile);
      }
    } catch (err) {
      console.error('Error checking profile:', err);
    }
  };

  const handleChange = (field: keyof EmployerProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Auto-fill I-9 and W-4 fields from company info
  const autoFillFormFields = () => {
    const fullAddress = `${formData.street_address}${formData.suite_apt ? ', ' + formData.suite_apt : ''}, ${formData.city}, ${formData.state} ${formData.zip_code}`;
    
    setFormData(prev => ({
      ...prev,
      i9_business_name: prev.i9_business_name || prev.business_legal_name,
      i9_business_address: prev.i9_business_address || fullAddress,
      w4_employer_name_address: prev.w4_employer_name_address || `${prev.business_legal_name}, ${fullAddress}`
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.business_legal_name || !formData.street_address || !formData.city || !formData.state || !formData.zip_code) {
          setError('Please fill in all required company information');
          return false;
        }
        break;
      case 2:
        if (!formData.phone || !formData.email) {
          setError('Please provide phone and email');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        break;
      case 3:
        if (!formData.ein) {
          setError('EIN is required');
          return false;
        }
        if (!/^\d{2}-?\d{7}$/.test(formData.ein)) {
          setError('Please enter a valid EIN (XX-XXXXXXX)');
          return false;
        }
        break;
      case 4:
        if (!formData.i9_employer_name || !formData.i9_employer_title) {
          setError('I-9 employer information is required');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    
    if (currentStep === 3) {
      autoFillFormFields();
    }
    
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    setError(null);

    try {
      const url = existingProfile 
        ? `/api/manager/employer-profile/${existingProfile.id}`
        : '/api/manager/employer-profile';
      
      const method = existingProfile ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to save employer profile');
      }

      onComplete();
      
    } catch (err: any) {
      setError(err.message || 'Failed to save employer profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {existingProfile ? 'Update' : 'Setup'} Employer Profile
          </h1>
          <p className="text-gray-600">
            This information will auto-fill all future employee forms
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    currentStep >= step.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs mt-2 text-gray-600">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Step 1: Company Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Company Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legal Business Name *
                </label>
                <input
                  type="text"
                  value={formData.business_legal_name}
                  onChange={(e) => handleChange('business_legal_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Grand Hotel LLC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DBA Name (if different)
                </label>
                <input
                  type="text"
                  value={formData.dba_name}
                  onChange={(e) => handleChange('dba_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Grand Hotel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={formData.street_address}
                  onChange={(e) => handleChange('street_address', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Suite/Apt
                </label>
                <input
                  type="text"
                  value={formData.suite_apt}
                  onChange={(e) => handleChange('suite_apt', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Suite 100"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="New York"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="NY"
                    maxLength={2}
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => handleChange('zip_code', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10001"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Contact Information</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fax Number
                  </label>
                  <input
                    type="tel"
                    value={formData.fax}
                    onChange={(e) => handleChange('fax', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4568"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="hr@grandhotel.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://www.grandhotel.com"
                />
              </div>
            </div>
          )}

          {/* Step 3: Tax Information */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Tax Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employer Identification Number (EIN) *
                </label>
                <input
                  type="text"
                  value={formData.ein}
                  onChange={(e) => handleChange('ein', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="XX-XXXXXXX"
                  maxLength={10}
                />
                <p className="text-sm text-gray-500 mt-1">Format: XX-XXXXXXX</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State Tax ID (if applicable)
                </label>
                <input
                  type="text"
                  value={formData.state_tax_id}
                  onChange={(e) => handleChange('state_tax_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="State Tax ID"
                />
              </div>
            </div>
          )}

          {/* Step 4: Form Settings */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Form Auto-Fill Settings</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  This information will automatically fill in I-9, W-4, and other forms for all employees.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I-9 Employer Representative Name *
                </label>
                <input
                  type="text"
                  value={formData.i9_employer_name}
                  onChange={(e) => handleChange('i9_employer_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Smith"
                />
                <p className="text-sm text-gray-500 mt-1">Person who will sign I-9 Section 2</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I-9 Employer Representative Title *
                </label>
                <input
                  type="text"
                  value={formData.i9_employer_title}
                  onChange={(e) => handleChange('i9_employer_title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="HR Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Health Insurance Provider (if applicable)
                </label>
                <input
                  type="text"
                  value={formData.health_insurance_provider}
                  onChange={(e) => handleChange('health_insurance_provider', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Blue Cross Blue Shield"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Number
                  </label>
                  <input
                    type="text"
                    value={formData.health_insurance_group_number}
                    onChange={(e) => handleChange('health_insurance_group_number', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Insurance Contact
                  </label>
                  <input
                    type="text"
                    value={formData.health_insurance_contact}
                    onChange={(e) => handleChange('health_insurance_contact', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(800) 555-1234"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Review & Confirm</h2>

              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Company Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">Legal Name:</div>
                    <div className="font-medium">{formData.business_legal_name}</div>
                    <div className="text-gray-600">Address:</div>
                    <div className="font-medium">
                      {formData.street_address}{formData.suite_apt && `, ${formData.suite_apt}`}<br />
                      {formData.city}, {formData.state} {formData.zip_code}
                    </div>
                  </div>
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">Phone:</div>
                    <div className="font-medium">{formData.phone}</div>
                    <div className="text-gray-600">Email:</div>
                    <div className="font-medium">{formData.email}</div>
                  </div>
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Tax Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">EIN:</div>
                    <div className="font-medium">{formData.ein}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">I-9 Representative</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">Name:</div>
                    <div className="font-medium">{formData.i9_employer_name}</div>
                    <div className="text-gray-600">Title:</div>
                    <div className="font-medium">{formData.i9_employer_title}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={currentStep === 1 ? onSkip : handleBack}
              className="px-6 py-2 text-gray-600 hover:text-gray-900"
              disabled={loading}
            >
              {currentStep === 1 ? 'Skip for Now' : 'Back'}
            </button>

            <button
              onClick={currentStep === 5 ? handleSubmit : handleNext}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : currentStep === 5 ? 'Save Profile' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerProfileSetup;

