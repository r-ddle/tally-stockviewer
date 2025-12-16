import { and, asc, desc, eq, isNull, like, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { prices, products } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Availability = "IN_STOCK" | "OUT_OF_STOCK" | "NEGATIVE" | "UNKNOWN";
const AVAILABILITY: Availability[] = ["IN_STOCK", "OUT_OF_STOCK", "NEGATIVE", "UNKNOWN"];
function isAvailability(value: string): value is Availability {
  return (AVAILABILITY as string[]).includes(value);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const brand = (url.searchParams.get("brand") ?? "").trim();
  const availability = (url.searchParams.get("availability") ?? "").trim();
  const sort = (url.searchParams.get("sort") ?? "name").trim();
  const dir = (url.searchParams.get("dir") ?? "asc").trim();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 5000), 20000);

  const filters: SQL[] = [];
  if (search) {
    const q = `%${search.toLowerCase()}%`;
    filters.push(like(sql`lower(${products.name})`, q));
  }
  if (brand) {
    if (brand === "__unknown__") filters.push(isNull(products.brand));
    else filters.push(eq(products.brand, brand));
  }
  if (availability && isAvailability(availability)) {
    filters.push(eq(products.availability, availability));
  }

  const order =
    sort === "qty"
      ? products.stockQty
      : sort === "availability"
        ? products.availability
        : products.name;

  const rows = db
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      stockQty: products.stockQty,
      unit: products.unit,
      availability: products.availability,
      lastSeenAt: products.lastSeenAt,
      updatedAt: products.updatedAt,
      dealerPrice: prices.dealerPrice,
    })
    .from(products)
    .leftJoin(prices, eq(prices.productId, products.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(dir === "desc" ? desc(order) : asc(order))
    .limit(Number.isFinite(limit) ? limit : 5000)
    .all();

  return Response.json({
    items: rows.map((r) => ({
      ...r,
      lastSeenAt: r.lastSeenAt ? r.lastSeenAt.getTime() : null,
      updatedAt: r.updatedAt.getTime(),
    })),
  });
}
