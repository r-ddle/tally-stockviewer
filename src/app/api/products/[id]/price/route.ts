import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { prices, products } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { dealerPrice?: unknown } | null;
  const dealerPriceRaw = body?.dealerPrice;
  const dealerPrice =
    dealerPriceRaw === null || dealerPriceRaw === undefined
      ? null
      : typeof dealerPriceRaw === "number" && Number.isFinite(dealerPriceRaw)
        ? dealerPriceRaw
        : typeof dealerPriceRaw === "string" && dealerPriceRaw.trim()
          ? Number.parseFloat(dealerPriceRaw)
          : null;

  const product = db.select({ id: products.id }).from(products).where(eq(products.id, id)).get();
  if (!product) return Response.json({ ok: false, error: "Not found." }, { status: 404 });

  const now = new Date();
  db.insert(prices)
    .values({ productId: id, dealerPrice, updatedAt: now })
    .onConflictDoUpdate({
      target: prices.productId,
      set: { dealerPrice, updatedAt: now },
    })
    .run();

  return Response.json({ ok: true, productId: id, dealerPrice });
}
