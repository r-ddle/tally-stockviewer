"use client"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { StockBadge, type Availability } from "@/components/stock-badge"
import { ChevronLeft, ChevronRight, Package } from "lucide-react"

type ProductRow = {
  id: string
  name: string
  brand: string | null
  stockQty: number | null
  unit: string | null
  availability: Availability
  dealerPrice: number | null
}

type DerivedPrices = {
  retailPrice: number | null
  darazPrice: number | null
  customerPrice: number | null
  institutionPrice: number | null
}

interface ProductTableProps {
  items: ProductRow[]
  loading: boolean
  formatQty: (qty: number | null, unit: string | null) => string
  formatMoney: (value: number | null) => string
  computeDerivedPrices: (dealerPrice: number | null) => DerivedPrices
  onRowClick: (item: ProductRow) => void
}

const PAGE_SIZE = 50

export function ProductTable({
  items,
  loading,
  formatQty,
  formatMoney,
  computeDerivedPrices,
  onRowClick,
}: ProductTableProps) {
  const [page, setPage] = useState(0)

  // Reset page when items change
  useMemo(() => {
    setPage(0)
  }, [items.length])

  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paginatedItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-sm">Loading products...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-sm font-medium">No products found</h3>
        <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or import some data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[28%] font-semibold">Product</TableHead>
              <TableHead className="w-[12%] font-semibold">Brand</TableHead>
              <TableHead className="w-[8%] text-right font-semibold">Qty</TableHead>
              <TableHead className="w-[10%] font-semibold">Status</TableHead>
              <TableHead className="w-[10%] text-right font-semibold">Dealer</TableHead>
              <TableHead className="w-[10%] text-right font-semibold">Retail</TableHead>
              <TableHead className="w-[10%] text-right font-semibold">Daraz</TableHead>
              <TableHead className="w-[12%] text-right font-semibold">Customer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => {
              const derived = computeDerivedPrices(item.dealerPrice)
              return (
                <TableRow
                  key={item.id}
                  onClick={() => onRowClick(item)}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.brand ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatQty(item.stockQty, item.unit)}</TableCell>
                  <TableCell>
                    <StockBadge availability={item.availability} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatMoney(item.dealerPrice)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatMoney(derived.retailPrice)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatMoney(derived.darazPrice)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatMoney(derived.customerPrice)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedItems.map((item) => {
          const derived = computeDerivedPrices(item.dealerPrice)
          return (
            <div
              key={item.id}
              onClick={() => onRowClick(item)}
              className="rounded-lg border border-border bg-card p-4 cursor-pointer active:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.brand ?? "No brand"}</p>
                </div>
                <StockBadge availability={item.availability} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Qty:</span>{" "}
                  <span className="font-mono">{formatQty(item.stockQty, item.unit)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Dealer:</span>{" "}
                  <span className="font-mono">{formatMoney(item.dealerPrice)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Retail:</span>{" "}
                  <span className="font-mono">{formatMoney(derived.retailPrice)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Daraz:</span>{" "}
                  <span className="font-mono">{formatMoney(derived.darazPrice)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, items.length)} of{" "}
            {items.length.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
