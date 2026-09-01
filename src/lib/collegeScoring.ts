/**
 * Pure helpers behind the college golf score validation & entry system.
 *
 * A "college" event is one grand event with several divisions, teams of five
 * players, and multiple 18-hole rounds. Only Active players count toward the
 * team total, and a team's total is the best 4 of its 5 player totals.
 */

export type PlayerStatus = "active" | "wd" | "dq";

export interface Division {
  id: string;
  name: string;
}

export interface ScoreCell {
  registration_id: string;
  round_number: number;
  hole_number: number;
  strokes: number;
}

export interface PlayerRow {
  registration_id: string;
  first_name: string | null;
  last_name: string | null;
  status: PlayerStatus;
  status_reason?: string | null;
  team_id: string | null;
  team_name: string | null;
  division_id: string | null;
  group_number?: number | null;
  group_label?: string | null;
}

/** Scores indexed by registration → round → hole. */
export type ScoreIndex = Record<string, Record<number, Record<number, number>>>;

export const HOLES = Array.from({ length: 18 }, (_, i) => i + 1);

export function playerName(p: PlayerRow): string {
  return `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unnamed player";
}

export function normalizeStatus(raw: string | null | undefined): PlayerStatus {
  const v = String(raw || "active").toLowerCase();
  if (v === "wd" || v === "withdrawn") return "wd";
  if (v === "dq" || v === "disqualified") return "dq";
  return "active";
}

export function statusLabel(s: PlayerStatus): string {
  return s === "wd" ? "WD" : s === "dq" ? "DQ" : "Active";
}

/** Build the registration → round → hole index used by every read below. */
export function indexScores(rows: ScoreCell[]): ScoreIndex {
  const idx: ScoreIndex = {};
  rows.forEach((r) => {
    const round = Number(r.round_number || 1);
    if (!idx[r.registration_id]) idx[r.registration_id] = {};
    if (!idx[r.registration_id][round]) idx[r.registration_id][round] = {};
    idx[r.registration_id][round][Number(r.hole_number)] = Number(r.strokes);
  });
  return idx;
}

/** Sum of the holes entered for a round; null when nothing has been entered. */
export function roundTotal(
  index: ScoreIndex,
  registrationId: string,
  round: number
): number | null {
  const holes = index[registrationId]?.[round];
  if (!holes) return null;
  const values = Object.values(holes).filter((v) => Number.isFinite(v));
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0);
}

/** True once all 18 holes of a round hold a score. */
export function roundComplete(index: ScoreIndex, registrationId: string, round: number): boolean {
  const holes = index[registrationId]?.[round] || {};
  return HOLES.every((h) => Number.isFinite(holes[h]));
}

/** Player total across the configured rounds. WD/DQ players have no total. */
export function playerTotal(
  index: ScoreIndex,
  player: PlayerRow,
  rounds: number
): number | null {
  if (player.status !== "active") return null;
  let total = 0;
  let any = false;
  for (let r = 1; r <= rounds; r++) {
    const t = roundTotal(index, player.registration_id, r);
    if (t != null) {
      total += t;
      any = true;
    }
  }
  return any ? total : null;
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  divisionId: string | null;
  total: number | null;
  counted: { name: string; total: number }[];
  playerCount: number;
}

/**
 * Team standings: best N (default 4) player totals per team. Only Active
 * players with at least one entered score are eligible.
 */
export function teamStandings(
  players: PlayerRow[],
  index: ScoreIndex,
  rounds: number,
  countBest = 4
): TeamStanding[] {
  const byTeam = new Map<string, PlayerRow[]>();
  players.forEach((p) => {
    if (!p.team_id) return;
    const list = byTeam.get(p.team_id) || [];
    list.push(p);
    byTeam.set(p.team_id, list);
  });

  const standings: TeamStanding[] = [];
  byTeam.forEach((list, teamId) => {
    const eligible = list
      .map((p) => ({ name: playerName(p), total: playerTotal(index, p, rounds) }))
      .filter((e): e is { name: string; total: number } => e.total != null)
      .sort((a, b) => a.total - b.total);
    const counted = eligible.slice(0, Math.max(1, countBest));
    standings.push({
      teamId,
      teamName: list[0]?.team_name || "Team",
      divisionId: list[0]?.division_id ?? null,
      total: counted.length ? counted.reduce((a, b) => a + b.total, 0) : null,
      counted,
      playerCount: list.length,
    });
  });

  return standings.sort((a, b) => {
    if (a.total == null) return 1;
    if (b.total == null) return -1;
    return a.total - b.total;
  });
}

export interface PlayerFilters {
  team?: string;
  player?: string;
  group?: string;
  divisionId?: string | null;
}

/** Search/filter the roster by team, player name, pairing group and division. */
export function filterPlayers(players: PlayerRow[], f: PlayerFilters): PlayerRow[] {
  const team = (f.team || "").trim().toLowerCase();
  const name = (f.player || "").trim().toLowerCase();
  const group = (f.group || "").trim().toLowerCase();
  return players.filter((p) => {
    if (f.divisionId && (p.division_id || "") !== f.divisionId) return false;
    if (team && !(p.team_name || "").toLowerCase().includes(team)) return false;
    if (name && !playerName(p).toLowerCase().includes(name)) return false;
    if (group) {
      const hay = `${p.group_label || ""} ${p.group_number ?? ""}`.toLowerCase();
      if (!hay.includes(group)) return false;
    }
    return true;
  });
}

/** Parse the divisions JSONB column into a safe list. */
export function parseDivisions(raw: unknown): Division[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d: any, i) => ({
      id: String(d?.id || d?.name || `d${i + 1}`),
      name: String(d?.name || d?.id || `Division ${i + 1}`),
    }))
    .filter((d) => d.id && d.name);
}

/** Slug used when the organizer adds a division by name. */
export function divisionIdFromName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 24) || `d${Date.now().toString(36)}`
  );
}

/** Random 6-digit passcode for a scoring admin. */
export function generatePasscode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Fast entry keystroke rule. Scores 2–9 advance immediately; a leading "1"
 * waits for a possible second digit (10–20), then advances.
 */
export function fastEntryAdvance(raw: string): boolean {
  if (raw.length >= 2) return true;
  return raw.length === 1 && raw !== "1";
}

/** Clean a typed cell to at most two digits, 1–20 (or empty). */
export function sanitizeCell(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  if (!digits) return "";
  const n = parseInt(digits, 10);
  if (n > 20) return digits.slice(0, 1);
  return digits;
}
