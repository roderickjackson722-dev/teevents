import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getFormatById, stablefordPoints } from "@/lib/scoringFormats";
import { Trophy, Loader2 } from "lucide-react";
import { type LeaderboardDesign } from "@/components/dashboard/LeaderboardDesignCard";
import { LeaderboardRenderer, mergeDesign } from "@/components/leaderboard/LeaderboardCore";
import { TeeventsFooter } from "@/components/TeeventsFooter";


interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string;
  show_on_leaderboard: boolean;
  leaderboard_placement: string;
  display_order: number | null;
}

interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
  is_hero: boolean;
}

interface Tournament {
  id: string;
  title: string;
  slug: string | null;
  scoring_format: string;
  course_par: number | null;
  course_name?: string | null;
  date?: string | null;
  site_logo_url: string | null;
  site_primary_color: string | null;
  live_display_enabled: boolean;
  live_display_refresh_seconds: number;
  show_branding_badge?: boolean | null;
  leaderboard_show_sponsor?: boolean | null;
  leaderboard_sponsor_name?: string | null;
  leaderboard_sponsor_logo_url?: string | null;
  leaderboard_sponsor_label?: string | null;
  leaderboard_title?: string | null;
  leaderboard_sponsor_banner_enabled?: boolean | null;
  leaderboard_sponsor_style?: string | null;
  leaderboard_sponsor_interval_ms?: number | null;
  leaderboard_sponsor_rotation_order?: string | null;
  leaderboard_rotating_logos?: { url: string; name?: string; website_url?: string }[] | null;
}

interface LeaderboardRow {
  name: string;
  total: number;
  thru: number;
  isTeam?: boolean;
  players?: string[];
  points?: number;
}

const tierOrder: Record<string, number> = {
  title: 0, platinum: 1, gold: 2, silver: 3, bronze: 4, hole: 5, inkind: 6,
};

function buildLeaderboard(scoresData: any[], t: Tournament): LeaderboardRow[] {
  const fmt = getFormatById(t.scoring_format || "stroke_play");
  const isTeam = fmt && fmt.teamSize > 1;
  const isStableford = fmt?.scoring === "stableford";
  const cPar = t.course_par || 72;
  const holePar = Math.round(cPar / 18);

  const playerData: Record<string, { name: string; group: number | null; teamName: string | null; holes: Record<number, number> }> = {};
  scoresData.forEach((s: any) => {
    const key = s.registration_id;
    if (!playerData[key]) {
      const reg = s.tournament_registrations;
      const first = reg?.first_name ?? s.first_name;
      const last = reg?.last_name ?? s.last_name;
      const grp = reg?.group_number ?? s.group_number ?? null;
      playerData[key] = {
        name: first || last ? `${first ?? ""} ${last ?? ""}`.trim() : "Unknown",
        group: grp,
        teamName: (reg?.team_name ?? s.team_name ?? null) || null,
        holes: {},
      };
    }
    playerData[key].holes[s.hole_number] = s.strokes;
  });

  if (isTeam && fmt && (fmt.scoring === "best_ball" || fmt.scoring === "scramble" || fmt.scoring === "shamble")) {
    const groups: Record<number, typeof playerData[string][]> = {};
    Object.values(playerData).forEach((p) => {
      if (p.group != null) {
        if (!groups[p.group]) groups[p.group] = [];
        groups[p.group].push(p);
      }
    });
    return Object.entries(groups)
      .map(([gn, players]) => {
        let total = 0;
        let holesPlayed = 0;
        for (let h = 1; h <= 18; h++) {
          const strokes = players.map((p) => p.holes[h]).filter((v) => v != null);
          if (strokes.length > 0) {
            total += Math.min(...strokes);
            holesPlayed++;
          }
        }
        // Prefer the organizer-entered team name; fall back to the default "Group X".
        const teamName = players.find((p) => p.teamName)?.teamName || `Group ${gn}`;
        return { name: teamName, total, thru: holesPlayed, isTeam: true, players: players.map((p) => p.name) };
      })
      .sort((a, b) => (a.total === 0 ? 1 : b.total === 0 ? -1 : a.total - b.total));
  }

  if (isStableford) {
    return Object.values(playerData)
      .map((p) => {
        let points = 0;
        const holesPlayed = Object.keys(p.holes).length;
        Object.values(p.holes).forEach((strokes) => {
          points += stablefordPoints(strokes, holePar);
        });
        return { name: p.name, total: points, thru: holesPlayed, points };
      })
      .sort((a, b) => b.total - a.total);
  }

  return Object.values(playerData)
    .map((p) => ({
      name: p.name,
      total: Object.values(p.holes).reduce((sum, s) => sum + s, 0),
      thru: Object.keys(p.holes).length,
    }))
    .sort((a, b) => (a.total === 0 ? 1 : b.total === 0 ? -1 : a.total - b.total));
}

export default function LiveLeaderboard() {
  const { slug } = useParams<{ slug: string }>();
  const [search] = useSearchParams();
  const isTvMode = search.get("display") === "1";
  const isPreview = search.get("preview") === "true" || search.get("preview") === "1";
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [design, setDesign] = useState<LeaderboardDesign>(mergeDesign(null));
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [scores, setScores] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [flights, setFlights] = useState<{ id: string; tier_name: string; display_order: number }[]>([]);
  const [regFlights, setRegFlights] = useState<Record<string, string | null>>({});
  const [activeFlight, setActiveFlight] = useState<string>("__overall");

  // Load tournament
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    (async () => {
      const { data: resolved } = await (supabase as any).rpc("resolve_public_tournament", { _slug: slug });
      const match = Array.isArray(resolved) ? resolved[0] : null;
      const baseQuery = supabase
        .from("tournaments")
        .select("id, title, slug, scoring_format, course_par, course_name, date, site_logo_url, site_primary_color, live_display_enabled, live_display_refresh_seconds, site_published, leaderboard_design, show_branding_badge, is_pro, show_branding_footer, branding_footer_admin_override, branding_footer_admin_show, branding_footer_custom_text, leaderboard_show_sponsor, leaderboard_sponsor_name, leaderboard_sponsor_logo_url, leaderboard_sponsor_label, leaderboard_title, leaderboard_sponsor_banner_enabled, leaderboard_sponsor_style, leaderboard_sponsor_interval_ms, leaderboard_sponsor_rotation_order, leaderboard_rotating_logos");
      const { data } = match?.id
        ? await baseQuery.eq("id", match.id).maybeSingle()
        : await baseQuery.or(`custom_slug.eq.${slug},slug.eq.${slug}`).limit(1).maybeSingle();
      if (!data) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      if (!isPreview && (data as any).live_display_enabled === false) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      setTournament(data as unknown as Tournament);
      setDesign(mergeDesign((data as any).leaderboard_design));
      setLoading(false);
    })();
  }, [slug, isPreview]);



  // Load related data
  useEffect(() => {
    if (!tournament) return;
    Promise.all([
      (supabase as any).rpc("get_public_leaderboard_scores", { _tournament_id: tournament.id }),
      supabase
        .from("tournament_sponsors")
        .select("id, name, logo_url, website_url, tier, show_on_leaderboard, leaderboard_placement, display_order")
        .eq("tournament_id", tournament.id)
        .eq("show_on_leaderboard", true),
      supabase
        .from("leaderboard_gallery")
        .select("id, image_url, caption, is_hero")
        .eq("tournament_id", tournament.id)
        .order("sort_order", { ascending: true }),
    ]).then(([scRes, spRes, galRes]) => {
      setScores((scRes as any).data || []);
      setSponsors((spRes.data as Sponsor[]) || []);
      setGallery((galRes.data as GalleryItem[]) || []);
    });

    // Load flights + registration→flight map (public via tier RLS on published tournaments)
    Promise.all([
      (supabase as any)
        .from("tournament_tiers")
        .select("id, tier_name, display_order")
        .eq("tournament_id", tournament.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      (supabase as any)
        .from("tournament_registrations")
        .select("id, flight_id")
        .eq("tournament_id", tournament.id),
    ]).then(([fRes, rRes]: any) => {
      setFlights(fRes.data || []);
      const map: Record<string, string | null> = {};
      (rRes.data || []).forEach((r: any) => { map[r.id] = r.flight_id; });
      setRegFlights(map);
    });
  }, [tournament]);

  // Realtime score updates
  useEffect(() => {
    if (!tournament) return;
    const channel = supabase
      .channel(`live-display-${tournament.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_scores", filter: `tournament_id=eq.${tournament.id}` },
        () => {
          (supabase as any)
            .rpc("get_public_leaderboard_scores", { _tournament_id: tournament.id })
            .then(({ data }: any) => setScores(data || []));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament]);

  // Realtime design updates — propagate organizer design changes immediately
  useEffect(() => {
    if (!tournament) return;
    const channel = supabase
      .channel(`live-design-${tournament.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tournaments", filter: `id=eq.${tournament.id}` },
        (payload: any) => {
          const next = payload?.new?.leaderboard_design;
          if (next !== undefined) setDesign(mergeDesign(next));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament]);




  // Auto-refresh fallback
  useEffect(() => {
    if (!tournament) return;
    const seconds = Math.max(5, design.auto_refresh_seconds || tournament.live_display_refresh_seconds || 10);
    const interval = setInterval(() => {
      (supabase as any)
        .rpc("get_public_leaderboard_scores", { _tournament_id: tournament.id })
        .then(({ data }: any) => setScores(data || []));
    }, seconds * 1000);
    return () => clearInterval(interval);
  }, [tournament]);

  // Sort sponsors by tier + display order
  const sortedSponsors = useMemo(() => {
    return [...sponsors].sort((a, b) => {
      const ord = (a.display_order ?? 0) - (b.display_order ?? 0);
      if (ord !== 0) return ord;
      return (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99);
    });
  }, [sponsors]);

  const bannerSponsors = sortedSponsors.filter((s) => s.leaderboard_placement === "banner");
  const sidebarSponsors = sortedSponsors.filter((s) => s.leaderboard_placement === "sidebar");
  const footerSponsors = sortedSponsors.filter((s) => s.leaderboard_placement === "footer");

  /**
   * Scrolling sponsors banner — driven by the dashboard toggle
   * (leaderboard_sponsor_banner_enabled) and combines uploaded rotating logos
   * with every sponsor marked "show on leaderboard".
   */
  const scrollingSponsors = useMemo(() => {
    if (!tournament) return [];
    if (tournament.leaderboard_sponsor_banner_enabled === false) return [];
    const uploaded = (tournament.leaderboard_rotating_logos || []).map((l, idx) => ({
      id: `uploaded-${idx}`,
      name: l.name || "Sponsor",
      logo_url: l.url,
    }));
    const list = [...uploaded, ...sortedSponsors.map((s) => ({ id: s.id, name: s.name, logo_url: s.logo_url }))];
    if (list.length === 0) return [];
    return (tournament.leaderboard_sponsor_rotation_order || "sequential") === "random"
      ? [...list].sort(() => Math.random() - 0.5)
      : list;
  }, [tournament, sortedSponsors]);

  // Rotate banner sponsor
  useEffect(() => {
    if (bannerSponsors.length <= 1) return;
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % bannerSponsors.length), 5000);
    return () => clearInterval(t);
  }, [bannerSponsors.length]);

  // Rotate gallery
  useEffect(() => {
    if (gallery.length <= 1) return;
    const t = setInterval(() => setGalleryIdx((i) => (i + 1) % gallery.length), 7000);
    return () => clearInterval(t);
  }, [gallery.length]);

  const filteredScores = useMemo(() => {
    if (flights.length === 0 || activeFlight === "__overall") return scores;
    return scores.filter((s: any) => regFlights[s.registration_id] === activeFlight);
  }, [scores, regFlights, flights.length, activeFlight]);

  const leaderboard = useMemo(() => {
    if (!tournament) return [];
    return buildLeaderboard(filteredScores, tournament);
  }, [filteredScores, tournament]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (accessDenied || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Leaderboard data is loading</h1>
          <p className="text-muted-foreground">
            We couldn't find this tournament's live leaderboard. Please check back in a few moments,
            or contact the organizer if this keeps happening.
          </p>
        </div>
      </div>
    );
  }


  const heroImage = gallery.find((g) => g.is_hero) || gallery[galleryIdx];
  const bannerSponsor = bannerSponsors[bannerIdx % Math.max(bannerSponsors.length, 1)] || null;
  const isStableford = getFormatById(tournament.scoring_format)?.scoring === "stableford";

  const activeFlightName =
    activeFlight === "__overall"
      ? null
      : flights.find((f) => f.id === activeFlight)?.tier_name || null;
  const baseTitle = tournament.leaderboard_title || tournament.title;
  const displayTitle = activeFlightName ? `${baseTitle} — ${activeFlightName}` : baseTitle;

  const subtitleParts: string[] = [];
  if (tournament.course_name) subtitleParts.push(tournament.course_name);
  if (tournament.date) {
    try {
      subtitleParts.push(new Date(tournament.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
    } catch { /* ignore */ }
  }
  const subtitle = subtitleParts.join(" · ");

  const presentedBy = tournament.leaderboard_show_sponsor && tournament.leaderboard_sponsor_name
    ? {
        label: tournament.leaderboard_sponsor_label || "Presented by",
        name: tournament.leaderboard_sponsor_name,
        logoUrl: tournament.leaderboard_sponsor_logo_url || null,
      }
    : null;

  const flightTabs = flights.length > 0 ? (
    <div className="w-full bg-background/80 backdrop-blur border-b border-border/60 px-3 py-2 flex flex-wrap gap-2 justify-center">
      {flights.map((f) => (
        <button
          key={f.id}
          onClick={() => setActiveFlight(f.id)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
            activeFlight === f.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          {f.tier_name}
        </button>
      ))}
      <button
        onClick={() => setActiveFlight("__overall")}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
          activeFlight === "__overall"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/70"
        }`}
      >
        Overall
      </button>
    </div>
  ) : null;

  return (
    <>
      <LeaderboardRenderer
        design={design}
        title={displayTitle}
        rows={leaderboard.map((r) => ({ name: r.name, total: r.total, thru: r.thru, players: r.players }))}
        isStableford={isStableford}
        bannerSponsor={bannerSponsor}
        sidebarSponsors={sidebarSponsors}
        footerSponsors={footerSponsors}
        scrollingSponsors={scrollingSponsors}
        heroImage={heroImage || null}
        logoUrl={tournament.site_logo_url}
        subtitle={subtitle}
        presentedBy={presentedBy}
        topNotice={
          <>
            {isPreview ? (
              <div className="w-full bg-secondary/90 text-secondary-foreground text-center text-xs sm:text-sm py-2 px-4 font-medium">
                Preview Mode — this is how your leaderboard will appear to players.
              </div>
            ) : null}
            {flightTabs}
          </>
        }
      />
      <TeeventsFooter tournament={tournament as any} />
    </>
  );
}

