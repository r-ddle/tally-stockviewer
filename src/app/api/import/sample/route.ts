import path from "node:path";
import { importSampleXml } from "@/server/importer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const samplePath = path.join(process.cwd(), "public", "fixtures", "GdwnSum.xml");
    const result = await importSampleXml(samplePath);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("[import:sample]", e);
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to import sample." },
      { status: 500 },
    );
  }
}
