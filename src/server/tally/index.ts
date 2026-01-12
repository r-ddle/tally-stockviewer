/**
 * Tally Integration Module
 *
 * This module provides live data synchronization from Tally ERP 9 to the
 * stock viewer database. It fetches stock data from Tally's XML HTTP API
 * and normalizes it to the same format as Excel imports.
 *
 * ## Architecture
 *
 * The Tally integration uses the same data pipeline as manual Excel uploads:
 *
 * ```
 * Tally ERP 9 ──▶ XML HTTP API ──▶ RawTallyStockItem[]
 *                                          │
 *                                          ▼
 *                                   normalizeTallyItems()
 *                                          │
 *                                          ▼
 *                                    ParsedItem[]  ◀── Also used by xlsx.ts
 *                                          │
 *                                          ▼
 *                                   syncParsedItems()
 *                                          │
 *                                          ▼
 *                                   Neon Postgres DB
 * ```
 *
 * ## Usage
 *
 * ### Manual refresh:
 * ```ts
 * import { refreshFromTally } from '@/server/tally';
 *
 * const result = await refreshFromTally();
 * if (result.success) {
 *   console.log(`Synced ${result.upserted} items from Tally`);
 * }
 * ```
 *
 * ### Scheduled refresh (hourly):
 * The scheduler starts automatically when the server starts (in production)
 * or can be triggered via the /api/import/tally endpoint.
 *
 * ## Configuration
 *
 * Environment variables:
 * - TALLY_HOST: Tally server host (default: localhost)
 * - TALLY_PORT: Tally server port (default: 9000)
 * - TALLY_TIMEOUT: Request timeout in ms (default: 30000)
 * - TALLY_COMPANY: Company name (default: Ralhum Trading Company (Pv) Ltd - 21/22)
 * - TALLY_GODOWN: Godown name (default: Feeder Stores)
 * - TALLY_REFRESH_ENABLED: Enable/disable auto-refresh (default: true)
 * - TALLY_REFRESH_INTERVAL_MS: Refresh interval in ms (default: 3600000 = 1 hour)
 */

// Re-export types
export type {
  TallyClient,
  TallyClientConfig,
  FetchGodownStockOptions,
  TallyFetchResult,
  RawTallyStockItem,
} from "./types";

// Re-export client
export {
  createTallyClient,
  getDefaultTallyClient,
  DEFAULT_TALLY_COMPANY,
  DEFAULT_TALLY_GODOWN,
} from "./client";

// Re-export normalizer
export {
  normalizeTallyRowToItem,
  normalizeTallyItems,
  validateNormalizedItems,
} from "./normalizer";

// Re-export refresh function
export { refreshFromTally, testTallyConnection, previewTallyData, type TallyRefreshResult } from "./refresh";

// Re-export scheduler
export {
  startTallyScheduler,
  stopTallyScheduler,
  isTallySchedulerRunning,
  getLastRefreshStatus,
  triggerManualRefresh,
} from "./scheduler";
