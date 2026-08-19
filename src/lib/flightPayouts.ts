/**
 * Flighting & payout math shared by tournament management and league management.
 *
 * "Flighting" a field means ranking every player (or team) by total score or
 * handicap and splitting the ranked list into equal groups. Each group ("flight")
 * competes only against itself and receives its own slice of the purse.
 */

export type FlightMethod = "none" | "half" | "thirds" | "quarters" | "custom";
export type FlightBasis = "score" | "handicap";

export interface FlightMethodOption {
  id: FlightMethod;
  label: string;
  flights: number;
  description: string;
}

export const FLIGHT_METHODS: FlightMethodOption[] = [
  { id: "none", label: "No flights (open field)", flights: 1, description: "Everyone competes together for a single purse." },
  { id: "half", label: "Split in Half (50/50)", flights: 2, description: "Top half of the ranked field is Flight A, bottom half is Flight B." },
  { id: "thirds", label: "Split in Thirds (33/33/33)", flights: 3, description: "Ranked field divided into three equal flights." },
  { id: "quarters", label: "Split in Quarters (25/25/25/25)", flights: 4, description: "Ranked field divided into four equal flights." },
  { id: "custom", label: "Custom (manual assignment)", flights: 1, description: "You assign each player to a flight yourself." },
];

export function flightsForMethod(method: FlightMethod, custom = 1): number {
  if (method === "custom") return Math.min(10, Math.max(1, Math.floor(custom) || 1));
  return FLIGHT_METHODS.find((m) => m.id === method)?.flights ?? 1;
}

export function flightLabel(index: number): string {
  return index === 0 ? "Championship Flight" : `${String.fromCharCode(64 + index)} Flight`;
}

/** Split `fieldSize` entries as evenly as possible across `flights` groups. */
export function splitField(fieldSize: number, flights: number): number[] {
  const n = Math.max(1, Math.floor(flights));
  const size = Math.max(0, Math.floor(fieldSize));
  const base = Math.floor(size / n);
  const extra = size % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * Rank a field and assign flight indexes.
 * `values` are total scores (lower = better) or handicaps (lower = better).
 */
export function assignFlights<T>(
  entries: T[],
  value: (e: T) => number | null | undefined,
  flights: number,
): { entry: T; flightIndex: number; rank: number }[] {
  const ranked = [...entries].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av - bv;
  });
  const sizes = splitField(ranked.length, flights);
  const out: { entry: T; flightIndex: number; rank: number }[] = [];
  let i = 0;
  sizes.forEach((size, flightIndex) => {
    for (let k = 0; k < size; k++, i++) {
      out.push({ entry: ranked[i], flightIndex, rank: i + 1 });
    }
  });
  return out;
}

/** Standard places-paid rule based on how many players are in the flight. */
export function placesPaidFor(flightSize: number): number[] {
  if (flightSize <= 0) return [];
  if (flightSize <= 6) return [100];
  if (flightSize <= 10) return [70, 30];
  return [65, 25, 10];
}

export interface FlightPayoutRow {
  name: string;
  players: number;
  /** range of finishing positions in the ranked field, e.g. "1–18" */
  range: string;
  purseCents: number;
  /** false when the organizer excluded this flight from the purse */
  paid: boolean;
  places: { place: number; percent: number; amountCents: number }[];
}

export interface PayoutPlan {
  flights: FlightPayoutRow[];
  totalPaidCents: number;
  /** rounding leftover kept by the organizer */
  remainderCents: number;
}

export interface PayoutPlanInput {
  fieldSize: number;
  /** total purse available for payouts, in cents */
  purseCents: number;
  flights: number;
  /** override the automatic places-paid rule */
  percentsOverride?: number[] | null;
  /** custom flight sizes (used for manual assignment) */
  flightSizes?: number[] | null;
  /** custom flight names */
  names?: string[] | null;
  /**
   * Per-flight opt-in to the purse. `false` excludes that flight entirely
   * (e.g. a junior flight that plays for trophies only) and its share is
   * redistributed across the paid flights.
   */
  paidFlights?: (boolean | undefined)[] | null;
}

/**
 * Flight Purse = (Players in Paid Flight / Players in All Paid Flights) x Total Purse.
 */
export function buildPayoutPlan({
  fieldSize,
  purseCents,
  flights,
  percentsOverride,
  flightSizes,
  names,
  paidFlights,
}: PayoutPlanInput): PayoutPlan {
  const sizes = flightSizes && flightSizes.length ? flightSizes : splitField(fieldSize, flights);
  const paid = sizes.map((_, i) => paidFlights?.[i] !== false);
  const total = sizes.reduce((s, n, i) => s + (paid[i] ? n : 0), 0);
  const lastPaidIndex = paid.reduce((last, p, i) => (p && sizes[i] > 0 ? i : last), -1);

  let cursor = 1;
  let allocated = 0;
  const rows: FlightPayoutRow[] = sizes.map((players, i) => {
    const share = paid[i] && total > 0 ? Math.round((purseCents * players) / total) : 0;
    // give any rounding drift to the last paid flight
    const purse = i === lastPaidIndex ? Math.max(0, purseCents - allocated) : share;
    allocated += purse;

    const start = cursor;
    const end = cursor + players - 1;
    cursor = end + 1;

    const percents = !paid[i]
      ? []
      : percentsOverride && percentsOverride.length
        ? percentsOverride
        : placesPaidFor(players);
    const pctTotal = percents.reduce((s, p) => s + p, 0) || 100;

    return {
      name: names?.[i] || flightLabel(i),
      players,
      range: players > 0 ? (players === 1 ? `${start}` : `${start}–${end}`) : "—",
      purseCents: purse,
      paid: paid[i],
      places: percents.map((p, idx) => ({
        place: idx + 1,
        percent: p,
        amountCents: Math.round((purse * p) / pctTotal),
      })),
    };
  });

  const totalPaidCents = rows.reduce(
    (s, f) => s + f.places.reduce((a, p) => a + p.amountCents, 0),
    0,
  );

  return { flights: rows, totalPaidCents, remainderCents: purseCents - totalPaidCents };
}


/**
 * 3-Man Scramble team handicap: 20% of the lowest handicap + 15% of the middle
 * + 10% of the highest. Returns null when no handicaps are supplied.
 */
export function threeManScrambleHandicap(handicaps: (number | null | undefined)[]): number | null {
  const vals = handicaps.filter((h): h is number => typeof h === "number" && !Number.isNaN(h));
  if (vals.length === 0) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const weights = [0.2, 0.15, 0.1];
  const total = sorted
    .slice(0, 3)
    .reduce((sum, h, i) => sum + h * weights[i], 0);
  return Math.round(total * 10) / 10;
}

export const THREE_MAN_SCRAMBLE_WEIGHTS = "20% low / 15% middle / 10% high";

/** Rounds that make up a Shootout event, in order. */
export const SHOOTOUT_DEFAULT_ROUNDS = [
  { round: 1, format: "scramble", label: "Round 1 — Scramble" },
  { round: 2, format: "greensomes", label: "Round 2 — Greensomes (modified alternate shot)" },
  { round: 3, format: "better_ball", label: "Final Round — Better Ball" },
];

export const SHOOTOUT_ROUND_FORMATS = [
  { id: "scramble", label: "Scramble" },
  { id: "greensomes", label: "Greensomes (modified alternate shot)" },
  { id: "better_ball", label: "Better Ball" },
  { id: "alternate_shot", label: "Alternate Shot" },
  { id: "stroke_play", label: "Stroke Play" },
];

export const money = (cents: number) =>
  `$${((cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ------------------------------------------------------------------ *
 * Scramble scoring & minimum-drive enforcement
 * ------------------------------------------------------------------ */

/**
 * A scramble produces ONE team score per hole. Players may each punch in a
 * number on their phone, so we reduce the entries to a single team score
 * (the best/lowest recorded value) and report whether the entries disagreed.
 */
export function scrambleTeamHoleScore(entries: (number | null | undefined)[]): {
  score: number | null;
  agreed: boolean;
} {
  const vals = entries.filter((v): v is number => typeof v === "number" && !Number.isNaN(v) && v > 0);
  if (vals.length === 0) return { score: null, agreed: true };
  const min = Math.min(...vals);
  return { score: min, agreed: vals.every((v) => v === min) };
}

/** Total team score for a scramble round: one score per hole, summed. */
export function scrambleTeamTotal(holes: (number | null | undefined)[][]): number {
  return holes.reduce((sum, hole) => sum + (scrambleTeamHoleScore(hole).score ?? 0), 0);
}

export interface DriveRequirementRow<T> {
  player: T;
  drivesUsed: number;
  required: number;
  short: number;
  meetsRequirement: boolean;
}

export interface DriveRequirementResult<T> {
  required: number;
  rows: DriveRequirementRow<T>[];
  totalDrives: number;
  /** drives still to be played (holes - drives already recorded) */
  drivesRemaining: number;
  /** total drives still needed to satisfy every player's minimum */
  totalShort: number;
  /** true when every player already meets the minimum */
  valid: boolean;
  /** true when the minimum can no longer be met with the holes left */
  impossible: boolean;
}

/**
 * Minimum drives rule: each player's tee shot must be used at least `required`
 * times over the round (commonly 4 on 18 holes for a 3-man scramble).
 */
export function validateMinimumDrives<T>(
  players: T[],
  drivesUsed: (p: T) => number | null | undefined,
  required: number,
  holes = 18,
): DriveRequirementResult<T> {
  const req = Math.max(0, Math.floor(required) || 0);
  const rows = players.map((player) => {
    const used = Math.max(0, Math.floor(drivesUsed(player) || 0));
    const short = Math.max(0, req - used);
    return { player, drivesUsed: used, required: req, short, meetsRequirement: short === 0 };
  });
  const totalDrives = rows.reduce((s, r) => s + r.drivesUsed, 0);
  const drivesRemaining = Math.max(0, holes - totalDrives);
  const totalShort = rows.reduce((s, r) => s + r.short, 0);
  return {
    required: req,
    rows,
    totalDrives,
    drivesRemaining,
    totalShort,
    valid: totalShort === 0,
    impossible: totalShort > drivesRemaining,
  };
}

/** Aggregate a Shootout: every round's team score added together. */
export function aggregateShootoutScore(rounds: { strokes?: number | null }[]): number {
  return rounds.reduce((s, r) => s + (r.strokes || 0), 0);
}
