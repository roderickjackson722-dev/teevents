import { Component, ReactNode, useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sanitizeHtml } from "@/components/ui/rich-text-editor";
import { Trophy, MapPin, Megaphone, Users, Clock, Eye, Phone, Mail, FileText, ListOrdered, AlertCircle, PenLine, BarChart3, Download } from "lucide-react";
import WeatherWidget from "@/components/day-of/WeatherWidget";
import { TeeventsFooter } from "@/components/TeeventsFooter";
import { isBrandingRemoved } from "@/components/BrandingTagline";

interface Reg {
  id: string;
  first_name: string;
  last_name: string;
  group_number: number | null;
  group_position: number | null;
  scoring_code: string | null;
  group_scoring_code?: string | null;
  tee_time?: string | null;
  hole_assignment?: number | null;
}

interface T {
  id: string;
  slug: string;
  title: string;
  date: string | null;
  course_name: string | null;
  
  state?: string | null;
  location?: string | null;
  day_of_page_enabled: boolean;
  day_of_page_mode: string;
  day_of_show_welcome: boolean;
  day_of_welcome_title: string | null;
  day_of_welcome_message: string | null;
  day_of_announcements: string | null;
  day_of_announcements_list: string[];
  day_of_course_map_url: string | null;
  day_of_sponsor_title: string | null;
  day_of_sponsor_thanks: string | null;
  day_of_sponsor_layout: string;
  day_of_pairings_url: string | null;
  day_of_rules_url: string | null;
  day_of_director_name: string | null;
  day_of_director_phone: string | null;
  day_of_director_email: string | null;
  day_of_emergency_contact: string | null;
  day_of_bg_color: string | null;
  day_of_accent_color: string | null;
  day_of_font_color: string | null;
  day_of_header_image_url: string | null;
  day_of_weather_enabled: boolean;
  day_of_weather_location: string | null;
  day_of_show_scores_card: boolean;
  day_of_show_leaderboard_card: boolean;
  day_of_show_coursemap_card: boolean;
  day_of_show_announcements_card: boolean;
  day_of_show_sponsors: boolean;
  day_of_show_pin_sheets: boolean;
  day_of_pin_sheet_pdf_url: string | null;
  day_of_show_leaderboard: boolean;
  primary_color?: string | null;
  logo_url?: string | null;
}

interface Sponsor {
  id: string; name: string; tier: string | null; logo_url: string | null; website_url: string | null;
}

const FIELDS = "id, slug, title, date, course_name, location, state, day_of_page_enabled, day_of_page_mode, day_of_show_welcome, day_of_welcome_title, day_of_welcome_message, day_of_announcements, day_of_announcements_list, day_of_course_map_url, day_of_sponsor_title, day_of_sponsor_thanks, day_of_sponsor_layout, day_of_pairings_url, day_of_rules_url, day_of_director_name, day_of_director_phone, day_of_director_email, day_of_emergency_contact, day_of_bg_color, day_of_accent_color, day_of_font_color, day_of_header_image_url, day_of_weather_enabled, day_of_weather_location, day_of_show_scores_card, day_of_show_leaderboard_card, day_of_show_coursemap_card, day_of_show_announcements_card, day_of_show_sponsors, day_of_show_pin_sheets, day_of_pin_sheet_pdf_url, day_of_show_leaderboard, show_branding_badge, is_pro, show_branding_footer, branding_footer_admin_override, branding_footer_admin_show, branding_footer_custom_text, branding_removed, branding_removed_by_admin";

const tierOrder: Record<string, number> = { title: 0, platinum: 1, gold: 2, silver: 3, bronze: 4, hole: 5, inkind: 6 };

const MOCK_TOURNAMENT: T = {
  id: "preview",
  slug: "preview",
  title: "Your Tournament Name",
  date: new Date().toISOString().slice(0, 10),
  course_name: "Your Golf Course",
  location: "Pebble Beach", state: "CA",
  day_of_page_enabled: true,
  day_of_page_mode: "preview",
  day_of_show_welcome: true,
  day_of_welcome_title: "Welcome to [Tournament Name]!",
  day_of_welcome_message: "Welcome, [Player Name]! You are officially checked in and ready to play. We're thrilled to have you here.\n\nPlease review your tee time and starting hole below.\n\nBest of luck today!",
  day_of_announcements: null,
  day_of_announcements_list: [
    "Lunch served at 12:00 PM in the clubhouse",
    "Beverage carts on holes 5, 12, and 17",
    "Scoring tent closes at 4:00 PM",
  ],
  day_of_course_map_url: null,
  day_of_sponsor_title: "Our Generous Sponsors",
  day_of_sponsor_thanks: "Thank you to our sponsors for making this event possible!",
  day_of_sponsor_layout: "grid",
  day_of_pairings_url: null,
  day_of_rules_url: null,
  day_of_director_name: "Jane Director",
  day_of_director_phone: "(555) 123-4567",
  day_of_director_email: "director@example.com",
  day_of_emergency_contact: "Pro Shop: (555) 987-6543",
  day_of_bg_color: null,
  day_of_accent_color: null,
  day_of_font_color: null,
  day_of_header_image_url: null,
  day_of_weather_enabled: true,
  day_of_weather_location: "Pebble Beach, CA",
  day_of_show_scores_card: true,
  day_of_show_leaderboard_card: true,
  day_of_show_coursemap_card: true,
  day_of_show_announcements_card: true,
  day_of_show_sponsors: true,
  day_of_show_pin_sheets: true,
  day_of_pin_sheet_pdf_url: null,
  day_of_show_leaderboard: true,
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

function normalizeTournament(d: any): T {
  return {
    ...d,
    day_of_announcements_list: Array.isArray(d.day_of_announcements_list) ? d.day_of_announcements_list : [],
    day_of_show_welcome: d.day_of_show_welcome !== false,
    day_of_weather_enabled: d.day_of_weather_enabled !== false,
    day_of_show_scores_card: d.day_of_show_scores_card !== false,
    day_of_show_leaderboard_card: d.day_of_show_leaderboard_card !== false,
    day_of_show_coursemap_card: d.day_of_show_coursemap_card !== false,
    day_of_show_announcements_card: d.day_of_show_announcements_card !== false,
    day_of_show_sponsors: d.day_of_show_sponsors !== false,
    day_of_show_pin_sheets: d.day_of_show_pin_sheets !== false,
    day_of_show_leaderboard: d.day_of_show_leaderboard !== false,
    day_of_sponsor_layout: d.day_of_sponsor_layout || "grid",
  };
}

function DayOfInner() {
  const { slug, code } = useParams<{ slug: string; code: string }>();
  const [search] = useSearchParams();
  const isOrganizerPreview = search.get("preview") === "1";
  const isPreviewCode = !code || ["PREVIEW", "DEMO"].includes(code.toUpperCase());

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

      // Resolve tournament via deterministic public lookup (prefers exact slug match,
      // then custom_slug, then id) so /day-of/:slug never collides with another event.
      const isUuid = !!slug && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      let t: any = null;
      if (slug) {
        const { data: resolved } = await (supabase as any).rpc("resolve_public_tournament", { _slug: slug });
        const match = Array.isArray(resolved) ? resolved[0] : null;
        if (match?.id) {
          const { data } = await supabase.from("tournaments").select(FIELDS).eq("id", match.id).maybeSingle();
          t = data;
        } else if (isUuid) {
          const { data } = await supabase.from("tournaments").select(FIELDS).eq("id", slug).maybeSingle();
          t = data;
        } else {
          // Fallback for unpublished previews/organizer view
          const { data } = await supabase.from("tournaments").select(FIELDS).eq("slug", slug).maybeSingle();
          t = data;
        }
      }

      if (!t && (isOrganizerPreview || isPreviewCode)) {
        setTournament({ ...MOCK_TOURNAMENT, slug: slug || "preview" });
        setReg(MOCK_REG);
        setGroup(MOCK_GROUP);
        setLeaders([
          { name: "Mike Wilson", total: -4 },
          { name: "Sarah Lee", total: -2 },
          { name: "Sample Player", total: 0 },
          { name: "John Smith", total: 2 },
        ]);
        setSponsors([]);
        setLoading(false);
        return;
      }

      if (!t) { setError("Tournament not found"); setLoading(false); return; }
      const tt = normalizeTournament(t);

      if (!isOrganizerPreview && !isPreviewCode && !tt.day_of_page_enabled) {
        setError("Day of event page is not enabled yet.");
        setLoading(false);
        return;
      }
      if (!isOrganizerPreview && !isPreviewCode && tt.day_of_page_mode === "preview") {
        setError("This page is in preview mode. Players will see it once the organizer switches to Live.");
        setLoading(false);
        return;
      }
      setTournament(tt);

      const { data: sp } = await supabase
        .from("tournament_sponsors")
        .select("id, name, tier, logo_url, website_url")
        .eq("tournament_id", tt.id)
        .order("sort_order");
      setSponsors((sp as any) || []);

      // Generic public Day-of for walk-ups / no code: still show event info, announcements,
      // sponsors, contact, and (if available) the leaderboard. Skip player-specific welcome.
      if (!code) {
        setReg({
          id: "generic",
          first_name: "",
          last_name: "",
          group_number: null,
          group_position: null,
          scoring_code: null,
          group_scoring_code: null,
          tee_time: null,
          hole_assignment: null,
        });
        setGroup([]);
        const { data: leaderRows } = await (supabase as any).rpc(
          "get_public_leaderboard_scores",
          { _tournament_id: tt.id }
        );
        const totals = new Map<string, number>();
        ((leaderRows || []) as any[]).forEach((r) => {
          const reg = r.tournament_registrations;
          const name = `${reg?.first_name ?? r.first_name ?? ""} ${reg?.last_name ?? r.last_name ?? ""}`.trim();
          if (!name) return;
          totals.set(name, (totals.get(name) || 0) + (r.strokes || 0));
        });
        setLeaders(
          Array.from(totals.entries())
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => a.total - b.total)
            .slice(0, 10)
        );
        setLoading(false);
        return;
      }

      if (isPreviewCode) {
        setReg(MOCK_REG);
        setGroup(MOCK_GROUP);
        setLoading(false);
        return;
      }

      // Codes are 6 characters. Be forgiving about case, whitespace, and an
      // extra pasted/typed character at the end of the link.
      const raw = (code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      const candidates = Array.from(
        new Set([raw, raw.slice(0, 6), raw.slice(-6)].filter((c) => c.length === 6))
      );

      let payload: any = null;
      let effectiveCode = raw;
      for (const c of candidates) {
        const { data: rpcData } = await supabase.rpc("get_day_of_player", {
          _tournament_id: tt.id,
          _code: c,
        });
        if ((rpcData as any)?.player) { payload = rpcData as any; effectiveCode = c; break; }
      }
      if (!payload?.player) { setError("Player not found. Please check your code."); setLoading(false); return; }

      setReg(payload.player as Reg);
      setGroup((payload.group || []) as Reg[]);
      setLeaders((payload.leaders || []) as { name: string; total: number }[]);

      // Auto check-in: when a player opens their personal Day-of link
      // (e.g. from the roster QR scan), silently mark them as checked in.
      try {
        await (supabase as any).rpc("mark_day_of_check_in", {
          _tournament_id: tt.id,
          _code: effectiveCode,
        });
      } catch (_e) {
        // Non-blocking — Day-of page still renders even if check-in write fails.
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

  const bg = tournament.day_of_bg_color || tournament.primary_color || "#1a5c38";
  const accent = tournament.day_of_accent_color || "#F5A623";
  const fontColor = tournament.day_of_font_color || "#FFFFFF";

  const headerStyle: React.CSSProperties = tournament.day_of_header_image_url
    ? {
        backgroundImage: `linear-gradient(135deg, ${bg}cc, ${bg}99), url(${tournament.day_of_header_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: fontColor,
      }
    : {
        background: `linear-gradient(135deg, ${bg} 0%, ${bg} 60%, ${bg}dd 100%)`,
        color: fontColor,
      };

  const sortedSponsors = [...sponsors].sort((a, b) => (tierOrder[a.tier || ""] ?? 99) - (tierOrder[b.tier || ""] ?? 99));
  const titleSponsors = sortedSponsors.filter((s) => s.tier === "title" || s.tier === "platinum");
  const otherSponsors = sortedSponsors.filter((s) => !["title", "platinum"].includes(s.tier || ""));

  const weatherLoc = tournament.day_of_weather_location
    || [tournament.location, tournament.state].filter(Boolean).join(", ")
    || tournament.course_name
    || "";

  const announcementsList = tournament.day_of_announcements_list || [];
  const hasAnnouncements = announcementsList.length > 0 || !!tournament.day_of_announcements;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background pb-10 overflow-x-hidden">
      <header className="p-5 shadow" style={headerStyle}>
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {tournament.logo_url && (
              <img src={tournament.logo_url} alt="" className="w-12 h-12 rounded bg-white/10 object-contain p-1 shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{tournament.title}</h1>
              <p className="text-sm opacity-90 truncate">
                {tournament.course_name}{tournament.date && ` · ${new Date(tournament.date).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Weather widget removed per request */}
            {isOrganizerPreview && <Badge variant="secondary" className="gap-1"><Eye className="w-3 h-3" /> Preview</Badge>}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4 -mt-2">
        {titleSponsors.length > 0 && tournament.day_of_show_sponsors && (
          <div className="bg-card border-2 rounded-lg p-4 shadow-sm" style={{ borderColor: `${accent}55` }}>
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

        {/* Welcome */}
        {tournament.day_of_show_welcome && reg.id !== "generic" && (() => {
          const playerName = `${reg.first_name} ${reg.last_name}`.trim() || reg.first_name || "Player";
          const fallback = (tournament as any).day_of_placeholder_fallback || "TBD";

          const teeTime = reg.tee_time || fallback;
          const startingHole = reg.hole_assignment != null ? `#${reg.hole_assignment}` : fallback;
          const fill = (s: string) => s
            .split("[Tournament Name]").join(tournament.title || "")
            .split("[Player Name]").join(playerName)
            .split("[Tee Time]").join(teeTime)
            .split("[Starting Hole]").join(startingHole);
          const DEFAULT_TITLE = "Welcome to [Tournament Name]!";
          const DEFAULT_MSG = `Welcome, [Player Name]! You are officially checked in and ready to play. We're thrilled to have you here.\n\nPlease review your tee time and starting hole below. Use the buttons on this page to enter your scores, follow the live leaderboard, and view important announcements.\n\nIf you need anything, find a tournament staff member or use the contact information at the bottom of this page.\n\nBest of luck today!`;
          const rawTitle = (tournament.day_of_welcome_title && tournament.day_of_welcome_title.trim()) || DEFAULT_TITLE;
          const title = fill(rawTitle);
          const rawMsg = (tournament.day_of_welcome_message && tournament.day_of_welcome_message.trim()) || DEFAULT_MSG;
          const filledMsg = fill(rawMsg);
          const isHtml = /<[a-z][\s\S]*>/i.test(filledMsg);
          const html = isHtml ? filledMsg : filledMsg.replace(/\n/g, "<br/>");
          return (
            <Card className="shadow-md overflow-hidden">
              <CardHeader className="pb-3" style={{ background: `linear-gradient(90deg, ${bg}22, transparent)` }}>
                <CardTitle className="text-2xl">{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {filledMsg && (
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="Tee Time" value={reg.tee_time || fallback} icon={<Clock className="w-4 h-4" />} />
                  <Stat label="Hole" value={reg.hole_assignment ?? fallback} icon={<MapPin className="w-4 h-4" />} />
                  <Stat label="Group" value={reg.group_number ?? fallback} icon={<Users className="w-4 h-4" />} />
                  <Stat label="Position" value={reg.group_position ?? fallback} />
                </div>
                {reg.group_scoring_code && (
                  <div className="rounded-md border-2 border-secondary/40 bg-secondary/5 px-4 py-3">
                    <p className="text-xs uppercase text-muted-foreground font-semibold">Your group scoring code</p>
                    <p className="text-3xl font-mono font-bold tracking-widest text-foreground my-1">{reg.group_scoring_code}</p>
                    <a
                      href={`/score/${tournament.slug}/${reg.group_scoring_code}`}
                      className="text-sm underline text-primary"
                    >
                      Open scoring page →
                    </a>
                  </div>
                )}
                {!reg.group_scoring_code && reg.scoring_code && (
                  <div className="rounded-md bg-muted px-3 py-2">
                    <p className="text-xs uppercase text-muted-foreground">Your scoring code</p>
                    <p className="text-lg font-mono font-semibold">{reg.scoring_code}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}


        {/* Generic walk-up welcome */}
        {reg.id === "generic" && (
          <Card className="shadow-md overflow-hidden">
            <CardHeader className="pb-3" style={{ background: `linear-gradient(90deg, ${bg}22, transparent)` }}>
              <CardTitle className="text-2xl">Welcome to {tournament.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-sm">
              <p>You're at the day-of event page. Use the sections below for announcements, the live leaderboard, sponsors, and contact info.</p>
              <p className="text-muted-foreground">If a volunteer registered you on-site, you've been checked in already — no scoring code is needed.</p>
            </CardContent>
          </Card>
        )}

        {/* Scoring availability message for walk-ups / players without scoring access */}
        {tournament.day_of_show_scores_card && !reg.group_scoring_code && !reg.scoring_code && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm">
            <p className="font-semibold mb-1">Live scoring is not available for this round.</p>
            <p className="text-muted-foreground">Please submit your scorecard at the scoring tent.</p>
          </div>
        )}


        {/* Quick action cards (2x2 grid) */}
        <div className="grid grid-cols-2 gap-3">
          {tournament.day_of_show_scores_card && (reg.group_scoring_code || reg.scoring_code) && (
            <ActionCard to={reg.group_scoring_code ? `/score/${tournament.slug}/${reg.group_scoring_code}` : `/t/${tournament.slug}/scoring`} icon={<PenLine className="w-5 h-5" />} title="Enter Your Scores" cta="Enter Scores" accent={accent} />
          )}
          {tournament.day_of_show_leaderboard_card && (
            <ActionCard to={`/live/${tournament.slug}`} icon={<BarChart3 className="w-5 h-5" />} title="Live Leaderboard" cta="View Leaderboard" accent={accent} />
          )}
          {tournament.day_of_show_coursemap_card && (
            <ActionCard to="#course-map" icon={<MapPin className="w-5 h-5" />} title="Course Map" cta={tournament.day_of_course_map_url ? "View Course Map" : "Not available"} accent={accent} disabled={!tournament.day_of_course_map_url} />
          )}
          {tournament.day_of_show_announcements_card && (
            <ActionCard to="#announcements" icon={<Megaphone className="w-5 h-5" />} title="Announcements" cta={hasAnnouncements ? "View Messages" : "Nothing yet"} accent={accent} disabled={!hasAnnouncements} />
          )}
        </div>

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

        {tournament.day_of_show_announcements_card && hasAnnouncements && (
          <Card id="announcements" className="border-secondary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-4 h-4" style={{ color: accent }} /> Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {announcementsList.length > 0 && (
                <ul className="space-y-1.5">
                  {announcementsList.filter(Boolean).map((a, i) => (
                    <li key={i} className="text-sm flex gap-2"><span style={{ color: accent }}>•</span><span>{a}</span></li>
                  ))}
                </ul>
              )}
              {tournament.day_of_announcements && (
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(tournament.day_of_announcements) }} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Sponsor spotlight */}
        {tournament.day_of_show_sponsors && sortedSponsors.length > 0 && (
          <Card className="border-primary/30 bg-gradient-to-br from-card to-muted/30">
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-lg">{tournament.day_of_sponsor_title || "Our Generous Sponsors"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SponsorBlock layout={tournament.day_of_sponsor_layout} sponsors={otherSponsors.length ? otherSponsors : sortedSponsors} />
              {tournament.day_of_sponsor_thanks && (
                <p className="text-center text-sm italic text-muted-foreground">"{tournament.day_of_sponsor_thanks}"</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pin sheets */}
        {tournament.day_of_show_pin_sheets && tournament.day_of_pin_sheet_pdf_url && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> Pin Sheets &amp; Course Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <a href={tournament.day_of_pin_sheet_pdf_url} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Download Pin Sheet PDF</Button>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Live leaderboard */}
        {tournament.day_of_show_leaderboard && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4" style={{ color: accent }} /> Live Leaderboard</CardTitle>
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
        )}

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
          <Card id="course-map">
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
              <CardTitle className="text-base">📞 Need Help?</CardTitle>
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
          {reg.id !== "generic" && (
            <Link to={`/t/${tournament.slug}/scoring`}>
              <Button className="w-full" style={{ backgroundColor: accent, color: bg }}>Enter Scores</Button>
            </Link>
          )}
          <Link to={`/t/${tournament.slug}`} className={reg.id === "generic" ? "col-span-2" : ""}><Button variant="outline" className="w-full">Tournament Site</Button></Link>
        </div>

      </main>
      {!isBrandingRemoved(tournament as any) && <TeeventsFooter tournament={tournament as any} />}
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

function ActionCard({ to, icon, title, cta, accent, disabled }: { to: string; icon: ReactNode; title: string; cta: string; accent: string; disabled?: boolean }) {
  const inner = (
    <Card className={`h-full hover:shadow-md transition-shadow ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <CardContent className="p-4 flex flex-col gap-2 h-full">
        <div className="flex items-center gap-2" style={{ color: accent }}>{icon}<span className="font-semibold text-sm text-foreground">{title}</span></div>
        <span className="text-xs mt-auto" style={{ color: accent }}>{cta} →</span>
      </CardContent>
    </Card>
  );
  if (disabled) return inner;
  if (to.startsWith("#")) return <a href={to}>{inner}</a>;
  return <Link to={to}>{inner}</Link>;
}

function SponsorBlock({ layout, sponsors }: { layout: string; sponsors: Sponsor[] }) {
  const Item = (s: Sponsor) => {
    const inner = s.logo_url ? (
      <img src={s.logo_url} alt={s.name} className="max-h-16 mx-auto object-contain" />
    ) : (
      <span className="text-sm font-medium">{s.name}</span>
    );
    return s.website_url ? <a href={s.website_url} target="_blank" rel="noreferrer">{inner}</a> : inner;
  };

  if (layout === "list") {
    return (
      <ul className="divide-y">
        {sponsors.map((s) => (
          <li key={s.id} className="py-2 flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{s.name}</span>
            {s.logo_url && <img src={s.logo_url} alt={s.name} className="max-h-10 object-contain" />}
          </li>
        ))}
      </ul>
    );
  }

  if (layout === "carousel") {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {sponsors.map((s) => (
          <div key={s.id} className="border rounded-lg p-3 bg-card flex items-center justify-center min-h-[80px] min-w-[140px] snap-center">
            {Item(s)}
          </div>
        ))}
      </div>
    );
  }

  // default grid
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {sponsors.map((s) => (
        <div key={s.id} className="border rounded-lg p-3 bg-card flex items-center justify-center min-h-[80px] hover:shadow-md transition-shadow">
          {Item(s)}
        </div>
      ))}
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
  if (href.startsWith("#")) return <a href={href}>{inner}</a>;
  return <Link to={href}>{inner}</Link>;
}
