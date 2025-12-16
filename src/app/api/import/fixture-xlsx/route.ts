import fs from "node:fs/promises";
import path from "node:path";
import { importFromUpload } from "@/server/importer";
import { assertOwner } from "@/server/auth";
import { db, dbCache } from "@/server/db";
import { seedCloudFromCacheIfEmpty } from "@/server/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = assertOwner(request);
  if (denied) return denied;

  try {
    await seedCloudFromCacheIfEmpty(db, dbCache);
  } catch (e) {
    console.warn("[db:seed]", e);
  }

  try {
    const fixturePath = path.join(process.cwd(), "public", "fixtures", "GdwnSum.xlsx");
    const content = await fs.readFile(fixturePath);
    const result = await importFromUpload("GdwnSum.xlsx", content);
    return Response.json({ ok: true, ...result, source: "sample" });
  } catch (e) {
    console.error("[import:fixture-xlsx]", e);
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to import fixture XLSX." },
      { status: 500 },
    );
  }
}
