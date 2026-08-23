/**
 * Single source of truth for the scoring code shown on printables.
 *
 * A group's shared code (`group_scoring_code`) is what Pairings writes and what
 * gets emailed for the currently published round, so it always wins over any
 * older per-player `scoring_code` left over from a previous round.
 */
export function effectiveScoringCode(r: any): string | null {
  return (r?.group_scoring_code as string | null) || (r?.scoring_code as string | null) || null;
}
