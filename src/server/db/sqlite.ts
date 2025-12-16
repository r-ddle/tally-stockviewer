import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Availability } from "@/lib/domain";
import type { DbProvider, ListProductsParams, ProductRow, Summary, UpsertStockItem } from "./types";

function resolveDbPath(databaseUrl: string): string {
  const trimmed = databaseUrl.trim();
  const withoutPrefix = trimmed.startsWith("file:") ? trimmed.slice("file:".length) : trimmed;
  const normalized = withoutPrefix.replace(/^\/+/, "");
  return path.resolve(process.cwd(), normalized);
}

function ensureSchema(sqlite: Database.Database) {
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_key TEXT NOT NULL UNIQUE,
      brand TEXT,
      stock_qty REAL,
      unit TEXT,
      availability TEXT NOT NULL CHECK (availability IN ('IN_STOCK','OUT_OF_STOCK','NEGATIVE','UNKNOWN')),
      last_seen_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
    CREATE INDEX IF NOT EXISTS idx_products_availability ON products(availability);
    CREATE INDEX IF NOT EXISTS idx_products_last_seen_at ON products(last_seen_at);

    CREATE TABLE IF NOT EXISTS prices (
      product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
      dealer_price REAL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);
  `);
}

function parseAvailability(value: unknown): Availability {
  if (value === "IN_STOCK" || value === "OUT_OF_STOCK" || value === "NEGATIVE" || value === "UNKNOWN") return value;
  return "UNKNOWN";
}

export function createSqliteProvider(databaseUrl: string): DbProvider {
  const dbPath = resolveDbPath(databaseUrl);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath, { fileMustExist: false });
  ensureSchema(sqlite);

  const upsertStmt = sqlite.prepare(`
    INSERT INTO products(id, name, name_key, brand, stock_qty, unit, availability, last_seen_at, created_at, updated_at)
    VALUES (@id, @name, @nameKey, @brand, @stockQty, @unit, @availability, @lastSeenAt, @createdAt, @updatedAt)
    ON CONFLICT(name_key) DO UPDATE SET
      name = excluded.name,
      brand = COALESCE(excluded.brand, products.brand),
      stock_qty = excluded.stock_qty,
      unit = COALESCE(excluded.unit, products.unit),
      availability = excluded.availability,
      last_seen_at = excluded.last_seen_at,
      updated_at = excluded.updated_at;
  `);

  const upsertTxn = sqlite.transaction((items: UpsertStockItem[]) => {
    for (const it of items) upsertStmt.run(it);
  });

  return {
    kind: "sqlite",
    async getSummary(): Promise<Summary> {
      const row = sqlite
        .prepare(
          `
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN availability='IN_STOCK' THEN 1 ELSE 0 END) AS inStock,
            SUM(CASE WHEN availability='OUT_OF_STOCK' THEN 1 ELSE 0 END) AS outOfStock,
            SUM(CASE WHEN availability='NEGATIVE' THEN 1 ELSE 0 END) AS negative,
            SUM(CASE WHEN availability='UNKNOWN' THEN 1 ELSE 0 END) AS unknown,
            MAX(last_seen_at) AS lastImportAt
          FROM products;
        `,
        )
        .get() as Record<string, unknown> | undefined;

      return {
        total: Number(row?.total ?? 0),
        inStock: Number(row?.inStock ?? 0),
        outOfStock: Number(row?.outOfStock ?? 0),
        negative: Number(row?.negative ?? 0),
        unknown: Number(row?.unknown ?? 0),
        lastImportAt: row?.lastImportAt != null ? Number(row.lastImportAt) : null,
      };
    },

    async listBrands(): Promise<string[]> {
      const rows = sqlite
        .prepare(`SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL ORDER BY brand ASC`)
        .all() as Array<{ brand: string }>;
      return rows.map((r) => r.brand).filter(Boolean);
    },

    async listProducts(params: ListProductsParams): Promise<ProductRow[]> {
      const search = (params.search ?? "").trim().toLowerCase();
      const brand = (params.brand ?? "").trim();
      const availability = params.availability;
      const limit = Math.min(params.limit ?? 5000, 20000);

      const where: string[] = [];
      const values: unknown[] = [];

      if (search) {
        where.push(`lower(p.name) LIKE ?`);
        values.push(`%${search}%`);
      }
      if (brand) {
        if (brand === "__unknown__") where.push(`p.brand IS NULL`);
        else {
          where.push(`p.brand = ?`);
          values.push(brand);
        }
      }
      if (availability) {
        where.push(`p.availability = ?`);
        values.push(availability);
      }

      const sort = params.sort ?? "name";
      const dir = params.dir === "desc" ? "DESC" : "ASC";
      const orderBy =
        sort === "qty"
          ? `p.stock_qty ${dir} NULLS LAST, p.name ASC`
          : sort === "availability"
            ? `p.availability ${dir}, p.name ASC`
            : `p.name ${dir}`;

      const sql = `
        SELECT
          p.id,
          p.name,
          p.brand,
          p.stock_qty AS stockQty,
          p.unit,
          p.availability AS availability,
          p.last_seen_at AS lastSeenAt,
          p.updated_at AS updatedAt,
          pr.dealer_price AS dealerPrice
        FROM products p
        LEFT JOIN prices pr ON pr.product_id = p.id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY ${orderBy}
        LIMIT ?
      `;
      values.push(limit);

      const rows = sqlite.prepare(sql).all(...values) as Array<Record<string, unknown>>;
      return rows.map((r) => ({
        id: String(r.id ?? ""),
        name: String(r.name ?? ""),
        brand: r.brand == null ? null : String(r.brand),
        stockQty: r.stockQty == null ? null : Number(r.stockQty),
        unit: r.unit == null ? null : String(r.unit),
        availability: parseAvailability(r.availability),
        lastSeenAt: r.lastSeenAt == null ? null : Number(r.lastSeenAt),
        updatedAt: Number(r.updatedAt ?? 0),
        dealerPrice: r.dealerPrice == null ? null : Number(r.dealerPrice),
      }));
    },

    async upsertStock(items: UpsertStockItem[]) {
      upsertTxn(items);
      return { upserted: items.length };
    },

    async setDealerPrice(productId: string, dealerPrice: number | null) {
      const exists = sqlite
        .prepare(`SELECT 1 AS ok FROM products WHERE id = ?`)
        .get(productId) as { ok: 1 } | undefined;
      if (!exists) return { ok: false as const, error: "Not found." };

      const now = Date.now();
      sqlite
        .prepare(
          `
          INSERT INTO prices(product_id, dealer_price, updated_at)
          VALUES(?, ?, ?)
          ON CONFLICT(product_id) DO UPDATE SET dealer_price=excluded.dealer_price, updated_at=excluded.updated_at
        `,
        )
        .run(productId, dealerPrice, now);

      return { ok: true as const };
    },
  };
}
