import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface Row {
  pairing_id: string;
  team_name: string;
  holes: number;
  gross: number;
  net: number;
  thru: number;
  toParGross: number;
  toParNet: number;
}

function fmt(n: number) {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : String(n);
}

/** Team leaderboard for a league event. Supports 9- and 18-hole events. */
export default function LeagueTeamLeaderboard({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [holes, setHoles] = useState(18);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!eventId) return;
    setLoading(true);

    const { data: ev } = await (supabase as any)
      .from("league_events")
      .select("id, holes, league_course_id")
      .eq("id", eventId)
      .maybeSingle();
    const eventHoles = ev?.holes === 9 ? 9 : 18;

    let holePars: number[] | null = null;
    if (ev?.league_course_id) {
      const { data: c } = await (supabase as any)
        .from("league_courses")
        .select("hole_pars, par_total")
        .eq("id", ev.league_course_id)
        .maybeSingle();
      if (Array.isArray(c?.hole_pars) && c.hole_pars.length >= 18) {
        holePars = c.hole_pars.map((p: any) => Number(p) || 4);
      }
    }

    const [{ data: pairings }, { data: scores }, { data: members }] = await Promise.all([
      (supabase as any).from("league_team_pairings").select("id, team_name, holes, player1_id, player2_id").eq("event_id", eventId),
      (supabase as any).from("league_team_scores").select("pairing_id, hole_number, gross_score").eq("event_id", eventId),
      (supabase as any).from("league_members").select("id, handicap_index"),
    ]);

    const hcpById = new Map((members || []).map((m: any) => [m.id, m.handicap_index]));

    const built: Row[] = (pairings || []).map((p: any) => {
      const teamHoles = p.holes === 9 ? 9 : eventHoles;
      const mine = (scores || []).filter((s: any) => s.pairing_id === p.id && s.hole_number <= teamHoles && s.gross_score != null);
      const gross = mine.reduce((sum: number, s: any) => sum + Number(s.gross_score), 0);
      const parPlayed = mine.reduce((sum: number, s: any) => sum + (holePars ? holePars[s.hole_number - 1] || 4 : 4), 0);
      // 2-person scramble allowance: 35% of the combined handicap average
      const h1 = Number(hcpById.get(p.player1_id) ?? 0);
      const h2 = Number(hcpById.get(p.player2_id) ?? 0);
      const fullTeamHcp = ((h1 + h2) / 2) * 0.35;
      const teamHcp = Math.round(teamHoles === 9 ? fullTeamHcp / 2 : fullTeamHcp);
      const net = Math.max(0, gross - (mine.length > 0 ? teamHcp : 0));
      return {
        pairing_id: p.id,
        team_name: p.team_name,
        holes: teamHoles,
        gross,
        net,
        thru: mine.length,
        toParGross: gross - parPlayed,
        toParNet: net - parPlayed,
      };
    });

    built.sort((a, b) => (a.thru === 0 ? 1 : 0) - (b.thru === 0 ? 1 : 0) || a.toParNet - b.toParNet);
    setHoles(eventHoles);
    setRows(built);
    setLoading(false);
  };

  useEffect(() => { load(); }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const channel = (supabase as any)
      .channel(`league-team-scores-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "league_team_scores", filter: `event_id=eq.${eventId}` }, () => load())
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [eventId]);

  if (loading) {
    return <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No teams paired for this event yet.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{holes} holes</p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Pos</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">Thru</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.pairing_id}>
                <TableCell className="font-bold">{r.thru > 0 ? i + 1 : "—"}</TableCell>
                <TableCell className="font-medium">{r.team_name}</TableCell>
                <TableCell className="text-right">{r.thru > 0 ? fmt(r.toParGross) : "—"}</TableCell>
                <TableCell className="text-right">{r.thru > 0 ? fmt(r.toParNet) : "—"}</TableCell>
                <TableCell className="text-right">{r.thru}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
