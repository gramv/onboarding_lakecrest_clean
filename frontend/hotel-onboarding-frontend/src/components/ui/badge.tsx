import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-hotel-primary to-hotel-primary-light text-white hover:from-hotel-primary-dark hover:to-hotel-primary shadow-md hover:shadow-lg",
        secondary:
          "border-transparent bg-hotel-neutral-100 text-hotel-neutral-800 hover:bg-hotel-neutral-200 ring-1 ring-hotel-neutral-200",
        destructive:
          "border-transparent bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md",
        outline: 
          "border-2 border-hotel-neutral-300 bg-white text-hotel-neutral-700 hover:border-hotel-primary hover:bg-hotel-primary hover:text-white",
        success:
          "border-transparent bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md",
        warning:
          "border-transparent bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-md",
        info:
          "border-transparent bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }