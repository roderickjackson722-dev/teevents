import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, Users, Calendar, Loader2, Lock, CreditCard } from "lucide-react";
import LeagueForm from "@/components/leagues/LeagueForm";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface League {
  id: string;
  league_name: string;
  league_slug: string;
  season_year: number | null;
  is_active: boolean;
  is_public: boolean;
  start_date: string | null;
  end_date: string | null;
  access_status?: string;
  member_count?: number;
  event_count?: number;
}

export default function Leagues() {
  const { org } = useOrgContext();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    if (!org) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("golf_leagues")
      .select("id, league_name, league_slug, season_year, is_active, is_public, start_date, end_date, access_status")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load leagues", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data as League[]) || [];
    // fetch counts
    const withCounts = await Promise.all(
      rows.map(async (l) => {
        const [{ count: mCount }, { count: eCount }] = await Promise.all([
          (supabase as any).from("league_members").select("id", { count: "exact", head: true }).eq("league_id", l.id),
          (supabase as any).from("league_events").select("id", { count: "exact", head: true }).eq("league_id", l.id),
        ]);
        return { ...l, member_count: mCount || 0, event_count: eCount || 0 };
      })
    );
    setLeagues(withCounts);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [org?.orgId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            Golf Leagues
          </h1>
          <p className="text-muted-foreground mt-1">Run season-long leagues alongside your tournaments.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> New League
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : leagues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">You haven't created any leagues yet.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create your first league
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {leagues.map((l) => (
            <Card key={l.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {l.league_name}
                    {l.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    {l.is_public && <Badge variant="outline">Public</Badge>}
                  </CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{l.member_count} members</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{l.event_count} events</span>
                    {l.season_year && <span>Season: {l.season_year}</span>}
                  </div>
                </div>
                <Button asChild variant="outline">
                  <Link to={`/dashboard/leagues/${l.id}`}>Manage</Link>
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <LeagueForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}
