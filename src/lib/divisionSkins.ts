import { supabase } from "@/integrations/supabase/client";
import { fetchAllTournamentScores } from "@/lib/fetchLeaderboardScores";
import { calculateSkinsCarryover } from "@/lib/skinsCarryover";
import { getFormatById } from "@/lib/scoringFormats";
import { splitFoursomeTeams } from "@/lib/foursomeTeams";

/** Resolve playing teams from the full pairing, before pot eligibility is applied. */
export function skinsCompetitionMembers<T extends { id: string; group_id?: string | null; group_number?: number | null }>(
  registrations: T[], scoringFormat?: string | null,
): T[][] {
  if ((getFormatById(scoringFormat || "stroke_play")?.teamSize || 1) <= 1) {
    return registrations.map((r) => [r]);
  }
  const pairings = new Map<string, T[]>();
  registrations.forEach((r) => {
    const key = r.group_number != null ? `pairing-${r.group_number}` : r.group_id ? `team-${r.group_id}` : `player-${r.id}`;
    pairings.set(key, [...(pairings.get(key) || []), r]);
  });
  return [...pairings.values()].flatMap((members) => splitFoursomeTeams(members).map((part) => part.members));
}


export type SkinsGame = {
  id: string;
  tournament_id: string;
  division_id: string | null;
  selected_division_ids?: string[] | null;
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
      .select("id, group_id, group_number, handicap, status, flight_id, tier_id, payment_status, skins_opt_in")
      .eq("tournament_id", game.tournament_id),
    fetchAllTournamentScores(game.tournament_id, { roundNumber }),
    supabase.from("tournaments").select("pairings_config, enterprise_settings, scoring_format").eq("id", game.tournament_id).maybeSingle(),
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
    if (game.selected_division_ids != null && (!divisionId || !game.selected_division_ids.includes(divisionId))) return;
    if (game.division_id && divisionId !== game.division_id && r.skins_opt_in !== true) return;
    eligible.set(r.id, Number(r.handicap) || 0);
  });



  // Team scoring stores the same hole score against both teammates. Count their
  // playing team once, not as two tied competitors. Keep a real eligible player
  // ID for the existing winner foreign key; no score rows are changed.
  const competitorFor = new Map<string, string>();
  skinsCompetitionMembers((regs || []) as { id: string; group_id: string | null; group_number: number | null }[], tournament?.scoring_format)
    .forEach((members) => {
      const included = members.filter((r) => eligible.has(r.id)).sort((a, b) => a.id.localeCompare(b.id));
      const representative = included[0];
      if (!representative) return;
      included.forEach((r) => competitorFor.set(r.id, representative.id));
    });
  const teamScores = new Map<number, Map<string, number>>();
  ((scores as any[]) || []).forEach((s) => {
    if (!eligible.has(s.registration_id)) return;
    if (s.strokes == null || Number(s.strokes) <= 0) return;
    const hole = Number(s.hole_number);
    const raw = Number(s.strokes);
    const score =
      game.skin_format === "net" ? netStrokes(raw, eligible.get(s.registration_id) || 0, hole) : raw;
    const competitor = competitorFor.get(s.registration_id);
    if (!competitor) return;
    const entries = teamScores.get(hole) || new Map<string, number>();
    entries.set(competitor, Math.min(entries.get(competitor) ?? Infinity, score));
    teamScores.set(hole, entries);
  });

  const byHole = Object.fromEntries([...teamScores].map(([hole, entries]) => [hole,
    [...entries].map(([registration_id, score]) => ({ registration_id, score })),
  ]));

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
