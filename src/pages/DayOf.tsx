import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sanitizeHtml } from "@/components/ui/rich-text-editor";
import { Trophy, MapPin, Megaphone, Users, Clock, Eye } from "lucide-react";

interface Reg {
  id: string;
  first_name: string;
  last_name: string;
  group_number: number | null;
  group_position: number | null;
  scoring_code: string | null;
  tee_time?: string | null;
  hole_assignment?: number | null;
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
  primary_color?: string | null;
  logo_url?: string | null;
}

interface Sponsor {
  id: string; name: string; tier: string | null; logo_url: string | null; website_url: string | null;
}

export default function DayOf() {
  const { slug, code } = useParams<{ slug: string; code: string }>();
  const [search] = useSearchParams();
  const isOrganizerPreview = search.get("preview") === "1";

  const [tournament, setTournament] = useState<T | null>(null);
  const [reg, setReg] = useState<Reg | null>(null);
  const [group, setGroup] = useState<Reg[]>([]);
  const [leaders, setLeaders] = useState<Array<{ name: string; total: number }>>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: t } = await supabase
        .from("tournaments")
        .select("id, slug, title, date, course_name, day_of_page_enabled, day_of_page_mode, day_of_welcome_message, day_of_announcements, day_of_course_map_url, primary_color, logo_url")
        .eq("slug", slug!)
        .maybeSingle();
      if (!t) { setError("Tournament not found"); setLoading(false); return; }
      const tt = t as any as T;

      // Access gating
      if (!tt.day_of_page_enabled && !isOrganizerPreview) {
        setError("Day of event page is not enabled yet.");
        setLoading(false);
        return;
      }
      if (tt.day_of_page_mode === "preview" && !isOrganizerPreview) {
        setError("This page is in preview mode. Players will see it once the organizer switches to Live.");
        setLoading(false);
        return;
      }
      setTournament(tt);

      // Sponsors (always shown)
      const { data: sp } = await supabase
        .from("tournament_sponsors")
        .select("id, name, tier, logo_url, website_url")
        .eq("tournament_id", tt.id)
        .order("sort_order");
      setSponsors((sp as any) || []);

      // Organizer preview without a real code — show a friendly placeholder
      if (isOrganizerPreview && (!code || code === "PREVIEW")) {
        setReg({
          id: "preview",
          first_name: "Your Player",
          last_name: "",
          group_number: 1,
          group_position: 1,
          scoring_code: "PREVIEW",
          tee_time: "9:00 AM",
          hole_assignment: 1,
        });
        setGroup([]);
        setLeaders([]);
        setLoading(false);
        return;
      }

      if (!code) { setError("Missing player code. Please scan your QR code or use the link from your confirmation."); setLoading(false); return; }
      const { data: r } = await supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, group_number, group_position, scoring_code, tee_time, hole_assignment")
        .eq("tournament_id", tt.id)
        .eq("scoring_code", code.toUpperCase())
        .maybeSingle();
      if (!r) { setError("Player not found. Please check your code."); setLoading(false); return; }
      const rr = r as any as Reg;
      setReg(rr);

      // Group members
      if (rr.group_number != null) {
        const { data: g } = await supabase
          .from("tournament_registrations")
          .select("id, first_name, last_name, group_number, group_position, scoring_code, tee_time, hole_assignment")
          .eq("tournament_id", tt.id)
          .eq("group_number", rr.group_number)
          .order("group_position");
        setGroup(((g as any) || []) as Reg[]);
      }

      // Live mini-leaderboard
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
      setLoading(false);
    })();
  }, [slug, code, isOrganizerPreview]);

  if (loading) return <div className="p-8 text-center">Loading…</div>;
  if (error) return (
    <div className="p-8 text-center space-y-3">
      <p className="text-destructive">{error}</p>
      <Link to={`/t/${slug}`}><Button variant="outline">Back to tournament</Button></Link>
    </div>
  );
  if (!tournament || !reg) return null;

  const primary = tournament.primary_color || "hsl(var(--primary))";
  const headerStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${primary} 0%, ${primary} 60%, hsl(var(--primary)) 100%)`,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background pb-10">
      <header className="text-primary-foreground p-5 shadow" style={headerStyle}>
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {tournament.logo_url && (
              <img src={tournament.logo_url} alt="" className="w-12 h-12 rounded bg-white/10 object-contain p-1" />
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{tournament.title}</h1>
              <p className="text-sm opacity-90">
                {tournament.course_name}{tournament.date && ` · ${new Date(tournament.date).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          {isOrganizerPreview && <Badge variant="secondary" className="gap-1"><Eye className="w-3 h-3" /> Preview</Badge>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4 -mt-2">
        {/* Player card */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Welcome, {reg.first_name}!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tournament.day_of_welcome_message && (
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(tournament.day_of_welcome_message) }} />
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Group" value={reg.group_number ?? "—"} />
              <Stat label="Position" value={reg.group_position ?? "—"} />
              <Stat label="Tee Time" value={reg.tee_time || "—"} icon={<Clock className="w-4 h-4" />} />
              <Stat label="Hole" value={reg.hole_assignment ?? "—"} />
            </div>
            {reg.scoring_code && (
              <div className="rounded-md bg-muted px-3 py-2">
                <p className="text-xs uppercase text-muted-foreground">Your scoring code</p>
                <p className="text-lg font-mono font-semibold">{reg.scoring_code}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {group.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Your Group</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {group.map((p) => (
                  <li key={p.id} className="py-2 flex justify-between text-sm">
                    <span className={p.id === reg.id ? "font-semibold" : ""}>
                      {p.group_position ?? "—"}. {p.first_name} {p.last_name}
                      {p.id === reg.id && <span className="text-muted-foreground"> (you)</span>}
                    </span>
                    <span className="text-muted-foreground">{p.tee_time || ""}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {tournament.day_of_announcements && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-4 h-4" /> Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(tournament.day_of_announcements) }} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4" /> Live Leaderboard</CardTitle>
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

        {tournament.day_of_course_map_url && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> Course Map</CardTitle>
            </CardHeader>
            <CardContent>
              <img src={tournament.day_of_course_map_url} alt="Course map" className="w-full rounded border" />
            </CardContent>
          </Card>
        )}

        {sponsors.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Thank you to our sponsors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {sponsors.map((s) => {
                  const inner = s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="max-h-16 mx-auto object-contain" />
                  ) : (
                    <span className="text-sm font-medium">{s.name}</span>
                  );
                  return (
                    <div key={s.id} className="border rounded-lg p-3 bg-card flex items-center justify-center min-h-[80px]">
                      {s.website_url ? <a href={s.website_url} target="_blank" rel="noreferrer">{inner}</a> : inner}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link to={`/t/${tournament.slug}/scoring`}><Button className="w-full">Enter Scores</Button></Link>
          <Link to={`/t/${tournament.slug}`}><Button variant="outline" className="w-full">Tournament Site</Button></Link>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="bg-muted rounded-md p-3">
      <p className="text-xs uppercase text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
    </div>
  );
}
