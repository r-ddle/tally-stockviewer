import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { products } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const totalRow = db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .get();

  const byAvailability = db
    .select({
      availability: products.availability,
      count: sql<number>`count(*)`,
    })
    .from(products)
    .groupBy(products.availability)
    .all();

  const maxSeen = db
    .select({ max: sql<number | null>`max(${products.lastSeenAt})` })
    .from(products)
    .get();

  const counts: Record<string, number> = {};
  for (const row of byAvailability) counts[row.availability] = row.count;

  return Response.json({
    total: totalRow?.count ?? 0,
    inStock: counts.IN_STOCK ?? 0,
    outOfStock: counts.OUT_OF_STOCK ?? 0,
    negative: counts.NEGATIVE ?? 0,
    unknown: counts.UNKNOWN ?? 0,
    lastImportAt: maxSeen?.max ?? null,
  });
}

