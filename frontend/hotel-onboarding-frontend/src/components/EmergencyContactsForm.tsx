import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Phone, Plus, Trash2, Info } from 'lucide-react';

interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  alternatePhone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface EmergencyContactsData {
  primaryContact: EmergencyContact;
  secondaryContact: EmergencyContact;
  medicalInfo: string;
  allergies: string;
  medications: string;
  medicalConditions: string;
}

interface EmergencyContactsFormProps {
  initialData?: Partial<EmergencyContactsData>;
  language: 'en' | 'es';
  onSave: (data: EmergencyContactsData) => void;
  onNext?: () => void;
  onBack?: () => void;
  onValidationChange?: (isValid: boolean, errors?: Record<string, string>) => void;
  useMainNavigation?: boolean;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function EmergencyContactsForm({
  initialData = {},
  language,
  onSave,
  onNext,
  onBack,
  onValidationChange,
  useMainNavigation = false
}: EmergencyContactsFormProps) {
  const [formData, setFormData] = useState<EmergencyContactsData>({
    primaryContact: {
      name: '',
      relationship: '',
      phoneNumber: '',
      alternatePhone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      ...(initialData?.primaryContact || {})
    },
    secondaryContact: {
      name: '',
      relationship: '',
      phoneNumber: '',
      alternatePhone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      ...(initialData?.secondaryContact || {})
    },
    medicalInfo: initialData?.medicalInfo || '',
    allergies: initialData?.allergies || '',
    medications: initialData?.medications || '',
    medicalConditions: initialData?.medicalConditions || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'emergency_contacts': 'Emergency Contacts',
        'emergency_contacts_desc': 'Provide contact information for people we should reach in case of emergency.',
        'primary_contact': 'Primary Emergency Contact',
        'secondary_contact': 'Secondary Emergency Contact',
        'contact_name': 'Full Name',
        'relationship': 'Relationship',
        'phone_number': 'Phone Number',
        'alternate_phone': 'Alternate Phone',
        'address': 'Address',
        'city': 'City',
        'state': 'State',
        'zip_code': 'ZIP Code',
        'medical_information': 'Medical Information (Optional)',
        'allergies': 'Allergies',
        'medications': 'Current Medications',
        'medical_conditions': 'Medical Conditions',
        'required_field': 'This field is required',
        'invalid_phone': 'Please enter a valid phone number',
        'next': 'Next',
        'back': 'Back',
        'save_continue': 'Save & Continue',
        'relationships.spouse': 'Spouse',
        'relationships.parent': 'Parent',
        'relationships.child': 'Child',
        'relationships.sibling': 'Sibling',
        'relationships.friend': 'Friend',
        'relationships.other': 'Other'
      },
      es: {
        'emergency_contacts': 'Contactos de Emergencia',
        'emergency_contacts_desc': 'Proporcione información de contacto de personas a las que deberíamos comunicarnos en caso de emergencia.',
        'primary_contact': 'Contacto de Emergencia Principal',
        'secondary_contact': 'Contacto de Emergencia Secundario',
        'contact_name': 'Nombre Completo',
        'relationship': 'Relación',
        'phone_number': 'Número de Teléfono',
        'next': 'Siguiente',
        'back': 'Atrás',
        'save_continue': 'Guardar y Continuar'
      }
    };
    return translations[language]?.[key] || key;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate primary contact
    if (!formData.primaryContact.name.trim()) {
      newErrors['primaryContact.name'] = t('required_field');
    }
    if (!formData.primaryContact.relationship.trim()) {
      newErrors['primaryContact.relationship'] = t('required_field');
    }
    if (!formData.primaryContact.phoneNumber.trim()) {
      newErrors['primaryContact.phoneNumber'] = t('required_field');
    }

    setErrors(newErrors);
    const formIsValid = Object.keys(newErrors).length === 0;
    setIsValid(formIsValid);
    
    // Notify parent component of validation status
    if (onValidationChange) {
      onValidationChange(formIsValid, newErrors);
    }
    
    return formIsValid;
  };

  // Auto-validate when form data changes
  useEffect(() => {
    validateForm();
  }, [formData.primaryContact.name, formData.primaryContact.relationship, formData.primaryContact.phoneNumber]);

  // Auto-save form data whenever it changes
  useEffect(() => {
    // Only save if user has interacted with the form
    if (Object.keys(touchedFields).length > 0) {
      onSave(formData);
    }
  }, [formData, touchedFields, onSave]);

  const handleInputChange = (contactType: 'primaryContact' | 'secondaryContact', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [contactType]: {
        ...prev[contactType],
        [field]: value
      }
    }));

    // Mark field as touched
    const errorKey = `${contactType}.${field}`;
    setTouchedFields(prev => ({ ...prev, [errorKey]: true }));

    // Clear error when user starts typing
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  // Handle field blur to show validation errors
  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  // Function to determine if error should be shown
  const shouldShowError = (field: string) => {
    return showErrors || touchedFields[field];
  };

  const handleSubmit = () => {
    setShowErrors(true); // Show all errors when user tries to submit
    if (validateForm()) {
      onSave(formData);
      if (!useMainNavigation && onNext) onNext();
    }
  };

  const formatPhoneNumber = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 10);
  };

  // Removed renderContactForm - now inlined for better space optimization

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="sr-only text-xl font-bold text-gray-900">{t('emergency_contacts')}</h2>
        <p className="sr-only text-gray-600 text-sm mt-1">{t('emergency_contacts_desc')}</p>
      </div>

      {/* Emergency Contacts - Side by Side */}
      <Card>
        <CardHeader className="pb-3 p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <Phone className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span>Emergency Contacts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:divide-x lg:divide-gray-200">
            {/* Primary Contact */}
            <div className="space-y-3 sm:space-y-4 lg:pr-6">
              <h4 className="font-medium text-sm sm:text-base text-gray-700 border-b pb-1.5">{t('primary_contact')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="primary_name" className="text-sm">{t('contact_name')} *</Label>
                  <Input
                    id="primary_name"
                    value={formData.primaryContact.name}
                    onChange={(e) => handleInputChange('primaryContact', 'name', e.target.value)}
                    onBlur={() => handleFieldBlur('primaryContact.name')}
                    className={shouldShowError('primaryContact.name') && errors['primaryContact.name'] ? 'border-red-500' : ''}
                    placeholder=""
                    size="sm"
                  />
                  {shouldShowError('primaryContact.name') && errors['primaryContact.name'] && (
                    <p className="text-red-600 text-xs mt-1">{errors['primaryContact.name']}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="primary_relationship" className="text-sm">{t('relationship')} *</Label>
                  <Select
                    value={formData.primaryContact.relationship}
                    onValueChange={(value) => handleInputChange('primaryContact', 'relationship', value)}
                  >
                    <SelectTrigger className={shouldShowError('primaryContact.relationship') && errors['primaryContact.relationship'] ? 'border-red-500 h-8' : 'h-8'}>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">{t('relationships.spouse')}</SelectItem>
                      <SelectItem value="parent">{t('relationships.parent')}</SelectItem>
                      <SelectItem value="child">{t('relationships.child')}</SelectItem>
                      <SelectItem value="sibling">{t('relationships.sibling')}</SelectItem>
                      <SelectItem value="friend">{t('relationships.friend')}</SelectItem>
                      <SelectItem value="other">{t('relationships.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {shouldShowError('primaryContact.relationship') && errors['primaryContact.relationship'] && (
                    <p className="text-red-600 text-xs mt-1">{errors['primaryContact.relationship']}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="primary_phone" className="text-sm">{t('phone_number')} *</Label>
                  <Input
                    id="primary_phone"
                    value={formData.primaryContact.phoneNumber}
                    onChange={(e) => handleInputChange('primaryContact', 'phoneNumber', formatPhoneNumber(e.target.value))}
                    onBlur={() => handleFieldBlur('primaryContact.phoneNumber')}
                    className={shouldShowError('primaryContact.phoneNumber') && errors['primaryContact.phoneNumber'] ? 'border-red-500' : ''}
                    placeholder=""
                    maxLength={10}
                    size="sm"
                  />
                  {shouldShowError('primaryContact.phoneNumber') && errors['primaryContact.phoneNumber'] && (
                    <p className="text-red-600 text-xs mt-1">{errors['primaryContact.phoneNumber']}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="primary_alternate" className="text-sm">{t('alternate_phone')}</Label>
                  <Input
                    id="primary_alternate"
                    value={formData.primaryContact.alternatePhone}
                    onChange={(e) => handleInputChange('primaryContact', 'alternatePhone', formatPhoneNumber(e.target.value))}
                    onBlur={() => handleFieldBlur('primaryContact.alternatePhone')}
                    placeholder=""
                    maxLength={10}
                    size="sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="primary_address" className="text-sm">{t('address')}</Label>
                <Input
                  id="primary_address"
                  value={formData.primaryContact.address}
                  onChange={(e) => handleInputChange('primaryContact', 'address', e.target.value)}
                  onBlur={() => handleFieldBlur('primaryContact.address')}
                  placeholder=""
                  size="sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="primary_city" className="text-sm">{t('city')}</Label>
                  <Input
                    id="primary_city"
                    value={formData.primaryContact.city}
                    onChange={(e) => handleInputChange('primaryContact', 'city', e.target.value)}
                    onBlur={() => handleFieldBlur('primaryContact.city')}
                    placeholder=""
                    size="sm"
                  />
                </div>
                <div>
                  <Label htmlFor="primary_state" className="text-sm">{t('state')}</Label>
                  <Select
                    value={formData.primaryContact.state}
                    onValueChange={(value) => handleInputChange('primaryContact', 'state', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="primary_zip" className="text-sm">{t('zip_code')}</Label>
                  <Input
                    id="primary_zip"
                    value={formData.primaryContact.zipCode}
                    onChange={(e) => handleInputChange('primaryContact', 'zipCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                    onBlur={() => handleFieldBlur('primaryContact.zipCode')}
                    placeholder=""
                    maxLength={5}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Secondary Contact */}
            <div className="space-y-3 sm:space-y-4 lg:pl-6">
              <h4 className="font-medium text-sm sm:text-base text-gray-700 border-b pb-1.5">{t('secondary_contact')} <span className="text-xs text-gray-500">(Optional)</span></h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="secondary_name" className="text-sm">{t('contact_name')}</Label>
                  <Input
                    id="secondary_name"
                    value={formData.secondaryContact.name}
                    onChange={(e) => handleInputChange('secondaryContact', 'name', e.target.value)}
                    onBlur={() => handleFieldBlur('secondaryContact.name')}
                    placeholder=""
                    size="sm"
                  />
                </div>
                <div>
                  <Label htmlFor="secondary_relationship" className="text-sm">{t('relationship')}</Label>
                  <Select
                    value={formData.secondaryContact.relationship}
                    onValueChange={(value) => handleInputChange('secondaryContact', 'relationship', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">{t('relationships.spouse')}</SelectItem>
                      <SelectItem value="parent">{t('relationships.parent')}</SelectItem>
                      <SelectItem value="child">{t('relationships.child')}</SelectItem>
                      <SelectItem value="sibling">{t('relationships.sibling')}</SelectItem>
                      <SelectItem value="friend">{t('relationships.friend')}</SelectItem>
                      <SelectItem value="other">{t('relationships.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="secondary_phone" className="text-sm">{t('phone_number')}</Label>
                  <Input
                    id="secondary_phone"
                    value={formData.secondaryContact.phoneNumber}
                    onChange={(e) => handleInputChange('secondaryContact', 'phoneNumber', formatPhoneNumber(e.target.value))}
                    onBlur={() => handleFieldBlur('secondaryContact.phoneNumber')}
                    placeholder=""
                    maxLength={10}
                    size="sm"
                  />
                </div>
                <div>
                  <Label htmlFor="secondary_alternate" className="text-sm">{t('alternate_phone')}</Label>
                  <Input
                    id="secondary_alternate"
                    value={formData.secondaryContact.alternatePhone}
                    onChange={(e) => handleInputChange('secondaryContact', 'alternatePhone', formatPhoneNumber(e.target.value))}
                    onBlur={() => handleFieldBlur('secondaryContact.alternatePhone')}
                    placeholder=""
                    maxLength={10}
                    size="sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="secondary_address" className="text-sm">{t('address')}</Label>
                <Input
                  id="secondary_address"
                  value={formData.secondaryContact.address}
                  onChange={(e) => handleInputChange('secondaryContact', 'address', e.target.value)}
                  onBlur={() => handleFieldBlur('secondaryContact.address')}
                  placeholder=""
                  size="sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="secondary_city" className="text-sm">{t('city')}</Label>
                  <Input
                    id="secondary_city"
                    value={formData.secondaryContact.city}
                    onChange={(e) => handleInputChange('secondaryContact', 'city', e.target.value)}
                    onBlur={() => handleFieldBlur('secondaryContact.city')}
                    placeholder=""
                    size="sm"
                  />
                </div>
                <div>
                  <Label htmlFor="secondary_state" className="text-sm">{t('state')}</Label>
                  <Select
                    value={formData.secondaryContact.state}
                    onValueChange={(value) => handleInputChange('secondaryContact', 'state', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="secondary_zip" className="text-sm">{t('zip_code')}</Label>
                  <Input
                    id="secondary_zip"
                    value={formData.secondaryContact.zipCode}
                    onChange={(e) => handleInputChange('secondaryContact', 'zipCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                    onBlur={() => handleFieldBlur('secondaryContact.zipCode')}
                    placeholder=""
                    maxLength={5}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical Information - Compact */}
      <Card>
        <CardHeader className="pb-3 p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">{t('medical_information')}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="allergies" className="text-sm font-medium block mb-1.5">{t('allergies')}</Label>
              <textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
                onBlur={() => handleFieldBlur('allergies')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base min-h-[48px]"
                rows={3}
                placeholder=""
              />
            </div>
            <div>
              <Label htmlFor="medications" className="text-sm font-medium block mb-1.5">{t('medications')}</Label>
              <textarea
                id="medications"
                value={formData.medications}
                onChange={(e) => setFormData(prev => ({ ...prev, medications: e.target.value }))}
                onBlur={() => handleFieldBlur('medications')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base min-h-[48px]"
                rows={3}
                placeholder=""
              />
            </div>
            <div>
              <Label htmlFor="medicalConditions" className="text-sm font-medium block mb-1.5">{t('medical_conditions')}</Label>
              <textarea
                id="medicalConditions"
                value={formData.medicalConditions}
                onChange={(e) => setFormData(prev => ({ ...prev, medicalConditions: e.target.value }))}
                onBlur={() => handleFieldBlur('medicalConditions')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base min-h-[48px]"
                rows={3}
                placeholder=""
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert className="p-3 sm:p-4">
        <Info className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
        <AlertDescription className="text-xs sm:text-sm leading-snug">
          Emergency contact information is confidential and used only in emergencies. Provide contacts readily available and authorized to make decisions.
        </AlertDescription>
      </Alert>

      {/* Hidden submit allows parent navigation to trigger validation */}
      <Button onClick={handleSubmit} className="hidden" disabled={!isValid}>
        Save Emergency Contacts
      </Button>
    </div>
  );
}