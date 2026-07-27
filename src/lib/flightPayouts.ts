/**
 * Flighting & payout math shared by tournament management and league management.
 *
 * "Flighting" a field means sorting every player (or team) by score/handicap and
 * splitting the sorted list into equal groups. Each group ("flight") competes only
 * against itself and receives its own slice of the prize pot.
 */

export type SplitMode = "none" | "half" | "thirds" | "quarters" | "custom";

export interface SplitOption {
  id: SplitMode;
  label: string;
  flights: number;
  description: string;
}

export const SPLIT_OPTIONS: SplitOption[] = [
  { id: "none", label: "One flight (open field)", flights: 1, description: "Everyone competes together for a single prize pool." },
  { id: "half", label: "Split in half (2 flights)", flights: 2, description: "Top half of the field is Flight A, bottom half is Flight B." },
  { id: "thirds", label: "Split in thirds (3 flights)", flights: 3, description: "Sorted field divided into three equal flights." },
  { id: "quarters", label: "Split in fourths (4 flights)", flights: 4, description: "Sorted field divided into four equal flights." },
  { id: "custom", label: "Custom number of flights", flights: 5, description: "Choose any number of flights from 1 to 10." },
];

/** How the pot is divided across flights. */
export type PotSplitMode = "even" | "by_size";

/** Places-paid payout templates (percent of the flight's pot). */
export interface PayoutTemplate {
  id: string;
  label: string;
  /** percentages, index 0 = 1st place */
  percents: number[];
}

export const PAYOUT_TEMPLATES: PayoutTemplate[] = [
  { id: "winner", label: "Winner takes all", percents: [100] },
  { id: "top2", label: "Top 2 — 65 / 35", percents: [65, 35] },
  { id: "top3", label: "Top 3 — 50 / 30 / 20", percents: [50, 30, 20] },
  { id: "top4", label: "Top 4 — 40 / 30 / 20 / 10", percents: [40, 30, 20, 10] },
  { id: "top5", label: "Top 5 — 35 / 25 / 20 / 12 / 8", percents: [35, 25, 20, 12, 8] },
];

export function flightLabel(index: number): string {
  return `Flight ${String.fromCharCode(65 + index)}`;
}

/** Split `fieldSize` entries as evenly as possible across `flights` groups. */
export function splitField(fieldSize: number, flights: number): number[] {
  const n = Math.max(1, Math.floor(flights));
  const size = Math.max(0, Math.floor(fieldSize));
  const base = Math.floor(size / n);
  const extra = size % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

export interface FlightPayout {
  name: string;
  players: number;
  /** range of finishing positions in the sorted field, e.g. "1–18" */
  range: string;
  potCents: number;
  places: { place: number; percent: number; amountCents: number }[];
}

export interface PayoutPlanInput {
  fieldSize: number;
  /** total money available for payouts, in cents */
  potCents: number;
  flights: number;
  potSplit: PotSplitMode;
  /** percent of each flight pot per place */
  percents: number[];
}

export interface PayoutPlan {
  flights: FlightPayout[];
  totalPaidCents: number;
  /** rounding leftover kept by the organizer */
  remainderCents: number;
}

export function buildPayoutPlan({
  fieldSize,
  potCents,
  flights,
  potSplit,
  percents,
}: PayoutPlanInput): PayoutPlan {
  const sizes = splitField(fieldSize, flights);
  const totalPct = percents.reduce((s, p) => s + p, 0) || 100;

  let cursor = 1;
  let allocated = 0;
  const out: FlightPayout[] = sizes.map((players, i) => {
    const share =
      potSplit === "by_size" && fieldSize > 0
        ? Math.round((potCents * players) / fieldSize)
        : Math.round(potCents / sizes.length);
    // give any rounding drift to the last flight
    const flightPot = i === sizes.length - 1 ? Math.max(0, potCents - allocated) : share;
    allocated += flightPot;

    const start = cursor;
    const end = cursor + players - 1;
    cursor = end + 1;

    const places = percents.map((p, idx) => ({
      place: idx + 1,
      percent: p,
      amountCents: Math.round((flightPot * p) / totalPct),
    }));

    return {
      name: flightLabel(i),
      players,
      range: players > 0 ? (players === 1 ? `${start}` : `${start}–${end}`) : "—",
      potCents: flightPot,
      places,
    };
  });

  const totalPaidCents = out.reduce(
    (s, f) => s + f.places.reduce((a, p) => a + p.amountCents, 0),
    0,
  );

  return { flights: out, totalPaidCents, remainderCents: potCents - totalPaidCents };
}

export const money = (cents: number) =>
  `$${((cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
