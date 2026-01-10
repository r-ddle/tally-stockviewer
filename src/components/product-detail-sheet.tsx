"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StockBadge } from "@/components/stock-badge"
import type { Availability } from "@/lib/domain"
import { Copy, Save, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { ownerHeaders } from "@/lib/owner"
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
}

type ProductChange = {
  id: string
  changeType: "NEW_PRODUCT" | "STOCK_DROP" | "OUT_OF_STOCK" | "PRICE_CHANGE"
  fromQty: number | null
  toQty: number | null
  fromAvailability: Availability | null
  toAvailability: Availability | null
  fromPrice: number | null
  toPrice: number | null
  createdAt: number
}

interface ProductDetailSheetProps {
  product: ProductRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  formatQty: (qty: number | null, unit: string | null) => string
  formatMoney: (value: number | null) => string
  computeDerivedPrices: (dealerPrice: number | null) => DerivedPrices
  onPriceSaved: (id: string, newPrice: number | null) => void
  canEditPrices: boolean
  ownerToken: string | null
}

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  formatQty,
  formatMoney,
  computeDerivedPrices,
  onPriceSaved,
  canEditPrices,
  ownerToken,
}: ProductDetailSheetProps) {
  const isMobile = useIsMobile()
  const [dealerPriceInput, setDealerPriceInput] = useState<string>("")
  const [retailPriceInput, setRetailPriceInput] = useState<string>("")
  const [editMode, setEditMode] = useState<"dealer" | "retail">("dealer")
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changes, setChanges] = useState<ProductChange[]>([])
  const [changesLoading, setChangesLoading] = useState(false)
  const productId = product?.id ?? null
  const productDealerPrice = product?.dealerPrice ?? null

  useEffect(() => {
    if (productId) {
      setDealerPriceInput(
        productDealerPrice == null || !Number.isFinite(productDealerPrice) ? "" : String(productDealerPrice),
      )
      const derived = computeDerivedPrices(productDealerPrice)
      setRetailPriceInput(
        derived.retailPrice == null || !Number.isFinite(derived.retailPrice) ? "" : String(derived.retailPrice),
      )
      setCopied(false)
      setError(null)
      setEditMode("dealer")
    }
  }, [productDealerPrice, productId, computeDerivedPrices])

  useEffect(() => {
    if (!productId || !open) return
    let cancelled = false
    const load = async () => {
      setChangesLoading(true)
      try {
        const res = await fetch(`/api/products/${productId}/changes`)
        const body = (await res.json()) as { items: ProductChange[] }
        if (!cancelled) setChanges(body.items ?? [])
      } catch {
        if (!cancelled) setChanges([])
      } finally {
        if (!cancelled) setChangesLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, productId])

  // Live calculation: compute prices from input value in real-time
  const livePrice = useMemo(() => {
    if (editMode === "dealer") {
      const cleaned = dealerPriceInput.replace(/,/g, "").trim()
      const parsed = cleaned === "" ? null : Number.parseFloat(cleaned)
      return parsed != null && Number.isFinite(parsed) ? parsed : null
    } else {
      // Calculate dealer from retail (retail / 1.5)
      const cleaned = retailPriceInput.replace(/,/g, "").trim()
      const parsed = cleaned === "" ? null : Number.parseFloat(cleaned)
      if (parsed != null && Number.isFinite(parsed)) {
        return parsed / 1.5
      }
      return null
    }
  }, [dealerPriceInput, retailPriceInput, editMode])

  const liveDerived = useMemo(() => {
    return computeDerivedPrices(livePrice)
  }, [livePrice, computeDerivedPrices])

  // Sync retail price when dealer changes
  useEffect(() => {
    if (editMode === "dealer" && liveDerived.retailPrice != null) {
      setRetailPriceInput(String(liveDerived.retailPrice))
    }
  }, [editMode, liveDerived.retailPrice])

  // Sync dealer price when retail changes
  useEffect(() => {
    if (editMode === "retail" && livePrice != null) {
      setDealerPriceInput(String(livePrice.toFixed(2)))
    }
  }, [editMode, livePrice])

  // Check if input has unsaved changes
  const hasChanges = useMemo(() => {
    if (productDealerPrice == null && livePrice == null) return false
    return productDealerPrice !== livePrice
  }, [productDealerPrice, livePrice])

  const saveDealerPrice = async () => {
    if (!canEditPrices) return
    if (!product) return
    setSaving(true)
    setError(null)
    try {
      const dealerPrice = livePrice
      const res = await fetch(`/api/products/${product.id}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...ownerHeaders(ownerToken) },
        body: JSON.stringify({ dealerPrice }),
      })
      const body = (await res.json()) as { ok: boolean; error?: string; dealerPrice?: number | null }
      if (!body.ok) throw new Error(body.error ?? "Failed to save price.")
      onPriceSaved(product.id, body.dealerPrice ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save price.")
    } finally {
      setSaving(false)
    }
  }

  const copyPrices = async () => {
    if (!product) return
    const lines = [
      product.name,
      `Brand: ${product.brand ?? "—"}`,
      `Qty: ${formatQty(product.stockQty, product.unit)}`,
      `Dealer: ${formatMoney(livePrice)}`,
      `Retail: ${formatMoney(liveDerived.retailPrice)}`,
      `Daraz: ${formatMoney(liveDerived.darazPrice)}`,
    ]
    await navigator.clipboard.writeText(lines.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const DetailContent = () => (
    <>
      {product && (
        <div className="space-y-6">
          {/* Status and copy */}
          <div className="flex items-center justify-between gap-3">
            <StockBadge availability={product.availability} size="large" showIcon />
            <Button
              variant="outline"
              size="sm"
              onClick={copyPrices}
              className="gap-2 rounded-lg h-9"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          {/* Stock quantity */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Stock</span>
              <span className="text-xl font-semibold tabular-nums">{formatQty(product.stockQty, product.unit)}</span>
            </div>
          </div>

          {/* Prices grid - now shows live calculated prices */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Prices {hasChanges && <span className="text-yellow-600">(unsaved)</span>}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <PriceCard label="Dealer" value={formatMoney(livePrice)} primary highlight={hasChanges} />
              <PriceCard label="Retail" value={formatMoney(liveDerived.retailPrice)} highlight={hasChanges} />
              <PriceCard label="Daraz" value={formatMoney(liveDerived.darazPrice)} highlight={hasChanges} />
            </div>
          </div>

          {/* Edit prices */}
          {canEditPrices && (
            <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-sm font-medium">
                Update Price
              </Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant={editMode === "dealer" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditMode("dealer")}
                    className="flex-1"
                  >
                    Dealer
                  </Button>
                  <Button
                    variant={editMode === "retail" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditMode("retail")}
                    className="flex-1"
                  >
                    Retail
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Enter price..."
                    value={editMode === "dealer" ? dealerPriceInput : retailPriceInput}
                    onChange={(e) => {
                      if (editMode === "dealer") {
                        setDealerPriceInput(e.target.value)
                      } else {
                        setRetailPriceInput(e.target.value)
                      }
                    }}
                    className="h-10 rounded-lg tabular-nums"
                  />
                  <Button
                    onClick={saveDealerPrice}
                    disabled={saving || !hasChanges}
                    className="h-10 px-4 rounded-lg gap-2 shrink-0"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2 pt-2 border-t border-border text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last seen</span>
              <span>{product.lastSeenAt ? new Date(product.lastSeenAt).toLocaleDateString() : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span>{new Date(product.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Change log */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Recent changes</span>
              {changesLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
            </div>
            {changes.length === 0 && !changesLoading ? (
              <p className="text-sm text-muted-foreground">No recent changes recorded.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-auto pr-1">
                {changes.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                      <span className="font-medium text-foreground">{c.changeType.replace("_", " ")}</span>
                    </div>
                    {c.changeType === "PRICE_CHANGE" ? (
                      <p className="text-sm text-foreground">Price {formatMoney(c.fromPrice)} → {formatMoney(c.toPrice)}</p>
                    ) : (
                      <p className="text-sm text-foreground">
                        Qty {c.fromQty ?? "—"} → {c.toQty ?? "—"} ({(c.toAvailability ?? "").replace("_", " ")})
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )

  // Use Drawer for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-xl leading-tight">{product?.name ?? "Product"}</DrawerTitle>
            <p className="text-sm text-muted-foreground">{product?.brand ?? "—"}</p>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            <DetailContent />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg leading-tight pr-6">{product?.name ?? "Product"}</DialogTitle>
          <DialogDescription>{product?.brand ?? "—"}</DialogDescription>
        </DialogHeader>
        <DetailContent />
      </DialogContent>
    </Dialog>
  )
}

function PriceCard({
  label,
  value,
  primary = false,
  highlight = false,
}: {
  label: string
  value: string
  primary?: boolean
  highlight?: boolean
}) {
  return (
    <div className={cn(
      "rounded-lg p-3 text-center transition-colors",
      primary ? "bg-primary/10" : "bg-muted/50",
      highlight && "ring-2 ring-primary/30"
    )}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn(
        "text-base font-semibold tabular-nums",
        primary && "text-primary"
      )}>
        {value}
      </p>
    </div>
  )
}
