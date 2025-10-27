/**
 * MobileFormSection - Mobile-optimized form section wrapper
 * 
 * Features:
 * - Dynamic spacing between sections
 * - Dynamic heading sizes
 * - Consistent layout
 */

import React from 'react'
import { cn } from '@/lib/utils'

interface MobileFormSectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function MobileFormSection({ title, children, className }: MobileFormSectionProps) {
  return (
    <div className={cn('space-y-[clamp(1rem,3vw,1.5rem)]', className)}>
      {title && (
        <h3 className="text-[clamp(1.125rem,3vw,1.5rem)] font-semibold mb-[clamp(1rem,3vw,1.25rem)]">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

interface MobileFormFieldProps {
  children: React.ReactNode
  className?: string
}

export function MobileFormField({ children, className }: MobileFormFieldProps) {
  return (
    <div className={cn('space-y-[clamp(0.5rem,1.5vw,0.75rem)]', className)}>
      {children}
    </div>
  )
}

interface MobileFormGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3
  className?: string
}

export function MobileFormGrid({ children, columns = 2, className }: MobileFormGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3'
  }

  return (
    <div className={cn('grid gap-[clamp(1rem,3vw,1.5rem)]', gridCols[columns], className)}>
      {children}
    </div>
  )
}

