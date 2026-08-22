import { supabase } from "@/integrations/supabase/client";

export type SkinsGame = {
  id: string;
  tournament_id: string;
  division_id: string | null;
  name: string;
  total_purse_cents: number;
  skin_format: "gross" | "net" | string;
  carryover: boolean;
  status: string;
};

export type SkinRow = {
  hole_number: number;
  registration_id: string | null;
  score: number | null;
  amount_cents: number;
};

/** Net strokes for a hole: whole-shot allocation of the player's handicap over 18 holes. */
function netStrokes(strokes: number, handicap: number, hole: number) {
  const base = Math.floor(handicap / 18);
  const extra = handicap - base * 18;
  const allowance = base + (hole <= extra ? 1 : 0);
  return strokes - allowance;
}

/**
 * Recompute skin winners + payouts for one division skins game.
 * Lowest (unique) score on a hole wins the skin. With carryover on, an unclaimed
 * hole's share rolls into the next hole; without it, the purse is split evenly
 * across the holes that were actually won. Withdrawn players are excluded.
 */
export async function recomputeDivisionSkins(game: SkinsGame): Promise<SkinRow[]> {
  const [{ data: regs }, { data: scores }] = await Promise.all([
    supabase
      .from("tournament_registrations")
      .select("id, handicap, status, flight_id, tier_id, payment_status, skins_opt_in")
      .eq("tournament_id", game.tournament_id),
    supabase
      .from("tournament_scores")
      .select("registration_id, hole_number, strokes")
      .eq("tournament_id", game.tournament_id),
  ]);


  const eligible = new Map<string, number>();
  ((regs as any[]) || []).forEach((r) => {
    const status = String(r.status || "active").toLowerCase();
    const pay = String(r.payment_status || "").toLowerCase();
    if (status === "wd" || status === "dq") return;
    if (r.skins_opt_in === false) return; // organizer removed them from the pot
    if (["refunded", "cancelled", "canceled", "failed", "void"].includes(pay)) return;
    eligible.set(r.id, Number(r.handicap) || 0);
  });


  const byHole: Record<number, { registration_id: string; score: number }[]> = {};
  ((scores as any[]) || []).forEach((s) => {
    if (!eligible.has(s.registration_id)) return;
    if (s.strokes == null || Number(s.strokes) <= 0) return;
    const hole = Number(s.hole_number);
    const raw = Number(s.strokes);
    const score =
      game.skin_format === "net" ? netStrokes(raw, eligible.get(s.registration_id) || 0, hole) : raw;
    (byHole[hole] ||= []).push({ registration_id: s.registration_id, score });
  });

  // Determine which holes were won outright.
  const wins: { hole_number: number; registration_id: string; score: number }[] = [];
  const played: number[] = [];
  for (let h = 1; h <= 18; h++) {
    const rows = byHole[h];
    if (!rows || rows.length === 0) continue;
    played.push(h);
    const min = Math.min(...rows.map((r) => r.score));
    const winners = rows.filter((r) => r.score === min);
    if (winners.length === 1) {
      wins.push({ hole_number: h, registration_id: winners[0].registration_id, score: min });
    }
  }

  const purse = game.total_purse_cents || 0;
  const result: SkinRow[] = [];

  if (game.carryover) {
    const perHole = Math.floor(purse / 18);
    let carry = 0;
    for (let h = 1; h <= 18; h++) {
      const win = wins.find((w) => w.hole_number === h);
      if (win) {
        result.push({
          hole_number: h,
          registration_id: win.registration_id,
          score: win.score,
          amount_cents: perHole + carry,
        });
        carry = 0;
      } else {
        carry += perHole;
      }
    }
    // Any purse left in the carry (or rounding remainder) goes to the last skin won.
    if (result.length > 0) {
      const paid = result.reduce((s, r) => s + r.amount_cents, 0);
      result[result.length - 1].amount_cents += purse - paid;
    }
  } else {
    const share = wins.length > 0 ? Math.floor(purse / wins.length) : 0;
    wins.forEach((w, i) => {
      result.push({
        hole_number: w.hole_number,
        registration_id: w.registration_id,
        score: w.score,
        amount_cents: share + (i === wins.length - 1 ? purse - share * wins.length : 0),
      });
    });
  }

  // Persist
  await (supabase as any).from("division_skin_winners").delete().eq("skins_game_id", game.id);
  if (result.length > 0) {
    await (supabase as any).from("division_skin_winners").insert(
      result.map((r) => ({
        skins_game_id: game.id,
        registration_id: r.registration_id,
        hole_number: r.hole_number,
        score: r.score,
        amount_cents: r.amount_cents,
      })),
    );
  }
  return result;
}
