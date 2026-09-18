import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trophy, Users } from "lucide-react";

interface LeagueRow {
  id: string;
  league_name: string;
  league_slug: string;
  season_year: number | null;
  start_date: string | null;
  end_date: string | null;
  publish_status: string;
  events_used: number | null;
  is_active: boolean;
}

export default function EnterpriseLeagues() {
  const { org } = useOrgContext();
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    (async () => {
      const { data } = await (supabase.from("golf_leagues") as any)
        .select("id, league_name, league_slug, season_year, start_date, end_date, publish_status, events_used, is_active")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false });
      const rows = (data || []) as LeagueRow[];
      setLeagues(rows);
      if (rows.length) {
        const { data: members } = await (supabase.from("league_members") as any)
          .select("league_id")
          .in("league_id", rows.map((r) => r.id));
        const map: Record<string, number> = {};
        ((members || []) as any[]).forEach((m) => { map[m.league_id] = (map[m.league_id] || 0) + 1; });
        setCounts(map);
      }
      setLoading(false);
    })();
  }, [org]);

  return (
    <EnterpriseLayout
      title="Leagues"
      description="Season-long leagues with standings that carry across every event."
      crumbs={[{ label: "Leagues" }]}
      actions={
        <Button asChild className="bg-secondary text-primary hover:bg-secondary/90">
          <Link to="/dashboard/leagues"><Plus className="mr-1.5 h-4 w-4" /> New league</Link>
        </Button>
      }
    >
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Your leagues</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading leagues…</div>
          ) : leagues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leagues yet — create one to track standings across a season.</p>
          ) : (
            <div className="divide-y divide-border">
              {leagues.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <Trophy className="h-4 w-4 text-secondary" />
                  <span className="font-semibold">{l.league_name}</span>
                  <span className="text-muted-foreground">{l.season_year || ""}</span>
                  <span className="text-muted-foreground">
                    {[l.start_date, l.end_date].filter(Boolean).join(" → ") || "Season dates not set"}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {counts[l.id] || 0}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{l.publish_status}</span>
                  <div className="ml-auto flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/dashboard/leagues/${l.id}/manage`}>Manage</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/league/${l.league_slug}`} target="_blank">View page</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </EnterpriseLayout>
  );
}
