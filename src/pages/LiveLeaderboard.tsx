import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPublicLeaderboardScores } from "@/lib/fetchLeaderboardScores";
import { getFormatById, stablefordPoints } from "@/lib/scoringFormats";
import { buildLeaderboard, compareByTotal, parForHole, summarize, type LeaderboardRow } from "@/lib/liveLeaderboardRows";
import { Trophy, Loader2 } from "lucide-react";
import { type LeaderboardDesign } from "@/components/dashboard/LeaderboardDesignCard";
import { LeaderboardRenderer, mergeDesign } from "@/components/leaderboard/LeaderboardCore";
import { useLeaderboardPaused } from "@/lib/leaderboardPause";
import { TeeventsFooter } from "@/components/TeeventsFooter";
import { isBrandingRemoved } from "@/components/BrandingTagline";
import { PlayerScorecardDialog, type ScorecardCourseInfo } from "@/components/leaderboard/PlayerScorecardDialog";
import SkinsPayoutsCard from "@/components/leaderboard/SkinsPayoutsCard";




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

interface SponsorReg {
  id: string;
  company_name: string;
  logo_url: string | null;
  show_on_leaderboard: boolean | null;
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
  leaderboard_sponsor_banner_position?: string | null;
  leaderboard_sponsor_scroll_seconds?: number | null;
  leaderboard_rotating_logos?: { url: string; name?: string; website_url?: string }[] | null;

}

const tierOrder: Record<string, number> = {
  title: 0, platinum: 1, gold: 2, silver: 3, bronze: 4, hole: 5, inkind: 6,
};



/** Route entry (/live/:slug) — reads the slug + query string from the router. */
export default function LiveLeaderboard() {
  const { slug } = useParams<{ slug: string }>();
  const [search] = useSearchParams();
  return <LiveLeaderboardBoard slug={slug} search={search} />;
}

/**
 * Same board, embedded on the public event homepage. It takes the slug directly
 * so it works outside the /live route's router context.
 */
export function LiveLeaderboardEmbed({ slug }: { slug: string }) {
  const search = useMemo(() => new URLSearchParams(), []);
  return <LiveLeaderboardBoard slug={slug} search={search} embedded />;
}

function LiveLeaderboardBoard({
  slug,
  search,
  embedded = false,
}: { slug?: string; search: URLSearchParams; embedded?: boolean }) {
  const [isPaused] = useLeaderboardPaused();
  const isTvMode = search.get("display") === "1";
  const isPreview = search.get("preview") === "true" || search.get("preview") === "1";
  // Players who arrive from the scoring page get a one-tap link back so they
  // never have to re-enter their scoring code. Only same-origin paths are used.
  const rawFrom = search.get("from") || "";
  const returnToScoring = /^\/[A-Za-z0-9/_-]*$/.test(rawFrom) ? rawFrom : null;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [design, setDesign] = useState<LeaderboardDesign>(mergeDesign(null));
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [scores, setScores] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorRegs, setSponsorRegs] = useState<SponsorReg[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [flights, setFlights] = useState<{ id: string; tier_name: string; display_order: number }[]>([]);
  const [regFlights, setRegFlights] = useState<Record<string, string | null>>({});
  // Players arriving from their scoring page carry ?flight=<id|name> so they
  // land on their own flight's board.
  const requestedFlight = (search.get("flight") || "").trim();
  const [activeFlight, setActiveFlight] = useState<string>("__overall");
  // Grid mode drill-down: clicking a flight title opens that flight full-screen.
  const [drillFlight, setDrillFlight] = useState<string | null>(null);
  // Course pars / SI / yardages power the To Par column and the scorecard modal.
  const [course, setCourse] = useState<ScorecardCourseInfo | null>(null);
  const [scorecardRow, setScorecardRow] = useState<LeaderboardRow | null>(null);
  const scoreRefreshSequence = useRef(0);

  const refreshScores = useCallback(async (tournamentId: string) => {
    const sequence = ++scoreRefreshSequence.current;
    const data = await fetchAllPublicLeaderboardScores(tournamentId);
    if (sequence === scoreRefreshSequence.current) setScores(data || []);
  }, []);



  // Load tournament
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    (async () => {
      const { data: resolved } = await (supabase as any).rpc("resolve_public_tournament", { _slug: slug });
      const match = Array.isArray(resolved) ? resolved[0] : null;
      const baseQuery = supabase
        .from("tournaments")
        .select("id, title, slug, scoring_format, course_par, course_name, date, site_logo_url, site_primary_color, live_display_enabled, live_display_refresh_seconds, site_published, leaderboard_design, show_branding_badge, is_pro, show_branding_footer, branding_footer_admin_override, branding_footer_admin_show, branding_footer_custom_text, leaderboard_show_sponsor, leaderboard_sponsor_name, leaderboard_sponsor_logo_url, leaderboard_sponsor_label, leaderboard_title, leaderboard_sponsor_banner_enabled, leaderboard_sponsor_style, leaderboard_sponsor_interval_ms, leaderboard_sponsor_rotation_order, leaderboard_sponsor_banner_position, leaderboard_sponsor_scroll_seconds, leaderboard_rotating_logos, branding_removed, branding_removed_by_admin");
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

  // Course pars / stroke indexes / yardages for To Par and the scorecard modal.
  useEffect(() => {
    if (!tournament) return;
    supabase
      .from("golf_courses")
      .select("stroke_indexes, hole_pars, hole_distances, name, tee_name")
      .eq("tournament_id", tournament.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCourse(data as unknown as ScorecardCourseInfo);
      });
  }, [tournament?.id]);





  // Load related data
  useEffect(() => {
    if (!tournament) return;
    Promise.all([
      fetchAllPublicLeaderboardScores(tournament.id).then((data) => ({ data })),
      supabase
        .from("tournament_sponsors")
        .select("id, name, logo_url, website_url, tier, show_on_leaderboard, leaderboard_placement, display_order")
        .eq("tournament_id", tournament.id),
      (supabase as any).rpc("get_public_sponsor_registrations", { _tournament_id: tournament.id }),
      supabase
        .from("leaderboard_gallery")
        .select("id, image_url, caption, is_hero")
        .eq("tournament_id", tournament.id)
        .order("sort_order", { ascending: true }),
    ]).then(([scRes, spRes, regRes, galRes]) => {
      setScores((scRes as any).data || []);
      setSponsors((spRes.data as Sponsor[]) || []);
      setSponsorRegs(((regRes as any)?.data as SponsorReg[]) || []);
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
      // Anonymous viewers cannot read tournament_registrations, so this map can
      // come back empty; the scores RPC also carries flight_id per row (see
      // flightOf below), which keeps the division boards populated publicly.
      setRegFlights((prev) => ({ ...prev, ...map }));
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
        () => refreshScores(tournament.id)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament?.id, refreshScores]);

  // Realtime tournament updates — design + sponsor banner settings, applied live
  useEffect(() => {
    const tid = tournament?.id;
    if (!tid) return;
    const channel = supabase
      .channel(`live-design-${tid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tournaments", filter: `id=eq.${tid}` },
        (payload: any) => {
          const next = payload?.new;
          if (!next) return;
          if (next.leaderboard_design !== undefined) setDesign(mergeDesign(next.leaderboard_design));
          setTournament((prev) => (prev ? { ...prev, ...next } : prev));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament?.id]);

  // Realtime sponsor + team-name updates
  useEffect(() => {
    const tid = tournament?.id;
    if (!tid) return;

    const refetchSponsors = () => {
      supabase
        .from("tournament_sponsors")
        .select("id, name, logo_url, website_url, tier, show_on_leaderboard, leaderboard_placement, display_order")
        .eq("tournament_id", tid)
        .eq("show_on_leaderboard", true)
        .then(({ data }) => setSponsors((data as Sponsor[]) || []));
    };
    const refetchScores = () => {
      refreshScores(tid);
    };

    const channel = supabase
      .channel(`live-meta-${tid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_sponsors", filter: `tournament_id=eq.${tid}` }, refetchSponsors)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_registrations", filter: `tournament_id=eq.${tid}` }, refetchScores)
      .on("postgres_changes", { event: "*", schema: "public", table: "registration_groups", filter: `tournament_id=eq.${tid}` }, refetchScores)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament?.id, refreshScores]);





  // Auto-refresh fallback
  useEffect(() => {
    if (!tournament || isPaused) return;
    const seconds = Math.max(5, design.auto_refresh_seconds || tournament.live_display_refresh_seconds || 10);
    const interval = setInterval(() => {
      refreshScores(tournament.id);
    }, seconds * 1000);
    return () => clearInterval(interval);
  }, [tournament, isPaused, refreshScores]);

  // Sort sponsors by tier + display order
  const sortedSponsors = useMemo(() => {
    return sponsors.filter((s) => s.show_on_leaderboard !== false).sort((a, b) => {
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
    // "all" shows every sponsor; "selected" honors the ticker sponsor checkboxes.
    const selectedOnly = (design.sponsor_filter || "all") === "selected";
    const fromSponsors = sponsors
      .filter((s) => (selectedOnly ? s.show_on_leaderboard !== false : true))
      .sort((a, b) => {
        const ord = (a.display_order ?? 0) - (b.display_order ?? 0);
        if (ord !== 0) return ord;
        return (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99);
      })
      .map((s) => ({ id: s.id, name: s.name, logo_url: s.logo_url }));
    const fromRegs = sponsorRegs
      .filter((r) => (selectedOnly ? r.show_on_leaderboard !== false : true))
      .map((r) => ({ id: `reg-${r.id}`, name: r.company_name, logo_url: r.logo_url || null }));
    const list = [...uploaded, ...fromSponsors, ...fromRegs];
    if (list.length === 0) return [];
    return (tournament.leaderboard_sponsor_rotation_order || "sequential") === "random"
      ? [...list].sort(() => Math.random() - 0.5)
      : list;
  }, [tournament, sponsors, sponsorRegs, design.sponsor_filter]);

  // Rotate banner sponsor
  useEffect(() => {
    if (bannerSponsors.length <= 1 || isPaused) return;
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % bannerSponsors.length), 5000);
    return () => clearInterval(t);
  }, [bannerSponsors.length, isPaused]);

  // Rotate gallery
  useEffect(() => {
    if (gallery.length <= 1 || isPaused) return;
    const t = setInterval(() => setGalleryIdx((i) => (i + 1) % gallery.length), 7000);
    return () => clearInterval(t);
  }, [gallery.length, isPaused]);

  // Honor ?flight= (id or flight name) once flights have loaded.
  useEffect(() => {
    if (!requestedFlight || flights.length === 0) return;
    const match = flights.find(
      (f) => f.id === requestedFlight || f.tier_name.toLowerCase() === requestedFlight.toLowerCase(),
    );
    if (match) setActiveFlight(match.id);
  }, [requestedFlight, flights]);

  const flightMode = flights.length > 1 ? design.flight_display_mode || "tabs" : "tabs";

  // Auto-rotate mode: cycle through EVERY division (and Overall, when included)
  // on a timer, so spectators see each flight even before scores are posted.
  const rotateKeys = useMemo(() => {
    const keys = flights.map((f) => f.id);
    if (design.flight_include_overall !== false) keys.push("__overall");
    return keys;
  }, [flights, design.flight_include_overall]);

  useEffect(() => {
    // An explicit ?flight= request wins over rotation so a player's link stays put.
    if (requestedFlight) return;
    if (flightMode !== "rotate" || rotateKeys.length === 0) return;
    const seconds = Math.max(5, design.flight_rotate_seconds || 15);
    setActiveFlight((cur) => (rotateKeys.includes(cur) ? cur : rotateKeys[0]));
    if (rotateKeys.length < 2 || isPaused) return;
    const t = setInterval(() => {
      setActiveFlight((cur) => {
        const i = rotateKeys.indexOf(cur);
        return rotateKeys[(i + 1) % rotateKeys.length];
      });
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [flightMode, rotateKeys, design.flight_rotate_seconds, requestedFlight, isPaused]);


  /**
   * Division/flight for a score row. The scores RPC carries flight_id (works for
   * anonymous viewers); the registration map is only a fallback for organizers.
   */
  const flightOf = (s: any): string | null =>
    (s?.flight_id as string | null) ?? regFlights[s?.registration_id] ?? null;

  const filteredScores = useMemo(() => {
    if (flights.length === 0 || activeFlight === "__overall") return scores;
    return scores.filter((s: any) => flightOf(s) === activeFlight);
  }, [scores, regFlights, flights.length, activeFlight]);


  const holePars = (course?.hole_pars as number[] | null) || null;

  const leaderboard = useMemo(() => {
    if (!tournament) return [];
    return buildLeaderboard(filteredScores, tournament, holePars);
  }, [filteredScores, tournament, holePars]);

  /** Rounds that have posted scores, and the round currently in play. */
  const rounds = useMemo(() => {
    const set = new Set<number>();
    scores.forEach((s: any) => set.add(Number(s.round_number) || 1));
    return Array.from(set).sort((a, b) => a - b);
  }, [scores]);
  const currentRound = rounds.length ? rounds[rounds.length - 1] : 1;

  // Grid mode: one board per flight (plus Overall when included) on one screen.
  const flightBoards = useMemo(() => {
    if (!tournament || flightMode !== "grid") return undefined;
    const boards = flights.map((f) => ({
      key: f.id,
      label: f.tier_name,
      rows: buildLeaderboard(
        scores.filter((s: any) => flightOf(s) === f.id),
        tournament,
        holePars,
      ),
    }));
    if (design.flight_include_overall !== false) {
      boards.push({
        key: "__overall",
        label: "Overall",
        rows: buildLeaderboard(scores, tournament, holePars),
      });
    }
    return boards.length > 0 ? boards : undefined;
  }, [tournament, flightMode, flights, scores, regFlights, design.flight_include_overall, holePars]);



  if (loading) {
    return (
      <div className={`${embedded ? "py-16" : "min-h-screen"} flex items-center justify-center bg-background`}>
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (accessDenied || !tournament) {
    // Embedded on the event homepage: stay silent rather than showing an error block.
    if (embedded) return null;
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
  const displayTitle = baseTitle;
  /** Heading for the single board — "[Flight] Leaderboard" when a flight is active. */
  const singleBoardLabel = activeFlightName ? `${activeFlightName} Leaderboard` : "Leaderboard";


  // Organizers can override the displayed date (add-on events may start earlier).
  const shownDate = design.display_date || tournament.date;
  let dateText: string | null = null;
  if (shownDate) {
    try {
      dateText = new Date(shownDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch { /* ignore */ }
  }
  const subtitle = (
    <span className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
      {tournament.course_name && <span>{tournament.course_name}</span>}
      {tournament.course_name && dateText && <span className="hidden sm:inline opacity-60">·</span>}
      {dateText && <span>{dateText}</span>}
    </span>
  );


  const presentedBy = tournament.leaderboard_show_sponsor && tournament.leaderboard_sponsor_name
    ? {
        label: tournament.leaderboard_sponsor_label || "Presented by",
        name: tournament.leaderboard_sponsor_name,
        logoUrl: tournament.leaderboard_sponsor_logo_url || null,
      }
    : null;

  const flightTabs = flights.length > 0 && flightMode !== "grid" ? (
    <div className="w-full bg-background/80 backdrop-blur border-b border-border/60 px-3 py-2 flex flex-wrap gap-2 justify-center items-center">
      {flightMode === "rotate" && (
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mr-1">
          Now showing
        </span>
      )}
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
      {(flightMode !== "rotate" || design.flight_include_overall !== false) && (
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
      )}
    </div>
  ) : null;



  return (
    <>
      <LeaderboardRenderer
        design={drillFlight ? { ...design, font_size: "large" } : design}
        title={displayTitle}
        rows={leaderboard}
        isStableford={isStableford}
        coursePar={tournament.course_par || 72}
        rounds={rounds}
        currentRound={currentRound}
        onRowClick={(row) => setScorecardRow(row as LeaderboardRow)}
        bannerSponsor={bannerSponsor}
        sidebarSponsors={sidebarSponsors}
        footerSponsors={footerSponsors}
        scrollingSponsors={scrollingSponsors}
        scrollingSponsorsPosition={tournament.leaderboard_sponsor_banner_position || "bottom"}
        scrollingSponsorsSpeedSeconds={tournament.leaderboard_sponsor_scroll_seconds || 20}
        heroImage={heroImage || null}
        logoUrl={tournament.site_logo_url}
        subtitle={subtitle}
        boards={drillFlight ? undefined : flightBoards}
        singleBoardLabel={singleBoardLabel}
        onBoardSelect={(key) => {
          setDrillFlight(key);
          setActiveFlight(key);
        }}
        boardColumns={design.flight_columns || 2}
        presentedBy={presentedBy}


        topNotice={
          <>
            {returnToScoring ? (
              <div className="w-full bg-primary/10 border-b border-primary/20 px-4 py-2 flex justify-center">
                <a
                  href={returnToScoring}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold"
                  style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}
                >
                  ← Return to Scoring
                </a>
              </div>
            ) : null}
            {drillFlight ? (
              <div className="w-full bg-primary/10 border-b border-primary/20 px-4 py-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setDrillFlight(null);
                    setActiveFlight("__overall");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold"
                  style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}
                >
                  ← Back to All Flights
                </button>
              </div>
            ) : null}
            {isPreview ? (
              <div className="w-full bg-secondary/90 text-secondary-foreground text-center text-xs sm:text-sm py-2 px-4 font-medium">
                Preview Mode — this is how your leaderboard will appear to players.
              </div>
            ) : null}
            {flightTabs}
          </>
        }

      />
      {tournament.id ? (
        <div className="max-w-5xl mx-auto px-4 py-6">
          <SkinsPayoutsCard tournamentId={tournament.id} />
        </div>
      ) : null}
      {!embedded && !isBrandingRemoved(tournament as any) && <TeeventsFooter tournament={tournament as any} />}

      <PlayerScorecardDialog
        open={!!scorecardRow}
        onOpenChange={(v) => !v && setScorecardRow(null)}
        playerName={scorecardRow?.name || ""}
        subtitle={scorecardRow?.players?.join(", ")}
        holesByRound={scorecardRow?.holesByRound || {}}
        course={course}
        coursePar={tournament.course_par || 72}
      />
    </>

  );
}

