"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, X, SlidersHorizontal, ArrowUpDown } from "lucide-react"
import type { Availability } from "@/components/stock-badge"
import { cn } from "@/lib/utils"

export type SortKey = "name" | "qty" | "dealerPrice" | "retail" | "daraz"

interface DataTableToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  brand: string
  onBrandChange: (value: string) => void
  brands: string[]
  availability: "all" | Availability
  onAvailabilityChange: (value: "all" | Availability) => void
  sortKey: SortKey
  onSortKeyChange: (value: SortKey) => void
  sortDir: "asc" | "desc"
  onSortDirChange: () => void
  totalCount: number
  filteredCount: number
}

export function DataTableToolbar({
  search,
  onSearchChange,
  brand,
  onBrandChange,
  brands,
  availability,
  onAvailabilityChange,
  sortKey,
  onSortKeyChange,
  sortDir,
  onSortDirChange,
  totalCount,
  filteredCount,
}: DataTableToolbarProps) {
  const hasFilters = search || brand !== "all" || availability !== "all"

  const clearFilters = () => {
    onSearchChange("")
    onBrandChange("all")
    onAvailabilityChange("all")
  }

  return (
    <div className="space-y-4">
      {/* Search and filter row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters:</span>
          </div>

          <Select value={brand} onValueChange={onBrandChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              <SelectItem value="__unknown__">(No Brand)</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={availability} onValueChange={(v) => onAvailabilityChange(v as "all" | Availability)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="IN_STOCK">In Stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
              <SelectItem value="NEGATIVE">Negative</SelectItem>
              <SelectItem value="UNKNOWN">Unknown</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5 border-l border-border pl-2">
            <Select value={sortKey} onValueChange={(v) => onSortKeyChange(v as SortKey)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="qty">Quantity</SelectItem>
                <SelectItem value="dealerPrice">Dealer Price</SelectItem>
                <SelectItem value="retail">Retail Price</SelectItem>
                <SelectItem value="daraz">Daraz Price</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={onSortDirChange} className="shrink-0 bg-transparent">
              <ArrowUpDown className={cn("h-4 w-4 transition-transform", sortDir === "desc" && "rotate-180")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Active filters and count */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {hasFilters && (
            <>
              {search && (
                <Badge variant="secondary" className="gap-1.5">
                  Search: {search}
                  <button onClick={() => onSearchChange("")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {brand !== "all" && (
                <Badge variant="secondary" className="gap-1.5">
                  Brand: {brand === "__unknown__" ? "No Brand" : brand}
                  <button onClick={() => onBrandChange("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {availability !== "all" && (
                <Badge variant="secondary" className="gap-1.5">
                  Status: {availability.replace("_", " ")}
                  <button onClick={() => onAvailabilityChange("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
                Clear all
              </Button>
            </>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{filteredCount.toLocaleString("en-IN")}</span>
          {filteredCount !== totalCount && <span> of {totalCount.toLocaleString("en-IN")}</span>} products
        </p>
      </div>
    </div>
  )
}
