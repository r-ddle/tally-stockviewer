"use client"

import { useEffect, useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useIsMobile } from "@/lib/use-is-mobile"
import type { Availability } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { CalendarClock, Loader2, ListChecks, Minus, MoveDownRight } from "lucide-react"

export type ActivityItem = {
  id: string
  productId: string
  name: string
  brand: string | null
  changeType: "NEW_PRODUCT" | "STOCK_DROP" | "OUT_OF_STOCK" | "PRICE_CHANGE"
  fromQty: number | null
  toQty: number | null
  fromAvailability: Availability | null
  toAvailability: Availability | null
  fromPrice: number | null
  toPrice: number | null
  createdAt: number
}

const PAGE_SIZE = 50

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatQty(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—"
  return value.toLocaleString("en-IN")
}

function formatMoney(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—"
  return value.toLocaleString("en-IN", { style: "currency", currency: "PKR", maximumFractionDigits: 0 })
}

function changeLabel(changeType: ActivityItem["changeType"]) {
  switch (changeType) {
    case "NEW_PRODUCT":
      return { label: "New product", color: "bg-primary/10 text-primary" }
    case "STOCK_DROP":
      return { label: "Stock drop", color: "bg-amber-100 text-amber-800" }
    case "OUT_OF_STOCK":
      return { label: "Out of stock", color: "bg-destructive/10 text-destructive" }
    case "PRICE_CHANGE":
      return { label: "Price change", color: "bg-blue-100 text-blue-800" }
    default:
      return { label: "Change", color: "bg-muted text-muted-foreground" }
  }
}

function describeChange(change: ActivityItem) {
  if (change.changeType === "NEW_PRODUCT") return "New product added"
  if (change.changeType === "OUT_OF_STOCK") return "Now out of stock"
  if (change.changeType === "STOCK_DROP") {
    const from = formatQty(change.fromQty)
    const to = formatQty(change.toQty)
    return `Quantity ${from} → ${to}`
  }
  const from = formatMoney(change.fromPrice)
  const to = formatMoney(change.toPrice)
  return from === to ? "Price updated" : `Price ${from} → ${to}`
}

export function ActivityTable({ items, loading }: { items: ActivityItem[]; loading: boolean }) {
  const isMobile = useIsMobile()
  const [page, setPage] = useState(0)

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const paginatedItems = useMemo(() => items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [items, page])

  useEffect(() => {
    setPage(0)
  }, [items.length])

  // Reset to first page if the filtered list shrinks
  if (page > 0 && page >= totalPages) {
    setPage(0)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="mt-3 text-sm">Loading activity…</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <ListChecks className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base font-medium">No activity yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">Stock or price updates will show up here.</p>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="divide-y divide-border">
        {paginatedItems.map((item) => {
          const meta = changeLabel(item.changeType)
          return (
            <Card key={item.id} className="shadow-none rounded-none border-0 border-b">
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("rounded-full px-3", meta.color)}>{meta.label}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-tight truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.brand ?? "No brand"}</p>
                  </div>
                </div>

                <p className="text-sm text-foreground">{describeChange(item)}</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MoveDownRight className="h-3.5 w-3.5" />
                      <span>Stock</span>
                    </div>
                    <div className="font-semibold tabular-nums">
                      {item.fromQty == null && item.toQty == null ? "—" : `${formatQty(item.fromQty)} → ${formatQty(item.toQty)}`}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Minus className="h-3.5 w-3.5" />
                      <span>Price</span>
                    </div>
                    <div className="font-semibold tabular-nums">
                      {item.fromPrice == null && item.toPrice == null ? "—" : `${formatMoney(item.fromPrice)} → ${formatMoney(item.toPrice)}`}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border bg-background">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, items.length)}
              </span>
              {" "}of {items.length.toLocaleString("en-IN")}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 px-3 rounded-lg"
              >
                Prev
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {page + 1}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="h-8 px-3 rounded-lg"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <div className="overflow-x-auto">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-medium w-[120px]">When</TableHead>
              <TableHead className="font-medium w-[160px]">Type</TableHead>
              <TableHead className="font-medium w-[280px]">Change</TableHead>
              <TableHead className="font-medium w-[240px]">Product</TableHead>
              <TableHead className="font-medium w-[140px] text-right">Stock</TableHead>
              <TableHead className="font-medium w-[140px] text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => {
              const meta = changeLabel(item.changeType)
              return (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(item.createdAt)}</TableCell>
                  <TableCell>
                    <Badge className={cn("rounded-full px-3", meta.color)}>{meta.label}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{describeChange(item)}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-medium leading-tight truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.brand ?? "No brand"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.fromQty == null && item.toQty == null ? "—" : `${formatQty(item.fromQty)} → ${formatQty(item.toQty)}`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.fromPrice == null && item.toPrice == null ? "—" : `${formatMoney(item.fromPrice)} → ${formatMoney(item.toPrice)}`}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, items.length)}
            </span>
            {" "}of {items.length.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 px-3 rounded-lg"
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 px-3 rounded-lg"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
