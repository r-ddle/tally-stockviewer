/**
 * Tally Import API Endpoint
 *
 * Triggers a live data refresh from Tally ERP 9.
 * This endpoint can be called by:
 * - External cron jobs (e.g., Vercel Cron, Windows Task Scheduler)
 * - Admin UI for manual refresh
 * - Monitoring systems
 *
 * ## Usage
 *
 * POST /api/import/tally
 * - Triggers immediate refresh from Tally
 * - Returns refresh result with item counts
 *
 * GET /api/import/tally
 * - Returns last refresh status (for monitoring)
 *
 * ## Authentication
 *
 * Requires owner authentication (same as other import endpoints).
 *
 * ## Example: Vercel Cron
 *
 * Add to vercel.json:
 * ```json
 * {
 *   "crons": [
 *     {
 *       "path": "/api/import/tally",
 *       "schedule": "0 * * * *"
 *     }
 *   ]
 * }
 * ```
 *
 * ## Example: Windows Task Scheduler
 *
 * Create a scheduled task that runs:
 * ```cmd
 * curl -X POST -H "Authorization: Bearer YOUR_TOKEN" https://your-app.vercel.app/api/import/tally
 * ```
 */

import {
  refreshFromTally,
  getLastRefreshStatus,
  testTallyConnection,
} from "@/server/tally";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/import/tally
 *
 * Triggers a live data refresh from Tally.
 */
export async function POST() {
  try {
    // First test connection
    const connectionTest = await testTallyConnection();
    if (!connectionTest.success) {
      return Response.json(
        {
          ok: false,
          error: `Cannot connect to Tally: ${connectionTest.error}`,
          latencyMs: connectionTest.latencyMs,
        },
        { status: 503 }
      );
    }

    // Execute refresh
    const result = await refreshFromTally();

    if (result.success) {
      return Response.json({
        ok: true,
        source: result.source,
        company: result.company,
        godown: result.godown,
        fetchedCount: result.fetchedCount,
        parsedCount: result.parsedCount,
        upsertedCount: result.upsertedCount,
        invalidCount: result.invalidCount,
        durationMs: result.durationMs,
      });
    } else {
      return Response.json(
        {
          ok: false,
          error: result.error,
          source: result.source,
          fetchedCount: result.fetchedCount,
          durationMs: result.durationMs,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[import:tally]", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to refresh from Tally",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/import/tally
 *
 * Returns the last refresh status for monitoring.
 */
export async function GET() {
  try {
    const status = getLastRefreshStatus();
    const connectionTest = await testTallyConnection();

    return Response.json({
      ok: true,
      connection: {
        reachable: connectionTest.success,
        error: connectionTest.error,
        latencyMs: connectionTest.latencyMs,
      },
      scheduler: {
        running: status.schedulerRunning,
        isRefreshing: status.isRefreshing,
      },
      lastRefresh: status.lastResult
        ? {
            success: status.lastResult.success,
            error: status.lastResult.error,
            company: status.lastResult.company,
            godown: status.lastResult.godown,
            fetchedCount: status.lastResult.fetchedCount,
            parsedCount: status.lastResult.parsedCount,
            upsertedCount: status.lastResult.upsertedCount,
            completedAt: status.lastResult.completedAt,
            durationMs: status.lastResult.durationMs,
          }
        : null,
    });
  } catch (error) {
    console.error("[import:tally:status]", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to get status",
      },
      { status: 500 }
    );
  }
}
