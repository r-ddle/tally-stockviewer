import { db } from "@/server/db"
import type { ProductChangeType } from "@/server/db/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limitParam = searchParams.get("limit")
  const sinceParam = searchParams.get("since")
  const typesParam = searchParams.get("types")

  const limit = limitParam ? Math.max(1, Math.min(300, Number.parseInt(limitParam, 10))) : 50
  const since = sinceParam ? Number.parseInt(sinceParam, 10) : undefined
  const changeTypes = typesParam
    ? typesParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean) as ProductChangeType[]
    : undefined

  const items = await db.listChanges({ limit, since, changeTypes })
  return Response.json({ items })
}
