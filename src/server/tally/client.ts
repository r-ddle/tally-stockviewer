/**
 * Tally HTTP Client
 *
 * HTTP client for communicating with Tally ERP 9 XML API.
 * Tally exposes an HTTP server (default port 9000) that accepts XML requests
 * and returns XML responses.
 *
 * This client:
 * - Sends XML requests to fetch stock data
 * - Parses responses and normalizes to RawTallyStockItem[]
 * - Handles connection errors and timeouts gracefully
 *
 * Usage:
 * ```ts
 * const client = createTallyClient({ host: 'localhost', port: 9000, timeout: 30000 });
 * const result = await client.fetchGodownStock({
 *   company: 'Ralhum Trading Company (Pv) Ltd - 21/22',
 *   godown: 'Feeder Stores'
 * });
 * ```
 */

import type {
  TallyClient,
  TallyClientConfig,
  FetchGodownStockOptions,
  TallyFetchResult,
} from "./types";
import {
  buildGodownStockRequest,
  buildStockItemCollectionRequest,
  buildConnectionTestRequest,
} from "./xml-builder";
import { parseTallyStockResponse, isTallyErrorResponse } from "./xml-parser";

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: TallyClientConfig = {
  host: "localhost",
  port: 9000,
  timeout: 30000, // 30 seconds
};

// ============================================================================
// TALLY CLIENT IMPLEMENTATION
// ============================================================================

/**
 * Creates a new Tally HTTP client.
 *
 * @param config - Client configuration (host, port, timeout)
 * @returns TallyClient instance
 */
export function createTallyClient(config: Partial<TallyClientConfig> = {}): TallyClient {
  const cfg: TallyClientConfig = {
    host: config.host ?? DEFAULT_CONFIG.host,
    port: config.port ?? DEFAULT_CONFIG.port,
    timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
  };

  const baseUrl = `http://${cfg.host}:${cfg.port}`;

  /**
   * Sends XML request to Tally and returns raw response text.
   */
  async function sendRequest(xmlBody: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), cfg.timeout);

    try {
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
          "Accept": "application/xml",
        },
        body: xmlBody,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Tally HTTP error: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Tally request timed out after ${cfg.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    async fetchGodownStock(options: FetchGodownStockOptions): Promise<TallyFetchResult> {
      const fetchedAt = Date.now();

      try {
        // Try multiple request formats as different Tally versions may respond differently
        // Note: buildGodownStockRequest and buildStockItemCollectionRequest now use the same verified format
        const requestStrategies = [
          { name: "Stock Collection", builder: buildStockItemCollectionRequest },
          { name: "Godown Summary", builder: buildGodownStockRequest },
        ];

        for (const strategy of requestStrategies) {
          try {
            console.log(`[TallyClient] Trying ${strategy.name} request...`);
            const xmlRequest = strategy.builder(options);
            const xmlResponse = await sendRequest(xmlRequest);

            // Check for Tally error response
            const errorCheck = isTallyErrorResponse(xmlResponse);
            if (errorCheck.isError) {
              console.warn(`[TallyClient] ${strategy.name} returned error: ${errorCheck.message}`);
              continue;
            }

            // Parse response
            const items = parseTallyStockResponse(xmlResponse);

            if (items.length > 0) {
              console.log(`[TallyClient] ${strategy.name} returned ${items.length} items`);
              return {
                success: true,
                items,
                count: items.length,
                fetchedAt,
              };
            }

            console.log(`[TallyClient] ${strategy.name} returned no items, trying next strategy...`);
          } catch (strategyError) {
            console.warn(`[TallyClient] ${strategy.name} failed:`, strategyError);
            // Continue to next strategy
          }
        }

        // All strategies failed
        return {
          success: false,
          items: [],
          error: "No stock items returned from Tally. Check that the company and godown names are correct.",
          count: 0,
          fetchedAt,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[TallyClient] fetchGodownStock error:", errorMessage);

        return {
          success: false,
          items: [],
          error: errorMessage,
          count: 0,
          fetchedAt,
        };
      }
    },

    async testConnection(): Promise<boolean> {
      try {
        const xmlRequest = buildConnectionTestRequest();
        const xmlResponse = await sendRequest(xmlRequest);

        // If we get any non-error response, connection is working
        const errorCheck = isTallyErrorResponse(xmlResponse);
        return !errorCheck.isError || xmlResponse.length > 100;
      } catch (error) {
        console.error("[TallyClient] Connection test failed:", error);
        return false;
      }
    },
  };
}

// ============================================================================
// SINGLETON CLIENT FOR CONFIGURED COMPANY/GODOWN
// ============================================================================

/**
 * Default Tally client configured from environment variables.
 *
 * Environment variables:
 * - TALLY_HOST: Tally server host (default: localhost)
 * - TALLY_PORT: Tally server port (default: 9000)
 * - TALLY_TIMEOUT: Request timeout in ms (default: 30000)
 */
export function getDefaultTallyClient(): TallyClient {
  return createTallyClient({
    host: process.env.TALLY_HOST ?? "localhost",
    port: parseInt(process.env.TALLY_PORT ?? "9000", 10),
    timeout: parseInt(process.env.TALLY_TIMEOUT ?? "30000", 10),
  });
}

// ============================================================================
// BUSINESS CONSTANTS
// ============================================================================

/**
 * Default company name for Tally requests.
 * This is the company name as it appears in Tally.
 */
export const DEFAULT_TALLY_COMPANY = "Ralhum Trading Company (Pv) Ltd - 21/22";

/**
 * Default godown name for stock queries.
 * This is the godown name as it appears in Tally.
 */
export const DEFAULT_TALLY_GODOWN = "Feeder Stores";
