import { nameKeyFromName, normalizeWhitespace } from "@/server/parsers/common";
import type { DbProvider, UpsertStockItem } from "./types";

export async function seedCloudFromCacheIfEmpty(primary: DbProvider, cache: DbProvider | null) {
  if (primary.kind !== "neon") return { seeded: false as const };
  if (!cache || cache.kind !== "sqlite") return { seeded: false as const };

  const summary = await primary.getSummary();
  if (summary.total > 0) return { seeded: false as const };

  const local = await cache.listProducts({ limit: 20000, sort: "name", dir: "asc" });
  if (local.length === 0) return { seeded: false as const };

  const now = Date.now();
  const stockItems: UpsertStockItem[] = local.map((p) => ({
    id: p.id,
    name: normalizeWhitespace(p.name),
    nameKey: nameKeyFromName(p.name),
    brand: p.brand ? normalizeWhitespace(p.brand) : null,
    stockQty: p.stockQty,
    unit: p.unit ? normalizeWhitespace(p.unit) : null,
    availability: p.availability,
    lastSeenAt: p.lastSeenAt ?? now,
    createdAt: now,
    updatedAt: p.updatedAt ?? now,
  }));

  await primary.upsertStock(stockItems);

  let pricesCopied = 0;
  for (const p of local) {
    if (p.dealerPrice == null || !Number.isFinite(p.dealerPrice)) continue;
    const r = await primary.setDealerPrice(p.id, p.dealerPrice);
    if (r.ok) pricesCopied += 1;
  }

  return { seeded: true as const, productsCopied: local.length, pricesCopied };
}

