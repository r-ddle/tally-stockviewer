"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ProductTable } from "@/components/product-table"
import { ProductDetailSheet } from "@/components/product-detail-sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { computeDerivedPrices, formatMoney, formatQty } from "@/lib/pricing"
import type { Availability } from "@/lib/domain"
import { Search, X, SlidersHorizontal, RefreshCcw, Download, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthContext } from "@/components/auth-provider"
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"

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
  const [filterOpen, setFilterOpen] = useState(false)

  const [selected, setSelected] = useState<ProductRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [focusPriceInput, setFocusPriceInput] = useState(false)

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
    let result = items

    // Apply brand filter
    if (brand !== "all") {
      result = brand === "__unknown__"
        ? result.filter((it) => !it.brand)
        : result.filter((it) => it.brand === brand)
    }

    // Apply availability filter
    if (availability !== "all") {
      result = result.filter((it) => it.availability === availability)
    }

    // Apply simple substring search if query exists
    if (search.trim()) {
      const query = search.trim().toLowerCase()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.brand?.toLowerCase().includes(query) ?? false)
      )
    }

    // Apply sorting
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
    setFocusPriceInput(false)
    setSheetOpen(true)
  }

  const openItemForEditPrice = (item: ProductRow) => {
    setSelected(item)
    setFocusPriceInput(true)
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

  const exportXlsx = useCallback(async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/export/products", { method: "GET" })
      if (!res.ok) throw new Error("Failed to export products.")
      const blob = await res.blob()
      const cd = res.headers.get("Content-Disposition") || ""
      let filename = "products.xlsx"
      const m = /filename\s*=\s*"?([^";]+)"?/i.exec(cd)
      if (m && m[1]) filename = m[1]
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.")
    } finally {
      setExporting(false)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background md:h-auto">
      {/* Fixed header - hidden when user has searched (Desktop only) */}
      {!search && (
        <div className="hidden md:block bg-background border-b border-border px-4 sm:px-6 py-4">
          <div className="mx-auto max-w-6xl">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Products
              </h1>
              <p className="mt-1 text-muted-foreground">
                <span className="font-medium text-foreground">{filtered.length.toLocaleString("en-IN")}</span>
                {filtered.length !== items.length && ` of ${items.length.toLocaleString("en-IN")}`} products
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main content area - scrollable */}
      <div className="flex-1 overflow-y-auto md:pb-0 pb-56">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
          {/* Mobile header - shows product count (Mobile only) */}
          <div className="md:hidden mb-4">
            <h1 className="text-xl font-semibold text-foreground mb-2">Products</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <span className="font-semibold">{filtered.length.toLocaleString("en-IN")}</span>
                Total
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-green-200 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300">
                <span className="font-semibold">{filtered.filter(p => p.availability === "IN_STOCK").length.toLocaleString("en-IN")}</span>
                Available
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300">
                <span className="font-semibold">{filtered.filter(p => p.availability === "NEGATIVE").length.toLocaleString("en-IN")}</span>
                Out of Stock
              </Badge>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Active filter badges - shown when search or filters active */}
          {hasFilters && (
            <div className="mb-6 flex flex-wrap gap-2">
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

          {/* Products table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <ProductTable
              items={filtered}
              loading={loading}
              formatQty={formatQty}
              formatMoney={formatMoney}
              computeDerivedPrices={computeDerivedPrices}
              onRowClick={openItem}
              onEditPrice={openItemForEditPrice}
              canEditPrices={auth.isOwner}
              ownerToken={auth.token}
              onDealerPriceSaved={handlePriceSaved}
              onError={(m) => setError(m)}
              searchActive={search.trim().length > 0}
            />
          </div>
        </div>
      </div>

      {/* Search bar - fixed above mobile navbar */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-background border-t border-border px-4 py-3 transition-all has-focus:border-t-2 has-focus:shadow-lg">
        <div className="flex items-center gap-2 transition-all">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 h-10 rounded-lg text-sm"
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

          {/* Filter button - icon only */}
          <Button
            size="icon"
            variant="outline"
            onClick={() => setFilterOpen(true)}
            className="h-10 w-10 rounded-lg shrink-0"
            title="Open filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>

          {/* Refresh button */}
          <Button
            size="icon"
            variant="outline"
            onClick={refresh}
            disabled={loading}
            className="h-10 w-10 rounded-lg shrink-0"
            title="Refresh product list"
          >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>

          {/* Export button */}
          <Button
            size="icon"
            variant="outline"
            onClick={exportXlsx}
            disabled={exporting}
            className="h-10 w-10 rounded-lg shrink-0"
            title="Export"
          >
            <Download className={cn("h-4 w-4", exporting && "animate-pulse")} />
          </Button>
        </div>
      </div>

      {/* Search bar - fixed at bottom on desktop */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 sm:px-6 py-3 transition-all has-focus:border-t-2 has-focus:shadow-2xl">
        <div className="mx-auto max-w-6xl flex items-center gap-2 transition-all has-focus:max-w-none">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 h-11 rounded-lg"
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

          {/* Filter button + drawer (shadcn/vaul pattern) */}
          <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
            <DrawerTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-11 w-11 rounded-lg shrink-0"
                title="Open filters"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </DrawerTrigger>

            <DrawerContent>
              <DrawerHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <DrawerTitle>Filters</DrawerTitle>
                  <DrawerClose asChild>
                    <Button variant="outline" size="sm" className="rounded-lg bg-transparent">
                      Done
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>

              <div className="px-4 pb-4 space-y-4 overflow-y-auto flex-1">
                {/* Brand filter (no portal dropdowns) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Brand</Label>
                  <ScrollArea className="h-32 rounded-xl border p-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setBrand("all")}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                          brand === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        {brand === "all" && <Check className="h-4 w-4" />}
                        All Brands
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrand("__unknown__")}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                          brand === "__unknown__" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        {brand === "__unknown__" && <Check className="h-4 w-4" />}
                        No Brand
                      </button>
                      {brands.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBrand(b)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                            brand === b ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          {brand === b && <Check className="h-4 w-4" />}
                          {b}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Availability filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "all", label: "All" },
                      { value: "IN_STOCK", label: "In Stock" },
                      { value: "OUT_OF_STOCK", label: "Out" },
                      { value: "NEGATIVE", label: "Negative" },
                    ].map((opt) => (
                      <Button
                        key={opt.value}
                        variant={availability === opt.value ? "default" : "outline"}
                        onClick={() => setAvailability(opt.value as "all" | Availability)}
                        className={cn("rounded-lg", availability !== opt.value && "bg-transparent")}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Sort options */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort by</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "name", label: "Name" },
                      { value: "qty", label: "Quantity" },
                      { value: "dealerPrice", label: "Dealer Price" },
                      { value: "retail", label: "Retail Price" },
                    ].map((opt) => (
                      <Button
                        key={opt.value}
                        variant={sortKey === opt.value ? "default" : "outline"}
                        onClick={() => setSortKey(opt.value as SortKey)}
                        className={cn("rounded-lg", sortKey !== opt.value && "bg-transparent")}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Sort direction */}
                <div className="flex gap-2">
                  <Button
                    variant={sortDir === "asc" ? "default" : "outline"}
                    onClick={() => setSortDir("asc")}
                    className={cn("flex-1 rounded-lg", sortDir !== "asc" && "bg-transparent")}
                  >
                    A → Z
                  </Button>
                  <Button
                    variant={sortDir === "desc" ? "default" : "outline"}
                    onClick={() => setSortDir("desc")}
                    className={cn("flex-1 rounded-lg", sortDir !== "desc" && "bg-transparent")}
                  >
                    Z → A
                  </Button>
                </div>
              </div>

              <DrawerFooter className="pt-2">
                {hasFilters && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      clearFilters()
                      setFilterOpen(false)
                    }}
                    className="w-full rounded-lg bg-transparent"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          {/* Refresh button */}
          <Button
            size="icon"
            variant="outline"
            onClick={refresh}
            disabled={loading}
            className="h-11 w-11 rounded-lg shrink-0"
            title="Refresh product list"
          >
            <RefreshCcw className={cn("h-5 w-5", loading && "animate-spin")} />
          </Button>

          {/* Export button */}
          <Button
            size="icon"
            variant="outline"
            onClick={exportXlsx}
            disabled={exporting}
            className="h-11 w-11 rounded-lg shrink-0"
            title="Export all brands to Excel (one sheet per brand)"
          >
            <Download className={cn("h-5 w-5", exporting && "animate-pulse")} />
          </Button>
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
        canEditPrices={auth.isOwner}
        ownerToken={auth.token}
        shouldFocusPrice={focusPriceInput}
      />

    </div>
  )
}
