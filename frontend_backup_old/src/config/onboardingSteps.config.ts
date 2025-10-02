/**
 * Unified Onboarding Steps Configuration
 * Single source of truth for all onboarding flows
 */

export interface OnboardingStep {
  id: string;
  title: string;
  titleEs: string;
  description: string;
  descriptionEs: string;
  component: string; // Component name for dynamic imports
  estimatedMinutes: number;
  required: boolean;
  federalCompliance: boolean;
  allowStandalone: boolean; // Can HR send a link to just this form?
  validationRules?: string[];
  dependencies?: string[]; // Step IDs that must be completed first
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    titleEs: 'Bienvenido',
    description: 'Welcome to your onboarding journey',
    descriptionEs: 'Bienvenido a su proceso de incorporación',
    component: 'WelcomeStep',
    estimatedMinutes: 2,
    required: true,
    federalCompliance: false,
    allowStandalone: false,
  },
  {
    id: 'personal-info',
    title: 'Personal Information',
    titleEs: 'Información Personal',
    description: 'Basic personal and contact information',
    descriptionEs: 'Información personal y de contacto básica',
    component: 'PersonalInfoStep',
    estimatedMinutes: 10,
    required: true,
    federalCompliance: false,
    allowStandalone: true,
    validationRules: ['name', 'dob', 'ssn', 'contact'],
  },
  {
    id: 'job-details',
    title: 'Job Details',
    titleEs: 'Detalles del Trabajo',
    description: 'Review your position and employment details',
    descriptionEs: 'Revise su puesto y detalles de empleo',
    component: 'JobDetailsStep',
    estimatedMinutes: 5,
    required: true,
    federalCompliance: false,
    allowStandalone: false,
  },
  {
    id: 'i9-complete',
    title: 'I-9 Employment Verification',
    titleEs: 'I-9 Verificación de Empleo',
    description: 'Complete employment eligibility with document upload',
    descriptionEs: 'Complete la elegibilidad de empleo con carga de documentos',
    component: 'I9CompleteStep',
    estimatedMinutes: 20,
    required: true,
    federalCompliance: true,
    allowStandalone: true,
    validationRules: ['citizenship', 'workAuthorization', 'documents'],
    dependencies: ['personal-info'],
  },
  {
    id: 'w4-form',
    title: 'W-4 Tax Form',
    titleEs: 'Formulario W-4',
    description: 'Federal tax withholding information',
    descriptionEs: 'Información de retención de impuestos federales',
    component: 'W4FormStep',
    estimatedMinutes: 10,
    required: true,
    federalCompliance: true,
    allowStandalone: true,
    validationRules: ['taxInfo', 'filingStatus'],
    dependencies: ['personal-info'],
  },
  {
    id: 'w4-review-sign',
    title: 'Review & Sign W-4',
    titleEs: 'Revisar y Firmar W-4',
    description: 'Review and sign W-4 tax form',
    descriptionEs: 'Revisar y firmar formulario W-4',
    component: 'W4ReviewSignStep',
    estimatedMinutes: 3,
    required: true,
    federalCompliance: true,
    allowStandalone: false,
    dependencies: ['w4-form'],
  },
  {
    id: 'direct-deposit',
    title: 'Direct Deposit',
    titleEs: 'Depósito Directo',
    description: 'Banking information for payroll',
    descriptionEs: 'Información bancaria para nómina',
    component: 'DirectDepositStep',
    estimatedMinutes: 5,
    required: false,
    federalCompliance: false,
    allowStandalone: true,
    validationRules: ['bankInfo'],
  },
  {
    id: 'health-insurance',
    title: 'Health Insurance',
    titleEs: 'Seguro de Salud',
    description: 'Health insurance enrollment options',
    descriptionEs: 'Opciones de inscripción en seguro de salud',
    component: 'HealthInsuranceStep',
    estimatedMinutes: 15,
    required: false,
    federalCompliance: false,
    allowStandalone: true,
  },
  {
    id: 'company-policies',
    title: 'Company Policies',
    titleEs: 'Políticas de la Empresa',
    description: 'Review and acknowledge company policies',
    descriptionEs: 'Revisar y reconocer las políticas de la empresa',
    component: 'CompanyPoliciesStep',
    estimatedMinutes: 10,
    required: true,
    federalCompliance: false,
    allowStandalone: false,
  },
  {
    id: 'trafficking-awareness',
    title: 'Human Trafficking Awareness',
    titleEs: 'Conciencia sobre Trata de Personas',
    description: 'Federal requirement for hospitality workers',
    descriptionEs: 'Requisito federal para trabajadores de hospitalidad',
    component: 'TraffickingAwarenessStep',
    estimatedMinutes: 5,
    required: true,
    federalCompliance: true,
    allowStandalone: false,
  },
  {
    id: 'weapons-policy',
    title: 'Weapons Policy',
    titleEs: 'Política de Armas',
    description: 'Workplace weapons policy acknowledgment',
    descriptionEs: 'Reconocimiento de política de armas en el trabajo',
    component: 'WeaponsPolicyStep',
    estimatedMinutes: 3,
    required: false,
    federalCompliance: false,
    allowStandalone: false,
  },
  {
    id: 'final-review',
    title: 'Review & Submit',
    titleEs: 'Revisar y Enviar',
    description: 'Review all information before submission',
    descriptionEs: 'Revisar toda la información antes de enviar',
    component: 'FinalReviewStep',
    estimatedMinutes: 5,
    required: true,
    federalCompliance: false,
    allowStandalone: false,
    dependencies: ['personal-info', 'i9-section1', 'w4-form'],
  },
];

// Helper functions
export const getStepById = (id: string) => 
  ONBOARDING_STEPS.find(step => step.id === id);

export const getStandaloneSteps = () => 
  ONBOARDING_STEPS.filter(step => step.allowStandalone);

export const getRequiredSteps = () => 
  ONBOARDING_STEPS.filter(step => step.required);

export const getFederalComplianceSteps = () => 
  ONBOARDING_STEPS.filter(step => step.federalCompliance);

export const calculateTotalTime = (steps: OnboardingStep[] = ONBOARDING_STEPS) =>
  steps.reduce((total, step) => total + step.estimatedMinutes, 0);

export const validateStepDependencies = (stepId: string, completedSteps: string[]) => {
  const step = getStepById(stepId);
  if (!step || !step.dependencies) return true;
  
  return step.dependencies.every(dep => completedSteps.includes(dep));
};

// Map old IDs to new IDs for backward compatibility
export const STEP_ID_MAPPING: Record<string, string> = {
  'language_welcome': 'welcome',
  'job_details_confirmation': 'job-details',
  'personal_information': 'personal-info',
  'i9_section1': 'i9-section1',
  'i9_supplements': 'i9-supplements',
  'i9_supplement_a': 'i9-supplements',
  'i9_supplement_b': 'i9-supplements',
  'i9_review_sign': 'i9-section1',
  'w4_tax_withholding': 'w4-form',
  'w4_review_sign': 'w4-form',
  'direct_deposit': 'direct-deposit',
  'health_insurance': 'health-insurance',
  'company_policies': 'company-policies',
  'safety_training': 'trafficking-awareness',
  'trafficking_awareness': 'trafficking-awareness',
  'weapons_policy': 'weapons-policy',
  'final_review': 'final-review',
};

export const normalizeStepId = (id: string): string => {
  return STEP_ID_MAPPING[id] || id;
};