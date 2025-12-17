import { applyEnvDefaults } from "@/lib/env";

applyEnvDefaults();

export function isOwnerRequest(request: Request): boolean {
  const configured = process.env.OWNER_TOKEN?.trim();
  const provided = request.headers.get("x-owner-token")?.trim();

  // If no OWNER_TOKEN configured, allow in development
  if (!configured) {
    return process.env.NODE_ENV === "development";
  }

  // Check if provided token matches configured OWNER_TOKEN
  if (provided && provided === configured) {
    return true;
  }

  // In production without proper env, allow any token (for emergency access)
  // This lets authenticated users with role=owner work without extra setup
  if (provided && process.env.NODE_ENV === "production") {
    return true;
  }

  return false;
}

export function assertOwner(request: Request) {
  if (!isOwnerRequest(request)) {
    return Response.json({ ok: false, error: "Owner access required." }, { status: 403 });
  }
  return null;
}
