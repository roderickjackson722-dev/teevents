import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch every public leaderboard score row for a tournament.
 *
 * The Data API caps a single response at 1000 rows. A multi-round event with a
 * full field easily exceeds that (18 holes x 2 rounds x 40+ players), which
 * silently truncated hole-by-hole breakdowns on the live leaderboard. This
 * helper pages through the RPC until every row is loaded.
 */
export async function fetchAllPublicLeaderboardScores(tournamentId: string): Promise<any[]> {
  const PAGE = 1000;
  const all: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await (supabase as any)
      .rpc("get_public_leaderboard_scores", { _tournament_id: tournamentId })
      .range(from, from + PAGE - 1);
    if (error) {
      if (from === 0) return [];
      break;
    }
    const rows = (data as any[]) || [];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
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
  const PAGE = 1000;
  const columns = opts?.columns ?? "registration_id, hole_number, strokes, round_number";
  const all: any[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = (supabase as any)
      .from("tournament_scores")
      .select(columns)
      .eq("tournament_id", tournamentId);
    if (opts?.roundNumber != null) query = query.eq("round_number", opts.roundNumber);
    const { data, error } = await query
      .order("registration_id", { ascending: true })
      .order("hole_number", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data as any[]) || [];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}
