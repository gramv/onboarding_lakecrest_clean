/**
 * MobileSelect - Mobile-optimized select component with dynamic sizing
 * 
 * Features:
 * - Dynamic height: 44px - 48px (clamp)
 * - Dynamic font size: Always ≥ 16px
 * - Max height for dropdown: 60vh
 * - Larger touch targets for options
 */

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface MobileSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  error?: boolean
  disabled?: boolean
  children: React.ReactNode
  className?: string
}

export function MobileSelect({ 
  value,
  onValueChange,
  placeholder,
  error,
  disabled,
  children,
  className
}: MobileSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger 
        className={cn(
          'h-[clamp(2.75rem,5vw,3rem)] text-[clamp(1rem,2.5vw,1rem)]',
          error && 'border-red-500',
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[60vh]">
        {children}
      </SelectContent>
    </Select>
  )
}

interface MobileSelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function MobileSelectItem({ value, children, className }: MobileSelectItemProps) {
  return (
    <SelectItem 
      value={value}
      className={cn(
        'text-[clamp(0.875rem,2.5vw,1rem)] py-3',
        className
      )}
    >
      {children}
    </SelectItem>
  )
}

