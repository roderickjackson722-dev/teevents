import { useEffect, useRef } from "react";
import { ScoreMark, ScoreLegend, scoreFillClass } from "@/components/scoring/ScoreMark";
import { scoreMarkKind } from "@/lib/scoreMarks";
import { applyHoleInput, isAllowedScoreKey } from "@/lib/scoreEntryFocus";
import { stablefordPoints } from "@/lib/scoringFormats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, Undo2, Eraser, X } from "lucide-react";

export interface ScoringEntryPlayer {
  registration_id: string;
  first_name: string;
  last_name: string;
  status?: string | null;
  handicap?: number | null;
  playing_handicap?: number | null;
}

export interface ScoringEntry {
  key: string;
  label: string;
  isUnassigned?: boolean;
  players: ScoringEntryPlayer[];
  /** Live hole scores — saved values with unsaved edits already overlaid. */
  holeScores: Record<number, number>;
  total: number;
  /** Stableford points total (stableford formats only). */
  points?: number;
  /** Net total (individual handicap view only). */
  netTotal?: number;
}

export type EntryStatus = "verified" | "entered" | "not_started";

/** Green only when every hole is entered AND the team is verified. */
export function entryStatus(entry: ScoringEntry, holeCount: number, isVerified: boolean): EntryStatus {
  const entered = Object.keys(entry.holeScores).length;
  if (isVerified && entered >= holeCount) return "verified";
  if (entered > 0) return "entered";
  return "not_started";
}

const DOT_CLASS: Record<EntryStatus, string> = {
  verified: "bg-green-500",
  entered: "bg-amber-500",
  not_started: "bg-muted-foreground/40",
};

interface ScoringWorkspaceProps {
  /** Entries after the search filter — these fill the left list. */
  entries: ScoringEntry[];
  counts: { total: number; verified: number; entered: number; notStarted: number };
  verifiedKeys: Set<string>;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onVerify: (key: string) => void;
  onUnverify: (key: string) => void;
  isTeamFormat: boolean;
  isStableford: boolean;
  showNet: boolean;
  holes: number[];
  getHolePar: (h: number) => number;
  coursePar: number;
  formatName: string;
  canEdit: boolean;
  saving: boolean;
  onSave: () => void;
  onCellValue: (entry: ScoringEntry, hole: number, value: number) => void;
  onCellClear: (entry: ScoringEntry, hole: number) => void;
  /** Delete saved scores for holes (null = all) of an entry. */
  onClearSaved?: (entry: ScoringEntry, holes: number[] | null) => void | Promise<void>;
  renderPlayerWd?: (p: ScoringEntryPlayer) => React.ReactNode;
  /** Withdrawn teammates of the selected entry (team formats). */
  withdrawnTeammates?: ScoringEntryPlayer[];
}

/**
 * Two-panel organizer scoring workspace: a searchable, status-dotted list of
 * teams on the left and the selected team's hole-by-hole grid on the right.
 * Presentation only — every score write goes through the parent's existing
 * save path, and totals come from the parent's existing scoring rules.
 */
export default function ScoringWorkspace({
  entries,
  counts,
  verifiedKeys,
  selectedKey,
  onSelect,
  onVerify,
  onUnverify,
  isTeamFormat,
  isStableford,
  showNet,
  holes,
  getHolePar,
  coursePar,
  formatName,
  canEdit,
  saving,
  onSave,
  onCellValue,
  onCellClear,
  onClearSaved,
  renderPlayerWd,
  withdrawnTeammates = [],
}: ScoringWorkspaceProps) {
  const selected = entries.find((e) => e.key === selectedKey) ?? null;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* ===== LEFT: searchable team list ===== */}
      <div className="lg:w-72 xl:w-80 shrink-0 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-md border border-border px-2 py-1.5">
            <div className="text-lg font-bold leading-none">{counts.total}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{isTeamFormat ? "Teams" : "Players"}</div>
          </div>
          <div className="rounded-md border border-border px-2 py-1.5">
            <div className="text-lg font-bold leading-none flex items-center justify-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_CLASS.verified}`} />
              {counts.verified}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Verified</div>
          </div>
          <div className="rounded-md border border-border px-2 py-1.5">
            <div className="text-lg font-bold leading-none flex items-center justify-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_CLASS.entered}`} />
              {counts.entered}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Entered, not verified</div>
          </div>
          <div className="rounded-md border border-border px-2 py-1.5">
            <div className="text-lg font-bold leading-none flex items-center justify-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_CLASS.not_started}`} />
              {counts.notStarted}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Not started</div>
          </div>
        </div>

        <div className="rounded-md border border-border divide-y divide-border max-h-[70vh] overflow-y-auto">
          {entries.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">No matches. Clear the filter to see everyone.</p>
          )}
          {entries.map((entry) => {
            const status = entryStatus(entry, holes.length, verifiedKeys.has(entry.key));
            const isSelected = entry.key === selectedKey;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => onSelect(entry.key)}
                className={`w-full text-left px-3 py-2.5 transition-colors ${
                  isSelected ? "bg-secondary/15 border-l-4 border-secondary" : "hover:bg-muted/50 border-l-4 border-transparent"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${DOT_CLASS[status]}`} />
                  <span className="font-semibold text-sm break-words">{entry.label}</span>
                  {entry.isUnassigned && (
                    <Badge variant="outline" className="text-[10px] font-normal">No pairing</Badge>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5 break-words">
                  {entry.players.map((p) => `${p.first_name} ${p.last_name}`).join(", ")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== RIGHT: selected team's score grid ===== */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Select a {isTeamFormat ? "team" : "player"} on the left to enter scores.
          </div>
        ) : (
          <SelectedEntryPanel
            entry={selected}
            isVerified={verifiedKeys.has(selected.key)}
            isTeamFormat={isTeamFormat}
            isStableford={isStableford}
            showNet={showNet}
            holes={holes}
            getHolePar={getHolePar}
            coursePar={coursePar}
            formatName={formatName}
            canEdit={canEdit}
            saving={saving}
            onSave={onSave}
            onVerify={() => onVerify(selected.key)}
            onUnverify={() => onUnverify(selected.key)}
            onCellValue={onCellValue}
            onCellClear={onCellClear}
            onClearSaved={onClearSaved}
            renderPlayerWd={renderPlayerWd}
            withdrawnTeammates={withdrawnTeammates}
          />
        )}
      </div>
    </div>
  );
}

function SelectedEntryPanel({
  entry,
  isVerified,
  isTeamFormat,
  isStableford,
  showNet,
  holes,
  getHolePar,
  coursePar,
  formatName,
  canEdit,
  saving,
  onSave,
  onVerify,
  onUnverify,
  onCellValue,
  onCellClear,
  onClearSaved,
  renderPlayerWd,
  withdrawnTeammates,
}: {
  entry: ScoringEntry;
  isVerified: boolean;
  isTeamFormat: boolean;
  isStableford: boolean;
  showNet: boolean;
  holes: number[];
  getHolePar: (h: number) => number;
  coursePar: number;
  formatName: string;
  canEdit: boolean;
  saving: boolean;
  onSave: () => void;
  onVerify: () => void;
  onUnverify: () => void;
  onCellValue: (entry: ScoringEntry, hole: number, value: number) => void;
  onCellClear: (entry: ScoringEntry, hole: number) => void;
  onClearSaved?: (entry: ScoringEntry, holes: number[] | null) => void | Promise<void>;
  renderPlayerWd?: (p: ScoringEntryPlayer) => React.ReactNode;
  withdrawnTeammates: ScoringEntryPlayer[];
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hadValueOnFocus = useRef<boolean[]>([]);
  const advanceTimers = useRef<(number | undefined)[]>([]);

  // Cancel pending focus moves when switching teams or unmounting.
  useEffect(() => {
    const timers = advanceTimers.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [entry.key]);

  const editable = canEdit && !isVerified;

  const focusHole = (idx: number) => {
    const el = inputRefs.current[idx];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const handleChange = (holeIdx: number, hole: number, raw: string) => {
    window.clearTimeout(advanceTimers.current[holeIdx]);
    const result = applyHoleInput(raw, hadValueOnFocus.current[holeIdx] ?? false);
    if (result.kind === "invalid") return;
    if (result.kind === "clear") {
      onCellClear(entry, hole);
      return;
    }
    onCellValue(entry, hole, result.value);
    if (result.advance && holeIdx < holes.length - 1) {
      // Only completed scores advance; leading 1/2 never schedule a move.
      advanceTimers.current[holeIdx] = window.setTimeout(() => {
        if (document.activeElement === inputRefs.current[holeIdx]) focusHole(holeIdx + 1);
      }, 0);
    }
  };

  const outTotal = holes.slice(0, 9).reduce((s, h) => s + (entry.holeScores[h] ?? 0), 0);
  const inTotal = holes.slice(9).reduce((s, h) => s + (entry.holeScores[h] ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold break-words">{entry.label}</h3>
            <Badge variant="secondary" className="text-xs font-normal">{formatName}</Badge>
            <span className="text-sm text-muted-foreground">Par {coursePar}</span>
            {isVerified && (
              <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3" /> Verified
              </Badge>
            )}
          </div>
          <div className="mt-1 space-y-1">
            {entry.players.map((p) => (
              <div key={p.registration_id} className="flex items-center gap-2 flex-wrap text-sm">
                <span className="break-words">{p.first_name} {p.last_name}</span>
                {p.playing_handicap != null ? (
                  <span className="text-xs text-muted-foreground">({p.playing_handicap})</span>
                ) : p.handicap != null ? (
                  <span className="text-xs text-muted-foreground">({p.handicap})</span>
                ) : null}
                {renderPlayerWd?.(p)}
              </div>
            ))}
            {withdrawnTeammates.map((p) => (
              <div key={p.registration_id} className="flex items-center gap-2 flex-wrap text-sm">
                <span className="break-words">{p.first_name} {p.last_name}</span>
                <Badge variant="secondary" className="text-[10px] uppercase">WD</Badge>
                {renderPlayerWd?.(p)}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onClearSaved && editable && Object.keys(entry.holeScores).length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm(`Clear ALL saved scores for ${entry.label}? This cannot be undone.`)) {
                  onClearSaved(entry, null);
                }
              }}
            >
              <Eraser className="h-4 w-4 mr-1.5" /> Clear All Scores
            </Button>
          )}
          {isVerified ? (
            <Button variant="outline" onClick={onUnverify} disabled={!canEdit}>
              <Undo2 className="h-4 w-4 mr-1.5" /> Unverify &amp; Unapprove
            </Button>
          ) : (
            <Button
              onClick={onVerify}
              disabled={!canEdit}
              style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Verify &amp; Approve
            </Button>
          )}
        </div>
      </div>

      {isVerified && (
        <p className="text-xs text-muted-foreground rounded-md border border-green-600/30 bg-green-600/5 px-3 py-2">
          This {isTeamFormat ? "team" : "player"} is verified and approved. To change a score, tap Unverify &amp; Unapprove first.
        </p>
      )}

      {/* Hole-by-hole grid: wraps inside its own panel, never scrolls the page sideways. */}
      <div className="rounded-md border border-border p-3">
        {[holes.slice(0, 9), holes.slice(9)].filter((row) => row.length > 0).map((row, rowIdx) => (
        <div key={rowIdx} className={rowIdx > 0 ? "mt-3 pt-3 border-t border-border" : ""}>
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          {rowIdx === 0 ? "Front 9 (Out)" : "Back 9 (In)"}
        </div>
        <div className="flex flex-wrap gap-2">
          {row.map((h, rowPos) => {
            const idx = rowIdx * 9 + rowPos;
            const val = entry.holeScores[h];
            const par = getHolePar(h);
            return (
              <div key={h} className="flex flex-col items-center gap-1 w-14">
                <span className="text-[11px] font-semibold text-muted-foreground">Hole {h}</span>
                <input
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label={`${entry.label} hole ${h}`}
                  disabled={!editable}
                  value={typeof val === "number" ? val : ""}
                  placeholder={String(par)}
                  onFocus={(e) => {
                    hadValueOnFocus.current[idx] = typeof val === "number";
                    e.target.select();
                  }}
                  onBlur={() => window.clearTimeout(advanceTimers.current[idx])}
                  onKeyDown={(e) => {
                    if (!isAllowedScoreKey(e.key)) {
                      e.preventDefault();
                      return;
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSave();
                    }
                  }}
                  onChange={(e) => handleChange(idx, h, e.target.value)}
                  className={`h-12 w-12 rounded-md border border-input bg-background text-center text-lg font-bold p-0 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-70 ${scoreFillClass(typeof val === "number" ? val : null, par)}`}
                />
                {typeof val === "number" && scoreMarkKind(val, par) && scoreMarkKind(val, par) !== "par" && (
                  <span className="text-[11px] font-bold leading-none" aria-hidden>
                    <ScoreMark strokes={val} par={par} />
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">Par {par}</span>
                {onClearSaved && editable && typeof val === "number" && (
                  <button
                    type="button"
                    aria-label={`Clear hole ${h} score`}
                    onClick={() => {
                      if (window.confirm(`Clear the Hole ${h} score for ${entry.label}?`)) onClearSaved(entry, [h]);
                    }}
                    className="text-[10px] text-destructive inline-flex items-center gap-0.5 hover:underline"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
                {isStableford && typeof val === "number" && (
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {stablefordPoints(val, par)}pt
                  </span>
                )}
              </div>
            );
          })}
        </div>
        </div>
        ))}
      </div>

      <ScoreLegend />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="rounded-md border border-border px-3 py-2 text-center">
          <div className="text-[11px] text-muted-foreground">OUT</div>
          <div className="text-lg font-bold">{outTotal > 0 ? outTotal : "—"}</div>
        </div>
        <div className="rounded-md border border-border px-3 py-2 text-center">
          <div className="text-[11px] text-muted-foreground">IN</div>
          <div className="text-lg font-bold">{inTotal > 0 ? inTotal : "—"}</div>
        </div>
        <div className="rounded-md border border-border px-3 py-2 text-center">
          <div className="text-[11px] text-muted-foreground">{isStableford ? "POINTS" : "TOT"}</div>
          <div className="text-lg font-bold">
            {isStableford ? (entry.points && entry.points > 0 ? entry.points : "—") : entry.total > 0 ? entry.total : "—"}
          </div>
        </div>
        {showNet && (
          <div className="rounded-md border border-border px-3 py-2 text-center">
            <div className="text-[11px] text-muted-foreground">NET</div>
            <div className="text-lg font-bold text-primary">{entry.netTotal != null && entry.total > 0 ? entry.netTotal : "—"}</div>
          </div>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {saving ? "Saving…" : "Typing a number saves it for that hole."}
        </span>
      </div>
    </div>
  );
}
