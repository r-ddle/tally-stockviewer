"use client"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { StockBadge, type Availability } from "@/components/stock-badge"
import { ChevronLeft, ChevronRight, Package, ChevronRightIcon } from "lucide-react"

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
const MOBILE_PAGE_SIZE = 20

export function ProductTable({
  items,
  loading,
  formatQty,
  formatMoney,
  computeDerivedPrices,
  onRowClick,
}: ProductTableProps) {
  const [page, setPage] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useMemo(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768)
    }
  }, [])

  useMemo(() => {
    setPage(0)
  }, [items.length])

  const pageSize = isMobile ? MOBILE_PAGE_SIZE : PAGE_SIZE
  const totalPages = Math.ceil(items.length / pageSize)
  const paginatedItems = items.slice(page * pageSize, (page + 1) * pageSize)

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

      <div className="md:hidden space-y-3">
        {paginatedItems.map((item) => {
          const derived = computeDerivedPrices(item.dealerPrice)
          return (
            <button
              key={item.id}
              onClick={() => onRowClick(item)}
              className="w-full text-left rounded-2xl border-2 border-border bg-card p-5 active:bg-muted/50 active:scale-[0.99] transition-all shadow-sm"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold leading-tight text-balance">{item.name}</h3>
                  <p className="text-base text-muted-foreground mt-1">{item.brand ?? "No brand"}</p>
                </div>
                <ChevronRightIcon className="h-6 w-6 text-muted-foreground shrink-0 mt-1" />
              </div>

              {/* Status and quantity row */}
              <div className="flex items-center justify-between mt-4">
                <StockBadge availability={item.availability} size="large" />
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="text-xl font-bold font-mono">{formatQty(item.stockQty, item.unit)}</p>
                </div>
              </div>

              {/* Price grid */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Dealer</p>
                  <p className="text-lg font-bold font-mono text-primary">{formatMoney(item.dealerPrice)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Retail</p>
                  <p className="text-lg font-bold font-mono">{formatMoney(derived.retailPrice)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Daraz</p>
                  <p className="text-lg font-bold font-mono">{formatMoney(derived.darazPrice)}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-border pt-4">
          <p className="text-base md:text-sm text-muted-foreground order-2 md:order-1">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, items.length)}
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
