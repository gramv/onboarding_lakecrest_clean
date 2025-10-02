/**
 * Form Component Architecture - Core Types and Interfaces
 * 
 * This file defines the standardized structure for all form components
 * to ensure consistency across the onboarding system and enable
 * both complete onboarding workflows and individual form updates.
 */

/**
 * Base form data interface
 * All form data types should extend this interface
 */
export interface BaseFormData {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  employeeId?: string;
  propertyId?: string;
  managerId?: string;
}

/**
 * Form validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  federalErrors?: string[];
  federalWarnings?: string[];
}

/**
 * Form field configuration
 */
export interface FormFieldConfig {
  name: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'signature' | 'file';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: ValidationRule[];
  conditional?: ConditionalRule;
  autoFill?: AutoFillRule;
}

/**
 * Validation rule
 */
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'email' | 'phone' | 'ssn' | 'date' | 'age' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any, formData: any) => boolean;
}

/**
 * Conditional rendering rule
 */
export interface ConditionalRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
  action: 'show' | 'hide' | 'require' | 'disable';
}

/**
 * Auto-fill rule
 */
export interface AutoFillRule {
  source: 'personal_info' | 'job_details' | 'previous_form' | 'api';
  field: string;
  transform?: (value: any) => any;
}

/**
 * Form component props interface
 * All form components must implement this interface
 */
export interface FormComponentProps<T extends BaseFormData> {
  /**
   * Initial form data (for editing existing records)
   */
  initialData?: Partial<T>;

  /**
   * Language preference for localization
   */
  language: 'en' | 'es';

  /**
   * Whether this form is being used in standalone mode
   */
  isStandalone?: boolean;

  /**
   * Whether to show navigation buttons
   */
  showNavigation?: boolean;

  /**
   * Whether to enable auto-save
   */
  autoSave?: boolean;

  /**
   * Auto-save interval in milliseconds
   */
  autoSaveInterval?: number;

  /**
   * Callback when form data changes
   */
  onChange?: (data: T, isValid: boolean) => void;

  /**
   * Callback when form is saved
   */
  onSave?: (data: T) => void;

  /**
   * Callback when form is submitted
   */
  onSubmit?: (data: T) => void;

  /**
   * Callback when validation state changes
   */
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;

  /**
   * Callback for navigation
   */
  onNext?: () => void;
  onBack?: () => void;

  /**
   * Custom styling classes
   */
  className?: string;

  /**
   * Whether to show federal compliance notices
   */
  showCompliance?: boolean;

  /**
   * Form configuration overrides
   */
  config?: Partial<FormConfig>;
}

/**
 * Form configuration interface
 */
export interface FormConfig {
  id: string;
  title: string;
  description: string;
  category: 'personal' | 'federal' | 'company' | 'benefits' | 'compliance';
  fields: FormFieldConfig[];
  validation: ValidationRule[];
  dependencies?: string[];
  federalCompliance?: FederalComplianceConfig;
  autoSave?: AutoSaveConfig;
  navigation?: NavigationConfig;
}

/**
 * Federal compliance configuration
 */
export interface FederalComplianceConfig {
  required: boolean;
  validation: string[];
  auditTrail: boolean;
  retentionPeriod: string;
  legalReferences: string[];
}

/**
 * Auto-save configuration
 */
export interface AutoSaveConfig {
  enabled: boolean;
  interval: number;
  storage: 'local' | 'session' | 'api';
  key: string;
}

/**
 * Navigation configuration
 */
export interface NavigationConfig {
  showButtons: boolean;
  showProgress: boolean;
  allowSkip: boolean;
  requireValidation: boolean;
}

/**
 * Form state interface
 */
export interface FormState<T extends BaseFormData> {
  data: T;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  isSaving: boolean;
  lastSaved?: string;
  federalComplianceErrors: string[];
  federalComplianceWarnings: string[];
}

/**
 * Form submission result
 */
export interface FormSubmissionResult<T extends BaseFormData> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
  federalErrors?: string[];
  auditTrail?: any;
}

/**
 * Form auto-fill data interface
 */
export interface AutoFillData {
  personal?: any;
  job?: any;
  company?: any;
  previousForms?: Record<string, any>;
}

/**
 * Form component interface
 * All form components must implement this interface
 */
export interface IFormComponent<T extends BaseFormData> {
  /**
   * Get form configuration
   */
  getConfig(): FormConfig;

  /**
   * Get current form data
   */
  getData(): T;

  /**
   * Validate form data
   */
  validate(): ValidationResult;

  /**
   * Save form data
   */
  save(): Promise<FormSubmissionResult<T>>;

  /**
   * Submit form data
   */
  submit(): Promise<FormSubmissionResult<T>>;

  /**
   * Reset form to initial state
   */
  reset(): void;

  /**
   * Check if form is valid
   */
  isValid(): boolean;

  /**
   * Get auto-fill data
   */
  getAutoFillData(): AutoFillData;

  /**
   * Apply auto-fill data
   */
  applyAutoFill(data: AutoFillData): void;
}

/**
 * Form registry interface
 */
export interface FormRegistry {
  [key: string]: React.ComponentType<FormComponentProps<any>>;
}

/**
 * Form context interface
 */
export interface FormContext {
  employeeId: string;
  propertyId: string;
  managerId: string;
  language: 'en' | 'es';
  mode: 'onboarding' | 'standalone' | 'update';
  permissions: string[];
}

/**
 * Form factory interface
 */
export interface FormFactory {
  createForm: (formId: string, props: FormComponentProps<any>) => React.ReactElement;
  registerForm: (formId: string, component: React.ComponentType<FormComponentProps<any>>) => void;
  getForm: (formId: string) => React.ComponentType<FormComponentProps<any>> | null;
}

/**
 * Utility types
 */
export type FormId = 
  | 'personal-information'
  | 'i9-section-1'
  | 'i9-section-2'
  | 'i9-supplement-a'
  | 'i9-supplement-b'
  | 'w4-form'
  | 'direct-deposit'
  | 'health-insurance'
  | 'emergency-contacts'
  | 'company-policies'
  | 'weapons-policy'
  | 'background-check'
  | 'human-trafficking';

export type FormCategory = 'personal' | 'federal' | 'company' | 'benefits' | 'compliance';
export type FormStatus = 'draft' | 'in_progress' | 'completed' | 'submitted' | 'approved' | 'rejected';
export type ValidationTrigger = 'change' | 'blur' | 'submit' | 'manual';