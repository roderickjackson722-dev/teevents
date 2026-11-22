/** Pure math + validation for the organizer Format & Flights › Handicaps tab. */
export const TEE_LIMITS = {
  slope: { min: 55, max: 155, label: "Slope Rating" },
  rating: { min: 55, max: 85, label: "Course Rating" },
  par: { min: 27, max: 72, label: "Par" },
} as const;

export function roundHalfUp(v: number): number {
  const s = v < 0 ? -1 : 1;
  const r = Math.floor(Math.abs(v) + 0.5);
  return r === 0 ? 0 : s * r;
}

/** Unrounded Course Handicap = Index × (Slope / 113) + (Course Rating − Par). */
export function unroundedCourseHandicap(index: number | null, slope: number, rating: number, par: number): number | null {
  if (index == null || Number.isNaN(index)) return null;
  return index * (slope / 113) + (rating - par);
}

export function displayCourseHandicap(raw: number | null): string {
  return raw == null ? "—" : String(roundHalfUp(raw));
}

/** Playing Handicap uses the unrounded Course Handicap × allowance %. */
export function playingFromRaw(raw: number | null, allowancePct: number): number | null {
  if (raw == null) return null;
  return roundHalfUp(raw * (allowancePct / 100));
}

export function validateTeeSet(t: { name: string; slope: number; rating: number; par: number }): string | null {
  if (!t.name.trim()) return "Each tee set needs a name.";
  for (const [k, lim] of Object.entries(TEE_LIMITS)) {
    const v = (t as any)[k] as number;
    if (!Number.isFinite(v) || v < lim.min || v > lim.max) {
      return `${t.name || "Tee set"}: ${lim.label} must be between ${lim.min} and ${lim.max}.`;
    }
  }
  return null;
}

export function validateIndex(v: string): string | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 54) return "Handicap Index must be between 0.0 and 54.0.";
  if (!/^\d+(\.\d)?$/.test(v.trim())) return "Handicap Index can have one decimal place.";
  return null;
}

export function validateAllowance(v: number): string | null {
  return Number.isFinite(v) && v >= 0 && v <= 100 ? null : "Handicap Allowance must be between 0 and 100 percent.";
}
