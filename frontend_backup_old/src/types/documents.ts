/**
 * Document types and interfaces for the onboarding system
 */

export enum DocumentType {
  I9_FORM = 'i9_form',
  W4_FORM = 'w4_form',
  DIRECT_DEPOSIT = 'direct_deposit',
  INSURANCE_FORM = 'insurance_form',
  COMPANY_POLICIES = 'company_policies',
  BACKGROUND_CHECK = 'background_check',
  DRIVERS_LICENSE = 'drivers_license',
  PASSPORT = 'passport',
  SOCIAL_SECURITY = 'social_security',
  WORK_PERMIT = 'work_permit',
  VOIDED_CHECK = 'voided_check',
  OTHER = 'other'
}

export enum DocumentCategory {
  FEDERAL_FORMS = 'federal_forms',
  IDENTITY_DOCUMENTS = 'identity_documents',
  FINANCIAL_DOCUMENTS = 'financial_documents',
  COMPANY_DOCUMENTS = 'company_documents',
  BACKGROUND_DOCUMENTS = 'background_documents'
}

export interface DocumentMetadata {
  document_id: string
  document_type: DocumentType
  original_filename: string
  stored_filename: string
  file_path: string
  file_size: number
  file_hash: string
  mime_type: string
  employee_id: string
  property_id: string
  uploaded_by: string
  uploaded_at: Date
  encryption_status: 'encrypted' | 'unencrypted'
  verification_status: 'pending' | 'verified' | 'failed'
  retention_date: Date
  metadata: Record<string, any>
  access_log: DocumentAccessLogEntry[]
}

export interface DocumentAccessLogEntry {
  accessed_by: string
  accessed_at: Date
  action: 'view' | 'download' | 'print' | 'email'
  ip_address?: string
  user_agent?: string
  purpose?: string
}

export interface DocumentUploadProgress {
  documentId?: string
  filename: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

export interface DocumentPackage {
  package_id: string
  title: string
  document_ids: string[]
  created_by: string
  created_at: Date
}

// Helper functions for document types
export const getDocumentCategoryName = (category: DocumentCategory): string => {
  const names: Record<DocumentCategory, string> = {
    [DocumentCategory.FEDERAL_FORMS]: 'Federal Forms',
    [DocumentCategory.IDENTITY_DOCUMENTS]: 'Identity Documents',
    [DocumentCategory.FINANCIAL_DOCUMENTS]: 'Financial Documents',
    [DocumentCategory.COMPANY_DOCUMENTS]: 'Company Documents',
    [DocumentCategory.BACKGROUND_DOCUMENTS]: 'Background Documents'
  }
  return names[category] || category
}

export const getDocumentTypeName = (type: DocumentType): string => {
  const names: Record<DocumentType, string> = {
    [DocumentType.I9_FORM]: 'I-9 Form',
    [DocumentType.W4_FORM]: 'W-4 Form',
    [DocumentType.DIRECT_DEPOSIT]: 'Direct Deposit Authorization',
    [DocumentType.INSURANCE_FORM]: 'Insurance Enrollment Form',
    [DocumentType.COMPANY_POLICIES]: 'Company Policy Acknowledgment',
    [DocumentType.BACKGROUND_CHECK]: 'Background Check Authorization',
    [DocumentType.DRIVERS_LICENSE]: "Driver's License",
    [DocumentType.PASSPORT]: 'Passport',
    [DocumentType.SOCIAL_SECURITY]: 'Social Security Card',
    [DocumentType.WORK_PERMIT]: 'Work Permit',
    [DocumentType.VOIDED_CHECK]: 'Voided Check',
    [DocumentType.OTHER]: 'Other Document'
  }
  return names[type] || type
}

export const getDocumentCategory = (type: DocumentType): DocumentCategory => {
  const categoryMap: Record<DocumentType, DocumentCategory> = {
    [DocumentType.I9_FORM]: DocumentCategory.FEDERAL_FORMS,
    [DocumentType.W4_FORM]: DocumentCategory.FEDERAL_FORMS,
    [DocumentType.DIRECT_DEPOSIT]: DocumentCategory.FINANCIAL_DOCUMENTS,
    [DocumentType.INSURANCE_FORM]: DocumentCategory.COMPANY_DOCUMENTS,
    [DocumentType.COMPANY_POLICIES]: DocumentCategory.COMPANY_DOCUMENTS,
    [DocumentType.BACKGROUND_CHECK]: DocumentCategory.BACKGROUND_DOCUMENTS,
    [DocumentType.DRIVERS_LICENSE]: DocumentCategory.IDENTITY_DOCUMENTS,
    [DocumentType.PASSPORT]: DocumentCategory.IDENTITY_DOCUMENTS,
    [DocumentType.SOCIAL_SECURITY]: DocumentCategory.IDENTITY_DOCUMENTS,
    [DocumentType.WORK_PERMIT]: DocumentCategory.IDENTITY_DOCUMENTS,
    [DocumentType.VOIDED_CHECK]: DocumentCategory.FINANCIAL_DOCUMENTS,
    [DocumentType.OTHER]: DocumentCategory.COMPANY_DOCUMENTS
  }
  return categoryMap[type] || DocumentCategory.COMPANY_DOCUMENTS
}

// Document validation helpers
export const isDocumentExpired = (retentionDate: Date): boolean => {
  return new Date() > new Date(retentionDate)
}

export const getDocumentRetentionYears = (type: DocumentType): number => {
  const retentionYears: Record<DocumentType, number> = {
    [DocumentType.I9_FORM]: 3,
    [DocumentType.W4_FORM]: 4,
    [DocumentType.DIRECT_DEPOSIT]: 3,
    [DocumentType.INSURANCE_FORM]: 6,
    [DocumentType.COMPANY_POLICIES]: 7,
    [DocumentType.BACKGROUND_CHECK]: 2,
    [DocumentType.DRIVERS_LICENSE]: 3,
    [DocumentType.PASSPORT]: 3,
    [DocumentType.SOCIAL_SECURITY]: 3,
    [DocumentType.WORK_PERMIT]: 3,
    [DocumentType.VOIDED_CHECK]: 3,
    [DocumentType.OTHER]: 7
  }
  return retentionYears[type] || 7
}