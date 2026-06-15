import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getFormatById, stablefordPoints } from "@/lib/scoringFormats";
import { Trophy, Loader2 } from "lucide-react";
import { type LeaderboardDesign } from "@/components/dashboard/LeaderboardDesignCard";
import { LeaderboardRenderer, mergeDesign } from "@/components/leaderboard/LeaderboardCore";
import { BrandingBadge } from "@/components/BrandingBadge";


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
  site_logo_url: string | null;
  site_primary_color: string | null;
  live_display_enabled: boolean;
  live_display_refresh_seconds: number;
  show_branding_badge?: boolean | null;
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

  const playerData: Record<string, { name: string; group: number | null; holes: Record<number, number> }> = {};
  scoresData.forEach((s: any) => {
    const key = s.registration_id;
    if (!playerData[key]) {
      const reg = s.tournament_registrations;
      playerData[key] = {
        name: reg ? `${reg.first_name} ${reg.last_name}` : "Unknown",
        group: reg?.group_number ?? null,
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
        return { name: `Group ${gn}`, total, thru: holesPlayed, isTeam: true, players: players.map((p) => p.name) };
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
  const [design, setDesign] = useState<LeaderboardDesign>(DEFAULT_DESIGN);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [scores, setScores] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [galleryIdx, setGalleryIdx] = useState(0);

  // Load tournament
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    supabase
      .from("tournaments")
      .select("id, title, slug, scoring_format, course_par, site_logo_url, site_primary_color, live_display_enabled, live_display_refresh_seconds, site_published, leaderboard_design, show_branding_badge")
      .or(`custom_slug.eq.${slug},slug.eq.${slug}`)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        // In preview mode, bypass publish gating so organizers can preview before going live.
        // Only block when the organizer has explicitly disabled the live display.
        if (!isPreview && (data as any).live_display_enabled === false) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        setTournament(data as Tournament);
        setDesign({ ...DEFAULT_DESIGN, ...((data as any).leaderboard_design || {}) });
        setLoading(false);
      });
  }, [slug, isPreview]);


  // Load related data
  useEffect(() => {
    if (!tournament) return;
    Promise.all([
      supabase
        .from("tournament_scores")
        .select("registration_id, hole_number, strokes, tournament_registrations(first_name, last_name, group_number)")
        .eq("tournament_id", tournament.id),
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
      setScores(scRes.data || []);
      setSponsors((spRes.data as Sponsor[]) || []);
      setGallery((galRes.data as GalleryItem[]) || []);
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
          supabase
            .from("tournament_scores")
            .select("registration_id, hole_number, strokes, tournament_registrations(first_name, last_name, group_number)")
            .eq("tournament_id", tournament.id)
            .then(({ data }) => setScores(data || []));
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
      supabase
        .from("tournament_scores")
        .select("registration_id, hole_number, strokes, tournament_registrations(first_name, last_name, group_number)")
        .eq("tournament_id", tournament.id)
        .then(({ data }) => setScores(data || []));
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

  const leaderboard = useMemo(() => {
    if (!tournament) return [];
    return buildLeaderboard(scores, tournament);
  }, [scores, tournament]);

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
  const bannerSponsor = bannerSponsors[bannerIdx % Math.max(bannerSponsors.length, 1)];
  const isStableford = getFormatById(tournament.scoring_format)?.scoring === "stableford";

  // Apply design tokens
  const FONT_SIZE_PX: Record<string, number> = { small: 14, medium: 16, large: 20 };
  const fontSize = FONT_SIZE_PX[design.font_size] || 16;
  const bg = design.background_color;
  const headerBg = design.header_background;
  const textColor = design.text_color;
  const accent = design.accent_color;
  const showSponsorBanner = design.show_sponsor_banner !== false;
  const sponsorPos = design.sponsor_banner_position || "top";
  const visibleRows = leaderboard.slice(0, Math.max(1, design.max_rows || 20));
  const showGross = design.show_gross !== false && design.default_view !== "net";
  const showNet = design.show_net !== false && design.default_view !== "gross";
  const showThru = design.show_thru !== false;
  const showPos = design.show_position !== false;
  const showPlayer = design.show_player !== false;
  const tickerSpeedClass = design.ticker_speed === "slow" ? "animate-[marquee_40s_linear_infinite]" : design.ticker_speed === "fast" ? "animate-[marquee_12s_linear_infinite]" : "animate-marquee";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: bg, color: textColor, fontFamily: design.font_family, fontSize }}
    >
      {isPreview && (
        <div className="w-full bg-secondary/90 text-secondary-foreground text-center text-xs sm:text-sm py-2 px-4 font-medium">
          Preview Mode — this is how your leaderboard will appear to players.
        </div>
      )}
      {/* Top Banner Sponsor */}
      {showSponsorBanner && sponsorPos === "top" && bannerSponsor && (
        <div className="w-full py-3 px-6 flex items-center justify-center gap-4" style={{ backgroundColor: accent, color: headerBg }}>
          <span className="text-[10px] uppercase tracking-widest font-semibold opacity-80">Sponsored by</span>
          {bannerSponsor.logo_url ? (
            <img src={bannerSponsor.logo_url} alt={bannerSponsor.name} className="h-12 max-w-[200px] object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              <span className="text-lg font-bold">{bannerSponsor.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4 sm:py-6" style={{ backgroundColor: headerBg }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {tournament.site_logo_url && (
              <img src={tournament.site_logo_url} alt="" className="h-12 w-12 object-contain rounded" />
            )}
            <div>
              <h1 className="text-xl sm:text-3xl font-bold leading-tight" style={{ color: textColor }}>
                {design.title || tournament.title}
              </h1>
              <p className="text-xs sm:text-sm flex items-center gap-2 opacity-80">
                <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: accent }} /> Live Leaderboard
              </p>
            </div>
          </div>
          <Trophy className="h-8 w-8 sm:h-12 sm:w-12" style={{ color: accent }} />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 sm:px-6 py-6">
        <div className={`max-w-7xl mx-auto grid grid-cols-1 ${showSponsorBanner && sponsorPos === "sidebar" ? "lg:grid-cols-[1fr_280px]" : ""} gap-6`}>
          {/* Leaderboard */}
          <section className="rounded-lg overflow-hidden" style={{ backgroundColor: `${headerBg}33` }}>
            <div className="px-4 sm:px-6 py-3" style={{ backgroundColor: headerBg }}>
              <h2 className="font-bold text-base sm:text-lg" style={{ color: textColor }}>Leaderboard</h2>
            </div>
            {visibleRows.length === 0 ? (
              <div className="p-12 text-center opacity-70">
                <Trophy className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Scoring hasn't started yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: headerBg }}>
                    <tr className="text-xs uppercase tracking-wider">
                      {showPos && <th className="text-left px-4 sm:px-6 py-3 w-12">#</th>}
                      {showPlayer && <th className="text-left px-4 sm:px-6 py-3">Player / Team</th>}
                      {showThru && <th className="text-right px-4 sm:px-6 py-3 w-20">Thru</th>}
                      {(showGross || showNet) && (
                        <th className="text-right px-4 sm:px-6 py-3 w-24">{isStableford ? "Pts" : "Total"}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, i) => (
                      <tr
                        key={`${row.name}-${i}`}
                        style={{ backgroundColor: design.row_stripe && i % 2 === 1 ? `${headerBg}66` : "transparent" }}
                      >
                        {showPos && (
                          <td className="px-4 sm:px-6 py-3 font-bold" style={{ color: i < 3 ? accent : textColor }}>
                            {i + 1}
                          </td>
                        )}
                        {showPlayer && (
                          <td className="px-4 sm:px-6 py-3">
                            <div className="font-semibold">{row.name}</div>
                            {row.players && row.players.length > 0 && (
                              <div className="text-xs opacity-70 truncate max-w-[300px]">{row.players.join(", ")}</div>
                            )}
                          </td>
                        )}
                        {showThru && <td className="px-4 sm:px-6 py-3 text-right opacity-80">{row.thru || "—"}</td>}
                        {(showGross || showNet) && (
                          <td className="px-4 sm:px-6 py-3 text-right font-mono font-bold">{row.total || "—"}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Sidebar */}
          {showSponsorBanner && sponsorPos === "sidebar" && (
            <aside className="space-y-4">
              {heroImage && (
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: `${headerBg}55` }}>
                  <img src={heroImage.image_url} alt={heroImage.caption || "Tournament photo"} className="w-full h-48 object-cover" />
                  {heroImage.caption && <div className="px-3 py-2 text-xs opacity-80">{heroImage.caption}</div>}
                </div>
              )}

              {sidebarSponsors.length > 0 && (
                <div className="rounded-lg p-4" style={{ backgroundColor: `${headerBg}55` }}>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold mb-3 opacity-80">Our Sponsors</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {sidebarSponsors.map((s) => (
                      <div key={s.id} className="flex items-center justify-center p-2 rounded bg-white/10">
                        {s.logo_url ? (
                          <img src={s.logo_url} alt={s.name} className="h-12 max-w-full object-contain" />
                        ) : (
                          <span className="text-xs font-semibold text-center">{s.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </main>

      {/* Ticker */}
      {design.show_ticker && design.ticker_text && (
        <div className="overflow-hidden whitespace-nowrap py-2" style={{ backgroundColor: headerBg }}>
          <span className={`inline-block ${tickerSpeedClass} px-4`}>{design.ticker_text}</span>
        </div>
      )}

      {/* Bottom Sponsor Banner */}
      {showSponsorBanner && sponsorPos === "bottom" && bannerSponsor && (
        <div className="w-full py-3 px-6 flex items-center justify-center gap-4" style={{ backgroundColor: accent, color: headerBg }}>
          <span className="text-[10px] uppercase tracking-widest font-semibold opacity-80">Sponsored by</span>
          {bannerSponsor.logo_url ? (
            <img src={bannerSponsor.logo_url} alt={bannerSponsor.name} className="h-12 max-w-[200px] object-contain" />
          ) : (
            <span className="text-lg font-bold">{bannerSponsor.name}</span>
          )}
        </div>
      )}

      {/* Rotating Footer Sponsors */}
      {footerSponsors.length > 0 && (
        <footer className="overflow-hidden" style={{ backgroundColor: headerBg }}>
          <div className="flex items-center gap-12 py-4 animate-marquee whitespace-nowrap">
            {[...footerSponsors, ...footerSponsors].map((s, i) => (
              <div key={`${s.id}-${i}`} className="flex items-center gap-3 shrink-0 px-4">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.name} className="h-10 max-w-[160px] object-contain" />
                ) : (
                  <span className="text-sm font-semibold opacity-80">{s.name}</span>
                )}
              </div>
            ))}
          </div>
        </footer>
      )}
      <BrandingBadge show={tournament.show_branding_badge !== false} />
    </div>
  );
}
