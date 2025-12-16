import { asc, isNotNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { products } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = db
    .selectDistinct({ brand: products.brand })
    .from(products)
    .where(isNotNull(products.brand))
    .orderBy(asc(products.brand))
    .all();

  return Response.json({ brands: rows.map((r) => r.brand!).filter(Boolean) });
}

