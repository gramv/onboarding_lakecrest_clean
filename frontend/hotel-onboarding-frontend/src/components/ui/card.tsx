import * as React from "react"

import { cn } from "@/lib/utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "enhanced" | "elevated"
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const baseClasses = "rounded-xl border bg-white text-gray-900 transition-all duration-300 ease-in-out dark:border-hotel-neutral-800 dark:bg-hotel-neutral-900 dark:text-hotel-neutral-50"
    
    const variantClasses = {
      default: "border-hotel-neutral-200 shadow-sm hover:shadow-md card-transition",
      enhanced: "card-elevated-enhanced",
      elevated: "card-elevated-enhanced"
    }

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "enhanced"
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantClasses = {
      default: "flex flex-col space-y-1 sm:space-y-2 p-4 sm:p-6",
      enhanced: "card-header-enhanced"
    }

    return (
      <div
        ref={ref}
        className={cn(variantClasses[variant], className)}
        {...props}
      />
    )
  }
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-lg sm:text-xl lg:text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-hotel-neutral-50", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm sm:text-base text-gray-600 leading-relaxed font-medium dark:text-hotel-neutral-400", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "enhanced"
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantClasses = {
      default: "p-4 sm:p-6 pt-0",
      enhanced: "card-content-enhanced"
    }

    return (
      <div
        ref={ref}
        className={cn(variantClasses[variant], className)}
        {...props}
      />
    )
  }
)
CardContent.displayName = "CardContent"

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "enhanced"
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantClasses = {
      default: "flex items-center p-4 sm:p-6 pt-0",
      enhanced: "card-footer-enhanced"
    }

    return (
      <div
        ref={ref}
        className={cn(variantClasses[variant], className)}
        {...props}
      />
    )
  }
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
