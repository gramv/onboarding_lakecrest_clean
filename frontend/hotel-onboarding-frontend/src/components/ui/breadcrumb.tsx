import React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string // Optional - if provided, item is clickable (visual-only)
  current?: boolean // Mark current page
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  // Handle mobile responsive display - show first, ellipsis, and last 2 items if more than 4
  const displayItems = items.length > 4 
    ? [items[0], { label: '...', href: undefined }, ...items.slice(-2)]
    : items

  return (
    <nav 
      className={cn(
        "flex items-center text-sm text-muted-foreground overflow-hidden",
        className
      )} 
      aria-label="Breadcrumb navigation"
    >
      <ol className="flex items-center min-w-0">
        {displayItems.map((item, index) => {
          const isEllipsis = item.label === '...'
          const isCurrent = item.current
          const isClickable = item.href && !isCurrent

          return (
            <li key={`${item.label}-${index}`} className="flex items-center min-w-0">
              {index > 0 && (
                <ChevronRight 
                  className="h-4 w-4 mx-2 text-muted-foreground/50 flex-shrink-0" 
                  aria-hidden="true"
                />
              )}
              
              {isEllipsis ? (
                <span 
                  className="px-1 text-muted-foreground/70 text-xs"
                  aria-label="More breadcrumb items"
                >
                  ...
                </span>
              ) : isClickable ? (
                <a
                  href={item.href || '#'}
                  className={cn(
                    "text-sm hover:text-foreground transition-colors duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-sm px-1",
                    "truncate min-w-0 cursor-pointer"
                  )}
                  aria-label={`Navigate to ${item.label}`}
                  onClick={(e) => e.preventDefault()} // Prevent actual navigation
                >
                  <span className="truncate">{item.label}</span>
                </a>
              ) : (
                <span 
                  className={cn(
                    "min-w-0 px-1",
                    isCurrent 
                      ? "text-foreground font-medium text-sm" 
                      : "text-muted-foreground text-sm"
                  )}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  <span className="truncate">{item.label}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Dashboard-specific breadcrumb component
interface DashboardBreadcrumbProps {
  dashboard: string
  currentPage: string
  className?: string
}

export function DashboardBreadcrumb({ dashboard, currentPage, className }: DashboardBreadcrumbProps) {
  const items: BreadcrumbItem[] = [
    { label: dashboard, href: '#' },
    { label: currentPage, current: true }
  ]
  return <Breadcrumb items={items} className={className} />
}

// Example usage function - creates breadcrumb items for common use cases
export function createBreadcrumbItems(path: string[]): BreadcrumbItem[] {
  return path.map((item, index) => ({
    label: item,
    href: index === path.length - 1 ? undefined : '#', // Last item is current, no href
    current: index === path.length - 1
  }))
}