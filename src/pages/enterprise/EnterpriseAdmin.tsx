import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { TeamManagement } from "@/components/settings/TeamManagement";
import TournamentTeam from "@/components/settings/TournamentTeam";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, KeyRound, Building2, CreditCard, Globe, Users } from "lucide-react";
import { statusMeta, eventTypeLabel } from "@/lib/enterprise";

interface EventStat {
  id: string;
  title: string;
  date: string | null;
  status: string;
  slug: string | null;
  enterprise_event_type: string | null;
  players: number;
  scores: number;
}

/**
 * Enterprise Admin Portal — staff invitations, roles and event data in one
 * place, reusing the organization team plumbing so there is no second portal.
 */
export default function EnterpriseAdmin() {
  const { org } = useOrgContext();
  const [events, setEvents] = useState<EventStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase.from("tournaments") as any)
        .select("id, title, date, status, slug, enterprise_event_type")
        .eq("organization_id", org.orgId)
        .eq("is_enterprise", true)
        .order("created_at", { ascending: false });
      const rows = (data || []) as EventStat[];
      const withCounts = await Promise.all(
        rows.map(async (row) => {
          const [{ count: players }, { count: scores }] = await Promise.all([
            (supabase.from("tournament_registrations") as any)
              .select("id", { count: "exact", head: true })
              .eq("tournament_id", row.id),
            (supabase.from("tournament_scores") as any)
              .select("id", { count: "exact", head: true })
              .eq("tournament_id", row.id),
          ]);
          return { ...row, players: players || 0, scores: scores || 0 };
        }),
      );
      setEvents(withCounts);
      setLoading(false);
    })();
  }, [org]);

  return (
    <EnterpriseLayout
      title="Admin Portal"
      crumbs={[{ label: "Admin Portal" }]}
      description="Invite staff, set what each person can do, and check on every enterprise event — all from here."
    >
      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList>
          <TabsTrigger value="staff">Staff &amp; Roles</TabsTrigger>
          <TabsTrigger value="events">Event Data</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-6">
          <Card className="border-secondary/40 bg-secondary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4" /> How staff sign in
              </CardTitle>
              <CardDescription>
                Invite a staff member below and they get their own login by email. You can also hand out a
                6-character login code for anyone without an email inbox — they enter it at{" "}
                <Link to="/team-login" className="font-semibold text-primary underline">
                  teevents.golf/team-login
                </Link>
                .
              </CardDescription>
            </CardHeader>
          </Card>

          {org && <TeamManagement orgId={org.orgId} userId={org.userId} />}
          <TournamentTeam />
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Enterprise events</CardTitle>
              <CardDescription>
                Every published event also shows up in the main TeeVents dashboard, with the same players,
                scores and leaderboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading events…
                </div>
              ) : events.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  No enterprise events yet.{" "}
                  <Link to="/enterprise/create" className="font-semibold text-primary underline">
                    Create your first one
                  </Link>
                  .
                </p>
              ) : (
                <div className="divide-y rounded-md border border-border">
                  {events.map((e) => {
                    const meta = statusMeta(e.status);
                    return (
                      <div key={e.id} className="flex flex-wrap items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {eventTypeLabel(e.enterprise_event_type)} · {e.date || "No date"} ·{" "}
                            {e.players} players · {e.scores} scores posted
                          </p>
                        </div>
                        <Badge className={meta.className}>{meta.label}</Badge>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/dashboard?tournament_id=${e.id}`}>Main dashboard</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/dashboard/scoring?tournament_id=${e.id}`}>Scores</Link>
                        </Button>
                        {e.slug && (
                          <Button asChild size="sm" variant="ghost">
                            <a href={`/t/${e.slug}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { to: "/dashboard/organization", icon: Building2, title: "Organization details", body: "Name, logo, address and nonprofit receipts." },
              { to: "/dashboard/payout-settings", icon: CreditCard, title: "Payments & payouts", body: "Connect your account so paid events can collect money." },
              { to: "/dashboard/site-builder", icon: Globe, title: "Web address & branding", body: "Public page look, colors and custom domain." },
              { to: "/enterprise/roster", icon: Users, title: "Club roster", body: "Reusable member list with handicaps and contacts." },
            ].map((c) => (
              <Card key={c.to}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <c.icon className="h-4 w-4 text-primary" /> {c.title}
                  </CardTitle>
                  <CardDescription>{c.body}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link to={c.to}>Open</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </EnterpriseLayout>
  );
}
