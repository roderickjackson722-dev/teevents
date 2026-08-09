// Age group presets used by the Roster / Pairings age filter and age-based pairings.
export interface AgeGroupDef {
  key: string;
  label: string;
  min: number;
  max: number;
}

export const AGE_GROUPS: AgeGroupDef[] = [
  { key: "junior", label: "Under 18", min: 0, max: 17 },
  { key: "young", label: "18–30", min: 18, max: 30 },
  { key: "mid", label: "31–45", min: 31, max: 45 },
  { key: "senior", label: "46–60", min: 46, max: 60 },
  { key: "super", label: "Over 60", min: 61, max: 200 },
];

// Plausible golfer age range. Anything outside this (0, 1, 2, 250, ...) is
// treated as missing data so bad answers don't drive divisions or pairings.
export const MIN_PLAUSIBLE_AGE = 3;
export const MAX_PLAUSIBLE_AGE = 100;

export const parseAge = (raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const age = Math.floor(n);
  if (age < MIN_PLAUSIBLE_AGE || age > MAX_PLAUSIBLE_AGE) return null;
  return age;
};

/** True when an answer exists but is outside the plausible range. */
export const isImplausibleAge = (raw: unknown): boolean => {
  if (raw === null || raw === undefined || String(raw).trim() === "") return false;
  const n = Number(raw);
  if (!Number.isFinite(n)) return true;
  const age = Math.floor(n);
  return age < MIN_PLAUSIBLE_AGE || age > MAX_PLAUSIBLE_AGE;
};


export const ageGroupKeyOf = (age: number | null): string | null => {
  if (age === null) return null;
  return AGE_GROUPS.find((g) => age >= g.min && age <= g.max)?.key ?? null;
};

export const allAgeGroupsOn = (): Record<string, boolean> =>
  AGE_GROUPS.reduce((acc, g) => ({ ...acc, [g.key]: true }), {} as Record<string, boolean>);

export const allAgeGroupsOff = (): Record<string, boolean> =>
  AGE_GROUPS.reduce((acc, g) => ({ ...acc, [g.key]: false }), {} as Record<string, boolean>);

/**
 * True when a player should be visible under the current age filter.
 * Players without an age on file are always shown (they can't be excluded by
 * a filter they have no data for).
 */
export const ageMatchesFilter = (
  age: number | null,
  filters: Record<string, boolean>,
  showAll: boolean,
): boolean => {
  if (showAll) return true;
  if (age === null) return true;
  const key = ageGroupKeyOf(age);
  if (!key) return true;
  return filters[key] !== false;
};
