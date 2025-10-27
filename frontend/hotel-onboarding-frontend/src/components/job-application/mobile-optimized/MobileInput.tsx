/**
 * MobileInput - Mobile-optimized input component with dynamic sizing
 * 
 * Features:
 * - Dynamic height: 44px - 48px (clamp)
 * - Dynamic font size: Always ≥ 16px (no iOS zoom)
 * - Mobile keyboard support (tel, email, numeric)
 * - AutoComplete support
 */

import React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  mobileKeyboard?: 'tel' | 'email' | 'numeric' | 'decimal' | 'url' | 'search'
}

export function MobileInput({ 
  error, 
  mobileKeyboard,
  className,
  type,
  ...props 
}: MobileInputProps) {
  // Determine inputMode based on mobileKeyboard prop
  const inputMode = mobileKeyboard || (type === 'email' ? 'email' : type === 'tel' ? 'tel' : undefined)
  
  return (
    <Input
      type={type}
      inputMode={inputMode}
      className={cn(
        'h-[clamp(2.75rem,5vw,3rem)] text-[clamp(1rem,2.5vw,1rem)]',
        error && 'border-red-500',
        className
      )}
      {...props}
    />
  )
}

