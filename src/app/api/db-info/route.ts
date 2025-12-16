import { assertOwner } from "@/server/auth";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertOwner(request);
  if (denied) return denied;
  return Response.json({ ok: true, kind: db.kind });
}

