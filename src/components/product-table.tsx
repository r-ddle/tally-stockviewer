"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { StockBadge } from "@/components/stock-badge"
import type { Availability } from "@/lib/domain"
import { ChevronLeft, ChevronRight, Package, Loader2, Pencil, X, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ownerHeaders } from "@/lib/owner"
import { cn } from "@/lib/utils"

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
}

interface ProductTableProps {
  items: ProductRow[]
  loading: boolean
  formatQty: (qty: number | null, unit: string | null) => string
  formatMoney: (value: number | null) => string
  computeDerivedPrices: (dealerPrice: number | null) => DerivedPrices
  onRowClick: (item: ProductRow) => void
  canEditPrices: boolean
  ownerToken: string | null
  onDealerPriceSaved: (id: string, newPrice: number | null) => void
  onError?: (message: string) => void
}

const PAGE_SIZE = 50

export function ProductTable({
  items,
  loading,
  formatQty,
  formatMoney,
  computeDerivedPrices,
  onRowClick,
  canEditPrices,
  ownerToken,
  onDealerPriceSaved,
  onError,
}: ProductTableProps) {
  const [page, setPage] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>("")
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    setPage(0)
  }, [items.length])

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
      <div className="flex flex-col items-center justify-center py-16 md:py-16 text-muted-foreground">
        <div className="h-12 w-12 md:h-8 md:w-8 animate-spin rounded-full border-4 md:border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-lg md:text-sm font-medium">Loading products...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="flex h-20 w-20 md:h-16 md:w-16 items-center justify-center rounded-full bg-muted">
          <Package className="h-10 w-10 md:h-8 md:w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg md:text-sm font-semibold">No products found</h3>
        <p className="mt-2 text-base md:text-sm text-muted-foreground">
          Try adjusting your filters or import some data.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border">
        <Table className="min-w-[980px] text-xs">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="sticky left-0 z-20 bg-muted/50 font-semibold border-r border-border/60">
                Product
              </TableHead>
              <TableHead className="font-semibold">Brand</TableHead>
              <TableHead className="text-right font-semibold">Qty</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Dealer</TableHead>
              <TableHead className="text-right font-semibold">Retail</TableHead>
              <TableHead className="text-right font-semibold">Daraz</TableHead>
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
                  onClick={() => onRowClick(item)}
                  className={cn("cursor-pointer transition-colors hover:bg-muted/50", isEditing && "bg-muted/30")}
                >
                  <TableCell className="sticky left-0 z-10 bg-card font-medium max-w-[420px] border-r border-border/60">
                    <div className="truncate">{item.name}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px]">
                    <div className="truncate">{item.brand ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatQty(item.stockQty, item.unit)}</TableCell>
                  <TableCell>
                    <StockBadge availability={item.availability} />
                  </TableCell>
                  <TableCell
                    className={cn("text-right font-mono", canEditPrices && "group")}
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
                        <span>{formatMoney(item.dealerPrice)}</span>
                        {canEditPrices ? (
                          <Pencil className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(derived.retailPrice)}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(derived.darazPrice)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-border pt-4">
          <p className="text-base md:text-sm text-muted-foreground order-2 md:order-1">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, items.length)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{items.length.toLocaleString("en-IN")}</span>
          </p>
          <div className="flex items-center gap-3 order-1 md:order-2 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex-1 md:flex-none h-14 md:h-9 text-base md:text-sm font-semibold rounded-2xl md:rounded-md gap-2 bg-transparent active:scale-[0.98] transition-transform"
            >
              <ChevronLeft className="h-5 w-5 md:h-4 md:w-4" />
              Previous
            </Button>
            <span className="text-base md:text-sm text-muted-foreground px-2 whitespace-nowrap">
              <span className="font-semibold text-foreground">{page + 1}</span> / {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex-1 md:flex-none h-14 md:h-9 text-base md:text-sm font-semibold rounded-2xl md:rounded-md gap-2 bg-transparent active:scale-[0.98] transition-transform"
            >
              Next
              <ChevronRight className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
