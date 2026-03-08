import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { openPrintWindow, downloadHtmlAsPdf } from "./printUtils";
import type { Tournament, Registration } from "./types";
import { getPrimaryColor } from "./types";

interface Props {
  tournament: Tournament | null;
  registrations: Registration[];
  loading: boolean;
}

function scorecardHtml(r: Registration, tournament: Tournament | null, numHoles: number) {
  const par = tournament?.course_par ?? (numHoles === 9 ? 36 : 72);
  const parPerHole = Math.round(par / numHoles);
  const color = getPrimaryColor(tournament);

  const holeCells = Array.from({ length: numHoles }, (_, i) =>
    `<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-size:12px;font-weight:600;width:36px;">${i + 1}</td>`
  ).join("");

  const parCells = Array.from({ length: numHoles }, () =>
    `<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-size:11px;color:#666;">${parPerHole}</td>`
  ).join("");

  const emptyCells = Array.from({ length: numHoles }, () =>
    `<td style="border:1px solid #ccc;padding:10px 6px;text-align:center;">&nbsp;</td>`
  ).join("");

  return `
    <div style="page-break-inside:avoid;margin-bottom:24px;border:2px solid ${color};border-radius:8px;padding:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div>
          <div style="font-size:10px;font-weight:600;color:#666;letter-spacing:2px;text-transform:uppercase;">${tournament?.title ?? ""}</div>
          <div style="font-size:18px;font-weight:bold;">${r.first_name} ${r.last_name}</div>
          ${tournament?.course_name ? `<div style="font-size:12px;color:#666;">${tournament.course_name} &bull; Par ${par} &bull; ${numHoles} Holes</div>` : ""}
        </div>
        ${tournament?.site_logo_url ? `<img src="${tournament.site_logo_url}" style="height:40px;object-fit:contain;" />` : ""}
      </div>
      <div style="overflow-x:auto;">
        <table style="border-collapse:collapse;width:100%;">
          <tr style="background:#f5f5f5;">${holeCells}<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-size:12px;font-weight:700;background:#e8e8e8;">TOT</td></tr>
          <tr>${parCells}<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-size:11px;color:#666;font-weight:600;">${par}</td></tr>
          <tr>${emptyCells}<td style="border:1px solid #ccc;padding:10px 6px;text-align:center;">&nbsp;</td></tr>
        </table>
      </div>
      ${r.group_number != null ? `<div style="margin-top:8px;font-size:11px;color:${color};">Starting Hole: ${r.group_number}</div>` : ""}
    </div>`;
}

export default function ScorecardsTab({ tournament, registrations, loading }: Props) {
  const [numHoles, setNumHoles] = useState<9 | 18>(18);
  const par = tournament?.course_par ?? (numHoles === 9 ? 36 : 72);
  const parPerHole = Math.round(par / numHoles);

  const allHtml = registrations.map((r) => scorecardHtml(r, tournament, numHoles)).join("");

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (registrations.length === 0) return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No registered players yet.</p></div>;

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Holes:</span>
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setNumHoles(9)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${numHoles === 9 ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
            >
              9 Holes
            </button>
            <button
              onClick={() => setNumHoles(18)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${numHoles === 18 ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
            >
              18 Holes
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Scorecards - ${tournament?.title}`, allHtml)}>
            <Download className="h-4 w-4 mr-2" /> Save as PDF
          </Button>
          <Button onClick={() => openPrintWindow(`Scorecards - ${tournament?.title}`, allHtml)}>
            <Printer className="h-4 w-4 mr-2" /> Print Scorecards
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        {registrations.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border-2 border-primary/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{tournament?.title}</p>
                <p className="text-lg font-display font-bold text-foreground">{r.first_name} {r.last_name}</p>
                {tournament?.course_name && (
                  <p className="text-xs text-muted-foreground">{tournament.course_name} &bull; Par {par} &bull; {numHoles} Holes</p>
                )}
              </div>
              {tournament?.site_logo_url && <img src={tournament.site_logo_url} alt="" className="h-8 object-contain" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    {Array.from({ length: numHoles }, (_, i) => (
                      <th key={i} className="border border-border px-1.5 py-1 text-center font-semibold text-foreground">{i + 1}</th>
                    ))}
                    <th className="border border-border px-1.5 py-1 text-center font-bold text-foreground bg-muted">TOT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {Array.from({ length: numHoles }, (_, i) => (
                      <td key={i} className="border border-border px-1.5 py-1 text-center text-muted-foreground">{parPerHole}</td>
                    ))}
                    <td className="border border-border px-1.5 py-1 text-center font-semibold text-foreground">{par}</td>
                  </tr>
                  <tr>
                    {Array.from({ length: numHoles + 1 }, (_, i) => (
                      <td key={i} className="border border-border px-1.5 py-3 text-center">&nbsp;</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {r.group_number != null && <p className="text-xs text-primary mt-2">Starting Hole: {r.group_number}</p>}
          </motion.div>
        ))}
      </div>
    </>
  );
}
