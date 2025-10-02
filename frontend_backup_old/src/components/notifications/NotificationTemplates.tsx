/**
 * Notification Templates
 * Pre-built templates for different event types and priority levels
 */

import React from 'react'
import { NotificationItem } from './NotificationCenter'

// ===== TEMPLATE TYPES =====

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationItem['type']
  category: NotificationItem['category']
  priority: NotificationItem['priority']
  titleTemplate: string
  messageTemplate: string
  actionLabel?: string
  actionUrlTemplate?: string
  expiresInHours?: number
  variables: string[]
}

// ===== NOTIFICATION TEMPLATES =====

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // Application Templates
  NEW_APPLICATION: {
    id: 'new_application',
    name: 'New Job Application',
    type: 'info',
    category: 'application',
    priority: 'medium',
    titleTemplate: 'New application for {{positionTitle}}',
    messageTemplate: '{{applicantName}} has submitted an application for {{positionTitle}} at {{propertyName}}.',
    actionLabel: 'Review Application',
    actionUrlTemplate: '/manager/applications/{{applicationId}}',
    expiresInHours: 72,
    variables: ['positionTitle', 'applicantName', 'propertyName', 'applicationId']
  },

  APPLICATION_APPROVED: {
    id: 'application_approved',
    name: 'Application Approved',
    type: 'success',
    category: 'application',
    priority: 'high',
    titleTemplate: 'Application approved for {{positionTitle}}',
    messageTemplate: '{{applicantName}}\'s application for {{positionTitle}} has been approved by {{managerName}}.',
    actionLabel: 'Start Onboarding',
    actionUrlTemplate: '/hr/employees/{{applicationId}}/onboard',
    expiresInHours: 48,
    variables: ['positionTitle', 'applicantName', 'managerName', 'applicationId']
  },

  APPLICATION_REJECTED: {
    id: 'application_rejected',
    name: 'Application Rejected',
    type: 'warning',
    category: 'application',
    priority: 'medium',
    titleTemplate: 'Application rejected for {{positionTitle}}',
    messageTemplate: '{{applicantName}}\'s application for {{positionTitle}} has been rejected. Candidate moved to talent pool.',
    actionLabel: 'View Talent Pool',
    actionUrlTemplate: '/hr/talent-pool',
    expiresInHours: 24,
    variables: ['positionTitle', 'applicantName']
  },

  APPLICATION_PENDING_REVIEW: {
    id: 'application_pending_review',
    name: 'Application Pending Review',
    type: 'warning',
    category: 'application',
    priority: 'high',
    titleTemplate: 'Application pending review - {{daysOld}} days old',
    messageTemplate: '{{applicantName}}\'s application for {{positionTitle}} has been pending review for {{daysOld}} days.',
    actionLabel: 'Review Now',
    actionUrlTemplate: '/manager/applications/{{applicationId}}',
    expiresInHours: 12,
    variables: ['daysOld', 'applicantName', 'positionTitle', 'applicationId']
  },

  // Employee Templates
  EMPLOYEE_ONBOARDING_STARTED: {
    id: 'employee_onboarding_started',
    name: 'Employee Onboarding Started',
    type: 'info',
    category: 'employee',
    priority: 'medium',
    titleTemplate: 'Onboarding started for {{employeeName}}',
    messageTemplate: '{{employeeName}} has started the onboarding process for {{positionTitle}} at {{propertyName}}.',
    actionLabel: 'Track Progress',
    actionUrlTemplate: '/hr/employees/{{employeeId}}/onboarding',
    expiresInHours: 48,
    variables: ['employeeName', 'positionTitle', 'propertyName', 'employeeId']
  },

  EMPLOYEE_ONBOARDING_COMPLETED: {
    id: 'employee_onboarding_completed',
    name: 'Employee Onboarding Completed',
    type: 'success',
    category: 'employee',
    priority: 'medium',
    titleTemplate: 'Onboarding completed for {{employeeName}}',
    messageTemplate: '{{employeeName}} has successfully completed onboarding and is ready to start work.',
    actionLabel: 'View Employee',
    actionUrlTemplate: '/hr/employees/{{employeeId}}',
    expiresInHours: 24,
    variables: ['employeeName', 'employeeId']
  },

  EMPLOYEE_DOCUMENT_MISSING: {
    id: 'employee_document_missing',
    name: 'Missing Employee Document',
    type: 'warning',
    category: 'employee',
    priority: 'high',
    titleTemplate: 'Missing {{documentType}} for {{employeeName}}',
    messageTemplate: '{{employeeName}} is missing required {{documentType}} document. Onboarding cannot proceed.',
    actionLabel: 'Contact Employee',
    actionUrlTemplate: '/hr/employees/{{employeeId}}/documents',
    expiresInHours: 24,
    variables: ['documentType', 'employeeName', 'employeeId']
  },

  EMPLOYEE_FIRST_DAY_REMINDER: {
    id: 'employee_first_day_reminder',
    name: 'Employee First Day Reminder',
    type: 'info',
    category: 'reminder',
    priority: 'high',
    titleTemplate: '{{employeeName}} starts tomorrow',
    messageTemplate: '{{employeeName}} is scheduled to start work tomorrow at {{propertyName}}. Ensure everything is prepared.',
    actionLabel: 'View Checklist',
    actionUrlTemplate: '/manager/employees/{{employeeId}}/first-day',
    expiresInHours: 8,
    variables: ['employeeName', 'propertyName', 'employeeId']
  },

  // Property Templates
  PROPERTY_MANAGER_ASSIGNED: {
    id: 'property_manager_assigned',
    name: 'Property Manager Assigned',
    type: 'success',
    category: 'property',
    priority: 'medium',
    titleTemplate: 'Manager assigned to {{propertyName}}',
    messageTemplate: '{{managerName}} has been assigned as manager for {{propertyName}}.',
    actionLabel: 'View Property',
    actionUrlTemplate: '/hr/properties/{{propertyId}}',
    expiresInHours: 24,
    variables: ['propertyName', 'managerName', 'propertyId']
  },

  PROPERTY_STAFFING_LOW: {
    id: 'property_staffing_low',
    name: 'Low Staffing Alert',
    type: 'warning',
    category: 'property',
    priority: 'high',
    titleTemplate: 'Low staffing at {{propertyName}}',
    messageTemplate: '{{propertyName}} is currently {{percentStaffed}}% staffed ({{currentStaff}}/{{requiredStaff}} positions filled).',
    actionLabel: 'View Openings',
    actionUrlTemplate: '/hr/properties/{{propertyId}}/openings',
    expiresInHours: 12,
    variables: ['propertyName', 'percentStaffed', 'currentStaff', 'requiredStaff', 'propertyId']
  },

  PROPERTY_QR_CODE_GENERATED: {
    id: 'property_qr_code_generated',
    name: 'QR Code Generated',
    type: 'success',
    category: 'property',
    priority: 'low',
    titleTemplate: 'QR code generated for {{propertyName}}',
    messageTemplate: 'A new QR code has been generated for job applications at {{propertyName}}.',
    actionLabel: 'Download QR Code',
    actionUrlTemplate: '/hr/properties/{{propertyId}}/qr-code',
    expiresInHours: 48,
    variables: ['propertyName', 'propertyId']
  },

  // System Templates
  SYSTEM_MAINTENANCE_SCHEDULED: {
    id: 'system_maintenance_scheduled',
    name: 'Scheduled Maintenance',
    type: 'warning',
    category: 'system',
    priority: 'medium',
    titleTemplate: 'System maintenance scheduled',
    messageTemplate: 'System maintenance is scheduled for {{maintenanceDate}} from {{startTime}} to {{endTime}}. Limited functionality expected.',
    expiresInHours: 2,
    variables: ['maintenanceDate', 'startTime', 'endTime']
  },

  SYSTEM_BACKUP_COMPLETED: {
    id: 'system_backup_completed',
    name: 'Backup Completed',
    type: 'success',
    category: 'system',
    priority: 'low',
    titleTemplate: 'System backup completed',
    messageTemplate: 'Daily system backup completed successfully at {{backupTime}}.',
    expiresInHours: 24,
    variables: ['backupTime']
  },

  SYSTEM_ERROR_DETECTED: {
    id: 'system_error_detected',
    name: 'System Error Detected',
    type: 'error',
    category: 'system',
    priority: 'urgent',
    titleTemplate: 'System error detected',
    messageTemplate: 'A system error has been detected: {{errorMessage}}. Technical team has been notified.',
    actionLabel: 'View Details',
    actionUrlTemplate: '/admin/system/errors/{{errorId}}',
    expiresInHours: 1,
    variables: ['errorMessage', 'errorId']
  },

  // Reminder Templates
  DOCUMENT_EXPIRY_WARNING: {
    id: 'document_expiry_warning',
    name: 'Document Expiry Warning',
    type: 'warning',
    category: 'reminder',
    priority: 'high',
    titleTemplate: '{{documentType}} expires in {{daysUntilExpiry}} days',
    messageTemplate: '{{employeeName}}\'s {{documentType}} will expire on {{expiryDate}}. Please ensure renewal.',
    actionLabel: 'Update Document',
    actionUrlTemplate: '/hr/employees/{{employeeId}}/documents',
    expiresInHours: 24,
    variables: ['documentType', 'daysUntilExpiry', 'employeeName', 'expiryDate', 'employeeId']
  },

  PERFORMANCE_REVIEW_DUE: {
    id: 'performance_review_due',
    name: 'Performance Review Due',
    type: 'info',
    category: 'reminder',
    priority: 'medium',
    titleTemplate: 'Performance review due for {{employeeName}}',
    messageTemplate: '{{employeeName}}\'s performance review is due on {{reviewDate}}.',
    actionLabel: 'Schedule Review',
    actionUrlTemplate: '/manager/employees/{{employeeId}}/review',
    expiresInHours: 48,
    variables: ['employeeName', 'reviewDate', 'employeeId']
  },

  TRAINING_COMPLETION_REMINDER: {
    id: 'training_completion_reminder',
    name: 'Training Completion Reminder',
    type: 'warning',
    category: 'reminder',
    priority: 'medium',
    titleTemplate: 'Training overdue for {{employeeName}}',
    messageTemplate: '{{employeeName}} has not completed required {{trainingName}} training. Due date was {{dueDate}}.',
    actionLabel: 'Contact Employee',
    actionUrlTemplate: '/manager/employees/{{employeeId}}/training',
    expiresInHours: 24,
    variables: ['employeeName', 'trainingName', 'dueDate', 'employeeId']
  }
}

// ===== TEMPLATE FUNCTIONS =====

/**
 * Create a notification from a template
 */
export function createNotificationFromTemplate(
  templateId: string,
  variables: Record<string, string | number>,
  overrides?: Partial<NotificationItem>
): Omit<NotificationItem, 'id' | 'timestamp' | 'read' | 'archived'> {
  const template = NOTIFICATION_TEMPLATES[templateId]
  
  if (!template) {
    throw new Error(`Template with id "${templateId}" not found`)
  }

  // Replace variables in title and message
  const title = replaceVariables(template.titleTemplate, variables)
  const message = replaceVariables(template.messageTemplate, variables)
  const actionUrl = template.actionUrlTemplate 
    ? replaceVariables(template.actionUrlTemplate, variables)
    : undefined

  // Calculate expiry date
  const expiresAt = template.expiresInHours
    ? new Date(Date.now() + template.expiresInHours * 60 * 60 * 1000)
    : undefined

  return {
    type: template.type,
    category: template.category,
    priority: template.priority,
    title,
    message,
    actionUrl,
    actionLabel: template.actionLabel,
    expiresAt,
    metadata: variables,
    ...overrides
  }
}

/**
 * Replace variables in a template string
 */
function replaceVariables(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key]
    return value !== undefined ? String(value) : match
  })
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: NotificationItem['category']): NotificationTemplate[] {
  return Object.values(NOTIFICATION_TEMPLATES).filter(template => template.category === category)
}

/**
 * Get templates by priority
 */
export function getTemplatesByPriority(priority: NotificationItem['priority']): NotificationTemplate[] {
  return Object.values(NOTIFICATION_TEMPLATES).filter(template => template.priority === priority)
}

/**
 * Get templates by type
 */
export function getTemplatesByType(type: NotificationItem['type']): NotificationTemplate[] {
  return Object.values(NOTIFICATION_TEMPLATES).filter(template => template.type === type)
}

/**
 * Validate template variables
 */
export function validateTemplateVariables(templateId: string, variables: Record<string, any>): {
  valid: boolean
  missing: string[]
  extra: string[]
} {
  const template = NOTIFICATION_TEMPLATES[templateId]
  
  if (!template) {
    return { valid: false, missing: [], extra: [] }
  }

  const providedKeys = Object.keys(variables)
  const requiredKeys = template.variables
  
  const missing = requiredKeys.filter(key => !providedKeys.includes(key))
  const extra = providedKeys.filter(key => !requiredKeys.includes(key))
  
  return {
    valid: missing.length === 0,
    missing,
    extra
  }
}

/**
 * Get template preview with sample data
 */
export function getTemplatePreview(templateId: string): {
  template: NotificationTemplate
  preview: {
    title: string
    message: string
    actionUrl?: string
  }
} {
  const template = NOTIFICATION_TEMPLATES[templateId]
  
  if (!template) {
    throw new Error(`Template with id "${templateId}" not found`)
  }

  // Sample data for preview
  const sampleData: Record<string, string> = {
    positionTitle: 'Front Desk Associate',
    applicantName: 'John Smith',
    propertyName: 'Grand Hotel Downtown',
    managerName: 'Sarah Johnson',
    employeeName: 'Jane Doe',
    documentType: 'Work Authorization',
    daysOld: '3',
    daysUntilExpiry: '30',
    percentStaffed: '75',
    currentStaff: '15',
    requiredStaff: '20',
    maintenanceDate: 'March 15, 2024',
    startTime: '2:00 AM',
    endTime: '6:00 AM',
    backupTime: '3:00 AM',
    errorMessage: 'Database connection timeout',
    expiryDate: 'April 15, 2024',
    reviewDate: 'March 20, 2024',
    trainingName: 'Food Safety Certification',
    dueDate: 'March 10, 2024',
    applicationId: '12345',
    employeeId: '67890',
    propertyId: '54321',
    errorId: '98765'
  }

  const title = replaceVariables(template.titleTemplate, sampleData)
  const message = replaceVariables(template.messageTemplate, sampleData)
  const actionUrl = template.actionUrlTemplate 
    ? replaceVariables(template.actionUrlTemplate, sampleData)
    : undefined

  return {
    template,
    preview: {
      title,
      message,
      actionUrl
    }
  }
}

// ===== EXPORTS =====

export default NOTIFICATION_TEMPLATES