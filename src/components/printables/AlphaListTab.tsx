import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { openPrintWindow, downloadHtmlAsPdf } from "./printUtils";
import type { Tournament, Registration } from "./types";

interface Props {
  tournament: Tournament | null;
  registrations: Registration[];
  loading: boolean;
}

function buildHtml(tournament: Tournament | null, list: Registration[]) {
  return `
    <h1 style="font-size:22px;margin-bottom:4px;">${tournament?.title ?? ""}</h1>
    <p style="color:#666;font-size:13px;margin-bottom:20px;">Alphabetical Player List &bull; ${list.length} Players</p>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #ddd;font-size:14px;background:#f5f5f5;font-weight:700;">#</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #ddd;font-size:14px;background:#f5f5f5;font-weight:700;">Last Name</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #ddd;font-size:14px;background:#f5f5f5;font-weight:700;">First Name</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #ddd;font-size:14px;background:#f5f5f5;font-weight:700;">Hole</th>
      </tr></thead>
      <tbody>${list.map((r, i) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #ddd;font-size:14px;">${i + 1}</td><td style="padding:8px 12px;border-bottom:1px solid #ddd;font-size:14px;">${r.last_name}</td><td style="padding:8px 12px;border-bottom:1px solid #ddd;font-size:14px;">${r.first_name}</td><td style="padding:8px 12px;border-bottom:1px solid #ddd;font-size:14px;">${r.group_number ?? "—"}</td></tr>`).join("")}</tbody>
    </table>`;
}

export default function AlphaListTab({ tournament, registrations, loading }: Props) {
  const alphaList = [...registrations].sort((a, b) =>
    a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
  );

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (alphaList.length === 0) return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No registered players yet.</p></div>;

  const html = buildHtml(tournament, alphaList);

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Alpha List - ${tournament?.title}`, html)}>
          <Download className="h-4 w-4 mr-2" /> Save as PDF
        </Button>
        <Button onClick={() => openPrintWindow(`Alpha List - ${tournament?.title}`, html)}>
          <Printer className="h-4 w-4 mr-2" /> Print Alpha List
        </Button>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold text-foreground w-12">#</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Last Name</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">First Name</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground w-24">Hole</th>
            </tr>
          </thead>
          <tbody>
            {alphaList.map((r, i) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-foreground">{r.last_name}</td>
                <td className="px-4 py-3 text-foreground">{r.first_name}</td>
                <td className="px-4 py-3 text-foreground">{r.group_number ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
