/**
 * Document Verification Service
 * Handles verification of ALL employee documents by manager
 */

export interface DocumentVerificationStatus {
  documentType: string;
  documentName: string;
  status: 'pending' | 'verified' | 'rejected' | 'missing';
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  required: boolean;
}

export interface AllDocumentsStatus {
  employeeId: string;
  employeeName: string;
  documents: DocumentVerificationStatus[];
  overallStatus: 'complete' | 'incomplete' | 'pending';
  completionPercentage: number;
  lastUpdated: string;
}

// All document types that need manager verification
export const DOCUMENT_TYPES = {
  // Federal Forms
  I9_SECTION_1: {
    type: 'i9_section_1',
    name: 'I-9 Section 1 (Employee)',
    required: true,
    category: 'federal'
  },
  I9_SECTION_2: {
    type: 'i9_section_2',
    name: 'I-9 Section 2 (Employer)',
    required: true,
    category: 'federal'
  },
  I9_DOCUMENTS: {
    type: 'i9_documents',
    name: 'I-9 Verification Documents',
    required: true,
    category: 'federal'
  },
  W4_FEDERAL: {
    type: 'w4_federal',
    name: 'W-4 Federal Tax Withholding',
    required: true,
    category: 'federal'
  },
  
  // State Forms
  W4_STATE: {
    type: 'w4_state',
    name: 'State Tax Withholding',
    required: false,
    category: 'state'
  },
  
  // Benefits
  HEALTH_INSURANCE: {
    type: 'health_insurance',
    name: 'Health Insurance Enrollment',
    required: false,
    category: 'benefits'
  },
  DENTAL_INSURANCE: {
    type: 'dental_insurance',
    name: 'Dental Insurance Enrollment',
    required: false,
    category: 'benefits'
  },
  VISION_INSURANCE: {
    type: 'vision_insurance',
    name: 'Vision Insurance Enrollment',
    required: false,
    category: 'benefits'
  },
  RETIREMENT_401K: {
    type: 'retirement_401k',
    name: '401(k) Enrollment',
    required: false,
    category: 'benefits'
  },
  
  // Direct Deposit
  DIRECT_DEPOSIT: {
    type: 'direct_deposit',
    name: 'Direct Deposit Authorization',
    required: false,
    category: 'payroll'
  },
  VOIDED_CHECK: {
    type: 'voided_check',
    name: 'Voided Check (for Direct Deposit)',
    required: false,
    category: 'payroll'
  },
  
  // Company Policies
  EMPLOYEE_HANDBOOK: {
    type: 'employee_handbook',
    name: 'Employee Handbook Acknowledgment',
    required: true,
    category: 'policies'
  },
  CODE_OF_CONDUCT: {
    type: 'code_of_conduct',
    name: 'Code of Conduct Agreement',
    required: true,
    category: 'policies'
  },
  CONFIDENTIALITY: {
    type: 'confidentiality',
    name: 'Confidentiality Agreement',
    required: false,
    category: 'policies'
  },
  
  // Emergency Contact
  EMERGENCY_CONTACT: {
    type: 'emergency_contact',
    name: 'Emergency Contact Information',
    required: true,
    category: 'personal'
  },
  
  // Background Check
  BACKGROUND_CHECK: {
    type: 'background_check',
    name: 'Background Check Authorization',
    required: false,
    category: 'compliance'
  },
  DRUG_TEST: {
    type: 'drug_test',
    name: 'Drug Test Consent',
    required: false,
    category: 'compliance'
  },
  
  // Uniform/Equipment
  UNIFORM_AGREEMENT: {
    type: 'uniform_agreement',
    name: 'Uniform Agreement',
    required: false,
    category: 'equipment'
  },
  EQUIPMENT_RECEIPT: {
    type: 'equipment_receipt',
    name: 'Equipment Receipt',
    required: false,
    category: 'equipment'
  }
};

export class DocumentVerificationService {
  /**
   * Get all documents status for an employee
   */
  static async getAllDocumentsStatus(employeeId: string): Promise<AllDocumentsStatus> {
    try {
      const response = await fetch(
        `/api/manager/review/employees/${employeeId}/all-documents`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch documents status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching documents status:', error);
      throw error;
    }
  }

  /**
   * Verify a specific document
   */
  static async verifyDocument(
    employeeId: string,
    documentType: string,
    notes?: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `/api/manager/review/employees/${employeeId}/verify-document`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            document_type: documentType,
            status: 'verified',
            notes
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to verify document');
      }

      console.log(`✅ Document verified: ${documentType}`);
    } catch (error) {
      console.error('Error verifying document:', error);
      throw error;
    }
  }

  /**
   * Reject a specific document
   */
  static async rejectDocument(
    employeeId: string,
    documentType: string,
    reason: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `/api/manager/review/employees/${employeeId}/verify-document`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            document_type: documentType,
            status: 'rejected',
            notes: reason
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject document');
      }

      console.log(`❌ Document rejected: ${documentType}`);
    } catch (error) {
      console.error('Error rejecting document:', error);
      throw error;
    }
  }

  /**
   * Verify all documents at once
   */
  static async verifyAllDocuments(
    employeeId: string,
    notes?: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `/api/manager/review/employees/${employeeId}/verify-all-documents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ notes })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to verify all documents');
      }

      console.log(`✅ All documents verified for employee: ${employeeId}`);
    } catch (error) {
      console.error('Error verifying all documents:', error);
      throw error;
    }
  }

  /**
   * Get document categories
   */
  static getDocumentCategories(): string[] {
    const categories = new Set<string>();
    
    Object.values(DOCUMENT_TYPES).forEach(doc => {
      categories.add(doc.category);
    });

    return Array.from(categories);
  }

  /**
   * Get documents by category
   */
  static getDocumentsByCategory(category: string) {
    return Object.values(DOCUMENT_TYPES).filter(
      doc => doc.category === category
    );
  }

  /**
   * Calculate completion percentage
   */
  static calculateCompletion(documents: DocumentVerificationStatus[]): number {
    const requiredDocs = documents.filter(doc => doc.required);
    const verifiedDocs = requiredDocs.filter(doc => doc.status === 'verified');
    
    if (requiredDocs.length === 0) return 100;
    
    return Math.round((verifiedDocs.length / requiredDocs.length) * 100);
  }

  /**
   * Check if all required documents are verified
   */
  static areAllRequiredDocsVerified(documents: DocumentVerificationStatus[]): boolean {
    const requiredDocs = documents.filter(doc => doc.required);
    return requiredDocs.every(doc => doc.status === 'verified');
  }
}

export default DocumentVerificationService;

