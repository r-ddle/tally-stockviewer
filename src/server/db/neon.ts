import { neon } from "@neondatabase/serverless";
import type { Availability } from "@/lib/domain";
import type { DbProvider, ListProductsParams, ProductRow, Summary, UpsertStockItem } from "./types";

function parseAvailability(value: unknown): Availability {
  if (value === "IN_STOCK" || value === "OUT_OF_STOCK" || value === "NEGATIVE" || value === "UNKNOWN") return value;
  return "UNKNOWN";
}

export function createNeonProvider(databaseUrl: string): DbProvider {
  const sql = neon(databaseUrl);

  let ensured: Promise<void> | null = null;
  const ensureSchema = async () => {
    if (!ensured) {
      ensured = (async () => {
        await sql.query(
          `
          CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            name_key TEXT NOT NULL UNIQUE,
            brand TEXT NULL,
            stock_qty DOUBLE PRECISION NULL,
            unit TEXT NULL,
            availability TEXT NOT NULL CHECK (availability IN ('IN_STOCK','OUT_OF_STOCK','NEGATIVE','UNKNOWN')),
            last_seen_at BIGINT NULL,
            created_at BIGINT NOT NULL,
            updated_at BIGINT NOT NULL
          )
        `,
        );
        await sql.query(`CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand)`);
        await sql.query(`CREATE INDEX IF NOT EXISTS idx_products_availability ON products(availability)`);
        await sql.query(`CREATE INDEX IF NOT EXISTS idx_products_last_seen_at ON products(last_seen_at)`);

        await sql.query(
          `
          CREATE TABLE IF NOT EXISTS prices (
            product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
            dealer_price DOUBLE PRECISION NULL,
            updated_at BIGINT NOT NULL
          )
        `,
        );
        await sql.query(`CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id)`);
      })();
    }
    await ensured;
  };

  return {
    kind: "neon",
    async getSummary(): Promise<Summary> {
      await ensureSchema();
      const rows = await sql.query(
        `
        SELECT
          COUNT(*)::bigint AS total,
          SUM(CASE WHEN availability='IN_STOCK' THEN 1 ELSE 0 END)::bigint AS in_stock,
          SUM(CASE WHEN availability='OUT_OF_STOCK' THEN 1 ELSE 0 END)::bigint AS out_of_stock,
          SUM(CASE WHEN availability='NEGATIVE' THEN 1 ELSE 0 END)::bigint AS negative,
          SUM(CASE WHEN availability='UNKNOWN' THEN 1 ELSE 0 END)::bigint AS unknown,
          MAX(last_seen_at) AS last_import_at
        FROM products;
      `,
      );
      const row = (rows[0] ?? null) as Record<string, unknown> | null;
      return {
        total: Number(row?.total ?? 0),
        inStock: Number(row?.in_stock ?? 0),
        outOfStock: Number(row?.out_of_stock ?? 0),
        negative: Number(row?.negative ?? 0),
        unknown: Number(row?.unknown ?? 0),
        lastImportAt: row?.last_import_at == null ? null : Number(row.last_import_at),
      };
    },

    async listBrands(): Promise<string[]> {
      await ensureSchema();
      const rows = (await sql.query(`SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL ORDER BY brand ASC`)) as Array<
        Record<string, unknown>
      >;
      return rows
        .map((r) => (typeof r.brand === "string" ? r.brand : String(r.brand ?? "")))
        .filter(Boolean);
    },

    async listProducts(params: ListProductsParams): Promise<ProductRow[]> {
      await ensureSchema();
      const search = (params.search ?? "").trim();
      const brand = (params.brand ?? "").trim();
      const availability = params.availability;
      const limit = Math.min(params.limit ?? 5000, 20000);

      const where: string[] = [];
      const values: unknown[] = [];

      if (search) {
        where.push(`p.name ILIKE $${values.length + 1}`);
        values.push(`%${search}%`);
      }
      if (brand) {
        if (brand === "__unknown__") where.push(`p.brand IS NULL`);
        else {
          where.push(`p.brand = $${values.length + 1}`);
          values.push(brand);
        }
      }
      if (availability) {
        where.push(`p.availability = $${values.length + 1}`);
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

      const q = `
        SELECT
          p.id,
          p.name,
          p.brand,
          p.stock_qty AS "stockQty",
          p.unit,
          p.availability AS availability,
          p.last_seen_at AS "lastSeenAt",
          p.updated_at AS "updatedAt",
          pr.dealer_price AS "dealerPrice"
        FROM products p
        LEFT JOIN prices pr ON pr.product_id = p.id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY ${orderBy}
        LIMIT $${values.length + 1}
      `;
      values.push(limit);
      const rows = (await sql.query(q, values)) as Array<Record<string, unknown>>;

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
      await ensureSchema();
      const chunkSize = 400;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        if (chunk.length === 0) continue;

        const values: unknown[] = [];
        const tuples: string[] = [];
        for (const it of chunk) {
          const base = values.length;
          tuples.push(
            `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10})`,
          );
          values.push(
            it.id,
            it.name,
            it.nameKey,
            it.brand,
            it.stockQty,
            it.unit,
            it.availability,
            it.lastSeenAt,
            it.createdAt,
            it.updatedAt,
          );
        }

        const q = `
          INSERT INTO products(
            id, name, name_key, brand, stock_qty, unit, availability, last_seen_at, created_at, updated_at
          )
          VALUES ${tuples.join(",")}
          ON CONFLICT (name_key) DO UPDATE SET
            name = EXCLUDED.name,
            brand = COALESCE(EXCLUDED.brand, products.brand),
            stock_qty = EXCLUDED.stock_qty,
            unit = COALESCE(EXCLUDED.unit, products.unit),
            availability = EXCLUDED.availability,
            last_seen_at = EXCLUDED.last_seen_at,
            updated_at = EXCLUDED.updated_at;
        `;
        await sql.query(q, values);
      }
      return { upserted: items.length };
    },

    async setDealerPrice(productId: string, dealerPrice: number | null) {
      await ensureSchema();
      const now = Date.now();
      try {
        await sql.query(
          `
          INSERT INTO prices(product_id, dealer_price, updated_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id) DO UPDATE SET dealer_price=EXCLUDED.dealer_price, updated_at=EXCLUDED.updated_at
        `,
          [productId, dealerPrice, now],
        );
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Failed to save price." };
      }
    },
  };
}
