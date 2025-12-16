import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { applyEnvDefaults } from "@/lib/env";

applyEnvDefaults();

declare global {
  var __sqlite: Database.Database | undefined;
  var __drizzle: ReturnType<typeof drizzle> | undefined;
}

function resolveDbPath(databaseUrl: string): string {
  const trimmed = databaseUrl.trim();
  const withoutPrefix = trimmed.startsWith("file:")
    ? trimmed.slice("file:".length)
    : trimmed;
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

const dbPath = resolveDbPath(process.env.DATABASE_URL!);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const sqlite =
  global.__sqlite ??
  new Database(dbPath, {
    fileMustExist: false,
  });

ensureSchema(sqlite);

export const db = global.__drizzle ?? drizzle(sqlite);

if (process.env.NODE_ENV !== "production") {
  global.__sqlite = sqlite;
  global.__drizzle = db;
}
