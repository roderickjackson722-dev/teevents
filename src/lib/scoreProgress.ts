/**
 * Score-completion helpers shared by the organizer scoring table.
 *
 * The organizer table highlights any hole cell without a score in yellow and
 * shows a "scores remaining" summary. Both read through the same resolver so
 * unsaved edits (still in local state) and saved scores (from the database)
 * count identically — that is what makes the highlight and the summary update
 * the instant a score is typed or saved.
 */

export type EditedScores = Record<string, Record<number, number>>;

export interface ProgressRow {
  /** Display label for the team/player. */
  label: string;
  /** Registration id whose row holds the authoritative score for this entry. */
  registrationId: string;
  /** Already-saved scores keyed by hole. */
  saved: Record<number, number | undefined>;
}

export interface ScoreProgress {
  total: number;
  missing: { label: string; hole: number }[];
  complete: boolean;
}

/** Effective score for a cell: an unsaved edit wins over the saved value. */
export function resolveScore(
  edited: EditedScores,
  registrationId: string,
  hole: number,
  saved: Record<number, number | undefined> | undefined
): number | undefined {
  const pending = edited[registrationId]?.[hole];
  if (pending != null) return pending;
  return saved?.[hole] ?? undefined;
}

/** Count hole entries still missing a score across every row. */
export function computeScoreProgress(
  rows: ProgressRow[],
  holes: number[],
  edited: EditedScores
): ScoreProgress {
  const missing: { label: string; hole: number }[] = [];
  let total = 0;
  rows.forEach((row) => {
    holes.forEach((hole) => {
      total++;
      const v = resolveScore(edited, row.registrationId, hole, row.saved);
      if (v == null) missing.push({ label: row.label, hole });
    });
  });
  return { total, missing, complete: total > 0 && missing.length === 0 };
}
