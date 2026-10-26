import { supabase } from "@/integrations/supabase/client";
import { fetchAllTournamentScores } from "@/lib/fetchLeaderboardScores";
import { calculateSkinsCarryover } from "@/lib/skinsCarryover";


export type SkinsGame = {
  id: string;
  tournament_id: string;
  division_id: string | null;
  name: string;
  total_purse_cents: number;
  skin_format: "gross" | "net" | string;
  carryover: boolean;
  round_number: number;
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
 * True carryover, isolated to this game's round/pot/format. Called only by Calculate.
 * Persist all holes (null winner for ties) using existing fields, so reopening
 * a result reconstructs its recorded skins without recalculating current scores.
 */
export async function recomputeDivisionSkins(game: SkinsGame): Promise<SkinRow[]> {
  const roundNumber = Math.max(1, Number(game.round_number) || 1);
  const [registrationsResult, allScores, tournamentResult] = await Promise.all([
    supabase
      .from("tournament_registrations")
      .select("id, handicap, status, flight_id, tier_id, payment_status, skins_opt_in")
      .eq("tournament_id", game.tournament_id),
    fetchAllTournamentScores(game.tournament_id, { roundNumber }),
    supabase.from("tournaments").select("pairings_config, enterprise_settings").eq("id", game.tournament_id).maybeSingle(),
  ]);
  if (registrationsResult.error) throw registrationsResult.error;
  if (tournamentResult.error) throw tournamentResult.error;
  const tournament = tournamentResult.data as any;
  const holeCount = Number(tournament?.pairings_config?.byDay?.[roundNumber - 1]?.roundHoles || tournament?.enterprise_settings?.rounds?.[roundNumber - 1]?.holes || 18);
  const regs = registrationsResult.data;
  const scores = allScores;



  const eligible = new Map<string, number>();
  ((regs as any[]) || []).forEach((r) => {
    const status = String(r.status || "active").toLowerCase();
    const pay = String(r.payment_status || "").toLowerCase();
    if (["wd", "withdrawn", "dq"].includes(status)) return;
    if (r.skins_opt_in === false) return; // organizer removed them from the pot
    if (["refunded", "cancelled", "canceled", "failed", "void"].includes(pay)) return;
    // A player's division can be stored as the selected flight OR the price tier.
    // Anyone the organizer explicitly added to the pot stays eligible either way.
    const divisionId = r.flight_id || r.tier_id || null;
    if (game.division_id && divisionId !== game.division_id && r.skins_opt_in !== true) return;
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

  const { rows: result } = calculateSkinsCarryover(game.total_purse_cents || 0, holeCount, byHole);

  // Persist
  const { error: deleteError } = await (supabase as any).from("division_skin_winners").delete().eq("skins_game_id", game.id);
  if (deleteError) throw deleteError;
  if (result.length > 0) {
    const { error: insertError } = await (supabase as any).from("division_skin_winners").insert(
      result.map((r) => ({
        skins_game_id: game.id,
        registration_id: r.registration_id,
        hole_number: r.hole_number,
        score: r.score,
        amount_cents: r.amount_cents,
      })),
    );
    if (insertError) throw insertError;
  }
  return result;
}
