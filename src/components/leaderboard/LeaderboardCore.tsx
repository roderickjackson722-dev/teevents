import { useEffect, useState } from "react";
import { Trophy, Award } from "lucide-react";
import { DEFAULT_DESIGN, type LeaderboardDesign } from "@/components/dashboard/LeaderboardDesignCard";


export interface LbRow {
  name: string;
  total: number;
  thru: number;
  players?: string[];
  /** Stable key used for scorecard drill-down (registration id or group key). */
  key?: string;
  /** Secondary line under the name (division / flight / team). */
  subtitle?: string;
  /** Strokes recorded in the round currently in play. */
  today?: number | null;
  /** Par for the holes actually played — drives an accurate multi-round To Par. */
  parPlayed?: number | null;
  /** Par for the holes played in the current round. */
  parToday?: number | null;
  /** Completed totals for each earlier round, keyed by round number. */
  roundTotals?: Record<number, number>;
  /** Hole-by-hole strokes per round: { 1: { 1: 4, 2: 5 } }. */
  holesByRound?: Record<number, Record<number, number>>;
}


export interface LbSponsor {
  id: string;
  name: string;
  logo_url: string | null;
  leaderboard_placement?: string;
}

export interface LbGalleryItem {
  id: string;
  image_url: string;
  caption?: string | null;
  is_hero?: boolean;
}

const FONT_SIZE_PX: Record<string, number> = { small: 14, medium: 16, large: 20 };

/** Formats a score relative to par: -4, E, +2. */
export function formatToPar(total: number, par: number): string {
  const toPar = total - par;
  if (toPar === 0) return "E";
  return toPar < 0 ? `${toPar}` : `+${toPar}`;
}

/**
 * Always merge against DEFAULT_DESIGN so a missing or partial token never
 * causes the live leaderboard to diverge from the configured preview.
 */
export function mergeDesign(partial: Partial<LeaderboardDesign> | null | undefined): LeaderboardDesign {
  return { ...DEFAULT_DESIGN, ...(partial || {}) };
}

export function tickerSpeedClass(speed: LeaderboardDesign["ticker_speed"]): string {
  if (speed === "slow") return "animate-[marquee_40s_linear_infinite]";
  if (speed === "fast") return "animate-[marquee_12s_linear_infinite]";
  return "animate-marquee";
}

interface RendererProps {
  design: LeaderboardDesign;
  title: string;
  rows: LbRow[];
  isStableford?: boolean;
  /** Course par used for the "To Par" column. Defaults to 72. */
  coursePar?: number;
  bannerSponsor?: LbSponsor | null;
  sidebarSponsors?: LbSponsor[];
  footerSponsors?: LbSponsor[];
  /** Sponsors shown in a continuously scrolling banner. */
  scrollingSponsors?: LbSponsor[];
  /** Where the scrolling sponsors banner renders: top | bottom | sidebar. */
  scrollingSponsorsPosition?: string;
  /** Seconds for one full scroll loop (lower = faster). */
  scrollingSponsorsSpeedSeconds?: number;

  heroImage?: LbGalleryItem | null;
  logoUrl?: string | null;
  /** Compact mode for the in-dashboard preview card. */
  compact?: boolean;
  /** Optional banner above the leaderboard (eg. "Preview Mode"). */
  topNotice?: React.ReactNode;
  /** Optional subtitle under title (date · course). */
  subtitle?: React.ReactNode;
  /**
   * Multiple named boards (eg. one per flight) rendered side by side in a grid.
   * When provided, these replace the single `rows` table.
   */
  boards?: { key: string; label: string; rows: LbRow[] }[];
  /** Columns used for the multi-board grid. */
  boardColumns?: number;
  /** "Presented by" headline sponsor for the leaderboard. */
  presentedBy?: {
    label: string;
    name: string;
    logoUrl: string | null;
  } | null;
  /** Rounds that already have scores — each completed round gets its own column. */
  rounds?: number[];
  /** Round currently in play — drives the "Today" column. */
  currentRound?: number;
  /** Clicking a player row opens their round-by-round scorecard. */
  onRowClick?: (row: LbRow) => void;
  /** Clicking a board title drills down into that flight full-screen. */
  onBoardSelect?: (key: string, label: string) => void;
  /** Heading for the single (non-grid) board, eg. "Professionals Leaderboard". */
  singleBoardLabel?: string;
}




/**
 * Single source of truth for rendering the leaderboard. Used by both the
 * organizer's design-preview card AND the public live leaderboard so the two
 * can never visually diverge.
 */
export function LeaderboardRenderer({
  design,
  title,
  rows,
  isStableford,
  coursePar = 72,
  bannerSponsor,
  sidebarSponsors = [],
  footerSponsors = [],
  scrollingSponsors = [],
  scrollingSponsorsPosition = "bottom",
  scrollingSponsorsSpeedSeconds = 20,
  heroImage,
  logoUrl,
  compact = false,
  topNotice,
  subtitle,
  boards,
  boardColumns = 2,
  presentedBy,
  rounds = [],
  currentRound,
  onRowClick,
  onBoardSelect,
  singleBoardLabel = "Leaderboard",

}: RendererProps) {

  const fontSize = FONT_SIZE_PX[design.font_size] || 16;
  const bg = design.background_color;
  const headerBg = design.header_background;
  const textColor = design.text_color;
  const accent = design.accent_color;
  const showSponsorBanner = design.show_sponsor_banner !== false;
  const titleAlign = design.title_align || "center";
  const sponsorPos = design.sponsor_banner_position || "top";

  const perPage = Math.max(1, design.max_rows || 20);
  /**
   * Page-by-page rotation. Every name in the field/flight is shown: the board
   * advances one page at a time and loops back to the top. In "scroll" mode
   * all rows render on a single page instead.
   */
  const pageMode = (design.row_paging_mode || "pages") === "pages" && !compact;
  const longestBoard = boards && boards.length > 0
    ? Math.max(...boards.map((b) => b.rows.length))
    : rows.length;
  const pageCount = pageMode ? Math.max(1, Math.ceil(longestBoard / perPage)) : 1;
  const [pageIdx, setPageIdx] = useState(0);
  useEffect(() => {
    if (!pageMode || pageCount < 2) {
      setPageIdx(0);
      return;
    }
    const seconds = Math.max(3, design.row_page_seconds || 10);
    const t = setInterval(() => setPageIdx((i) => (i + 1) % pageCount), seconds * 1000);
    return () => clearInterval(t);
  }, [pageMode, pageCount, design.row_page_seconds]);
  const pageRows = (all: LbRow[]) =>
    pageMode ? all.slice(pageIdx * perPage, pageIdx * perPage + perPage) : all;

  const showGross = design.show_gross !== false && design.default_view !== "net";
  const showNet = design.show_net !== false && design.default_view !== "gross";
  const showThru = design.show_thru !== false;
  const showPos = design.show_position !== false;
  const showPlayer = design.show_player !== false;

  const padX = compact ? "px-3" : "px-4 sm:px-6";
  const padY = compact ? "py-2" : "py-3";
  const headerPadY = compact ? "py-2" : "py-4 sm:py-6";

  /**
   * Seamless sponsor marquee. The logo list is repeated until it is wide enough
   * to fill the screen, then that whole strip is duplicated once so the
   * translateX(-50%) loop restarts with no blank gap.
   */
  const scrollPos = scrollingSponsorsPosition || "bottom";
  const marqueeBase = (() => {
    if (scrollingSponsors.length === 0) return [];
    const out: LbSponsor[] = [];
    const minItems = 8;
    while (out.length < minItems) out.push(...scrollingSponsors);
    return out;
  })();
  const loopSeconds = Math.max(5, Math.min(60, scrollingSponsorsSpeedSeconds || 20));

  const sponsorMarquee =
    marqueeBase.length > 0 ? (
      <div
        data-testid="lb-scrolling-sponsors"
        className="overflow-hidden border-y w-full"
        style={{ backgroundColor: headerBg, borderColor: `${accent}44` }}
      >
        <div
          className={`flex items-center w-max whitespace-nowrap transform-gpu ${compact ? "py-2" : "py-4"}`}
          style={{
            animation: `marquee ${loopSeconds}s linear infinite`,
            willChange: "transform",
            backfaceVisibility: "hidden",
            WebkitFontSmoothing: "antialiased",
          }}
        >
          {[...marqueeBase, ...marqueeBase].map((s, i) => (
            <div key={`scroll-${s.id}-${i}`} className={`flex items-center shrink-0 ${compact ? "px-4" : "px-8"}`}>
              {s.logo_url ? (
                <img
                  src={s.logo_url}
                  alt={s.name}
                  loading="lazy"
                  decoding="async"
                  className={`${compact ? "h-6" : "h-10"} w-auto max-w-[200px] object-contain`}
                  style={{ imageRendering: "auto" }}
                />
              ) : (
                <span className={`${compact ? "text-xs" : "text-base"} font-semibold tracking-wide`}>{s.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    ) : null;

  /** Rounds that are finished (shown as their own R1/R2 column). */
  const priorRounds = (rounds || []).filter((r) => !currentRound || r < currentRound);
  const showToday = !isStableford && !!currentRound && (rounds || []).includes(currentRound);

  /** One leaderboard table — reused for the single board and each flight board. */
  const renderBoard = (key: string, label: string, boardRows: LbRow[], clickableTitle = false) => {
    const all = boardRows;
    const shown = pageRows(all);
    const offset = pageMode ? pageIdx * perPage : 0;
    /** Competition positions: identical totals share a T-position. */
    const positionFor = (idx: number) => {
      const total = all[offset + idx].total;
      const first = all.findIndex((r) => r.total === total);
      const tied = all.filter((r) => r.total === total).length > 1;
      return `${tied ? "T" : ""}${first + 1}`;
    };
    const heading = (
      <h2 className={`font-bold ${compact ? "text-xs" : "text-base sm:text-lg"}`} style={{ color: textColor }}>
        {label}
      </h2>
    );
    return (
      <section
        key={key}
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: `${headerBg}33` }}
        data-testid="lb-table-section"
      >
        <div className={`${padX} ${padY} flex items-center justify-between gap-3`} style={{ backgroundColor: headerBg }}>
          {clickableTitle && onBoardSelect ? (
            <button
              type="button"
              onClick={() => onBoardSelect(key, label)}
              className="text-left group flex items-center gap-2 hover:opacity-80 transition-opacity"
              data-testid="lb-board-title-button"
              title="Click to expand"
            >
              {heading}
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: accent }}>
                Click to Expand
              </span>
            </button>
          ) : (
            heading
          )}
          {pageMode && pageCount > 1 && !compact && (
            <span className="text-[10px] uppercase tracking-widest opacity-70 shrink-0">
              Page {pageIdx + 1} of {pageCount}
            </span>
          )}
        </div>

        {shown.length === 0 ? (
          <div className={`${compact ? "p-4" : "p-12"} text-center opacity-70`}>
            <Trophy className={`${compact ? "h-5 w-5" : "h-10 w-10"} mx-auto mb-2 opacity-40`} />
            <p className={compact ? "text-xs" : ""}>Scoring hasn't started yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="lb-table">
              <thead style={{ backgroundColor: headerBg }}>
                <tr className="text-xs uppercase tracking-wider">
                  {showPos && <th className={`text-left ${padX} ${padY} w-14`}>Pos</th>}
                  {showPlayer && <th className={`text-left ${padX} ${padY}`}>Player / Team</th>}
                  {!isStableford && <th className={`text-center ${padX} ${padY} w-20`}>To Par</th>}
                  {showThru && <th className={`text-right ${padX} ${padY} w-16`}>Thru</th>}
                  {priorRounds.map((r) => (
                    <th key={`h-r${r}`} className={`text-right ${padX} ${padY} w-16`}>R{r}</th>
                  ))}
                  {showToday && <th className={`text-right ${padX} ${padY} w-20`}>Today</th>}
                  {(showGross || showNet) && (
                    <th className={`text-right ${padX} ${padY} w-24`}>{isStableford ? "Pts" : "Total"}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {shown.map((row, i) => {
                  const clickable = !!onRowClick && !!row.holesByRound;
                  return (
                  <tr
                    key={`${row.name}-${i}`}
                    data-testid="lb-row"
                    onClick={clickable ? () => onRowClick!(row) : undefined}
                    className={clickable ? "cursor-pointer hover:opacity-80 transition-opacity" : undefined}
                    style={{ backgroundColor: design.row_stripe && i % 2 === 1 ? `${headerBg}66` : "transparent" }}
                  >
                    {showPos && (
                      <td className={`${padX} ${padY} font-bold`} style={{ color: i < 3 ? accent : textColor }}>
                        {positionFor(i)}
                      </td>
                    )}
                    {showPlayer && (
                      <td className={`${padX} ${padY}`}>
                        <div className="font-semibold">{row.name}</div>
                        {row.subtitle && <div className="text-xs opacity-70">{row.subtitle}</div>}
                        {row.players && row.players.length > 0 && (
                          <div className="text-xs opacity-70 truncate max-w-[300px]">{row.players.join(", ")}</div>
                        )}
                      </td>
                    )}
                    {!isStableford && (
                      <td className={`${padX} ${padY} text-center`} data-testid="lb-topar">
                        {row.total ? (
                          <span
                            className="inline-block min-w-[3rem] rounded px-2 py-1 font-mono font-bold"
                            style={{ backgroundColor: headerBg, color: accent }}
                          >
                            {formatToPar(row.total, row.parPlayed ?? coursePar)}
                          </span>
                        ) : "—"}
                      </td>
                    )}
                    {showThru && <td className={`${padX} ${padY} text-right opacity-80`}>{row.thru ? (row.thru >= 18 ? 18 : row.thru) : "—"}</td>}
                    {priorRounds.map((r) => (
                      <td key={`${row.name}-r${r}`} className={`${padX} ${padY} text-right font-mono opacity-90`}>
                        {row.roundTotals?.[r] || "—"}
                      </td>
                    ))}
                    {showToday && (
                      <td className={`${padX} ${padY} text-right font-mono`}>
                        {row.today ? formatToPar(row.today, row.parToday ?? coursePar) : "—"}
                      </td>
                    )}
                    {(showGross || showNet) && (
                      <td className={`${padX} ${padY} text-right font-mono font-bold`}>{row.total || "—"}</td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };


  const gridColsClass =
    boardColumns >= 4 ? "xl:grid-cols-4 md:grid-cols-2"
    : boardColumns === 3 ? "xl:grid-cols-3 md:grid-cols-2"
    : boardColumns === 1 ? "grid-cols-1"
    : "md:grid-cols-2";

  return (

    <div
      data-testid="lb-root"
      className={`flex flex-col ${compact ? "rounded-lg overflow-hidden border" : "min-h-screen"}`}
      style={{ backgroundColor: bg, color: textColor, fontFamily: design.font_family, fontSize }}
    >
      {topNotice}

      {scrollPos === "top" && sponsorMarquee}


      {showSponsorBanner && sponsorPos === "top" && bannerSponsor && (
        <div
          data-testid="lb-banner-top"
          className={`w-full ${compact ? "py-1.5 px-3" : "py-3 px-6"} flex items-center justify-center gap-3`}
          style={{ backgroundColor: accent, color: headerBg }}
        >
          <span className="text-[10px] uppercase tracking-widest font-semibold opacity-80">Sponsored by</span>
          {bannerSponsor.logo_url ? (
            <img src={bannerSponsor.logo_url} alt={bannerSponsor.name} className={`${compact ? "h-6" : "h-12"} max-w-[200px] object-contain`} />
          ) : (
            <div className="flex items-center gap-2">
              <Award className={compact ? "h-3 w-3" : "h-5 w-5"} />
              <span className={compact ? "text-sm font-bold" : "text-lg font-bold"}>{bannerSponsor.name}</span>
            </div>
          )}
        </div>
      )}

      <header className={`${padX} ${headerPadY}`} style={{ backgroundColor: headerBg }} data-testid="lb-header">
        <div className={`${compact ? "" : "max-w-7xl mx-auto"} flex items-center gap-4`}>
          {/* Left logo — organizer upload, falling back to the site logo. */}
          {(design.left_logo_url || logoUrl) && (
            <div className="shrink-0 rounded bg-white/95 p-1 flex items-center justify-center">
              <img
                src={design.left_logo_url || logoUrl || ""}
                alt=""
                className={`${compact ? "h-6" : "h-8 sm:h-12 md:h-16"} w-auto max-w-[60px] sm:max-w-[100px] md:max-w-[160px] object-contain`}
              />
            </div>
          )}
          <div
            className={`flex-1 min-w-0 ${
              titleAlign === "center" ? "text-center" : titleAlign === "right" ? "text-right" : "text-left"
            }`}
          >
            <h1 className={`${compact ? "text-sm" : "text-base sm:text-2xl md:text-4xl"} font-bold leading-tight tracking-tight text-balance`} style={{ color: textColor }}>
              {design.title || title}
            </h1>
            {!compact && subtitle && (
              <div className="text-xs sm:text-sm opacity-80 mt-1">{subtitle}</div>
            )}
            {!compact && (
              <p
                className={`text-xs sm:text-sm flex items-center gap-2 opacity-80 mt-1 ${
                  titleAlign === "center" ? "justify-center" : titleAlign === "right" ? "justify-end" : ""
                }`}
              >
                <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: accent }} /> Live Leaderboard
              </p>
            )}
          </div>
          {/* Right logo replaces the trophy icon when the organizer uploads one. */}
          {design.right_logo_url ? (
            <div className="shrink-0 rounded bg-white/95 p-1 flex items-center justify-center">
              <img
                src={design.right_logo_url}
                alt=""
                className={`${compact ? "h-6" : "h-8 sm:h-12 md:h-16"} w-auto max-w-[60px] sm:max-w-[100px] md:max-w-[160px] object-contain`}
              />
            </div>
          ) : (
            <Trophy className={`shrink-0 ${compact ? "h-4 w-4" : "h-6 w-6 sm:h-10 sm:w-10 md:h-12 md:w-12"}`} style={{ color: accent }} />
          )}
        </div>
        {!compact && presentedBy && (
          <div
            className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-md py-3 px-4 border"
            style={{ borderColor: `${accent}55`, backgroundColor: `${accent}12` }}
          >
            <span
              className="text-xs sm:text-sm uppercase tracking-[0.15em] font-semibold opacity-80 whitespace-nowrap"
              style={{ color: textColor }}
            >
              {presentedBy.label.replace(/:*$/, "")}:
            </span>
            {presentedBy.logoUrl ? (
              <span className="rounded bg-white/95 p-1.5 flex items-center">
                <img
                  src={presentedBy.logoUrl}
                  alt={presentedBy.name}
                  className="h-8 sm:h-12 max-w-[160px] sm:max-w-[220px] object-contain"
                />
              </span>
            ) : null}
            <span
              className="text-sm sm:text-lg font-bold text-center"
              style={{ color: textColor }}
            >
              {presentedBy.name}
            </span>
          </div>
        )}
      </header>

      <main className={`flex-1 ${compact ? "p-2" : "px-4 sm:px-6 py-6"}`}>
        <div className={`${compact ? "" : "max-w-7xl mx-auto"} grid grid-cols-1 ${showSponsorBanner && sponsorPos === "sidebar" && !compact ? "lg:grid-cols-[1fr_280px]" : ""} gap-4`}>
          {boards && boards.length > 0 ? (
            <div className={`grid grid-cols-1 ${gridColsClass} gap-4`} data-testid="lb-flight-grid">
              {boards.map((b) => renderBoard(b.key, `${b.label} Leaderboard`, b.rows, true))}
            </div>

          ) : (
            renderBoard("single", singleBoardLabel, rows)
          )}


          {((showSponsorBanner && sponsorPos === "sidebar") || (scrollPos === "sidebar" && marqueeBase.length > 0)) && !compact && (
            <aside className="space-y-4" data-testid="lb-sidebar">
              {heroImage && (
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: `${headerBg}55` }}>
                  <img src={heroImage.image_url} alt={heroImage.caption || "Tournament photo"} className="w-full h-48 object-cover" />
                  {heroImage.caption && <div className="px-3 py-2 text-xs opacity-80">{heroImage.caption}</div>}
                </div>
              )}
              {scrollPos === "sidebar" && marqueeBase.length > 0 && (
                <div className="rounded-lg p-4 overflow-hidden" style={{ backgroundColor: `${headerBg}55` }} data-testid="lb-scrolling-sponsors">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold mb-3 opacity-80">Our Sponsors</h3>
                  <div className="h-64 overflow-hidden relative">
                    <div
                      className="flex flex-col items-center gap-6 transform-gpu"
                      style={{
                        animation: `marquee-y ${loopSeconds}s linear infinite`,
                        willChange: "transform",
                        backfaceVisibility: "hidden",
                      }}
                    >
                      {[...marqueeBase, ...marqueeBase].map((s, i) => (
                        <div key={`side-${s.id}-${i}`} className="flex items-center justify-center w-full shrink-0">
                          {s.logo_url ? (
                            <img src={s.logo_url} alt={s.name} decoding="async" className="h-12 w-auto max-w-full object-contain" />
                          ) : (
                            <span className="text-sm font-semibold text-center tracking-wide">{s.name}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
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

      {design.show_ticker && design.ticker_text && (
        <div
          data-testid="lb-ticker"
          className={`overflow-hidden whitespace-nowrap ${compact ? "py-1 text-xs" : "py-2"}`}
          style={{ backgroundColor: headerBg }}
        >
          <span className={`inline-block ${tickerSpeedClass(design.ticker_speed)} px-4`}>{design.ticker_text}</span>
        </div>
      )}

      {showSponsorBanner && sponsorPos === "bottom" && bannerSponsor && (
        <div
          data-testid="lb-banner-bottom"
          className={`w-full ${compact ? "py-1.5 px-3" : "py-3 px-6"} flex items-center justify-center gap-3`}
          style={{ backgroundColor: accent, color: headerBg }}
        >
          <span className="text-[10px] uppercase tracking-widest font-semibold opacity-80">Sponsored by</span>
          {bannerSponsor.logo_url ? (
            <img src={bannerSponsor.logo_url} alt={bannerSponsor.name} className={`${compact ? "h-6" : "h-12"} max-w-[200px] object-contain`} />
          ) : (
            <span className={compact ? "text-sm font-bold" : "text-lg font-bold"}>{bannerSponsor.name}</span>
          )}
        </div>
      )}

      {scrollPos !== "top" && scrollPos !== "sidebar" && sponsorMarquee}




      {footerSponsors.length > 0 && !compact && (
        <footer className="overflow-hidden" style={{ backgroundColor: headerBg }} data-testid="lb-footer">
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
    </div>
  );
}
