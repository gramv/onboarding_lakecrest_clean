/**
 * MobileCheckbox - Mobile-optimized checkbox component
 * 
 * Features:
 * - Proper size (20px visual)
 * - Touch-friendly container (≥ 44px)
 * - Dynamic label sizing
 */

import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface MobileCheckboxProps {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  error?: boolean
  className?: string
}

export function MobileCheckbox({ 
  id,
  checked,
  onCheckedChange,
  label,
  error,
  className
}: MobileCheckboxProps) {
  return (
    <div className={cn('flex items-center space-x-3 min-h-[44px]', className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn('h-5 w-5', error && 'border-red-500')}
      />
      <Label 
        htmlFor={id} 
        className="text-[clamp(0.875rem,2.5vw,1rem)] font-normal cursor-pointer"
      >
        {label}
      </Label>
    </div>
  )
}

