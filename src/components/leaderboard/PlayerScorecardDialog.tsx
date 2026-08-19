import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ScorecardCourseInfo {
  hole_pars?: number[] | null;
  stroke_indexes?: number[] | null;
  hole_distances?: number[] | null;
  name?: string | null;
  tee_name?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  playerName: string;
  subtitle?: string;
  /** Hole-by-hole strokes keyed by round then hole. */
  holesByRound: Record<number, Record<number, number>>;
  course?: ScorecardCourseInfo | null;
  coursePar?: number;
  /** Optional round labels, eg. { 1: "Round 1 — Aug 21" }. */
  roundLabels?: Record<number, string>;
}

const FRONT = Array.from({ length: 9 }, (_, i) => i + 1);
const BACK = Array.from({ length: 9 }, (_, i) => i + 10);

/**
 * Round-by-round scorecard breakdown for one player or team. Opened by clicking
 * a leaderboard row, so spectators can see the same hole detail an organizer
 * sees in the dashboard.
 */
export function PlayerScorecardDialog({
  open,
  onOpenChange,
  playerName,
  subtitle,
  holesByRound,
  course,
  coursePar = 72,
  roundLabels,
}: Props) {
  const rounds = Object.keys(holesByRound || {})
    .map(Number)
    .sort((a, b) => a - b);
  const parFor = (h: number) => {
    const p = course?.hole_pars?.[h - 1];
    return Number(p) > 0 ? Number(p) : Math.round(coursePar / 18);
  };

  const sum = (holes: number[], pick: (h: number) => number | undefined) =>
    holes.reduce((n, h) => n + (Number(pick(h)) || 0), 0);

  const renderNine = (label: string, holes: number[], scores: Record<number, number>) => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/60">
            <th className="p-1.5 text-left font-semibold w-24">Hole</th>
            {holes.map((h) => (
              <th key={h} className="p-1.5 text-center font-semibold w-9">{h}</th>
            ))}
            <th className="p-1.5 text-center font-bold w-12">{label}</th>
          </tr>
        </thead>
        <tbody>
          {course?.hole_distances && (
            <tr className="text-muted-foreground">
              <td className="p-1.5">Yardage</td>
              {holes.map((h) => (
                <td key={h} className="p-1.5 text-center">{course.hole_distances?.[h - 1] ?? "—"}</td>
              ))}
              <td className="p-1.5 text-center font-medium">
                {sum(holes, (h) => course.hole_distances?.[h - 1] as number | undefined)}
              </td>
            </tr>
          )}
          {course?.stroke_indexes && (
            <tr className="text-muted-foreground">
              <td className="p-1.5">Hole HCP</td>
              {holes.map((h) => (
                <td key={h} className="p-1.5 text-center">{course.stroke_indexes?.[h - 1] ?? "—"}</td>
              ))}
              <td className="p-1.5" />
            </tr>
          )}
          <tr>
            <td className="p-1.5 font-medium">Par</td>
            {holes.map((h) => (
              <td key={h} className="p-1.5 text-center">{parFor(h)}</td>
            ))}
            <td className="p-1.5 text-center font-bold">{sum(holes, (h) => parFor(h))}</td>
          </tr>
          <tr className="bg-primary/5">
            <td className="p-1.5 font-semibold">Gross</td>
            {holes.map((h) => {
              const v = scores[h];
              const diff = v ? v - parFor(h) : null;
              return (
                <td
                  key={h}
                  className={`p-1.5 text-center font-mono font-semibold ${
                    diff == null ? "text-muted-foreground"
                    : diff < 0 ? "text-primary"
                    : diff > 1 ? "text-destructive"
                    : ""
                  }`}
                >
                  {v ?? "—"}
                </td>
              );
            })}
            <td className="p-1.5 text-center font-mono font-bold">{sum(holes, (h) => scores[h]) || "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{playerName}</DialogTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </DialogHeader>

        {rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No scores posted yet.</p>
        ) : (
          <div className="space-y-6">
            {rounds.map((r) => {
              const scores = holesByRound[r] || {};
              const gross = Object.values(scores).reduce((n, v) => n + (Number(v) || 0), 0);
              const parPlayed = Object.keys(scores).reduce((n, h) => n + parFor(Number(h)), 0);
              const toPar = gross - parPlayed;
              return (
                <div key={r} className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-semibold">{roundLabels?.[r] || `Round ${r}`}</h3>
                    <span className="text-sm font-mono">
                      {gross} ({toPar === 0 ? "E" : toPar > 0 ? `+${toPar}` : toPar})
                      <span className="text-muted-foreground"> · thru {Object.keys(scores).length}</span>
                    </span>
                  </div>
                  {renderNine("Out", FRONT, scores)}
                  {renderNine("In", BACK, scores)}
                </div>
              );
            })}
          </div>
        )}
        {(course?.name || course?.tee_name) && (
          <p className="text-xs text-muted-foreground">
            {[course?.name, course?.tee_name].filter(Boolean).join(" · ")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
