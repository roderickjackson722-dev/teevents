import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Lock, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import LeagueOverviewTab from "@/components/leagues/LeagueOverviewTab";
import LeagueMembersTab from "@/components/leagues/LeagueMembersTab";
import LeagueEventsTab from "@/components/leagues/LeagueEventsTab";
import LeagueCoursesTab from "@/components/leagues/LeagueCoursesTab";
import LeaguePairingsTab from "@/components/leagues/LeaguePairingsTab";
import LeagueTeamsTab from "@/components/leagues/LeagueTeamsTab";
import LeagueScoringTab from "@/components/leagues/LeagueScoringTab";
import LeagueStandingsTab from "@/components/leagues/LeagueStandingsTab";
import LeagueSkinsTab from "@/components/leagues/LeagueSkinsTab";
import LeagueSettingsTab from "@/components/leagues/LeagueSettingsTab";
import LeagueCommunicationTab from "@/components/leagues/LeagueCommunicationTab";
import LeagueCustomizeTab from "@/components/leagues/LeagueCustomizeTab";
import LeagueShareTab from "@/components/leagues/LeagueShareTab";
import LeaguePayoutsTab from "@/components/leagues/LeaguePayoutsTab";
import LeaguePaymentsTab from "@/components/leagues/LeaguePaymentsTab";

import LeagueRegistrationTab from "@/components/leagues/LeagueRegistrationTab";
import LeagueRegistrationsTab from "@/components/leagues/LeagueRegistrationsTab";
import LeagueScoringPayoutsTab from "@/components/leagues/LeagueScoringPayoutsTab";



export default function LeagueManage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

  const load = async () => {
    if (!leagueId) return;
    const { data } = await (supabase as any).from("golf_leagues").select("*").eq("id", leagueId).maybeSingle();
    setLeague(data);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
        setIsAdmin(!!data);
      }
    })();
  }, []);


  useEffect(() => {
    load();
  }, [leagueId]);

  useEffect(() => {
    (async () => {
      if (!league?.organization_id) return;
      const { data } = await (supabase as any).rpc("org_has_active_league_subscription", { _org_id: league.organization_id });
      setHasSubscription(!!data);
    })();
  }, [league?.organization_id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">League not found.</p>
        <Button asChild variant="link" className="px-0"><Link to="/dashboard/leagues">Back to leagues</Link></Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/dashboard/leagues"><ArrowLeft className="h-4 w-4 mr-1" /> All Leagues</Link>
        </Button>
        <h1 className="text-3xl font-bold">{league.league_name}</h1>
        {league.season_year && <p className="text-muted-foreground">Season: {league.season_year}</p>}
      </div>

      {league.access_status !== "paid" && !hasSubscription && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <Lock className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">League is locked</p>
                <p className="text-sm text-muted-foreground">Pay the one-time $199 League Manager Access fee to activate members, events, pairings, scoring, standings, skins, and public/member portals.</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={async () => {
                  const promo = window.prompt("Enter a promo code (optional) or leave blank:") || "";
                  const { data, error } = await (supabase as any).functions.invoke("create-league-access-checkout", {
                    body: { league_id: league.id, promo_code: promo.trim() || undefined },
                  });
                  if (error || (!data?.url && !data?.free)) {
                    return toast({ title: "Checkout failed", description: error?.message || data?.error, variant: "destructive" });
                  }
                  if (data.free) { toast({ title: "League unlocked" }); load(); return; }
                  window.location.href = data.url;
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" /> Unlock League — $199
              </Button>
              {isAdmin && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (!window.confirm("Unlock without payment and queue for manual invoicing?")) return;
                    const notes = window.prompt("Optional invoice notes:") || "";
                    const { data, error } = await (supabase as any).functions.invoke("create-league-access-checkout", {
                      body: { league_id: league.id, admin_invoice: true, invoice_notes: notes.trim() || undefined },
                    });
                    if (error || !data?.invoice) {
                      return toast({ title: "Unlock failed", description: error?.message || data?.error, variant: "destructive" });
                    }
                    toast({ title: "League unlocked", description: "Added to admin invoice queue." });
                    load();
                  }}
                >
                  Unlock (Invoice)
                </Button>
              )}
            </div>

          </CardContent>
        </Card>
      )}


      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Dashboard</TabsTrigger>
          <TabsTrigger value="scoring-payouts">Scoring &amp; Payouts</TabsTrigger>
          <TabsTrigger value="members">Players</TabsTrigger>
          <TabsTrigger value="registration">League Registrations</TabsTrigger>

          <TabsTrigger value="event-registrations">Event Registrations</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="pairings">Pairings</TabsTrigger>
          <TabsTrigger value="teams">Teams &amp; Codes</TabsTrigger>
          <TabsTrigger value="scoring">Event Scoring</TabsTrigger>
          <TabsTrigger value="standings">Season Standings</TabsTrigger>
          <TabsTrigger value="skins">Skins</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="payouts">Finances</TabsTrigger>

          <TabsTrigger value="customize">Customize Page</TabsTrigger>
          <TabsTrigger value="public">Public Page</TabsTrigger>
          <TabsTrigger value="share">Share</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="mt-4"><LeagueTeamsTab leagueId={league.id} /></TabsContent>
        <TabsContent value="overview" className="mt-4"><LeagueOverviewTab leagueId={league.id} /></TabsContent>
        <TabsContent value="scoring-payouts" className="mt-4"><LeagueScoringPayoutsTab leagueId={league.id} /></TabsContent>
        <TabsContent value="members" className="mt-4"><LeagueMembersTab leagueId={league.id} /></TabsContent>
        <TabsContent value="registration" className="mt-4"><LeagueRegistrationTab league={league} /></TabsContent>

        <TabsContent value="event-registrations" className="mt-4"><LeagueRegistrationsTab leagueId={league.id} /></TabsContent>
        <TabsContent value="events" className="mt-4"><LeagueEventsTab leagueId={league.id} /></TabsContent>
        <TabsContent value="courses" className="mt-4"><LeagueCoursesTab leagueId={league.id} /></TabsContent>
        <TabsContent value="pairings" className="mt-4"><LeaguePairingsTab leagueId={league.id} /></TabsContent>
        <TabsContent value="scoring" className="mt-4"><LeagueScoringTab leagueId={league.id} /></TabsContent>
        <TabsContent value="standings" className="mt-4"><LeagueStandingsTab leagueId={league.id} /></TabsContent>
        <TabsContent value="skins" className="mt-4"><LeagueSkinsTab leagueId={league.id} /></TabsContent>
        <TabsContent value="messages" className="mt-4"><LeagueCommunicationTab leagueId={league.id} /></TabsContent>
        <TabsContent value="payments" className="mt-4"><LeaguePaymentsTab leagueId={league.id} /></TabsContent>
        <TabsContent value="payouts" className="mt-4"><LeaguePayoutsTab leagueId={league.id} /></TabsContent>


        <TabsContent value="customize" className="mt-4"><LeagueCustomizeTab league={league} onSaved={load} /></TabsContent>
        <TabsContent value="public" className="mt-4">
          {league.league_slug ? (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold">Live Public Page</p>
                    <p className="text-sm text-muted-foreground">This is exactly what your members and visitors see.</p>
                  </div>
                  <Button asChild variant="outline">
                    <a href={`/league/${league.league_slug}`} target="_blank" rel="noreferrer">Open in new tab</a>
                  </Button>
                </div>
                <div className="border rounded-md overflow-hidden bg-background">
                  <iframe
                    src={`/league/${league.league_slug}`}
                    title="Public League Page"
                    className="w-full"
                    style={{ height: "80vh", border: 0 }}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Set a league slug in Settings, then publish the league from Customize Page to view your public page here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="share" className="mt-4"><LeagueShareTab league={league} /></TabsContent>
        <TabsContent value="settings" className="mt-4"><LeagueSettingsTab league={league} onSaved={load} /></TabsContent>
      </Tabs>
      {league.is_public && league.league_slug && (
        <p className="text-xs text-muted-foreground">Public page: <a className="underline" href={`/league/${league.league_slug}`} target="_blank" rel="noreferrer">/league/{league.league_slug}</a></p>
      )}
    </div>
  );
}
