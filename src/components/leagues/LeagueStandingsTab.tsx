import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Trophy } from "lucide-react";
import { recomputeLeagueStandings } from "@/lib/leagueStandings";
import { formatCents } from "@/lib/formatCurrency";
import { assignFlights, flightLabel, flightsForMethod, type FlightBasis, type FlightMethod } from "@/lib/flightPayouts";

export default function LeagueStandingsTab({ leagueId }: { leagueId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [flightCfg, setFlightCfg] = useState<{ enabled: boolean; method: FlightMethod; basis: FlightBasis }>({ enabled: false, method: "half", basis: "score" });

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("league_standings")
      .select("*, league_members!inner(member_name, handicap_index)")
      .eq("league_id", leagueId)
      .order("points", { ascending: false });
    setRows(data || []);
    const { data: lg } = await (supabase as any)
      .from("golf_leagues")
      .select("flights_enabled, flight_method, flight_based_on")
      .eq("id", leagueId)
      .maybeSingle();
    if (lg) {
      setFlightCfg({
        enabled: !!lg.flights_enabled,
        method: (lg.flight_method as FlightMethod) || "half",
        basis: (lg.flight_based_on as FlightBasis) || "score",
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [leagueId]);

  const recompute = async () => {
    setComputing(true);
    try {
      const n = await recomputeLeagueStandings(leagueId);
      toast({ title: `Standings recomputed — ${n} players ranked` });
      await load();
    } catch (e: any) {
      toast({ title: "Recompute failed", description: e.message, variant: "destructive" });
    }
    setComputing(false);
  };

  const saveWins = async (row: any, value: string) => {
    const trimmed = value.trim();
    const override = trimmed === "" ? null : Math.max(0, Number(trimmed) || 0);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, wins_override: override } : r)));
    const { error } = await (supabase as any)
      .from("league_standings")
      .update({ wins_override: override })
      .eq("id", row.id);
    if (error) toast({ title: "Could not save wins", description: error.message, variant: "destructive" });
  };


  const groups: { label: string; rows: any[] }[] = (() => {
    if (!flightCfg.enabled || rows.length === 0) return [{ label: "", rows }];
    const n = flightsForMethod(flightCfg.method, 2);
    const assigned = assignFlights(
      rows,
      (r: any) => (flightCfg.basis === "handicap" ? r.league_members?.handicap_index : r.total_net ?? r.total_gross),
      n,
    );
    const buckets: any[][] = Array.from({ length: n }, () => []);
    assigned.forEach((a) => buckets[a.flightIndex].push(a.entry));
    return buckets.map((b, i) => ({ label: flightLabel(i), rows: b })).filter((g) => g.rows.length > 0);
  })();

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Trophy className="h-5 w-5" /> Season Standings</h2>
          <Button onClick={recompute} disabled={computing}>
            {computing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Recompute
          </Button>
        </div>
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">
            No standings yet. Enter scores on the Scoring tab, then click <b>Recompute</b>.
          </p>
        ) : (
          groups.map((g, gi) => (
            <div key={gi} className="space-y-2">
              {g.label && <h3 className="text-sm font-semibold text-muted-foreground">{g.label} · {g.rows.length} players</h3>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>HCP</TableHead>
                    <TableHead className="text-right">Matches</TableHead>
                    <TableHead className="text-right w-24">Wins</TableHead>

                    
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Prize $</TableHead>
                    <TableHead className="text-right font-bold">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.rows.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-bold">{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.league_members.member_name}</TableCell>
                      <TableCell>{r.league_members.handicap_index ?? "—"}</TableCell>
                      <TableCell className="text-right">{r.matches_played}</TableCell>
                      
                      <TableCell className="text-right">{r.total_gross}</TableCell>
                      <TableCell className="text-right">{r.total_net}</TableCell>
                      <TableCell className="text-right">{formatCents(r.prize_money_cents || 0)}</TableCell>
                      <TableCell className="text-right font-bold">{r.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))
        )}

      </CardContent>
    </Card>
  );
}
