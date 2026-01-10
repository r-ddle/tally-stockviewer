"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StockBadge } from "@/components/stock-badge"
import type { Availability } from "@/lib/domain"
import { Copy, Save, Check, Loader2, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { ownerHeaders } from "@/lib/owner"
import { useIsMobile } from "@/lib/use-is-mobile"
import { PriceConfirmationDialog } from "@/components/price-confirmation-dialog"
import { Slider } from "@/components/ui/slider"

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
  shouldFocusPrice?: boolean
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
  shouldFocusPrice = false,
}: ProductDetailSheetProps) {
  const isMobile = useIsMobile()
  const [dealerPriceInput, setDealerPriceInput] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changes, setChanges] = useState<ProductChange[]>([])
  const [changesLoading, setChangesLoading] = useState(false)
  const [displayName, setDisplayName] = useState<string>("")
  const [editingDisplayName, setEditingDisplayName] = useState(false)
  const [notes, setNotes] = useState<string>("")
  const [customerDiscount, setCustomerDiscount] = useState(10)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [priceToConfirm, setPriceToConfirm] = useState<number | null>(null)
  const isEditingPriceRef = useRef(false)
  const productId = product?.id ?? null
  const productDealerPrice = product?.dealerPrice ?? null

  useEffect(() => {
    if (productId) {
      setDisplayName(product?.name ?? "")
      setDealerPriceInput(
        productDealerPrice == null || !Number.isFinite(productDealerPrice) ? "" : String(productDealerPrice),
      )
      setCopied(false)
      setError(null)
      setCustomerDiscount(10)
      setNotes("")
    }
  }, [productDealerPrice, productId, product?.name])

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
    const cleaned = dealerPriceInput.replace(/,/g, "").trim()
    const parsed = cleaned === "" ? null : Number.parseFloat(cleaned)
    return parsed != null && Number.isFinite(parsed) ? parsed : null
  }, [dealerPriceInput])

  const liveDerived = useMemo(() => {
    const prices = computeDerivedPrices(livePrice)
    return {
      ...prices,
      customerPrice: prices.retailPrice ? prices.retailPrice * (1 - customerDiscount / 100) : null,
      discountPercent: customerDiscount,
    }
  }, [livePrice, computeDerivedPrices, customerDiscount])

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
          {/* Product Title - with edit for admins */}
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {editingDisplayName && canEditPrices ? (
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="text-lg font-semibold mb-1 rounded-lg"
                    placeholder="Product name"
                  />
                ) : (
                  <h2 className="text-lg font-semibold">{displayName}</h2>
                )}
                <p className="text-sm text-muted-foreground">SKU: {product.name}</p>
              </div>
              {canEditPrices && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingDisplayName(!editingDisplayName)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{product.brand ?? "No brand"}</p>
          </div>

          {/* Stock & Availability */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Stock</Label>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold tabular-nums">{formatQty(product.stockQty, product.unit)}</span>
              <StockBadge availability={product.availability} size="large" showIcon />
            </div>
          </div>

          {/* Prices - Different layout for mobile vs desktop */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">Pricing</Label>
            {isMobile ? (
              // Mobile: Retail as hero
              <div className="space-y-3">
                <div className="rounded-lg bg-primary/10 p-4 text-center border-2 border-primary">
                  <p className="text-xs text-muted-foreground mb-1">CUSTOMER PRICE</p>
                  <p className="text-3xl font-bold tabular-nums text-primary">{formatMoney(liveDerived.customerPrice)}</p>
                  <p className="text-xs text-muted-foreground mt-2">{customerDiscount}% off retail</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <PriceCard label="Retail" value={formatMoney(liveDerived.retailPrice)} />
                  <PriceCard label="Dealer" value={formatMoney(livePrice)} />
                </div>
              </div>
            ) : (
              // Desktop: Dealer as hero
              <div className="space-y-3">
                <div className="rounded-lg bg-primary/10 p-4 text-center border-2 border-primary">
                  <p className="text-xs text-muted-foreground mb-1">DEALER PRICE</p>
                  <p className="text-3xl font-bold tabular-nums text-primary">{formatMoney(livePrice)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <PriceCard label="Retail" value={formatMoney(liveDerived.retailPrice)} />
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">CUSTOMER ({customerDiscount}%)</p>
                    <p className="text-base font-semibold tabular-nums">{formatMoney(liveDerived.customerPrice)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Customer Discount Slider */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Customer Discount</Label>
              <span className="text-sm font-semibold">{customerDiscount}%</span>
            </div>
            <div className="space-y-2">
              <Slider
                value={[customerDiscount]}
                onValueChange={(val: number | readonly number[]) => {
                  const arr = Array.isArray(val) ? val : [val]
                  setCustomerDiscount(arr[0] ?? 10)
                }}
                min={0}
                max={50}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          {/* Product Notes */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs font-medium">Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add product notes..."
              className="rounded-lg min-h-16"
            />
          </div>

          {/* Edit prices section */}
          {canEditPrices && (
            <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-sm font-medium">Update Price</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    autoFocus={shouldFocusPrice}
                    type="text"
                    inputMode="decimal"
                    placeholder="Enter price..."
                    value={dealerPriceInput}
                    onChange={(e) => {
                      isEditingPriceRef.current = true
                      setDealerPriceInput(e.target.value)
                    }}
                    onBlur={() => {
                      isEditingPriceRef.current = false
                    }}
                    className="h-10 rounded-lg tabular-nums"
                  />
                  <Button
                    onClick={() => {
                      setPriceToConfirm(livePrice)
                      setConfirmDialogOpen(true)
                    }}
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
  return (
    <>
      <PriceConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        price={priceToConfirm}
        priceDisplay={formatMoney(priceToConfirm)}
        onConfirm={(priceType) => {
          // If retail was selected, convert to dealer price (retail / 1.5)
          let finalDealerPrice = priceToConfirm
          if (priceType === "retail" && priceToConfirm != null) {
            finalDealerPrice = priceToConfirm / 1.5
          }
          // Update the input to show the dealer price
          setDealerPriceInput(finalDealerPrice != null ? String(finalDealerPrice) : "")
          saveDealerPrice()
        }}
      />
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-xl leading-tight">{displayName}</DrawerTitle>
              <p className="text-sm text-muted-foreground">{product?.brand ?? "—"}</p>
            </DrawerHeader>
            <div className="px-4 pb-8 overflow-y-auto">
              <DetailContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg leading-tight pr-6">{displayName}</DialogTitle>
              <DialogDescription>{product?.brand ?? "—"}</DialogDescription>
            </DialogHeader>
            <DetailContent />
          </DialogContent>
        </Dialog>
      )}
    </>
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
