/**
 * Which names a leaderboard row shows.
 *
 * `row.name` is the team name (or the player's own name for an individual
 * entry); `row.players` lists the individual players behind that row.
 */
export type NameDisplayMode = "both" | "player" | "team";

export function parseNameDisplayMode(value: unknown): NameDisplayMode | null {
  return value === "both" || value === "player" || value === "team" ? value : null;
}

/** Existing events keep showing both names until an organizer picks a mode. */
export function fallbackNameDisplayMode(): NameDisplayMode {
  return "both";
}

/** Header wording for the name column in each mode. */
export function nameColumnLabel(mode: NameDisplayMode): string {
  if (mode === "player") return "Player";
  if (mode === "team") return "Team";
  return "Player / Team";
}

/** Short header wording used on narrow phone screens. */
export function nameColumnShortLabel(mode: NameDisplayMode): string {
  if (mode === "player") return "Player";
  if (mode === "team") return "Team";
  return "Name";
}

export interface NameCell {
  /** Bold primary line. */
  primary: string;
  /** Muted line under the primary (the player list, or nothing). */
  secondary: string;
}

/**
 * Picks the lines a row renders. Team-only trims the player list, which is what
 * frees up horizontal space on phones; player-only drops the team name.
 */
export function nameCellForMode(
  mode: NameDisplayMode,
  row: { name: string; players?: string[] | null },
): NameCell {
  const players = (row.players || []).filter(Boolean);
  if (mode === "team") return { primary: row.name, secondary: "" };
  if (mode === "player") {
    // Individual entries carry no player list, so their own name is the player.
    return { primary: players.length > 0 ? players.join(", ") : row.name, secondary: "" };
  }
  return { primary: row.name, secondary: players.join(", ") };
}
