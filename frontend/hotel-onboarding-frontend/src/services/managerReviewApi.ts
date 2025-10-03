/**
 * Manager Review API Service
 * Handles API calls for manager review workflow
 */

import { apiClient } from './api'

export interface PendingReviewEmployee {
  id: string
  first_name: string
  last_name: string
  email: string
  position: string
  property_id: string
  property_name: string
  manager_id: string
  start_date: string
  onboarding_completed_at: string
  manager_review_status: 'pending_review' | 'manager_reviewing' | 'approved' | 'changes_requested' | 'rejected'
  i9_section2_status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  i9_section2_deadline: string
  days_until_i9_deadline: number
  i9_urgency_level: 'normal' | 'warning' | 'urgent' | 'overdue' | 'no_deadline'
}

export interface EmployeeDocument {
  id: string
  type: string
  name: string
  signed_at: string
  pdf_url: string
  status: string
  metadata?: Record<string, any>
}

export interface EmployeeDocumentsResponse {
  employee: {
    id: string
    name: string
    position: string
    property_id: string
    onboarding_status: string
  }
  documents: EmployeeDocument[]
  i9_section2_required: boolean
  i9_section2_deadline: string
  i9_section2_status: string
}

export interface ReviewActionRequest {
  comments?: string
  metadata?: Record<string, any>
}

export interface ReviewNotesRequest {
  document_type?: string
  comments: string
  metadata?: Record<string, any>
}

export interface ApproveReviewRequest {
  comments?: string
}

export const managerReviewApi = {
  /**
   * Get list of employees pending manager review
   */
  async getPendingReviews(): Promise<{ data: PendingReviewEmployee[]; count: number }> {
    const response = await apiClient.get('/manager/pending-reviews')
    return response.data
  },

  /**
   * Get all documents for an employee
   */
  async getEmployeeDocuments(employeeId: string): Promise<EmployeeDocumentsResponse> {
    const response = await apiClient.get(`/manager/employees/${employeeId}/documents`)
    console.log('📄 getEmployeeDocuments response:', response)
    console.log('📄 response.data:', response.data)
    console.log('📄 response.data.data:', response.data?.data)

    // The axios interceptor unwraps { data: {...} } responses
    // So response.data might already be the employee data object
    const data = response.data?.data || response.data
    console.log('📄 Final data:', data)
    return data
  },

  /**
   * Start reviewing an employee's onboarding
   */
  async startReview(employeeId: string, data: ReviewActionRequest): Promise<void> {
    await apiClient.post(`/manager/employees/${employeeId}/start-review`, data)
  },

  /**
   * Add review notes for an employee or document
   */
  async addReviewNotes(employeeId: string, data: ReviewNotesRequest): Promise<void> {
    await apiClient.post(`/manager/employees/${employeeId}/review-notes`, data)
  },

  /**
   * Approve employee onboarding after review
   */
  async approveReview(employeeId: string, data: ApproveReviewRequest): Promise<void> {
    await apiClient.post(`/manager/employees/${employeeId}/approve-review`, data)
  },

  /**
   * Complete I-9 Section 2 for an employee
   */
  async completeI9Section2(employeeId: string, data: any): Promise<void> {
    await apiClient.post(`/manager/employees/${employeeId}/i9-section2`, data)
  },
}

