import fs from "node:fs/promises";
import path from "node:path";
import { applyEnvDefaults } from "@/lib/env";
import { assertOwner } from "@/server/auth";
import { db, dbCache } from "@/server/db";
import { seedCloudFromCacheIfEmpty } from "@/server/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertOwner(request);
  if (denied) return denied;

  try {
    await seedCloudFromCacheIfEmpty(db, dbCache);
  } catch (e) {
    console.warn("[db:seed]", e);
  }

  applyEnvDefaults();
  const filePath = process.env.DEFAULT_EXPORT_PATH!;

  try {
    const stat = await fs.stat(filePath);
    return Response.json({
      path: filePath,
      exists: true,
      ext: path.extname(filePath).toLowerCase(),
      mtimeMs: stat.mtimeMs,
      size: stat.size,
    });
  } catch (e) {
    return Response.json({
      path: filePath,
      exists: false,
      error: e instanceof Error ? e.message : "Failed to stat default file path.",
    });
  }
}
