import type { Availability } from "@/lib/domain";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const brand = (url.searchParams.get("brand") ?? "").trim();
  const availability = (url.searchParams.get("availability") ?? "").trim();
  const sort = (url.searchParams.get("sort") ?? "name").trim();
  const dir = (url.searchParams.get("dir") ?? "asc").trim();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 5000), 20000);

  const availabilityValue =
    availability === "IN_STOCK" || availability === "OUT_OF_STOCK" || availability === "NEGATIVE" || availability === "UNKNOWN"
      ? (availability as Availability)
      : undefined;

  const sortValue = sort === "qty" || sort === "availability" ? (sort as "qty" | "availability") : "name";
  const dirValue = dir === "desc" ? "desc" : "asc";

  const items = await db.listProducts({
    search: search || undefined,
    brand: brand || undefined,
    availability: availabilityValue,
    sort: sortValue,
    dir: dirValue,
    limit,
  });

  return Response.json({ items });
}
