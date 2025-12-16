import { XMLParser } from "fast-xml-parser";
import { looksLikeBrandHeader, normalizeWhitespace, parseQty, shouldIgnoreRowName } from "./common";
import type { ParsedItem } from "./types";

function nodeText(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const t = obj["#text"];
  if (typeof t === "string") return t;
  if (typeof t === "number") return String(t);
  return null;
}

function firstChild(node: unknown, tag: string): unknown | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const arr = obj[tag];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[0] ?? null;
}

function getDispNameFromAccName(accNode: unknown): string | null {
  const dsp = firstChild(accNode, "DSPDISPNAME");
  if (!dsp) return null;
  return nodeText(dsp);
}

function getQtyFromStkInfo(stkNode: unknown): { qty: number | null; unit: string | null } {
  const stkcl = firstChild(stkNode, "DSPSTKCL");
  if (!stkcl) return { qty: null, unit: null };
  const qtyNode = firstChild(stkcl, "DSPCLQTY");
  const qtyText = qtyNode ? nodeText(qtyNode) : null;
  return parseQty(qtyText);
}

export function parseTallyXml(xmlText: string): ParsedItem[] {
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: true,
    trimValues: true,
  });

  const parsed = parser.parse(xmlText) as unknown[];
  if (!Array.isArray(parsed)) return [];

  const envelope = parsed.find(
    (n): n is { ENVELOPE: unknown[] } =>
      !!n && typeof n === "object" && "ENVELOPE" in (n as Record<string, unknown>),
  );
  const children = envelope?.ENVELOPE;
  if (!Array.isArray(children)) return [];

  const items: ParsedItem[] = [];
  let currentBrand: string | null = null;
  let pendingName: string | null = null;

  for (const node of children) {
    if (!node || typeof node !== "object") continue;
    const obj = node as Record<string, unknown>;

    if ("DSPACCNAME" in obj) {
      const accNode = Array.isArray(obj.DSPACCNAME) ? obj.DSPACCNAME[0] : null;
      const name = accNode ? getDispNameFromAccName(accNode) : null;
      pendingName = name ? normalizeWhitespace(name) : null;
      continue;
    }

    if ("DSPSTKINFO" in obj && pendingName) {
      const stkNode = Array.isArray(obj.DSPSTKINFO) ? obj.DSPSTKINFO[0] : null;
      const { qty, unit } = stkNode ? getQtyFromStkInfo(stkNode) : { qty: null, unit: null };

      if (shouldIgnoreRowName(pendingName)) {
        pendingName = null;
        continue;
      }

      if (looksLikeBrandHeader(pendingName)) {
        currentBrand = pendingName;
        pendingName = null;
        continue;
      }

      items.push({
        name: pendingName,
        brand: currentBrand,
        qty,
        unit,
      });
      pendingName = null;
      continue;
    }
  }

  return items;
}
