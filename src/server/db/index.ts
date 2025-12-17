import type { DbProvider } from "./types";
import { createNeonProvider } from "./neon";

declare global {
  var __dbProvider: DbProvider | undefined;
  var __dbProviderUrl: string | undefined;
}

function isPostgresUrl(url: string) {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export const db: DbProvider = (() => {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required and must point to Neon Postgres.");
  }
  if (!isPostgresUrl(url)) {
    throw new Error("Only Postgres DATABASE_URL values are supported (Neon is the primary database).");
  }

  if (
    process.env.NODE_ENV !== "production" &&
    global.__dbProvider &&
    global.__dbProvider.kind === "neon" &&
    global.__dbProviderUrl === url &&
    typeof (global.__dbProvider as any).deleteProductsByNameKeys === "function" &&
    typeof (global.__dbProvider as any).listChanges === "function"
  ) {
    return global.__dbProvider;
  }

  const provider = createNeonProvider(url);
  if (process.env.NODE_ENV !== "production") {
    global.__dbProvider = provider;
    global.__dbProviderUrl = url;
  }
  return provider;
})();
