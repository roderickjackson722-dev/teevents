import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export type HandicapSource = "ghin" | "manual" | "none" | null | undefined;

/** GHIN (green) · Manual (gray) · Pending Sync (yellow) */
export function HandicapSourceBadge({ source, pending }: { source: HandicapSource; pending?: boolean }) {
  if (pending) {
    return <span className="rounded-full bg-hcp-pending px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hcp-pending-foreground">Pending Sync</span>;
  }
  if (source === "ghin") {
    return <span className="rounded-full bg-hcp-ghin px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hcp-ghin-foreground">GHIN</span>;
  }
  if (source === "manual") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Manual</span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Manual entry — not synced with GHIN</TooltipContent>
      </Tooltip>
    );
  }
  return null;
}

export const HANDICAP_TIPS = {
  index: "Handicap Index — the player's portable USGA number (e.g. 12.4). It travels with them to any course.",
  course: "Course Handicap — strokes received on this course and tee: Index × (Slope ÷ 113) + (Course Rating − Par).",
  playing: "Playing Handicap — the Course Handicap after the event's allowance % (e.g. 95% for four-ball). Used for net scores.",
};

export function HandicapLabel({ kind, children }: { kind: keyof typeof HANDICAP_TIPS; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent className="max-w-64 text-xs">{HANDICAP_TIPS[kind]}</TooltipContent>
      </Tooltip>
    </span>
  );
}

export const formatIndex = (v: number | null | undefined) =>
  v == null ? "—" : Number(v) < 0 ? `+${Math.abs(Number(v)).toFixed(1)}` : Number(v).toFixed(1);

export const formatSynced = (ts: string | null | undefined) =>
  ts ? `Last synced: ${new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : "Never synced";
