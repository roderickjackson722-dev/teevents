import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";

interface Row { id: string; name: string; signups: number; paid: number }

/** Compact team-referral leaderboard shown alongside a tournament. */
export default function TeamReferralsSummary({ tournamentId }: { tournamentId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: prs }, { data: regs }] = await Promise.all([
        supabase.from("team_promoters").select("id, name").eq("tournament_id", tournamentId),
        supabase
          .from("tournament_registrations")
          .select("promoter_id, payment_status")
          .eq("tournament_id", tournamentId)
          .not("promoter_id", "is", null),
      ]);
      const list = ((prs || []) as { id: string; name: string }[]).map((p) => {
        const mine = ((regs || []) as any[]).filter((r) => r.promoter_id === p.id);
        return { id: p.id, name: p.name, signups: mine.length, paid: mine.filter((r) => r.payment_status === "paid").length };
      });
      list.sort((a, b) => b.signups - a.signups);
      setRows(list.slice(0, 5));
      setTotal((regs || []).length);
      setLoaded(true);
    })();
  }, [tournamentId]);

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" /> Team Referrals
        </CardTitle>
        <span className="text-sm text-muted-foreground">{total} sign-ups via team links</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Give each team member a personal sign-up link and see who brought in the most players.
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {rows.map((r, i) => (
              <li key={r.id} className="flex items-center justify-between py-1.5">
                <span className="truncate">{i + 1}. {r.name}</span>
                <span className="text-muted-foreground">{r.signups} signed up · {r.paid} paid</span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="outline" size="sm">
          <Link to={`/dashboard/team-performance?tournament_id=${tournamentId}`}>
            {rows.length ? "See all team results" : "Set up team links"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
