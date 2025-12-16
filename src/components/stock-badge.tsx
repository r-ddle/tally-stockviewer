import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from "lucide-react"
import type { Availability } from "@/lib/domain"

const CONFIG: Record<
  Availability,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  IN_STOCK: {
    label: "In Stock",
    className: "bg-success/10 text-success border-success/20",
    icon: CheckCircle2,
  },
  OUT_OF_STOCK: {
    label: "Out of Stock",
    className: "bg-muted text-muted-foreground border-border",
    icon: XCircle,
  },
  NEGATIVE: {
    label: "Negative",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: AlertTriangle,
  },
  UNKNOWN: {
    label: "Unknown",
    className: "bg-warning/10 text-warning border-warning/20",
    icon: HelpCircle,
  },
}

export function StockBadge({
  availability,
  showIcon = false,
  size = "default",
}: {
  availability: Availability
  showIcon?: boolean
  size?: "default" | "large" | "small"
}) {
  const config = CONFIG[availability]
  const Icon = config.icon

  if (size === "large") {
    return (
      <Badge
        variant="outline"
        className={cn("font-medium gap-2 px-3 py-1.5 text-sm rounded-lg", config.className)}
      >
        <Icon className="h-4 w-4" />
        {config.label}
      </Badge>
    )
  }

  if (size === "small") {
    return (
      <Badge
        variant="outline"
        className={cn("font-medium text-[10px] rounded px-1.5 py-0", config.className)}
      >
        {config.label}
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn("font-medium gap-1 text-xs rounded-md px-2 py-0.5", config.className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}
