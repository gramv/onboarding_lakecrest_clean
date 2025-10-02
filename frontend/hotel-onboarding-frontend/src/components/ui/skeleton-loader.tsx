import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'text' | 'avatar' | 'button' | 'card'
  size?: 'sm' | 'md' | 'lg'
}

export function Skeleton({ className, variant = 'default', size = 'md', ...props }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-gray-200 rounded"
  
  const variantClasses = {
    default: "h-4",
    text: "h-4",
    avatar: "rounded-full",
    button: "rounded-lg",
    card: "rounded-xl"
  }
  
  const sizeClasses = {
    sm: {
      default: "h-3",
      text: "h-3",
      avatar: "w-8 h-8",
      button: "h-9",
      card: "h-32"
    },
    md: {
      default: "h-4",
      text: "h-4", 
      avatar: "w-10 h-10",
      button: "h-11",
      card: "h-40"
    },
    lg: {
      default: "h-6",
      text: "h-6",
      avatar: "w-12 h-12", 
      button: "h-12",
      card: "h-48"
    }
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size][variant],
        className
      )}
      {...props}
    />
  )
}

// Specialized skeleton components
export function SkeletonText({ className, size = 'md', ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="text" size={size} className={className} {...props} />
}

export function SkeletonAvatar({ className, size = 'md', ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="avatar" size={size} className={className} {...props} />
}

export function SkeletonButton({ className, size = 'md', ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="button" size={size} className={className} {...props} />
}

export function SkeletonCard({ className, size = 'md', ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="card" size={size} className={className} {...props} />
}

// Table skeleton loader
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="table-container">
      <div className="table-base">
        {/* Header skeleton */}
        <div className="table-header">
          <div className="flex">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="table-header-cell">
                <SkeletonText className="w-20" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Body skeleton */}
        <div className="table-body">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="table-row flex">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="table-cell">
                  <SkeletonText className="w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Dashboard stats skeleton
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="responsive-grid-4 gap-md">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-elevated card-rounded-md">
          <div className="card-padding-md text-center spacing-xs">
            <SkeletonText className="w-16 h-8 mx-auto" />
            <SkeletonText className="w-20 mx-auto" size="sm" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Form skeleton
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="spacing-sm">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="form-group">
          <SkeletonText className="w-24 mb-2" size="sm" />
          <SkeletonButton className="w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-4">
        <SkeletonButton className="w-20" />
        <SkeletonButton className="w-24" />
      </div>
    </div>
  )
}