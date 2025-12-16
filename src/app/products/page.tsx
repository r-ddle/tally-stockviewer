"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ProductTable } from "@/components/product-table"
import { ProductDetailSheet } from "@/components/product-detail-sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { computeDerivedPrices, formatMoney, formatQty } from "@/lib/pricing"
import type { Availability } from "@/lib/domain"
import { RefreshCcw, Search, X, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthContext } from "@/components/auth-provider"

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

type SortKey = "name" | "qty" | "dealerPrice" | "retail" | "daraz"

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
  const auth = useAuthContext()
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

  const hasFilters = search || brand !== "all" || availability !== "all"
  const clearFilters = () => {
    setSearch("")
    setBrand("all")
    setAvailability("all")
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 md:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Products
          </h1>
          <p className="mt-1 text-muted-foreground">
            <span className="font-medium text-foreground">{filtered.length.toLocaleString("en-IN")}</span>
            {filtered.length !== items.length && ` of ${items.length.toLocaleString("en-IN")}`} products
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={loading}
          className="gap-2 h-10 rounded-xl shrink-0"
        >
          <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Search and filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10 h-11 rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters:</span>
          </div>

          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="w-[150px] h-9 rounded-lg">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              <SelectItem value="__unknown__">(No Brand)</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={availability} onValueChange={(v) => setAvailability(v as "all" | Availability)}>
            <SelectTrigger className="w-[140px] h-9 rounded-lg">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="IN_STOCK">In Stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
              <SelectItem value="NEGATIVE">Negative</SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden sm:flex items-center gap-2 border-l border-border pl-3">
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[130px] h-9 rounded-lg">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="qty">Quantity</SelectItem>
                <SelectItem value="dealerPrice">Dealer</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="h-9 px-3 rounded-lg"
            >
              {sortDir === "asc" ? "A→Z" : "Z→A"}
            </Button>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Active filter badges */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {search && (
              <Badge variant="secondary" className="gap-1.5 rounded-full px-3">
                &quot;{search}&quot;
                <button onClick={() => setSearch("")}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {brand !== "all" && (
              <Badge variant="secondary" className="gap-1.5 rounded-full px-3">
                {brand === "__unknown__" ? "No Brand" : brand}
                <button onClick={() => setBrand("all")}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {availability !== "all" && (
              <Badge variant="secondary" className="gap-1.5 rounded-full px-3">
                {availability.replace("_", " ")}
                <button onClick={() => setAvailability("all")}><X className="h-3 w-3" /></button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Products table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <ProductTable
          items={filtered}
          loading={loading}
          formatQty={formatQty}
          formatMoney={formatMoney}
          computeDerivedPrices={computeDerivedPrices}
          onRowClick={openItem}
          canEditPrices={auth.isOwner}
          ownerToken={auth.token}
          onDealerPriceSaved={handlePriceSaved}
          onError={(m) => setError(m)}
        />
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
        canEditPrices={auth.isOwner}
        ownerToken={auth.token}
      />
    </div>
  )
}
