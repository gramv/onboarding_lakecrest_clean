/**
 * Document Service for handling file uploads and downloads
 * Provides secure document management with legal compliance
 */

import { getApiUrl } from '@/config/api'
import { DocumentType } from '@/types/documents'

export interface DocumentMetadata {
  document_id: string
  document_type: string
  file_size: number
  uploaded_at: string
  retention_date: string
  verification_status: string
  original_filename?: string
  mime_type?: string
}

export interface DocumentUploadParams {
  file: File
  documentType: DocumentType | string
  employeeId: string
  propertyId: string
  metadata?: Record<string, any>
}

export interface DocumentDownloadParams {
  documentId: string
  includeeCoverSheet?: boolean
}

export interface DocumentPackageParams {
  documentIds: string[]
  packageTitle: string
}

class DocumentService {
  private baseUrl: string
  private authToken: string | null = null

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  setAuthToken(token: string) {
    this.authToken = token
  }

  /**
   * Upload a document with encryption and compliance metadata
   */
  async uploadDocument(params: DocumentUploadParams): Promise<DocumentMetadata> {
    const formData = new FormData()
    formData.append('file', params.file)
    formData.append('document_type', params.documentType)
    formData.append('employee_id', params.employeeId)
    formData.append('property_id', params.propertyId)
    
    if (params.metadata) {
      formData.append('metadata', JSON.stringify(params.metadata))
    }

    // Temporarily use test endpoint that doesn't require auth
    const response = await fetch(`${this.baseUrl}/test/documents/upload`, {
      method: 'POST',
      body: formData
      // headers: this.getAuthHeaders() // Disabled for testing
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to upload document')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Download a document with legal cover sheet
   */
  async downloadDocument(params: DocumentDownloadParams): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/documents/${params.documentId}/download`,
      {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          include_cover_sheet: params.includeeCoverSheet ?? true
        })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to download document')
    }

    return response.blob()
  }

  /**
   * View a document without downloading
   */
  async viewDocument(documentId: string): Promise<{
    content: string
    mimeType: string
    metadata: DocumentMetadata
  }> {
    const response = await fetch(
      `${this.baseUrl}/documents/${documentId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to view document')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Get all documents for an employee
   */
  async getEmployeeDocuments(
    employeeId: string,
    documentType?: string
  ): Promise<DocumentMetadata[]> {
    const params = new URLSearchParams()
    if (documentType) {
      params.append('document_type', documentType)
    }

    const response = await fetch(
      `${this.baseUrl}/documents/employee/${employeeId}?${params}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get employee documents')
    }

    const result = await response.json()
    return result.data.documents
  }

  /**
   * Create a legal document package
   */
  async createDocumentPackage(params: DocumentPackageParams): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/documents/package`,
      {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_ids: params.documentIds,
          package_title: params.packageTitle
        })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create document package')
    }

    return response.blob()
  }

  /**
   * Verify document integrity
   */
  async verifyDocument(documentId: string): Promise<{
    integrity_valid: boolean
    verified_at: string
    verified_by: string
  }> {
    const response = await fetch(
      `${this.baseUrl}/documents/${documentId}/verify`,
      {
        method: 'POST',
        headers: this.getAuthHeaders()
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to verify document')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Generate a preview URL for a document
   */
  getDocumentPreviewUrl(documentId: string): string {
    return `${this.baseUrl}/documents/${documentId}/preview`
  }

  /**
   * Helper to download and save a file
   */
  async downloadAndSaveFile(
    documentId: string,
    filename?: string
  ): Promise<void> {
    const blob = await this.downloadDocument({ documentId })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `document_${documentId}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' }
    }

    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: 'File type not allowed. Please upload PDF, JPG, PNG, TIFF, or Word documents.' 
      }
    }

    return { valid: true }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {}
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }
    return headers
  }
}

// Export singleton instance
export const documentService = new DocumentService(
  getApiUrl()
)

// Export types
export type { DocumentService }

export interface StepDocumentMetadata {
  bucket: string
  path: string
  filename?: string
  version?: string
  signed_url?: string
  signed_url_expires_at?: string
  generated_at?: string
  checksum?: string | null
  [key: string]: unknown
}

export interface StepDocumentResponse {
  document_metadata: StepDocumentMetadata | null
  has_document: boolean
}

export async function fetchStepDocumentMetadata(
  employeeId: string,
  stepId: string,
  token: string,
  options: { forceRefresh?: boolean } = {}
): Promise<StepDocumentResponse> {
  if (!employeeId || !stepId || !token) {
    return { document_metadata: null, has_document: false }
  }

  const params = new URLSearchParams({ token })
  if (options.forceRefresh) {
    params.set('force_refresh', 'true')
  }

  const response = await fetch(
    `${getApiUrl()}/onboarding/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(stepId)}?${params.toString()}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to retrieve document metadata (${response.status})`)
  }

  const payload = await response.json()
  const data = payload?.data ?? {}

  return {
    document_metadata: data.document_metadata ?? null,
    has_document: Boolean(data.has_document)
  }
}

export async function persistStepDocument(
  employeeId: string,
  stepId: string,
  payload: Record<string, unknown>,
  options: { token?: string } = {}
): Promise<{ success: boolean; document_metadata?: StepDocumentMetadata | null }> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const response = await fetch(
    `${getApiUrl()}/onboarding/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(stepId)}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Failed to store document metadata (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return {
    success: Boolean(data?.success ?? true),
    document_metadata: data?.data?.document_metadata ?? null
  }
}

export async function listStepDocuments(
  employeeId: string,
  stepId: string,
  token: string
): Promise<Array<StepDocumentMetadata & { id?: string }>> {
  const params = new URLSearchParams({ token })
  const response = await fetch(
    `${getApiUrl()}/onboarding/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(stepId)}/list?${params.toString()}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to list step documents (${response.status})`)
  }

  const payload = await response.json()
  return payload?.data?.documents ?? []
}
