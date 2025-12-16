import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const brands = await db.listBrands();
  return Response.json({ brands });
}
