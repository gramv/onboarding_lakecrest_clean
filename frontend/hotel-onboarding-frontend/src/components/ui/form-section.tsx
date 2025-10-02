import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"

interface FormSectionProps {
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
  required?: boolean
  completed?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
}

export function FormSection({
  title,
  description,
  icon,
  children,
  collapsible = false,
  defaultOpen = true,
  badge,
  badgeVariant = "default",
  required = false,
  completed = false,
  className,
  headerClassName,
  contentClassName
}: FormSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  
  const Header = (
    <div className={cn(
      "flex items-start justify-between gap-4 p-6",
      collapsible && "cursor-pointer hover:bg-gray-50 transition-colors",
      headerClassName
    )}>
      <div className="flex items-start gap-4 flex-1">
        {icon && (
          <div className="mt-0.5 text-gray-500">
            {icon}
          </div>
        )}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
              {required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            {badge && (
              <Badge variant={badgeVariant} className="ml-2">
                {badge}
              </Badge>
            )}
            {completed && (
              <Badge variant="success" className="ml-2">
                Completed
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-sm text-gray-600">
              {description}
            </p>
          )}
        </div>
        {collapsible && (
          <div className="mt-1">
            {isOpen ? (
              <ChevronDown className="h-5 w-5 text-gray-400 transition-transform" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400 transition-transform" />
            )}
          </div>
        )}
      </div>
    </div>
  )
  
  const Content = (
    <div className={cn(
      "px-6 pb-6",
      contentClassName
    )}>
      {children}
    </div>
  )
  
  if (collapsible) {
    return (
      <div className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200",
        completed && "border-green-200 bg-green-50/30",
        className
      )}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            {Header}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {Content}
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }
  
  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden",
      completed && "border-green-200 bg-green-50/30",
      className
    )}>
      {Header}
      {Content}
    </div>
  )
}

// Grid layout for form sections
export function FormSectionGrid({
  children,
  columns = 1,
  className
}: {
  children: React.ReactNode
  columns?: 1 | 2 | 3
  className?: string
}) {
  return (
    <div className={cn(
      "grid gap-6",
      columns === 1 && "grid-cols-1",
      columns === 2 && "grid-cols-1 lg:grid-cols-2",
      columns === 3 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
      className
    )}>
      {children}
    </div>
  )
}