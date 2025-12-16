import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Availability = "IN_STOCK" | "OUT_OF_STOCK" | "NEGATIVE" | "UNKNOWN";

const LABEL: Record<Availability, string> = {
  IN_STOCK: "In Stock",
  OUT_OF_STOCK: "Out of Stock",
  NEGATIVE: "Negative",
  UNKNOWN: "Unknown",
};

export function StockBadge({ availability }: { availability: Availability }) {
  const className =
    availability === "IN_STOCK"
      ? "bg-emerald-600 text-white hover:bg-emerald-600"
      : availability === "OUT_OF_STOCK"
        ? "bg-muted text-foreground hover:bg-muted"
        : availability === "NEGATIVE"
          ? "bg-rose-600 text-white hover:bg-rose-600"
          : "bg-amber-500 text-white hover:bg-amber-500";

  return (
    <Badge className={cn("whitespace-nowrap", className)}>
      {LABEL[availability]}
    </Badge>
  );
}

