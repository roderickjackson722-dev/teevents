import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

export default function DemoDashboardPreview() {
  const { token } = useParams();
  const [demo, setDemo] = useState<any>(null);
  const [counts, setCounts] = useState({ players: 0, sponsors: 0, scores: 0 });

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data: d } = await supabase.from("demo_tournaments").select("*").eq("public_token", token).maybeSingle();
      if (!d) return;
      setDemo(d);
      const [{ count: pc }, { count: sc }, { count: scc }] = await Promise.all([
        supabase.from("demo_players").select("id", { count: "exact", head: true }).eq("demo_tournament_id", d.id),
        supabase.from("demo_sponsors").select("*", { count: "exact", head: true }).eq("demo_tournament_id", d.id),
        supabase.from("demo_scores").select("*", { count: "exact", head: true }).eq("demo_tournament_id", d.id),
      ]);
      setCounts({ players: pc || 0, sponsors: sc || 0, scores: scc || 0 });
    })();
  }, [token]);

  if (!demo) return <div className="p-8">Loading…</div>;
  const revenue = (demo.registration_fee_cents * counts.players) / 100;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${demo.tournament_name} Dashboard (Demo)`} description="Demo" noIndex />
      <div className="border-b border-border bg-card p-4">
        <Badge className="bg-[#F5A623] text-[#1a5c38] mb-2">DEMO DASHBOARD — read only preview</Badge>
        <h1 className="text-2xl font-bold">{demo.tournament_name}</h1>
        <p className="text-sm text-muted-foreground">{demo.course_name} • {demo.event_date}</p>
      </div>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Players</div><div className="text-2xl font-bold">{counts.players}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Sponsors</div><div className="text-2xl font-bold">{counts.sponsors}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Score Entries</div><div className="text-2xl font-bold">{counts.scores}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Projected Revenue</div><div className="text-2xl font-bold">${revenue.toFixed(0)}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>What you'd see here</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>This is a read-only preview of the organizer dashboard. In your real tournament you'll get the full TeeVents dashboard with:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Live registration list with check-in</li>
              <li>Sponsorship tier manager + invoicing</li>
              <li>Live leaderboard & scoring</li>
              <li>Day-of player communications</li>
              <li>Stripe payouts & accounting</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
