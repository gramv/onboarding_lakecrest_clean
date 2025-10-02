// Standardized onboarding step definitions
export const STANDARD_ONBOARDING_STEPS = [
  { 
    id: 'welcome', 
    title: 'Welcome & Language',
    titleEs: 'Bienvenida e Idioma',
    estimatedMinutes: 2,
    mandatory: true,
    governmentRequired: false
  },
  { 
    id: 'job-details', 
    title: 'Job Details',
    titleEs: 'Detalles del Trabajo',
    estimatedMinutes: 3,
    mandatory: true,
    governmentRequired: false
  },
  { 
    id: 'personal-info', 
    title: 'Personal Information',
    titleEs: 'Información Personal',
    estimatedMinutes: 5,
    mandatory: true,
    governmentRequired: false
  },
  { 
    id: 'i9-section1', 
    title: 'I-9 Section 1',
    titleEs: 'I-9 Sección 1',
    estimatedMinutes: 10,
    mandatory: true,
    governmentRequired: true
  },
  { 
    id: 'i9-supplements', 
    title: 'I-9 Supplements',
    titleEs: 'Suplementos I-9',
    estimatedMinutes: 5,
    mandatory: false,
    governmentRequired: true,
    conditional: true
  },
  { 
    id: 'document-upload', 
    title: 'Document Upload',
    titleEs: 'Subir Documentos',
    estimatedMinutes: 7,
    mandatory: true,
    governmentRequired: true
  },
  { 
    id: 'w4-form', 
    title: 'W-4 Tax Form',
    titleEs: 'Formulario de Impuestos W-4',
    estimatedMinutes: 8,
    mandatory: true,
    governmentRequired: true
  },
  { 
    id: 'direct-deposit', 
    title: 'Direct Deposit',
    titleEs: 'Depósito Directo',
    estimatedMinutes: 5,
    mandatory: true,
    governmentRequired: false
  },
  { 
    id: 'health-insurance', 
    title: 'Health Insurance',
    titleEs: 'Seguro de Salud',
    estimatedMinutes: 10,
    mandatory: true,
    governmentRequired: false
  },
  { 
    id: 'emergency-contacts', 
    title: 'Emergency Contacts',
    titleEs: 'Contactos de Emergencia',
    estimatedMinutes: 5,
    mandatory: true,
    governmentRequired: false
  },
  { 
    id: 'company-policies', 
    title: 'Company Policies',
    titleEs: 'Políticas de la Empresa',
    estimatedMinutes: 5,
    mandatory: true,
    governmentRequired: false
  },
  { 
    id: 'trafficking-awareness', 
    title: 'Human Trafficking Awareness',
    titleEs: 'Conciencia sobre Tráfico Humano',
    estimatedMinutes: 5,
    mandatory: true,
    governmentRequired: true
  },
  { 
    id: 'weapons-policy', 
    title: 'Weapons Policy',
    titleEs: 'Política de Armas',
    estimatedMinutes: 3,
    mandatory: false,
    governmentRequired: false,
    conditional: true
  },
  { 
    id: 'background-check', 
    title: 'Background Check',
    titleEs: 'Verificación de Antecedentes',
    estimatedMinutes: 5,
    mandatory: true,
    governmentRequired: false
  },
  { 
    id: 'photo-capture', 
    title: 'Photo Capture',
    titleEs: 'Captura de Foto',
    estimatedMinutes: 2,
    mandatory: true,
    governmentRequired: false
  },
  { 
    id: 'final-review', 
    title: 'Final Review',
    titleEs: 'Revisión Final',
    estimatedMinutes: 5,
    mandatory: true,
    governmentRequired: false
  },
  { 
    id: 'w4-review-sign', 
    title: 'W-4 Review & Sign',
    titleEs: 'Revisar y Firmar W-4',
    estimatedMinutes: 3,
    mandatory: true,
    governmentRequired: true
  },
  { 
    id: 'i9-review-sign', 
    title: 'I-9 Review & Sign',
    titleEs: 'Revisar y Firmar I-9',
    estimatedMinutes: 3,
    mandatory: true,
    governmentRequired: true
  },
  { 
    id: 'employee-review', 
    title: 'Employee Review',
    titleEs: 'Revisión del Empleado',
    estimatedMinutes: 5,
    mandatory: true,
    governmentRequired: false
  }
];

// Map old IDs to new standardized IDs
export const STEP_ID_MAPPING: Record<string, string> = {
  // Old ID -> New ID
  'language_welcome': 'welcome',
  'job_details_confirmation': 'job-details',
  'personal_information': 'personal-info',
  'job_details': 'job-details',
  'personal-info': 'personal-info',
  'i9-section1': 'i9-section1',
  'i9_section1': 'i9-section1',
  'w4_tax_withholding': 'w4-form',
  'w4-form': 'w4-form',
  'w4_form': 'w4-form',
  'direct-deposit': 'direct-deposit',
  'direct_deposit': 'direct-deposit',
  'health-insurance': 'health-insurance',
  'health_insurance': 'health-insurance',
  'emergency-contacts': 'emergency-contacts',
  'emergency_contacts': 'emergency-contacts',
  'company-policies': 'company-policies',
  'company_policies': 'company-policies',
  'trafficking-awareness': 'trafficking-awareness',
  'safety_training': 'trafficking-awareness',
  'weapons-policy': 'weapons-policy',
  'background-check': 'background-check',
  'photo-capture': 'photo-capture',
  'final-review': 'final-review',
  'w4-review-sign': 'w4-review-sign',
  'i9-review-sign': 'i9-review-sign',
  'employee-review': 'employee-review'
};

// Helper function to get standardized step ID
export function getStandardStepId(stepId: string): string {
  return STEP_ID_MAPPING[stepId] || stepId;
}

// Helper function to get step by ID
export function getStepById(stepId: string) {
  const standardId = getStandardStepId(stepId);
  return STANDARD_ONBOARDING_STEPS.find(step => step.id === standardId);
}