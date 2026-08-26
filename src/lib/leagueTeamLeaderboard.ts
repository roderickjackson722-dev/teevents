export interface LeaderboardTeamRaw {
  pairing_id: string;
  team_name: string;
  holes: number;
  player1_name: string | null;
  player2_name: string | null;
  player1_handicap: number | null;
  player2_handicap: number | null;
  scores: Record<string, number>;
}

export interface LeaderboardPayload {
  found: boolean;
  event_id?: string;
  event_name?: string;
  event_date?: string | null;
  format_type?: string | null;
  holes?: number;
  /** 1 = front nine, 10 = back nine (9-hole events only) */
  start_hole?: number;
  course_name?: string | null;
  hole_pars?: number[] | null;
  league_name?: string | null;
  league_slug?: string | null;
  league_logo_url?: string | null;
  show_gross?: boolean;
  show_net?: boolean;
  teams?: LeaderboardTeamRaw[];
}

export interface LeaderboardRow {
  pairing_id: string;
  team_name: string;
  players: string;
  holes: number;
  gross: number;
  net: number;
  thru: number;
  toParGross: number;
  toParNet: number;
  scores: Record<number, number>;
}

export function formatToPar(n: number) {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : String(n);
}

/** Builds sorted leaderboard rows from the public leaderboard RPC payload. */
export function buildLeaderboardRows(payload: LeaderboardPayload): LeaderboardRow[] {
  const eventHoles = payload.holes === 9 ? 9 : 18;
  // 9-hole events can be played on the back nine — honour the configured start
  // hole, and fall back to inferring it from the holes that carry scores.
  const inferredStart = (payload.teams || []).some((t) =>
    Object.entries(t.scores || {}).some(([k, v]) => v != null && Number(k) > 9),
  )
    ? 10
    : 1;
  const eventStart =
    eventHoles === 18 ? 1 : Number(payload.start_hole) === 10 ? 10 : Number(payload.start_hole) === 1 ? 1 : inferredStart;
  const pars =
    Array.isArray(payload.hole_pars) && payload.hole_pars.length >= 18
      ? payload.hole_pars.map((p) => Number(p) || 4)
      : null;

  const rows: LeaderboardRow[] = (payload.teams || []).map((t) => {
    const teamHoles = t.holes === 9 ? 9 : eventHoles;
    const scores: Record<number, number> = {};
    Object.entries(t.scores || {}).forEach(([k, v]) => {
      const h = Number(k);
      const start = teamHoles === 18 ? 1 : eventStart;
      if (v != null && h >= start && h <= start + teamHoles - 1) scores[h] = Number(v);
    });
    const entries = Object.entries(scores);
    const gross = entries.reduce((sum, [, v]) => sum + Number(v), 0);
    const parPlayed = entries.reduce(
      (sum, [h]) => sum + (pars ? pars[Number(h) - 1] || 4 : 4),
      0
    );
    // 2-person scramble allowance: 35% of the combined handicap average
    const h1 = Number(t.player1_handicap ?? 0);
    const h2 = Number(t.player2_handicap ?? 0);
    const fullTeamHcp = ((h1 + h2) / 2) * 0.35;
    const teamHcp = Math.round(teamHoles === 9 ? fullTeamHcp / 2 : fullTeamHcp);
    const net = Math.max(0, gross - (entries.length > 0 ? teamHcp : 0));
    return {
      pairing_id: t.pairing_id,
      team_name: t.team_name,
      players: [t.player1_name, t.player2_name].filter(Boolean).join(" / "),
      holes: teamHoles,
      gross,
      net,
      thru: entries.length,
      toParGross: gross - parPlayed,
      toParNet: net - parPlayed,
      scores,
    };
  });

  rows.sort(
    (a, b) => (a.thru === 0 ? 1 : 0) - (b.thru === 0 ? 1 : 0) || a.toParNet - b.toParNet
  );
  return rows;
}
