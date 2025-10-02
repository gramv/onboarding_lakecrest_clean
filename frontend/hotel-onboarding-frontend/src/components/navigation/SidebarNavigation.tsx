/**
 * Enhanced Sidebar Navigation Component
 * Professional collapsible sidebar with mobile adaptation and accessibility
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Home,
  Building2,
  Users,
  FileText,
  BarChart3,
  UserCheck,
  Settings,
  LogOut,
  LucideIcon
} from 'lucide-react'
import { useTheme } from '@/design-system/theme/ThemeProvider'

// ===== TYPES =====

export interface SidebarNavigationItem {
  key: string
  label: string
  path: string
  icon: LucideIcon
  badge?: number | string
  roles: ('hr' | 'manager')[]
  children?: SidebarNavigationItem[]
  ariaLabel?: string
  disabled?: boolean
}

interface SidebarNavigationProps {
  items: SidebarNavigationItem[]
  userRole: 'hr' | 'manager'
  className?: string
  defaultCollapsed?: boolean
  collapsible?: boolean
  showLabels?: boolean
  variant?: 'default' | 'compact' | 'minimal'
  onNavigate?: (item: SidebarNavigationItem) => void
  onCollapseChange?: (collapsed: boolean) => void
  header?: React.ReactNode
  footer?: React.ReactNode
  width?: 'sm' | 'md' | 'lg'
}

// ===== SIDEBAR NAVIGATION COMPONENT =====

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  items,
  userRole,
  className,
  defaultCollapsed = false,
  collapsible = true,
  showLabels = true,
  variant = 'default',
  onNavigate,
  onCollapseChange,
  header,
  footer,
  width = 'md'
}) => {
  const location = useLocation()
  const { isDark } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLAnchorElement | null)[]>([])

  // Filter items based on user role
  const filteredItems = items.filter(item => 
    item.roles.includes(userRole) && !item.disabled
  )

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // Auto-collapse on mobile
      if (mobile && !isCollapsed) {
        setIsCollapsed(true)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [isCollapsed])

  // Handle collapse state changes
  const handleCollapseToggle = useCallback(() => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    onCollapseChange?.(newCollapsed)
  }, [isCollapsed, onCollapseChange])

  // Handle mobile menu toggle
  const handleMobileToggle = useCallback(() => {
    setIsOpen(!isOpen)
  }, [isOpen])

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false)
    setFocusedIndex(-1)
  }, [location.pathname])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen && isMobile) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isMobile])

  // Handle navigation with callback
  const handleNavigate = useCallback((item: SidebarNavigationItem) => {
    onNavigate?.(item)
    if (isMobile) {
      setIsOpen(false)
    }
  }, [onNavigate, isMobile])

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, item: SidebarNavigationItem, index: number) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        handleNavigate(item)
        break
      case 'ArrowDown':
        event.preventDefault()
        const nextIndex = (index + 1) % filteredItems.length
        setFocusedIndex(nextIndex)
        buttonRefs.current[nextIndex]?.focus()
        break
      case 'ArrowUp':
        event.preventDefault()
        const prevIndex = index === 0 ? filteredItems.length - 1 : index - 1
        setFocusedIndex(prevIndex)
        buttonRefs.current[prevIndex]?.focus()
        break
      case 'Home':
        event.preventDefault()
        setFocusedIndex(0)
        buttonRefs.current[0]?.focus()
        break
      case 'End':
        event.preventDefault()
        const lastIndex = filteredItems.length - 1
        setFocusedIndex(lastIndex)
        buttonRefs.current[lastIndex]?.focus()
        break
      case 'Escape':
        if (isMobile && isOpen) {
          event.preventDefault()
          setIsOpen(false)
        }
        break
    }
  }, [filteredItems.length, handleNavigate, isMobile, isOpen])

  // Width classes
  const widthClasses = {
    sm: isCollapsed ? 'w-16' : 'w-48',
    md: isCollapsed ? 'w-16' : 'w-64',
    lg: isCollapsed ? 'w-20' : 'w-80'
  }

  // Variant classes
  const variantClasses = {
    default: 'bg-background border-r border-border',
    compact: 'bg-muted/50 border-r border-border/50',
    minimal: 'bg-transparent'
  }

  // Mobile overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMobileToggle}
          className="fixed top-4 left-4 z-50 md:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-sidebar"
          aria-label={`${isOpen ? 'Close' : 'Open'} navigation menu`}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Mobile overlay */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile sidebar */}
        <aside
          ref={sidebarRef}
          id="mobile-sidebar"
          className={cn(
            "fixed left-0 top-0 h-full w-64 z-50 md:hidden",
            "transform transition-transform duration-300 ease-in-out",
            variantClasses[variant],
            isOpen ? "translate-x-0" : "-translate-x-full",
            className
          )}
          aria-hidden={!isOpen}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            {header && (
              <div className="p-4 border-b border-border">
                {header}
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2" role="navigation" aria-label="Main navigation">
              {filteredItems.map((item, index) => (
                <SidebarNavigationItem
                  key={item.key}
                  ref={(el) => (buttonRefs.current[index] = el)}
                  item={item}
                  isActive={location.pathname === item.path}
                  isCollapsed={false}
                  showLabels={true}
                  variant={variant}
                  onNavigate={() => handleNavigate(item)}
                  onKeyDown={(e) => handleKeyDown(e, item, index)}
                  onFocus={() => setFocusedIndex(index)}
                />
              ))}
            </nav>

            {/* Footer */}
            {footer && (
              <div className="p-4 border-t border-border">
                {footer}
              </div>
            )}
          </div>
        </aside>
      </>
    )
  }

  // Desktop sidebar
  return (
    <aside
      ref={sidebarRef}
      className={cn(
        "relative h-full transition-all duration-300 ease-in-out",
        widthClasses[width],
        variantClasses[variant],
        className
      )}
      aria-label="Main navigation"
    >
      <div className="flex flex-col h-full">
        {/* Collapse toggle button */}
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapseToggle}
            className={cn(
              "absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-background shadow-md",
              "hover:bg-muted focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* Header */}
        {header && (
          <div className={cn(
            "p-4 border-b border-border",
            isCollapsed && "px-2"
          )}>
            {header}
          </div>
        )}

        {/* Navigation */}
        <nav 
          className={cn(
            "flex-1 p-4 space-y-2",
            isCollapsed && "px-2"
          )} 
          role="navigation" 
          aria-label="Main navigation"
        >
          <TooltipProvider>
            {filteredItems.map((item, index) => (
              <SidebarNavigationItem
                key={item.key}
                ref={(el) => (buttonRefs.current[index] = el)}
                item={item}
                isActive={location.pathname === item.path}
                isCollapsed={isCollapsed}
                showLabels={showLabels && !isCollapsed}
                variant={variant}
                onNavigate={() => handleNavigate(item)}
                onKeyDown={(e) => handleKeyDown(e, item, index)}
                onFocus={() => setFocusedIndex(index)}
              />
            ))}
          </TooltipProvider>
        </nav>

        {/* Footer */}
        {footer && (
          <div className={cn(
            "p-4 border-t border-border",
            isCollapsed && "px-2"
          )}>
            {footer}
          </div>
        )}
      </div>
    </aside>
  )
}

// ===== SIDEBAR NAVIGATION ITEM COMPONENT =====

interface SidebarNavigationItemProps {
  item: SidebarNavigationItem
  isActive: boolean
  isCollapsed: boolean
  showLabels: boolean
  variant: 'default' | 'compact' | 'minimal'
  onNavigate: () => void
  onKeyDown: (event: React.KeyboardEvent) => void
  onFocus: () => void
}

const SidebarNavigationItem = React.forwardRef<HTMLAnchorElement, SidebarNavigationItemProps>(
  ({ item, isActive, isCollapsed, showLabels, variant, onNavigate, onKeyDown, onFocus }, ref) => {
    const Icon = item.icon

    const itemContent = (
      <Link
        ref={ref}
        to={item.path}
        onClick={onNavigate}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "hover:scale-[1.02] active:scale-[0.98]",
          isCollapsed ? "justify-center p-2" : "px-3 py-2",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
          variant === 'compact' && "text-xs",
          variant === 'minimal' && "hover:bg-muted/50"
        )}
        aria-label={item.ariaLabel || `Navigate to ${item.label}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className={cn(
          "flex-shrink-0",
          variant === 'compact' ? "h-3.5 w-3.5" : "h-4 w-4"
        )} />
        
        {showLabels && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <Badge 
                variant={isActive ? "secondary" : "outline"} 
                className="text-xs ml-auto"
                aria-label={`${item.badge} items`}
              >
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </Link>
    )

    // Wrap with tooltip when collapsed
    if (isCollapsed && !showLabels) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {itemContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.badge && (
              <Badge variant="outline" className="text-xs">
                {item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      )
    }

    return itemContent
  }
)

SidebarNavigationItem.displayName = 'SidebarNavigationItem'

// ===== PREDEFINED NAVIGATION ITEMS =====

export const HR_SIDEBAR_ITEMS: SidebarNavigationItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/hr',
    icon: Home,
    roles: ['hr'],
    ariaLabel: 'Go to HR dashboard overview'
  },
  {
    key: 'properties',
    label: 'Properties',
    path: '/hr/properties',
    icon: Building2,
    roles: ['hr'],
    ariaLabel: 'Manage hotel properties and locations'
  },
  {
    key: 'managers',
    label: 'Managers',
    path: '/hr/managers',
    icon: UserCheck,
    roles: ['hr'],
    ariaLabel: 'Manage property managers and assignments'
  },
  {
    key: 'employees',
    label: 'Employees',
    path: '/hr/employees',
    icon: Users,
    roles: ['hr'],
    ariaLabel: 'View and manage all employees'
  },
  {
    key: 'applications',
    label: 'Applications',
    path: '/hr/applications',
    icon: FileText,
    roles: ['hr'],
    ariaLabel: 'Review job applications and hiring decisions'
  },
  {
    key: 'analytics',
    label: 'Analytics',
    path: '/hr/analytics',
    icon: BarChart3,
    roles: ['hr'],
    ariaLabel: 'View system analytics and reports'
  }
]

export const MANAGER_SIDEBAR_ITEMS: SidebarNavigationItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/manager',
    icon: Home,
    roles: ['manager'],
    ariaLabel: 'Go to manager dashboard overview'
  },
  {
    key: 'applications',
    label: 'Applications',
    path: '/manager/applications',
    icon: FileText,
    roles: ['manager'],
    ariaLabel: 'Review applications for your property'
  },
  {
    key: 'employees',
    label: 'Employees',
    path: '/manager/employees',
    icon: Users,
    roles: ['manager'],
    ariaLabel: 'Manage employees at your property'
  },
  {
    key: 'analytics',
    label: 'Analytics',
    path: '/manager/analytics',
    icon: BarChart3,
    roles: ['manager'],
    ariaLabel: 'View analytics for your property'
  }
]

// ===== EXPORTS =====

export default SidebarNavigation