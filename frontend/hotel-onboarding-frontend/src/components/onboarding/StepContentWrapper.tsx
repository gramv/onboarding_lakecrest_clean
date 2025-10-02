import React from 'react'
import { cn } from '@/lib/utils'

interface StepContentWrapperProps {
  children: React.ReactNode
  className?: string
}

/**
 * StepContentWrapper ensures consistent sizing and spacing for all onboarding step components
 * This creates a uniform content area across all steps
 */
export function StepContentWrapper({ children, className }: StepContentWrapperProps) {
  return (
    <div className={cn(
      "w-full max-w-4xl mx-auto px-4 sm:px-0 pb-32", // Consistent max width with mobile padding and bottom space for sticky nav
      className
    )}>
      {children}
    </div>
  )
}
