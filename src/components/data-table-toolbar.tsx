"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, X, SlidersHorizontal, ArrowUpDown, Filter } from "lucide-react"
import type { Availability } from "@/lib/domain"
import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const hasFilters = search || brand !== "all" || availability !== "all"
  const activeFilterCount = (search ? 1 : 0) + (brand !== "all" ? 1 : 0) + (availability !== "all" ? 1 : 0)

  const clearFilters = () => {
    onSearchChange("")
    onBrandChange("all")
    onAvailabilityChange("all")
  }

  return (
    <div className="space-y-4">
      {/* Desktop layout */}
      <div className="hidden md:block space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters:</span>
            </div>

            <Select value={brand} onValueChange={(v) => onBrandChange(v ?? "all")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue>Brand</SelectValue>
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

            <Select value={availability} onValueChange={(v) => onAvailabilityChange((v ?? "all") as "all" | Availability)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue>Status</SelectValue>
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
              <Select value={sortKey} onValueChange={(v) => onSortKeyChange((v ?? "name") as SortKey)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue>Sort by</SelectValue>
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

      <div className="md:hidden space-y-4">
        {/* Large search input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-14 pl-12 pr-12 text-lg rounded-2xl border-2"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-muted text-muted-foreground active:bg-muted/80"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Filter button and results count */}
        <div className="flex items-center justify-between gap-3">
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger>
              <Button
                variant="outline"
                size="lg"
                className={cn(
                  "h-12 px-5 text-base font-semibold rounded-2xl gap-2 bg-transparent active:scale-[0.98] transition-transform",
                  activeFilterCount > 0 && "border-primary text-primary",
                )}
              >
                <Filter className="h-5 w-5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="h-6 w-6 p-0 flex items-center justify-center rounded-full text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader>
                <DrawerTitle className="text-xl">Filter & Sort</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-4 space-y-6 overflow-y-auto">
                {/* Brand filter */}
                <div className="space-y-3">
                  <label className="text-base font-semibold text-foreground">Brand</label>
                  <Select value={brand} onValueChange={(v) => onBrandChange(v ?? "all")}>
                    <SelectTrigger className="h-14 text-lg rounded-2xl">
                      <SelectValue>All Brands</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-lg py-3">
                        All Brands
                      </SelectItem>
                      <SelectItem value="__unknown__" className="text-lg py-3">
                        (No Brand)
                      </SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b} value={b} className="text-lg py-3">
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Availability filter */}
                <div className="space-y-3">
                  <label className="text-base font-semibold text-foreground">Status</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "all", label: "All" },
                      { value: "IN_STOCK", label: "In Stock" },
                      { value: "OUT_OF_STOCK", label: "Out" },
                      { value: "NEGATIVE", label: "Negative" },
                    ].map((opt) => (
                      <Button
                        key={opt.value}
                        variant={availability === opt.value ? "default" : "outline"}
                        size="lg"
                        onClick={() => onAvailabilityChange(opt.value as "all" | Availability)}
                        className={cn(
                          "h-14 text-base font-semibold rounded-2xl active:scale-[0.98] transition-transform",
                          availability !== opt.value && "bg-transparent",
                        )}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Sort options */}
                <div className="space-y-3">
                  <label className="text-base font-semibold text-foreground">Sort By</label>
                  <Select value={sortKey} onValueChange={(v) => onSortKeyChange((v ?? "name") as SortKey)}>
                    <SelectTrigger className="h-14 text-lg rounded-2xl">
                      <SelectValue>Name</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name" className="text-lg py-3">
                        Name
                      </SelectItem>
                      <SelectItem value="qty" className="text-lg py-3">
                        Quantity
                      </SelectItem>
                      <SelectItem value="dealerPrice" className="text-lg py-3">
                        Dealer Price
                      </SelectItem>
                      <SelectItem value="retail" className="text-lg py-3">
                        Retail Price
                      </SelectItem>
                      <SelectItem value="daraz" className="text-lg py-3">
                        Daraz Price
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={onSortDirChange}
                    className="w-full h-14 text-base font-semibold rounded-2xl gap-2 bg-transparent active:scale-[0.98] transition-transform"
                  >
                    <ArrowUpDown className={cn("h-5 w-5 transition-transform", sortDir === "desc" && "rotate-180")} />
                    {sortDir === "asc" ? "Ascending" : "Descending"}
                  </Button>
                </div>
              </div>
              <DrawerFooter className="flex-row gap-3 pt-2">
                {hasFilters && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={clearFilters}
                    className="flex-1 h-14 text-base font-semibold rounded-2xl bg-transparent"
                  >
                    Clear All
                  </Button>
                )}
                <DrawerClose>
                  <Button size="lg" className="flex-1 h-14 text-base font-semibold rounded-2xl">
                    Show Results
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          <p className="text-base text-muted-foreground">
            <span className="font-bold text-foreground text-lg">{filteredCount.toLocaleString("en-IN")}</span>{" "}
            {filteredCount !== totalCount && <span>of {totalCount.toLocaleString("en-IN")} </span>}
            products
          </p>
        </div>

        {/* Active filter pills */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {search && (
              <Badge variant="secondary" className="h-9 px-4 text-sm gap-2 rounded-full">
                &quot;{search}&quot;
                <button onClick={() => onSearchChange("")} className="p-0.5 rounded-full hover:bg-foreground/10">
                  <X className="h-4 w-4" />
                </button>
              </Badge>
            )}
            {brand !== "all" && (
              <Badge variant="secondary" className="h-9 px-4 text-sm gap-2 rounded-full">
                {brand === "__unknown__" ? "No Brand" : brand}
                <button onClick={() => onBrandChange("all")} className="p-0.5 rounded-full hover:bg-foreground/10">
                  <X className="h-4 w-4" />
                </button>
              </Badge>
            )}
            {availability !== "all" && (
              <Badge variant="secondary" className="h-9 px-4 text-sm gap-2 rounded-full">
                {availability.replace("_", " ")}
                <button
                  onClick={() => onAvailabilityChange("all")}
                  className="p-0.5 rounded-full hover:bg-foreground/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
