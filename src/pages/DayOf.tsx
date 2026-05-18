import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Reg {
  id: string;
  first_name: string;
  last_name: string;
  group_number: number | null;
  group_position: number | null;
  scoring_code: string | null;
}

interface T {
  id: string;
  slug: string;
  title: string;
  date: string | null;
  course_name: string | null;
  day_of_page_enabled: boolean;
  day_of_page_mode: string;
  day_of_welcome_message: string | null;
  day_of_announcements: string | null;
  day_of_course_map_url: string | null;
}

const mockReg: Reg = {
  id: "preview",
  first_name: "Demo",
  last_name: "Player",
  group_number: 5,
  group_position: 2,
  scoring_code: "DEMO12",
};

export default function DayOf() {
  const { slug, code } = useParams<{ slug: string; code: string }>();
  const [tournament, setTournament] = useState<T | null>(null);
  const [reg, setReg] = useState<Reg | null>(null);
  const [leaders, setLeaders] = useState<Array<{ name: string; total: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: t } = await supabase
        .from("tournaments")
        .select("id, slug, title, date, course_name, day_of_page_enabled, day_of_page_mode, day_of_welcome_message, day_of_announcements, day_of_course_map_url")
        .eq("slug", slug!)
        .maybeSingle();
      if (!t) { setError("Tournament not found"); setLoading(false); return; }
      const tt = t as any as T;
      if (!tt.day_of_page_enabled) { setError("Day-of page is not enabled for this tournament."); setLoading(false); return; }
      setTournament(tt);

      const isPreview = tt.day_of_page_mode === "preview";
      if (isPreview) {
        setReg(mockReg);
        setLeaders([
          { name: "John Smith", total: -6 },
          { name: "Maria Garcia", total: -4 },
          { name: "Demo Player", total: -2 },
          { name: "Alex Lee", total: 1 },
          { name: "Pat Chen", total: 3 },
        ]);
      } else {
        if (!code) { setError("Missing player code"); setLoading(false); return; }
        const { data: r } = await supabase
          .from("tournament_registrations")
          .select("id, first_name, last_name, group_number, group_position, scoring_code")
          .eq("tournament_id", tt.id)
          .eq("scoring_code", code.toUpperCase())
          .maybeSingle();
        if (!r) { setError("Player not found. Check your code."); setLoading(false); return; }
        setReg(r as any);
        const { data: scores } = await supabase
          .from("tournament_scores")
          .select("registration_id, strokes, tournament_registrations(first_name, last_name)")
          .eq("tournament_id", tt.id);
        if (scores) {
          const map: Record<string, { name: string; total: number }> = {};
          for (const s of scores as any[]) {
            const k = s.registration_id;
            const nm = s.tournament_registrations ? `${s.tournament_registrations.first_name} ${s.tournament_registrations.last_name}` : "Player";
            map[k] = map[k] || { name: nm, total: 0 };
            map[k].total += s.strokes || 0;
          }
          setLeaders(Object.values(map).sort((a, b) => a.total - b.total).slice(0, 10));
        }
      }
      setLoading(false);
    })();
  }, [slug, code]);

  if (loading) return <div className="p-8 text-center">Loading…</div>;
  if (error) return (
    <div className="p-8 text-center space-y-3">
      <p className="text-destructive">{error}</p>
      <Link to={`/t/${slug}`}><Button variant="outline">Back to tournament</Button></Link>
    </div>
  );
  if (!tournament || !reg) return null;

  const isPreview = tournament.day_of_page_mode === "preview";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-primary text-primary-foreground p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{tournament.title}</h1>
            <p className="text-sm opacity-90">{tournament.course_name} {tournament.date && `· ${tournament.date}`}</p>
          </div>
          {isPreview && <Badge variant="secondary">Preview Mode</Badge>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {reg.first_name}!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tournament.day_of_welcome_message && <p>{tournament.day_of_welcome_message}</p>}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-muted rounded p-3">
                <p className="text-xs uppercase text-muted-foreground">Group</p>
                <p className="text-2xl font-bold">{reg.group_number ?? "—"}</p>
              </div>
              <div className="bg-muted rounded p-3">
                <p className="text-xs uppercase text-muted-foreground">Position</p>
                <p className="text-2xl font-bold">{reg.group_position ?? "—"}</p>
              </div>
            </div>
            {reg.scoring_code && (
              <div className="pt-2">
                <p className="text-xs uppercase text-muted-foreground">Your scoring code</p>
                <p className="text-lg font-mono">{reg.scoring_code}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {tournament.day_of_announcements && (
          <Card>
            <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap">{tournament.day_of_announcements}</p></CardContent>
          </Card>
        )}

        {tournament.day_of_course_map_url && (
          <Card>
            <CardHeader><CardTitle>Course Map</CardTitle></CardHeader>
            <CardContent>
              <img src={tournament.day_of_course_map_url} alt="Course map" className="w-full rounded" />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Live Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {leaders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scores posted yet.</p>
            ) : (
              <ol className="space-y-1">
                {leaders.map((l, i) => (
                  <li key={i} className="flex justify-between text-sm py-1 border-b last:border-b-0">
                    <span><span className="font-semibold mr-2">{i + 1}.</span>{l.name}</span>
                    <span className="font-mono">{l.total > 0 ? `+${l.total}` : l.total}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="pt-3">
              <Link to={`/live/${tournament.slug}`}>
                <Button variant="outline" size="sm">Full leaderboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Link to={`/t/${tournament.slug}/scoring`}><Button className="w-full">Enter Scores</Button></Link>
          <Link to={`/t/${tournament.slug}`}><Button variant="outline" className="w-full">Tournament Site</Button></Link>
        </div>
      </main>
    </div>
  );
}
