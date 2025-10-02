import * as React from "react"
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export interface ValidationMessage {
  field?: string
  message: string
  type?: 'error' | 'warning' | 'info' | 'success'
}

interface ValidationSummaryProps {
  messages: ValidationMessage[]
  title?: string
  showIcon?: boolean
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  compact?: boolean
}

export function ValidationSummary({
  messages,
  title,
  showIcon = true,
  dismissible = false,
  onDismiss,
  className,
  compact = false
}: ValidationSummaryProps) {
  if (!messages || messages.length === 0) return null
  
  // Group messages by type
  const groupedMessages = messages.reduce((acc, msg) => {
    const type = msg.type || 'error'
    if (!acc[type]) acc[type] = []
    acc[type].push(msg)
    return acc
  }, {} as Record<string, ValidationMessage[]>)
  
  // Determine primary type based on severity
  const primaryType = groupedMessages.error ? 'error' 
    : groupedMessages.warning ? 'warning'
    : groupedMessages.info ? 'info'
    : 'success'
  
  const icons = {
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
    success: <CheckCircle className="h-5 w-5" />
  }
  
  const variants = {
    error: "destructive",
    warning: "warning",
    info: "default",
    success: "success"
  } as const
  
  if (compact) {
    return (
      <div className={cn(
        "rounded-lg p-4 flex items-start gap-3",
        primaryType === 'error' && "bg-red-50 text-red-900 border border-red-200",
        primaryType === 'warning' && "bg-amber-50 text-amber-900 border border-amber-200",
        primaryType === 'info' && "bg-blue-50 text-blue-900 border border-blue-200",
        primaryType === 'success' && "bg-green-50 text-green-900 border border-green-200",
        className
      )}>
        {showIcon && (
          <div className="flex-shrink-0 mt-0.5">
            {icons[primaryType]}
          </div>
        )}
        <div className="flex-1 space-y-1">
          {title && (
            <p className="font-medium">{title}</p>
          )}
          <ul className="space-y-1">
            {messages.map((msg, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                {msg.field && (
                  <span className="font-medium">{msg.field}:</span>
                )}
                <span>{msg.message}</span>
              </li>
            ))}
          </ul>
        </div>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }
  
  return (
    <Alert 
      variant={variants[primaryType]}
      className={cn("relative", className)}
    >
      {showIcon && icons[primaryType]}
      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <AlertTitle className="mb-2">
        {title || (
          primaryType === 'error' ? 'Please correct the following errors'
          : primaryType === 'warning' ? 'Please review the following warnings'
          : primaryType === 'info' ? 'Please note'
          : 'Success'
        )}
      </AlertTitle>
      <AlertDescription>
        <ul className="space-y-2">
          {Object.entries(groupedMessages).map(([type, msgs]) => (
            msgs.map((msg, index) => (
              <li key={`${type}-${index}`} className="flex items-start gap-2">
                {type !== primaryType && (
                  <span className="flex-shrink-0 mt-0.5">
                    {icons[type as keyof typeof icons]}
                  </span>
                )}
                <span className="flex-1">
                  {msg.field && (
                    <span className="font-medium">{msg.field}: </span>
                  )}
                  {msg.message}
                </span>
              </li>
            ))
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

// Inline validation message for individual fields
export function FieldValidation({
  message,
  type = 'error',
  className
}: {
  message?: string
  type?: 'error' | 'warning' | 'info' | 'success'
  className?: string
}) {
  if (!message) return null
  
  return (
    <p className={cn(
      "text-sm mt-1 flex items-center gap-1",
      type === 'error' && "text-red-600",
      type === 'warning' && "text-amber-600",
      type === 'info' && "text-blue-600",
      type === 'success' && "text-green-600",
      className
    )}>
      {type === 'error' && <AlertCircle className="h-3 w-3" />}
      {type === 'warning' && <AlertTriangle className="h-3 w-3" />}
      {type === 'info' && <Info className="h-3 w-3" />}
      {type === 'success' && <CheckCircle className="h-3 w-3" />}
      {message}
    </p>
  )
}