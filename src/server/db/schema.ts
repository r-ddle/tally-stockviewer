import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const AVAILABILITY = ["IN_STOCK", "OUT_OF_STOCK", "NEGATIVE", "UNKNOWN"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull().unique(),
    brand: text("brand"),
    stockQty: real("stock_qty"),
    unit: text("unit"),
    availability: text("availability", { enum: AVAILABILITY }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => ({
    brandIdx: index("idx_products_brand").on(t.brand),
    availabilityIdx: index("idx_products_availability").on(t.availability),
    lastSeenIdx: index("idx_products_last_seen_at").on(t.lastSeenAt),
  }),
);

export const prices = sqliteTable(
  "prices",
  {
    productId: text("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    dealerPrice: real("dealer_price"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => ({
    productIdx: index("idx_prices_product_id").on(t.productId),
  }),
);

