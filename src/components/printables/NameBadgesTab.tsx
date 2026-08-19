import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { openPrintWindow, downloadHtmlAsPdf, getFontImport } from "./printUtils";
import { formatTeeTime } from "./CartSignsTab";
import type { Tournament, Registration } from "./types";
import { getPrimaryColor, getFontFamily } from "./types";
import type { RegistrationGroupRow } from "./teamGrouping";

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

function badgeHtml(r: Registration, tournament: Tournament | null, groups: RegistrationGroupRow[], teeTimeStart: boolean) {
  const color = getPrimaryColor(tournament);
  const font = getFontFamily(tournament);
  const tee = formatTeeTime(teeTimeFor(r, groups));
  const startLine = teeTimeStart
    ? tee
      ? `<div style="font-size:12px;color:${color};font-weight:700;margin-top:4px;">Tee Time ${tee}</div>`
      : ""
    : r.group_number != null
      ? `<div style="font-size:11px;color:${color};font-weight:600;margin-top:4px;">Hole ${r.group_number}</div>`
      : "";
  return `
    <div style="width:3.5in;height:2.25in;border:1px solid #ccc;border-radius:8px;padding:16px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;margin:8px;page-break-inside:avoid;font-family:${font};">
      ${tournament?.site_logo_url ? `<img src="${tournament.site_logo_url}" alt="" style="height:28px;object-fit:contain;margin-bottom:6px;" />` : ""}
      <div style="font-size:9px;font-weight:600;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">${tournament?.title ?? ""}</div>
      <div style="font-size:22px;font-weight:bold;color:#1a1a1a;">${r.first_name} ${r.last_name}</div>
      ${startLine}
    </div>`;
}

export default function NameBadgesTab({ tournament, registrations, loading, groups = [] }: Props) {
  const fontImport = getFontImport(tournament?.printable_font ?? null);
  const teeTimeStart = ((tournament as any)?.pairings_start_format || "") === "tee_times";
  const allHtml = `<div style="display:flex;flex-wrap:wrap;justify-content:center;">${registrations
    .map((r) => badgeHtml(r, tournament, groups, teeTimeStart))
    .join("")}</div>`;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (registrations.length === 0) return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No registered players yet.</p></div>;

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {teeTimeStart
            ? "Badges show each player's tee time (set in Players & Pairings)."
            : "Badges show each player's starting hole (shotgun start)."}
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
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-4 flex flex-col items-center text-center gap-1">
              {tournament?.site_logo_url && <img src={tournament.site_logo_url} alt="" className="h-6 object-contain" />}
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{tournament?.title}</p>
              <p className="text-base font-display font-bold text-foreground">{r.first_name} {r.last_name}</p>
              {teeTimeStart
                ? tee && <p className="text-xs font-bold text-primary">Tee Time {tee}</p>
                : r.group_number != null && <p className="text-xs font-semibold text-primary">Hole {r.group_number}</p>}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
