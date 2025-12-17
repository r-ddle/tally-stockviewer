import { db } from "@/server/db"
import type { ProductChangeType } from "@/server/db/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const productId = params.id
  const items = await db.listChanges({ productId, limit: 30 })
  return Response.json({ items })
}
