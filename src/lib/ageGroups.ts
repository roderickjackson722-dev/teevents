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

export const parseAge = (raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
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
