import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FormError } from './FormError'

interface BaseFormFieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  className?: string
  hint?: string
}

interface InputFieldProps extends BaseFormFieldProps {
  type: 'text' | 'email' | 'tel' | 'number' | 'date'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
}

interface SelectFieldProps extends BaseFormFieldProps {
  type: 'select'
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

interface TextareaFieldProps extends BaseFormFieldProps {
  type: 'textarea'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

type FormFieldProps = InputFieldProps | SelectFieldProps | TextareaFieldProps

/**
 * Unified form field component with consistent styling and error handling
 */
export const FormField: React.FC<FormFieldProps> = (props) => {
  const { id, label, required, error, className = '', hint } = props

  const renderField = () => {
    switch (props.type) {
      case 'select':
        return (
          <Select value={props.value} onValueChange={props.onChange}>
            <SelectTrigger id={id} className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={props.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {props.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'textarea':
        return (
          <Textarea
            id={id}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder}
            rows={props.rows || 3}
            className={error ? 'border-red-500' : ''}
          />
        )
      
      default:
        return (
          <Input
            id={id}
            type={props.type}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder}
            maxLength={props.maxLength}
            className={error ? 'border-red-500' : ''}
          />
        )
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {hint && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
      {renderField()}
      <FormError error={error} />
    </div>
  )
}

export default FormField