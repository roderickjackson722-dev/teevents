/**
 * Round closure helpers for multi-round tournaments.
 *
 * A round is "closed" once the organizer locks it from the dashboard. Closed
 * rounds reject score writes at the database level, and the player scoring app
 * automatically moves on to the next open round while keeping the same scoring
 * codes.
 */

export type RoundStatus = "active" | "closed";

export interface TournamentRoundRow {
  round_number: number;
  status: string | null;
  closed_at?: string | null;
}

/** Set of closed round numbers from the tournament_rounds rows. */
export function closedRoundSet(rows: TournamentRoundRow[] | null | undefined): Set<number> {
  const set = new Set<number>();
  (rows || []).forEach((r) => {
    if ((r.status || "active") === "closed") set.add(Number(r.round_number));
  });
  return set;
}

/**
 * Round players should be entering scores for: the date-derived active round,
 * advanced past any closed rounds (never beyond the last configured round).
 */
export function nextOpenRound(
  activeRound: number,
  closed: Set<number>,
  totalRounds: number
): number {
  const max = Math.max(1, totalRounds || 1);
  let r = Math.max(1, activeRound || 1);
  while (r < max && closed.has(r)) r++;
  return r;
}

/**
 * Hole the scoring app should open on. Takes any number of candidate holes
 * (player `starting_hole`, the pairings-derived hole, …) and returns the first
 * usable one clamped to 1–18. Players with no assignment fall back to Hole 1 so
 * the app always opens on a valid hole.
 */
export function resolveStartingHole(
  candidates: Array<number | string | null | undefined>,
  fallback = 1
): number {
  for (const c of candidates) {
    const n = typeof c === "string" ? parseInt(c, 10) : Number(c);
    if (Number.isFinite(n) && n >= 1 && n <= 18) return Math.floor(n);
  }
  const f = Math.floor(Number(fallback));
  return Number.isFinite(f) && f >= 1 && f <= 18 ? f : 1;
}
