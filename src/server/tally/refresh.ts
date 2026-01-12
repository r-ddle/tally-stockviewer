/**
 * Tally Refresh Function
 *
 * Main entry point for refreshing stock data from Tally ERP 9.
 * This function:
 * 1. Fetches raw stock data from Tally XML HTTP API
 * 2. Normalizes it to ParsedItem[] (same format as Excel parser)
 * 3. Uses the existing syncParsedItems() to persist to database
 *
 * The result is identical to what would happen if the user uploaded
 * an Excel file - same data shape, same validation, same DB operations.
 */

import { syncParsedItems } from "@/server/importer";
import {
  getDefaultTallyClient,
  DEFAULT_TALLY_COMPANY,
  DEFAULT_TALLY_GODOWN,
} from "./client";
import { normalizeTallyItems, validateNormalizedItems } from "./normalizer";
import type { TallyFetchResult, RawTallyStockItem } from "./types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of a Tally refresh operation.
 */
export type TallyRefreshResult = {
  /** Whether the refresh was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Source identifier */
  source: "tally";
  /** Company name used */
  company: string;
  /** Godown name used */
  godown: string;
  /** Number of items fetched from Tally */
  fetchedCount: number;
  /** Number of items after normalization/filtering */
  parsedCount: number;
  /** Number of items upserted to database */
  upsertedCount: number;
  /** Number of invalid items skipped */
  invalidCount: number;
  /** Timestamp when fetch started */
  startedAt: number;
  /** Timestamp when operation completed */
  completedAt: number;
  /** Duration in milliseconds */
  durationMs: number;
};

// ============================================================================
// MAIN REFRESH FUNCTION
// ============================================================================

/**
 * Refreshes stock data from Tally ERP 9.
 *
 * This is the main function called by the scheduler and API endpoint.
 * It fetches data from Tally, normalizes it to the same format as Excel
 * imports, and syncs to the database.
 *
 * @param options - Optional overrides for company/godown names
 * @returns TallyRefreshResult with operation details
 *
 * @example
 * ```ts
 * const result = await refreshFromTally();
 * if (result.success) {
 *   console.log(`Synced ${result.upsertedCount} items`);
 * } else {
 *   console.error(`Failed: ${result.error}`);
 * }
 * ```
 */
export async function refreshFromTally(options?: {
  company?: string;
  godown?: string;
}): Promise<TallyRefreshResult> {
  const startedAt = Date.now();

  // Use configured or default company/godown
  const company = options?.company ??
    process.env.TALLY_COMPANY ??
    DEFAULT_TALLY_COMPANY;
  const godown = options?.godown ??
    process.env.TALLY_GODOWN ??
    DEFAULT_TALLY_GODOWN;

  console.log(`[TallyRefresh] Starting refresh from Tally...`);
  console.log(`[TallyRefresh] Company: ${company}`);
  console.log(`[TallyRefresh] Godown: ${godown}`);

  try {
    // Step 1: Fetch from Tally
    const client = getDefaultTallyClient();
    const fetchResult: TallyFetchResult = await client.fetchGodownStock({
      company,
      godown,
    });

    if (!fetchResult.success) {
      return createErrorResult(
        `Tally fetch failed: ${fetchResult.error}`,
        company,
        godown,
        startedAt
      );
    }

    console.log(`[TallyRefresh] Fetched ${fetchResult.count} raw items from Tally`);

    // Step 2: Normalize to ParsedItem[] (same format as Excel)
    const normalizedItems = normalizeTallyItems(fetchResult.items);

    console.log(`[TallyRefresh] Normalized to ${normalizedItems.length} valid items`);

    // Step 3: Validate
    const validation = validateNormalizedItems(normalizedItems);
    if (validation.errors.length > 0) {
      console.warn(`[TallyRefresh] ${validation.errors.length} validation warnings`);
      // Log first few errors for debugging
      validation.errors.slice(0, 5).forEach(err => console.warn(`  - ${err}`));
    }

    // Step 4: Handle empty result
    if (normalizedItems.length === 0) {
      return createErrorResult(
        "No valid items after normalization. Check Tally data and godown name.",
        company,
        godown,
        startedAt,
        fetchResult.count
      );
    }

    // Step 5: Sync to database using SAME function as Excel import
    // This is the key to maintaining schema compatibility
    const syncResult = await syncParsedItems(normalizedItems);

    const completedAt = Date.now();
    const result: TallyRefreshResult = {
      success: true,
      source: "tally",
      company,
      godown,
      fetchedCount: fetchResult.count,
      parsedCount: normalizedItems.length,
      upsertedCount: syncResult.upserted,
      invalidCount: fetchResult.count - normalizedItems.length,
      startedAt,
      completedAt,
      durationMs: completedAt - startedAt,
    };

    console.log(`[TallyRefresh] ✓ Completed successfully`);
    console.log(`[TallyRefresh]   Fetched: ${result.fetchedCount}`);
    console.log(`[TallyRefresh]   Parsed: ${result.parsedCount}`);
    console.log(`[TallyRefresh]   Upserted: ${result.upsertedCount}`);
    console.log(`[TallyRefresh]   Duration: ${result.durationMs}ms`);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[TallyRefresh] Error:`, error);

    return createErrorResult(message, company, godown, startedAt);
  }
}

/**
 * Creates an error result object.
 */
function createErrorResult(
  error: string,
  company: string,
  godown: string,
  startedAt: number,
  fetchedCount = 0
): TallyRefreshResult {
  const completedAt = Date.now();
  return {
    success: false,
    error,
    source: "tally",
    company,
    godown,
    fetchedCount,
    parsedCount: 0,
    upsertedCount: 0,
    invalidCount: 0,
    startedAt,
    completedAt,
    durationMs: completedAt - startedAt,
  };
}

// ============================================================================
// TEST/DEBUG HELPERS
// ============================================================================

/**
 * Tests the Tally connection without modifying the database.
 * Useful for verifying configuration before enabling scheduled refresh.
 *
 * @returns Connection test result
 */
export async function testTallyConnection(): Promise<{
  success: boolean;
  error?: string;
  latencyMs: number;
}> {
  const start = Date.now();

  try {
    const client = getDefaultTallyClient();
    const isConnected = await client.testConnection();

    return {
      success: isConnected,
      error: isConnected ? undefined : "Could not connect to Tally server",
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Fetches items from Tally without persisting them.
 * Useful for debugging and previewing data.
 *
 * @returns Preview of what would be synced
 */
export async function previewTallyData(options?: {
  company?: string;
  godown?: string;
}): Promise<{
  success: boolean;
  error?: string;
  rawItems: RawTallyStockItem[];
  normalizedItems: { name: string; brand: string | null; qty: number | null; unit: string | null }[];
  summary: {
    totalRaw: number;
    totalNormalized: number;
    byBrand: Record<string, number>;
  };
}> {
  const company = options?.company ?? process.env.TALLY_COMPANY ?? DEFAULT_TALLY_COMPANY;
  const godown = options?.godown ?? process.env.TALLY_GODOWN ?? DEFAULT_TALLY_GODOWN;

  try {
    const client = getDefaultTallyClient();
    const fetchResult = await client.fetchGodownStock({ company, godown });

    if (!fetchResult.success) {
      return {
        success: false,
        error: fetchResult.error,
        rawItems: [],
        normalizedItems: [],
        summary: { totalRaw: 0, totalNormalized: 0, byBrand: {} },
      };
    }

    const normalized = normalizeTallyItems(fetchResult.items);

    // Count items by brand
    const byBrand: Record<string, number> = {};
    for (const item of normalized) {
      const brand = item.brand ?? "Unknown";
      byBrand[brand] = (byBrand[brand] ?? 0) + 1;
    }

    return {
      success: true,
      rawItems: fetchResult.items,
      normalizedItems: normalized,
      summary: {
        totalRaw: fetchResult.count,
        totalNormalized: normalized.length,
        byBrand,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      rawItems: [],
      normalizedItems: [],
      summary: { totalRaw: 0, totalNormalized: 0, byBrand: {} },
    };
  }
}
