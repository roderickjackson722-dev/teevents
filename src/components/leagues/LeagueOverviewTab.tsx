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
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("organization_payout_methods")
        .select("stripe_account_id, stripe_onboarding_complete")
        .eq("organization_id", org.orgId)
        .maybeSingle();
      if (cancelled) return;
      setStripe({
        loading: false,
        connected: !!data?.stripe_onboarding_complete,
        started: !!data?.stripe_account_id,
      });
    };
    load();
    // Real-time: refresh instantly when the Stripe account.updated webhook flips onboarding.
    const channel = supabase
      .channel(`payout-methods-${org.orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "organization_payout_methods", filter: `organization_id=eq.${org.orgId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
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
      {!stripe.loading && !stripe.connected && (
        <Card className={stripe.started ? "border-amber-400 bg-amber-50" : "border-primary bg-primary/5"}>
          <CardContent className="p-4 flex items-start gap-3">
            {stripe.started ? (
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            ) : (
              <CreditCard className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold">
                {stripe.started ? "Finish connecting Stripe to accept league payments" : "Connect Stripe to accept membership & event fees"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Members pay directly to your bank account through Stripe. TeeVents keeps a 5% platform fee per transaction — same as tournaments.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link to="/dashboard/payout-settings">{stripe.started ? "Complete Stripe Onboarding" : "Connect Stripe"}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {!stripe.loading && stripe.connected && (
        <Card className="border-emerald-400 bg-emerald-50">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-emerald-900">Stripe connected — collecting league payments with a 5% platform fee.</span>
            <Link to="/dashboard/payout-settings" className="ml-auto text-emerald-700 underline text-xs">Manage</Link>
          </CardContent>
        </Card>
      )}
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
