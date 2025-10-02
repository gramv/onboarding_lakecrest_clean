import * as React from "react"
import { TrendingUp, TrendingDown, Minus, ArrowRight, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    label?: string
  }
  icon?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  actions?: Array<{
    label: string
    onClick: () => void
  }>
  onClick?: () => void
  loading?: boolean
  chart?: React.ReactNode
  className?: string
}

const variantStyles = {
  default: {
    icon: "text-gray-600 bg-gray-100",
    trend: "text-gray-600",
    value: "text-gray-900"
  },
  success: {
    icon: "text-green-600 bg-green-100",
    trend: "text-green-600",
    value: "text-green-600"
  },
  warning: {
    icon: "text-amber-600 bg-amber-100",
    trend: "text-amber-600",
    value: "text-amber-600"
  },
  danger: {
    icon: "text-red-600 bg-red-100",
    trend: "text-red-600",
    value: "text-red-600"
  },
  info: {
    icon: "text-blue-600 bg-blue-100",
    trend: "text-blue-600",
    value: "text-blue-600"
  }
}

const sizeStyles = {
  sm: {
    padding: "p-4",
    iconSize: "h-8 w-8",
    iconPadding: "p-1.5",
    value: "text-xl",
    title: "text-sm",
    description: "text-xs"
  },
  md: {
    padding: "p-6",
    iconSize: "h-10 w-10",
    iconPadding: "p-2",
    value: "text-2xl",
    title: "text-sm",
    description: "text-sm"
  },
  lg: {
    padding: "p-8",
    iconSize: "h-12 w-12",
    iconPadding: "p-3",
    value: "text-3xl",
    title: "text-base",
    description: "text-base"
  }
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  variant = 'default',
  size = 'md',
  actions,
  onClick,
  loading = false,
  chart,
  className
}: StatCardProps) {
  const styles = variantStyles[variant]
  const sizes = sizeStyles[size]
  
  const TrendIcon = trend && trend.value > 0 ? TrendingUp 
    : trend && trend.value < 0 ? TrendingDown 
    : Minus
  
  const content = (
    <>
      <CardHeader className={cn(sizes.padding, "pb-3")}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className={cn("font-medium", sizes.title, "text-gray-700")}>
              {title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {icon && (
              <div className={cn(
                "rounded-lg flex items-center justify-center",
                sizes.iconSize,
                sizes.iconPadding,
                styles.icon
              )}>
                {icon}
              </div>
            )}
            {actions && actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.map((action, index) => (
                    <DropdownMenuItem key={index} onClick={action.onClick}>
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(sizes.padding, "pt-0")}>
        {loading ? (
          <div className="space-y-3">
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <p className={cn("font-bold", sizes.value, styles.value)}>
                {value !== undefined && value !== null ? value : '0'}
              </p>
              {trend && (
                <div className={cn("flex items-center gap-1", sizes.description, styles.trend)}>
                  <TrendIcon className="h-3 w-3" />
                  <span className="font-medium">
                    {trend.value > 0 ? '+' : ''}{trend.value}%
                  </span>
                  {trend.label && (
                    <span className="text-gray-500">{trend.label}</span>
                  )}
                </div>
              )}
              {description && (
                <CardDescription className={sizes.description}>
                  {description}
                </CardDescription>
              )}
            </div>
            {chart && (
              <div className="mt-4">
                {chart}
              </div>
            )}
          </>
        )}
      </CardContent>
    </>
  )
  
  if (onClick) {
    return (
      <Card 
        className={cn(
          "transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.02]",
          className
        )}
        onClick={onClick}
      >
        {content}
        <div className={cn(
          "flex items-center justify-end px-6 pb-4 -mt-2",
          size === 'sm' && "px-4 pb-3"
        )}>
          <span className="text-sm text-blue-600 font-medium flex items-center gap-1 group">
            View details
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Card>
    )
  }
  
  return (
    <Card className={cn("transition-all duration-200", className)}>
      {content}
    </Card>
  )
}

// Compact stat for smaller spaces
export function StatCardCompact({
  label,
  value,
  trend,
  icon,
  variant = 'default',
  className
}: {
  label: string
  value: string | number
  trend?: number
  icon?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}) {
  const styles = variantStyles[variant]
  
  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-lg border bg-white",
      className
    )}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center p-1.5",
            styles.icon
          )}>
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className={cn("text-lg font-semibold", styles.value)}>{value}</p>
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn("flex items-center gap-1 text-sm", styles.trend)}>
          {trend > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : trend < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          <span className="font-medium">
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        </div>
      )}
    </div>
  )
}

// Grid layout for stat cards
export function StatCardGrid({
  children,
  columns = 4,
  className
}: {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
}) {
  return (
    <div className={cn(
      "grid gap-4 sm:gap-6",
      columns === 1 && "grid-cols-1",
      columns === 2 && "grid-cols-1 sm:grid-cols-2",
      columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      columns === 5 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
      columns === 6 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
      className
    )}>
      {children}
    </div>
  )
}