import { applyEnvDefaults } from "@/lib/env";
import { importFromPath } from "@/server/importer";
import { assertOwner } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = assertOwner(request);
  if (denied) return denied;
  applyEnvDefaults();
  const filePath = process.env.DEFAULT_EXPORT_PATH!;
  try {
    const result = await importFromPath(filePath, "auto");
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("[import:auto]", e);
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to auto-import." },
      { status: 500 },
    );
  }
}
