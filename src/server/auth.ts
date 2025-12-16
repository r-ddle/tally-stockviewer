import { applyEnvDefaults } from "@/lib/env";

applyEnvDefaults();

export function isOwnerRequest(request: Request): boolean {
  const configured = process.env.OWNER_TOKEN?.trim();
  if (!configured) {
    return process.env.NODE_ENV === "development";
  }
  const provided = request.headers.get("x-owner-token")?.trim();
  return Boolean(provided && provided === configured);
}

export function assertOwner(request: Request) {
  if (!isOwnerRequest(request)) {
    return Response.json({ ok: false, error: "Owner access required." }, { status: 403 });
  }
  return null;
}

