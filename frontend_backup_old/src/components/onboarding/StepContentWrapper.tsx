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
      "w-full max-w-4xl mx-auto", // Consistent max width for all steps
      className
    )}>
      {children}
    </div>
  )
}