/**
 * Tally XML Response Parser
 *
 * Parses XML responses from Tally ERP 9 Collection export format.
 *
 * VERIFIED RESPONSE FORMAT:
 * ```xml
 * <COLLECTION>
 *   <STOCKITEM NAME="Item Name" RESERVEDNAME="">
 *     <PARENT TYPE="String">Brand Name</PARENT>
 *     <BASEUNITS TYPE="String">nos</BASEUNITS>
 *     <CLOSINGBALANCE TYPE="Quantity"> 3 nos</CLOSINGBALANCE>
 *   </STOCKITEM>
 * </COLLECTION>
 * ```
 */

import { XMLParser } from "fast-xml-parser";
import { normalizeWhitespace } from "@/server/parsers/common";
import type { RawTallyStockItem } from "./types";

// ============================================================================
// XML PARSER CONFIGURATION
// ============================================================================

/**
 * XML Parser configured for Tally's response format.
 * - ignoreAttributes: false - We NEED the NAME attribute from STOCKITEM
 * - attributeNamePrefix: "@_" - Attributes prefixed with @_
 * - textNodeName: "#text" - Text content accessible via #text
 */
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: false, // Keep leading space in " 3 nos" for accurate parsing
  parseAttributeValue: false, // Keep as strings
  parseTagValue: false, // Keep as strings to avoid number coercion issues
});

// ============================================================================
// PRIMARY PARSER - VERIFIED WORKING FORMAT
// ============================================================================

/**
 * Parses Tally XML response from Collection export.
 *
 * Expected structure:
 * ```
 * ENVELOPE > BODY > DATA > COLLECTION > STOCKITEM[]
 * ```
 *
 * Each STOCKITEM has:
 * - @_NAME attribute: Stock item name
 * - PARENT element: Stock group (brand)
 * - BASEUNITS element: Unit of measure
 * - CLOSINGBALANCE element: Quantity with unit suffix (e.g., " 3 nos")
 *
 * @param xmlText - Raw XML response from Tally
 * @returns Array of parsed stock items
 */
export function parseTallyStockResponse(xmlText: string): RawTallyStockItem[] {
  if (!xmlText || !xmlText.trim()) {
    console.warn("[Tally Parser] Empty response received");
    return [];
  }

  try {
    const parsed = xmlParser.parse(xmlText);

    // Navigate to COLLECTION element
    const collection = findCollection(parsed);
    if (!collection) {
      console.warn("[Tally Parser] No COLLECTION element found in response");
      return [];
    }

    // Get STOCKITEM array
    const stockItems = extractStockItemArray(collection);
    if (stockItems.length === 0) {
      console.warn("[Tally Parser] No STOCKITEM elements found in COLLECTION");
      return [];
    }

    console.log(`[Tally Parser] Found ${stockItems.length} stock items`);

    // Transform each STOCKITEM to RawTallyStockItem
    const results = stockItems
      .map(parseStockItem)
      .filter((item): item is RawTallyStockItem => item !== null && item.name.trim() !== "");

    console.log(`[Tally Parser] Successfully parsed ${results.length} valid items`);
    return results;

  } catch (error) {
    console.error("[Tally Parser] Failed to parse response:", error);
    return [];
  }
}

// ============================================================================
// COLLECTION FINDER
// ============================================================================

/**
 * Finds the COLLECTION element in the parsed response.
 * Tries multiple paths since Tally response structure can vary.
 */
function findCollection(parsed: unknown): Record<string, unknown> | null {
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as Record<string, unknown>;

  // Path 1: ENVELOPE > BODY > DATA > COLLECTION
  let collection = getNestedValue(obj, ["ENVELOPE", "BODY", "DATA", "COLLECTION"]);
  if (collection) return collection as Record<string, unknown>;

  // Path 2: Direct COLLECTION at root (simplified response)
  if (obj.COLLECTION) return obj.COLLECTION as Record<string, unknown>;

  // Path 3: ENVELOPE > COLLECTION
  collection = getNestedValue(obj, ["ENVELOPE", "COLLECTION"]);
  if (collection) return collection as Record<string, unknown>;

  return null;
}

/**
 * Extracts STOCKITEM array from COLLECTION.
 * Handles both single item and array cases.
 */
function extractStockItemArray(collection: Record<string, unknown>): unknown[] {
  const stockItems = collection.STOCKITEM;

  if (!stockItems) return [];
  if (Array.isArray(stockItems)) return stockItems;
  return [stockItems]; // Single item case
}

// ============================================================================
// STOCKITEM PARSER
// ============================================================================

/**
 * Parses a single STOCKITEM element to RawTallyStockItem.
 *
 * Expected format:
 * ```xml
 * <STOCKITEM NAME="1 Week Tournament" RESERVEDNAME="">
 *   <PARENT TYPE="String">Babolat</PARENT>
 *   <BASEUNITS TYPE="String">nos</BASEUNITS>
 *   <CLOSINGBALANCE TYPE="Quantity"> 3 nos</CLOSINGBALANCE>
 *   <LANGUAGENAME.LIST>...</LANGUAGENAME.LIST>
 * </STOCKITEM>
 * ```
 */
function parseStockItem(raw: unknown): RawTallyStockItem | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;

  // Extract NAME from @_NAME attribute (CRITICAL - this is how Tally sends it)
  const name = extractName(item);
  if (!name) return null;

  // Extract PARENT element text (brand/stock group)
  const parent = extractElementText(item.PARENT);

  // Extract BASEUNITS element text (unit of measure)
  const baseUnits = extractElementText(item.BASEUNITS);

  // Extract and parse CLOSINGBALANCE (e.g., " 3 nos" or "" for zero)
  const closingBalanceRaw = extractElementText(item.CLOSINGBALANCE);
  const { qty, unit: parsedUnit } = parseClosingBalance(closingBalanceRaw);

  // Use BASEUNITS if available, fallback to unit from CLOSINGBALANCE
  const unit = baseUnits || parsedUnit;

  return {
    name,
    parent,
    closingQty: qty,
    unit,
    closingRate: null, // Not requested in current query
    closingValue: null, // Not requested in current query
  };
}

/**
 * Extracts stock item name.
 * Primary: @_NAME attribute
 * Fallback: NAME child element
 */
function extractName(item: Record<string, unknown>): string | null {
  // Primary: NAME attribute (as @_NAME due to parser config)
  if (typeof item["@_NAME"] === "string" && item["@_NAME"].trim()) {
    return normalizeWhitespace(item["@_NAME"]);
  }

  // Fallback: NAME child element
  const nameElement = extractElementText(item.NAME);
  if (nameElement) return nameElement;

  return null;
}

/**
 * Extracts text content from a Tally element.
 * Handles: direct string, {#text: string}, or {TYPE: string, #text: string}
 */
function extractElementText(element: unknown): string | null {
  if (!element) return null;

  // Direct string
  if (typeof element === "string") {
    const trimmed = normalizeWhitespace(element);
    return trimmed || null;
  }

  // Object with #text or direct text content
  if (typeof element === "object") {
    const obj = element as Record<string, unknown>;

    // Check #text property
    if (typeof obj["#text"] === "string") {
      const trimmed = normalizeWhitespace(obj["#text"]);
      return trimmed || null;
    }

    // Sometimes fast-xml-parser puts text directly as value
    // for elements with TYPE attribute
    const values = Object.values(obj).filter(v => typeof v === "string");
    for (const val of values) {
      const trimmed = normalizeWhitespace(val as string);
      if (trimmed && !["String", "Quantity", "Rate", "Amount"].includes(trimmed)) {
        return trimmed;
      }
    }
  }

  return null;
}

/**
 * Parses CLOSINGBALANCE value like " 3 nos" or "100.5 pcs".
 *
 * Format: "[space]<number> <unit>" or empty string for zero
 *
 * Examples:
 * - " 3 nos" → { qty: 3, unit: "nos" }
 * - "100.5 pcs" → { qty: 100.5, unit: "pcs" }
 * - "" or null → { qty: 0, unit: null }
 * - " -5 nos" → { qty: -5, unit: "nos" }
 */
function parseClosingBalance(value: string | null): { qty: number | null; unit: string | null } {
  if (!value || !value.trim()) {
    // Empty closing balance means 0 stock
    return { qty: 0, unit: null };
  }

  const trimmed = value.trim();

  // Match pattern: optional sign, number (with optional decimals), space, unit
  // Examples: "3 nos", "100.5 pcs", "-5 kg", "1,234.56 units"
  const match = trimmed.match(/^([+-]?\s*[\d,]+(?:\.\d+)?)\s*(.*)$/);

  if (!match) {
    console.warn(`[Tally Parser] Could not parse CLOSINGBALANCE: "${value}"`);
    return { qty: null, unit: null };
  }

  // Parse quantity (remove commas, convert to number)
  const qtyStr = match[1].replace(/,/g, "").replace(/\s/g, "");
  const qty = parseFloat(qtyStr);

  // Extract unit
  const unit = match[2].trim() || null;

  return {
    qty: Number.isFinite(qty) ? qty : null,
    unit,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets a nested value from an object by path.
 */
function getNestedValue(obj: unknown, path: string[]): unknown {
  let current = obj;

  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;

    const record = current as Record<string, unknown>;
    current = record[key];

    // Handle arrays - take first element (unless it's the last path segment)
    if (Array.isArray(current) && current.length > 0 && path.indexOf(key) < path.length - 1) {
      current = current[0];
    }
  }

  return current;
}

// ============================================================================
// ERROR DETECTION
// ============================================================================

/**
 * Checks if Tally response indicates an error.
 */
export function isTallyErrorResponse(xmlText: string): { isError: boolean; message?: string } {
  if (!xmlText) {
    return { isError: true, message: "Empty response from Tally" };
  }

  try {
    const parsed = xmlParser.parse(xmlText);

    // Check for error indicators in various locations
    const errorPaths = [
      ["ENVELOPE", "BODY", "DATA", "LINEERROR"],
      ["ENVELOPE", "BODY", "DESC", "CMPINFO", "ERROR"],
      ["ENVELOPE", "LINEERROR"],
      ["RESPONSE", "ERROR"],
    ];

    for (const path of errorPaths) {
      const error = getNestedValue(parsed, path);
      if (error) {
        return { isError: true, message: String(error) };
      }
    }

    // Check for status containing "Error"
    const status = getNestedValue(parsed, ["ENVELOPE", "BODY", "DESC", "STATUS"]);
    if (status && String(status).toLowerCase().includes("error")) {
      return { isError: true, message: String(status) };
    }

    return { isError: false };
  } catch (error) {
    return { isError: true, message: `Failed to parse response: ${error}` };
  }
}
