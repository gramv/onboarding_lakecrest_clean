import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] transform hover:scale-[1.02]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 focus-visible:ring-blue-500/25 border-0",
        enhanced:
          "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 focus-visible:ring-blue-500/25 border-0",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 focus-visible:ring-red-500/25",
        outline:
          "border-2 border-blue-600 bg-transparent text-blue-600 shadow-sm hover:bg-blue-600 hover:text-white focus-visible:ring-blue-500/25",
        secondary:
          "bg-white border-2 border-gray-300 text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 focus-visible:ring-gray-400/25",
        ghost:
          "text-hotel-neutral-700 hover:bg-hotel-neutral-100 hover:text-hotel-primary focus-visible:ring-hotel-primary/20 rounded-xl px-4 py-2 min-h-[48px]",
        link:
          "text-hotel-primary underline-offset-4 hover:underline focus-visible:ring-hotel-primary/20 px-2 py-1 min-h-[48px]",
        success:
          "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md hover:shadow-lg hover:from-green-600 hover:to-green-700 focus-visible:ring-green-500/25 h-12 min-h-[48px] px-8 py-3 rounded-xl",
        warning:
          "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md hover:shadow-lg hover:from-amber-600 hover:to-amber-700 focus-visible:ring-amber-500/25 h-12 min-h-[48px] px-8 py-3 rounded-xl",
        "legacy-default":
          "bg-gradient-to-r from-hotel-primary to-hotel-primary-light text-white shadow-md hover:shadow-lg hover:from-hotel-primary-dark hover:to-hotel-primary focus-visible:ring-hotel-primary/30",
        "legacy-outline":
          "border-2 border-hotel-neutral-300 bg-white text-hotel-neutral-700 shadow-sm hover:shadow-md hover:bg-hotel-neutral-50 hover:border-hotel-primary hover:text-hotel-primary focus-visible:ring-hotel-primary/20",
        "legacy-secondary":
          "bg-hotel-neutral-100 text-hotel-neutral-900 shadow-sm hover:shadow-md hover:bg-hotel-neutral-200 focus-visible:ring-hotel-neutral-500/20",
      },
      size: {
        default: "h-12 min-h-[48px] px-8 py-3 text-base rounded-xl",
        sm: "h-9 min-h-[48px] px-4 py-2 text-sm rounded-lg",
        lg: "h-14 min-h-[48px] px-10 py-4 text-lg rounded-xl",
        xl: "h-16 min-h-[48px] px-12 py-5 text-xl rounded-2xl",
        icon: "h-12 w-12 min-h-[48px] min-w-[48px] rounded-xl",
        "legacy-default": "h-11 min-h-[48px] px-6 py-3 text-sm",
        "legacy-sm": "h-9 min-h-[48px] px-4 py-2 text-xs rounded-md",
        "legacy-lg": "h-12 min-h-[48px] px-8 py-4 text-base rounded-xl",
        "legacy-icon": "h-11 w-11 min-h-[48px] min-w-[48px] rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
