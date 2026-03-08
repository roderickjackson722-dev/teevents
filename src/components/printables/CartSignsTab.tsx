import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { openPrintWindow, downloadHtmlAsPdf } from "./printUtils";
import type { Tournament, Registration } from "./types";

interface Props {
  tournament: Tournament | null;
  registrations: Registration[];
  loading: boolean;
}

function cartSignHtml(r: Registration, tournament: Tournament | null) {
  return `
    <div style="width:100%;height:5in;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid #1a5c38;border-radius:12px;padding:24px;text-align:center;position:relative;">
      ${tournament?.site_logo_url ? `<img src="${tournament.site_logo_url}" alt="" style="height:60px;object-fit:contain;margin-bottom:16px;" />` : ""}
      <div style="font-size:14px;font-weight:600;color:#666;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">${tournament?.title ?? ""}</div>
      <div style="font-size:32px;font-weight:bold;color:#1a1a1a;margin-bottom:12px;">${r.first_name} ${r.last_name}</div>
      ${r.group_number != null ? `<div style="font-size:18px;color:#1a5c38;font-weight:600;">Starting Hole: ${r.group_number}</div>` : ""}
    </div>`;
}

export default function CartSignsTab({ tournament, registrations, loading }: Props) {
  const allHtml = registrations.map((r, i) =>
    `<div style="page-break-after:${i < registrations.length - 1 ? "always" : "auto"};">${cartSignHtml(r, tournament)}</div>`
  ).join("");

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (registrations.length === 0) return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No registered players yet.</p></div>;

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Cart Signs - ${tournament?.title}`, allHtml)}>
          <Download className="h-4 w-4 mr-2" /> Save as PDF
        </Button>
        <Button onClick={() => openPrintWindow(`Cart Signs - ${tournament?.title}`, allHtml)}>
          <Printer className="h-4 w-4 mr-2" /> Print Cart Signs
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {registrations.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border-2 border-primary/30 rounded-xl p-6 flex flex-col items-center text-center gap-2">
            {tournament?.site_logo_url && <img src={tournament.site_logo_url} alt="" className="h-10 object-contain" />}
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{tournament?.title}</p>
            <p className="text-xl font-display font-bold text-foreground">{r.first_name} {r.last_name}</p>
            {r.group_number != null && <p className="text-sm font-semibold text-primary">Starting Hole: {r.group_number}</p>}
          </motion.div>
        ))}
      </div>
    </>
  );
}
