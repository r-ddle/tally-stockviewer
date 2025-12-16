import { importFromUpload } from "@/server/importer";
import { assertOwner } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = assertOwner(request);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: "Missing file field 'file'." }, { status: 400 });
    }

    const filename = file.name || "upload";
    const content = Buffer.from(await file.arrayBuffer());
    const result = await importFromUpload(filename, content);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("[import:upload]", e);
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to import upload." },
      { status: 500 },
    );
  }
}
