/**
 * USGA / WHS Course Handicap math used by the Enterprise handicap system.
 *
 *   Course Handicap  = Handicap Index × (Slope ÷ 113) + (Course Rating − Par)
 *   9-hole           = half of the 18-hole Course Handicap, rounded
 *   Playing Handicap = Course Handicap × allowance %
 */

/** Round to the nearest whole number; .5 rounds away from zero (12.5 → 13, −1.5 → −2). */
export function usgaRound(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const r = Math.floor(Math.abs(value) + 0.5);
  return r === 0 ? 0 : sign * r;
}

export interface HandicapEventSettings {
  courseRating: number | null | undefined;
  slopeRating: number | null | undefined;
  par: number | null | undefined;
  allowancePercentage?: number | null;
  holes?: number | null;
}

/** Unrounded 18-hole Course Handicap. */
export function rawCourseHandicap(index: number, slope: number, rating: number, par: number): number {
  return index * (slope / 113) + (rating - par);
}

export function courseHandicap(index: number | null | undefined, s: HandicapEventSettings): number | null {
  if (index == null || Number.isNaN(Number(index))) return null;
  const slope = Number(s.slopeRating) || 113;
  const par = Number(s.par) || 72;
  const rating = s.courseRating != null && s.courseRating !== ("" as any) ? Number(s.courseRating) : par;
  const ch18 = usgaRound(rawCourseHandicap(Number(index), slope, rating, par));
  return Number(s.holes) === 9 ? usgaRound(ch18 / 2) : ch18;
}

export function playingHandicap(ch: number | null, allowancePercentage = 100): number | null {
  if (ch == null) return null;
  return usgaRound(ch * ((Number(allowancePercentage) || 100) / 100));
}

export function computeHandicaps(index: number | null | undefined, s: HandicapEventSettings) {
  const ch = courseHandicap(index, s);
  return { courseHandicap: ch, playingHandicap: playingHandicap(ch, s.allowancePercentage ?? 100) };
}

/** Score Differential = (113 ÷ Slope) × (Adjusted Gross − Course Rating). */
export function scoreDifferential(adjustedGross: number, rating: number, slope: number): number {
  return Math.round(((113 / (slope || 113)) * (adjustedGross - rating)) * 10) / 10;
}

/** WHS table: how many of the most recent differentials count, plus adjustment. */
const WHS_TABLE: Record<number, [number, number]> = {
  3: [1, -2], 4: [1, -1], 5: [1, 0], 6: [2, -1], 7: [2, 0], 8: [2, 0],
  9: [3, 0], 10: [3, 0], 11: [3, 0], 12: [4, 0], 13: [4, 0], 14: [4, 0],
  15: [5, 0], 16: [5, 0], 17: [6, 0], 18: [6, 0], 19: [7, 0], 20: [8, 0],
};

/** Projected index from the most recent (up to 20) differentials, oldest first. */
export function projectedIndex(differentials: number[]): number | null {
  const recent = differentials.slice(-20);
  if (recent.length < 3) return null;
  const [count, adj] = WHS_TABLE[recent.length];
  const best = [...recent].sort((a, b) => a - b).slice(0, count);
  const avg = best.reduce((s, d) => s + d, 0) / count;
  return Math.min(54, Math.round((avg + adj) * 10) / 10);
}

export const ALLOWANCE_OPTIONS = [100, 95, 90, 85, 80];
