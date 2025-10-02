/**
 * Navigation Components Index
 * Centralized exports for all navigation components
 */

// Core Navigation Components
export { SidebarNavigation, HR_SIDEBAR_ITEMS, MANAGER_SIDEBAR_ITEMS } from './SidebarNavigation'
export type { SidebarNavigationItem } from './SidebarNavigation'

export { TopNavigation } from './TopNavigation'
export type { QuickAction, NotificationItem } from './TopNavigation'

export { BreadcrumbNavigation, createBreadcrumbItems, getBreadcrumbsForRoute } from './BreadcrumbNavigation'
export type { BreadcrumbItem } from './BreadcrumbNavigation'

export { MobileNavigation } from './MobileNavigation'
export type { MobileNavigationItem } from './MobileNavigation'

// Legacy exports for backward compatibility
export { DashboardNavigation, HR_NAVIGATION_ITEMS, MANAGER_NAVIGATION_ITEMS } from '../ui/dashboard-navigation'
export type { NavigationItem } from '../ui/dashboard-navigation'

export { Breadcrumb, DashboardBreadcrumb } from '../ui/breadcrumb'
export type { BreadcrumbItem as LegacyBreadcrumbItem } from '../ui/breadcrumb'