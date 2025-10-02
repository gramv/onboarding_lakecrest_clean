/**
 * Profile Module Index
 * Centralized exports for all profile and settings components
 */

// Profile Components
export { UserProfileDropdown, CompactUserProfile } from './UserProfileDropdown'
export { PreferencesPanel } from './PreferencesPanel'
export { AvatarUpload } from './AvatarUpload'

// Settings Service
export { 
  SettingsProvider,
  useSettings,
  useSettingsSection,
  useThemeSettings,
  useDashboardSettings,
  useNotificationSettings,
  useProfileSettings,
  usePrivacySettings,
  useAccessibilitySettings,
  useLocalizationSettings
} from './SettingsService'
export type { UserSettings } from './SettingsService'

// Re-export for convenience
export default UserProfileDropdown