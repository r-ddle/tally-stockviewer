"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StockBadge, type Availability } from "@/components/stock-badge"
import { Copy, Save, Check, Calculator, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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
  institutionPrice: number | null
}

interface ProductDetailSheetProps {
  product: ProductRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  formatQty: (qty: number | null, unit: string | null) => string
  formatMoney: (value: number | null) => string
  computeDerivedPrices: (dealerPrice: number | null) => DerivedPrices
  onPriceSaved: (id: string, newPrice: number | null) => void
}

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  formatQty,
  formatMoney,
  computeDerivedPrices,
  onPriceSaved,
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
  }, [product]) // Updated to use the entire product object as a dependency

  const saveDealerPrice = async () => {
    if (!product) return
    setSaving(true)
    setError(null)
    try {
      const parsed = dealerPriceInput.trim() === "" ? null : Number.parseFloat(dealerPriceInput)
      const dealerPrice = parsed != null && Number.isFinite(parsed) ? parsed : null
      const res = await fetch(`/api/products/${product.id}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
      `Customer: ${formatMoney(d.customerPrice)}`,
      `Institution: ${formatMoney(d.institutionPrice)}`,
    ]
    await navigator.clipboard.writeText(lines.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const derived = product ? computeDerivedPrices(product.dealerPrice) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-xl leading-tight pr-6">{product?.name ?? "Product"}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {product?.brand && <span>{product.brand}</span>}
            {product?.brand && <span>•</span>}
            <span>{product ? formatQty(product.stockQty, product.unit) : "—"}</span>
          </div>
        </SheetHeader>

        {product && (
          <div className="mt-6 space-y-6">
            {/* Status and actions */}
            <div className="flex items-center justify-between gap-3">
              <StockBadge availability={product.availability} showIcon />
              <Button variant="outline" size="sm" onClick={copyPrices} className="gap-2 bg-transparent">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Prices"}
              </Button>
            </div>

            {/* Dealer price editor */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  Dealer Price
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Enter dealer price..."
                    value={dealerPriceInput}
                    onChange={(e) => setDealerPriceInput(e.target.value)}
                    className="font-mono"
                  />
                  <Button onClick={saveDealerPrice} disabled={saving} className="gap-2 shrink-0">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </CardContent>
            </Card>

            {/* Price tabs */}
            <Tabs defaultValue="computed" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="computed">Computed Prices</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              <TabsContent value="computed" className="mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <PriceCard
                    label="Retail"
                    formula="÷ 0.75"
                    value={formatMoney(derived?.retailPrice ?? null)}
                    variant="primary"
                  />
                  <PriceCard
                    label="Daraz"
                    formula="÷ 0.60"
                    value={formatMoney(derived?.darazPrice ?? null)}
                    variant="default"
                  />
                  <PriceCard
                    label="Customer"
                    formula="× 0.90"
                    value={formatMoney(derived?.customerPrice ?? null)}
                    variant="default"
                  />
                  <PriceCard
                    label="Institution"
                    formula="× 0.85"
                    value={formatMoney(derived?.institutionPrice ?? null)}
                    variant="default"
                  />
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <MetadataRow
                      icon={Clock}
                      label="Last Seen"
                      value={product.lastSeenAt ? new Date(product.lastSeenAt).toLocaleString() : "—"}
                    />
                    <MetadataRow icon={Clock} label="Updated" value={new Date(product.updatedAt).toLocaleString()} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function PriceCard({
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
    <Card className={cn(variant === "primary" && "border-primary/30 bg-primary/5")}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-xs text-muted-foreground/70 font-mono">{formula}</span>
        </div>
        <p className={cn("mt-1 text-lg font-bold font-mono", variant === "primary" && "text-primary")}>{value}</p>
      </CardContent>
    </Card>
  )
}

function MetadataRow({
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <span className="text-sm font-mono">{value}</span>
    </div>
  )
}
