import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const planBadgeVariants = cva(
  "inline-flex items-center justify-center text-xs font-bold px-2.5 py-1 rounded-full border shadow-sm transition-all duration-300",
  {
    variants: {
      plan: {
        free: "bg-muted text-muted-foreground border-border",
        beginner: "bg-slate-200 text-slate-700 border-slate-300",
        chef: "bg-yellow-200 text-yellow-800 border-yellow-300",
        unlimited: "bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white border-blue-400 shadow-diamond animate-shimmer-diamond relative overflow-hidden",
        admin: "bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 text-white border-purple-400 shadow-lg"
      }
    },
    defaultVariants: {
      plan: "free"
    }
  }
)

export interface PlanBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof planBadgeVariants> {
  plan: "free" | "beginner" | "chef" | "unlimited" | "admin"
}

function PlanBadge({ className, plan, children, ...props }: PlanBadgeProps) {
  const getPlanLabel = (planType: string) => {
    switch (planType) {
      case "beginner": return "Beginner"
      case "chef": return "Chef"
      case "unlimited": return "💎 Unlimited"
      case "admin": return "👑 Admin"
      default: return "Free"
    }
  }

  return (
    <div className={cn(planBadgeVariants({ plan }), className)} {...props}>
      {children || getPlanLabel(plan)}
    </div>
  )
}

export { PlanBadge, planBadgeVariants }