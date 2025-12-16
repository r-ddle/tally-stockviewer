"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
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
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const productId = product?.id ?? null
  const productDealerPrice = product?.dealerPrice ?? null

  useEffect(() => {
    if (productId) {
      setDealerPriceInput(
        productDealerPrice == null || !Number.isFinite(productDealerPrice) ? "" : String(productDealerPrice),
      )
      setCopied(false)
      setError(null)
    }
  }, [productDealerPrice, productId])

  const saveDealerPrice = async () => {
    if (!canEditPrices) return
    if (!product) return
    setSaving(true)
    setError(null)
    try {
      const cleaned = dealerPriceInput.replace(/,/g, "").trim()
      const parsed = cleaned === "" ? null : Number.parseFloat(cleaned)
      const dealerPrice = parsed != null && Number.isFinite(parsed) ? parsed : null
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
    const d = computeDerivedPrices(product.dealerPrice)
    const lines = [
      product.name,
      `Brand: ${product.brand ?? "—"}`,
      `Qty: ${formatQty(product.stockQty, product.unit)}`,
      `Dealer: ${formatMoney(product.dealerPrice)}`,
      `Retail: ${formatMoney(d.retailPrice)}`,
      `Daraz: ${formatMoney(d.darazPrice)}`,
    ]
    await navigator.clipboard.writeText(lines.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const derived = product ? computeDerivedPrices(product.dealerPrice) : null

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

          {/* Prices grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Prices</h3>
            <div className="grid grid-cols-3 gap-3">
              <PriceCard label="Dealer" value={formatMoney(product.dealerPrice)} primary />
              <PriceCard label="Retail" value={formatMoney(derived?.retailPrice ?? null)} />
              <PriceCard label="Daraz" value={formatMoney(derived?.darazPrice ?? null)} />
            </div>
          </div>

          {/* Edit dealer price */}
          {canEditPrices && (
            <div className="space-y-3 pt-2 border-t border-border">
              <Label htmlFor="dealer-price" className="text-sm font-medium">
                Update Dealer Price
              </Label>
              <div className="flex gap-2">
                <Input
                  id="dealer-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="Enter price..."
                  value={dealerPriceInput}
                  onChange={(e) => setDealerPriceInput(e.target.value)}
                  className="h-10 rounded-lg tabular-nums"
                />
                <Button
                  onClick={saveDealerPrice}
                  disabled={saving}
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
        </div>
      )}
    </>
  )

  return (
    <>
      {isMobile ? (
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
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="space-y-1 pb-4">
              <SheetTitle className="text-lg leading-tight pr-6">{product?.name ?? "Product"}</SheetTitle>
              <p className="text-sm text-muted-foreground">{product?.brand ?? "—"}</p>
            </SheetHeader>
            <DetailContent />
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}

function PriceCard({
  label,
  value,
  primary = false,
}: {
  label: string
  value: string
  primary?: boolean
}) {
  return (
    <div className={cn(
      "rounded-lg p-3 text-center",
      primary ? "bg-primary/10" : "bg-muted/50"
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
