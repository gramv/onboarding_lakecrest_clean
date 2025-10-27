/**
 * MobileLabel - Mobile-optimized label component with dynamic sizing
 * 
 * Features:
 * - Dynamic font size: 14px - 16px (clamp)
 * - Proper spacing
 * - Required indicator support
 */

import React from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface MobileLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
  variant?: 'default' | 'semibold'
}

export function MobileLabel({ 
  required, 
  variant = 'semibold',
  className,
  children,
  ...props 
}: MobileLabelProps) {
  return (
    <Label
      className={cn(
        'text-[clamp(0.875rem,2.5vw,1rem)]',
        variant === 'semibold' ? 'font-semibold text-gray-900' : 'font-normal',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
  )
}

