/**
 * Official Employee Hire Packet Mapping Service
 * 
 * Maps the official "2025+ New Employee Hire Packet" structure to 
 * modular onboarding workflow components for comprehensive compliance.
 * 
 * Based on the 28-page official packet containing all required
 * federal, state, and company compliance documents.
 */

interface OnboardingStepConfig {
  id: string;
  title: string;
  component: string;
  estimatedTime: number; // minutes
  required: boolean;
  federalCompliance: boolean;
  stateCompliance: boolean;
  companyPolicy: boolean;
  documentType?: string;
  packetPages: number[]; // Pages from the original packet
  dependencies: string[]; // Prerequisites
  description: string;
  userActions: string[];
}

interface PacketSection {
  sectionTitle: string;
  pages: number[];
  documents: string[];
  complianceLevel: 'federal' | 'state' | 'company';
  description: string;
}

/**
 * Complete mapping of the official employee hire packet
 * Each section corresponds to the actual packet structure
 */
export const OFFICIAL_PACKET_SECTIONS: Record<string, PacketSection> = {
  // Section 1: Welcome & Orientation (Pages 1-3)
  welcome_orientation: {
    sectionTitle: 'Welcome & Company Orientation',
    pages: [1, 2, 3],
    documents: ['welcome_letter', 'company_overview', 'mission_values'],
    complianceLevel: 'company',
    description: 'Company welcome, mission, values, and initial orientation materials'
  },

  // Section 2: Employment Documentation (Pages 4-6)
  employment_verification: {
    sectionTitle: 'Employment Verification & Job Details',
    pages: [4, 5, 6],
    documents: ['job_description', 'employment_terms', 'position_confirmation'],
    complianceLevel: 'company',
    description: 'Job description, employment terms, position details confirmation'
  },

  // Section 3: Federal I-9 Forms (Pages 7-13)
  federal_i9_forms: {
    sectionTitle: 'Federal I-9 Employment Eligibility Verification',
    pages: [7, 8, 9, 10, 11, 12, 13],
    documents: ['i9_section1', 'i9_section2', 'i9_supplement_a', 'i9_supplement_b', 'i9_instructions'],
    complianceLevel: 'federal',
    description: 'Complete I-9 employment eligibility verification including supplements'
  },

  // Section 4: Federal W-4 Tax Forms (Pages 14-16)
  federal_w4_forms: {
    sectionTitle: 'Federal W-4 Tax Withholding',
    pages: [14, 15, 16],
    documents: ['w4_form', 'w4_instructions', 'w4_worksheet'],
    complianceLevel: 'federal',
    description: 'IRS Form W-4 for federal tax withholding elections'
  },

  // Section 5: Payroll & Benefits (Pages 17-19)
  payroll_benefits: {
    sectionTitle: 'Payroll & Benefits Enrollment',
    pages: [17, 18, 19],
    documents: ['direct_deposit', 'health_insurance', 'benefits_summary'],
    complianceLevel: 'company',
    description: 'Direct deposit setup, health insurance enrollment, benefits overview'
  },

  // Section 6: Emergency Information (Pages 20-21)
  emergency_information: {
    sectionTitle: 'Emergency Contacts & Medical Information',
    pages: [20, 21],
    documents: ['emergency_contacts', 'medical_information'],
    complianceLevel: 'company',
    description: 'Emergency contact information and relevant medical details'
  },

  // Section 7: Background & Security (Pages 22-23)
  background_security: {
    sectionTitle: 'Background Check & Security Clearance',
    pages: [22, 23],
    documents: ['background_authorization', 'security_clearance'],
    complianceLevel: 'federal',
    description: 'Background check authorization and security clearance requirements'
  },

  // Section 8: Company Policies (Pages 24-26)
  company_policies: {
    sectionTitle: 'Company Policies & Procedures',
    pages: [24, 25, 26],
    documents: ['employee_handbook', 'code_of_conduct', 'privacy_policy'],
    complianceLevel: 'company',
    description: 'Employee handbook, code of conduct, and company policy acknowledgments'
  },

  // Section 9: Safety & Training (Pages 27-28)
  safety_training: {
    sectionTitle: 'Safety Training & Compliance',
    pages: [27, 28],
    documents: ['safety_training', 'compliance_acknowledgments'],
    complianceLevel: 'federal',
    description: 'Workplace safety training and federal compliance acknowledgments'
  }
};

/**
 * Complete onboarding workflow mapped to packet structure
 * Each step corresponds to actual packet sections
 */
export const ONBOARDING_WORKFLOW_STEPS: OnboardingStepConfig[] = [
  // Step 1: Language Selection & Welcome
  {
    id: 'language_welcome',
    title: 'Welcome & Language Selection',
    component: 'WelcomeStep',
    estimatedTime: 2,
    required: true,
    federalCompliance: false,
    stateCompliance: false,
    companyPolicy: true,
    packetPages: [1],
    dependencies: [],
    description: 'Welcome message and language preference selection',
    userActions: ['Select preferred language', 'Review welcome message']
  },

  // Step 2: Job Details Confirmation
  {
    id: 'job_details_confirmation',
    title: 'Job Details Confirmation',
    component: 'JobDetailsStep',
    estimatedTime: 3,
    required: true,
    federalCompliance: false,
    stateCompliance: false,
    companyPolicy: true,
    packetPages: [4, 5, 6],
    dependencies: ['language_welcome'],
    description: 'Confirm job title, department, supervisor, and employment terms',
    userActions: ['Review job description', 'Confirm employment details', 'Acknowledge terms']
  },

  // Step 3: Personal Information Form
  {
    id: 'personal_information',
    title: 'Personal Information',
    component: 'PersonalInformationStep',
    estimatedTime: 5,
    required: true,
    federalCompliance: true,
    stateCompliance: false,
    companyPolicy: false,
    packetPages: [7],
    dependencies: ['job_details_confirmation'],
    description: 'Collect basic personal information for government forms',
    userActions: ['Enter personal details', 'Provide contact information', 'Verify information']
  },

  // Step 4: I-9 Section 1 Completion
  {
    id: 'i9_section1',
    title: 'I-9 Employment Eligibility (Section 1)',
    component: 'I9Section1Step',
    estimatedTime: 8,
    required: true,
    federalCompliance: true,
    stateCompliance: false,
    companyPolicy: false,
    documentType: 'i9',
    packetPages: [7, 8, 9],
    dependencies: ['personal_information'],
    description: 'Complete I-9 Section 1 - Employee attestation of work eligibility',
    userActions: ['Complete eligibility attestation', 'Provide citizenship status', 'Enter document information']
  },

  // Step 5: I-9 Supplements (Optional)
  {
    id: 'i9_supplements',
    title: 'I-9 Supplements (If Required)',
    component: 'I9SupplementsStep',
    estimatedTime: 10,
    required: false,
    federalCompliance: true,
    stateCompliance: false,
    companyPolicy: false,
    documentType: 'i9',
    packetPages: [10, 11, 12],
    dependencies: ['i9_section1'],
    description: 'Optional I-9 Supplements A and B for preparer/translator or reverification',
    userActions: ['Complete Supplement A if needed', 'Complete Supplement B if needed', 'Skip if not applicable']
  },

  // Step 6: I-9 Review & Digital Signature
  {
    id: 'i9_review_sign',
    title: 'I-9 Review & Signature',
    component: 'I9ReviewSignStep',
    estimatedTime: 5,
    required: true,
    federalCompliance: true,
    stateCompliance: false,
    companyPolicy: false,
    documentType: 'i9',
    packetPages: [7, 8, 9, 13],
    dependencies: ['i9_section1'],
    description: 'Review completed I-9 form and provide digital signature',
    userActions: ['Review official I-9 PDF', 'Verify all information', 'Provide digital signature']
  },

  // Step 7: W-4 Tax Withholding
  {
    id: 'w4_tax_withholding',
    title: 'W-4 Tax Withholding',
    component: 'W4Step',
    estimatedTime: 7,
    required: true,
    federalCompliance: true,
    stateCompliance: false,
    companyPolicy: false,
    documentType: 'w4',
    packetPages: [14, 15, 16],
    dependencies: ['personal_information'],
    description: 'Complete IRS Form W-4 for federal tax withholding',
    userActions: ['Select filing status', 'Enter dependents', 'Set withholding preferences']
  },

  // Step 8: W-4 Review & Digital Signature
  {
    id: 'w4_review_sign',
    title: 'W-4 Review & Signature',
    component: 'W4ReviewSignStep',
    estimatedTime: 4,
    required: true,
    federalCompliance: true,
    stateCompliance: false,
    companyPolicy: false,
    documentType: 'w4',
    packetPages: [14, 15, 16],
    dependencies: ['w4_tax_withholding'],
    description: 'Review completed W-4 form and provide digital signature',
    userActions: ['Review official W-4 PDF', 'Verify tax elections', 'Provide digital signature']
  },

  // Step 9: Direct Deposit Setup
  {
    id: 'direct_deposit',
    title: 'Direct Deposit Setup',
    component: 'DirectDepositStep',
    estimatedTime: 6,
    required: false,
    federalCompliance: false,
    stateCompliance: false,
    companyPolicy: true,
    documentType: 'direct_deposit',
    packetPages: [17],
    dependencies: ['w4_review_sign'],
    description: 'Setup direct deposit for payroll',
    userActions: ['Enter banking information', 'Upload voided check', 'Authorize direct deposit']
  },

  // Step 10: Health Insurance Enrollment
  {
    id: 'health_insurance',
    title: 'Health Insurance Enrollment',
    component: 'HealthInsuranceStep',
    estimatedTime: 8,
    required: false,
    federalCompliance: false,
    stateCompliance: false,
    companyPolicy: true,
    documentType: 'health_insurance',
    packetPages: [18, 19],
    dependencies: ['direct_deposit'],
    description: 'Enroll in company health insurance plans',
    userActions: ['Review plan options', 'Select coverage level', 'Add dependents if applicable']
  },

  // Step 11: Emergency Contacts
  {
    id: 'emergency_contacts',
    title: 'Emergency Contacts',
    component: 'EmergencyContactsStep',
    estimatedTime: 4,
    required: true,
    federalCompliance: false,
    stateCompliance: false,
    companyPolicy: true,
    documentType: 'emergency_contacts',
    packetPages: [20, 21],
    dependencies: ['health_insurance'],
    description: 'Provide emergency contact and medical information',
    userActions: ['Add primary contact', 'Add secondary contact', 'Provide medical information']
  },

  // Step 12: Background Check Authorization
  {
    id: 'background_check',
    title: 'Background Check Authorization',
    component: 'BackgroundCheckStep',
    estimatedTime: 5,
    required: true,
    federalCompliance: true,
    stateCompliance: false,
    companyPolicy: false,
    documentType: 'background_check',
    packetPages: [22, 23],
    dependencies: ['emergency_contacts'],
    description: 'Authorize employment background check',
    userActions: ['Review FCRA rights', 'Provide authorization', 'Acknowledge background check']
  },

  // Step 13: Employee Photo Capture
  {
    id: 'photo_capture',
    title: 'Employee Photo',
    component: 'PhotoCaptureStep',
    estimatedTime: 3,
    required: true,
    federalCompliance: false,
    stateCompliance: false,
    companyPolicy: true,
    packetPages: [],
    dependencies: ['background_check'],
    description: 'Capture employee photo for identification badge',
    userActions: ['Take employee photo', 'Verify photo quality', 'Confirm photo use']
  },

  // Step 14: Company Policies Acknowledgment
  {
    id: 'company_policies',
    title: 'Company Policies & Handbook',
    component: 'CompanyPoliciesStep',
    estimatedTime: 15,
    required: true,
    federalCompliance: false,
    stateCompliance: false,
    companyPolicy: true,
    documentType: 'employee_handbook',
    packetPages: [24, 25, 26],
    dependencies: ['photo_capture'],
    description: 'Review and acknowledge company policies and employee handbook',
    userActions: ['Review employee handbook', 'Acknowledge code of conduct', 'Sign policy agreements']
  },

  // Step 15: Safety Training & Compliance
  {
    id: 'safety_training',
    title: 'Safety Training & Compliance',
    component: 'SafetyTrainingStep',
    estimatedTime: 10,
    required: true,
    federalCompliance: true,
    stateCompliance: false,
    companyPolicy: true,
    packetPages: [27, 28],
    dependencies: ['company_policies'],
    description: 'Complete mandatory safety training and compliance acknowledgments',
    userActions: ['Complete safety training', 'Acknowledge compliance requirements', 'Pass safety quiz']
  },

  // Step 16: Final Review & Completion
  {
    id: 'final_review',
    title: 'Final Review & Completion',
    component: 'FinalReviewStep',
    estimatedTime: 5,
    required: true,
    federalCompliance: true,
    stateCompliance: false,
    companyPolicy: true,
    packetPages: [1, 28],
    dependencies: ['safety_training'],
    description: 'Final review of all completed documents and onboarding completion',
    userActions: ['Review all documents', 'Provide final signature', 'Complete onboarding']
  }
];

/**
 * Service for managing the official packet workflow
 */
export class OfficialPacketMappingService {
  /**
   * Get all workflow steps in proper sequence
   */
  static getWorkflowSteps(): OnboardingStepConfig[] {
    return ONBOARDING_WORKFLOW_STEPS;
  }

  /**
   * Get steps by compliance level
   */
  static getStepsByCompliance(level: 'federal' | 'state' | 'company'): OnboardingStepConfig[] {
    return ONBOARDING_WORKFLOW_STEPS.filter(step => {
      switch (level) {
        case 'federal':
          return step.federalCompliance;
        case 'state':
          return step.stateCompliance;
        case 'company':
          return step.companyPolicy;
        default:
          return false;
      }
    });
  }

  /**
   * Get required vs optional steps
   */
  static getRequiredSteps(): OnboardingStepConfig[] {
    return ONBOARDING_WORKFLOW_STEPS.filter(step => step.required);
  }

  static getOptionalSteps(): OnboardingStepConfig[] {
    return ONBOARDING_WORKFLOW_STEPS.filter(step => !step.required);
  }

  /**
   * Calculate total estimated time
   */
  static getTotalEstimatedTime(): number {
    return ONBOARDING_WORKFLOW_STEPS.reduce((total, step) => total + step.estimatedTime, 0);
  }

  /**
   * Get steps that require documents
   */
  static getDocumentSteps(): OnboardingStepConfig[] {
    return ONBOARDING_WORKFLOW_STEPS.filter(step => step.documentType);
  }

  /**
   * Get next step based on current step and dependencies
   */
  static getNextStep(currentStepId: string, completedSteps: string[]): OnboardingStepConfig | null {
    const currentIndex = ONBOARDING_WORKFLOW_STEPS.findIndex(step => step.id === currentStepId);
    
    if (currentIndex === -1 || currentIndex === ONBOARDING_WORKFLOW_STEPS.length - 1) {
      return null; // No next step
    }

    // Find the next step that has all dependencies completed
    for (let i = currentIndex + 1; i < ONBOARDING_WORKFLOW_STEPS.length; i++) {
      const step = ONBOARDING_WORKFLOW_STEPS[i];
      const dependenciesMet = step.dependencies.every(dep => completedSteps.includes(dep));
      
      if (dependenciesMet) {
        return step;
      }
    }

    return null;
  }

  /**
   * Validate that all dependencies are met for a step
   */
  static validateStepDependencies(stepId: string, completedSteps: string[]): boolean {
    const step = ONBOARDING_WORKFLOW_STEPS.find(s => s.id === stepId);
    if (!step) return false;

    return step.dependencies.every(dep => completedSteps.includes(dep));
  }

  /**
   * Get packet section for a step
   */
  static getPacketSectionForStep(stepId: string): PacketSection | null {
    const step = ONBOARDING_WORKFLOW_STEPS.find(s => s.id === stepId);
    if (!step || step.packetPages.length === 0) return null;

    // Find the packet section that contains these pages
    for (const [sectionKey, section] of Object.entries(OFFICIAL_PACKET_SECTIONS)) {
      const pagesOverlap = step.packetPages.some(page => section.pages.includes(page));
      if (pagesOverlap) {
        return section;
      }
    }

    return null;
  }

  /**
   * Get progress percentage
   */
  static calculateProgress(completedSteps: string[]): number {
    const totalSteps = ONBOARDING_WORKFLOW_STEPS.length;
    const completedCount = completedSteps.length;
    return Math.round((completedCount / totalSteps) * 100);
  }

  /**
   * Get completion summary
   */
  static getCompletionSummary(completedSteps: string[]): {
    total: number;
    completed: number;
    remaining: number;
    federalCompleted: number;
    federalTotal: number;
    estimatedTimeRemaining: number;
  } {
    const total = ONBOARDING_WORKFLOW_STEPS.length;
    const completed = completedSteps.length;
    const remaining = total - completed;
    
    const federalSteps = this.getStepsByCompliance('federal');
    const federalTotal = federalSteps.length;
    const federalCompleted = federalSteps.filter(step => completedSteps.includes(step.id)).length;
    
    const remainingSteps = ONBOARDING_WORKFLOW_STEPS.filter(step => !completedSteps.includes(step.id));
    const estimatedTimeRemaining = remainingSteps.reduce((total, step) => total + step.estimatedTime, 0);

    return {
      total,
      completed,
      remaining,
      federalCompleted,
      federalTotal,
      estimatedTimeRemaining
    };
  }
}

export default OfficialPacketMappingService;