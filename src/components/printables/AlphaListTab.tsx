import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { openPrintWindow, downloadHtmlAsPdf } from "./printUtils";
import { formatTeeTime } from "./CartSignsTab";
import type { Tournament, Registration } from "./types";
import { startingHoleOf } from "./types";
import { effectiveScoringCode } from "./scoringCodes";
import type { AlphaColumnId } from "./PrintablesOptionsCard";
import { ALPHA_COLUMNS, DEFAULT_PRINTABLE_OPTIONS } from "./PrintablesOptionsCard";

interface Props {
  tournament: Tournament | null;
  registrations: Registration[];
  loading: boolean;
  /** Show the Pairings-synced scoring code column. */
  showScoringCodes?: boolean;
  /** Organizer-selected columns for the printed list. */
  columns?: AlphaColumnId[];
}

const codeOf = (r: Registration) => effectiveScoringCode(r);

const NA = "—";

function valueOf(r: Registration, col: AlphaColumnId, index: number): string {
  switch (col) {
    case "index":
      return String(index + 1);
    case "last_name":
      return r.last_name || NA;
    case "first_name":
      return r.first_name || NA;
    case "hole":
      return startingHoleOf(r as any) != null ? String(startingHoleOf(r as any)) : NA;
    case "tee_time":
      return formatTeeTime((r as any).tee_time) || NA;
    case "group":
      return (r as any).team_name || (r as any).group_label || (r.group_number != null ? `Group ${r.group_number}` : NA);
    case "email":
      return r.email || NA;
    case "scoring_code":
      return codeOf(r) || "Not assigned";
    case "checked_in":
      return (r as any).checked_in ? "Yes" : "No";
    default:
      return NA;
  }
}

const labelOf = (col: AlphaColumnId) =>
  ({
    index: "#",
    last_name: "Last Name",
    first_name: "First Name",
    hole: "Hole",
    tee_time: "Tee Time",
    group: "Group / Team",
    email: "Email",
    scoring_code: "Scoring Code",
    checked_in: "Checked In",
  } as Record<AlphaColumnId, string>)[col];

function buildHtml(tournament: Tournament | null, list: Registration[], cols: AlphaColumnId[]) {
  const th = `text-align:left;padding:8px 12px;border-bottom:1px solid #ddd;font-size:14px;background:#f5f5f5;font-weight:700;`;
  const td = `padding:8px 12px;border-bottom:1px solid #ddd;font-size:14px;`;
  return `
    <h1 style="font-size:22px;margin-bottom:4px;">${tournament?.title ?? ""}</h1>
    <p style="color:#666;font-size:13px;margin-bottom:20px;">Alphabetical Player List &bull; ${list.length} Players</p>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>${cols.map((c) => `<th style="${th}">${labelOf(c)}</th>`).join("")}</tr></thead>
      <tbody>${list
        .map(
          (r, i) =>
            `<tr>${cols
              .map(
                (c) =>
                  `<td style="${td}${c === "scoring_code" ? "font-family:monospace;letter-spacing:1px;" : ""}">${valueOf(r, c, i)}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("")}</tbody>
    </table>`;
}

export default function AlphaListTab({ tournament, registrations, loading, showScoringCodes = false, columns }: Props) {
  const alphaList = [...registrations].sort((a, b) =>
    a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
  );

  const selected = (columns?.length ? columns : DEFAULT_PRINTABLE_OPTIONS.alpha_columns) as AlphaColumnId[];
  const cols = ALPHA_COLUMNS.map((c) => c.id).filter(
    (c) => selected.includes(c) || (c === "scoring_code" && showScoringCodes),
  ) as AlphaColumnId[];

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (alphaList.length === 0) return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No registered players yet.</p></div>;

  const html = buildHtml(tournament, alphaList, cols);

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
      <p className="text-xs text-muted-foreground mb-2">
        Columns are set in Printables Options above.
      </p>
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {cols.map((c) => (
                <th key={c} className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">{labelOf(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alphaList.map((r, i) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                {cols.map((c) => (
                  <td
                    key={c}
                    className={`px-4 py-3 whitespace-nowrap ${c === "index" ? "text-muted-foreground" : "text-foreground"} ${c === "last_name" ? "font-medium" : ""} ${c === "scoring_code" ? "font-mono tracking-wider" : ""}`}
                  >
                    {valueOf(r, c, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
