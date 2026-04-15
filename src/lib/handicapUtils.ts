/**
 * Golf Handicap Calculation Utilities
 *
 * Formulas follow USGA / WHS standards:
 *   Course Handicap = Handicap Index × (Slope Rating / 113) + (Course Rating − Par)
 *   Playing Handicap = Course Handicap × (Handicap Allowance / 100)
 *   Net Score = Gross Score − Playing Handicap
 */

export interface CourseInfo {
  par: number;
  courseRating: number;
  slopeRating: number;
  strokeIndexes?: number[]; // array of 18 SI values (1-18)
}

/** Calculate Course Handicap (rounded to nearest integer). */
export function calcCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number
): number {
  return Math.round(handicapIndex * (slopeRating / 113) + (courseRating - par));
}

/** Calculate Playing Handicap from Course Handicap & allowance (default 95%). */
export function calcPlayingHandicap(
  courseHandicap: number,
  allowancePercent: number = 95
): number {
  return Math.round(courseHandicap * (allowancePercent / 100));
}

/**
 * Allocate strokes to individual holes using Stroke Index values.
 *
 * @param playingHandicap – total strokes the player receives
 * @param strokeIndexes   – array of 18 SI values (1 = hardest, 18 = easiest)
 * @returns array of 18 numbers, each representing extra strokes on that hole
 */
export function allocateStrokes(
  playingHandicap: number,
  strokeIndexes: number[]
): number[] {
  const strokes = new Array(18).fill(0);
  if (playingHandicap <= 0 || !strokeIndexes || strokeIndexes.length < 18)
    return strokes;

  // Build a mapping from SI rank → hole index (0-based)
  const ranked = strokeIndexes
    .map((si, holeIdx) => ({ si, holeIdx }))
    .sort((a, b) => a.si - b.si);

  for (let i = 0; i < playingHandicap; i++) {
    const idx = i % 18;
    strokes[ranked[idx].holeIdx]++;
  }

  return strokes;
}

/** Calculate net score for a single hole. */
export function netHoleScore(
  grossScore: number,
  strokesOnHole: number
): number {
  return grossScore - strokesOnHole;
}

/** Calculate total net score across all holes. */
export function totalNetScore(
  grossScores: Record<number, number>,
  strokesPerHole: number[]
): number {
  let net = 0;
  for (let h = 1; h <= 18; h++) {
    const gross = grossScores[h];
    if (gross != null) {
      net += gross - (strokesPerHole[h - 1] || 0);
    }
  }
  return net;
}

/** Recommended handicap allowance by format. */
export const FORMAT_ALLOWANCES: Record<string, { label: string; allowance: number }> = {
  stroke_play: { label: "Individual Stroke Play", allowance: 95 },
  scramble_4: { label: "4-Person Scramble", allowance: 25 },
  scramble_2: { label: "2-Person Scramble", allowance: 35 },
  best_ball_2: { label: "2-Person Best Ball", allowance: 90 },
  best_ball_4: { label: "4-Person Best Ball", allowance: 85 },
  shamble_4: { label: "4-Person Shamble", allowance: 80 },
  stableford: { label: "Stableford", allowance: 95 },
  alternate_shot: { label: "Alternate Shot", allowance: 50 },
};
