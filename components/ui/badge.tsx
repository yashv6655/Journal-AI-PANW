import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[hsl(var(--color-primary))] text-white shadow hover:bg-[hsl(var(--color-primary-dark))]",
        secondary:
          "border-transparent bg-[hsl(var(--color-secondary))] text-white",
        destructive:
          "border-transparent bg-[hsl(var(--color-error))] text-white shadow hover:bg-[hsl(var(--color-error))]/90",
        outline: "text-foreground border-[hsl(var(--color-border))]",
        positive:
          "border-transparent bg-[hsl(var(--color-positive))] text-white",
        neutral:
          "border-transparent bg-[hsl(var(--color-neutral))] text-white",
        negative:
          "border-transparent bg-[hsl(var(--color-negative))] text-white",
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
