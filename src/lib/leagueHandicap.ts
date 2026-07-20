/**
 * League handicap helpers built on WHS formulas.
 * Used by scoring UIs so client-side display matches the server-side
 * `member_submit_score` RPC.
 */
import { calcCourseHandicap, allocateStrokes } from "@/lib/handicapUtils";

export interface CourseSnapshot {
  par_total?: number | null;
  course_rating?: number | null;
  slope_rating?: number | null;
  hole_pars?: number[] | null;
  hole_stroke_indexes?: number[] | null;
}

export interface HandicapAllocation {
  courseHandicap: number;
  strokesPerHole: number[]; // length 18
  holePars: number[]; // length 18 (default 4)
}

const DEFAULT_HOLE_PARS = Array(18).fill(4);
const DEFAULT_SIS = Array.from({ length: 18 }, (_, i) => i + 1);

export function buildAllocation(
  handicapIndex: number | null | undefined,
  course: CourseSnapshot | null | undefined,
): HandicapAllocation {
  const holePars =
    Array.isArray(course?.hole_pars) && course!.hole_pars!.length === 18
      ? course!.hole_pars!.map((p) => Number(p) || 4)
      : DEFAULT_HOLE_PARS;
  const sis =
    Array.isArray(course?.hole_stroke_indexes) && course!.hole_stroke_indexes!.length === 18
      ? course!.hole_stroke_indexes!.map((s) => Number(s) || 18)
      : DEFAULT_SIS;

  if (handicapIndex == null || Number.isNaN(Number(handicapIndex))) {
    return { courseHandicap: 0, strokesPerHole: Array(18).fill(0), holePars };
  }

  const courseHandicap =
    course?.slope_rating && course?.course_rating && course?.par_total
      ? calcCourseHandicap(
          Number(handicapIndex),
          Number(course.slope_rating),
          Number(course.course_rating),
          Number(course.par_total),
        )
      : Math.round(Number(handicapIndex));

  return {
    courseHandicap,
    strokesPerHole: allocateStrokes(Math.max(0, courseHandicap), sis),
    holePars,
  };
}

/** Cap a gross score at Net Double Bogey (par + strokes received + 2). */
export function capNetDoubleBogey(
  gross: number,
  holeIdx: number,
  alloc: HandicapAllocation,
): number {
  const par = alloc.holePars[holeIdx] || 4;
  const strokes = alloc.strokesPerHole[holeIdx] || 0;
  const cap = par + strokes + 2;
  return Math.min(gross, cap);
}

/** Net score for a single hole, with NDB cap applied. */
export function netForHole(
  gross: number,
  holeIdx: number,
  alloc: HandicapAllocation,
): number {
  const capped = capNetDoubleBogey(gross, holeIdx, alloc);
  return Math.max(1, capped - (alloc.strokesPerHole[holeIdx] || 0));
}
