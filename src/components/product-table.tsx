"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { StockBadge } from "@/components/stock-badge"
import type { Availability } from "@/lib/domain"
import { ChevronLeft, ChevronRight, Package, Loader2, Pencil, X, Check, ChevronDown, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ownerHeaders } from "@/lib/owner"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/lib/use-is-mobile"

type ProductRow = {
  id: string
  name: string
  brand: string | null
  stockQty: number | null
  unit: string | null
  availability: Availability
  lastSeenAt: number | null
  updatedAt: number
  dealerPrice: number | null
}

type DerivedPrices = {
  retailPrice: number | null
  darazPrice: number | null
  customerPrice: number | null
  discountPercent: number
}

interface ProductTableProps {
  items: ProductRow[]
  loading: boolean
  formatQty: (qty: number | null, unit: string | null) => string
  formatMoney: (value: number | null) => string
  computeDerivedPrices: (dealerPrice: number | null) => DerivedPrices
  onRowClick: (item: ProductRow) => void
  onEditPrice?: (item: ProductRow) => void
  canEditPrices: boolean
  ownerToken: string | null
  onDealerPriceSaved: (id: string, newPrice: number | null) => void
  onError?: (message: string) => void
  searchActive?: boolean
}

const PAGE_SIZE = 50

export function ProductTable({
  items,
  loading,
  formatQty,
  formatMoney,
  computeDerivedPrices,
  onRowClick,
  onEditPrice,
  canEditPrices,
  ownerToken,
  onDealerPriceSaved,
  onError,
  searchActive = false,
}: ProductTableProps) {
  const isMobile = useIsMobile()
  const [page, setPage] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setPage(0)
    // Auto-expand first item when search is active
    if (searchActive && items.length > 0) {
      setExpandedId(items[0]?.id ?? null)
    } else {
      setExpandedId(null)
    }
  }, [items.length, searchActive])

  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paginatedItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const beginEdit = (item: ProductRow) => {
    if (!canEditPrices) return
    setEditingId(item.id)
    setEditingValue(item.dealerPrice == null || !Number.isFinite(item.dealerPrice) ? "" : String(item.dealerPrice))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingValue("")
    setSavingId(null)
  }

  const saveEdit = async (id: string) => {
    if (!canEditPrices) return
    setSavingId(id)
    try {
      const cleaned = editingValue.replace(/,/g, "").trim()
      const parsed = cleaned === "" ? null : Number.parseFloat(cleaned)
      const dealerPrice = parsed != null && Number.isFinite(parsed) ? parsed : null
      const res = await fetch(`/api/products/${id}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...ownerHeaders(ownerToken) },
        body: JSON.stringify({ dealerPrice }),
      })
      const body = (await res.json()) as { ok: boolean; error?: string; dealerPrice?: number | null }
      if (!body.ok) throw new Error(body.error ?? "Failed to save price.")
      onDealerPriceSaved(id, body.dealerPrice ?? null)
      cancelEdit()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save price."
      onError?.(message)
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-sm">Loading products...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Package className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base font-medium">No products found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your filters or import some data.
        </p>
      </div>
    )
  }

  // Mobile: Card-based view with expandable inline details
  if (isMobile) {
    return (
      <div className="space-y-0">
        <div className="divide-y divide-border">
          {paginatedItems.map((item) => {
            const isExpanded = expandedId === item.id
            const derived = computeDerivedPrices(item.dealerPrice)

            return (
              <div key={item.id} className="bg-card">
                {/* Main row - always visible */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {item.brand ?? "No brand"} · {formatQty(item.stockQty, item.unit)}
                    </p>
                  </div>
                  <StockBadge availability={item.availability} size="small" />
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                    isExpanded && "rotate-180"
                  )} />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 bg-muted/30">
                    {/* Price grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-card rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Dealer</p>
                        <p className="text-sm font-semibold tabular-nums text-primary">{formatMoney(item.dealerPrice)}</p>
                      </div>
                      <div className="bg-card rounded-lg p-2.5 text-center border border-border">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Retail</p>
                        <p className="text-sm font-semibold tabular-nums">{formatMoney(derived.retailPrice)}</p>
                      </div>
                      <div className="bg-card rounded-lg p-2.5 text-center border border-primary/50">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Customer</p>
                        <p className="text-sm font-semibold tabular-nums text-primary">{formatMoney(derived.customerPrice)}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRowClick(item)}
                        className="flex-1 h-9 rounded-lg text-xs"
                      >
                        View Details
                      </Button>
                      {canEditPrices && (
                        <Button
                          size="sm"
                          onClick={() => onEditPrice?.(item)}
                          className="flex-1 h-9 rounded-lg text-xs gap-1"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit Price
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border">
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
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {page + 1}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop: Table view
  return (
    <div className="space-y-0">
      {/* Horizontal scroll wrapper for mobile */}
      <div className="overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="sticky left-0 z-20 bg-muted/30 font-medium w-[280px] md:w-[320px]">
                Product
              </TableHead>
              <TableHead className="font-medium w-[140px]">Brand</TableHead>
              <TableHead className="font-medium text-right w-[100px]">Qty</TableHead>
              <TableHead className="font-medium w-[100px]">Status</TableHead>
              <TableHead className="font-medium text-right w-[110px]">Dealer</TableHead>
              <TableHead className="font-medium text-right w-[110px]">Retail</TableHead>
              <TableHead className="font-medium text-right w-[110px]">Customer</TableHead>
              <TableHead className="font-medium text-center w-[60px]">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => {
              const isEditing = editingId === item.id
              const cleaned = isEditing ? editingValue.replace(/,/g, "").trim() : ""
              const editingParsed = isEditing && cleaned !== "" ? Number.parseFloat(cleaned) : item.dealerPrice
              const derived = computeDerivedPrices(
                isEditing && Number.isFinite(editingParsed as number) ? (editingParsed as number) : item.dealerPrice,
              )

              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    "transition-colors hover:bg-muted/30",
                    isEditing && "bg-primary/5"
                  )}
                >
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">
                    <div className="truncate max-w-[250px] md:max-w-[300px]">{item.name}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="truncate max-w-[120px]">{item.brand ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatQty(item.stockQty, item.unit)}</TableCell>
                  <TableCell>
                    <StockBadge availability={item.availability} />
                  </TableCell>
                  <TableCell
                    className={cn("text-right tabular-nums", canEditPrices && "group")}
                    onClick={(e) => {
                      if (!canEditPrices) return
                      e.stopPropagation()
                      if (!isEditing) beginEdit(item)
                    }}
                  >
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          inputMode="decimal"
                          className="h-7 w-[120px] px-2 font-mono text-xs"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveEdit(item.id)
                            if (e.key === "Escape") cancelEdit()
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            void saveEdit(item.id)
                          }}
                          disabled={savingId === item.id}
                        >
                          {savingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            cancelEdit()
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold text-primary">{formatMoney(item.dealerPrice)}</span>
                        {canEditPrices ? (
                          <Pencil className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(derived.retailPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums text-primary font-semibold">{formatMoney(derived.customerPrice)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRowClick(item)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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
              className="h-8 px-3 rounded-lg gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 px-3 rounded-lg gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
