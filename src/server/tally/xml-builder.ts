/**
 * Tally XML Request Builder
 *
 * Generates XML request envelopes for Tally ERP 9 XML HTTP API.
 * Uses the VERIFIED WORKING Collection export format.
 *
 * Reference: Tally Developer Documentation for XML Integration
 * Default port: 9000 (configurable in Tally)
 */

import type { FetchGodownStockOptions } from "./types";

// ============================================================================
// XML HELPERS
// ============================================================================

/**
 * Escapes special XML characters in a string.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ============================================================================
// PRIMARY STOCK ITEMS REQUEST (VERIFIED WORKING)
// ============================================================================

/**
 * Creates XML request to fetch ALL stock items with closing balance.
 *
 * This format has been VERIFIED WORKING with Tally ERP 9 via direct testing.
 * Returns all stock items with:
 * - NAME attribute: Stock item name
 * - PARENT element: Stock group (brand)
 * - BASEUNITS element: Unit of measure
 * - CLOSINGBALANCE element: Quantity with unit suffix (e.g., " 3 nos")
 *
 * @param options - Company to fetch stock for
 * @returns XML request string
 */
export function buildStockItemCollectionRequest(options: FetchGodownStockOptions): string {
  const { company } = options;

  return `<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Collection</TYPE>
<ID>StockItems</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${escapeXml(company)}</SVCURRENTCOMPANY>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL>
<TDLMESSAGE>
<COLLECTION NAME="StockItems" ISMODIFY="No" ISINITIALIZE="Yes">
<TYPE>Stock Item</TYPE>
<NATIVEMETHOD>Name</NATIVEMETHOD>
<NATIVEMETHOD>Parent</NATIVEMETHOD>
<NATIVEMETHOD>BaseUnits</NATIVEMETHOD>
<NATIVEMETHOD>ClosingBalance</NATIVEMETHOD>
</COLLECTION>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>`;
}

/**
 * Alias for the primary stock request function.
 * Used by the client for consistency.
 */
export function buildGodownStockRequest(options: FetchGodownStockOptions): string {
  return buildStockItemCollectionRequest(options);
}

// ============================================================================
// CONNECTION TEST REQUEST
// ============================================================================

/**
 * Creates a simple test request to verify Tally connection.
 * Uses the same format as stock items but with minimal data.
 *
 * @param company - Company name to test with
 * @returns XML request string for connection test
 */
export function buildConnectionTestRequest(company?: string): string {
  const companyName = company || "Ralhum Trading Company (Pv) Ltd - 21/22";

  return `<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Collection</TYPE>
<ID>ConnectionTest</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL>
<TDLMESSAGE>
<COLLECTION NAME="ConnectionTest" ISMODIFY="No" ISINITIALIZE="Yes">
<TYPE>Company</TYPE>
<NATIVEMETHOD>Name</NATIVEMETHOD>
</COLLECTION>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>`;
}
