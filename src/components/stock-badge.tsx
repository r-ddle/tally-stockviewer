import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from "lucide-react"

export type Availability = "IN_STOCK" | "OUT_OF_STOCK" | "NEGATIVE" | "UNKNOWN"

const CONFIG: Record<Availability, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  IN_STOCK: {
    label: "In Stock",
    className: "bg-success/15 text-success border-success/30 hover:bg-success/20",
    icon: CheckCircle2,
  },
  OUT_OF_STOCK: {
    label: "Out of Stock",
    className: "bg-muted text-muted-foreground border-border hover:bg-muted",
    icon: XCircle,
  },
  NEGATIVE: {
    label: "Negative",
    className: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20",
    icon: AlertTriangle,
  },
  UNKNOWN: {
    label: "Unknown",
    className: "bg-warning/15 text-warning border-warning/30 hover:bg-warning/20",
    icon: HelpCircle,
  },
}

export function StockBadge({ availability, showIcon = false }: { availability: Availability; showIcon?: boolean }) {
  const config = CONFIG[availability]
  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn("whitespace-nowrap font-medium gap-1.5", config.className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}
