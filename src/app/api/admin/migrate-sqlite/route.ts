import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { assertOwner } from "@/server/auth";
import { db } from "@/server/db";
import { nameKeyFromName, normalizeWhitespace } from "@/server/parsers/common";
import type { Availability } from "@/lib/domain";
import type { UpsertStockItem } from "@/server/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseAvailability(value: unknown): Availability {
  if (value === "IN_STOCK" || value === "OUT_OF_STOCK" || value === "NEGATIVE" || value === "UNKNOWN") return value;
  return "UNKNOWN";
}

function resolveSqlitePath(input: string): string {
  const trimmed = input.trim();
  const withoutPrefix = trimmed.startsWith("file:") ? trimmed.slice("file:".length) : trimmed;
  const normalized = withoutPrefix.replace(/^\/+/, "");
  return path.resolve(process.cwd(), normalized);
}

export async function POST(request: Request) {
  const denied = assertOwner(request);
  if (denied) return denied;

  if (db.kind !== "neon") {
    return Response.json({ ok: false, error: "Neon is not active. Set DATABASE_URL to a Postgres URL and restart dev server." }, { status: 400 });
  }

  const summary = await db.getSummary();
  if (summary.total > 0) {
    return Response.json(
      { ok: false, error: "Neon already has data. This migration only runs into an empty Neon database." },
      { status: 400 },
    );
  }

  const sqlitePath = resolveSqlitePath(process.env.MIGRATE_SQLITE_PATH || "file:./data/tally-stockviewer.db");
  if (!fs.existsSync(sqlitePath)) {
    return Response.json({ ok: false, error: `SQLite file not found: ${sqlitePath}` }, { status: 404 });
  }

  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  try {
    const tables = sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('products','prices')`)
      .all() as Array<{ name: string }>;
    const tableSet = new Set(tables.map((t) => t.name));
    if (!tableSet.has("products")) {
      return Response.json({ ok: false, error: "SQLite DB is missing required table: products" }, { status: 400 });
    }

    const rows = sqlite
      .prepare(
        `
        SELECT
          p.id,
          p.name,
          p.name_key AS nameKey,
          p.brand,
          p.stock_qty AS stockQty,
          p.unit,
          p.availability,
          p.last_seen_at AS lastSeenAt,
          p.created_at AS createdAt,
          p.updated_at AS updatedAt,
          pr.dealer_price AS dealerPrice
        FROM products p
        LEFT JOIN prices pr ON pr.product_id = p.id
      `,
      )
      .all() as Array<Record<string, unknown>>;

    if (rows.length === 0) {
      return Response.json({ ok: false, error: "SQLite DB has no products to migrate." }, { status: 400 });
    }

    const now = Date.now();
    const items: UpsertStockItem[] = rows.map((r) => {
      const name = normalizeWhitespace(String(r.name ?? ""));
      const nameKey = String(r.nameKey ?? "").trim() || nameKeyFromName(name);
      return {
        id: String(r.id ?? ""),
        name,
        nameKey,
        brand: r.brand == null ? null : normalizeWhitespace(String(r.brand)),
        stockQty: r.stockQty == null ? null : Number(r.stockQty),
        unit: r.unit == null ? null : normalizeWhitespace(String(r.unit)),
        availability: parseAvailability(r.availability),
        lastSeenAt: r.lastSeenAt == null ? now : Number(r.lastSeenAt),
        createdAt: r.createdAt == null ? now : Number(r.createdAt),
        updatedAt: r.updatedAt == null ? now : Number(r.updatedAt),
      };
    });

    await db.upsertStock(items);

    let pricesCopied = 0;
    for (const r of rows) {
      const productId = String(r.id ?? "");
      const dealerPrice = r.dealerPrice == null ? null : Number(r.dealerPrice);
      if (!productId) continue;
      if (dealerPrice == null || !Number.isFinite(dealerPrice)) continue;
      const result = await db.setDealerPrice(productId, dealerPrice);
      if (result.ok) pricesCopied += 1;
    }

    return Response.json({ ok: true, sqlitePath, productsCopied: items.length, pricesCopied });
  } catch (e) {
    console.error("[migrate-sqlite]", e);
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Migration failed." }, { status: 500 });
  } finally {
    sqlite.close();
  }
}

