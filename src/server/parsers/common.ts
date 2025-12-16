import type { Availability } from "@/lib/domain";

const PRODUCT_MARKERS = [
  "size",
  "gen",
  "model",
  "jr",
  "junior",
  "kids",
  "women",
  "men",
  "unisex",
  "pack",
  "set",
  "pair",
  "gauge",
  "mm",
  "cm",
  "kg",
  "lbs",
  "inch",
  "pro",
  "team",
  "tour",
];

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function nameKeyFromName(name: string): string {
  return normalizeWhitespace(name).toLowerCase();
}

export function parseQty(text: string | null | undefined): {
  qty: number | null;
  unit: string | null;
} {
  if (!text) return { qty: null, unit: null };
  const trimmed = normalizeWhitespace(text);
  if (!trimmed) return { qty: null, unit: null };

  const match = trimmed.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*(.*)\s*$/);
  if (!match) return { qty: null, unit: null };

  const qtyRaw = match[1]?.replace(/,/g, "") ?? "";
  const qty = Number.parseFloat(qtyRaw);
  if (!Number.isFinite(qty)) return { qty: null, unit: null };

  const unitRaw = (match[2] ?? "").trim();
  return { qty, unit: unitRaw ? unitRaw : null };
}

export function parseMaybeNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "");
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
}

export function availabilityFromQty(qty: number | null): Availability {
  if (qty == null || !Number.isFinite(qty)) return "UNKNOWN";
  if (qty > 0) return "IN_STOCK";
  if (qty === 0) return "OUT_OF_STOCK";
  return "NEGATIVE";
}

export function looksLikeBrandHeader(name: string): boolean {
  const trimmed = normalizeWhitespace(name);
  if (!trimmed) return false;
  if (trimmed.length > 25) return false;
  if (/\d/.test(trimmed)) return false;
  if (/[/:]/.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (PRODUCT_MARKERS.some((m) => new RegExp(`\\b${m}\\b`, "i").test(lower))) return false;
  if (/total|subtotal|grand total/i.test(trimmed)) return false;
  return true;
}

export function shouldIgnoreRowName(name: string): boolean {
  const trimmed = normalizeWhitespace(name);
  if (!trimmed) return true;
  return /^(grand\s+total|total|sub\s*total|subtotal)\b/i.test(trimmed);
}
