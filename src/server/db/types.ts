import type { Availability } from "@/lib/domain";

export type ProductRow = {
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

export type Summary = {
  total: number;
  inStock: number;
  outOfStock: number;
  negative: number;
  unknown: number;
  lastImportAt: number | null;
};

export type ListProductsParams = {
  search?: string;
  brand?: string;
  availability?: Availability;
  sort?: "name" | "qty" | "availability";
  dir?: "asc" | "desc";
  limit?: number;
};

export type UpsertStockItem = {
  id: string;
  name: string;
  nameKey: string;
  brand: string | null;
  stockQty: number | null;
  unit: string | null;
  availability: Availability;
  lastSeenAt: number;
  createdAt: number;
  updatedAt: number;
};

export type DbProvider = {
  kind: "neon" | "sqlite";
  getSummary(): Promise<Summary>;
  listBrands(): Promise<string[]>;
  listProducts(params: ListProductsParams): Promise<ProductRow[]>;
  upsertStock(items: UpsertStockItem[]): Promise<{ upserted: number }>;
  setDealerPrice(productId: string, dealerPrice: number | null): Promise<{ ok: true } | { ok: false; error: string }>;
};

