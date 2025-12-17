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

export type ProductChangeType = "NEW_PRODUCT" | "STOCK_DROP" | "OUT_OF_STOCK" | "PRICE_CHANGE";

export type ProductChange = {
  id: string;
  productId: string;
  name: string;
  brand: string | null;
  changeType: ProductChangeType;
  fromQty: number | null;
  toQty: number | null;
  fromAvailability: Availability | null;
  toAvailability: Availability | null;
  fromPrice: number | null;
  toPrice: number | null;
  createdAt: number;
};

export type ListChangesParams = {
  limit?: number;
  changeTypes?: ProductChangeType[];
  since?: number;
  productId?: string;
};

export type DbProvider = {
  kind: "neon" | "sqlite";
  getSummary(): Promise<Summary>;
  listBrands(): Promise<string[]>;
  listProducts(params: ListProductsParams): Promise<ProductRow[]>;
  upsertStock(items: UpsertStockItem[]): Promise<{ upserted: number }>;
  deleteProductsByNameKeys(nameKeys: string[]): Promise<{ deleted: number }>;
  setDealerPrice(productId: string, dealerPrice: number | null): Promise<{ ok: true } | { ok: false; error: string }>;
  listChanges(params: ListChangesParams): Promise<ProductChange[]>;
};
