import { supabase } from "@/integrations/supabase/client";

/**
 * Recompute league standings for a given league.
 * Scoring model (Phase 2, individual stroke):
 *   - For each event with any scores: rank players by total gross (ascending).
 *   - Award position_points from league_point_systems.position_points (JSON map).
 *   - Winner (rank 1) also gets +win_points; ties share tied position and split? For simplicity ties both get position points for their rank and win_points if rank=1.
 *   - Accumulate matches_played (# events participated), wins (rank=1), totals.
 */
export async function recomputeLeagueStandings(leagueId: string) {
  const { data: pts } = await (supabase as any)
    .from("league_point_systems")
    .select("*")
    .eq("league_id", leagueId)
    .maybeSingle();

  const positionPoints: Record<string, number> = pts?.position_points || {};
  const winPoints = pts?.win_points ?? 2;
  const tiePoints = pts?.tie_points ?? 1;
  const lossPoints = pts?.loss_points ?? 0;
  const participationPoints = pts?.participation_points ?? 0;

  const { data: events } = await (supabase as any)
    .from("league_events")
    .select("id, season_id")
    .eq("league_id", leagueId);

  const eventIds = (events || []).map((e: any) => e.id);

  const { data: scores } = await (supabase as any)
    .from("league_event_scores")
    .select("event_id, member_id, gross_score, net_score")
    .in("event_id", eventIds);

  // Aggregate scores per event per player
  type Agg = { totalGross: number; totalNet: number; holes: number };
  const perEvent: Record<string, Record<string, Agg>> = {};
  const addScore = (eventId: string, memberId: string, gross: number, net: number) => {
    if (!perEvent[eventId]) perEvent[eventId] = {};
    if (!perEvent[eventId][memberId]) perEvent[eventId][memberId] = { totalGross: 0, totalNet: 0, holes: 0 };
    const a = perEvent[eventId][memberId];
    a.totalGross += gross;
    a.totalNet += net;
    a.holes += 1;
  };
  (scores || []).forEach((s: any) => {
    addScore(
      s.event_id,
      s.member_id,
      Number(s.gross_score) || 0,
      Number(s.net_score ?? s.gross_score) || 0,
    );
  });

  // Team formats (e.g. 2-person scramble) store scores per pairing — credit both players
  if (eventIds.length > 0) {
    const { data: pairings } = await (supabase as any)
      .from("league_team_pairings")
      .select("id, event_id, player1_id, player2_id")
      .in("event_id", eventIds);
    const pairingIds = (pairings || []).map((p: any) => p.id);
    if (pairingIds.length > 0) {
      const { data: teamScores } = await (supabase as any)
        .from("league_team_scores")
        .select("pairing_id, hole_number, gross_score")
        .in("pairing_id", pairingIds);
      const byPairing: Record<string, any> = {};
      (pairings || []).forEach((p: any) => { byPairing[p.id] = p; });
      (teamScores || []).forEach((s: any) => {
        const p = byPairing[s.pairing_id];
        if (!p) return;
        const g = Number(s.gross_score) || 0;
        [p.player1_id, p.player2_id].forEach((mid: string | null) => {
          if (mid) addScore(p.event_id, mid, g, g);
        });
      });
    }
  }


  // Standings per member across all events in the league
  type Row = { points: number; wins: number; losses: number; ties: number; matches: number; totalGross: number; totalNet: number; seasonId: string | null };
  const perMember: Record<string, Row> = {};

  Object.entries(perEvent).forEach(([eventId, playersMap]) => {
    const ranked = Object.entries(playersMap)
      .map(([memberId, a]) => ({ memberId, gross: a.totalGross, net: a.totalNet, holes: a.holes }))
      .filter(p => p.holes > 0)
      .sort((a, b) => a.gross - b.gross);

    if (ranked.length === 0) return;
    const seasonId = events?.find((e: any) => e.id === eventId)?.season_id || null;

    ranked.forEach((p, idx) => {
      // Competition ranking: identical scores share the same rank, so teammates
      // (and any tied players) earn identical position points.
      const rank = ranked.findIndex((r) => r.gross === p.gross) + 1;
      const tiedWithPrev = idx > 0 && ranked[idx - 1].gross === p.gross;
      const tiedWithNext = idx < ranked.length - 1 && ranked[idx + 1].gross === p.gross;

      let points = Number(positionPoints[String(rank)] || 0) + Number(participationPoints || 0);
      let wins = 0, losses = 0, ties = 0;
      // First place is a win — including shared first place (teammates or tied players)
      if (rank === 1) {
        wins = 1;
        points += tiedWithNext || tiedWithPrev ? tiePoints : winPoints;
        if (tiedWithNext || tiedWithPrev) ties = 1;
      } else if (tiedWithPrev || tiedWithNext) {
        points += tiePoints;
        ties = 1;
      } else {
        points += lossPoints;
        losses = 1;
      }


      if (!perMember[p.memberId]) {
        perMember[p.memberId] = { points: 0, wins: 0, losses: 0, ties: 0, matches: 0, totalGross: 0, totalNet: 0, seasonId };
      }
      const r = perMember[p.memberId];
      r.points += points;
      r.wins += wins;
      r.losses += losses;
      r.ties += ties;
      r.matches += 1;
      r.totalGross += p.gross;
      r.totalNet += p.net;
    });
  });

  // Preserve manually tracked prize money and manual win overrides across recomputes
  const { data: existing } = await (supabase as any)
    .from("league_standings")
    .select("member_id, prize_money_cents, wins_override")
    .eq("league_id", leagueId);
  const prizeByMember: Record<string, number> = {};
  const winsOverrideByMember: Record<string, number | null> = {};
  (existing || []).forEach((e: any) => {
    prizeByMember[e.member_id] = e.prize_money_cents || 0;
    winsOverrideByMember[e.member_id] = e.wins_override ?? null;
  });


  // Clear then upsert
  await (supabase as any).from("league_standings").delete().eq("league_id", leagueId);
  const rows = Object.entries(perMember).map(([memberId, r]) => ({
    league_id: leagueId,
    season_id: r.seasonId,
    member_id: memberId,
    matches_played: r.matches,
    points: r.points,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
    total_gross: r.totalGross,
    total_net: r.totalNet,
    prize_money_cents: prizeByMember[memberId] || 0,
  }));
  if (rows.length) {
    await (supabase as any).from("league_standings").insert(rows);
  }
  return rows.length;
}
