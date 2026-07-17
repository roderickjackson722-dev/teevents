import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trophy, Calendar, MapPin, KeyRound } from "lucide-react";
import SEO from "@/components/SEO";

export default function PublicLeague() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [league, setLeague] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: lg } = await (supabase as any)
        .from("golf_leagues")
        .select("*")
        .eq("league_slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      if (!lg) { setLoading(false); return; }
      setLeague(lg);
      const [{ data: ev }, { data: st }] = await Promise.all([
        (supabase as any).from("league_events").select("*").eq("league_id", lg.id).order("event_date"),
        (supabase as any).from("league_standings").select("*, league_members!inner(member_name)").eq("league_id", lg.id).order("points", { ascending: false }).limit(25),
      ]);
      setEvents(ev || []);
      setStandings(st || []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!league) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-3">League not found or not public.</p>
        <Button asChild variant="link"><Link to="/">Home</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${league.league_name} — Golf League`} description={league.description || `${league.league_name} standings, events, and results.`} />
      {league.banner_url && <img src={league.banner_url} alt="" className="w-full h-48 md:h-64 object-cover" />}
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {league.logo_url && <img src={league.logo_url} alt="" className="h-16 w-16 rounded-lg object-cover" />}
            <div>
              <h1 className="text-3xl font-bold">{league.league_name}</h1>
              {league.season_year && <p className="text-muted-foreground">Season {league.season_year}</p>}
            </div>
          </div>
          <Button onClick={() => navigate(`/league/${slug}/score`)} className="gap-2">
            <KeyRound className="h-4 w-4" /> Member Login
          </Button>
        </div>

        {league.description && (
          <Card><CardContent className="pt-6"><p className="whitespace-pre-wrap">{league.description}</p></CardContent></Card>
        )}

        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Calendar className="h-5 w-5" /> Schedule</h2>
            {events.length === 0 ? <p className="text-muted-foreground text-sm">No events scheduled.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.event_date}</TableCell>
                      <TableCell className="font-medium">{e.event_name}</TableCell>
                      <TableCell>{e.course_name || "—"}</TableCell>
                      <TableCell className="capitalize">{String(e.format_type || "").replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={e.is_completed ? "secondary" : "default"}>{e.is_completed ? "Completed" : "Upcoming"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Trophy className="h-5 w-5" /> Standings</h2>
            {standings.length === 0 ? <p className="text-muted-foreground text-sm">Standings will appear once results are posted.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Matches</TableHead>
                    <TableHead className="text-right">W-L-T</TableHead>
                    <TableHead className="text-right font-bold">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-bold">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.league_members.member_name}</TableCell>
                      <TableCell className="text-right">{s.matches_played}</TableCell>
                      <TableCell className="text-right">{s.wins}-{s.losses}-{s.ties}</TableCell>
                      <TableCell className="text-right font-bold">{s.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
