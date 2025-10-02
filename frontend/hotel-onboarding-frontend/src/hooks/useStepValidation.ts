import { useState, useCallback } from 'react'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  fieldErrors?: Record<string, string>
}

export interface StepValidator {
  (data: any): ValidationResult | Promise<ValidationResult>
}

export function useStepValidation(validator?: StepValidator) {
  const [errors, setErrors] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)

  const validate = useCallback(async (data: any): Promise<ValidationResult> => {
    if (!validator) {
      return { valid: true, errors: [] }
    }

    setIsValidating(true)
    try {
      const result = await validator(data)
      setErrors(result.errors || [])
      setFieldErrors(result.fieldErrors || {})
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed'
      setErrors([errorMessage])
      return { valid: false, errors: [errorMessage] }
    } finally {
      setIsValidating(false)
    }
  }, [validator])

  const clearErrors = useCallback(() => {
    setErrors([])
    setFieldErrors({})
  }, [])

  const setFieldError = useCallback((field: string, error: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: error }))
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  return {
    errors,
    fieldErrors,
    isValidating,
    validate,
    clearErrors,
    setFieldError,
    clearFieldError
  }
}