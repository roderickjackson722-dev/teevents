import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { openPrintWindow, downloadHtmlAsPdf, getFontImport } from "./printUtils";
import type { Tournament, Sponsor } from "./types";
import { getPrimaryColor, getSecondaryColor, getFontFamily } from "./types";

interface Props {
  tournament: Tournament | null;
  sponsors: Sponsor[];
  loading: boolean;
}

function sponsorSignHtml(s: Sponsor, tournament: Tournament | null) {
  const primary = getPrimaryColor(tournament);
  const secondary = getSecondaryColor(tournament);
  const font = getFontFamily(tournament);
  const tierColors: Record<string, string> = {
    platinum: "#1a1a1a", gold: secondary, silver: "#6b7280", bronze: "#92400e",
  };
  const color = tierColors[s.tier] || primary;

  return `
    <div style="page-break-after:always;width:100%;height:7in;display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid ${color};border-radius:12px;padding:40px;text-align:center;font-family:${font};">
      ${tournament?.site_logo_url ? `<img src="${tournament.site_logo_url}" alt="" style="height:50px;object-fit:contain;margin-bottom:16px;" />` : ""}
      <div style="font-size:12px;font-weight:600;color:#666;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">${tournament?.title ?? ""}</div>
      <div style="font-size:14px;font-weight:600;color:${color};letter-spacing:2px;text-transform:uppercase;margin-bottom:24px;">${s.tier} Sponsor</div>
      ${s.logo_url ? `<img src="${s.logo_url}" alt="${s.name}" style="max-height:120px;max-width:80%;object-fit:contain;margin-bottom:24px;" />` : ""}
      <div style="font-size:36px;font-weight:bold;color:#1a1a1a;margin-bottom:8px;">${s.name}</div>
      ${s.website_url ? `<div style="font-size:14px;color:#666;">${s.website_url}</div>` : ""}
      <div style="margin-top:auto;font-size:11px;color:#aaa;">Thank you for your generous support!</div>
    </div>`;
}

export default function SponsorSignsTab({ tournament, sponsors, loading }: Props) {
  const fontImport = getFontImport(tournament?.printable_font ?? null);
  const allHtml = sponsors.map((s) => sponsorSignHtml(s, tournament)).join("");

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (sponsors.length === 0) return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No sponsors added yet. Add sponsors in the Sponsors tab.</p></div>;

  const tierOrder = ["platinum", "gold", "silver", "bronze"];
  const sorted = [...sponsors].sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Sponsor Signs - ${tournament?.title}`, allHtml, fontImport)}>
          <Download className="h-4 w-4 mr-2" /> Save as PDF
        </Button>
        <Button onClick={() => openPrintWindow(`Sponsor Signs - ${tournament?.title}`, allHtml, fontImport)}>
          <Printer className="h-4 w-4 mr-2" /> Print Sponsor Signs
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {sorted.map((s) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border-2 border-primary/30 rounded-xl p-6 flex flex-col items-center text-center gap-3">
            {tournament?.site_logo_url && <img src={tournament.site_logo_url} alt="" className="h-8 object-contain" />}
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{tournament?.title}</p>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">{s.tier} Sponsor</span>
            {s.logo_url && <img src={s.logo_url} alt={s.name} className="h-16 max-w-[80%] object-contain" />}
            <p className="text-xl font-display font-bold text-foreground">{s.name}</p>
            {s.website_url && <p className="text-xs text-muted-foreground">{s.website_url}</p>}
          </motion.div>
        ))}
      </div>
    </>
  );
}
