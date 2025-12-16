import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await db.getSummary();
  return Response.json(summary);
}
