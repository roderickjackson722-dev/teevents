import { getFormatById, stablefordPoints } from "@/lib/scoringFormats";

/**
 * Shared leaderboard row builder used by BOTH the standalone live leaderboard
 * (/live/:slug) and the leaderboard embedded on the public event homepage
 * (/t/:slug) so the two boards can never drift apart.
 */
export interface LeaderboardTournamentInfo {
  scoring_format?: string | null;
  course_par?: number | null;
}

export interface LeaderboardRow {
  name: string;
  total: number;
  thru: number;
  isTeam?: boolean;
  players?: string[];
  points?: number;
  /** Stable key for the scorecard drill-down. */
  key?: string;
  /** Strokes in the round currently in play. */
  today?: number | null;
  /** Par for every hole actually played (all rounds) — accurate multi-round To Par. */
  parPlayed?: number | null;
  /** Par for the holes played in the current round. */
  parToday?: number | null;
  /** Completed totals for each round. */
  roundTotals?: Record<number, number>;
  /** Hole-by-hole strokes per round. */
  holesByRound?: Record<number, Record<number, number>>;
}


/**
 * Par for a single hole — real course pars when available. Without a per-hole
 * scorecard we fall back to an exact fraction of the course par (e.g. 71/18)
 * so an 18-hole round totals the course par instead of rounding up to 72.
 */
export function parForHole(hole: number, holePars: number[] | null | undefined, coursePar: number) {
  const p = holePars?.[hole - 1];
  return Number(p) > 0 ? Number(p) : coursePar / 18;
}

/** Totals / To Par / Today for a set of per-round hole scores. */
export function summarize(
  holesByRound: Record<number, Record<number, number>>,
  currentRound: number,
  holePars: number[] | null | undefined,
  coursePar: number,
) {
  let total = 0;
  let parPlayed = 0;
  let today: number | null = null;
  let parToday = 0;
  let thru = 0;
  const roundTotals: Record<number, number> = {};
  Object.entries(holesByRound).forEach(([r, holes]) => {
    const round = Number(r);
    let roundTotal = 0;
    let holesCount = 0;
    Object.entries(holes).forEach(([h, strokes]) => {
      roundTotal += strokes;
      parPlayed += parForHole(Number(h), holePars, coursePar);
      holesCount++;
      if (round === currentRound) parToday += parForHole(Number(h), holePars, coursePar);
    });
    roundTotals[round] = roundTotal;
    total += roundTotal;
    if (round === currentRound) {
      today = roundTotal;
      thru = holesCount;
    }
  });
  if (thru === 0) {
    thru = Object.values(holesByRound).reduce((n, holes) => n + Object.keys(holes).length, 0);
  }
  return { total, parPlayed: Math.round(parPlayed), today, parToday: Math.round(parToday), thru, roundTotals };
}


/**
 * Gross-score leaderboard order: score relative to the par of the holes actually
 * played ranks first, then lowest total, then most holes completed.
 */
export function toParOf(r: any) {
  return Number(r.total || 0) - Number(r.parPlayed || 0);
}

export function compareByTotal(a: any, b: any) {
  const aEmpty = !a.thru || a.total === 0;
  const bEmpty = !b.thru || b.total === 0;
  if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
  if (aEmpty && bEmpty) return 0;
  const ap = toParOf(a);
  const bp = toParOf(b);
  if (ap !== bp) return ap - bp;
  if (a.total !== b.total) return a.total - b.total;
  if (a.thru !== b.thru) return b.thru - a.thru;
  return String(a.name || "").localeCompare(String(b.name || ""));
}

export function buildLeaderboard(
  scoresData: any[],
  t: LeaderboardTournamentInfo,
  holePars?: number[] | null,
): LeaderboardRow[] {
  const fmt = getFormatById(t.scoring_format || "stroke_play");
  const isTeam = fmt && fmt.teamSize > 1;
  const isStableford = fmt?.scoring === "stableford";
  const cPar = t.course_par || 72;
  const holePar = Math.round(cPar / 18);
  const currentRound = scoresData.reduce(
    (max: number, s: any) => Math.max(max, Number(s.round_number) || 1),
    1,
  );

  const playerData: Record<string, {
    name: string;
    group: number | null;
    teamName: string | null;
    holes: Record<number, number>;
    holesByRound: Record<number, Record<number, number>>;
  }> = {};
  scoresData.forEach((s: any) => {
    const key = s.registration_id;
    if (!playerData[key]) {
      const reg = s.tournament_registrations;
      const first = reg?.first_name ?? s.first_name;
      const last = reg?.last_name ?? s.last_name;
      const grp = reg?.group_number ?? s.group_number ?? null;
      playerData[key] = {
        name: first || last ? `${first ?? ""} ${last ?? ""}`.trim() : "Unknown",
        group: grp,
        teamName: (reg?.team_name ?? s.team_name ?? null) || null,
        holes: {},
        holesByRound: {},
      };
    }
    const round = Number(s.round_number) || 1;
    playerData[key].holes[s.hole_number] = s.strokes;
    playerData[key].holesByRound[round] = playerData[key].holesByRound[round] || {};
    playerData[key].holesByRound[round][s.hole_number] = s.strokes;
  });

  if (isTeam && fmt && (fmt.scoring === "best_ball" || fmt.scoring === "scramble" || fmt.scoring === "shamble")) {
    const groups: Record<number, { key: string; player: typeof playerData[string] }[]> = {};
    Object.entries(playerData).forEach(([regId, p]) => {
      if (p.group != null) {
        if (!groups[p.group]) groups[p.group] = [];
        groups[p.group].push({ key: regId, player: p });
      }
    });
    return Object.entries(groups)
      .map(([gn, entries]) => {
        const players = entries.map((e) => e.player);
        const rounds = new Set<number>();
        players.forEach((p) => Object.keys(p.holesByRound).forEach((r) => rounds.add(Number(r))));
        const holesByRound: Record<number, Record<number, number>> = {};
        rounds.forEach((round) => {
          holesByRound[round] = {};
          for (let h = 1; h <= 18; h++) {
            const strokes = players
              .map((p) => p.holesByRound[round]?.[h])
              .filter((v) => v != null) as number[];
            if (strokes.length > 0) holesByRound[round][h] = Math.min(...strokes);
          }
          if (Object.keys(holesByRound[round]).length === 0) delete holesByRound[round];
        });
        const s = summarize(holesByRound, currentRound, holePars, cPar);
        // Prefer the organizer-entered team name; fall back to the default "Team X".
        const teamName = players.find((p) => p.teamName)?.teamName || `Team ${gn}`;
        return {
          name: teamName,
          total: s.total,
          thru: s.thru,
          isTeam: true,
          players: players.map((p) => p.name),
          key: `group-${gn}`,
          today: s.today,
          parPlayed: s.parPlayed,
          parToday: s.parToday,
          roundTotals: s.roundTotals,
          holesByRound,
        };
      })
      .sort(compareByTotal);
  }

  if (isStableford) {
    return Object.entries(playerData)
      .map(([regId, p]) => {
        let points = 0;
        let holesPlayed = 0;
        Object.values(p.holesByRound).forEach((roundHoles) => {
          holesPlayed += Object.keys(roundHoles).length;
          Object.entries(roundHoles).forEach(([hole, strokes]) => {
            points += stablefordPoints(strokes, holePars?.[Number(hole) - 1] ?? holePar);
          });
        });
        return { name: p.name, total: points, thru: holesPlayed, points, key: regId, holesByRound: p.holesByRound };
      })
      .sort((a, b) => b.total - a.total);
  }

  return Object.entries(playerData)
    .map(([regId, p]) => {
      const s = summarize(p.holesByRound, currentRound, holePars, cPar);
      return {
        name: p.name,
        total: s.total,
        thru: s.thru,
        key: regId,
        today: s.today,
        parPlayed: s.parPlayed,
        parToday: s.parToday,
        roundTotals: s.roundTotals,
        holesByRound: p.holesByRound,
      };
    })
    .sort(compareByTotal);
}
