"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImportControls } from "@/components/import-controls";
import { StockBadge, type Availability } from "@/components/stock-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computeDerivedPrices, formatMoney, formatQty } from "@/lib/pricing";
import { ArrowUpDown, Copy, Save } from "lucide-react";

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  stockQty: number | null;
  unit: string | null;
  availability: Availability;
  lastSeenAt: number | null;
  updatedAt: number;
  dealerPrice: number | null;
};

type SortKey = "name" | "qty" | "dealerPrice" | "retail" | "daraz";

function compareNullableNumber(a: number | null, b: number | null) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  return (await res.json()) as T;
}

export default function ProductsPage() {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState<string>("all");
  const [availability, setAvailability] = useState<"all" | Availability>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [selected, setSelected] = useState<ProductRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dealerPriceInput, setDealerPriceInput] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, b] = await Promise.all([
        getJson<{ items: ProductRow[] }>("/api/products?limit=20000"),
        getJson<{ brands: string[] }>("/api/brands"),
      ]);
      setItems(p.items);
      setBrands(b.brands);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    setDealerPriceInput(
      selected?.dealerPrice == null || !Number.isFinite(selected.dealerPrice)
        ? ""
        : String(selected.dealerPrice),
    );
    setCopied(false);
  }, [selected?.dealerPrice, selected?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = items;
    if (q) {
      result = result.filter((it) =>
        `${it.name} ${it.brand ?? ""}`.toLowerCase().includes(q),
      );
    }
    if (brand !== "all") {
      result =
        brand === "__unknown__"
          ? result.filter((it) => !it.brand)
          : result.filter((it) => it.brand === brand);
    }
    if (availability !== "all") {
      result = result.filter((it) => it.availability === availability);
    }

    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "qty") cmp = compareNullableNumber(a.stockQty, b.stockQty);
      else if (sortKey === "dealerPrice")
        cmp = compareNullableNumber(a.dealerPrice, b.dealerPrice);
      else if (sortKey === "retail")
        cmp = compareNullableNumber(
          computeDerivedPrices(a.dealerPrice).retailPrice,
          computeDerivedPrices(b.dealerPrice).retailPrice,
        );
      else
        cmp = compareNullableNumber(
          computeDerivedPrices(a.dealerPrice).darazPrice,
          computeDerivedPrices(b.dealerPrice).darazPrice,
        );
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [availability, brand, items, search, sortDir, sortKey]);

  const openItem = (item: ProductRow) => {
    setSelected(item);
    setSheetOpen(true);
  };

  const saveDealerPrice = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const parsed = dealerPriceInput.trim() === "" ? null : Number.parseFloat(dealerPriceInput);
      const dealerPrice = parsed != null && Number.isFinite(parsed) ? parsed : null;
      const res = await fetch(`/api/products/${selected.id}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerPrice }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string; dealerPrice?: number | null };
      if (!body.ok) throw new Error(body.error ?? "Failed to save price.");
      const newPrice = body.dealerPrice ?? null;
      setItems((prev) => prev.map((p) => (p.id === selected.id ? { ...p, dealerPrice: newPrice } : p)));
      setSelected((prev) => (prev ? { ...prev, dealerPrice: newPrice } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save price.");
    } finally {
      setSaving(false);
    }
  };

  const copyPrices = async (item: ProductRow) => {
    const d = computeDerivedPrices(item.dealerPrice);
    const lines = [
      item.name,
      `Brand: ${item.brand ?? "—"}`,
      `Qty: ${formatQty(item.stockQty, item.unit)}`,
      `Dealer: ${formatMoney(item.dealerPrice)}`,
      `Retail: ${formatMoney(d.retailPrice)}`,
      `Daraz: ${formatMoney(d.darazPrice)}`,
      `Customer: ${formatMoney(d.customerPrice)}`,
      `Institution: ${formatMoney(d.institutionPrice)}`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground">
          Dealer prices are stored locally and never overwritten by imports.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Import</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportControls
            onImported={() => {
              refresh().catch(() => {});
            }}
          />
          {error ? <div className="mt-2 text-sm text-rose-600">{error}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search & filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-sm"
          />
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                <SelectItem value="__unknown__">(No brand)</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={availability}
              onValueChange={(v) => setAvailability(v as "all" | Availability)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="IN_STOCK">In stock</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Out of stock</SelectItem>
                <SelectItem value="NEGATIVE">Negative</SelectItem>
                <SelectItem value="UNKNOWN">Unknown</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort: Name</SelectItem>
                <SelectItem value="qty">Sort: Qty</SelectItem>
                <SelectItem value="dealerPrice">Sort: Dealer</SelectItem>
                <SelectItem value="retail">Sort: Retail</SelectItem>
                <SelectItem value="daraz">Sort: Daraz</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="whitespace-nowrap"
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {sortDir === "asc" ? "Asc" : "Desc"}
            </Button>
            <div className="ml-auto text-sm text-muted-foreground">
              {filtered.length.toLocaleString("en-IN")} shown
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Name</TableHead>
              <TableHead className="w-[14%]">Brand</TableHead>
              <TableHead className="w-[10%] text-right">Qty</TableHead>
              <TableHead className="w-[10%]">Availability</TableHead>
              <TableHead className="w-[9%] text-right">Dealer</TableHead>
              <TableHead className="w-[9%] text-right">Retail</TableHead>
              <TableHead className="w-[9%] text-right">Daraz</TableHead>
              <TableHead className="w-[9%] text-right">Customer</TableHead>
              <TableHead className="w-[9%] text-right">Institution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center">
                  <div className="text-sm font-medium">No matches</div>
                  <div className="text-xs text-muted-foreground">
                    Try clearing filters or importing an export.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((it) => {
                const d = computeDerivedPrices(it.dealerPrice);
                return (
                  <TableRow
                    key={it.id}
                    className="cursor-pointer"
                    onClick={() => openItem(it)}
                  >
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell className="text-muted-foreground">{it.brand ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(it.stockQty, it.unit)}
                    </TableCell>
                    <TableCell>
                      <StockBadge availability={it.availability} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(it.dealerPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(d.retailPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(d.darazPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(d.customerPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(d.institutionPrice)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>{selected?.name ?? "Product"}</SheetTitle>
            <SheetDescription>
              {selected?.brand ? `Brand: ${selected.brand}` : "Brand: —"} •{" "}
              {selected ? `Qty: ${formatQty(selected.stockQty, selected.unit)}` : ""}
            </SheetDescription>
          </SheetHeader>

          {selected ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <StockBadge availability={selected.availability} />
                <Button type="button" variant="secondary" onClick={() => copyPrices(selected)}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "Copied" : "Copy prices"}
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Dealer price</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Input
                    inputMode="decimal"
                    placeholder="Enter dealer price…"
                    value={dealerPriceInput}
                    onChange={(e) => setDealerPriceInput(e.target.value)}
                  />
                  <Button type="button" disabled={saving} onClick={saveDealerPrice}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </CardContent>
              </Card>

              <Tabs defaultValue="prices">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="prices">Computed</TabsTrigger>
                  <TabsTrigger value="raw">Raw</TabsTrigger>
                </TabsList>
                <TabsContent value="prices" className="space-y-3">
                  {(() => {
                    const d = computeDerivedPrices(selected.dealerPrice);
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Retail (÷ 0.75)</CardTitle>
                          </CardHeader>
                          <CardContent className="text-lg font-semibold tabular-nums">
                            {formatMoney(d.retailPrice)}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Daraz (÷ 0.6)</CardTitle>
                          </CardHeader>
                          <CardContent className="text-lg font-semibold tabular-nums">
                            {formatMoney(d.darazPrice)}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Customer (× 0.90)</CardTitle>
                          </CardHeader>
                          <CardContent className="text-lg font-semibold tabular-nums">
                            {formatMoney(d.customerPrice)}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Institution (× 0.85)</CardTitle>
                          </CardHeader>
                          <CardContent className="text-lg font-semibold tabular-nums">
                            {formatMoney(d.institutionPrice)}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}
                </TabsContent>
                <TabsContent value="raw" className="space-y-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Meta</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Last seen</span>
                        <span className="tabular-nums">
                          {selected.lastSeenAt ? new Date(selected.lastSeenAt).toLocaleString() : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Updated</span>
                        <span className="tabular-nums">{new Date(selected.updatedAt).toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}
