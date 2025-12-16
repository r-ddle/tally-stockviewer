import { db, dbCache } from "@/server/db";
import { assertOwner } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = assertOwner(request);
  if (denied) return denied;
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

  const result = await db.setDealerPrice(id, dealerPrice);
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 404 });

  if (dbCache && dbCache.kind !== db.kind) {
    await dbCache.setDealerPrice(id, dealerPrice);
  }

  return Response.json({ ok: true, productId: id, dealerPrice });
}
