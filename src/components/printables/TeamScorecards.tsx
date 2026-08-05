import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Download } from "lucide-react";
import { motion } from "framer-motion";
import { openPrintWindow, downloadHtmlAsPdf, getFontImport, scorecardCss, printLogoHtml } from "./printUtils";
import { PRINT_TARGETS } from "./printLayout";
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
) {
  const color = getPrimaryColor(tournament);
  const font = FONT_MAP[opts.font] || FONT_MAP.georgia;
  const bold = opts.layout === "bold";
  const border = bold ? `3px solid ${color}` : opts.layout === "modern" ? "1px solid #e0e0e0" : `2px solid ${color}`;

  const pars = Array.from({ length: numHoles }, (_, i) => holePar(tournament, i, numHoles, courseData));
  const dateStr = (tournament as any)?.date
    ? new Date(`${(tournament as any).date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  const nineTable = (start: number, count: number, label: string) => {
    const idx = Array.from({ length: count }, (_, i) => start + i);
    const sum = idx.reduce((s, i) => s + (pars[i] || 0), 0);
    const cell = (c: string, extra = "") => `<td style="border:1px solid #999;padding:3px 4px;text-align:center;font-size:9px;${extra}">${c}</td>`;
    return `
      <table style="border-collapse:collapse;width:100%;margin-bottom:6px;">
        <tr style="background:#f0f0f0;">
          ${cell("Hole", "font-weight:700;text-align:left;width:70px;")}
          ${idx.map((i) => cell(String(i + 1), "font-weight:700;")).join("")}
          ${cell(label, "font-weight:700;background:#e4e4e4;")}
        </tr>
        <tr>
          ${cell("Par", "font-weight:600;text-align:left;color:#555;")}
          ${idx.map((i) => cell(String(pars[i] ?? ""), "color:#555;")).join("")}
          ${cell(String(sum), "font-weight:600;color:#555;")}
        </tr>
        <tr>
          ${cell("Team Score", `font-weight:700;text-align:left;color:${color};`)}
          ${idx.map(() => cell("&nbsp;", "height:26px;")).join("")}
          ${cell("&nbsp;", "background:#fafafa;")}
        </tr>
      </table>`;
  };

  const tables = numHoles === 18
    ? nineTable(0, 9, "Out") + nineTable(9, 9, "In")
    : nineTable(0, 9, "Out");

  return `
    <div style="width:100%;height:100%;page-break-inside:avoid;border:${border};border-radius:8px;padding:0.18in;font-family:${font};display:flex;flex-direction:column;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:8px;">
        <div>
          <div style="font-size:14px;font-weight:bold;color:#1a1a1a;">${opts.showTournamentTitle ? `${tournament?.title ?? ""} &ndash; ` : ""}${edit.teamName}</div>
          ${dateStr ? `<div style="font-size:10px;color:#666;">Date: ${dateStr}</div>` : ""}
          ${opts.showCourseName && (courseData?.name || tournament?.course_name) ? `<div style="font-size:10px;color:#666;">${courseData?.name || tournament?.course_name}${courseData?.tee_name ? ` &bull; ${courseData.tee_name} Tees` : ""}</div>` : ""}
          <div style="font-size:10px;color:#444;">Players: ${edit.playersLine}</div>
        </div>
        ${opts.showLogo ? printLogoHtml(getPrintLogo(tournament), { heightCss: "0.5in", color: "#999" }) : ""}
      </div>
      <div style="flex:1;">${tables}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:${color};font-weight:600;">
        <span>${scoringCode ? `Scoring Code: ${scoringCode}` : ""}</span>
        <span>${opts.showStartingHole && groupNumber != null ? `Starting Hole: ${groupNumber}` : ""}</span>
      </div>
    </div>`;
}

export default function TeamScorecards({ tournament, registrations, groups = [], numHoles, opts, courseData }: Props) {
  const teams = useMemo(() => buildTeams(registrations, groups), [registrations, groups]);
  const [edits, setEdits] = useState<Record<string, TeamEdit>>({});

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
  const allHtml = teams
    .map((t, i) => {
      const e = edits[t.key] || { teamName: t.teamName, playersLine: "" };
      const html = teamScorecardHtml(e, t.scoringCode, t.groupNumber, tournament, numHoles, opts, courseData);
      return `<div class="print-page" style="page-break-after:${i < teams.length - 1 ? "always" : "auto"};">${html}</div>`;
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
        <p className="text-xs text-muted-foreground">
          One scorecard per team with a single team score line &bull; prints at 6&quot; H &times; 8&quot; W
        </p>
        <div className="flex gap-2 items-start">
          <PrintFitCheck getBodyHtml={() => allHtml} target={PRINT_TARGETS.scorecard} fitOptions={fitOptions} />
          <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Team Scorecards - ${tournament?.title}`, allHtml, fontImport, SCORECARD_PAGE_CSS)}>
            <Download className="h-4 w-4 mr-2" /> Save as PDF
          </Button>
          <Button onClick={() => openPrintWindow(`Team Scorecards - ${tournament?.title}`, allHtml, fontImport, SCORECARD_PAGE_CSS)}>
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
                  {opts.showLogo && (
                    <PrintLogo src={getPrintLogo(tournament)} placeholderWhenMissing className="h-10 shrink-0" />
                  )}
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
