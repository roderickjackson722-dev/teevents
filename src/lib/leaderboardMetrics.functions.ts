import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface LeaderboardMetricInput {
  /** e.g. "scores.fetch", "scores.save", "leaderboard.public.fetch", "export.csv" */
  operation: string;
  durationMs: number;
  rowCount?: number;
  pageCount?: number;
  retryCount?: number;
  tournamentId?: string | null;
  leagueEventId?: string | null;
  roundNumber?: number | null;
  ok?: boolean;
  errorMessage?: string | null;
  context?: Record<string, unknown>;
}

/** Anything slower than this is worth surfacing in the server logs. */
const SLOW_MS = 3000;

/**
 * Records leaderboard read/write latency, pagination page counts and retry
 * counts so bottlenecks on very large events (20k-50k score rows) are visible
 * both in the server logs and in the leaderboard_performance_log table.
 */
export const logLeaderboardMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: LeaderboardMetricInput) => input)
  .handler(async ({ data, context }) => {
    const {
      operation,
      durationMs,
      rowCount = 0,
      pageCount = 0,
      retryCount = 0,
      tournamentId = null,
      leagueEventId = null,
      roundNumber = null,
      ok = true,
      errorMessage = null,
      context: extra = {},
    } = data;

    const line =
      `[leaderboard-perf] ${operation} ${Math.round(durationMs)}ms rows=${rowCount} ` +
      `pages=${pageCount} retries=${retryCount} round=${roundNumber ?? "-"} ` +
      `tournament=${tournamentId ?? "-"} ok=${ok}`;
    if (!ok) console.error(line, errorMessage ?? "");
    else if (durationMs >= SLOW_MS || retryCount > 0) console.warn(`SLOW ${line}`);
    else console.log(line);

    const { error } = await context.supabase.from("leaderboard_performance_log").insert({
      user_id: context.userId,
      operation,
      duration_ms: Math.round(durationMs),
      row_count: rowCount,
      page_count: pageCount,
      retry_count: retryCount,
      tournament_id: tournamentId,
      league_event_id: leagueEventId,
      round_number: roundNumber,
      ok,
      error_message: errorMessage,
      context: extra as any,
    } as any);
    if (error) {
      // Telemetry must never break scoring.
      console.error("[leaderboard-perf] insert failed", error.message);
      return { logged: false };
    }
    return { logged: true };
  });
