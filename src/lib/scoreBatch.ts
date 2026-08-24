/**
 * Pure helpers behind the Score Entry batch save.
 *
 * They live outside the dashboard component so the retention rules
 * (invalid cells never block a batch, in-flight saves never erase newer
 * edits, confirmed rows merge into the cached round) are unit-testable.
 */

export const MIN_STROKES = 1;
export const MAX_STROKES = 20;

export function validateStrokes(n: unknown): string | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return "Must be a number";
  if (!Number.isInteger(n)) return "Whole strokes only";
  if (n < MIN_STROKES) return `Min ${MIN_STROKES}`;
  if (n > MAX_STROKES) return `Max ${MAX_STROKES}`;
  return null;
}

export type ScoreSnapshot = Record<string, Record<number, number>>;

export interface ScoreUpsert {
  tournament_id: string;
  registration_id: string;
  hole_number: number;
  round_number: number;
  strokes: number;
}

export interface ScoreRow {
  registration_id: string;
  hole_number: number;
  strokes: number;
  round_number: number;
}

/**
 * Split a snapshot of edited cells into valid upserts and per-cell errors.
 * Invalid cells (0, blanks, out-of-range) are reported but never prevent the
 * remaining valid scores from being saved.
 */
export function partitionScoreBatch(
  snapshot: ScoreSnapshot,
  opts: { tournamentId: string; roundNumber: number },
): { upserts: ScoreUpsert[]; errors: Record<string, Record<number, string>>; invalidCount: number } {
  const errors: Record<string, Record<number, string>> = {};
  const upserts: ScoreUpsert[] = [];

  Object.entries(snapshot).forEach(([regId, holes]) => {
    Object.entries(holes).forEach(([hole, strokes]) => {
      const holeNum = parseInt(hole, 10);
      const err = validateStrokes(strokes);
      if (err) {
        if (!errors[regId]) errors[regId] = {};
        errors[regId][holeNum] = err;
      } else {
        upserts.push({
          tournament_id: opts.tournamentId,
          registration_id: regId,
          hole_number: holeNum,
          round_number: opts.roundNumber,
          strokes,
        });
      }
    });
  });

  const invalidCount = Object.values(errors).reduce((sum, holes) => sum + Object.keys(holes).length, 0);
  return { upserts, errors, invalidCount };
}

/**
 * Keep only the edits that are NOT part of the request that just completed.
 * A scorekeeper can keep typing while a save is in flight; those newer values
 * (and any invalid cell still awaiting a fix) must stay on screen.
 */
export function pruneSavedEdits(current: ScoreSnapshot, saved: ScoreSnapshot): ScoreSnapshot {
  const next: ScoreSnapshot = {};
  Object.entries(current).forEach(([regId, holes]) => {
    Object.entries(holes).forEach(([hole, value]) => {
      const holeNumber = Number(hole);
      if (saved[regId]?.[holeNumber] !== value) {
        if (!next[regId]) next[regId] = {};
        next[regId][holeNumber] = value;
      }
    });
  });
  return next;
}

/**
 * Merge database-confirmed rows into the cached round so a concurrent
 * realtime refresh can't briefly restore stale values after a big save.
 */
export function mergeConfirmedScores(current: ScoreRow[] | undefined, persisted: ScoreRow[]): ScoreRow[] {
  const byCell = new Map<string, ScoreRow>();
  (current || []).forEach((row) => byCell.set(`${row.registration_id}:${row.hole_number}`, row));
  persisted.forEach((row) => byCell.set(`${row.registration_id}:${row.hole_number}`, row));
  return Array.from(byCell.values());
}
