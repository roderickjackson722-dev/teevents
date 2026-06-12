import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

interface Demo {
  id: string;
  tournament_name: string;
  event_date: string | null;
  location: string | null;
  course_name: string | null;
  registration_fee_cents: number;
  scoring_format: string;
  public_token: string;
}
interface Sponsor { id: string; name: string; level: string | null; logo_url: string | null; website_url: string | null }
interface Player { id: string; name: string; handicap: number | null; group_name: string | null }

export default function DemoTournamentSite() {
  const { token } = useParams();
  const [demo, setDemo] = useState<Demo | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data: d } = await supabase.from("demo_tournaments").select("*").eq("public_token", token).maybeSingle();
      if (d) {
        setDemo(d as Demo);
        const [{ data: sp }, { data: pl }] = await Promise.all([
          supabase.from("demo_sponsors").select("*").eq("demo_tournament_id", (d as Demo).id),
          supabase.from("demo_players").select("*").eq("demo_tournament_id", (d as Demo).id),
        ]);
        setSponsors((sp as Sponsor[]) || []);
        setPlayers((pl as Player[]) || []);
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="p-8">Loading…</div>;
  if (!demo) return <div className="p-8">Demo not found.</div>;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${demo.tournament_name} (Demo)`} description="TeeVents demo tournament site" noIndex />
      <div className="bg-[#1a5c38] text-white py-12 px-4 text-center">
        <Badge className="bg-[#F5A623] text-[#1a5c38] mb-3">DEMO</Badge>
        <h1 className="text-4xl font-bold">{demo.tournament_name}</h1>
        <p className="mt-2 opacity-90">{demo.event_date} • {demo.location}</p>
        <p className="opacity-80">{demo.course_name}</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Format</div><div className="text-lg font-semibold">{demo.scoring_format}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Entry Fee</div><div className="text-lg font-semibold">${(demo.registration_fee_cents/100).toFixed(0)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Players Registered</div><div className="text-lg font-semibold">{players.length}</div></CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link to={`/demo/${token}/dashboard`} className="px-3 py-2 rounded bg-card border border-border hover:bg-muted">Organizer Dashboard</Link>
          <Link to={`/demo/${token}/live`} className="px-3 py-2 rounded bg-card border border-border hover:bg-muted">Live Leaderboard</Link>
          <Link to={`/demo/${token}/day-of`} className="px-3 py-2 rounded bg-card border border-border hover:bg-muted">Day-of Page</Link>
        </div>

        <Card>
          <CardHeader><CardTitle>Sponsors</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sponsors.map((s) => (
                <div key={s.id} className="text-center">
                  {s.logo_url && <img src={s.logo_url} alt={s.name} className="w-full h-auto rounded" />}
                  <div className="text-sm font-medium mt-2">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.level}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Registered Players ({players.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {players.map((p) => (
                <div key={p.id} className="flex justify-between border-b border-border py-1">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">HCP {p.handicap}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
