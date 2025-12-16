"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ImportControls } from "@/components/import-controls"
import { DataTableToolbar, type SortKey } from "@/components/data-table-toolbar"
import { ProductTable } from "@/components/product-table"
import { ProductDetailSheet } from "@/components/product-detail-sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { computeDerivedPrices, formatMoney, formatQty } from "@/lib/pricing"
import type { Availability } from "@/lib/domain"
import { RefreshCcw, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/lib/use-is-mobile"
import { useOwner } from "@/lib/owner"

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

function compareNullableNumber(a: number | null, b: number | null) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a - b
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" })
  return (await res.json()) as T
}

export default function ProductsPage() {
  const isMobile = useIsMobile()
  const owner = useOwner()
  const [items, setItems] = useState<ProductRow[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [brand, setBrand] = useState<string>("all")
  const [availability, setAvailability] = useState<"all" | Availability>("all")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const [selected, setSelected] = useState<ProductRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [importExpanded, setImportExpanded] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [p, b] = await Promise.all([
        getJson<{ items: ProductRow[] }>("/api/products?limit=20000"),
        getJson<{ brands: string[] }>("/api/brands"),
      ])
      setItems(p.items)
      setBrands(b.brands)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let result = items
    if (q) {
      result = result.filter((it) => `${it.name} ${it.brand ?? ""}`.toLowerCase().includes(q))
    }
    if (brand !== "all") {
      result = brand === "__unknown__" ? result.filter((it) => !it.brand) : result.filter((it) => it.brand === brand)
    }
    if (availability !== "all") {
      result = result.filter((it) => it.availability === availability)
    }

    const sorted = [...result].sort((a, b) => {
      let cmp = 0
      if (sortKey === "name") cmp = a.name.localeCompare(b.name)
      else if (sortKey === "qty") cmp = compareNullableNumber(a.stockQty, b.stockQty)
      else if (sortKey === "dealerPrice") cmp = compareNullableNumber(a.dealerPrice, b.dealerPrice)
      else if (sortKey === "retail")
        cmp = compareNullableNumber(
          computeDerivedPrices(a.dealerPrice).retailPrice,
          computeDerivedPrices(b.dealerPrice).retailPrice,
        )
      else
        cmp = compareNullableNumber(
          computeDerivedPrices(a.dealerPrice).darazPrice,
          computeDerivedPrices(b.dealerPrice).darazPrice,
        )
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [availability, brand, items, search, sortDir, sortKey])

  const openItem = (item: ProductRow) => {
    setSelected(item)
    setSheetOpen(true)
  }

  const handlePriceSaved = (id: string, newPrice: number | null) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, dealerPrice: newPrice } : p)))
    setSelected((prev) => (prev?.id === id ? { ...prev, dealerPrice: newPrice } : prev))
  }

  const canEditPrices = owner.isOwner && !isMobile

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5 md:space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2 md:space-y-1">
          <h1 className="text-3xl md:text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-base md:text-sm text-muted-foreground">
            Dealer prices are stored locally and never overwritten.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refresh()}
          disabled={loading}
          className="h-14 md:h-10 text-base md:text-sm font-semibold rounded-2xl md:rounded-md gap-2 bg-transparent shrink-0 active:scale-[0.98] transition-transform"
        >
          <RefreshCcw className={cn("h-5 w-5 md:h-4 md:w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Collapsible import section - hidden by default on mobile */}
      {canEditPrices ? (
        <Card className="hidden md:block">
        <button
          onClick={() => setImportExpanded(!importExpanded)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
        >
          <span className="font-medium">Import Data</span>
          {importExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {importExpanded && (
          <CardContent className="pt-0 pb-4">
            <ImportControls
              compact
              onImported={() => {
                refresh().catch(() => {})
              }}
            />
          </CardContent>
        )}
        </Card>
      ) : null}

      {/* Error display */}
      {error && (
        <div className="rounded-2xl md:rounded-lg bg-destructive/10 border-2 md:border border-destructive/30 px-5 md:px-4 py-4 md:py-3 text-base md:text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {/* Filters toolbar */}
      <Card className="border-2 md:border">
        <CardContent className="p-4">
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            brand={brand}
            onBrandChange={setBrand}
            brands={brands}
            availability={availability}
            onAvailabilityChange={setAvailability}
            sortKey={sortKey}
            onSortKeyChange={setSortKey}
            sortDir={sortDir}
            onSortDirChange={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            totalCount={items.length}
            filteredCount={filtered.length}
          />
        </CardContent>
      </Card>

      {/* Data table */}
      <div className="border-2 md:border rounded-2xl md:rounded-lg bg-card">
        <div className="p-0 md:p-4">
          <ProductTable
            items={filtered}
            loading={loading}
            formatQty={formatQty}
            formatMoney={formatMoney}
            computeDerivedPrices={computeDerivedPrices}
            onRowClick={openItem}
            canEditPrices={canEditPrices}
            ownerToken={owner.token}
            onDealerPriceSaved={handlePriceSaved}
            onError={(m) => setError(m)}
          />
        </div>
      </div>

      {/* Product detail sheet */}
      <ProductDetailSheet
        product={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        formatQty={formatQty}
        formatMoney={formatMoney}
        computeDerivedPrices={computeDerivedPrices}
        onPriceSaved={handlePriceSaved}
        canEditPrices={canEditPrices}
        ownerToken={owner.token}
      />
    </main>
  )
}
