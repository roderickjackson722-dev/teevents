import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Trophy, Sparkles, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { useOrgContext } from "@/hooks/useOrgContext";

export default function LeagueOverviewTab({ leagueId }: { leagueId: string }) {
  const { org } = useOrgContext();
  const [stats, setStats] = useState({ members: 0, events: 0, upcoming: [] as any[], recent: [] as any[], topStandings: [] as any[] });
  const [stripe, setStripe] = useState<{ loading: boolean; connected: boolean; started: boolean }>({ loading: true, connected: false, started: false });

  useEffect(() => {
    if (!org?.orgId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("organization_payout_methods")
        .select("stripe_account_id, stripe_onboarding_complete")
        .eq("organization_id", org.orgId)
        .maybeSingle();
      setStripe({
        loading: false,
        connected: !!data?.stripe_onboarding_complete,
        started: !!data?.stripe_account_id,
      });
    })();
  }, [org?.orgId]);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [m, e, up, rc, st] = await Promise.all([
        (supabase as any).from("league_members").select("id", { count: "exact", head: true }).eq("league_id", leagueId),
        (supabase as any).from("league_events").select("id", { count: "exact", head: true }).eq("league_id", leagueId),
        (supabase as any).from("league_events").select("*").eq("league_id", leagueId).gte("event_date", today).order("event_date").limit(5),
        (supabase as any).from("league_events").select("*").eq("league_id", leagueId).eq("is_completed", true).order("event_date", { ascending: false }).limit(5),
        (supabase as any).from("league_standings").select("*, league_members!inner(member_name)").eq("league_id", leagueId).order("points", { ascending: false }).limit(5),
      ]);
      setStats({
        members: m.count || 0,
        events: e.count || 0,
        upcoming: up.data || [],
        recent: rc.data || [],
        topStandings: st.data || [],
      });
    })();
  }, [leagueId]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{stats.members}</p><p className="text-xs text-muted-foreground">Players</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{stats.events}</p><p className="text-xs text-muted-foreground">Events</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Trophy className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{stats.upcoming.length}</p><p className="text-xs text-muted-foreground">Upcoming</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{stats.recent.length}</p><p className="text-xs text-muted-foreground">Completed</p></div></div></CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardContent className="p-5 space-y-2">
          <h3 className="font-semibold">Upcoming Events</h3>
          {stats.upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming events.</p> : stats.upcoming.map((e) => (
            <div key={e.id} className="flex justify-between text-sm border-b py-2 last:border-0">
              <span className="font-medium">{e.event_name}</span>
              <span className="text-muted-foreground">{e.event_date}</span>
            </div>
          ))}
        </CardContent></Card>

        <Card><CardContent className="p-5 space-y-2">
          <h3 className="font-semibold">Recent Results</h3>
          {stats.recent.length === 0 ? <p className="text-sm text-muted-foreground">No completed events yet.</p> : stats.recent.map((e) => (
            <div key={e.id} className="flex justify-between text-sm border-b py-2 last:border-0">
              <span className="font-medium">{e.event_name}</span>
              <span className="text-muted-foreground">{e.event_date}</span>
            </div>
          ))}
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-5 space-y-2">
        <h3 className="font-semibold">Standings Snapshot</h3>
        {stats.topStandings.length === 0 ? <p className="text-sm text-muted-foreground">Standings will appear once results are posted.</p> : stats.topStandings.map((s, i) => (
          <div key={s.id} className="flex justify-between text-sm border-b py-2 last:border-0">
            <span><span className="font-bold mr-2">{i + 1}.</span>{s.league_members.member_name}</span>
            <span className="font-medium">{s.points} pts</span>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}
