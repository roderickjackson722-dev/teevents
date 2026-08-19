/**
 * Single source of truth for pairings setup (start format, starting holes and
 * tee times) so Printables, emails and the public tee sheet all read exactly
 * what the organizer set on Players & Pairings.
 *
 * Stored on `tournaments.pairings_config`.
 */

export interface PairingsDayCfg {
  startFormat: "tee_times" | "shotgun";
  firstTeeHole: number;
  firstTeeTime: string;
  teeInterval: number;
  shotgunTime: string;
  roundFormat?: string;
  roundHoles?: number;
  sameStartHole?: boolean;
  /** Actual play date for this round ("YYYY-MM-DD"). Overrides the tournament date. */
  roundDate?: string;
}

export interface PairingsConfig {
  /** group number → starting hole label ("1", "1A", "10") */
  labels: Record<string, string>;
  /** day index → group number → "HH:MM" */
  teeTimesByDay: Record<string, Record<string, string>>;
  /** day index → day config */
  byDay: Record<string, PairingsDayCfg>;
  /** number of rounds the organizer set up (independent of the tournament date range) */
  rounds: number;
}

export const defaultPairingsDayCfg = (): PairingsDayCfg => ({
  startFormat: "tee_times",
  firstTeeHole: 1,
  firstTeeTime: "08:00",
  teeInterval: 10,
  shotgunTime: "09:00",
  roundFormat: "",
  roundHoles: 18,
  sameStartHole: true,
  roundDate: "",
});

export function parsePairingsConfig(raw: unknown): PairingsConfig {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const labels: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj.labels || {})) {
    if (v != null && String(v).trim()) labels[String(k)] = String(v).trim();
  }
  const teeTimesByDay: Record<string, Record<string, string>> = {};
  for (const [day, map] of Object.entries(obj.teeTimesByDay || {})) {
    if (!map || typeof map !== "object") continue;
    const inner: Record<string, string> = {};
    for (const [g, t] of Object.entries(map as Record<string, any>)) {
      if (t) inner[String(g)] = String(t);
    }
    teeTimesByDay[String(day)] = inner;
  }
  const byDay: Record<string, PairingsDayCfg> = {};
  for (const [day, cfg] of Object.entries(obj.byDay || {})) {
    if (!cfg || typeof cfg !== "object") continue;
    byDay[String(day)] = { ...defaultPairingsDayCfg(), ...(cfg as PairingsDayCfg) };
  }
  const rounds = Math.max(
    1,
    Number(obj.rounds) || 0,
    ...Object.keys(byDay).map((d) => Number(d) + 1),
  );
  return { labels, teeTimesByDay, byDay, rounds };
}

export function dayCfgOf(cfg: PairingsConfig, day = 0): PairingsDayCfg {
  return { ...defaultPairingsDayCfg(), ...(cfg.byDay[String(day)] || {}) };
}

/** Numeric part of a hole label ("1A" → 1) */
export function holeNumberFromLabel(label?: string | null): number | null {
  if (!label) return null;
  const m = /^\s*(\d{1,2})/.exec(String(label));
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Starting hole for a pairing group, exactly as shown on the pairings page.
 * Falls back to the configured first tee hole for tee-time starts where every
 * group shares one starting hole, and only then to the group number itself.
 */
export function startingHoleForGroup(
  cfg: PairingsConfig,
  groupNumber: number | null | undefined,
  day = 0,
): number | null {
  if (groupNumber == null) return null;
  const fromLabel = holeNumberFromLabel(cfg.labels[String(groupNumber)]);
  if (fromLabel != null) return fromLabel;
  const d = dayCfgOf(cfg, day);
  if (d.startFormat === "tee_times" && d.sameStartHole !== false) return d.firstTeeHole || 1;
  return groupNumber;
}

/** Starting-hole label (may be a split-tee label such as "1A") */
export function startingHoleLabelForGroup(
  cfg: PairingsConfig,
  groupNumber: number | null | undefined,
  day = 0,
): string | null {
  if (groupNumber == null) return null;
  const label = cfg.labels[String(groupNumber)];
  if (label) return label;
  const hole = startingHoleForGroup(cfg, groupNumber, day);
  return hole == null ? null : String(hole);
}

/** Raw "HH:MM" tee time for a group on a day */
export function teeTimeForGroup(
  cfg: PairingsConfig,
  groupNumber: number | null | undefined,
  day = 0,
): string | null {
  if (groupNumber == null) return null;
  return cfg.teeTimesByDay[String(day)]?.[String(groupNumber)] || null;
}

/**
 * Play date for a round, using the organizer's per-round override first and
 * only then the tournament date. Multi-event weekends often start with side
 * events a day before the actual round, so the override is the source of truth
 * for printables, the public tee sheet and emails.
 */
export function roundDateFor(
  cfg: PairingsConfig,
  day = 0,
  fallback?: string | null,
): string | null {
  const d = dayCfgOf(cfg, day).roundDate;
  return (d && String(d).trim()) || fallback || null;
}

/** Round label such as "Round 2" */
export function roundLabel(day: number): string {
  return `Round ${day + 1}`;
}
