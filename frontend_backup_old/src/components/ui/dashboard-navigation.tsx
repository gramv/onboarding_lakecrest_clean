
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Users, 
  FileText, 
  BarChart3, 
  UserCheck,
  Menu,
  X,
  LucideIcon,
  ChevronDown
} from 'lucide-react'

export interface NavigationItem {
  key: string
  label: string
  path: string
  icon: LucideIcon
  roles: ('hr' | 'manager')[]
  badge?: number | string
  ariaLabel?: string
}

interface DashboardNavigationProps {
  items: NavigationItem[]
  userRole: 'hr' | 'manager'
  className?: string
  variant?: 'tabs' | 'sidebar' | 'mobile' | 'dropdown'
  onNavigate?: (item: NavigationItem) => void
  showLabels?: boolean
  compact?: boolean
  orientation?: 'horizontal' | 'vertical'
}

export function DashboardNavigation({ 
  items, 
  userRole, 
  className,
  variant = 'tabs',
  onNavigate,
  showLabels = true,
  compact = false,
  orientation = 'horizontal'
}: DashboardNavigationProps) {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLAnchorElement | null)[]>([])
  
  // Filter items based on user role
  const filteredItems = items.filter(item => item.roles.includes(userRole))
  
  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setFocusedIndex(-1)
  }, [location.pathname])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobileMenuOpen])

  // Handle navigation with callback
  const handleNavigate = useCallback((item: NavigationItem) => {
    onNavigate?.(item)
    setIsMobileMenuOpen(false)
    setFocusedIndex(-1)
  }, [onNavigate])

  // Enhanced keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, item: NavigationItem, index: number) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        handleNavigate(item)
        break
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        const nextIndex = (index + 1) % filteredItems.length
        setFocusedIndex(nextIndex)
        buttonRefs.current[nextIndex]?.focus()
        break
      case 'ArrowUp':
      case 'ArrowLeft':
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
        if (isMobileMenuOpen) {
          event.preventDefault()
          setIsMobileMenuOpen(false)
          setFocusedIndex(-1)
        }
        break
    }
  }, [filteredItems.length, handleNavigate, isMobileMenuOpen])

  // Handle mobile menu toggle
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev)
    if (!isMobileMenuOpen) {
      // Focus first item when opening
      setTimeout(() => {
        buttonRefs.current[0]?.focus()
        setFocusedIndex(0)
      }, 100)
    }
  }, [isMobileMenuOpen])

  // Mobile variant with hamburger menu
  if (variant === 'mobile' || (isMobile && variant === 'tabs')) {
    return (
      <div className={cn("relative", className)} ref={menuRef}>
        {/* Mobile menu button */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMobileMenu}
          className="md:hidden flex items-center gap-2"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation-menu"
          aria-label={`${isMobileMenuOpen ? 'Close' : 'Open'} navigation menu`}
          aria-haspopup="true"
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
          <span>Menu</span>
          <ChevronDown className={cn(
            "h-3 w-3 transition-transform duration-200",
            isMobileMenuOpen && "rotate-180"
          )} />
        </Button>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile navigation menu */}
        <nav
          id="mobile-navigation-menu"
          className={cn(
            "absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 md:hidden",
            "transform transition-all duration-200 ease-in-out",
            isMobileMenuOpen 
              ? "opacity-100 scale-100 translate-y-0" 
              : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
          )}
          role="navigation"
          aria-label="Dashboard navigation"
          aria-hidden={!isMobileMenuOpen}
        >
          <div className="p-2 space-y-1" role="menu">
            {filteredItems.map((item, index) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.key}
                  ref={(el) => (buttonRefs.current[index] = el)}
                  to={item.path}
                  onClick={() => handleNavigate(item)}
                  onKeyDown={(e) => handleKeyDown(e, item, index)}
                  onFocus={() => setFocusedIndex(index)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  role="menuitem"
                  tabIndex={isMobileMenuOpen ? 0 : -1}
                  aria-label={item.ariaLabel || `Navigate to ${item.label}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {showLabels && <span className="flex-1">{item.label}</span>}
                  {item.badge && (
                    <Badge 
                      variant={isActive ? "secondary" : "outline"} 
                      className="text-xs ml-auto"
                      aria-label={`${item.badge} items`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Desktop fallback - show current section */}
        <div className="hidden md:block">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            if (!isActive) return null
            
            return (
              <div key={item.key} className="flex items-center gap-2 text-sm font-medium">
                <Icon className="h-4 w-4" />
                {showLabels && <span>{item.label}</span>}
                {item.badge && (
                  <Badge variant="default" className="text-xs ml-2">
                    {item.badge}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Sidebar variant
  if (variant === 'sidebar') {
    return (
      <nav 
        className={cn(
          "flex space-y-1",
          orientation === 'vertical' ? "flex-col" : "flex-row space-y-0 space-x-1",
          compact && "space-y-0.5",
          className
        )}
        role="navigation"
        aria-label="Dashboard navigation"
        aria-orientation={orientation}
      >
        {filteredItems.map((item, index) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.key}
              ref={(el) => (buttonRefs.current[index] = el)}
              to={item.path}
              onClick={() => handleNavigate(item)}
              onKeyDown={(e) => handleKeyDown(e, item, index)}
              onFocus={() => setFocusedIndex(index)}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "hover:scale-[1.02] active:scale-[0.98]",
                compact ? "px-2 py-1.5" : "px-3 py-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              aria-label={item.ariaLabel || `Navigate to ${item.label}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn(
                "flex-shrink-0",
                compact ? "h-3.5 w-3.5" : "h-4 w-4"
              )} />
              {showLabels && (
                <span className={cn(
                  "flex-1 truncate",
                  compact && "text-xs"
                )}>{item.label}</span>
              )}
              {item.badge && (
                <Badge 
                  variant={isActive ? "secondary" : "outline"} 
                  className={cn(
                    "ml-auto",
                    compact ? "text-xs px-1.5 py-0.5" : "text-xs"
                  )}
                  aria-label={`${item.badge} items`}
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>
    )
  }

  // Default tabs variant - responsive
  return (
    <nav 
      className={cn(
        "bg-muted p-1 rounded-lg transition-all duration-200",
        // Mobile: vertical stack, Desktop: horizontal
        orientation === 'vertical' || isMobile 
          ? "flex flex-col gap-1" 
          : "flex flex-row flex-wrap gap-1",
        compact && "p-0.5",
        className
      )}
      role="navigation"
      aria-label="Dashboard navigation"
      aria-orientation={orientation}
    >
      {filteredItems.map((item, index) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path
        
        return (
          <Link
            key={item.key}
            ref={(el) => (buttonRefs.current[index] = el)}
            to={item.path}
            onClick={() => handleNavigate(item)}
            onKeyDown={(e) => handleKeyDown(e, item, index)}
            onFocus={() => setFocusedIndex(index)}
            className={cn(
              "flex items-center gap-2 rounded-md text-sm font-medium transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "hover:scale-[1.02] active:scale-[0.98]",
              // Responsive sizing and alignment
              orientation === 'vertical' || isMobile
                ? "w-full justify-start px-3 py-2"
                : "min-w-0 flex-1 justify-center px-3 py-2",
              compact && "px-2 py-1.5 text-xs",
              isActive
                ? "bg-background text-foreground shadow-sm ring-1 ring-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
            aria-label={item.ariaLabel || `Navigate to ${item.label}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className={cn(
              "flex-shrink-0",
              compact ? "h-3.5 w-3.5" : "h-4 w-4"
            )} />
            {showLabels && (
              <span className={cn(
                "truncate",
                compact && "text-xs"
              )}>{item.label}</span>
            )}
            {item.badge && (
              <Badge 
                variant={isActive ? "default" : "secondary"} 
                className={cn(
                  "ml-auto sm:ml-1",
                  compact ? "text-xs px-1.5 py-0.5" : "text-xs"
                )}
                aria-label={`${item.badge} items`}
              >
                {item.badge}
              </Badge>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

// Predefined navigation items for HR and Manager dashboards
export const HR_NAVIGATION_ITEMS: NavigationItem[] = [
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

export const MANAGER_NAVIGATION_ITEMS: NavigationItem[] = [
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