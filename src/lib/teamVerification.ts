/**
 * Per-team "Verify and Approve" state for the organizer scoring screen.
 *
 * Verification is a review marker only — it never touches scores, teams or
 * any stored tournament data. It is kept in this browser's localStorage,
 * keyed by tournament and round, so no data-model change is needed.
 */

const key = (tournamentId: string, round: number) => `lb-verified:${tournamentId}:${round}`;

export function loadVerifiedTeams(tournamentId: string, round: number): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key(tournamentId, round));
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveVerifiedTeams(tournamentId: string, round: number, verified: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(tournamentId, round), JSON.stringify(Array.from(verified)));
  } catch {
    /* storage full/unavailable — verification simply won't persist */
  }
}
