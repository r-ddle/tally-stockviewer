import fs from "node:fs/promises";
import path from "node:path";
import { importFromUpload } from "@/server/importer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
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

