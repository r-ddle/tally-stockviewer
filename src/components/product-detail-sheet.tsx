"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StockBadge } from "@/components/stock-badge"
import type { Availability } from "@/lib/domain"
import { Copy, Save, Check, Calculator, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { ownerHeaders } from "@/lib/owner"

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
  const [dealerPriceInput, setDealerPriceInput] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (product) {
      setDealerPriceInput(
        product.dealerPrice == null || !Number.isFinite(product.dealerPrice) ? "" : String(product.dealerPrice),
      )
      setCopied(false)
      setError(null)
    }
  }, [product])

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
          {/* Status and actions */}
          <div className="flex items-center justify-between gap-3">
            <StockBadge availability={product.availability} size="large" showIcon />
            <Button
              variant="outline"
              onClick={copyPrices}
              className="h-12 md:h-9 px-4 text-base md:text-sm font-semibold rounded-2xl md:rounded-md gap-2 bg-transparent active:scale-[0.98] transition-transform"
            >
              {copied ? <Check className="h-5 w-5 md:h-4 md:w-4" /> : <Copy className="h-5 w-5 md:h-4 md:w-4" />}
              {copied ? "Copied!" : "Copy Prices"}
            </Button>
          </div>

          {/* Quantity display - mobile only */}
          <div className="md:hidden bg-muted/50 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-base font-medium text-muted-foreground">Current Stock</span>
            <span className="text-2xl font-bold font-mono">{formatQty(product.stockQty, product.unit)}</span>
          </div>

          {/* Dealer price editor (owner only) */}
          {canEditPrices ? (
          <Card className="border-2 md:border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-sm font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5 md:h-4 md:w-4 text-muted-foreground" />
                Dealer Price
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Enter dealer price..."
                  value={dealerPriceInput}
                  onChange={(e) => setDealerPriceInput(e.target.value)}
                  className="h-14 md:h-10 text-xl md:text-base font-mono rounded-2xl md:rounded-md border-2 md:border"
                />
                <Button
                  onClick={saveDealerPrice}
                  disabled={saving}
                  className="h-14 md:h-10 text-base md:text-sm font-semibold rounded-2xl md:rounded-md gap-2 shrink-0 active:scale-[0.98] transition-transform"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5 md:h-4 md:w-4" />
                  )}
                  Save Price
                </Button>
              </div>
              {error && <p className="text-base md:text-sm text-destructive font-medium">{error}</p>}
            </CardContent>
          </Card>
          ) : null}

          {/* Price tabs */}
          <Tabs defaultValue="computed" className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-12 md:h-10 rounded-2xl md:rounded-lg p-1">
              <TabsTrigger value="computed" className="text-base md:text-sm font-semibold rounded-xl md:rounded-md">
                Prices
              </TabsTrigger>
              <TabsTrigger value="metadata" className="text-base md:text-sm font-semibold rounded-xl md:rounded-md">
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="computed" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <MobilePriceCard
                  label="Retail"
                  formula="÷ 0.75"
                  value={formatMoney(derived?.retailPrice ?? null)}
                  variant="primary"
                />
                <MobilePriceCard
                  label="Daraz"
                  formula="÷ 0.60"
                  value={formatMoney(derived?.darazPrice ?? null)}
                  variant="default"
                />
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="mt-4">
              <Card className="border-2 md:border">
                <CardContent className="pt-6 space-y-5 md:space-y-4">
                  <MobileMetadataRow
                    icon={Clock}
                    label="Last Seen"
                    value={product.lastSeenAt ? new Date(product.lastSeenAt).toLocaleString() : "—"}
                  />
                  <MobileMetadataRow
                    icon={Clock}
                    label="Updated"
                    value={new Date(product.updatedAt).toLocaleString()}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop Sheet */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="hidden md:flex w-full sm:max-w-lg overflow-y-auto flex-col">
          <SheetHeader className="space-y-1">
            <SheetTitle className="text-xl leading-tight pr-6">{product?.name ?? "Product"}</SheetTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {product?.brand && <span>{product.brand}</span>}
              {product?.brand && <span>·</span>}
              <span>{product ? formatQty(product.stockQty, product.unit) : "—"}</span>
            </div>
          </SheetHeader>
          <div className="mt-6">
            <DetailContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Drawer */}
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="md:hidden max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-2xl leading-tight text-balance">{product?.name ?? "Product"}</DrawerTitle>
            <p className="text-lg text-muted-foreground">{product?.brand ?? "—"}</p>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            <DetailContent />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

function MobilePriceCard({
  label,
  formula,
  value,
  variant = "default",
}: {
  label: string
  formula: string
  value: string
  variant?: "default" | "primary"
}) {
  return (
    <Card className={cn("border-2 md:border", variant === "primary" && "border-primary/30 bg-primary/5")}>
      <CardContent className="p-5 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base md:text-sm text-muted-foreground font-medium">{label}</span>
          <span className="text-sm md:text-xs text-muted-foreground/70 font-mono">{formula}</span>
        </div>
        <p
          className={cn(
            "mt-2 md:mt-1 text-2xl md:text-lg font-bold font-mono",
            variant === "primary" && "text-primary",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function MobileMetadataRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 md:gap-2 text-base md:text-sm text-muted-foreground">
        <Icon className="h-5 w-5 md:h-4 md:w-4" />
        {label}
      </div>
      <span className="text-base md:text-sm font-mono">{value}</span>
    </div>
  )
}
