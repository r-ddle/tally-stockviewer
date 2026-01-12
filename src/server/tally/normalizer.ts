/**
 * Tally Data Normalizer
 *
 * Converts raw Tally stock items to the same ParsedItem format used by
 * the Excel and XML parsers. This ensures that data from Tally goes through
 * the same pipeline as manually uploaded files.
 *
 * Data Flow:
 * ┌─────────────────┐     ┌───────────────┐     ┌────────────────┐
 * │  Tally XML API  │────▶│ RawTallyStock │────▶│  ParsedItem    │
 * └─────────────────┘     │     Item      │     │ (same as xlsx) │
 *                         └───────────────┘     └────────────────┘
 *                                                      │
 * ┌─────────────────┐     ┌───────────────┐            │
 * │  Excel Upload   │────▶│  xlsx parser  │────────────┤
 * └─────────────────┘     └───────────────┘            │
 *                                                      ▼
 *                                              ┌────────────────┐
 *                                              │  syncParsed    │
 *                                              │    Items()     │
 *                                              └────────────────┘
 *                                                      │
 *                                                      ▼
 *                                              ┌────────────────┐
 *                                              │   Database     │
 *                                              │ (Neon Postgres)│
 *                                              └────────────────┘
 */

import type { ParsedItem } from "@/server/parsers/types";
import type { RawTallyStockItem } from "./types";
import { RawTallyStockItemSchema } from "./types";
import {
  normalizeWhitespace,
  looksLikeBrandHeader,
  shouldIgnoreRowName,
} from "@/server/parsers/common";

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Converts a single Tally stock item to the ParsedItem format.
 *
 * This function ensures that Tally data is normalized to EXACTLY the same
 * structure as data parsed from Excel files, maintaining schema compatibility.
 *
 * @param row - Raw stock item from Tally XML API
 * @returns ParsedItem matching the Excel parser output format
 */
export function normalizeTallyRowToItem(row: RawTallyStockItem): ParsedItem {
  // Apply the same whitespace normalization as Excel parser
  const name = normalizeWhitespace(row.name);
  const brand = row.parent ? normalizeWhitespace(row.parent) : null;

  // Quantity normalization: same handling as cellNumber() in xlsx.ts
  let qty: number | null = null;
  if (row.closingQty != null && Number.isFinite(row.closingQty)) {
    qty = row.closingQty;
  }

  // Unit normalization: same handling as xlsx.ts extractUnitFromNumFmt
  let unit: string | null = null;
  if (row.unit) {
    const normalized = normalizeWhitespace(row.unit);
    // Only keep unit if it looks like a valid unit string
    if (/^[a-zA-Z][a-zA-Z0-9._-]*$/i.test(normalized)) {
      unit = normalized;
    }
  }

  return {
    name,
    brand,
    qty,
    unit,
  };
}

/**
 * Validates and normalizes an array of Tally stock items.
 *
 * Applies the same filtering rules as the Excel parser:
 * - Removes items with empty names
 * - Removes brand header rows (they become the brand field, not products)
 * - Removes total/subtotal rows
 * - Removes items with null quantities
 *
 * @param rawItems - Array of raw Tally stock items
 * @returns Array of normalized ParsedItems ready for DB sync
 */
export function normalizeTallyItems(rawItems: RawTallyStockItem[]): ParsedItem[] {
  const validItems: ParsedItem[] = [];

  for (const raw of rawItems) {
    // Validate raw item structure
    const parseResult = RawTallyStockItemSchema.safeParse(raw);
    if (!parseResult.success) {
      console.warn("[TallyNormalizer] Invalid item skipped:", parseResult.error.message);
      continue;
    }

    const item = normalizeTallyRowToItem(raw);

    // Apply same filtering as xlsx.ts
    if (!item.name) continue;
    if (shouldIgnoreRowName(item.name)) continue;

    // Skip brand header rows (same logic as xlsx.ts isBrandHeader check)
    // In Tally export, parent IS the brand, so items with name matching parent pattern
    // but no qty are brand headers
    if (item.qty == null && looksLikeBrandHeader(item.name)) continue;

    // Only include items with valid quantities (same as xlsx.ts "if (r.qty == null) continue")
    if (item.qty == null) continue;

    // Ensure brand is set - Tally provides parent directly
    // Unlike Excel where we track currentBrand, Tally items already have parent
    if (!item.brand) {
      // If no parent, we could skip or assign "Unknown"
      // For consistency with Excel flow which requires currentBrand, skip items without brand
      continue;
    }

    validItems.push(item);
  }

  return validItems;
}

/**
 * Groups raw Tally items by their parent (brand) for debugging/analysis.
 */
export function groupByBrand(items: RawTallyStockItem[]): Map<string, RawTallyStockItem[]> {
  const groups = new Map<string, RawTallyStockItem[]>();

  for (const item of items) {
    const brand = item.parent ? normalizeWhitespace(item.parent) : "Unknown";
    const existing = groups.get(brand) ?? [];
    existing.push(item);
    groups.set(brand, existing);
  }

  return groups;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates that normalized items match expected schema.
 * Uses the same validation logic applied to Excel-parsed items.
 *
 * @param items - Normalized ParsedItems
 * @returns Validation result with details
 */
export function validateNormalizedItems(items: ParsedItem[]): {
  valid: boolean;
  errors: string[];
  validCount: number;
  invalidCount: number;
} {
  const errors: string[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemErrors: string[] = [];

    // Validate name (required, non-empty)
    if (!item.name || !normalizeWhitespace(item.name)) {
      itemErrors.push("Missing or empty name");
    }

    // Validate brand (should be non-empty for proper categorization)
    if (!item.brand || !normalizeWhitespace(item.brand)) {
      itemErrors.push("Missing brand");
    }

    // Validate quantity (should be a finite number)
    if (item.qty != null && !Number.isFinite(item.qty)) {
      itemErrors.push(`Invalid quantity: ${item.qty}`);
    }

    if (itemErrors.length > 0) {
      errors.push(`Item ${i + 1} (${item.name || "unknown"}): ${itemErrors.join(", ")}`);
      invalidCount++;
    } else {
      validCount++;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validCount,
    invalidCount,
  };
}
