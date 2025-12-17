"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { ArrowDown, AlertTriangle, Sparkles, Tag } from "lucide-react"

export type ProductChange = {
  id: string
  productId: string
  name: string
  brand: string | null
  changeType: "NEW_PRODUCT" | "STOCK_DROP" | "OUT_OF_STOCK" | "PRICE_CHANGE"
  fromQty: number | null
  toQty: number | null
  fromAvailability: "IN_STOCK" | "OUT_OF_STOCK" | "NEGATIVE" | "UNKNOWN" | null
  toAvailability: "IN_STOCK" | "OUT_OF_STOCK" | "NEGATIVE" | "UNKNOWN" | null
  fromPrice: number | null
  toPrice: number | null
  createdAt: number
}

function formatDelta(change: ProductChange) {
  if (change.changeType === "NEW_PRODUCT") return "New product"
  if (change.changeType === "OUT_OF_STOCK") return "Now out of stock"
  if (change.changeType === "PRICE_CHANGE") {
    const from = change.fromPrice ?? 0
    const to = change.toPrice ?? 0
    if (from === to) return "Price updated"
    return `Price ${from.toLocaleString("en-IN")} → ${to.toLocaleString("en-IN")}`
  }
  const from = change.fromQty ?? 0
  const to = change.toQty ?? 0
  return `Qty ${from.toLocaleString("en-IN")} → ${to.toLocaleString("en-IN")}`
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins || 0}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function RecentChangesPanel({ limit = 20 }: { limit?: number }) {
  const [items, setItems] = useState<ProductChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/changes?limit=${limit}`, { cache: "no-store" })
        const body = (await res.json()) as { items: ProductChange[] }
        if (!cancelled) setItems(body.items ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load recent changes")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [limit])

  const grouped = useMemo(() => items.slice(0, limit), [items, limit])

  return (
    <Card className="border-border bg-card overflow-auto">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Recent Changes</h3>
          <p className="text-xs text-muted-foreground">Latest stock and price updates</p>
        </div>
        <Badge variant="outline" className="rounded-full">
          {items.length}
        </Badge>
      </div>
      <div className="border-t border-border">
        {error ? (
          <div className="px-4 py-6 text-sm text-destructive">{error}</div>
        ) : loading ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
        ) : grouped.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">No recent changes</div>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y divide-border">
              {grouped.map((c) => (
                <li key={c.id} className="px-4 py-3 flex items-start gap-3">
                  <span className={cn("mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full", {
                    "bg-primary/10 text-primary": c.changeType === "NEW_PRODUCT",
                    "bg-amber-100 text-amber-800": c.changeType === "STOCK_DROP",
                    "bg-destructive/10 text-destructive": c.changeType === "OUT_OF_STOCK",
                    "bg-blue-100 text-blue-800": c.changeType === "PRICE_CHANGE",
                  })}>
                    {c.changeType === "NEW_PRODUCT" && <Sparkles className="h-4 w-4" />}
                    {c.changeType === "STOCK_DROP" && <ArrowDown className="h-4 w-4" />}
                    {c.changeType === "OUT_OF_STOCK" && <AlertTriangle className="h-4 w-4" />}
                    {c.changeType === "PRICE_CHANGE" && <Tag className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.brand ?? "No brand"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-foreground">{formatDelta(c)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </div>
    </Card>
  )
}
