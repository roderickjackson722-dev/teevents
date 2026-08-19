import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { openPrintWindow, downloadHtmlAsPdf, getFontImport } from "./printUtils";
import { formatTeeTime } from "./CartSignsTab";
import type { Tournament, Registration } from "./types";
import { getPrimaryColor, getFontFamily, startingHoleOf, getPrintLogo } from "./types";
import type { RegistrationGroupRow } from "./teamGrouping";
import PrintableSettings, { getDefaultOptions, type PrintableOptions } from "./PrintableSettings";

interface Props {
  tournament: Tournament | null;
  registrations: Registration[];
  loading: boolean;
  groups?: RegistrationGroupRow[];
}

/** Tee time for a player: the group's saved tee time, else the player's own */
function teeTimeFor(r: Registration, groups: RegistrationGroupRow[]): string | null {
  const g = groups.find((x) => x.group_number != null && x.group_number === r.group_number);
  return g?.tee_time || ((r as any).tee_time as string | null) || null;
}

function badgeHtml(r: Registration, tournament: Tournament | null, groups: RegistrationGroupRow[], opts: PrintableOptions) {
  const color = getPrimaryColor(tournament);
  const font = getFontFamily(tournament);
  const tee = formatTeeTime(teeTimeFor(r, groups));
  const hole = startingHoleOf(r as any);
  const logo = getPrintLogo(tournament);

  const lines = [
    opts.showTeeTime && tee
      ? `<div style="font-size:12px;color:${color};font-weight:700;margin-top:4px;">Tee Time ${tee}</div>`
      : "",
    opts.showStartingHole && hole != null
      ? `<div style="font-size:11px;color:${color};font-weight:600;margin-top:2px;">Hole ${hole}</div>`
      : "",
    opts.showFlight && r.flight_name
      ? `<div style="font-size:11px;color:${color};font-weight:600;margin-top:2px;">${r.flight_name}</div>`
      : "",
  ].join("");

  return `
    <div style="width:3.5in;height:2.25in;border:1px solid #ccc;border-radius:8px;padding:16px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;margin:8px;page-break-inside:avoid;font-family:${font};">
      ${opts.showLogo && logo ? `<img src="${logo}" alt="" style="height:28px;object-fit:contain;margin-bottom:6px;" />` : ""}
      ${opts.showTournamentTitle ? `<div style="font-size:9px;font-weight:600;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">${tournament?.title ?? ""}</div>` : ""}
      <div style="font-size:22px;font-weight:bold;color:#1a1a1a;">${r.first_name} ${r.last_name}</div>
      ${lines}
    </div>`;
}

export default function NameBadgesTab({ tournament, registrations, loading, groups = [] }: Props) {
  const [opts, setOpts] = useState<PrintableOptions>(() => getDefaultOptions(tournament));

  useEffect(() => {
    setOpts(getDefaultOptions(tournament));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament?.id, (tournament as any)?.pairings_start_format]);

  const fontImport = getFontImport(tournament?.printable_font ?? null);
  const allHtml = `<div style="display:flex;flex-wrap:wrap;justify-content:center;">${registrations
    .map((r) => badgeHtml(r, tournament, groups, opts))
    .join("")}</div>`;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (registrations.length === 0) return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No registered players yet.</p></div>;

  return (
    <>
      <PrintableSettings
        options={opts}
        onChange={setOpts}
        variant="badge"
        showTeeTimeToggle
        showFlightToggle
        tournamentId={tournament?.id}
        logoUrl={getPrintLogo(tournament)}
      />

      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Toggle tee time, starting hole and flight on the badges in Customize Design.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Name Badges - ${tournament?.title}`, allHtml, fontImport)}>
            <Download className="h-4 w-4 mr-2" /> Save as PDF
          </Button>
          <Button onClick={() => openPrintWindow(`Name Badges - ${tournament?.title}`, allHtml, fontImport)}>
            <Printer className="h-4 w-4 mr-2" /> Print Name Badges
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {registrations.map((r) => {
          const tee = formatTeeTime(teeTimeFor(r, groups));
          const hole = startingHoleOf(r as any);
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-4 flex flex-col items-center text-center gap-1">
              {opts.showLogo && getPrintLogo(tournament) && (
                <img src={getPrintLogo(tournament) as string} alt="" className="h-6 object-contain" />
              )}
              {opts.showTournamentTitle && (
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{tournament?.title}</p>
              )}
              <p className="text-base font-display font-bold text-foreground">{r.first_name} {r.last_name}</p>
              {opts.showTeeTime && tee && <p className="text-xs font-bold text-primary">Tee Time {tee}</p>}
              {opts.showStartingHole && hole != null && <p className="text-xs font-semibold text-primary">Hole {hole}</p>}
              {opts.showFlight && r.flight_name && <p className="text-xs font-semibold text-primary">{r.flight_name}</p>}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
