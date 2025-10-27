/**
 * MobileErrorMessage - Mobile-optimized error message component
 * 
 * Features:
 * - Dynamic font size: 12px - 14px (clamp)
 * - Consistent styling
 */

import React from 'react'
import { cn } from '@/lib/utils'

interface MobileErrorMessageProps {
  children: React.ReactNode
  className?: string
}

export function MobileErrorMessage({ children, className }: MobileErrorMessageProps) {
  if (!children) return null
  
  return (
    <p className={cn('text-[clamp(0.75rem,2vw,0.875rem)] text-red-600', className)}>
      {children}
    </p>
  )
}

