/**
 * Enhanced Breadcrumb Navigation Component
 * Dynamic route generation with user context and click navigation
 */

import React, { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  ChevronRight, 
  Home, 
  Building2, 
  Users, 
  FileText, 
  BarChart3, 
  UserCheck,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'

// ===== TYPES =====

export interface BreadcrumbItem {
  key: string
  label: string
  path: string
  icon?: React.ComponentType<{ className?: string }>
  current?: boolean
  clickable?: boolean
  metadata?: {
    propertyName?: string
    userName?: string
    count?: number
  }
}

interface BreadcrumbNavigationProps {
  className?: string
  separator?: React.ComponentType<{ className?: string }>
  maxItems?: number
  showHome?: boolean
  showIcons?: boolean
  variant?: 'default' | 'compact' | 'minimal'
  customItems?: BreadcrumbItem[]
  onItemClick?: (item: BreadcrumbItem) => void
}

// ===== ROUTE MAPPING =====

const ROUTE_MAPPING: Record<string, {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  roles?: ('hr' | 'manager')[]
}> = {
  // HR Routes
  '/hr': { label: 'HR Dashboard', icon: Home, roles: ['hr'] },
  '/hr/properties': { label: 'Properties', icon: Building2, roles: ['hr'] },
  '/hr/managers': { label: 'Managers', icon: UserCheck, roles: ['hr'] },
  '/hr/employees': { label: 'Employees', icon: Users, roles: ['hr'] },
  '/hr/applications': { label: 'Applications', icon: FileText, roles: ['hr'] },
  '/hr/analytics': { label: 'Analytics', icon: BarChart3, roles: ['hr'] },
  
  // Manager Routes
  '/manager': { label: 'Manager Dashboard', icon: Home, roles: ['manager'] },
  '/manager/applications': { label: 'Applications', icon: FileText, roles: ['manager'] },
  '/manager/employees': { label: 'Employees', icon: Users, roles: ['manager'] },
  '/manager/analytics': { label: 'Analytics', icon: BarChart3, roles: ['manager'] },
  
  // Common Routes
  '/profile': { label: 'Profile', icon: Users },
  '/settings': { label: 'Settings' },
}

// ===== BREADCRUMB NAVIGATION COMPONENT =====

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  className,
  separator: Separator = ChevronRight,
  maxItems = 4,
  showHome = true,
  showIcons = true,
  variant = 'default',
  customItems,
  onItemClick
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Generate breadcrumb items from current route
  const breadcrumbItems = useMemo(() => {
    if (customItems) {
      return customItems
    }

    const pathSegments = location.pathname.split('/').filter(Boolean)
    const items: BreadcrumbItem[] = []

    // Add home item if requested
    if (showHome) {
      const homeRoute = user?.role === 'hr' ? '/hr' : '/manager'
      const homeMapping = ROUTE_MAPPING[homeRoute]
      
      if (homeMapping) {
        items.push({
          key: 'home',
          label: homeMapping.label,
          path: homeRoute,
          icon: homeMapping.icon,
          clickable: location.pathname !== homeRoute
        })
      }
    }

    // Build breadcrumb from path segments
    let currentPath = ''
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const mapping = ROUTE_MAPPING[currentPath]
      
      if (mapping && (!mapping.roles || mapping.roles.includes(user?.role as any))) {
        const isLast = index === pathSegments.length - 1
        
        items.push({
          key: currentPath,
          label: mapping.label,
          path: currentPath,
          icon: mapping.icon,
          current: isLast,
          clickable: !isLast
        })
      }
    })

    return items
  }, [location.pathname, user?.role, showHome, customItems])

  // Handle item click
  const handleItemClick = (item: BreadcrumbItem, event: React.MouseEvent) => {
    if (!item.clickable) {
      event.preventDefault()
      return
    }

    if (onItemClick) {
      event.preventDefault()
      onItemClick(item)
    } else {
      navigate(item.path)
    }
  }

  // Handle responsive display - show ellipsis if too many items
  const displayItems = useMemo(() => {
    if (breadcrumbItems.length <= maxItems) {
      return breadcrumbItems
    }

    const first = breadcrumbItems[0]
    const last = breadcrumbItems[breadcrumbItems.length - 1]
    const middle = breadcrumbItems.slice(1, -1)
    
    if (middle.length <= 1) {
      return breadcrumbItems
    }

    return [
      first,
      {
        key: 'ellipsis',
        label: '...',
        path: '',
        clickable: false,
        metadata: { count: middle.length }
      },
      last
    ]
  }, [breadcrumbItems, maxItems])

  // Variant classes
  const variantClasses = {
    default: 'text-sm',
    compact: 'text-xs',
    minimal: 'text-sm font-normal'
  }

  if (breadcrumbItems.length === 0) {
    return null
  }

  return (
    <nav 
      className={cn(
        "flex items-center space-x-1 overflow-hidden",
        variantClasses[variant],
        className
      )} 
      aria-label="Breadcrumb navigation"
    >
      <ol className="flex items-center space-x-1 min-w-0">
        {displayItems.map((item, index) => {
          const Icon = item.icon
          const isEllipsis = item.key === 'ellipsis'
          const isLast = index === displayItems.length - 1
          const isClickable = item.clickable && !isEllipsis

          return (
            <li key={item.key} className="flex items-center min-w-0">
              {/* Separator */}
              {index > 0 && (
                <Separator 
                  className="h-4 w-4 mx-1 text-muted-foreground/50 flex-shrink-0" 
                  aria-hidden="true"
                />
              )}
              
              {/* Ellipsis with dropdown */}
              {isEllipsis ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-muted-foreground hover:text-foreground"
                      aria-label={`Show ${item.metadata?.count || 0} hidden breadcrumb items`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {breadcrumbItems.slice(1, -1).map((hiddenItem) => {
                      const HiddenIcon = hiddenItem.icon
                      return (
                        <DropdownMenuItem
                          key={hiddenItem.key}
                          onClick={(e) => handleItemClick(hiddenItem, e)}
                          className="flex items-center gap-2"
                        >
                          {HiddenIcon && showIcons && (
                            <HiddenIcon className="h-4 w-4" />
                          )}
                          {hiddenItem.label}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                /* Regular breadcrumb item */
                <div className="flex items-center gap-1 min-w-0">
                  {isClickable ? (
                    <Link
                      to={item.path}
                      onClick={(e) => handleItemClick(item, e)}
                      className={cn(
                        "flex items-center gap-1 rounded-sm px-1 py-0.5 transition-colors duration-200",
                        "hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                        "text-muted-foreground min-w-0",
                        variant === 'compact' && "px-0.5 py-0"
                      )}
                      aria-label={`Navigate to ${item.label}`}
                      aria-current={item.current ? 'page' : undefined}
                    >
                      {Icon && showIcons && (
                        <Icon className={cn(
                          "flex-shrink-0",
                          variant === 'compact' ? "h-3 w-3" : "h-4 w-4"
                        )} />
                      )}
                      <span className="truncate max-w-[120px] sm:max-w-[200px]">
                        {item.label}
                      </span>
                    </Link>
                  ) : (
                    <span 
                      className={cn(
                        "flex items-center gap-1 px-1 py-0.5 min-w-0",
                        item.current 
                          ? "text-foreground font-medium" 
                          : "text-muted-foreground",
                        variant === 'compact' && "px-0.5 py-0"
                      )}
                      aria-current={item.current ? "page" : undefined}
                    >
                      {Icon && showIcons && (
                        <Icon className={cn(
                          "flex-shrink-0",
                          variant === 'compact' ? "h-3 w-3" : "h-4 w-4"
                        )} />
                      )}
                      <span className="truncate max-w-[120px] sm:max-w-[200px]">
                        {item.label}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ===== UTILITY FUNCTIONS =====

/**
 * Create custom breadcrumb items
 */
export function createBreadcrumbItems(
  paths: Array<{
    label: string
    path: string
    icon?: React.ComponentType<{ className?: string }>
    current?: boolean
  }>
): BreadcrumbItem[] {
  return paths.map((path, index) => ({
    key: path.path || `item-${index}`,
    label: path.label,
    path: path.path,
    icon: path.icon,
    current: path.current || index === paths.length - 1,
    clickable: !path.current && index !== paths.length - 1
  }))
}

/**
 * Get breadcrumb items for a specific route pattern
 */
export function getBreadcrumbsForRoute(
  pathname: string,
  userRole: 'hr' | 'manager',
  metadata?: {
    propertyName?: string
    userName?: string
  }
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = []

  // Add home
  const homeRoute = userRole === 'hr' ? '/hr' : '/manager'
  const homeMapping = ROUTE_MAPPING[homeRoute]
  
  if (homeMapping) {
    items.push({
      key: 'home',
      label: homeMapping.label,
      path: homeRoute,
      icon: homeMapping.icon,
      clickable: pathname !== homeRoute
    })
  }

  // Build path
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const mapping = ROUTE_MAPPING[currentPath]
    
    if (mapping && (!mapping.roles || mapping.roles.includes(userRole))) {
      const isLast = index === segments.length - 1
      let label = mapping.label
      
      // Add metadata context
      if (metadata?.propertyName && currentPath.includes('properties')) {
        label = metadata.propertyName
      }
      
      items.push({
        key: currentPath,
        label,
        path: currentPath,
        icon: mapping.icon,
        current: isLast,
        clickable: !isLast,
        metadata
      })
    }
  })

  return items
}

// ===== EXPORTS =====

export default BreadcrumbNavigation