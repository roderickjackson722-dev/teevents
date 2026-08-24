import type { LeaderboardMetricInput } from "./leaderboardMetrics.functions";

/** Mutable counters a paginated fetch/save fills in while it runs. */
export interface PerfStats {
  rowCount: number;
  pageCount: number;
  retryCount: number;
}

export function newPerfStats(): PerfStats {
  return { rowCount: 0, pageCount: 0, retryCount: 0 };
}

let enabled = true;
/** Escape hatch for tests / low-signal environments. */
export function setLeaderboardMetricsEnabled(value: boolean) {
  enabled = value;
}

function isTestEnv() {
  try {
    return (
      (import.meta as any)?.env?.MODE === "test" ||
      (typeof process !== "undefined" && !!(process as any).env?.VITEST)
    );
  } catch {
    return false;
  }
}

/** Fire-and-forget: telemetry must never slow down or break scoring. */
export function reportLeaderboardMetric(metric: LeaderboardMetricInput) {
  if (!enabled || isTestEnv() || typeof window === "undefined") return;
  void (async () => {
    try {
      const { logLeaderboardMetric } = await import("./leaderboardMetrics.functions");
      await (logLeaderboardMetric as any)({ data: metric });
    } catch {
      /* ignore */
    }
  })();
}

/**
 * Time an operation and ship latency + pagination stats to the server log.
 * The callback receives a stats object it may mutate (rows/pages/retries).
 */
export async function measureLeaderboardOp<T>(
  operation: string,
  meta: Omit<LeaderboardMetricInput, "operation" | "durationMs">,
  fn: (stats: PerfStats) => Promise<T>,
): Promise<T> {
  const stats = newPerfStats();
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const elapsed = () => (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;
  try {
    const result = await fn(stats);
    reportLeaderboardMetric({
      ...meta,
      operation,
      durationMs: elapsed(),
      rowCount: stats.rowCount || meta.rowCount || 0,
      pageCount: stats.pageCount,
      retryCount: stats.retryCount,
      ok: true,
    });
    return result;
  } catch (e: any) {
    reportLeaderboardMetric({
      ...meta,
      operation,
      durationMs: elapsed(),
      rowCount: stats.rowCount,
      pageCount: stats.pageCount,
      retryCount: stats.retryCount,
      ok: false,
      errorMessage: e?.message ? String(e.message).slice(0, 500) : "unknown error",
    });
    throw e;
  }
}
