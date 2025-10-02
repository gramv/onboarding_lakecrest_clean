// Enhanced Auto-fill utility for comprehensive onboarding forms
// This helps maintain consistency and improves UX by pre-filling repeated information across all 18 steps

export interface AutoFillData {
  // Personal Information
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
  preferredName?: string;
  fullName?: string;
  dateOfBirth?: string;
  ssn?: string;
  email?: string;
  phoneNumber?: string;
  gender?: string;
  maritalStatus?: string;
  
  // Address Information
  streetAddress?: string;
  aptNumber?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  
  // Employment Information
  position?: string;
  department?: string;
  hireDate?: string;
  startDate?: string;
  employeeNumber?: string;
  
  // Emergency Contact Information
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  emergencyContactAddress?: string;
  emergencyContactCity?: string;
  emergencyContactState?: string;
  emergencyContactZip?: string;
  
  // Secondary Emergency Contact
  emergencyContact2Name?: string;
  emergencyContact2Phone?: string;
  emergencyContact2Relationship?: string;
  
  // Banking Information (for consistency)
  bankName?: string;
  accountType?: string;
  
  // Health Insurance Information
  dependentCount?: number;
  spouseName?: string;
  spouseDateOfBirth?: string;
  
  // Citizenship Information
  citizenshipStatus?: string;
  workAuthorizationExpiration?: string;
  
  // Medical Information
  allergies?: string;
  medications?: string;
  medicalConditions?: string;
}

export class AutoFillManager {
  private static instance: AutoFillManager;
  private data: AutoFillData = {};
  private readonly STORAGE_KEY = 'onboarding_autofill_v2';
  private readonly BACKUP_KEY = 'onboarding_autofill_backup';

  static getInstance(): AutoFillManager {
    if (!AutoFillManager.instance) {
      AutoFillManager.instance = new AutoFillManager();
    }
    return AutoFillManager.instance;
  }

  // Enhanced update with validation and backup
  updateData(newData: Partial<AutoFillData>) {
    // Create backup before updating
    this.createBackup();
    
    // Merge with existing data
    this.data = { ...this.data, ...newData };
    
    // Add metadata
    const dataWithMeta = {
      ...this.data,
      _lastUpdated: new Date().toISOString(),
      _version: '2.0'
    };
    
    // Persist to localStorage with error handling
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataWithMeta));
    } catch (error) {
      console.error('Failed to save auto-fill data:', error);
      // Try to recover space by clearing old data
      this.cleanup();
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataWithMeta));
      } catch (retryError) {
        console.error('Failed to save auto-fill data after cleanup:', retryError);
      }
    }
  }

  // Enhanced get with recovery mechanisms
  getData(): AutoFillData {
    // Return cached data if available
    if (Object.keys(this.data).length > 0) {
      return this.data;
    }

    // Try to load from primary storage
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Remove metadata fields
        const { _lastUpdated, _version, ...cleanData } = parsed;
        this.data = cleanData;
        return this.data;
      }
    } catch (error) {
      console.warn('Failed to load auto-fill data, trying backup:', error);
      return this.loadFromBackup();
    }

    // Try legacy storage key
    try {
      const legacy = localStorage.getItem('onboarding_autofill');
      if (legacy) {
        this.data = JSON.parse(legacy);
        // Migrate to new format
        this.updateData({});
        return this.data;
      }
    } catch (error) {
      console.warn('Failed to load legacy auto-fill data:', error);
    }

    return {};
  }

  // Get specific field value with fallback
  getValue<K extends keyof AutoFillData>(field: K): AutoFillData[K] | undefined {
    return this.getData()[field];
  }

  // Create backup
  private createBackup() {
    try {
      const current = localStorage.getItem(this.STORAGE_KEY);
      if (current) {
        localStorage.setItem(this.BACKUP_KEY, current);
      }
    } catch (error) {
      console.warn('Failed to create backup:', error);
    }
  }

  // Load from backup
  private loadFromBackup(): AutoFillData {
    try {
      const backup = localStorage.getItem(this.BACKUP_KEY);
      if (backup) {
        const parsed = JSON.parse(backup);
        const { _lastUpdated, _version, ...cleanData } = parsed;
        this.data = cleanData;
        return this.data;
      }
    } catch (error) {
      console.warn('Failed to load from backup:', error);
    }
    return {};
  }

  // Cleanup old data
  private cleanup() {
    try {
      localStorage.removeItem('onboarding_autofill'); // Legacy key
      localStorage.removeItem(this.BACKUP_KEY);
    } catch (error) {
      console.warn('Failed to cleanup old data:', error);
    }
  }

  // Enhanced auto-fill form data with comprehensive patterns for all 18 steps
  autoFillForm(formData: any, formType: string): any {
    const autoFill = this.getData();
    const filled = { ...formData };

    switch (formType) {
      case 'personal_info':
        // Don't auto-fill on first entry - user must enter manually for accuracy
        break;

      case 'job_details':
        // Auto-fill from employment info if available
        if (autoFill.position && !filled.jobTitle) {
          filled.jobTitle = autoFill.position;
        }
        if (autoFill.department && !filled.department) {
          filled.department = autoFill.department;
        }
        if (autoFill.hireDate && !filled.startDate) {
          filled.startDate = autoFill.hireDate;
        }
        break;

      case 'i9_section1':
        // Auto-fill from personal info
        if (autoFill.firstName && !filled.employee_first_name) {
          filled.employee_first_name = autoFill.firstName;
        }
        if (autoFill.lastName && !filled.employee_last_name) {
          filled.employee_last_name = autoFill.lastName;
        }
        if (autoFill.middleInitial && !filled.employee_middle_initial) {
          filled.employee_middle_initial = autoFill.middleInitial;
        }
        if (autoFill.dateOfBirth && !filled.date_of_birth) {
          filled.date_of_birth = autoFill.dateOfBirth;
        }
        if (autoFill.ssn && !filled.ssn) {
          filled.ssn = autoFill.ssn;
        }
        if (autoFill.email && !filled.email) {
          filled.email = autoFill.email;
        }
        if (autoFill.phoneNumber && !filled.phone) {
          filled.phone = autoFill.phoneNumber;
        }
        if (autoFill.streetAddress && !filled.address_street) {
          filled.address_street = autoFill.streetAddress;
          filled.address_apt = autoFill.aptNumber || '';
          filled.address_city = autoFill.city;
          filled.address_state = autoFill.state;
          filled.address_zip = autoFill.zipCode;
        }
        break;

      case 'i9_supplement_a':
        // CRITICAL: Supplement A should NEVER auto-fill ANY employee data
        // This form is ONLY for preparer/translator information - NOT employee data
        // Employee information should never appear on this form
        // Leave completely blank - user must enter preparer/translator details manually
        break;

      case 'i9_supplement_b':
        // CRITICAL: Supplement B should NOT auto-fill employee identification fields
        // Employee data should be pulled from the original I-9 Section 1 only
        // This form is for reverification with NEW documents, not personal data entry
        // Do NOT auto-fill any employee information - it should come from Section 1 data
        // Auto-fill is disabled to prevent inappropriate data contamination
        break;

      case 'w4_form':
        // Auto-fill from personal info
        if (autoFill.firstName && !filled.first_name) {
          filled.first_name = autoFill.firstName;
        }
        if (autoFill.lastName && !filled.last_name) {
          filled.last_name = autoFill.lastName;
        }
        if (autoFill.middleInitial && !filled.middle_initial) {
          filled.middle_initial = autoFill.middleInitial;
        }
        if (autoFill.streetAddress && !filled.address) {
          filled.address = autoFill.streetAddress;
          filled.city = autoFill.city;
          filled.state = autoFill.state;
          filled.zip_code = autoFill.zipCode;
        }
        if (autoFill.ssn && !filled.ssn) {
          filled.ssn = autoFill.ssn;
        }
        // Auto-fill filing status based on marital status
        if (autoFill.maritalStatus && !filled.filing_status) {
          if (autoFill.maritalStatus === 'married') {
            filled.filing_status = 'Married filing jointly';
          } else if (autoFill.maritalStatus === 'single') {
            filled.filing_status = 'Single';
          }
        }
        break;

      case 'direct_deposit':
        // Auto-fill from personal info
        if (autoFill.fullName && !filled.primaryAccount?.accountHolderName) {
          filled.primaryAccount = {
            ...filled.primaryAccount,
            accountHolderName: autoFill.fullName
          };
        }
        break;

      case 'emergency_contacts':
        // Don't auto-fill contact names, but can pre-fill address if same as employee
        if (autoFill.streetAddress && !filled.primaryContact?.address) {
          filled.primaryContact = {
            ...filled.primaryContact,
            address: autoFill.streetAddress,
            city: autoFill.city,
            state: autoFill.state,
            zipCode: autoFill.zipCode
          };
        }
        break;

      case 'health_insurance':
        // Auto-fill employee information
        if (autoFill.firstName && !filled.employeeFirstName) {
          filled.employeeFirstName = autoFill.firstName;
        }
        if (autoFill.lastName && !filled.employeeLastName) {
          filled.employeeLastName = autoFill.lastName;
        }
        if (autoFill.dateOfBirth && !filled.employeeDateOfBirth) {
          filled.employeeDateOfBirth = autoFill.dateOfBirth;
        }
        if (autoFill.ssn && !filled.employeeSSN) {
          filled.employeeSSN = autoFill.ssn;
        }
        if (autoFill.gender && !filled.employeeGender) {
          filled.employeeGender = autoFill.gender;
        }
        // Auto-fill spouse info if married
        if (autoFill.maritalStatus === 'married' && autoFill.spouseName && !filled.spouseName) {
          filled.spouseName = autoFill.spouseName;
          filled.spouseDateOfBirth = autoFill.spouseDateOfBirth;
        }
        break;

      case 'company_policies':
        // Auto-fill signature info
        if (autoFill.fullName && !filled.employeeName) {
          filled.employeeName = autoFill.fullName;
        }
        break;

      case 'trafficking_awareness':
        // Auto-fill name for certification
        if (autoFill.fullName && !filled.participantName) {
          filled.participantName = autoFill.fullName;
        }
        break;

      case 'background_check':
        // Auto-fill personal info for background check
        if (autoFill.firstName && !filled.firstName) {
          filled.firstName = autoFill.firstName;
          filled.lastName = autoFill.lastName;
          filled.middleInitial = autoFill.middleInitial;
          filled.dateOfBirth = autoFill.dateOfBirth;
          filled.ssn = autoFill.ssn;
          filled.address = autoFill.streetAddress;
          filled.city = autoFill.city;
          filled.state = autoFill.state;
          filled.zipCode = autoFill.zipCode;
        }
        break;

      case 'photo_capture':
        // Auto-fill name for photo identification
        if (autoFill.fullName && !filled.employeeName) {
          filled.employeeName = autoFill.fullName;
        }
        if (autoFill.employeeNumber && !filled.employeeNumber) {
          filled.employeeNumber = autoFill.employeeNumber;
        }
        break;

      case 'employee_signature':
        // Auto-fill for final signature
        if (autoFill.fullName && !filled.employeeName) {
          filled.employeeName = autoFill.fullName;
        }
        if (autoFill.position && !filled.position) {
          filled.position = autoFill.position;
        }
        if (autoFill.hireDate && !filled.startDate) {
          filled.startDate = autoFill.hireDate;
        }
        break;
    }

    return filled;
  }

  // Validate data integrity
  validateData(): boolean {
    try {
      const data = this.getData();
      // Basic validation - check if essential fields exist if any data is present
      if (Object.keys(data).length > 0) {
        // If we have data, we should at least have a name
        return !!(data.firstName || data.lastName);
      }
      return true; // Empty data is valid
    } catch (error) {
      console.error('Data validation failed:', error);
      return false;
    }
  }

  // Get completion percentage based on filled fields
  getCompletionPercentage(): number {
    const data = this.getData();
    const totalFields = Object.keys(this.getEmptyAutoFillData()).length;
    const filledFields = Object.values(data).filter(value => value && value.toString().trim() !== '').length;
    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  }

  // Get empty template
  private getEmptyAutoFillData(): AutoFillData {
    return {
      firstName: '',
      lastName: '',
      middleInitial: '',
      preferredName: '',
      fullName: '',
      dateOfBirth: '',
      ssn: '',
      email: '',
      phoneNumber: '',
      gender: '',
      maritalStatus: '',
      streetAddress: '',
      aptNumber: '',
      city: '',
      state: '',
      zipCode: '',
      position: '',
      department: '',
      hireDate: '',
      startDate: '',
      employeeNumber: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      emergencyContactAddress: '',
      emergencyContactCity: '',
      emergencyContactState: '',
      emergencyContactZip: '',
      emergencyContact2Name: '',
      emergencyContact2Phone: '',
      emergencyContact2Relationship: '',
      bankName: '',
      accountType: '',
      dependentCount: 0,
      spouseName: '',
      spouseDateOfBirth: '',
      citizenshipStatus: '',
      workAuthorizationExpiration: '',
      allergies: '',
      medications: '',
      medicalConditions: ''
    };
  }

  // Enhanced clear with confirmation
  clear(confirmedByUser: boolean = false) {
    if (!confirmedByUser) {
      console.warn('Auto-fill data clear requires user confirmation');
      return false;
    }
    
    this.data = {};
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
      localStorage.removeItem('onboarding_autofill'); // Legacy cleanup
      return true;
    } catch (error) {
      console.error('Failed to clear auto-fill data:', error);
      return false;
    }
  }

  // Export data for debugging/support
  exportData(): string {
    try {
      const data = this.getData();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export auto-fill data:', error);
      return '{}';
    }
  }

  // Import data (for recovery/migration)
  importData(jsonData: string): boolean {
    try {
      const parsed = JSON.parse(jsonData);
      this.updateData(parsed);
      return true;
    } catch (error) {
      console.error('Failed to import auto-fill data:', error);
      return false;
    }
  }
}

// Enhanced helper functions for comprehensive data extraction across all forms
export const extractAutoFillData = (formData: any, formType: string): Partial<AutoFillData> => {
  const autoFill = AutoFillManager.getInstance();
  let extracted: Partial<AutoFillData> = {};

  switch (formType) {
    case 'personal_info':
      extracted = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleInitial: formData.middleInitial,
        preferredName: formData.preferredName,
        fullName: `${formData.firstName} ${formData.middleInitial ? formData.middleInitial + ' ' : ''}${formData.lastName}`.trim(),
        dateOfBirth: formData.dateOfBirth,
        ssn: formData.ssn,
        email: formData.email,
        phoneNumber: formData.phone,
        gender: formData.gender,
        maritalStatus: formData.maritalStatus,
        streetAddress: formData.address,
        aptNumber: formData.aptNumber,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode
      };
      break;

    case 'job_details':
      extracted = {
        position: formData.jobTitle || formData.position,
        department: formData.department,
        hireDate: formData.hireDate,
        startDate: formData.startDate,
        employeeNumber: formData.employeeNumber
      };
      break;

    case 'i9_section1':
      extracted = {
        firstName: formData.employee_first_name,
        lastName: formData.employee_last_name,
        middleInitial: formData.employee_middle_initial,
        fullName: `${formData.employee_first_name} ${formData.employee_middle_initial ? formData.employee_middle_initial + ' ' : ''}${formData.employee_last_name}`.trim(),
        dateOfBirth: formData.date_of_birth,
        ssn: formData.ssn,
        email: formData.email,
        phoneNumber: formData.phone,
        streetAddress: formData.address_street,
        aptNumber: formData.address_apt,
        city: formData.address_city,
        state: formData.address_state,
        zipCode: formData.address_zip,
        citizenshipStatus: formData.citizenship_status,
        workAuthorizationExpiration: formData.work_authorization_expiration
      };
      break;

    case 'w4_form':
      extracted = {
        firstName: formData.first_name,
        lastName: formData.last_name,
        middleInitial: formData.middle_initial,
        fullName: `${formData.first_name} ${formData.middle_initial ? formData.middle_initial + ' ' : ''}${formData.last_name}`.trim(),
        streetAddress: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zip_code,
        ssn: formData.ssn,
        maritalStatus: formData.filing_status?.includes('Married') ? 'married' : 'single',
        dependentCount: (formData.dependents_amount || 0) / 2000 // Convert dollar amount back to count
      };
      break;

    case 'direct_deposit':
      extracted = {
        bankName: formData.primaryAccount?.bankName,
        accountType: formData.primaryAccount?.accountType
      };
      break;

    case 'emergency_contacts':
      extracted = {
        emergencyContactName: formData.primaryContact?.name,
        emergencyContactPhone: formData.primaryContact?.phoneNumber,
        emergencyContactRelationship: formData.primaryContact?.relationship,
        emergencyContactAddress: formData.primaryContact?.address,
        emergencyContactCity: formData.primaryContact?.city,
        emergencyContactState: formData.primaryContact?.state,
        emergencyContactZip: formData.primaryContact?.zipCode,
        emergencyContact2Name: formData.secondaryContact?.name,
        emergencyContact2Phone: formData.secondaryContact?.phoneNumber,
        emergencyContact2Relationship: formData.secondaryContact?.relationship,
        allergies: formData.allergies,
        medications: formData.medications,
        medicalConditions: formData.medicalConditions
      };
      break;

    case 'health_insurance':
      extracted = {
        dependentCount: formData.dependents?.length || 0,
        spouseName: formData.spouseName,
        spouseDateOfBirth: formData.spouseDateOfBirth
      };
      break;

    case 'background_check':
      // Background check usually confirms existing data, extract any new info
      extracted = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleInitial: formData.middleInitial,
        dateOfBirth: formData.dateOfBirth,
        ssn: formData.ssn,
        streetAddress: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode
      };
      break;

    case 'photo_capture':
      extracted = {
        employeeNumber: formData.employeeNumber
      };
      break;
  }

  // Filter out undefined/empty values
  const cleanExtracted = Object.fromEntries(
    Object.entries(extracted).filter(([_, value]) => 
      value !== undefined && value !== null && value !== ''
    )
  );

  // Update the auto-fill data
  autoFill.updateData(cleanExtracted);
  return cleanExtracted;
};

// Utility function to format address for display
export const formatAddress = (autoFill: AutoFillData): string => {
  const parts = [
    autoFill.streetAddress,
    autoFill.aptNumber ? `Apt ${autoFill.aptNumber}` : '',
    autoFill.city,
    autoFill.state,
    autoFill.zipCode
  ].filter(part => part && part.trim() !== '');
  
  return parts.join(', ');
};

// Utility function to check if field mapping exists
export const hasAutoFillMapping = (formType: string, fieldName: string): boolean => {
  const mappings = {
    'personal_info': ['firstName', 'lastName', 'middleInitial', 'dateOfBirth', 'ssn', 'email', 'phone', 'address', 'city', 'state', 'zipCode'],
    'i9_section1': ['employee_first_name', 'employee_last_name', 'employee_middle_initial', 'date_of_birth', 'ssn', 'email', 'phone', 'address_street', 'address_city', 'address_state', 'address_zip'],
    'w4_form': ['first_name', 'last_name', 'middle_initial', 'address', 'city', 'state', 'zip_code', 'ssn', 'filing_status'],
    'direct_deposit': ['primaryAccount.accountHolderName'],
    'emergency_contacts': ['primaryContact.address', 'primaryContact.city', 'primaryContact.state', 'primaryContact.zipCode'],
    'health_insurance': ['employeeFirstName', 'employeeLastName', 'employeeDateOfBirth', 'employeeSSN'],
    'background_check': ['firstName', 'lastName', 'middleInitial', 'dateOfBirth', 'ssn', 'address', 'city', 'state', 'zipCode']
  };
  
  return mappings[formType]?.includes(fieldName) || false;
};

// Utility function to get data flow dependencies
export const getDataFlowDependencies = (formType: string): string[] => {
  const dependencies = {
    'personal_info': [], // No dependencies - this is the source
    'job_details': ['personal_info'],
    'document_upload': ['personal_info'],
    'i9_section1': ['personal_info'],
    'i9_supplement_a': ['i9_section1'],
    'i9_supplement_b': ['i9_section1'],
    'i9_review_sign': ['i9_section1'],
    'w4_form': ['personal_info'],
    'w4_review_sign': ['w4_form'],
    'direct_deposit': ['personal_info'],
    'emergency_contacts': ['personal_info'],
    'health_insurance': ['personal_info', 'w4_form'],
    'company_policies': ['personal_info'],
    'trafficking_awareness': ['personal_info'],
    'background_check': ['personal_info'],
    'photo_capture': ['personal_info', 'job_details'],
    'employee_signature': ['personal_info', 'job_details']
  };
  
  return dependencies[formType] || [];
};

// Enhanced data persistence manager for comprehensive state management
export class OnboardingDataPersistence {
  private static instance: OnboardingDataPersistence;
  private readonly FORM_DATA_KEY = 'onboarding_form_data_v2';
  private readonly SESSION_KEY = 'onboarding_session_v2';

  static getInstance(): OnboardingDataPersistence {
    if (!OnboardingDataPersistence.instance) {
      OnboardingDataPersistence.instance = new OnboardingDataPersistence();
    }
    return OnboardingDataPersistence.instance;
  }

  // Save form data with step tracking
  saveFormData(stepId: string, formData: any, token?: string) {
    try {
      const existing = this.getAllFormData(token);
      const updated = {
        ...existing,
        [stepId]: {
          data: formData,
          lastUpdated: new Date().toISOString(),
          isComplete: true
        }
      };
      
      const key = token ? `${this.FORM_DATA_KEY}_${token}` : this.FORM_DATA_KEY;
      localStorage.setItem(key, JSON.stringify(updated));
      
      // Extract auto-fill data
      extractAutoFillData(formData, stepId);
      
      return true;
    } catch (error) {
      console.error('Failed to save form data:', error);
      return false;
    }
  }

  // Get form data for specific step
  getFormData(stepId: string, token?: string): any {
    try {
      const allData = this.getAllFormData(token);
      return allData[stepId]?.data || {};
    } catch (error) {
      console.error('Failed to get form data:', error);
      return {};
    }
  }

  // Get all form data
  getAllFormData(token?: string): Record<string, any> {
    try {
      const key = token ? `${this.FORM_DATA_KEY}_${token}` : this.FORM_DATA_KEY;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to get all form data:', error);
      return {};
    }
  }

  // Check if step is complete
  isStepComplete(stepId: string, token?: string): boolean {
    try {
      const allData = this.getAllFormData(token);
      return allData[stepId]?.isComplete || false;
    } catch (error) {
      return false;
    }
  }

  // Get completion percentage
  getCompletionPercentage(totalSteps: number, token?: string): number {
    try {
      const allData = this.getAllFormData(token);
      const completedSteps = Object.values(allData).filter((step: any) => step.isComplete).length;
      return Math.round((completedSteps / totalSteps) * 100);
    } catch (error) {
      return 0;
    }
  }

  // Save session state
  saveSessionState(sessionData: any, token?: string) {
    try {
      const key = token ? `${this.SESSION_KEY}_${token}` : this.SESSION_KEY;
      const dataWithMeta = {
        ...sessionData,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(dataWithMeta));
      return true;
    } catch (error) {
      console.error('Failed to save session state:', error);
      return false;
    }
  }

  // Get session state
  getSessionState(token?: string): any {
    try {
      const key = token ? `${this.SESSION_KEY}_${token}` : this.SESSION_KEY;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to get session state:', error);
      return {};
    }
  }

  // Clear all data for token
  clearAllData(token?: string, confirmedByUser: boolean = false) {
    if (!confirmedByUser) {
      console.warn('Data clear requires user confirmation');
      return false;
    }

    try {
      if (token) {
        localStorage.removeItem(`${this.FORM_DATA_KEY}_${token}`);
        localStorage.removeItem(`${this.SESSION_KEY}_${token}`);
      } else {
        // Clear all onboarding data
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(this.FORM_DATA_KEY) || key.startsWith(this.SESSION_KEY)) {
            localStorage.removeItem(key);
          }
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
  }

  // Export all data for debugging
  exportAllData(token?: string): string {
    try {
      const formData = this.getAllFormData(token);
      const sessionData = this.getSessionState(token);
      const autoFillData = AutoFillManager.getInstance().getData();
      
      return JSON.stringify({
        formData,
        sessionData,
        autoFillData,
        exportedAt: new Date().toISOString()
      }, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      return '{}';
    }
  }
}