/**
 * Custom Scoring Rules: per-round hole segments, each with its own format,
 * an optional hidden hole range per round, a championship rule and
 * Birdie Bash point values. Pure helpers shared by Setup, the phone scoring
 * screen and the leaderboards. When `enabled` is false the event uses its
 * single dropdown format exactly as before.
 */
import { getFormatById, isTeamScoreFormat, stablefordPoints } from "./scoringFormats";

export interface HoleRange { from: number; to: number }
export interface Segment extends HoleRange { format: string }
export interface RoundRule { round: number; segments: Segment[]; hidden: HoleRange | null }
export type ChampionshipRule = "separate" | "combined";
export interface CustomScoring {
  enabled: boolean;
  championship: ChampionshipRule;
  birdie_points: number;
  eagle_points: number;
  rounds: RoundRule[];
}

export const DEFAULT_CUSTOM_SCORING: CustomScoring = {
  enabled: false, championship: "separate", birdie_points: 1, eagle_points: 2,
  rounds: [{ round: 1, segments: [{ from: 1, to: 18, format: "best_ball_2" }], hidden: null }],
};

export const POINTS_FORMAT_IDS = ["birdie_bash", "stableford"] as const;
export const isPointsFormat = (id: string | null | undefined) => !!id && (POINTS_FORMAT_IDS as readonly string[]).includes(id);

export function parseCustomScoring(raw: unknown): CustomScoring | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<CustomScoring>;
  return {
    enabled: !!r.enabled,
    championship: r.championship === "combined" ? "combined" : "separate",
    birdie_points: Number.isFinite(Number(r.birdie_points)) ? Number(r.birdie_points) : 1,
    eagle_points: Number.isFinite(Number(r.eagle_points)) ? Number(r.eagle_points) : 2,
    rounds: Array.isArray(r.rounds) ? r.rounds.map((x: any, i: number) => ({
      round: Number(x?.round) || i + 1,
      segments: Array.isArray(x?.segments) ? x.segments.map((s: any) => ({ from: Number(s?.from), to: Number(s?.to), format: String(s?.format || "") })) : [],
      hidden: x?.hidden && Number.isFinite(Number(x.hidden.from)) && Number.isFinite(Number(x.hidden.to))
        ? { from: Number(x.hidden.from), to: Number(x.hidden.to) } : null,
    })) : [],
  };
}

export const activeRules = (raw: unknown): CustomScoring | null => {
  const cs = parseCustomScoring(raw);
  return cs && cs.enabled ? cs : null;
};

/** Plain-language problem with the rules, or null when they can be saved. */
export function validateCustomScoring(cs: CustomScoring): string | null {
  if (!cs.enabled) return null;
  if (cs.rounds.length === 0) return "Add at least one round.";
  if (!(cs.birdie_points >= 0) || !(cs.eagle_points >= 0)) return "Birdie Bash point values must be 0 or more.";
  for (const r of cs.rounds) {
    const label = `Day ${r.round}`;
    if (r.segments.length === 0) return `${label}: add at least one hole segment.`;
    const seen = new Array(19).fill(0);
    for (const s of r.segments) {
      if (!Number.isInteger(s.from) || !Number.isInteger(s.to) || s.from < 1 || s.to > 18 || s.from > s.to)
        return `${label}: each segment needs a hole range between 1 and 18, like 1-6.`;
      if (!getFormatById(s.format)) return `${label}: pick a format for holes ${s.from}-${s.to}.`;
      for (let h = s.from; h <= s.to; h++) seen[h]++;
    }
    const gaps = []; const overlaps = [];
    for (let h = 1; h <= 18; h++) { if (seen[h] === 0) gaps.push(h); if (seen[h] > 1) overlaps.push(h); }
    if (gaps.length) return `${label}: holes ${gaps.join(", ")} are not covered. Segments must cover holes 1 through 18 exactly once.`;
    if (overlaps.length) return `${label}: holes ${overlaps.join(", ")} are in more than one segment. Segments must cover holes 1 through 18 exactly once.`;
    const kinds = new Set(r.segments.map((s) => isPointsFormat(s.format)));
    if (kinds.size > 1) return `${label}: a round cannot mix a points format (Birdie Bash, Stableford) with a strokes format.`;
    if (r.hidden) {
      const { from, to } = r.hidden;
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > 18 || from > to)
        return `${label}: hidden holes need a range between 1 and 18, like 13-18.`;
    }
  }
  const nums = cs.rounds.map((r) => r.round);
  if (new Set(nums).size !== nums.length) return "Each round can only be listed once.";
  return null;
}

export function roundRule(cs: CustomScoring | null, round: number): RoundRule | null {
  return cs?.rounds.find((r) => r.round === round) ?? null;
}
export function holeFormat(cs: CustomScoring | null, round: number, hole: number, fallback: string): string {
  const seg = roundRule(cs, round)?.segments.find((s) => hole >= s.from && hole <= s.to);
  return seg?.format || fallback;
}
export function isHoleHidden(cs: CustomScoring | null, round: number, hole: number, published: boolean): boolean {
  if (published) return false;
  const h = roundRule(cs, round)?.hidden;
  return !!h && hole >= h.from && hole <= h.to;
}
export const isPointsRound = (cs: CustomScoring | null, round: number) =>
  !!roundRule(cs, round)?.segments.length && roundRule(cs, round)!.segments.every((s) => isPointsFormat(s.format));
export const isTeamHole = (cs: CustomScoring | null, round: number, hole: number, fallback: string) =>
  isTeamScoreFormat(holeFormat(cs, round, hole, fallback));

/** Birdie Bash: birdie earns birdiePts, eagle or better eaglePts, par or worse 0. */
export function birdieBashPoints(best: number | null | undefined, par: number, birdiePts = 1, eaglePts = 2): number {
  if (best == null || !Number.isFinite(best) || best <= 0) return 0;
  const d = best - par;
  if (d <= -2) return eaglePts;
  if (d === -1) return birdiePts;
  return 0;
}

export interface TeamHoleInput { team?: number | null; players: (number | null | undefined)[]; hiddenPlayed?: boolean }
export interface TeamRoundResult {
  /** Per-hole display value (strokes or points); null when not played or hidden. */
  holes: Record<number, number | null>;
  strokes: number; toPar: number; points: number;
  /** Holes completed, including hidden holes. */
  thru: number;
  visiblePlayed: number;
  /** Best-ball stroke total over visible holes (feeds the championship). */
  bestBallStrokes: number;
}

/** Score one team's round under the custom rules. Hidden holes count toward Thru only. */
export function scoreTeamRound(
  cs: CustomScoring, round: number, input: Record<number, TeamHoleInput>, pars: number[], fallback: string, published: boolean,
): TeamRoundResult {
  const out: TeamRoundResult = { holes: {}, strokes: 0, toPar: 0, points: 0, thru: 0, visiblePlayed: 0, bestBallStrokes: 0 };
  for (let h = 1; h <= 18; h++) {
    const fmt = holeFormat(cs, round, h, fallback);
    const i = input[h];
    let gross: number | null = null;
    if (i) {
      if (isTeamScoreFormat(fmt)) gross = i.team ?? null;
      else {
        const vals = i.players.filter((v): v is number => typeof v === "number" && v > 0);
        gross = vals.length ? Math.min(...vals) : (i.team ?? null);
      }
    }
    if (gross == null) {
      if (i?.hiddenPlayed && isHoleHidden(cs, round, h, published)) out.thru++;
      out.holes[h] = null; continue;
    }
    out.thru++;
    if (isHoleHidden(cs, round, h, published)) { out.holes[h] = null; continue; }
    const par = pars[h - 1] ?? 4;
    out.visiblePlayed++;
    out.strokes += gross; out.toPar += gross - par; out.bestBallStrokes += gross;
    const pts = fmt === "birdie_bash" ? birdieBashPoints(gross, par, cs.birdie_points, cs.eagle_points)
      : fmt === "stableford" ? stablefordPoints(gross, par) : 0;
    out.points += pts;
    out.holes[h] = isPointsFormat(fmt) ? pts : gross;
  }
  return out;
}

export interface RankedTeam<T> { item: T; pos: number | null }

/** Round board order: teams with a visible score first (points desc or to-par asc), then Thru. */
export function sortRoundBoard<T extends { r: TeamRoundResult }>(rows: T[], points: boolean): T[] {
  return [...rows].sort((a, b) => {
    const av = a.r.visiblePlayed > 0, bv = b.r.visiblePlayed > 0;
    if (av !== bv) return av ? -1 : 1;
    if (av && bv) {
      if (points) {
        if (a.r.points !== b.r.points) return b.r.points - a.r.points;
        if (a.r.bestBallStrokes !== b.r.bestBallStrokes) return a.r.bestBallStrokes - b.r.bestBallStrokes;
      } else if (a.r.toPar !== b.r.toPar) return a.r.toPar - b.r.toPar;
    }
    return b.r.thru - a.r.thru;
  });
}

export interface ChampionshipRow<T> { item: T; byRound: Record<number, TeamRoundResult | undefined> }
export const championshipTotal = (byRound: Record<number, TeamRoundResult | undefined>) =>
  Object.values(byRound).reduce((s, r) => s + (r?.bestBallStrokes ?? 0), 0);
const anyVisible = (byRound: Record<number, TeamRoundResult | undefined>) => Object.values(byRound).some((r) => (r?.visiblePlayed ?? 0) > 0);

/** Lowest total wins; ties: most Birdie Bash points, then lowest final-round strokes. */
export function sortChampionship<T>(rows: ChampionshipRow<T>[], cs: CustomScoring): ChampionshipRow<T>[] {
  const finalRound = Math.max(...cs.rounds.map((r) => r.round));
  const pts = (x: ChampionshipRow<T>) => cs.rounds.filter((r) => isPointsRound(cs, r.round)).reduce((s, r) => s + (x.byRound[r.round]?.points ?? 0), 0);
  const thru = (x: ChampionshipRow<T>) => Object.values(x.byRound).reduce((s, r) => s + (r?.thru ?? 0), 0);
  return [...rows].sort((a, b) => {
    const av = anyVisible(a.byRound), bv = anyVisible(b.byRound);
    if (av !== bv) return av ? -1 : 1;
    if (av && bv) {
      const d = championshipTotal(a.byRound) - championshipTotal(b.byRound);
      if (d) return d;
      const p = pts(b) - pts(a);
      if (p) return p;
      const f = (a.byRound[finalRound]?.bestBallStrokes ?? 0) - (b.byRound[finalRound]?.bestBallStrokes ?? 0);
      if (f) return f;
    }
    return thru(b) - thru(a);
  });
}

export const rangeLabel = (r: HoleRange) => (r.from === r.to ? `${r.from}` : `${r.from}-${r.to}`);
