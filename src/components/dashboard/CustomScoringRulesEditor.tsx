import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { SCORING_FORMATS } from "@/lib/scoringFormats";
import type { CustomScoring, RoundRule } from "@/lib/customScoring";

interface Props { value: CustomScoring; onChange: (v: CustomScoring) => void }

const num = (v: string) => (v === "" ? NaN : parseInt(v, 10));

/** Custom Scoring Rules: per-round hole segments, hidden holes, championship rule, Birdie Bash points. */
export default function CustomScoringRulesEditor({ value, onChange }: Props) {
  const setRound = (i: number, r: RoundRule) => onChange({ ...value, rounds: value.rounds.map((x, j) => (j === i ? r : x)) });
  const nextRound = Math.max(0, ...value.rounds.map((r) => r.round)) + 1;

  return (
    <div className="rounded-md border border-border p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-foreground">Custom Scoring Rules</p>
        <Select value={value.enabled ? "on" : "off"} onValueChange={(v) => onChange({ ...value, enabled: v === "on" })}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="off">Off</SelectItem><SelectItem value="on">On</SelectItem></SelectContent>
        </Select>
      </div>
      {!value.enabled ? (
        <p className="text-xs text-muted-foreground">Off: the event uses the single Scoring Format above.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Build each round from hole segments. Segments must cover holes 1 through 18 exactly once, and a round cannot mix points formats (Birdie Bash, Stableford) with strokes formats.</p>
          {value.rounds.map((r, i) => (
            <div key={i} className="rounded-md bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">Day {r.round}</p>
                {value.rounds.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => onChange({ ...value, rounds: value.rounds.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove day
                  </Button>
                )}
              </div>
              {r.segments.map((s, k) => (
                <div key={k} className="flex flex-wrap items-end gap-2">
                  <div className="w-16"><Label className="text-xs">From</Label>
                    <Input type="number" min={1} max={18} value={Number.isFinite(s.from) ? s.from : ""} onChange={(e) => setRound(i, { ...r, segments: r.segments.map((x, j) => (j === k ? { ...x, from: num(e.target.value) } : x)) })} /></div>
                  <div className="w-16"><Label className="text-xs">To</Label>
                    <Input type="number" min={1} max={18} value={Number.isFinite(s.to) ? s.to : ""} onChange={(e) => setRound(i, { ...r, segments: r.segments.map((x, j) => (j === k ? { ...x, to: num(e.target.value) } : x)) })} /></div>
                  <div className="min-w-[12rem] flex-1"><Label className="text-xs">Format</Label>
                    <Select value={s.format} onValueChange={(v) => setRound(i, { ...r, segments: r.segments.map((x, j) => (j === k ? { ...x, format: v } : x)) })}>
                      <SelectTrigger><SelectValue placeholder="Pick a format" /></SelectTrigger>
                      <SelectContent>{SCORING_FORMATS.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                    </Select></div>
                  {r.segments.length > 1 && (
                    <Button variant="ghost" size="icon" aria-label="Remove segment" onClick={() => setRound(i, { ...r, segments: r.segments.filter((_, j) => j !== k) })}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                const last = r.segments[r.segments.length - 1];
                const from = last && Number.isFinite(last.to) ? Math.min(18, last.to + 1) : 1;
                setRound(i, { ...r, segments: [...r.segments, { from, to: 18, format: last?.format || "best_ball_2" }] });
              }}><Plus className="h-3.5 w-3.5 mr-1" /> Add segment</Button>
              <label className="flex flex-wrap items-center gap-2 text-sm pt-1">
                <input type="checkbox" checked={!!r.hidden} onChange={(e) => setRound(i, { ...r, hidden: e.target.checked ? { from: 13, to: 18 } : null })} />
                Hide holes from the leaderboard until results are published
                {r.hidden && (
                  <span className="flex items-center gap-1">
                    <Input className="w-16 h-8" type="number" min={1} max={18} value={Number.isFinite(r.hidden.from) ? r.hidden.from : ""} onChange={(e) => setRound(i, { ...r, hidden: { ...r.hidden!, from: num(e.target.value) } })} />
                    to
                    <Input className="w-16 h-8" type="number" min={1} max={18} value={Number.isFinite(r.hidden.to) ? r.hidden.to : ""} onChange={(e) => setRound(i, { ...r, hidden: { ...r.hidden!, to: num(e.target.value) } })} />
                  </span>
                )}
              </label>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange({ ...value, rounds: [...value.rounds, { round: nextRound, segments: [{ from: 1, to: 18, format: "best_ball_2" }], hidden: null }] })}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add day
          </Button>

          <div className="space-y-1 text-sm">
            <p className="font-medium">Championship rule (all divisions)</p>
            <label className="flex items-center gap-2"><input type="radio" checked={value.championship === "separate"} onChange={() => onChange({ ...value, championship: "separate" })} /> Separate leaderboards</label>
            <label className="flex items-center gap-2"><input type="radio" checked={value.championship === "combined"} onChange={() => onChange({ ...value, championship: "combined" })} /> Combined championship</label>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="w-40"><Label className="text-xs">Birdie points</Label>
              <Input type="number" min={0} value={Number.isFinite(value.birdie_points) ? value.birdie_points : ""} onChange={(e) => onChange({ ...value, birdie_points: num(e.target.value) })} /></div>
            <div className="w-40"><Label className="text-xs">Eagle or better points</Label>
              <Input type="number" min={0} value={Number.isFinite(value.eagle_points) ? value.eagle_points : ""} onChange={(e) => onChange({ ...value, eagle_points: num(e.target.value) })} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Changing the championship rule or point values never clears scores. Points are recalculated from the scores already entered.</p>
        </>
      )}
    </div>
  );
}
