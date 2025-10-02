/**
 * Enhanced Input Component
 * Professional input component with design tokens integration
 */

import React from 'react'
import { cn } from '@/lib/utils'
import type { InputProps, TextareaProps } from './types'

// ===== INPUT VARIANTS =====

const inputVariants = {
  default: [
    'bg-surface-primary border border-neutral-300',
    'hover:border-neutral-400',
    'focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
    'disabled:bg-neutral-100 disabled:border-neutral-200 disabled:text-text-disabled',
  ],
  filled: [
    'bg-surface-secondary border border-transparent',
    'hover:bg-surface-tertiary',
    'focus:bg-surface-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
    'disabled:bg-neutral-100 disabled:text-text-disabled',
  ],
  outlined: [
    'bg-transparent border-2 border-neutral-300',
    'hover:border-neutral-400',
    'focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
    'disabled:bg-neutral-50 disabled:border-neutral-200 disabled:text-text-disabled',
  ],
}

const inputSizes = {
  sm: 'h-9 px-3 py-2 text-sm',
  md: 'h-11 px-4 py-3 text-sm',
  lg: 'h-12 px-4 py-3 text-base',
}

const inputStates = {
  error: [
    'border-error-500 bg-error-50',
    'focus:border-error-500 focus:ring-error-500/20',
    'text-error-900',
  ],
  success: [
    'border-success-500 bg-success-50',
    'focus:border-success-500 focus:ring-success-500/20',
    'text-success-900',
  ],
}

// ===== FORM LABEL COMPONENT =====

const FormLabel: React.FC<{
  htmlFor?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}> = ({ htmlFor, required, children, className }) => (
  <label
    htmlFor={htmlFor}
    className={cn(
      'block text-sm font-medium text-text-primary mb-2',
      className
    )}
  >
    {children}
    {required && <span className="text-error-500 ml-1">*</span>}
  </label>
)

// ===== FORM MESSAGE COMPONENT =====

const FormMessage: React.FC<{
  type: 'error' | 'success' | 'helper'
  children: React.ReactNode
  className?: string
}> = ({ type, children, className }) => {
  const messageStyles = {
    error: 'text-error-600',
    success: 'text-success-600',
    helper: 'text-text-muted',
  }

  return (
    <p className={cn('text-sm mt-2', messageStyles[type], className)}>
      {children}
    </p>
  )
}

// ===== INPUT ADDON COMPONENT =====

const InputAddon: React.FC<{
  children: React.ReactNode
  position: 'left' | 'right'
  className?: string
}> = ({ children, position, className }) => (
  <div
    className={cn(
      'flex items-center px-3 bg-surface-secondary border border-neutral-300 text-text-muted',
      position === 'left' ? 'rounded-l-lg border-r-0' : 'rounded-r-lg border-l-0',
      className
    )}
  >
    {children}
  </div>
)

// ===== MAIN INPUT COMPONENT =====

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = 'text',
    size = 'md',
    variant = 'default',
    placeholder,
    value,
    defaultValue,
    required = false,
    readOnly = false,
    disabled = false,
    loading = false,
    error = false,
    success = false,
    autoComplete,
    autoFocus,
    maxLength,
    minLength,
    pattern,
    leftIcon,
    rightIcon,
    leftAddon,
    rightAddon,
    helperText,
    errorMessage,
    successMessage,
    label,
    labelRequired,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    'data-testid': testId,
    ...props
  }, ref) => {
    const inputId = React.useId()
    const hasError = error || !!errorMessage
    const hasSuccess = success || !!successMessage
    const isDisabled = disabled || loading

    const inputClasses = cn(
      // Base styles
      'w-full rounded-lg transition-all duration-normal ease-out',
      'placeholder:text-text-muted',
      'focus:outline-none',
      'disabled:cursor-not-allowed',
      
      // Variant styles
      inputVariants[variant],
      
      // Size styles
      inputSizes[size],
      
      // State styles
      hasError && inputStates.error,
      hasSuccess && inputStates.success,
      
      // Icon/addon adjustments
      leftIcon && 'pl-10',
      rightIcon && 'pr-10',
      leftAddon && 'rounded-l-none',
      rightAddon && 'rounded-r-none',
      
      className
    )

    const iconClasses = 'absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-muted pointer-events-none'

    const inputElement = (
      <div className="relative">
        {leftIcon && (
          <div className={cn(iconClasses, 'left-3')}>
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={inputClasses}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          required={required || labelRequired}
          readOnly={readOnly}
          disabled={isDisabled}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          data-testid={testId}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${inputId}-error` :
            hasSuccess ? `${inputId}-success` :
            helperText ? `${inputId}-helper` :
            undefined
          }
          {...props}
        />
        
        {rightIcon && (
          <div className={cn(iconClasses, 'right-3')}>
            {rightIcon}
          </div>
        )}
        
        {loading && (
          <div className={cn(iconClasses, 'right-3')}>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>
    )

    const wrappedInput = (leftAddon || rightAddon) ? (
      <div className="flex">
        {leftAddon && <InputAddon position="left">{leftAddon}</InputAddon>}
        {inputElement}
        {rightAddon && <InputAddon position="right">{rightAddon}</InputAddon>}
      </div>
    ) : inputElement

    return (
      <div className="w-full">
        {label && (
          <FormLabel htmlFor={inputId} required={labelRequired}>
            {label}
          </FormLabel>
        )}
        
        {wrappedInput}
        
        {errorMessage && (
          <FormMessage type="error" className="mt-2">
            {errorMessage}
          </FormMessage>
        )}
        
        {successMessage && !errorMessage && (
          <FormMessage type="success" className="mt-2">
            {successMessage}
          </FormMessage>
        )}
        
        {helperText && !errorMessage && !successMessage && (
          <FormMessage type="helper" className="mt-2">
            {helperText}
          </FormMessage>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// ===== TEXTAREA COMPONENT =====

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    size = 'md',
    variant = 'default',
    rows = 4,
    resize = 'vertical',
    placeholder,
    value,
    defaultValue,
    required = false,
    readOnly = false,
    disabled = false,
    loading = false,
    error = false,
    success = false,
    helperText,
    errorMessage,
    successMessage,
    label,
    labelRequired,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    'data-testid': testId,
    ...props
  }, ref) => {
    const textareaId = React.useId()
    const hasError = error || !!errorMessage
    const hasSuccess = success || !!successMessage
    const isDisabled = disabled || loading

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    }

    const textareaClasses = cn(
      // Base styles
      'w-full rounded-lg transition-all duration-normal ease-out',
      'placeholder:text-text-muted',
      'focus:outline-none',
      'disabled:cursor-not-allowed',
      
      // Variant styles
      inputVariants[variant],
      
      // Size styles (using md padding for textarea)
      'px-4 py-3 text-sm',
      
      // State styles
      hasError && inputStates.error,
      hasSuccess && inputStates.success,
      
      // Resize styles
      resizeClasses[resize],
      
      className
    )

    return (
      <div className="w-full">
        {label && (
          <FormLabel htmlFor={textareaId} required={labelRequired}>
            {label}
          </FormLabel>
        )}
        
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          rows={rows}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          required={required || labelRequired}
          readOnly={readOnly}
          disabled={isDisabled}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          data-testid={testId}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${textareaId}-error` :
            hasSuccess ? `${textareaId}-success` :
            helperText ? `${textareaId}-helper` :
            undefined
          }
          {...props}
        />
        
        {errorMessage && (
          <FormMessage type="error">
            {errorMessage}
          </FormMessage>
        )}
        
        {successMessage && !errorMessage && (
          <FormMessage type="success">
            {successMessage}
          </FormMessage>
        )}
        
        {helperText && !errorMessage && !successMessage && (
          <FormMessage type="helper">
            {helperText}
          </FormMessage>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

// ===== INPUT GROUP COMPONENT =====

export interface InputGroupProps {
  children: React.ReactNode
  className?: string
  label?: string
  required?: boolean
  error?: string
  helperText?: string
}

export const InputGroup: React.FC<InputGroupProps> = ({
  children,
  className,
  label,
  required,
  error,
  helperText,
}) => {
  const groupId = React.useId()

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <FormLabel htmlFor={groupId} required={required}>
          {label}
        </FormLabel>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
      
      {error && (
        <FormMessage type="error">
          {error}
        </FormMessage>
      )}
      
      {helperText && !error && (
        <FormMessage type="helper">
          {helperText}
        </FormMessage>
      )}
    </div>
  )
}

InputGroup.displayName = 'InputGroup'

// ===== EXPORTS =====

export default Input

// ===== USAGE EXAMPLES =====

/*
// Basic Input
<Input placeholder="Enter your name" />

// Input with Label
<Input label="Email Address" type="email" required />

// Input Variants
<Input variant="default" placeholder="Default input" />
<Input variant="filled" placeholder="Filled input" />
<Input variant="outlined" placeholder="Outlined input" />

// Input Sizes
<Input size="sm" placeholder="Small input" />
<Input size="md" placeholder="Medium input" />
<Input size="lg" placeholder="Large input" />

// Input with Icons
<Input 
  leftIcon={<SearchIcon />} 
  placeholder="Search..." 
/>
<Input 
  rightIcon={<EyeIcon />} 
  type="password" 
  placeholder="Password" 
/>

// Input with Addons
<Input 
  leftAddon="https://" 
  placeholder="example.com" 
/>
<Input 
  rightAddon=".com" 
  placeholder="website" 
/>

// Input States
<Input 
  error 
  errorMessage="This field is required" 
  placeholder="Error state" 
/>
<Input 
  success 
  successMessage="Looks good!" 
  placeholder="Success state" 
/>
<Input 
  loading 
  placeholder="Loading..." 
/>

// Textarea
<Textarea 
  label="Description" 
  placeholder="Enter description..." 
  rows={6} 
/>

// Input Group
<InputGroup label="Address" required>
  <Input placeholder="Street address" />
  <div className="grid grid-cols-2 gap-4">
    <Input placeholder="City" />
    <Input placeholder="ZIP Code" />
  </div>
</InputGroup>
*/