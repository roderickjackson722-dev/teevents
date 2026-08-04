import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trophy } from "lucide-react";
import { formatCents } from "@/lib/formatCurrency";

interface Row {
  member_id: string;
  member_name: string;
  points: number;
  wins: number;
  matches_played: number;
  prize_money_cents: number;
}

/** Season standings for league members — points, wins, events played, prize money. */
export default function MemberSeasonStandingsCard({
  leagueSlug,
  highlightMemberId,
}: {
  leagueSlug: string;
  highlightMemberId?: string | null;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc("get_league_season_standings", { _league_slug: leagueSlug });
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, [leagueSlug]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Season Standings</h2>
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Standings appear here once event scores are posted.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Wins</TableHead>
                  <TableHead className="text-right">Prize $</TableHead>
                  <TableHead className="text-right font-bold">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.member_id} className={r.member_id === highlightMemberId ? "bg-primary/5 font-medium" : ""}>
                    <TableCell className="font-bold">{i + 1}</TableCell>
                    <TableCell>{r.member_name}</TableCell>
                    <TableCell className="text-right">{r.matches_played ?? 0}</TableCell>
                    <TableCell className="text-right">{r.wins ?? 0}</TableCell>
                    <TableCell className="text-right">{formatCents(r.prize_money_cents || 0)}</TableCell>
                    <TableCell className="text-right font-bold">{r.points ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
