import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Download } from "lucide-react";
import { motion } from "framer-motion";
import { openPrintWindow, downloadHtmlAsPdf, getFontImport, scorecardCss, printLogoHtml } from "./printUtils";
import { PRINT_TARGETS, sizeLabel } from "./printLayout";
import PrintFitCheck from "./PrintFitCheck";
import PrintLogo from "./PrintLogo";
import type { Tournament, Registration } from "./types";
import { getPrimaryColor, getPrintLogo } from "./types";
import type { PrintableOptions } from "./PrintableSettings";
import { buildTeams, playerName, type RegistrationGroupRow } from "./teamGrouping";

interface CourseDataProp {
  hole_pars: number[] | null;
  stroke_indexes: number[] | null;
  hole_distances: number[] | null;
  name: string | null;
  tee_name: string | null;
}

interface Props {
  tournament: Tournament | null;
  registrations: Registration[];
  groups?: RegistrationGroupRow[];
  numHoles: 9 | 18;
  opts: PrintableOptions;
  courseData?: CourseDataProp | null;
  /** Public tournament slug, used to build the score-entry QR link */
  slug?: string;
}

/** Link to the score-entry page (code pre-filled when the team has one). */
function scoringUrlFor(slug: string | undefined, scoringCode: string | null | undefined): string {
  if (!slug || typeof window === "undefined") return "";
  const base = `${window.location.origin}/t/${slug}/scoring`;
  return scoringCode ? `${base}?code=${scoringCode}` : base;
}

function qrHtml(url: string, size = 88) {
  return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&margin=0&data=${encodeURIComponent(url)}" alt="Scan to enter scores" style="width:${size}px;height:${size}px;display:block;" />`;
}

const FONT_MAP: Record<string, string> = {
  georgia: "'Georgia', serif",
  helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  roboto: "'Roboto', 'Helvetica Neue', sans-serif",
  courier: "'Courier New', Courier, monospace",
};

function holePar(tournament: Tournament | null, i: number, numHoles: number, courseData?: CourseDataProp | null): number {
  if (courseData?.hole_pars?.[i] != null) return courseData.hole_pars[i]!;
  if (tournament?.hole_pars?.[i] != null) return tournament.hole_pars[i]!;
  const totalPar = tournament?.course_par ?? (numHoles === 9 ? 36 : 72);
  return Math.round(totalPar / numHoles);
}

interface TeamEdit {
  teamName: string;
  playersLine: string;
}

function teamScorecardHtml(
  edit: TeamEdit,
  scoringCode: string | null | undefined,
  groupNumber: number | null,
  tournament: Tournament | null,
  numHoles: number,
  opts: PrintableOptions,
  courseData?: CourseDataProp | null,
  scoringUrl?: string,
) {
  const color = getPrimaryColor(tournament);
  const font = FONT_MAP[opts.font] || FONT_MAP.georgia;
  const bold = opts.layout === "bold";
  const border = bold ? `3px solid ${color}` : opts.layout === "modern" ? "1px solid #e0e0e0" : `2px solid ${color}`;

  const pars = Array.from({ length: numHoles }, (_, i) => holePar(tournament, i, numHoles, courseData));
  const dateStr = (tournament as any)?.date
    ? new Date(`${(tournament as any).date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  // Single line of holes (all 18 across) with OUT / IN / TOT summary columns
  const cell = (c: string, extra = "") =>
    `<td style="border:1px solid #999;padding:2px 2px;text-align:center;font-size:10px;${extra}">${c}</td>`;
  const idx = Array.from({ length: numHoles }, (_, i) => i);
  const out = pars.slice(0, 9).reduce((s, p) => s + (p || 0), 0);
  const inn = numHoles === 18 ? pars.slice(9, 18).reduce((s, p) => s + (p || 0), 0) : 0;
  const totals: Array<[string, number]> =
    numHoles === 18 ? [["OUT", out], ["IN", inn], ["TOT", out + inn]] : [["OUT", out]];

  const tables = `
      <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
        <tr style="background:#f0f0f0;">
          ${cell("Hole", "font-weight:700;text-align:left;width:0.7in;")}
          ${idx.map((i) => cell(String(i + 1), "font-weight:700;")).join("")}
          ${totals.map(([l]) => cell(l, "font-weight:700;background:#e4e4e4;")).join("")}
        </tr>
        <tr>
          ${cell("Par", "font-weight:600;text-align:left;color:#555;")}
          ${idx.map((i) => cell(String(pars[i] ?? ""), "color:#555;")).join("")}
          ${totals.map(([, v]) => cell(String(v), "font-weight:600;color:#555;")).join("")}
        </tr>
        <tr>
          ${cell("Team Score", `font-weight:700;text-align:left;color:${color};font-size:9px;`)}
          ${idx.map(() => cell("&nbsp;", "height:0.38in;")).join("")}
          ${totals.map(() => cell("&nbsp;", "background:#fafafa;")).join("")}
        </tr>
      </table>`;

  const qrBox = scoringUrl
    ? `<div style="display:flex;align-items:center;gap:8px;border:1px solid ${color};border-radius:6px;padding:4px 6px;">
         ${qrHtml(scoringUrl, 62)}
         <div style="line-height:1.3;">
           <div style="font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.5px;">Scan to Enter Scores</div>
           ${scoringCode ? `<div style="font-size:11px;font-weight:700;color:#1a1a1a;">Code: ${scoringCode}</div>` : `<div style="font-size:9px;color:#666;">Enter your scoring code</div>`}
         </div>
       </div>`
    : "";

  return `
    <div style="page-break-inside:avoid;border:${border};border-radius:8px;padding:0.14in;font-family:${font};display:flex;flex-direction:column;flex:1;min-height:0;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;border-bottom:1px solid #ddd;padding-bottom:5px;margin-bottom:6px;">
        <div>
          <div style="font-size:13px;font-weight:bold;color:#1a1a1a;">${opts.showTournamentTitle ? `${tournament?.title ?? ""} &ndash; ` : ""}${edit.teamName}</div>
          ${dateStr ? `<div style="font-size:9px;color:#666;">Date: ${dateStr}</div>` : ""}
          ${opts.showCourseName && (courseData?.name || tournament?.course_name) ? `<div style="font-size:9px;color:#666;">${courseData?.name || tournament?.course_name}${courseData?.tee_name ? ` &bull; ${courseData.tee_name} Tees` : ""}</div>` : ""}
          <div style="font-size:9px;color:#444;">Players: ${edit.playersLine}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${qrBox}
          ${opts.showLogo ? printLogoHtml(getPrintLogo(tournament), { heightCss: "0.42in", color: "#999" }) : ""}
        </div>
      </div>
      <div style="flex:1;min-height:0;">${tables}</div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:${color};font-weight:600;margin-top:4px;">
        <span>${scoringCode ? `Scoring Code: ${scoringCode}` : ""}</span>
        <span>${opts.showStartingHole && groupNumber != null ? `Starting Hole: ${groupNumber}` : ""}</span>
      </div>
    </div>`;
}

export default function TeamScorecards({ tournament, registrations, groups = [], numHoles, opts, courseData, slug }: Props) {
  const teams = useMemo(() => buildTeams(registrations, groups), [registrations, groups]);
  const [edits, setEdits] = useState<Record<string, TeamEdit>>({});
  const [perPage, setPerPage] = useState<1 | 2 | 3>(2);

  useEffect(() => {
    const next: Record<string, TeamEdit> = {};
    teams.forEach((t) => {
      next[t.key] = { teamName: t.teamName, playersLine: t.players.map(playerName).join(", ") };
    });
    setEdits(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(teams.map((t) => `${t.key}:${t.teamName}:${t.players.map((p) => p.id).join(",")}`))]);

  const fontImport = getFontImport(opts.font);
  const fitOptions = { scale: opts.printScale, marginIn: opts.printMarginIn };
  const pageCss = scorecardCss(fitOptions);

  const chunks: typeof teams[] = [];
  for (let i = 0; i < teams.length; i += perPage) chunks.push(teams.slice(i, i + perPage));

  const allHtml = chunks
    .map((chunk, ci) => {
      const cards = chunk
        .map((t) => {
          const e = edits[t.key] || { teamName: t.teamName, playersLine: "" };
          return teamScorecardHtml(
            e, t.scoringCode, t.groupNumber, tournament, numHoles, opts, courseData,
            scoringUrlFor(slug, t.scoringCode),
          );
        })
        .join("");
      return `<div class="print-page" style="page-break-after:${ci < chunks.length - 1 ? "always" : "auto"};"><div style="display:flex;flex-direction:column;gap:0.14in;">${cards}</div></div>`;
    })
    .join("");

  const update = (key: string, patch: Partial<TeamEdit>) =>
    setEdits((prev) => ({ ...prev, [key]: { ...(prev[key] || { teamName: "", playersLine: "" }), ...patch } }));

  if (teams.length === 0) {
    return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No teams to print yet.</p></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {perPage} scorecard{perPage > 1 ? "s" : ""} per sheet &bull; prints landscape at {sizeLabel(PRINT_TARGETS.scorecard)} &bull; all {numHoles} holes on one line
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Per sheet:</span>
            {([1, 2, 3] as const).map((n) => (
              <Button key={n} size="sm" variant={perPage === n ? "default" : "outline"} className="h-7 px-2.5 text-xs" onClick={() => setPerPage(n)}>
                {n}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-start">
          <PrintFitCheck getBodyHtml={() => allHtml} target={PRINT_TARGETS.scorecard} fitOptions={fitOptions} />
          <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Team Scorecards - ${tournament?.title}`, allHtml, fontImport, pageCss)}>
            <Download className="h-4 w-4 mr-2" /> Save as PDF
          </Button>
          <Button onClick={() => openPrintWindow(`Team Scorecards - ${tournament?.title}`, allHtml, fontImport, pageCss)}>
            <Printer className="h-4 w-4 mr-2" /> Generate Scorecards
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {teams.map((t) => {
          const e = edits[t.key] || { teamName: t.teamName, playersLine: "" };
          return (
            <motion.div key={t.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Team:</p>
                  <Input value={e.teamName} onChange={(ev) => update(t.key, { teamName: ev.target.value })} className="text-sm" placeholder="Team name" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Team Score Line (players):</p>
                  <Input value={e.playersLine} onChange={(ev) => update(t.key, { playersLine: ev.target.value })} className="text-sm" placeholder="Player 1, Player 2, ..." />
                </div>
              </div>

              <div className="rounded-lg border-2 border-primary/30 p-3 bg-muted/20 overflow-x-auto">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-display font-bold text-foreground">
                      {opts.showTournamentTitle && tournament?.title ? `${tournament.title} – ` : ""}{e.teamName}
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-2">Players: {e.playersLine}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {scoringUrlFor(slug, t.scoringCode) && (
                      <div className="flex items-center gap-2 border border-primary rounded-md p-1.5">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=124x124&margin=0&data=${encodeURIComponent(scoringUrlFor(slug, t.scoringCode))}`}
                          alt="Scan to enter scores"
                          className="h-14 w-14"
                          loading="lazy"
                        />
                        <div className="leading-tight">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-primary">Scan to Enter Scores</p>
                          <p className="text-[11px] font-bold text-foreground">{t.scoringCode ? `Code: ${t.scoringCode}` : "Enter your scoring code"}</p>
                        </div>
                      </div>
                    )}
                    {opts.showLogo && (
                      <PrintLogo src={getPrintLogo(tournament)} placeholderWhenMissing className="h-10 shrink-0" />
                    )}
                  </div>
                </div>
                <table className="w-full text-[11px] border-collapse">
                  <tbody>
                    <tr className="bg-muted/50">
                      <td className="border border-border px-1 py-0.5 font-bold">Hole</td>
                      {Array.from({ length: numHoles }, (_, i) => (
                        <td key={i} className="border border-border px-1 py-0.5 text-center font-semibold">{i + 1}</td>
                      ))}
                      <td className="border border-border px-1 py-0.5 text-center font-bold">TOT</td>
                    </tr>
                    <tr>
                      <td className="border border-border px-1 py-0.5 font-semibold text-muted-foreground">Par</td>
                      {Array.from({ length: numHoles }, (_, i) => (
                        <td key={i} className="border border-border px-1 py-0.5 text-center text-muted-foreground">{holePar(tournament, i, numHoles, courseData)}</td>
                      ))}
                      <td className="border border-border px-1 py-0.5 text-center text-muted-foreground font-semibold">
                        {Array.from({ length: numHoles }, (_, i) => holePar(tournament, i, numHoles, courseData)).reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-border px-1 py-2 font-bold text-primary whitespace-nowrap">Team Score</td>
                      {Array.from({ length: numHoles + 1 }, (_, i) => (
                        <td key={i} className="border border-border px-1 py-2">&nbsp;</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                <div className="flex justify-between text-[11px] text-primary font-semibold mt-2">
                  <span>{t.scoringCode ? `Scoring Code: ${t.scoringCode}` : ""}</span>
                  <span>{opts.showStartingHole && t.groupNumber != null ? `Starting Hole: ${t.groupNumber}` : ""}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
