import { supabase } from "@/integrations/supabase/client";

/**
 * The Data API caps a single response at 1000 rows. Large events (1000+ paid
 * players across multiple rounds) can easily produce 20,000+ score rows, so
 * every leaderboard read pages through the whole result set.
 *
 * Pages are fetched in small parallel batches so a 20,000-row event needs
 * ~5 round trips' worth of latency instead of 20 sequential ones, and each
 * page retries briefly on transient network/timeout failures.
 */
export const PAGE_SIZE = 1000;
/** Hard ceiling so a runaway query can never spin forever. */
export const MAX_ROWS = 100_000;
const PARALLEL_PAGES = 4;
const RETRIES = 2;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/**
 * Page through any range-able Supabase query builder until every row is loaded.
 * `makeQuery` must return a fresh builder each call (builders are single-use).
 */
export async function fetchAllPages<T = any>(
  makeQuery: () => any,
  opts?: { onError?: "throw" | "empty"; maxRows?: number },
): Promise<T[]> {
  const maxRows = opts?.maxRows ?? MAX_ROWS;
  const all: T[] = [];
  let from = 0;
  let done = false;

  while (!done && all.length < maxRows) {
    const starts = Array.from({ length: PARALLEL_PAGES }, (_, i) => from + i * PAGE_SIZE);
    const batches = await Promise.all(
      starts.map((start) =>
        withRetry(async () => {
          const { data, error } = await makeQuery().range(start, start + PAGE_SIZE - 1);
          if (error) throw error;
          return (data as T[]) || [];
        }).catch((e) => {
          if (opts?.onError === "empty") return null;
          throw e;
        }),
      ),
    );

    for (const rows of batches) {
      if (rows === null) {
        done = true;
        break;
      }
      all.push(...rows);
      if (rows.length < PAGE_SIZE) {
        done = true;
        break;
      }
    }
    from += PARALLEL_PAGES * PAGE_SIZE;
  }

  return all.slice(0, maxRows);
}

/** Split a large write into database-friendly chunks (default 500 rows). */
export function chunkRows<T>(rows: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/**
 * Fetch every public leaderboard score row for a tournament, paging past the
 * 1000-row response cap (supports 20,000+ row events).
 */
export async function fetchAllPublicLeaderboardScores(tournamentId: string): Promise<any[]> {
  try {
    return await fetchAllPages(
      () =>
        (supabase as any)
          .rpc("get_public_leaderboard_scores", { _tournament_id: tournamentId })
          .order("registration_id", { ascending: true })
          .order("round_number", { ascending: true })
          .order("hole_number", { ascending: true }),
      { onError: "empty" },
    );
  } catch {
    return [];
  }
}

/**
 * Fetch every `tournament_scores` row for a tournament (optionally a single
 * round), paging past the Data API's 1000-row response cap so late holes and
 * later rounds never come back blank on large events.
 */
export async function fetchAllTournamentScores(
  tournamentId: string,
  opts?: { roundNumber?: number; columns?: string },
): Promise<any[]> {
  const columns = opts?.columns ?? "registration_id, hole_number, strokes, round_number";
  return fetchAllPages(() => {
    let query = (supabase as any)
      .from("tournament_scores")
      .select(columns)
      .eq("tournament_id", tournamentId);
    if (opts?.roundNumber != null) query = query.eq("round_number", opts.roundNumber);
    return query
      .order("registration_id", { ascending: true })
      .order("round_number", { ascending: true })
      .order("hole_number", { ascending: true });
  });
}

/**
 * Fetch every registration row for a tournament. Large events can exceed the
 * 1000-row cap on the roster itself, which would silently drop players from
 * the leaderboard and exports.
 */
export async function fetchAllRegistrations(
  tournamentId: string,
  columns: string,
  opts?: { orderBy?: string },
): Promise<any[]> {
  return fetchAllPages(() => {
    const query = (supabase as any)
      .from("tournament_registrations")
      .select(columns)
      .eq("tournament_id", tournamentId);
    return opts?.orderBy ? query.order(opts.orderBy) : query.order("id", { ascending: true });
  });
}
