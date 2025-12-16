import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  variant?: "default" | "success" | "warning" | "danger" | "muted"
  className?: string
}

const variantStyles = {
  default: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  danger: "text-destructive bg-destructive/10",
  muted: "text-muted-foreground bg-muted",
}

const mobileVariantStyles = {
  default: "from-primary/20 to-primary/5 border-primary/20",
  success: "from-success/20 to-success/5 border-success/20",
  warning: "from-warning/20 to-warning/5 border-warning/20",
  danger: "from-destructive/20 to-destructive/5 border-destructive/20",
  muted: "from-muted to-muted/50 border-border",
}

export function StatCard({ title, value, icon: Icon, variant = "default", className }: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Desktop layout */}
      <CardContent className="hidden md:block p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {typeof value === "number" ? value.toLocaleString("en-IN") : value}
            </p>
          </div>
          <div className={cn("flex h-20 w-20 shrink-0 items-center justify-center rounded-lg", variantStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>

      <CardContent className={cn("md:hidden p-6", mobileVariantStyles[variant])}>
        <div className="flex flex-col items-center text-center gap-3">
          <div
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-lg",
              variantStyles[variant],
            )}
          >
            <Icon className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              {typeof value === "number" ? value.toLocaleString("en-IN") : value}
            </p>
            <p className="text-base font-medium text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
