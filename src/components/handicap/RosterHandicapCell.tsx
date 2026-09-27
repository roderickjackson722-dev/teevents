import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { lookupGhin } from "@/lib/handicapClient";
import { formatIndex, formatSynced, HandicapSourceBadge, type HandicapSource } from "@/components/handicap/HandicapBadges";

export interface HandicapValue {
  ghin: string | null;
  lastName: string;
  index: number | null;
  source: HandicapSource;
  lastUpdated: string | null;
}

interface Props {
  value: HandicapValue;
  /** Persist a patch. Keys: ghin, index, source, lastUpdated, lowIndex */
  onSave: (patch: { ghin?: string | null; index?: number | null; source?: "ghin" | "manual" | "none"; lastUpdated?: string | null; lowIndex?: number | null }) => Promise<void>;
}

/** Handicap Index + source badge + Sync / Edit, with GHIN-fail → manual fallback. */
export default function RosterHandicapCell({ value, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draftIndex, setDraftIndex] = useState(value.index != null ? String(value.index) : "");
  const [draftGhin, setDraftGhin] = useState(value.ghin || "");
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(false);

  const sync = async () => {
    if (!value.ghin) { setEditing(true); toast.message("Add a GHIN number first, or enter the index manually."); return; }
    setSyncing(true);
    try {
      const res = await lookupGhin(value.ghin, value.lastName);
      if (res.status === "ok") {
        await onSave({ index: res.index, lowIndex: res.lowIndex, source: "ghin", lastUpdated: new Date().toISOString() });
        setPending(false);
        toast.success(`Synced from GHIN: ${formatIndex(res.index)}`);
      } else {
        if (res.status === "pending") setPending(true);
        toast.error(res.message, { description: "You can enter the handicap manually with Edit." });
      }
    } catch (e: any) {
      toast.error(e.message || "GHIN lookup failed — enter it manually.");
    }
    setSyncing(false);
  };

  const commit = async () => {
    const trimmed = draftIndex.trim().replace(/^\+/, "-");
    const idx = trimmed === "" ? null : Number(trimmed);
    if (idx != null && (!Number.isFinite(idx) || idx < -10 || idx > 54)) { toast.error("Handicap Index must be between +10.0 and 54.0."); return; }
    const ghin = draftGhin.trim() || null;
    if (ghin && !/^\d{4,10}$/.test(ghin)) { toast.error("GHIN numbers are 4–10 digits."); return; }
    const indexChanged = idx !== value.index;
    await onSave({
      ghin,
      ...(indexChanged ? { index: idx, source: idx == null ? "none" : "manual", lastUpdated: new Date().toISOString() } : {}),
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Input className="h-8 w-24" placeholder="GHIN #" value={draftGhin} onChange={(e) => setDraftGhin(e.target.value)} onBlur={commit} />
        <Input className="h-8 w-20" placeholder="Index" value={draftIndex} onChange={(e) => setDraftIndex(e.target.value)} onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()} autoFocus />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-12 font-semibold tabular-nums">{formatIndex(value.index)}</span>
      <HandicapSourceBadge source={value.source} pending={pending} />
      <span className="text-[11px] text-muted-foreground">
        {value.source === "manual" ? "Manual entry — not synced with GHIN" : value.source === "ghin" ? formatSynced(value.lastUpdated) : value.ghin ? `GHIN ${value.ghin}` : ""}
      </span>
      <div className="ml-auto flex gap-1">
        <Button variant="outline" size="sm" className="h-7 px-2" onClick={sync} disabled={syncing} aria-label="Sync from GHIN">
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="ml-1 hidden sm:inline">Sync</span>
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setDraftIndex(value.index != null ? String(value.index) : ""); setDraftGhin(value.ghin || ""); setEditing(true); }} aria-label="Edit handicap">
          <Pencil className="h-3.5 w-3.5" /><span className="ml-1 hidden sm:inline">Edit</span>
        </Button>
      </div>
    </div>
  );
}
