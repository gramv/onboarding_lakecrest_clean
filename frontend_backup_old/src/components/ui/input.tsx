import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  label?: string
  error?: string
  success?: boolean
  variant?: "default" | "enhanced" | "floating"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, success, variant = "default", ...props }, ref) => {
    const inputId = React.useId()
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue)

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      props.onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value)
      props.onChange?.(e)
    }

    if (variant === "enhanced") {
      return (
        <div className="space-y-2">
          {label && (
            <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700">
              {label}
            </label>
          )}
          <input
            id={inputId}
            type={type}
            className={cn(
              "form-input-enhanced",
              error && "error",
              success && "success",
              className
            )}
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />
          {error && (
            <p className="text-sm text-red-600 font-medium flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
        </div>
      )
    }

    if (variant === "floating" && label) {
      return (
        <div className="input-group-enhanced">
          <input
            id={inputId}
            type={type}
            placeholder=" "
            className={cn(
              "form-input-enhanced peer",
              error && "error",
              success && "success",
              className
            )}
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "form-label absolute left-4 top-4 text-gray-500 transition-all duration-200 ease-in-out pointer-events-none",
              (isFocused || hasValue) && "text-xs text-hotel-primary font-medium -translate-y-7 scale-85 bg-white px-2 ml-[-4px]"
            )}
          >
            {label}
          </label>
          {error && (
            <p className="text-sm text-red-600 font-medium flex items-center gap-1 mt-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
        </div>
      )
    }

    // Default variant
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            "flex h-11 w-full rounded-lg border-2 border-hotel-neutral-300 bg-white px-4 py-3 text-base shadow-sm transition-all duration-200 ease-in-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-hotel-neutral-900 placeholder:text-hotel-neutral-500 hover:border-hotel-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hotel-primary/20 focus-visible:border-hotel-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-hotel-neutral-50 dark:border-hotel-neutral-700 dark:bg-hotel-neutral-900 dark:file:text-hotel-neutral-50 dark:placeholder:text-hotel-neutral-400 dark:focus-visible:ring-hotel-primary/20",
            error && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20",
            success && "border-green-400 focus-visible:border-green-500 focus-visible:ring-green-500/20",
            className
          )}
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 font-medium flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
