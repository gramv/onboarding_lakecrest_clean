import * as React from "react"
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  size?: ModalSize
  className?: string
  children: React.ReactNode
}

// Size configurations
const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg", 
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw] max-h-[95vh]"
}

// Base Modal Component
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  className,
  children,
}: BaseModalProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          sizeClasses[size],
          size === 'full' && "h-[95vh] overflow-y-auto",
          className
        )}
        onPointerDownOutside={() => {
          // Allow closing by clicking outside
          onClose()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        <div className={cn(
          "flex-1",
          size === 'full' && "overflow-y-auto"
        )}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Form Modal Component
export interface FormModalProps extends Omit<BaseModalProps, 'children'> {
  onSubmit?: (e: React.FormEvent) => void
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  isSubmitting?: boolean
  submitDisabled?: boolean
  children: React.ReactNode
  footerActions?: React.ReactNode
}

export function FormModal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  className,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting = false,
  submitDisabled = false,
  children,
  footerActions,
}: FormModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(e)
  }

  const handleCancel = () => {
    onCancel?.() || onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          sizeClasses[size],
          size === 'full' && "h-[95vh]",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className={cn(
            "flex-1 space-y-4",
            size === 'full' && "overflow-y-auto"
          )}>
            {children}
          </div>
          
          <DialogFooter className="mt-6">
            {footerActions || (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  {cancelLabel}
                </Button>
                <Button
                  type="submit"
                  disabled={submitDisabled || isSubmitting}
                  className="min-w-[80px]"
                >
                  {isSubmitting ? "Saving..." : submitLabel}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Confirmation Modal Component
export type ConfirmationType = 'info' | 'warning' | 'danger' | 'success'

export interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  type?: ConfirmationType
  confirmLabel?: string
  cancelLabel?: string
  isConfirming?: boolean
  size?: ModalSize
}

const confirmationConfig: Record<ConfirmationType, {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  confirmButtonClass: string
}> = {
  info: {
    icon: Info,
    iconColor: "text-blue-500",
    confirmButtonClass: "bg-blue-600 hover:bg-blue-700"
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
    confirmButtonClass: "bg-yellow-600 hover:bg-yellow-700"
  },
  danger: {
    icon: XCircle,
    iconColor: "text-red-500",
    confirmButtonClass: "bg-red-600 hover:bg-red-700"
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-green-500",
    confirmButtonClass: "bg-green-600 hover:bg-green-700"
  }
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type = 'info',
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isConfirming = false,
  size = 'sm',
}: ConfirmationModalProps) {
  const config = confirmationConfig[type]
  const Icon = config.icon

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(sizeClasses[size])}>
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className={cn("flex-shrink-0", config.iconColor)}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-left">{title}</DialogTitle>
              {description && (
                <DialogDescription className="text-left mt-2">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className={cn(config.confirmButtonClass, "min-w-[80px]")}
          >
            {isConfirming ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for managing modal state
export function useModal(initialOpen = false) {
  const [isOpen, setIsOpen] = React.useState(initialOpen)

  const openModal = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeModal = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleModal = React.useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
  }
}

// Hook for confirmation modal
export function useConfirmation() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [config, setConfig] = React.useState<{
    title: string
    description?: string
    type?: ConfirmationType
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
  } | null>(null)

  const confirm = React.useCallback((options: {
    title: string
    description?: string
    type?: ConfirmationType
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
  }) => {
    setConfig(options)
    setIsOpen(true)
  }, [])

  const handleConfirm = React.useCallback(() => {
    config?.onConfirm()
    setIsOpen(false)
    setConfig(null)
  }, [config])

  const handleCancel = React.useCallback(() => {
    setIsOpen(false)
    setConfig(null)
  }, [])

  const ConfirmationDialog = React.useCallback(() => {
    if (!config) return null

    return (
      <ConfirmationModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={config.title}
        description={config.description}
        type={config.type}
        confirmLabel={config.confirmLabel}
        cancelLabel={config.cancelLabel}
      />
    )
  }, [isOpen, config, handleCancel, handleConfirm])

  return {
    confirm,
    ConfirmationDialog,
  }
}

// Focus trap utility for accessibility
export function useFocusTrap(isActive: boolean) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    // Focus first element when modal opens
    firstElement?.focus()

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isActive])

  return containerRef
}