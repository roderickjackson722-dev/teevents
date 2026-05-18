import { Component, ReactNode, useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sanitizeHtml } from "@/components/ui/rich-text-editor";
import { Trophy, MapPin, Megaphone, Users, Clock, Eye, Phone, Mail, FileText, ListOrdered, AlertCircle } from "lucide-react";

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
  day_of_sponsor_title: string | null;
  day_of_sponsor_thanks: string | null;
  day_of_pairings_url: string | null;
  day_of_rules_url: string | null;
  day_of_director_name: string | null;
  day_of_director_phone: string | null;
  day_of_director_email: string | null;
  day_of_emergency_contact: string | null;
  primary_color?: string | null;
  logo_url?: string | null;
}

interface Sponsor {
  id: string; name: string; tier: string | null; logo_url: string | null; website_url: string | null;
}

const tierOrder: Record<string, number> = { title: 0, platinum: 1, gold: 2, silver: 3, bronze: 4, hole: 5, inkind: 6 };

const MOCK_TOURNAMENT: T = {
  id: "preview",
  slug: "preview",
  title: "Your Tournament Name",
  date: new Date().toISOString().slice(0, 10),
  course_name: "Your Golf Course",
  day_of_page_enabled: true,
  day_of_page_mode: "preview",
  day_of_welcome_message: "<p>Welcome to the tournament! We're thrilled to have you here. Check in at the registration tent for your gift bag and cart assignment.</p>",
  day_of_announcements: "<ul><li>Lunch served at 12:00 PM in the clubhouse</li><li>Beverage carts on holes 5, 12, and 17</li><li>Scoring tent closes at 4:00 PM</li></ul>",
  day_of_course_map_url: null,
  day_of_sponsor_title: "Our Generous Sponsors",
  day_of_sponsor_thanks: "Thank you to our sponsors for making this event possible!",
  day_of_pairings_url: null,
  day_of_rules_url: null,
  day_of_director_name: "Jane Director",
  day_of_director_phone: "(555) 123-4567",
  day_of_director_email: "director@example.com",
  day_of_emergency_contact: "Pro Shop: (555) 987-6543",
  primary_color: null,
  logo_url: null,
};

const MOCK_REG: Reg = {
  id: "preview",
  first_name: "Sample",
  last_name: "Player",
  group_number: 1,
  group_position: 1,
  scoring_code: "PREVIEW",
  tee_time: "8:30 AM",
  hole_assignment: 1,
};

const MOCK_GROUP: Reg[] = [
  { ...MOCK_REG },
  { id: "p2", first_name: "John", last_name: "Smith", group_number: 1, group_position: 2, scoring_code: null, tee_time: "8:30 AM", hole_assignment: 1 },
  { id: "p3", first_name: "Jane", last_name: "Doe", group_number: 1, group_position: 3, scoring_code: null, tee_time: "8:30 AM", hole_assignment: 1 },
  { id: "p4", first_name: "Bob", last_name: "Johnson", group_number: 1, group_position: 4, scoring_code: null, tee_time: "8:30 AM", hole_assignment: 1 },
];

class ErrorBoundary extends Component<{ children: ReactNode; slug?: string }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div className="p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <p className="font-semibold">Something went wrong loading the day-of page.</p>
          <p className="text-sm text-muted-foreground">{this.state.err.message}</p>
          {this.props.slug && <Link to={`/t/${this.props.slug}`}><Button variant="outline">Back to tournament</Button></Link>}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DayOfWrapper() {
  const { slug } = useParams<{ slug: string }>();
  return <ErrorBoundary slug={slug}><DayOfInner /></ErrorBoundary>;
}

function DayOfInner() {
  const { slug, code } = useParams<{ slug: string; code: string }>();
  const [search] = useSearchParams();
  const isOrganizerPreview = search.get("preview") === "1";
  const isPreviewCode = !code || code.toUpperCase() === "PREVIEW";

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
      setError(null);

      // Try to load real tournament
      const { data: t } = await supabase
        .from("tournaments")
        .select("id, slug, title, date, course_name, day_of_page_enabled, day_of_page_mode, day_of_welcome_message, day_of_announcements, day_of_course_map_url, day_of_sponsor_title, day_of_sponsor_thanks, day_of_pairings_url, day_of_rules_url, day_of_director_name, day_of_director_phone, day_of_director_email, day_of_emergency_contact, primary_color, logo_url")
        .eq("slug", slug!)
        .maybeSingle();

      // Preview with no tournament -> use full mock data
      if (!t && isOrganizerPreview) {
        setTournament({ ...MOCK_TOURNAMENT, slug: slug || "preview" });
        setReg(MOCK_REG);
        setGroup(MOCK_GROUP);
        setLeaders([
          { name: "Mike Wilson", total: -4 },
          { name: "Sarah Lee", total: -2 },
          { name: "Sample Player", total: 0 },
          { name: "John Smith", total: 2 },
          { name: "Jane Doe", total: 3 },
        ]);
        setSponsors([]);
        setLoading(false);
        return;
      }

      if (!t) { setError("Tournament not found"); setLoading(false); return; }
      const tt = t as any as T;

      // Access gating (preview bypasses)
      if (!isOrganizerPreview && !tt.day_of_page_enabled) {
        setError("Day of event page is not enabled yet.");
        setLoading(false);
        return;
      }
      if (!isOrganizerPreview && tt.day_of_page_mode === "preview") {
        setError("This page is in preview mode. Players will see it once the organizer switches to Live.");
        setLoading(false);
        return;
      }
      setTournament(tt);

      // Sponsors
      const { data: sp } = await supabase
        .from("tournament_sponsors")
        .select("id, name, tier, logo_url, website_url")
        .eq("tournament_id", tt.id)
        .order("sort_order");
      setSponsors((sp as any) || []);

      // Preview with placeholder code -> use mock player but real tournament
      if (isOrganizerPreview && isPreviewCode) {
        setReg(MOCK_REG);
        setGroup(MOCK_GROUP);
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

      if (rr.group_number != null) {
        const { data: g } = await supabase
          .from("tournament_registrations")
          .select("id, first_name, last_name, group_number, group_position, scoring_code, tee_time, hole_assignment")
          .eq("tournament_id", tt.id)
          .eq("group_number", rr.group_number)
          .order("group_position");
        setGroup(((g as any) || []) as Reg[]);
      }

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
  }, [slug, code, isOrganizerPreview, isPreviewCode]);

  if (loading) return <div className="p-8 text-center">Loading…</div>;
  if (error) return (
    <div className="p-8 text-center space-y-3 max-w-md mx-auto">
      <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
      <p className="text-destructive font-medium">{error}</p>
      {slug && <Link to={`/t/${slug}`}><Button variant="outline">Back to tournament</Button></Link>}
    </div>
  );
  if (!tournament || !reg) return null;

  const primary = tournament.primary_color || "hsl(var(--primary))";
  const headerStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${primary} 0%, ${primary} 60%, hsl(var(--primary)) 100%)`,
  };

  const sortedSponsors = [...sponsors].sort((a, b) => (tierOrder[a.tier || ""] ?? 99) - (tierOrder[b.tier || ""] ?? 99));
  const titleSponsors = sortedSponsors.filter((s) => s.tier === "title" || s.tier === "platinum");
  const otherSponsors = sortedSponsors.filter((s) => !["title", "platinum"].includes(s.tier || ""));

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
        {/* Title sponsors banner */}
        {titleSponsors.length > 0 && (
          <div className="bg-card border-2 border-primary/30 rounded-lg p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-center text-muted-foreground mb-2">Presented by</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {titleSponsors.map((s) => (
                <a key={s.id} href={s.website_url || "#"} target="_blank" rel="noreferrer" className={s.website_url ? "" : "pointer-events-none"}>
                  {s.logo_url ? <img src={s.logo_url} alt={s.name} className="max-h-16 object-contain" /> : <span className="font-bold">{s.name}</span>}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Welcome + quick stats */}
        <Card className="shadow-md overflow-hidden">
          <CardHeader className="pb-3" style={{ background: `linear-gradient(90deg, ${primary}15, transparent)` }}>
            <CardTitle className="text-2xl">Welcome, {reg.first_name}! 👋</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {tournament.day_of_welcome_message && (
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(tournament.day_of_welcome_message) }} />
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Tee Time" value={reg.tee_time || "—"} icon={<Clock className="w-4 h-4" />} />
              <Stat label="Hole" value={reg.hole_assignment ?? "—"} icon={<MapPin className="w-4 h-4" />} />
              <Stat label="Group" value={reg.group_number ?? "—"} icon={<Users className="w-4 h-4" />} />
              <Stat label="Position" value={reg.group_position ?? "—"} />
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
          <Card className="border-secondary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-4 h-4 text-secondary" /> Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(tournament.day_of_announcements) }} />
            </CardContent>
          </Card>
        )}

        {/* Sponsor spotlight */}
        {sortedSponsors.length > 0 && (
          <Card className="border-primary/30 bg-gradient-to-br from-card to-muted/30">
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-lg">{tournament.day_of_sponsor_title || "Our Generous Sponsors"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(otherSponsors.length ? otherSponsors : sortedSponsors).map((s) => {
                  const inner = s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="max-h-16 mx-auto object-contain" />
                  ) : (
                    <span className="text-sm font-medium">{s.name}</span>
                  );
                  return (
                    <div key={s.id} className="border rounded-lg p-3 bg-card flex items-center justify-center min-h-[80px] hover:shadow-md transition-shadow">
                      {s.website_url ? <a href={s.website_url} target="_blank" rel="noreferrer">{inner}</a> : inner}
                    </div>
                  );
                })}
              </div>
              {tournament.day_of_sponsor_thanks && (
                <p className="text-center text-sm italic text-muted-foreground">"{tournament.day_of_sponsor_thanks}"</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Live leaderboard */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-secondary" /> Live Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {leaders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scores posted yet — check back during play.</p>
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
                <Button variant="outline" size="sm">View Full Leaderboard →</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickLink
            href={tournament.day_of_course_map_url || undefined}
            icon={<MapPin className="w-5 h-5" />}
            title="Course Map"
            disabled={!tournament.day_of_course_map_url}
          />
          <QuickLink
            href={tournament.day_of_pairings_url || `/t/${tournament.slug}`}
            icon={<ListOrdered className="w-5 h-5" />}
            title="Pairings"
          />
          <QuickLink
            href={tournament.day_of_rules_url || undefined}
            icon={<FileText className="w-5 h-5" />}
            title="Rules & Scoring"
            disabled={!tournament.day_of_rules_url}
          />
        </div>

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

        {/* Contact */}
        {(tournament.day_of_director_name || tournament.day_of_director_phone || tournament.day_of_director_email || tournament.day_of_emergency_contact) && (
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {tournament.day_of_director_name && (
                <div><span className="font-semibold">Tournament Director:</span> {tournament.day_of_director_name}</div>
              )}
              <div className="flex flex-wrap gap-4">
                {tournament.day_of_director_phone && (
                  <a href={`tel:${tournament.day_of_director_phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                    <Phone className="w-4 h-4" /> {tournament.day_of_director_phone}
                  </a>
                )}
                {tournament.day_of_director_email && (
                  <a href={`mailto:${tournament.day_of_director_email}`} className="flex items-center gap-1.5 text-primary hover:underline">
                    <Mail className="w-4 h-4" /> {tournament.day_of_director_email}
                  </a>
                )}
              </div>
              {tournament.day_of_emergency_contact && (
                <div className="pt-2 border-t mt-2">
                  <span className="font-semibold text-destructive">Emergency:</span> {tournament.day_of_emergency_contact}
                </div>
              )}
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

function QuickLink({ href, icon, title, disabled }: { href?: string; icon: ReactNode; title: string; disabled?: boolean }) {
  const inner = (
    <Card className={`hover:shadow-md transition-shadow ${disabled ? "opacity-50" : ""}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="text-primary">{icon}</div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{title}</p>
          {disabled && <p className="text-xs text-muted-foreground">Not set</p>}
        </div>
        {!disabled && <span className="text-primary">→</span>}
      </CardContent>
    </Card>
  );
  if (disabled || !href) return inner;
  if (href.startsWith("http")) return <a href={href} target="_blank" rel="noreferrer">{inner}</a>;
  return <Link to={href}>{inner}</Link>;
}
