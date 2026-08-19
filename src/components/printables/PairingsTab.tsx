import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { openPrintWindow, downloadHtmlAsPdf, getFontImport, printLogoHtml } from "./printUtils";
import { formatTeeTime } from "./CartSignsTab";
import type { Tournament, Registration } from "./types";
import { getPrimaryColor, getPrintLogo } from "./types";
import PrintableSettings, { getDefaultOptions, type PrintableOptions } from "./PrintableSettings";
import { buildTeams, playerName, type RegistrationGroupRow } from "./teamGrouping";
import { useState } from "react";

interface Props {
  tournament: Tournament | null;
  registrations: Registration[];
  loading: boolean;
  groups?: RegistrationGroupRow[];
}

const FONT_MAP: Record<string, string> = {
  georgia: "'Georgia', serif",
  helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  roboto: "'Roboto', 'Helvetica Neue', sans-serif",
  courier: "'Courier New', Courier, monospace",
};

const PAGE_CSS = `
  @page { size: letter portrait; margin: 0.5in; }
  table { border-collapse: collapse; width: 100%; }
  tr, .pair-row { page-break-inside: avoid; }
`;

export default function PairingsTab({ tournament, registrations, loading, groups = [] }: Props) {
  const [opts, setOpts] = useState<PrintableOptions>(() => getDefaultOptions(tournament));
  const color = getPrimaryColor(tournament);
  const font = FONT_MAP[opts.font] || FONT_MAP.georgia;

  const teams = useMemo(() => buildTeams(registrations, groups), [registrations, groups]);

  const rowsHtml = teams
    .map((t) => {
      const tee = formatTeeTime(t.teeTime);
      const flights = Array.from(
        new Set(t.players.map((p) => p.flight_name).filter(Boolean) as string[]),
      ).join(", ");
      return `<tr class="pair-row">
        <td style="border:1px solid #ddd;padding:6px 8px;text-align:center;font-weight:700;color:${color};width:0.9in;">${t.startingHole ?? "—"}</td>
        ${opts.showTeeTime ? `<td style="border:1px solid #ddd;padding:6px 8px;text-align:center;width:1.1in;">${tee || "—"}</td>` : ""}
        <td style="border:1px solid #ddd;padding:6px 8px;font-weight:600;">${t.teamName}</td>
        <td style="border:1px solid #ddd;padding:6px 8px;">${t.players.map(playerName).join(" &bull; ")}</td>
        ${opts.showFlight ? `<td style="border:1px solid #ddd;padding:6px 8px;width:1.4in;">${flights || "—"}</td>` : ""}
      </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:${font};color:#1a1a1a;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div>
          ${opts.showTournamentTitle ? `<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;font-weight:600;">${tournament?.title ?? ""}</div>` : ""}
          <div style="font-size:22px;font-weight:bold;color:${color};">Tee Times &amp; Pairings</div>
          ${opts.showCourseName && tournament?.course_name ? `<div style="font-size:12px;color:#666;">${tournament.course_name}</div>` : ""}
        </div>
        ${opts.showLogo ? printLogoHtml(getPrintLogo(tournament), { heightCss: "48px" }) : ""}
      </div>
      <table>
        <tr style="background:#f2f2f2;">
          <th style="border:1px solid #ddd;padding:6px 8px;font-size:11px;text-transform:uppercase;">Hole</th>
          ${opts.showTeeTime ? `<th style="border:1px solid #ddd;padding:6px 8px;font-size:11px;text-transform:uppercase;">Tee Time</th>` : ""}
          <th style="border:1px solid #ddd;padding:6px 8px;font-size:11px;text-transform:uppercase;text-align:left;">Group</th>
          <th style="border:1px solid #ddd;padding:6px 8px;font-size:11px;text-transform:uppercase;text-align:left;">Players</th>
          ${opts.showFlight ? `<th style="border:1px solid #ddd;padding:6px 8px;font-size:11px;text-transform:uppercase;text-align:left;">Flight</th>` : ""}
        </tr>
        ${rowsHtml}
      </table>
    </div>`;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (teams.length === 0) return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No pairings yet.</p></div>;

  return (
    <>
      <PrintableSettings options={opts} onChange={setOpts} showCourseName showTeeTimeToggle showFlightToggle tournamentId={tournament?.id} logoUrl={getPrintLogo(tournament)} />

      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Pairings - ${tournament?.title}`, html, getFontImport(opts.font), PAGE_CSS)}>
          <Download className="h-4 w-4 mr-2" /> Save as PDF
        </Button>
        <Button onClick={() => openPrintWindow(`Pairings - ${tournament?.title}`, html, getFontImport(opts.font), PAGE_CSS)}>
          <Printer className="h-4 w-4 mr-2" /> Print Pairings ({teams.length})
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2 text-center">Hole</th>
              {opts.showTeeTime && <th className="px-3 py-2 text-center">Tee Time</th>}
              <th className="px-3 py-2 text-left">Group</th>
              <th className="px-3 py-2 text-left">Players</th>
              {opts.showFlight && <th className="px-3 py-2 text-left">Flight</th>}
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.key} className="border-t border-border">
                <td className="px-3 py-2 text-center font-bold text-primary">{t.startingHole ?? "—"}</td>
                {opts.showTeeTime && <td className="px-3 py-2 text-center">{formatTeeTime(t.teeTime) || "—"}</td>}
                <td className="px-3 py-2 font-medium text-foreground">{t.teamName}</td>
                <td className="px-3 py-2 text-muted-foreground">{t.players.map(playerName).join(" • ")}</td>
                {opts.showFlight && (
                  <td className="px-3 py-2 text-muted-foreground">
                    {Array.from(new Set(t.players.map((p) => p.flight_name).filter(Boolean) as string[])).join(", ") || "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
