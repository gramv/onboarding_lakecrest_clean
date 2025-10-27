/**
 * MobileTextarea - Mobile-optimized textarea component with dynamic sizing
 * 
 * Features:
 * - Dynamic font size: Always ≥ 16px (no iOS zoom)
 * - Dynamic padding
 * - Proper min-height
 */

import React from 'react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function MobileTextarea({ 
  error,
  className,
  ...props 
}: MobileTextareaProps) {
  return (
    <Textarea
      className={cn(
        'text-[clamp(1rem,2.5vw,1rem)] p-[clamp(0.75rem,2vw,1rem)] min-h-[clamp(6rem,15vw,8rem)]',
        error && 'border-red-500',
        className
      )}
      {...props}
    />
  )
}

