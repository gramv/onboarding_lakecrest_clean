/**
 * Document Verification Service
 * Handles sequential manager review and approval of employee documents
 */

export interface DocumentVerificationStatus {
  documentType: string;
  documentName: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_review';
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  pdfUrl?: string;
  uploadedDocsUrls?: string[]; // For I-9 verification docs
  order: number; // Sequential order
  canReview: boolean; // Can only review if previous is approved
}

export interface AllDocumentsStatus {
  employeeId: string;
  employeeName: string;
  propertyName: string;
  documents: DocumentVerificationStatus[];
  currentStep: number; // Which document is currently being reviewed
  overallStatus: 'not_started' | 'in_progress' | 'complete' | 'rejected';
  completionPercentage: number;
  lastUpdated: string;
}

// Sequential document review workflow
export const DOCUMENT_WORKFLOW = [
  {
    order: 1,
    type: 'new_hire_summary',
    name: 'New Hire Summary',
    description: 'Review auto-filled hire summary and confirm details before approving',
    path: 'forms/new_hire_summary',
    verificationSteps: [
      'Review hotel and employment location details',
      'Confirm employee personal information and address',
      'Verify compensation, hire date, and department',
      'Confirm health insurance selections and notes'
    ]
  },
  {
    order: 2,
    type: 'company_policies',
    name: 'Company Policies Acknowledgment',
    description: 'Verify employee signature on company policies',
    path: 'forms/company_policies',
    verificationSteps: [
      'Check employee signature exists',
      'Verify date is correct',
      'Confirm all pages are signed'
    ]
  },
  {
    order: 3,
    type: 'i9',
    name: 'I-9 Employment Eligibility Verification',
    description: 'Review Section 1, compare with uploaded documents, complete Section 2',
    path: 'forms/i9',
    uploadPath: 'uploads/i9_verification',
    verificationSteps: [
      'Review Section 1 (employee completed)',
      'Compare with uploaded documents (DL/Passport/SSN)',
      'Verify document authenticity',
      'Complete Section 2',
      'Sign as employer representative'
    ]
  },
  {
    order: 4,
    type: 'w4',
    name: 'W-4 Federal Tax Withholding',
    description: 'Review W-4 and verify SSN',
    path: 'forms/w4',
    uploadPath: 'uploads/i9_verification/ssn_card',
    verificationSteps: [
      'Review W-4 form',
      'Verify SSN matches SSN card',
      'Check withholding allowances',
      'Confirm signature and date'
    ]
  },
  {
    order: 5,
    type: 'direct_deposit',
    name: 'Direct Deposit Authorization',
    description: 'Review direct deposit form with embedded voided check',
    path: 'forms/direct_deposit',
    verificationSteps: [
      'Review direct deposit form',
      'Verify routing number matches voided check',
      'Verify account number matches voided check',
      'Confirm check is properly voided',
      'Check account type (Checking/Savings)'
    ]
  },
  {
    order: 6,
    type: 'health_insurance',
    name: 'Health Insurance Enrollment',
    description: 'Review health insurance enrollment form',
    path: 'forms/health_insurance',
    verificationSteps: [
      'Review enrollment selections',
      'Verify dependent information (if applicable)',
      'Confirm coverage start date',
      'Check signature and date'
    ]
  }
];


export class DocumentVerificationService {
  /**
   * Get all documents status for an employee
   */
  static async getAllDocumentsStatus(employeeId: string): Promise<AllDocumentsStatus> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/manager/review/employees/${employeeId}/documents-status`,
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
   * Get specific document for review
   */
  static async getDocumentForReview(
    employeeId: string,
    documentType: string
  ): Promise<{
    pdfUrl: string;
    uploadedDocsUrls?: string[];
    formData?: any;
    metadata?: any;
  }> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/manager/review/employees/${employeeId}/document/${documentType}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ${documentType} document`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${documentType}:`, error);
      throw error;
    }
  }

  /**
   * Approve a document (generates final PDF and replaces original)
   */
  static async approveDocument(
    employeeId: string,
    documentType: string,
    formData?: any,
    signature?: string,
    notes?: string
  ): Promise<{ success: boolean; finalPdfUrl: string }> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/manager/review/employees/${employeeId}/document/${documentType}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            form_data: formData,
            signature,
            notes
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to approve document');
      }

      const result = await response.json();
      console.log(`✅ Document approved: ${documentType}`);
      return result;
    } catch (error) {
      console.error('Error approving document:', error);
      throw error;
    }
  }

  /**
   * Reject a document (sends back to employee for correction)
   */
  static async rejectDocument(
    employeeId: string,
    documentType: string,
    reason: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/manager/review/employees/${employeeId}/document/${documentType}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            reason
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to reject document');
      }

      console.log(`❌ Document rejected: ${documentType}`);
    } catch (error) {
      console.error('Error rejecting document:', error);
      throw error;
    }
  }

  /**
   * Get current document to review (based on workflow order)
   */
  static getCurrentDocument(status: AllDocumentsStatus): DocumentVerificationStatus | null {
    const pendingDoc = status.documents.find(doc =>
      doc.status === 'pending' || doc.status === 'in_review'
    );
    return pendingDoc || null;
  }

  /**
   * Get next document in workflow
   */
  static getNextDocument(status: AllDocumentsStatus): DocumentVerificationStatus | null {
    const currentDoc = this.getCurrentDocument(status);
    if (!currentDoc) return null;

    const nextDoc = status.documents.find(doc =>
      doc.order === currentDoc.order + 1
    );
    return nextDoc || null;
  }

  /**
   * Check if can review document (previous must be approved)
   */
  static canReviewDocument(status: AllDocumentsStatus, documentType: string): boolean {
    const doc = status.documents.find(d => d.documentType === documentType);
    if (!doc) return false;

    // First document can always be reviewed
    if (doc.order === 1) return true;

    // Check if previous document is approved
    const previousDoc = status.documents.find(d => d.order === doc.order - 1);
    return previousDoc?.status === 'approved';
  }

  /**
   * Calculate completion percentage
   */
  static calculateCompletion(documents: DocumentVerificationStatus[]): number {
    const totalDocs = documents.length;
    const approvedDocs = documents.filter(doc => doc.status === 'approved');

    if (totalDocs === 0) return 0;

    return Math.round((approvedDocs.length / totalDocs) * 100);
  }

  /**
   * Check if all documents are approved
   */
  static areAllDocsApproved(documents: DocumentVerificationStatus[]): boolean {
    return documents.every(doc => doc.status === 'approved');
  }

  /**
   * Get workflow step by document type
   */
  static getWorkflowStep(documentType: string) {
    return DOCUMENT_WORKFLOW.find(step => step.type === documentType);
  }

  /**
   * Get document display name
   */
  static getDocumentName(documentType: string): string {
    const step = this.getWorkflowStep(documentType);
    return step?.name || documentType;
  }

  static async getNewHireSummary(employeeId: string): Promise<any> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/manager/review/employees/${employeeId}/summary`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load new hire summary');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching new hire summary:', error);
      throw error;
    }
  }

  static async approveNewHireSummary(
    employeeId: string,
    summary: any
  ): Promise<any> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/manager/review/employees/${employeeId}/summary/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(summary)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to approve summary');
      }

      return await response.json();
    } catch (error) {
      console.error('Error approving new hire summary:', error);
      throw error;
    }
  }
}

export default DocumentVerificationService;
