import { supabase } from "@/integrations/supabase/client";
import { eventHoleNumbers } from "@/lib/leagueHoles";

/**
 * Compute skins for a single event.
 * @param eventId
 * @param mode "gross" or "net"
 * @param skinValueCents value of each skin (event fee pool ÷ 18, or user-specified)
 * @param carryover if true, unclaimed skins carry to next hole (accumulator)
 */
export async function computeEventSkins(
  eventId: string,
  mode: "gross" | "net" = "gross",
  skinValueCents: number = 0,
  carryover: boolean = true,
) {
  const { data: ev } = await (supabase as any)
    .from("league_events")
    .select("holes, start_hole")
    .eq("id", eventId)
    .maybeSingle();
  const playedHoles = eventHoleNumbers(ev);

  const { data: scores } = await (supabase as any)
    .from("league_event_scores")
    .select("member_id, hole_number, gross_score, net_score")
    .eq("event_id", eventId);

  const byHole: Record<number, { member_id: string; score: number }[]> = {};
  (scores || []).forEach((s: any) => {
    const val = mode === "net" ? (s.net_score ?? s.gross_score) : s.gross_score;
    if (val == null) return;
    if (!playedHoles.includes(Number(s.hole_number))) return;
    if (!byHole[s.hole_number]) byHole[s.hole_number] = [];
    byHole[s.hole_number].push({ member_id: s.member_id, score: Number(val) });
  });

  // Clear old skins for this event
  await (supabase as any).from("league_skins").delete().eq("event_id", eventId);

  const results: { hole_number: number; winner_member_id: string | null; skin_amount_cents: number; is_gross: boolean }[] = [];
  let carry = 0;
  for (const h of playedHoles) {
    const holeScores = byHole[h];
    if (!holeScores || holeScores.length === 0) continue;
    const min = Math.min(...holeScores.map(s => s.score));
    const winners = holeScores.filter(s => s.score === min);
    if (winners.length === 1) {
      results.push({
        hole_number: h,
        winner_member_id: winners[0].member_id,
        skin_amount_cents: skinValueCents + carry,
        is_gross: mode === "gross",
      });
      carry = 0;
    } else {
      if (carryover) {
        carry += skinValueCents;
      }
      results.push({
        hole_number: h,
        winner_member_id: null,
        skin_amount_cents: 0,
        is_gross: mode === "gross",
      });
    }
  }

  const rows = results.filter(r => r.winner_member_id).map(r => ({
    event_id: eventId,
    ...r,
  }));
  if (rows.length) {
    await (supabase as any).from("league_skins").insert(rows);
  }
  return { winners: rows.length, carriedOver: carry };
}
