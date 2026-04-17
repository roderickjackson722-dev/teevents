import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getFormatById, stablefordPoints } from "@/lib/scoringFormats";
import { Trophy, Loader2, Award } from "lucide-react";

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
  const [tournament, setTournament] = useState<Tournament | null>(null);
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
      .select("id, title, slug, scoring_format, course_par, site_logo_url, site_primary_color, live_display_enabled, live_display_refresh_seconds, site_published")
      .or(`custom_slug.eq.${slug},slug.eq.${slug}`)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || !(data as any).site_published) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        if ((data as any).live_display_enabled === false) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        setTournament(data as Tournament);
        setLoading(false);
      });
  }, [slug]);

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
    const seconds = Math.max(5, tournament.live_display_refresh_seconds || 10);
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Live Display Unavailable</h1>
          <p className="text-muted-foreground">
            This tournament's live display is not available. Please contact the organizer.
          </p>
        </div>
      </div>
    );
  }

  const heroImage = gallery.find((g) => g.is_hero) || gallery[galleryIdx];
  const bannerSponsor = bannerSponsors[bannerIdx % Math.max(bannerSponsors.length, 1)];
  const isStableford = getFormatById(tournament.scoring_format)?.scoring === "stableford";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Banner Sponsor */}
      {bannerSponsor && (
        <div className="w-full bg-card border-b border-border py-3 px-6 flex items-center justify-center gap-4">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Sponsored by
          </span>
          {bannerSponsor.logo_url ? (
            <img src={bannerSponsor.logo_url} alt={bannerSponsor.name} className="h-12 max-w-[200px] object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-secondary" />
              <span className="text-lg font-bold text-foreground">{bannerSponsor.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4 sm:py-6 border-b border-border bg-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {tournament.site_logo_url && (
              <img src={tournament.site_logo_url} alt="" className="h-12 w-12 object-contain rounded" />
            )}
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-foreground leading-tight">{tournament.title}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-secondary animate-pulse" /> Live Leaderboard
              </p>
            </div>
          </div>
          <Trophy className="h-8 w-8 sm:h-12 sm:w-12 text-secondary" />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Leaderboard */}
          <section className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-3 border-b border-border bg-muted/40">
              <h2 className="font-bold text-foreground text-base sm:text-lg">Leaderboard</h2>
            </div>
            {leaderboard.length === 0 ? (
              <div className="p-12 text-center">
                <Trophy className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">Scoring hasn't started yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm sm:text-base">
                  <thead className="bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 sm:px-6 py-3 w-12">#</th>
                      <th className="text-left px-4 sm:px-6 py-3">Player / Team</th>
                      <th className="text-right px-4 sm:px-6 py-3 w-20">Thru</th>
                      <th className="text-right px-4 sm:px-6 py-3 w-24">{isStableford ? "Pts" : "Total"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, i) => (
                      <tr key={`${row.name}-${i}`} className={`border-t border-border ${i < 3 ? "bg-secondary/5" : ""}`}>
                        <td className="px-4 sm:px-6 py-3 font-bold text-foreground">{i + 1}</td>
                        <td className="px-4 sm:px-6 py-3">
                          <div className="font-semibold text-foreground">{row.name}</div>
                          {row.players && row.players.length > 0 && (
                            <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {row.players.join(", ")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-right text-muted-foreground">{row.thru || "—"}</td>
                        <td className="px-4 sm:px-6 py-3 text-right font-mono font-bold text-foreground text-base sm:text-lg">
                          {row.total || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            {heroImage && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <img
                  src={heroImage.image_url}
                  alt={heroImage.caption || "Tournament photo"}
                  className="w-full h-48 object-cover"
                />
                {heroImage.caption && (
                  <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                    {heroImage.caption}
                  </div>
                )}
              </div>
            )}

            {sidebarSponsors.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">
                  Our Sponsors
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {sidebarSponsors.map((s) => (
                    <div key={s.id} className="flex items-center justify-center p-2 bg-muted/30 rounded">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.name} className="h-12 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs font-semibold text-foreground text-center">{s.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Rotating Footer Sponsors */}
      {footerSponsors.length > 0 && (
        <footer className="border-t border-border bg-card overflow-hidden">
          <div className="flex items-center gap-12 py-4 animate-marquee whitespace-nowrap">
            {[...footerSponsors, ...footerSponsors].map((s, i) => (
              <div key={`${s.id}-${i}`} className="flex items-center gap-3 shrink-0 px-4">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.name} className="h-10 max-w-[160px] object-contain" />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">{s.name}</span>
                )}
              </div>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
