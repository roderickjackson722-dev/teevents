export type HoleScore = { registration_id: string; score: number };
export type CarryoverRow = {
  hole_number: number;
  registration_id: string | null;
  score: number | null;
  amount_cents: number;
  skins: number;
};
export type SkinsSummary = {
  totalPurseCents: number;
  perSkinValueCents: number;
  skinsAwarded: number;
  skinsUnclaimed: number;
  totalPaidCents: number;
  unclaimedAmountCents: number;
};

/** One call is one round, pot and score format. Never shares carry with another call. */
export function calculateSkinsCarryover(
  totalPurseCents: number,
  holeCount: number,
  scores: Record<number, HoleScore[]>,
): { rows: CarryoverRow[]; summary: SkinsSummary } {
  if (!Number.isInteger(holeCount) || holeCount < 1) throw new Error("Invalid round hole count");
  const perSkinValueCents = totalPurseCents / holeCount;
  let carry = 0;
  const rows: CarryoverRow[] = [];
  for (let hole = 1; hole <= holeCount; hole++) {
    // A player is counted once per hole; missing scores never create a winner.
    const entries = [...new Map((scores[hole] || []).filter((r) => Number.isFinite(r.score)).map((r) => [r.registration_id, r])).values()];
    const min = entries.length ? Math.min(...entries.map((r) => r.score)) : null;
    const winners = entries.filter((r) => r.score === min);
    const winner = winners.length === 1 ? winners[0] : undefined;
    const skins = winner ? 1 + carry : 0;
    rows.push({ hole_number: hole, registration_id: winner?.registration_id ?? null, score: min, skins, amount_cents: Math.round(skins * perSkinValueCents) });
    carry = winner ? 0 : carry + 1;
  }
  const skinsAwarded = rows.reduce((sum, row) => sum + row.skins, 0);
  const totalPaidCents = Math.round(skinsAwarded * perSkinValueCents);
  const lastWinner = rows.filter((row) => row.registration_id).at(-1);
  if (lastWinner) lastWinner.amount_cents += totalPaidCents - rows.reduce((sum, row) => sum + row.amount_cents, 0);
  return { rows, summary: { totalPurseCents, perSkinValueCents, skinsAwarded, skinsUnclaimed: carry, totalPaidCents, unclaimedAmountCents: totalPurseCents - totalPaidCents } };
}

/** Reconstruct only recorded all-hole results, never recompute from current scores. */
export function recordedSkinsResult(
  totalPurseCents: number,
  rows: Omit<CarryoverRow, "skins">[],
) {
  const ordered = [...rows].sort((a, b) => a.hole_number - b.hole_number);
  let carry = 0;
  const result = ordered.map((row) => {
    const skins = row.registration_id ? 1 + carry : 0;
    carry = row.registration_id ? 0 : carry + 1;
    return { ...row, skins };
  });
  const totalPaidCents = result.reduce((sum, row) => sum + row.amount_cents, 0);
  return { rows: result, summary: {
    totalPurseCents, perSkinValueCents: totalPurseCents / ordered.length,
    skinsAwarded: result.reduce((sum, row) => sum + row.skins, 0),
    skinsUnclaimed: carry, totalPaidCents, unclaimedAmountCents: totalPurseCents - totalPaidCents,
  } };
}