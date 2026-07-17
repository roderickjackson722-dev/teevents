import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Trophy } from "lucide-react";
import { recomputeLeagueStandings } from "@/lib/leagueStandings";

export default function LeagueStandingsTab({ leagueId }: { leagueId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("league_standings")
      .select("*, league_members!inner(member_name, handicap_index)")
      .eq("league_id", leagueId)
      .order("points", { ascending: false });
    setRows(data || []);
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

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Trophy className="h-5 w-5" /> Standings</h2>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>HCP</TableHead>
                <TableHead className="text-right">Matches</TableHead>
                <TableHead className="text-right">W-L-T</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right font-bold">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold">{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.league_members.member_name}</TableCell>
                  <TableCell>{r.league_members.handicap_index ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.matches_played}</TableCell>
                  <TableCell className="text-right">{r.wins}-{r.losses}-{r.ties}</TableCell>
                  <TableCell className="text-right">{r.total_gross}</TableCell>
                  <TableCell className="text-right">{r.total_net}</TableCell>
                  <TableCell className="text-right font-bold">{r.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
