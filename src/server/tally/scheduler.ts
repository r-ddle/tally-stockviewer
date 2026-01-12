/**
 * Tally Refresh Scheduler
 *
 * Manages scheduled background refreshes from Tally ERP 9.
 * Runs every hour (configurable) to keep stock data in sync.
 *
 * ## How it works
 *
 * 1. On server startup, the scheduler is initialized
 * 2. Every hour, it calls refreshFromTally()
 * 3. Results are logged and stored for monitoring
 * 4. Errors are caught and logged, never crashing the server
 *
 * ## Configuration
 *
 * Environment variables:
 * - TALLY_REFRESH_ENABLED: Set to "false" to disable (default: true)
 * - TALLY_REFRESH_INTERVAL_MS: Interval in ms (default: 3600000 = 1 hour)
 * - TALLY_REFRESH_ON_START: Whether to refresh immediately on start (default: false)
 *
 * ## Usage
 *
 * The scheduler is designed for long-running Node processes.
 * For serverless (Vercel), use the API endpoint with external cron.
 *
 * ```ts
 * // Start scheduler (typically in server initialization)
 * import { startTallyScheduler } from '@/server/tally';
 * startTallyScheduler();
 *
 * // Check status
 * const status = getLastRefreshStatus();
 *
 * // Stop scheduler (for graceful shutdown)
 * stopTallyScheduler();
 * ```
 */

import { refreshFromTally, type TallyRefreshResult } from "./refresh";

// ============================================================================
// STATE
// ============================================================================

/** Interval timer reference */
let schedulerInterval: NodeJS.Timeout | null = null;

/** Whether scheduler is currently running */
let isRunning = false;

/** Last refresh result for monitoring */
let lastRefreshResult: TallyRefreshResult | null = null;

/** Last refresh error for monitoring */
let lastRefreshError: string | null = null;

/** Lock to prevent concurrent refreshes */
let isRefreshing = false;

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Default refresh interval: 1 hour */
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Gets scheduler configuration from environment.
 */
function getSchedulerConfig(): {
  enabled: boolean;
  intervalMs: number;
  refreshOnStart: boolean;
} {
  return {
    enabled: process.env.TALLY_REFRESH_ENABLED !== "false",
    intervalMs: parseInt(process.env.TALLY_REFRESH_INTERVAL_MS ?? "", 10) || DEFAULT_INTERVAL_MS,
    refreshOnStart: process.env.TALLY_REFRESH_ON_START === "true",
  };
}

// ============================================================================
// SCHEDULER FUNCTIONS
// ============================================================================

/**
 * Starts the Tally refresh scheduler.
 *
 * This should be called once during server initialization.
 * It will schedule refreshFromTally() to run at the configured interval.
 *
 * Safe to call multiple times - will not create duplicate intervals.
 *
 * @returns Whether scheduler was started
 */
export function startTallyScheduler(): boolean {
  const config = getSchedulerConfig();

  if (!config.enabled) {
    console.log("[TallyScheduler] Disabled via TALLY_REFRESH_ENABLED=false");
    return false;
  }

  if (isRunning) {
    console.log("[TallyScheduler] Already running, skipping start");
    return false;
  }

  console.log(`[TallyScheduler] Starting scheduler`);
  console.log(`[TallyScheduler] Interval: ${config.intervalMs}ms (${config.intervalMs / 60000} minutes)`);
  console.log(`[TallyScheduler] Refresh on start: ${config.refreshOnStart}`);

  isRunning = true;

  // Schedule recurring refresh
  schedulerInterval = setInterval(() => {
    executeRefresh().catch(err => {
      console.error("[TallyScheduler] Unhandled error in scheduled refresh:", err);
    });
  }, config.intervalMs);

  // Optionally refresh immediately on start
  if (config.refreshOnStart) {
    console.log("[TallyScheduler] Triggering initial refresh...");
    executeRefresh().catch(err => {
      console.error("[TallyScheduler] Unhandled error in initial refresh:", err);
    });
  }

  console.log("[TallyScheduler] ✓ Scheduler started successfully");
  return true;
}

/**
 * Stops the Tally refresh scheduler.
 *
 * Call this during graceful shutdown to clean up.
 * Safe to call even if scheduler is not running.
 */
export function stopTallyScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }

  isRunning = false;
  console.log("[TallyScheduler] Stopped");
}

/**
 * Checks if the scheduler is currently running.
 */
export function isTallySchedulerRunning(): boolean {
  return isRunning;
}

/**
 * Gets the last refresh status for monitoring.
 *
 * @returns Last refresh result, error, and scheduler status
 */
export function getLastRefreshStatus(): {
  schedulerRunning: boolean;
  lastResult: TallyRefreshResult | null;
  lastError: string | null;
  isRefreshing: boolean;
} {
  return {
    schedulerRunning: isRunning,
    lastResult: lastRefreshResult,
    lastError: lastRefreshError,
    isRefreshing,
  };
}

/**
 * Manually triggers a refresh outside the schedule.
 *
 * Useful for:
 * - API endpoints that need immediate refresh
 * - Admin tools
 * - Testing
 *
 * @returns Refresh result
 */
export async function triggerManualRefresh(): Promise<TallyRefreshResult> {
  console.log("[TallyScheduler] Manual refresh triggered");
  return executeRefresh();
}

// ============================================================================
// INTERNAL FUNCTIONS
// ============================================================================

/**
 * Executes a refresh operation.
 *
 * Handles:
 * - Preventing concurrent refreshes
 * - Error catching and logging
 * - Storing results for monitoring
 */
async function executeRefresh(): Promise<TallyRefreshResult> {
  // Prevent concurrent refreshes
  if (isRefreshing) {
    console.log("[TallyScheduler] Refresh already in progress, skipping");
    return lastRefreshResult ?? {
      success: false,
      error: "Refresh already in progress",
      source: "tally",
      company: "",
      godown: "",
      fetchedCount: 0,
      parsedCount: 0,
      upsertedCount: 0,
      invalidCount: 0,
      startedAt: Date.now(),
      completedAt: Date.now(),
      durationMs: 0,
    };
  }

  isRefreshing = true;
  lastRefreshError = null;

  try {
    console.log("[TallyScheduler] Executing scheduled refresh...");
    const result = await refreshFromTally();

    lastRefreshResult = result;

    if (result.success) {
      console.log(`[TallyScheduler] ✓ Refresh completed: ${result.upsertedCount} items synced`);
    } else {
      console.error(`[TallyScheduler] ✗ Refresh failed: ${result.error}`);
      lastRefreshError = result.error ?? "Unknown error";
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[TallyScheduler] ✗ Refresh error:", message);

    lastRefreshError = message;
    lastRefreshResult = {
      success: false,
      error: message,
      source: "tally",
      company: process.env.TALLY_COMPANY ?? "",
      godown: process.env.TALLY_GODOWN ?? "",
      fetchedCount: 0,
      parsedCount: 0,
      upsertedCount: 0,
      invalidCount: 0,
      startedAt: Date.now(),
      completedAt: Date.now(),
      durationMs: 0,
    };

    return lastRefreshResult;
  } finally {
    isRefreshing = false;
  }
}

// ============================================================================
// INITIALIZATION HELPER
// ============================================================================

/**
 * Initialize scheduler if in appropriate environment.
 *
 * This is designed to be called conditionally:
 * - In a long-running Node process (e.g., custom server): call this
 * - In Vercel serverless: don't call, use API + external cron instead
 *
 * @example
 * ```ts
 * // In custom server startup
 * if (process.env.TALLY_SCHEDULER_MODE === 'embedded') {
 *   initTallySchedulerIfNeeded();
 * }
 * ```
 */
export function initTallySchedulerIfNeeded(): void {
  // Only auto-start if explicitly configured
  const mode = process.env.TALLY_SCHEDULER_MODE;

  if (mode === "embedded") {
    startTallyScheduler();
  } else if (mode === "api") {
    console.log("[TallyScheduler] Running in API mode - use /api/import/tally endpoint with external cron");
  } else {
    console.log("[TallyScheduler] No scheduler mode configured. Set TALLY_SCHEDULER_MODE=embedded or TALLY_SCHEDULER_MODE=api");
  }
}
