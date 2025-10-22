/**
 * MobileRadioGroup - Mobile-optimized radio button group with card-style layout
 * 
 * Features:
 * - Card-style buttons with borders
 * - Hover and selected states
 * - Full card clickable (not just radio button)
 * - Responsive grid layout
 * - Touch-friendly (≥ 44px height)
 */

import React from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface MobileRadioOption {
  value: string
  label: string
  id?: string  // Optional, will use value if not provided
}

interface MobileRadioGroupProps {
  value: string
  onValueChange: (value: string) => void
  options: MobileRadioOption[]
  columns?: 1 | 2 | 3 | 4 | 5
  className?: string
}

export function MobileRadioGroup({
  value,
  onValueChange,
  options,
  columns = 2,
  className
}: MobileRadioGroupProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
  }

  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      className={cn('grid gap-3', gridCols[columns], className)}
    >
      {options.map((option) => {
        const radioId = option.id || option.value
        return (
          <label
            key={option.value}
            htmlFor={radioId}
            className="flex items-center gap-3 min-h-[56px] sm:min-h-[48px] p-4 sm:p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50"
          >
            <RadioGroupItem value={option.value} id={radioId} className="shrink-0" />
            <span className="text-[clamp(0.875rem,2.5vw,1rem)] font-normal flex-1">
              {option.label}
            </span>
          </label>
        )
      })}
    </RadioGroup>
  )
}

