import { applyEnvDefaults } from "@/lib/env";
import type { DbProvider } from "./types";
import { createNeonProvider } from "./neon";
import { createSqliteProvider } from "./sqlite";

applyEnvDefaults();

declare global {
  var __dbProvider: DbProvider | undefined;
  var __dbCache: DbProvider | undefined;
}

function isPostgresUrl(url: string) {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export const db: DbProvider = global.__dbProvider ?? (() => {
  const url = process.env.DATABASE_URL!;
  return isPostgresUrl(url) ? createNeonProvider(url) : createSqliteProvider(url);
})();

export const dbCache: DbProvider | null = (() => {
  const url = process.env.SQLITE_CACHE_URL?.trim();
  if (!url) return null;
  return global.__dbCache ?? createSqliteProvider(url);
})();

if (process.env.NODE_ENV !== "production") {
  global.__dbProvider = db;
  if (dbCache) global.__dbCache = dbCache;
}
