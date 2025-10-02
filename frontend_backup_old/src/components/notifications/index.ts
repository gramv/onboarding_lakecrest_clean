/**
 * Notifications Module Index
 * Centralized exports for all notification components and services
 */

// Core Components
export { NotificationCenter } from './NotificationCenter'
export type { NotificationItem, NotificationPreferences } from './NotificationCenter'

// Templates
export { 
  NOTIFICATION_TEMPLATES,
  createNotificationFromTemplate,
  getTemplatesByCategory,
  getTemplatesByPriority,
  getTemplatesByType,
  validateTemplateVariables,
  getTemplatePreview
} from './NotificationTemplates'
export type { NotificationTemplate } from './NotificationTemplates'

// Service
export { 
  NotificationProvider,
  useNotifications,
  useNotificationActions,
  useNotificationCounts,
  useRecentNotifications
} from './NotificationService'

// Re-export for convenience
export default NotificationCenter