import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { availabilityFromQty, nameKeyFromName, normalizeWhitespace } from "@/server/parsers/common";
import { parseTallyXlsx } from "@/server/parsers/xlsx";
import { parseTallyXml } from "@/server/parsers/xml";
import type { ParsedItem } from "@/server/parsers/types";
import { db } from "@/server/db";

export type ImportSource = "auto" | "upload" | "sample";

function parseByExtension(ext: string, content: Buffer): ParsedItem[] {
  if (ext === ".xlsx") return parseTallyXlsx(content);
  if (ext === ".xml") return parseTallyXml(content.toString("utf8"));
  throw new Error(`Unsupported file type: ${ext || "(no extension)"}. Expected .xlsx or .xml`);
}

export async function importFromPath(filePath: string, source: ImportSource) {
  const stat = await fs.stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const content = await fs.readFile(filePath);
  const parsed = parseByExtension(ext, content);
  if (parsed.length === 0) {
    throw new Error(
      `No items detected in ${path.basename(filePath)}. Ensure the export is a Tally Godown Summary and includes a Closing Qty column/field.`,
    );
  }
  const result = await syncParsedItems(parsed);
  return {
    source,
    path: filePath,
    ext,
    fileMtimeMs: stat.mtimeMs,
    fileSize: stat.size,
    parsedCount: parsed.length,
    ...result,
  };
}

export async function importFromUpload(filename: string, content: Buffer) {
  const ext = path.extname(filename).toLowerCase();
  const parsed = parseByExtension(ext, content);
  if (parsed.length === 0) {
    throw new Error(
      `No items detected in ${filename}. Ensure the export is a Tally Godown Summary and includes a Closing Qty column/field.`,
    );
  }
  const result = await syncParsedItems(parsed);
  return { source: "upload" as const, filename, ext, parsedCount: parsed.length, ...result };
}

export async function importSampleXml(samplePath: string) {
  const content = await fs.readFile(samplePath);
  const parsed = parseTallyXml(content.toString("utf8"));
  const result = await syncParsedItems(parsed);
  return { source: "sample" as const, filename: path.basename(samplePath), ext: ".xml", parsedCount: parsed.length, ...result };
}

export async function syncParsedItems(items: ParsedItem[]) {
  const now = Date.now();
  const dedup = new Map<string, ParsedItem>();
  for (const it of items) {
    const name = normalizeWhitespace(it.name);
    if (!name) continue;
    dedup.set(nameKeyFromName(name), { ...it, name });
  }
  const normalized = Array.from(dedup.entries()).map(([nameKey, it]) => ({
    id: crypto.randomUUID(),
    name: it.name,
    nameKey,
    brand: it.brand ? normalizeWhitespace(it.brand) : null,
    stockQty: it.qty,
    unit: it.unit ? normalizeWhitespace(it.unit) : null,
    availability: availabilityFromQty(it.qty),
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  }));

  const result = await db.upsertStock(normalized);

  return { upserted: result.upserted };
}
