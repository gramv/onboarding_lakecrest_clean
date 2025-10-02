import React, { useState, useEffect } from 'react';
import { AlertTriangle, FileText, CheckCircle, Info, Users, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AutoFillManager, extractAutoFillData } from '@/utils/autoFill';
import { validateI9Section1, validateAge, validateSSN, FederalValidationError, generateComplianceAuditEntry } from '@/utils/federalValidation';

interface I9Section1FormProps {
  onComplete: (data: any) => void;
  initialData?: any;
  language?: 'en' | 'es';
}

interface FormData {
  // Personal Information
  employee_last_name: string;
  employee_first_name: string;
  employee_middle_initial: string;
  other_last_names: string;
  
  // Address
  address_street: string;
  address_apt: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  
  // Personal Details
  date_of_birth: string;
  ssn: string;
  email: string;
  phone: string;
  
  // Citizenship Status
  citizenship_status: 'us_citizen' | 'noncitizen_national' | 'permanent_resident' | 'authorized_alien' | '';
  
  // Additional fields for non-citizens
  uscis_number: string;
  i94_admission_number: string;
  passport_number: string;
  passport_country: string;
  work_authorization_expiration: string;
  
  // FEDERAL COMPLIANCE: Employee Signature Fields
  employee_signature_date: string;
  employee_attestation: boolean;
}

const I9Section1Form: React.FC<I9Section1FormProps> = ({
  onComplete,
  initialData = {},
  language = 'en'
}) => {
  const [formData, setFormData] = useState<FormData>(() => {
    const baseData = {
      employee_last_name: '',
      employee_first_name: '',
      employee_middle_initial: '',
      other_last_names: '',
      address_street: '',
      address_apt: '',
      address_city: '',
      address_state: '',
      address_zip: '',
      date_of_birth: '',
      ssn: '',
      email: '',
      phone: '',
      citizenship_status: '',
      uscis_number: '',
      i94_admission_number: '',
      passport_number: '',
      passport_country: '',
      work_authorization_expiration: '',
      // FEDERAL COMPLIANCE: Initialize signature fields
      employee_signature_date: new Date().toISOString().split('T')[0],
      employee_attestation: false,
      ...initialData
    };
    
    // Apply auto-fill data
    const autoFill = AutoFillManager.getInstance();
    return autoFill.autoFillForm(baseData, 'i9_section1');
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [federalValidationResult, setFederalValidationResult] = useState<any>(null);
  const [complianceBlocked, setComplianceBlocked] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [showErrors, setShowErrors] = useState(false);

  const content = {
    en: {
      title: "Form I-9, Section 1: Employee Information and Attestation",
      subtitle: "Employment Eligibility Verification - Employee Portion",
      sections: [
        {
          title: "Personal Information",
          description: "Enter your legal name as it appears on your identification documents"
        },
        {
          title: "Address Information", 
          description: "Provide your current residential address"
        },
        {
          title: "Contact & Personal Details",
          description: "Enter your contact information and personal details"
        },
        {
          title: "Citizenship and Work Authorization",
          description: "Select your citizenship status and provide required documentation information"
        }
      ],
      citizenshipOptions: [
        {
          value: 'us_citizen',
          label: 'A citizen of the United States',
          description: 'Born in the U.S. or naturalized citizen'
        },
        {
          value: 'noncitizen_national',
          label: 'A noncitizen national of the United States',
          description: 'Born in American Samoa, Swains Island, or certain U.S. territories'
        },
        {
          value: 'permanent_resident',
          label: 'A lawful permanent resident',
          description: 'Have a valid Permanent Resident Card (Green Card)'
        },
        {
          value: 'authorized_alien',
          label: 'An alien authorized to work',
          description: 'Have temporary work authorization from USCIS or other agency'
        }
      ]
    },
    es: {
      title: "Formulario I-9, Sección 1: Información del Empleado y Certificación",
      subtitle: "Verificación de Elegibilidad de Empleo - Porción del Empleado",
      sections: [
        {
          title: "Información Personal",
          description: "Ingrese su nombre legal como aparece en sus documentos de identificación"
        },
        {
          title: "Información de Dirección", 
          description: "Proporcione su dirección residencial actual"
        },
        {
          title: "Contacto y Detalles Personales",
          description: "Ingrese su información de contacto y detalles personales"
        },
        {
          title: "Ciudadanía y Autorización de Trabajo",
          description: "Seleccione su estado de ciudadanía y proporcione la información de documentación requerida"
        }
      ],
      citizenshipOptions: [
        {
          value: 'us_citizen',
          label: 'Un ciudadano de los Estados Unidos',
          description: 'Nacido en EE.UU. o ciudadano naturalizado'
        },
        {
          value: 'noncitizen_national',
          label: 'Un nacional no ciudadano de los Estados Unidos',
          description: 'Nacido en Samoa Americana, Isla Swains, o ciertos territorios de EE.UU.'
        },
        {
          value: 'permanent_resident',
          label: 'Un residente permanente legal',
          description: 'Tiene una Tarjeta de Residente Permanente válida (Tarjeta Verde)'
        },
        {
          value: 'authorized_alien',
          label: 'Un extranjero autorizado para trabajar',
          description: 'Tiene autorización temporal de trabajo de USCIS u otra agencia'
        }
      ]
    }
  };

  const currentContent = content[language];

  useEffect(() => {
    // Auto-populate from initial data if provided
    if (Object.keys(initialData).length > 0) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const validateSection = (sectionIndex: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Only validate fields relevant to the current section
    let partialFormData: Partial<FormData> = {};
    
    switch (sectionIndex) {
      case 0: // Personal Information section
        partialFormData = {
          employee_first_name: formData.employee_first_name,
          employee_last_name: formData.employee_last_name,
          employee_middle_initial: formData.employee_middle_initial,
          other_last_names: formData.other_last_names
        };
        break;
      case 1: // Address section
        partialFormData = {
          address_street: formData.address_street,
          address_apt: formData.address_apt,
          address_city: formData.address_city,
          address_state: formData.address_state,
          address_zip: formData.address_zip
        };
        break;
      case 2: // Personal Details section
        partialFormData = {
          date_of_birth: formData.date_of_birth,
          ssn: formData.ssn,
          email: formData.email,
          phone: formData.phone
        };
        break;
      case 3: // Citizenship section
        partialFormData = {
          citizenship_status: formData.citizenship_status,
          uscis_number: formData.uscis_number,
          i94_admission_number: formData.i94_admission_number,
          passport_number: formData.passport_number,
          passport_country: formData.passport_country,
          work_authorization_expiration: formData.work_authorization_expiration,
          employee_attestation: formData.employee_attestation
        };
        break;
    }
    
    // Only run federal validation on final submission, not during navigation
    if (sectionIndex === 3) {
      // Run full federal validation on the complete form data
      const federalValidation = validateI9Section1(formData);
      setFederalValidationResult(federalValidation);
      
      // Check for compliance blocking errors (age violations)
      const hasAgeViolations = federalValidation.errors.some(e => 
        e.legalCode.includes('FLSA') || e.legalCode.includes('CHILD-LABOR')
      );
      setComplianceBlocked(hasAgeViolations);
      
      // Add federal validation errors to the errors object
      for (const error of federalValidation.errors) {
        newErrors[error.field] = error.message;
      }
    }

    // Section-specific basic validation (in addition to federal validation)
    switch (sectionIndex) {
      case 0: // Personal Information
        if (!formData.employee_first_name.trim()) {
          newErrors.employee_first_name = 'First name is required for I-9 federal compliance';
        }
        if (!formData.employee_last_name.trim()) {
          newErrors.employee_last_name = 'Last name is required for I-9 federal compliance';
        }
        break;

      case 1: // Address
        if (!formData.address_street.trim()) {
          newErrors.address_street = 'Street address is required for I-9 federal compliance';
        }
        if (!formData.address_city.trim()) {
          newErrors.address_city = 'City is required for I-9 federal compliance';
        }
        if (!formData.address_state.trim()) {
          newErrors.address_state = 'State is required for I-9 federal compliance';
        }
        break;

      case 2: // Contact & Personal Details - federal validation handles this
        break;

      case 3: // Citizenship and Employee Signature - federal validation handles most of this
        if (!formData.citizenship_status.trim()) {
          newErrors.citizenship_status = 'Citizenship status must be selected for federal compliance (8 U.S.C. § 1324a)';
        }
        
        // Enhanced signature date validation
        if (!formData.employee_signature_date) {
          newErrors.employee_signature_date = 'Employee signature date is required by federal law (8 CFR § 274a.2)';
        } else {
          const signatureDate = new Date(formData.employee_signature_date);
          const today = new Date();
          const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          // Reset time components for accurate date comparison
          signatureDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          sevenDaysAgo.setHours(0, 0, 0, 0);
          
          if (signatureDate > today) {
            newErrors.employee_signature_date = 'FEDERAL VIOLATION: Signature date cannot be in the future (8 CFR § 274a.2)';
          } else if (signatureDate < sevenDaysAgo) {
            newErrors.employee_signature_date = 'FEDERAL REQUIREMENT: Signature date must be within 7 days of today (8 CFR § 274a.2)';
          }
        }
        
        if (!formData.employee_attestation) {
          newErrors.employee_attestation = 'Federal attestation is required by law - employee must certify under penalty of perjury (18 U.S.C. § 1546)';
        }
        break;
    }

    setErrors(newErrors);
    
    // For sections 0-2, only check if there are no errors
    // For section 3, also check federal validation
    if (sectionIndex === 3) {
      const federalValidation = validateI9Section1(formData);
      return Object.keys(newErrors).length === 0 && federalValidation.isValid;
    } else {
      return Object.keys(newErrors).length === 0;
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle field blur to show validation errors
  const handleFieldBlur = (field: keyof FormData) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  // Function to determine if error should be shown
  const shouldShowError = (field: string) => {
    return showErrors || touchedFields[field];
  };

  const formatSSN = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 9)}`;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handleNext = () => {
    if (complianceBlocked) {
      alert(
        'FEDERAL COMPLIANCE VIOLATION DETECTED\n\n' +
        'Cannot proceed due to critical federal employment law violations. ' +
        'Please review and correct all compliance errors before continuing.\n\n' +
        'Legal Reference: Immigration and Nationality Act Section 274A'
      );
      return;
    }
    
    // Validate current section only
    if (validateSection(currentSection)) {
      if (currentSection < currentContent.sections.length - 1) {
        setCurrentSection(currentSection + 1);
        // Reset showErrors for next section
        setShowErrors(false);
      } else {
        // Show all errors for final validation
        setShowErrors(true);
        // Validate all sections before completion
        let allValid = true;
        for (let i = 0; i < currentContent.sections.length; i++) {
          if (!validateSection(i)) {
            allValid = false;
            break;
          }
        }
        
        if (allValid) {
          // Complete form with compliance audit
          const completionData = {
            ...formData,
            section_1_completed_at: new Date().toISOString(),
            employee_signature_timestamp: new Date().toISOString(),
            employee_signature_date: formData.employee_signature_date,
            federal_compliance_verified: federalValidationResult?.isValid || false,
            federal_attestation_confirmed: formData.employee_attestation,
            compliance_audit_trail: generateComplianceAuditEntry(
              'I9_Section1',
              federalValidationResult,
              { id: 'current_user', email: 'employee@company.com' }
            ),
            legal_warnings_acknowledged: true,
            federal_penalties_notice_displayed: true
          };
          
          // Extract and save data for auto-fill in other forms
          extractAutoFillData(formData, 'i9_section1');
          
          onComplete(completionData);
        }
      }
    } else {
      // Only show errors for current section if validation fails
      setShowErrors(true);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const renderPersonalInfo = () => (
    <div className="space-y-3">
      <details className="group">
        <summary className="cursor-pointer bg-blue-50 border border-blue-200 rounded p-2 hover:bg-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-semibold text-blue-900">Important Instructions</span>
            </div>
            <svg className="h-3 w-3 text-blue-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div className="mt-1 text-xs text-blue-800 px-3 pb-2">
          Enter your name exactly as it appears on your identification documents.
        </div>
      </details>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Legal Name Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.employee_last_name}
              onChange={(e) => handleInputChange('employee_last_name', e.target.value)}
              onBlur={() => handleFieldBlur('employee_last_name')}
              className={`w-full px-2 py-1 border rounded text-sm h-8 ${shouldShowError('employee_last_name') && errors.employee_last_name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder=""
            />
            {shouldShowError('employee_last_name') && errors.employee_last_name && (
              <p className="text-red-600 text-xs mt-1">{errors.employee_last_name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={formData.employee_first_name}
              onChange={(e) => handleInputChange('employee_first_name', e.target.value)}
              onBlur={() => handleFieldBlur('employee_first_name')}
              className={`w-full px-2 py-1 border rounded text-sm h-8 ${shouldShowError('employee_first_name') && errors.employee_first_name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder=""
            />
            {shouldShowError('employee_first_name') && errors.employee_first_name && (
              <p className="text-red-600 text-xs mt-1">{errors.employee_first_name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Middle Initial
            </label>
            <input
              type="text"
              value={formData.employee_middle_initial}
              onChange={(e) => handleInputChange('employee_middle_initial', e.target.value.slice(0, 1))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm h-8"
              placeholder=""
              maxLength={1}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Other Last Names
            </label>
            <input
              type="text"
              value={formData.other_last_names}
              onChange={(e) => handleInputChange('other_last_names', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm h-8"
              placeholder=""
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAddressInfo = () => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Residential Address</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <div className="md:col-span-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Street Address *
          </label>
          <input
            type="text"
            value={formData.address_street}
            onChange={(e) => handleInputChange('address_street', e.target.value)}
            onBlur={() => handleFieldBlur('address_street')}
            className={`w-full px-2 py-1 border rounded text-sm h-8 ${shouldShowError('address_street') && errors.address_street ? 'border-red-500' : 'border-gray-300'}`}
            placeholder=""
          />
          {shouldShowError('address_street') && errors.address_street && (
            <p className="text-red-600 text-xs mt-1">{errors.address_street}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Apt/Unit
          </label>
          <input
            type="text"
            value={formData.address_apt}
            onChange={(e) => handleInputChange('address_apt', e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm h-8"
            placeholder=""
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            City *
          </label>
          <input
            type="text"
            value={formData.address_city}
            onChange={(e) => handleInputChange('address_city', e.target.value)}
            onBlur={() => handleFieldBlur('address_city')}
            className={`w-full px-2 py-1 border rounded text-sm h-8 ${shouldShowError('address_city') && errors.address_city ? 'border-red-500' : 'border-gray-300'}`}
            placeholder=""
          />
          {shouldShowError('address_city') && errors.address_city && (
            <p className="text-red-600 text-xs mt-1">{errors.address_city}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            State *
          </label>
          <Select
            value={formData.address_state}
            onValueChange={(value) => handleInputChange('address_state', value)}
          >
            <SelectTrigger className={`h-8 text-sm ${
              shouldShowError('address_state') && errors.address_state ? 'border-red-500' : ''
            }`}>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="AL">AL</SelectItem>
              <SelectItem value="AK">AK</SelectItem>
              <SelectItem value="AZ">AZ</SelectItem>
              <SelectItem value="AR">AR</SelectItem>
              <SelectItem value="CA">CA</SelectItem>
              <SelectItem value="CO">CO</SelectItem>
              <SelectItem value="CT">CT</SelectItem>
              <SelectItem value="DE">DE</SelectItem>
              <SelectItem value="FL">FL</SelectItem>
              <SelectItem value="GA">GA</SelectItem>
              <SelectItem value="HI">HI</SelectItem>
              <SelectItem value="ID">ID</SelectItem>
              <SelectItem value="IL">IL</SelectItem>
              <SelectItem value="IN">IN</SelectItem>
              <SelectItem value="IA">IA</SelectItem>
              <SelectItem value="KS">KS</SelectItem>
              <SelectItem value="KY">KY</SelectItem>
              <SelectItem value="LA">LA</SelectItem>
              <SelectItem value="ME">ME</SelectItem>
              <SelectItem value="MD">MD</SelectItem>
              <SelectItem value="MA">MA</SelectItem>
              <SelectItem value="MI">MI</SelectItem>
              <SelectItem value="MN">MN</SelectItem>
              <SelectItem value="MS">MS</SelectItem>
              <SelectItem value="MO">MO</SelectItem>
              <SelectItem value="MT">MT</SelectItem>
              <SelectItem value="NE">NE</SelectItem>
              <SelectItem value="NV">NV</SelectItem>
              <SelectItem value="NH">NH</SelectItem>
              <SelectItem value="NJ">NJ</SelectItem>
              <SelectItem value="NM">NM</SelectItem>
              <SelectItem value="NY">NY</SelectItem>
              <SelectItem value="NC">NC</SelectItem>
              <SelectItem value="ND">ND</SelectItem>
              <SelectItem value="OH">OH</SelectItem>
              <SelectItem value="OK">OK</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
              <SelectItem value="PA">PA</SelectItem>
              <SelectItem value="RI">RI</SelectItem>
              <SelectItem value="SC">SC</SelectItem>
              <SelectItem value="SD">SD</SelectItem>
              <SelectItem value="TN">TN</SelectItem>
              <SelectItem value="TX">TX</SelectItem>
              <SelectItem value="UT">UT</SelectItem>
              <SelectItem value="VT">VT</SelectItem>
              <SelectItem value="VA">VA</SelectItem>
              <SelectItem value="WA">WA</SelectItem>
              <SelectItem value="WV">WV</SelectItem>
              <SelectItem value="WI">WI</SelectItem>
              <SelectItem value="WY">WY</SelectItem>
            </SelectContent>
          </Select>
          {shouldShowError('address_state') && errors.address_state && (
            <p className="text-red-600 text-xs mt-1">{errors.address_state}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            ZIP Code *
          </label>
          <input
            type="text"
            value={formData.address_zip}
            onChange={(e) => handleInputChange('address_zip', e.target.value)}
            onBlur={() => handleFieldBlur('address_zip')}
            className={`w-full px-2 py-1 border rounded text-sm h-8 ${shouldShowError('address_zip') && errors.address_zip ? 'border-red-500' : 'border-gray-300'}`}
            placeholder=""
            maxLength={10}
          />
          {shouldShowError('address_zip') && errors.address_zip && (
            <p className="text-red-600 text-xs mt-1">{errors.address_zip}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderContactInfo = () => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Personal Details & Contact</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Date of Birth *
          </label>
          <input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
            onBlur={() => handleFieldBlur('date_of_birth')}
            className={`w-full px-2 py-1 border rounded text-sm h-8 ${shouldShowError('date_of_birth') && errors.date_of_birth ? 'border-red-500' : 'border-gray-300'}`}
          />
          {shouldShowError('date_of_birth') && errors.date_of_birth && (
            <p className="text-red-600 text-xs mt-1">{errors.date_of_birth}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Social Security Number *
          </label>
          <input
            type="text"
            value={formData.ssn}
            onChange={(e) => handleInputChange('ssn', formatSSN(e.target.value))}
            onBlur={() => handleFieldBlur('ssn')}
            className={`w-full px-2 py-1 border rounded text-sm h-8 ${shouldShowError('ssn') && errors.ssn ? 'border-red-500' : 'border-gray-300'}`}
            placeholder=""
            maxLength={11}
          />
          {shouldShowError('ssn') && errors.ssn && (
            <p className="text-red-600 text-xs mt-1">{errors.ssn}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            onBlur={() => handleFieldBlur('email')}
            className={`w-full px-2 py-1 border rounded text-sm h-8 ${shouldShowError('email') && errors.email ? 'border-red-500' : 'border-gray-300'}`}
            placeholder=""
          />
          {shouldShowError('email') && errors.email && (
            <p className="text-red-600 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
            onBlur={() => handleFieldBlur('phone')}
            className={`w-full px-2 py-1 border rounded text-sm h-8 ${shouldShowError('phone') && errors.phone ? 'border-red-500' : 'border-gray-300'}`}
            placeholder=""
            maxLength={14}
          />
          {shouldShowError('phone') && errors.phone && (
            <p className="text-red-600 text-xs mt-1">{errors.phone}</p>
          )}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 flex items-center space-x-1">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Information is securely encrypted</span>
      </div>
    </div>
  );

  const renderCitizenshipStatus = () => (
    <div className="space-y-6">
      {/* FEDERAL PENALTIES NOTICE - PROMINENT DISPLAY */}
      <div className="bg-red-600 text-white p-4 rounded-lg border-2 border-red-700 shadow-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-red-200 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-lg mb-2">⚠️ FEDERAL PENALTIES NOTICE</h3>
            <div className="text-red-100 text-sm leading-relaxed space-y-2">
              <p className="font-semibold">
                Federal law provides for imprisonment and/or fines for false statements or use of false documents in connection with the completion of this form.
              </p>
              <p>
                <strong>Criminal Penalties:</strong> Under 18 U.S.C. § 1546, knowingly and willfully providing false information may result in:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Up to 10 years imprisonment</li>
                <li>Substantial monetary fines</li>
                <li>Permanent criminal record</li>
                <li>Immigration consequences</li>
              </ul>
              <p className="font-semibold mt-3">
                By completing this form, you certify under penalty of perjury that all information is true and correct.
              </p>
            </div>
          </div>
        </div>
      </div>

      <details className="group">
        <summary className="cursor-pointer bg-yellow-50 border border-yellow-200 rounded-lg p-3 hover:bg-yellow-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold text-yellow-800 text-sm">Important: Work Authorization Requirements</span>
            </div>
            <svg className="h-4 w-4 text-yellow-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div className="mt-2 text-yellow-700 text-xs px-3 pb-2">
          <p className="font-semibold mb-1">FEDERAL REQUIREMENT:</p>
          <p>You must select the citizenship status that applies to you. Providing false information is a federal crime punishable by imprisonment and fines under 18 U.S.C. § 1546.</p>
        </div>
      </details>

      {/* FEDERAL COMPLIANCE: Employee Attestation Statement */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-blue-900 text-sm mb-2">🏛️ FEDERAL ATTESTATION REQUIRED</h4>
            <p className="text-blue-800 text-xs leading-relaxed mb-2">
              I attest, under penalty of perjury, that I am (check one of the following boxes):
            </p>
            <p className="text-blue-700 text-xs font-medium">
              This attestation is required under the Immigration and Nationality Act (INA) Section 274A.
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="space-y-3">
          {currentContent.citizenshipOptions.map((option) => (
            <div key={option.value} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  id={option.value}
                  name="citizenship_status"
                  value={option.value}
                  checked={formData.citizenship_status === option.value}
                  onChange={(e) => handleInputChange('citizenship_status', e.target.value)}
                  className="mt-1 w-5 h-5 text-blue-600"
                  required
                />
                <div className="flex-1">
                  <label htmlFor={option.value} className="font-semibold text-gray-900 cursor-pointer text-sm block">
                    {option.label}
                  </label>
                  <p className="text-gray-600 text-xs mt-1 leading-relaxed">{option.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {shouldShowError('citizenship_status') && errors.citizenship_status && (
          <p className="text-red-600 text-sm mt-2 font-medium">{errors.citizenship_status}</p>
        )}
      </div>

      {/* Additional fields for non-citizens */}
      {(formData.citizenship_status === 'permanent_resident' || formData.citizenship_status === 'authorized_alien') && (
        <div className="border-t pt-6 space-y-6">
          <h4 className="font-semibold text-gray-800">Additional Information Required</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                USCIS Number
              </label>
              <input
                type="text"
                value={formData.uscis_number}
                onChange={(e) => handleInputChange('uscis_number', e.target.value)}
                className={`w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm ${
                  shouldShowError('uscis_number') && errors.uscis_number ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder=""
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                I-94 Admission Number
              </label>
              <input
                type="text"
                value={formData.i94_admission_number}
                onChange={(e) => handleInputChange('i94_admission_number', e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                placeholder=""
              />
            </div>

            {formData.citizenship_status === 'authorized_alien' && (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                    Foreign Passport Number
                  </label>
                  <input
                    type="text"
                    value={formData.passport_number}
                    onChange={(e) => handleInputChange('passport_number', e.target.value)}
                    className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    placeholder=""
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                    Country of Issuance
                  </label>
                  <input
                    type="text"
                    value={formData.passport_country}
                    onChange={(e) => handleInputChange('passport_country', e.target.value)}
                    className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    placeholder=""
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                    Work Authorization Expiration Date *
                  </label>
                  <input
                    type="date"
                    value={formData.work_authorization_expiration}
                    onChange={(e) => handleInputChange('work_authorization_expiration', e.target.value)}
                    className={`w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm ${
                      shouldShowError('work_authorization_expiration') && errors.work_authorization_expiration ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {shouldShowError('work_authorization_expiration') && errors.work_authorization_expiration && (
                    <p className="text-red-600 text-sm mt-1">{errors.work_authorization_expiration}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {shouldShowError('uscis_number') && errors.uscis_number && (
            <p className="text-red-600 text-sm">{errors.uscis_number}</p>
          )}
        </div>
      )}

      {/* FEDERAL COMPLIANCE: Enhanced Employee Signature Section */}
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
        <div className="flex items-start space-x-3 mb-4">
          <FileText className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-green-900 text-lg mb-2">📝 Employee Signature & Attestation</h4>
            <div className="text-green-800 text-sm leading-relaxed space-y-2">
              <p className="font-semibold">
                Federal law requires your signature to complete Section 1 of Form I-9 (8 U.S.C. § 1324a).
              </p>
              <p>
                By signing, you attest under penalty of perjury that all information provided is complete, true, and correct.
              </p>
              <p className="text-green-700 font-medium">
                False statements may result in criminal prosecution under 18 U.S.C. § 1546.
              </p>
            </div>
          </div>
        </div>
        
        {/* Attestation Checkbox - Required First */}
        <div className="bg-white border-2 border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="employee_attestation"
              checked={formData.employee_attestation || false}
              onChange={(e) => handleInputChange('employee_attestation', e.target.checked)}
              className="w-6 h-6 text-green-600 rounded mt-1 flex-shrink-0"
              required
            />
            <div className="flex-1">
              <label htmlFor="employee_attestation" className="text-sm text-gray-800 leading-relaxed cursor-pointer block">
                <span className="font-bold text-green-900">REQUIRED FEDERAL ATTESTATION:</span>
                <br/><br/>
                <span className="font-semibold">I certify under penalty of perjury</span> that:
                <br/><br/>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>I have read and understand all instructions for completing Form I-9</li>
                  <li>All information I have provided is complete, true, and correct</li>
                  <li>I understand that providing false information may result in criminal prosecution under federal law (18 U.S.C. § 1546)</li>
                  <li>I am legally authorized to work in the United States as indicated by my citizenship status selection</li>
                </ul>
                <br/>
                <span className="font-semibold text-red-700">
                  Warning: Federal penalties for false statements include up to 10 years imprisonment and substantial fines.
                </span>
              </label>
            </div>
          </div>
          {shouldShowError('employee_attestation') && errors.employee_attestation && (
            <p className="text-red-600 text-sm mt-2 font-medium bg-red-50 p-2 rounded border border-red-200">
              ⚠️ {errors.employee_attestation}
            </p>
          )}
        </div>

        {/* Signature Date Section */}
        <div className="bg-white border border-green-200 rounded-lg p-4">
          <h5 className="font-bold text-green-900 text-base mb-3">Employee Signature Date</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Date of Signature (mm/dd/yyyy) *
              </label>
              <input
                type="date"
                value={formData.employee_signature_date?.split('T')[0] || new Date().toISOString().split('T')[0]}
                onChange={(e) => handleInputChange('employee_signature_date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                min={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  shouldShowError('employee_signature_date') && errors.employee_signature_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                required
              />
              <div className="text-xs text-gray-600 mt-1">
                Must be within 7 days of today
              </div>
              {shouldShowError('employee_signature_date') && errors.employee_signature_date && (
                <p className="text-red-600 text-xs mt-1 font-medium">{errors.employee_signature_date}</p>
              )}
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Today's Date (Reference)
              </label>
              <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700 font-medium">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Current date for reference
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">Federal Requirement (8 CFR § 274a.2):</p>
                <p>The employee must sign and date Section 1 no later than the first day of employment. The date cannot be in the future and must be within 7 days of the actual signature date.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0: return renderPersonalInfo();
      case 1: return renderAddressInfo();
      case 2: return renderContactInfo();
      case 3: return renderCitizenshipStatus();
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-hotel-neutral-50 via-white to-blue-50">
      {/* Federal Compliance Status Bar - Compact */}
      {currentSection === 3 && federalValidationResult && (
        <div className={`flex-shrink-0 ${complianceBlocked ? 'bg-red-600' : federalValidationResult.isValid ? 'bg-green-600' : 'bg-yellow-600'} text-white px-4 py-1`}>
          <div className="max-w-5xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Shield className="h-3 w-3" />
              <span className="font-medium">
                {complianceBlocked 
                  ? 'FEDERAL COMPLIANCE BLOCKED' 
                  : federalValidationResult.isValid 
                    ? 'FEDERAL COMPLIANCE VERIFIED' 
                    : 'FEDERAL COMPLIANCE WARNINGS'
                }
              </span>
            </div>
            <div className="text-xs">
              {federalValidationResult.errors.length} Errors | {federalValidationResult.warnings.length} Warnings
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced Header - Compact */}
      <div className="flex-shrink-0 bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-hotel-primary to-hotel-primary-dark rounded-lg flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">{currentContent.title}</h1>
              <p className="text-xs sm:text-sm text-gray-600">{currentContent.subtitle}</p>
            </div>
          </div>

          {/* Enhanced Progress - Compact */}
          <div className="mt-2 sm:mt-3">
            <div className="flex justify-between items-center mb-1 sm:mb-2">
              <div className="flex-1 min-w-0 mr-2">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{currentContent.sections[currentSection].title}</h3>
                <p className="text-xs text-gray-600 hidden sm:block">{currentContent.sections[currentSection].description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-medium text-gray-500 hidden sm:block">Step {currentSection + 1} of {currentContent.sections.length}</div>
                <div className="text-sm sm:text-lg font-bold text-hotel-primary">
                  {Math.round(((currentSection + 1) / currentContent.sections.length) * 100)}%
                </div>
              </div>
            </div>
            <div className="relative w-full bg-gray-200 rounded-full h-1.5 sm:h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-hotel-primary to-hotel-primary-light h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentSection + 1) / currentContent.sections.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="flex-1 max-w-5xl mx-auto p-4 overflow-auto">
        <div className="h-full flex flex-col card-elevated animate-fade-in">
          <div className="flex-1 p-6 overflow-auto">
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                <div className="h-6 w-6 sm:h-8 sm:w-8 bg-hotel-primary text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">
                  {currentSection + 1}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">
                    {currentContent.sections[currentSection].title}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                    {currentContent.sections[currentSection].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Federal Compliance Errors Display - Only show on final section */}
            {currentSection === 3 && federalValidationResult && (federalValidationResult.errors.length > 0 || federalValidationResult.warnings.length > 0) && (
              <div className="mb-4">
                {federalValidationResult.errors.length > 0 && (
                  <details className="group mb-2">
                    <summary className="cursor-pointer bg-red-50 border border-red-200 rounded-lg p-3 hover:bg-red-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="font-semibold text-red-800 text-sm">🚨 FEDERAL COMPLIANCE VIOLATIONS ({federalValidationResult.errors.length})</span>
                        </div>
                        <svg className="h-4 w-4 text-red-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <div className="mt-2 space-y-2">
                      {federalValidationResult.errors.map((error: FederalValidationError, index: number) => (
                        <div key={index} className="bg-white border-l-4 border-red-500 p-2 rounded text-xs">
                          <div className="font-semibold text-red-800">{error.legalCode}: {error.message}</div>
                          {error.complianceNote && (
                            <div className="text-red-700 mt-1">⚖️ {error.complianceNote}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                
                {federalValidationResult.warnings.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer bg-yellow-50 border border-yellow-200 rounded-lg p-3 hover:bg-yellow-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Info className="h-4 w-4 text-yellow-600" />
                          <span className="font-semibold text-yellow-800 text-sm">⚠️ FEDERAL COMPLIANCE WARNINGS ({federalValidationResult.warnings.length})</span>
                        </div>
                        <svg className="h-4 w-4 text-yellow-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <div className="mt-2 space-y-2">
                      {federalValidationResult.warnings.map((warning: FederalValidationError, index: number) => (
                        <div key={index} className="bg-white border-l-4 border-yellow-500 p-2 rounded text-xs">
                          <div className="font-semibold text-yellow-800">{warning.legalCode}: {warning.message}</div>
                          {warning.complianceNote && (
                            <div className="text-yellow-700 mt-1">📋 {warning.complianceNote}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            <div className="animate-slide-in-right">
              {renderCurrentSection()}
            </div>

            {/* Enhanced Navigation - Prominent buttons */}
            <div className="flex-shrink-0 flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handlePrevious}
                disabled={currentSection === 0}
                variant="secondary" className="disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 h-12 px-6"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>

              <div className="text-center">
                <div className="text-lg font-bold text-hotel-primary">
                  {Math.round(((currentSection + 1) / currentContent.sections.length) * 100)}%
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  Complete
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={complianceBlocked}
                className={`flex items-center space-x-2 h-12 px-8 rounded-lg font-semibold text-base transition-all ${
                  complianceBlocked 
                    ? 'bg-red-100 text-red-400 cursor-not-allowed border-2 border-red-200' 
                    : ''
                }`}
              >
                {complianceBlocked && <AlertTriangle className="h-4 w-4" />}
                <span>
                  {complianceBlocked 
                    ? 'BLOCKED - Compliance Violations' 
                    : currentSection === currentContent.sections.length - 1 
                      ? 'Complete Section 1' 
                      : 'Next'
                  }
                </span>
                {!complianceBlocked && (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default I9Section1Form;