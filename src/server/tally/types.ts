/**
 * Tally Integration Types
 *
 * This module defines types for the Tally ERP 9 XML HTTP API integration.
 * The Tally client fetches stock/godown data and normalizes it to the same
 * ParsedItem format used by Excel and XML parsers.
 */

import { z } from "zod";

// ============================================================================
// RAW TALLY RESPONSE TYPES
// ============================================================================

/**
 * Raw stock item row as returned from Tally XML API.
 * These fields are extracted from the STOCKITEM elements in the response.
 */
export type RawTallyStockItem = {
  /** Stock item name from Tally (STOCKITEM.NAME) */
  name: string;
  /** Parent group/brand name (STOCKITEM.PARENT or STOCKGROUP) */
  parent: string | null;
  /** Closing quantity in the godown */
  closingQty: number | null;
  /** Unit of measure (e.g., "nos", "pcs", "kg") */
  unit: string | null;
  /** Closing rate/price per unit */
  closingRate: number | null;
  /** Total closing value (qty * rate) */
  closingValue: number | null;
};

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

/**
 * Schema to validate individual stock items from Tally response.
 * Ensures data integrity before normalization.
 */
export const RawTallyStockItemSchema = z.object({
  name: z.string().min(1, "Stock item name is required"),
  parent: z.string().nullable(),
  closingQty: z.number().nullable(),
  unit: z.string().nullable(),
  closingRate: z.number().nullable(),
  closingValue: z.number().nullable(),
});

/**
 * Schema for validating array of stock items from Tally.
 */
export const RawTallyStockArraySchema = z.array(RawTallyStockItemSchema);

// ============================================================================
// TALLY CLIENT INTERFACE
// ============================================================================

/**
 * Configuration for Tally HTTP API connection.
 */
export type TallyClientConfig = {
  /** Tally HTTP API host (default: localhost) */
  host: string;
  /** Tally HTTP API port (default: 9000) */
  port: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout: number;
};

/**
 * Options for fetching godown stock data.
 */
export type FetchGodownStockOptions = {
  /** Company name in Tally (required) */
  company: string;
  /** Godown name to fetch stock for (required) */
  godown: string;
  /** Optional: fetch data as of a specific date (YYYYMMDD format) */
  asOfDate?: string;
};

/**
 * Result from Tally stock fetch operation.
 */
export type TallyFetchResult = {
  /** Whether the fetch was successful */
  success: boolean;
  /** Array of raw stock items on success */
  items: RawTallyStockItem[];
  /** Error message on failure */
  error?: string;
  /** Number of items fetched */
  count: number;
  /** Timestamp of the fetch */
  fetchedAt: number;
};

/**
 * Tally client interface for fetching stock data.
 */
export interface TallyClient {
  /**
   * Fetch godown stock summary from Tally.
   * Returns raw stock items that can be normalized using normalizeTallyRowToItem().
   */
  fetchGodownStock(options: FetchGodownStockOptions): Promise<TallyFetchResult>;

  /**
   * Test connection to Tally server.
   * Returns true if Tally is reachable and responding.
   */
  testConnection(): Promise<boolean>;
}

// ============================================================================
// TALLY XML REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Tally request envelope type identifier.
 */
export type TallyRequestType =
  | "Export Data"      // For TDL-based exports
  | "Function"         // For function calls
  | "Data";            // For direct data queries

/**
 * Tally XML request envelope structure.
 */
export type TallyXmlRequest = {
  type: TallyRequestType;
  id: string;
  body: string;
};
