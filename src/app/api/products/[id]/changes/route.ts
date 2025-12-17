import { db } from "@/server/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const items = await db.listChanges({ productId: id, limit: 30 })
  return Response.json({ items })
}
