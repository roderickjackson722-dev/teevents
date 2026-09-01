import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  HOLES,
  fastEntryAdvance,
  playerName,
  sanitizeCell,
  type PlayerRow,
  type PlayerStatus,
  type ScoreIndex,
} from "@/lib/collegeScoring";

type RoundCells = Record<number, Record<number, string>>; // round -> hole -> raw

interface FastScoreEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: PlayerRow | null;
  divisionName: string | null;
  rounds: number;
  index: ScoreIndex;
  onSave: (
    perRound: Record<number, Record<number, string>>,
    status: PlayerStatus,
    reason: string
  ) => Promise<void>;
}

/**
 * Fast score entry for one player: a 18-hole row per round with auto-tab
 * (single digit advances, a leading "1" waits for the second digit so 10–20
 * can be typed), plus WD/DQ status. Typing "w" or "d" in any cell sets the
 * status without leaving the keyboard.
 */
export function FastScoreEntry({
  open,
  onOpenChange,
  player,
  divisionName,
  rounds,
  index,
  onSave,
}: FastScoreEntryProps) {
  const [cells, setCells] = useState<RoundCells>({});
  const [status, setStatus] = useState<PlayerStatus>("active");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const roundList = useMemo(
    () => Array.from({ length: Math.max(1, rounds) }, (_, i) => i + 1),
    [rounds]
  );

  useEffect(() => {
    if (!open || !player) return;
    const next: RoundCells = {};
    roundList.forEach((r) => {
      next[r] = {};
      HOLES.forEach((h) => {
        const v = index[player.registration_id]?.[r]?.[h];
        next[r][h] = Number.isFinite(v) ? String(v) : "";
      });
    });
    setCells(next);
    setStatus(player.status);
    setReason(player.status_reason || "");
    // Focus the first empty cell of round 1 shortly after the dialog paints.
    setTimeout(() => {
      const firstEmpty = HOLES.find((h) => !next[1]?.[h]) || 1;
      inputs.current[`1-${firstEmpty}`]?.focus();
    }, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, player?.registration_id, rounds]);

  const focusCell = (round: number, hole: number) => {
    const el = inputs.current[`${round}-${hole}`];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const advance = (round: number, hole: number) => {
    if (hole < 18) focusCell(round, hole + 1);
    else if (round < roundList.length) focusCell(round + 1, 1);
  };

  const setCell = (round: number, hole: number, raw: string) => {
    const clean = sanitizeCell(raw);
    setCells((prev) => ({ ...prev, [round]: { ...(prev[round] || {}), [hole]: clean } }));
    if (fastEntryAdvance(clean)) advance(round, hole);
  };

  const onKeyDown = (round: number, hole: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key.toLowerCase();
    if (key === "w") {
      e.preventDefault();
      setStatus("wd");
      return;
    }
    if (key === "d") {
      e.preventDefault();
      setStatus("dq");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      advance(round, hole);
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      advance(round, hole);
      return;
    }
    if (e.key === "ArrowLeft" || (e.key === "Backspace" && !cells[round]?.[hole])) {
      e.preventDefault();
      if (hole > 1) focusCell(round, hole - 1);
      else if (round > 1) focusCell(round - 1, 18);
      return;
    }
    if (e.key === "ArrowDown" && round < roundList.length) {
      e.preventDefault();
      focusCell(round + 1, hole);
    }
    if (e.key === "ArrowUp" && round > 1) {
      e.preventDefault();
      focusCell(round - 1, hole);
    }
  };

  const roundSum = (round: number) =>
    HOLES.reduce((sum, h) => {
      const n = parseInt(cells[round]?.[h] || "", 10);
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);

  const grandTotal = roundList.reduce((sum, r) => sum + roundSum(r), 0);

  const save = async () => {
    if (!player) return;
    setSaving(true);
    try {
      await onSave(cells, status, reason);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Scores – {player ? playerName(player) : ""}
            {player?.team_name ? ` (${player.team_name})` : ""}
          </DialogTitle>
        </DialogHeader>

        {player && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>Player: {playerName(player)}</span>
              <span>Team: {player.team_name || "—"}</span>
              <span>Division: {divisionName || "—"}</span>
              {player.group_label || player.group_number ? (
                <span>Group: {player.group_label || `#${player.group_number}`}</span>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="pr-2 text-left">Round</th>
                    {HOLES.map((h) => (
                      <th key={h} className="px-0.5 font-normal">
                        {h}
                      </th>
                    ))}
                    <th className="pl-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {roundList.map((r) => (
                    <tr key={r}>
                      <td className="pr-2 font-medium whitespace-nowrap">R{r}</td>
                      {HOLES.map((h) => (
                        <td key={h} className="px-0.5 py-1">
                          <Input
                            ref={(el) => {
                              inputs.current[`${r}-${h}`] = el;
                            }}
                            value={cells[r]?.[h] ?? ""}
                            onChange={(e) => setCell(r, h, e.target.value)}
                            onKeyDown={(e) => onKeyDown(r, h, e)}
                            onFocus={(e) => e.currentTarget.select()}
                            inputMode="numeric"
                            aria-label={`Round ${r} hole ${h}`}
                            className="w-9 h-9 text-center p-0 text-sm"
                          />
                        </td>
                      ))}
                      <td className="pl-2 text-right font-semibold tabular-nums">
                        {roundSum(r) || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as PlayerStatus)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="wd">WD (Withdrawn)</SelectItem>
                    <SelectItem value="dq">DQ (Disqualified)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {status !== "active" && (
                <div className="space-y-1 flex-1 min-w-[220px]">
                  <Label>Reason (optional)</Label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Injury, rules violation…" />
                </div>
              )}
              <div className="ml-auto text-sm text-muted-foreground">
                Event total: <span className="font-semibold text-foreground">{grandTotal || "—"}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Type a score to jump to the next hole. Start with “1” to enter 10–20. Press “w” for WD, “d” for DQ,
              arrow keys or backspace to move back.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Scores
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
