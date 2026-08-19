import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Download, Loader2 } from "lucide-react";
import { openPrintWindow, downloadHtmlAsPdf } from "./printUtils";
import type { Tournament, Registration } from "./types";
import { startingHoleOf } from "./types";

type Reg = Registration & {
  scoring_code?: string | null;
  checked_in?: boolean | null;
  group_label?: string | null;
  created_at?: string | null;
};

interface Props {
  tournament: (Tournament & { slug?: string | null }) | null;
  registrations: Reg[];
  loading: boolean;
}

const BASE_URL = "https://www.teevents.golf";

function qrImg(url: string, size = 180): string {
  const enc = encodeURIComponent(url);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=0&data=${enc}`;
}

function buildHtml(
  tournament: (Tournament & { slug?: string | null }) | null,
  list: Reg[],
  opts: { layout: string; showQr: boolean; showDetails: boolean; showStatus: boolean }
) {
  const perPage = opts.layout === "compact" ? 4 : opts.layout === "standard" ? 2 : 1;
  const qrSize = opts.layout === "large" ? 220 : opts.layout === "standard" ? 170 : 130;
  const cardMinHeight = opts.layout === "large" ? "9in" : opts.layout === "standard" ? "4.8in" : "2.4in";
  const cardPad = opts.layout === "large" ? "36px" : opts.layout === "standard" ? "24px" : "16px";
  const nameSize = opts.layout === "large" ? "42px" : opts.layout === "standard" ? "26px" : "18px";
  const detailSize = opts.layout === "large" ? "18px" : "13px";

  const cards = list.map((r) => {
    const link = `${BASE_URL}/day-of/${tournament?.slug || ""}/${r.scoring_code || "DEMO"}`;
    return `
      <div style="border:1.5px solid #d4d4d8;border-radius:10px;padding:${cardPad};display:flex;align-items:center;gap:20px;min-height:${cardMinHeight};break-inside:avoid;page-break-inside:avoid;background:#fff;">
        ${opts.showQr ? `<img src="${qrImg(link, qrSize)}" alt="QR" style="width:${qrSize}px;height:${qrSize}px;flex-shrink:0;" />` : ""}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;font-size:${nameSize};color:#111;line-height:1.15;">${escapeHtml(r.last_name)}, ${escapeHtml(r.first_name)}</div>
          ${opts.showDetails ? `
            <div style="margin-top:8px;font-size:${detailSize};color:#444;line-height:1.6;">
              ${r.group_label ? `<div><strong>Team:</strong> ${escapeHtml(r.group_label)}</div>` : ""}
              <div><strong>Starting Hole:</strong> ${startingHoleOf(r as any) ?? "—"}${r.group_position ? ` · Pos ${r.group_position}` : ""}</div>
              ${r.email ? `<div style="color:#666;">${escapeHtml(r.email)}</div>` : ""}
            </div>
          ` : ""}
          ${opts.showStatus ? `
            <div style="margin-top:10px;">
              <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${r.checked_in ? "#dcfce7" : "#fef3c7"};color:${r.checked_in ? "#166534" : "#92400e"};">
                ${r.checked_in ? "✓ CHECKED IN" : "☐ NOT CHECKED IN"}
              </span>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  });

  // Chunk into pages
  const pages: string[][] = [];
  for (let i = 0; i < cards.length; i += perPage) pages.push(cards.slice(i, i + perPage));

  return `
    <div style="max-width:8in;margin:0 auto;">
      <div style="text-align:center;margin-bottom:20px;">
        <h1 style="font-size:24px;margin:0 0 4px;color:#1a5c38;">${escapeHtml(tournament?.title || "")}</h1>
        <p style="color:#666;font-size:13px;margin:0;">Check-In Roster · ${list.length} Players</p>
      </div>
      ${pages.map((chunk, i) => `
        <div style="display:grid;grid-template-columns:1fr;gap:14px;${i < pages.length - 1 ? "page-break-after:always;" : ""}">
          ${chunk.join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function escapeHtml(s: string | null | undefined): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export default function CheckInRosterTab({ tournament, registrations, loading }: Props) {
  const [sortBy, setSortBy] = useState<"alpha" | "created" | "team" | "hole" | "tee">("alpha");
  const [filterMode, setFilterMode] = useState<"all" | "group" | "hole">("all");
  const [filterValue, setFilterValue] = useState<string>("all");
  const [layout, setLayout] = useState<"compact" | "standard" | "large">("compact");
  const [showQr, setShowQr] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [showStatus, setShowStatus] = useState(true);

  const holes = useMemo(() => {
    const s = new Set<number>();
    registrations.forEach((r) => { const h = startingHoleOf(r as any); if (h != null) s.add(h); });
    return Array.from(s).sort((a, b) => a - b);
  }, [registrations]);

  const groups = useMemo(() => {
    const s = new Set<string>();
    registrations.forEach((r) => r.group_label && s.add(r.group_label));
    return Array.from(s).sort();
  }, [registrations]);

  const filtered = useMemo(() => {
    let list = [...registrations];
    if (filterMode === "hole" && filterValue !== "all") list = list.filter((r) => String(startingHoleOf(r as any)) === filterValue);
    if (filterMode === "group" && filterValue !== "all") list = list.filter((r) => r.group_label === filterValue);

    list.sort((a, b) => {
      switch (sortBy) {
        case "created":
          return (a.created_at || "").localeCompare(b.created_at || "");
        case "team":
          return (a.group_label || "").localeCompare(b.group_label || "") || a.last_name.localeCompare(b.last_name);
        case "hole":
        case "tee":
          return (startingHoleOf(a as any) ?? 999) - (startingHoleOf(b as any) ?? 999) || (a.group_position ?? 0) - (b.group_position ?? 0);
        case "alpha":
        default:
          return a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);
      }
    });
    return list;
  }, [registrations, filterMode, filterValue, sortBy]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const html = buildHtml(tournament, filtered, { layout, showQr, showDetails, showStatus });

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6 space-y-5">
        <div>
          <h3 className="font-bold text-foreground mb-1">Check-In Roster</h3>
          <p className="text-sm text-muted-foreground">
            Print a physical roster of players with QR codes. Volunteers scan each QR to open that player's Day-of Event page and mark them checked in.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Sort By</Label>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alpha">Alphabetical (Last Name)</SelectItem>
                <SelectItem value="created">Registration Date</SelectItem>
                <SelectItem value="team">Team Name</SelectItem>
                <SelectItem value="hole">Starting Hole</SelectItem>
                <SelectItem value="tee">Tee Time (Hole Order)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Filter By</Label>
            <Select value={filterMode} onValueChange={(v: any) => { setFilterMode(v); setFilterValue("all"); }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="group">By Team</SelectItem>
                <SelectItem value="hole">By Starting Hole</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterMode !== "all" && (
            <div>
              <Label className="text-xs">{filterMode === "hole" ? "Hole" : "Team"}</Label>
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(filterMode === "hole" ? holes.map(String) : groups).map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">Print Layout</Label>
            <Select value={layout} onValueChange={(v: any) => setLayout(v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact (4 per page)</SelectItem>
                <SelectItem value="standard">Standard (2 per page)</SelectItem>
                <SelectItem value="large">Large Print (1 per page)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={showQr} onCheckedChange={(v) => setShowQr(!!v)} /> Include QR code
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={showDetails} onCheckedChange={(v) => setShowDetails(!!v)} /> Include player details
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={showStatus} onCheckedChange={(v) => setShowStatus(!!v)} /> Include check-in status
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Check-In Roster - ${tournament?.title || ""}`, html)}>
            <Download className="h-4 w-4 mr-2" /> Save as PDF
          </Button>
          <Button onClick={() => openPrintWindow(`Check-In Roster - ${tournament?.title || ""}`, html)}>
            <Printer className="h-4 w-4 mr-2" /> Print Roster
          </Button>
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground mb-3">Preview ({filtered.length} players) — first 4 shown</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.slice(0, 4).map((r) => {
            const link = `${BASE_URL}/day-of/${tournament?.slug || ""}/${r.scoring_code || "DEMO"}`;
            return (
              <div key={r.id} className="flex items-center gap-3 bg-white p-3 rounded border">
                {showQr && <img src={qrImg(link, 100)} alt="QR" className="w-20 h-20" />}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{r.last_name}, {r.first_name}</div>
                  {showDetails && (
                    <div className="text-xs text-muted-foreground">
                      Hole {startingHoleOf(r as any) ?? "—"}{r.group_number != null ? ` · Group ${r.group_number}` : ""}
                    </div>
                  )}
                  {showStatus && (
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${r.checked_in ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {r.checked_in ? "CHECKED IN" : "NOT CHECKED IN"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
