import { isOwnerRequest } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configured = Boolean(process.env.OWNER_TOKEN?.trim());
  const mode = isOwnerRequest(request) ? "owner" : "viewer";
  return Response.json({ ok: true, configured, mode });
}

