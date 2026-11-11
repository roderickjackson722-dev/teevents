import type { ReactNode } from "react";
import { SCORE_LEGEND, scoreMarkKind, type ScoreMarkKind } from "@/lib/scoreMarks";

/** Number with the printed-scorecard shape for its kind (display only). */
export function ScoreShape({ kind, children }: { kind: ScoreMarkKind | null; children: ReactNode }) {
  if (kind === "triple") {
    return (
      <span className="score-shape score-shape-triple">
        <svg aria-hidden viewBox="0 0 24 22" className="absolute -inset-x-1.5 -top-1 -bottom-0.5 h-[calc(100%+0.4rem)] w-[calc(100%+0.75rem)]" preserveAspectRatio="none">
          <polygon points="12,1 23,21 1,21" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="relative">{children}</span>
      </span>
    );
  }
  if (!kind || kind === "par") return <span className="score-shape">{children}</span>;
  return <span className={`score-shape score-shape-${kind}`}>{children}</span>;
}

/** Fill class for a score cell. Empty when there's no par or no score. */
export function scoreFillClass(strokes: number | null | undefined, par: number | null | undefined) {
  const k = scoreMarkKind(strokes, par);
  return k ? `score-fill score-fill-${k}` : "";
}

export function ScoreMark({ strokes, par, fallback = "—" }: { strokes: number | null | undefined; par: number | null | undefined; fallback?: ReactNode }) {
  if (typeof strokes !== "number") return <>{fallback}</>;
  return <ScoreShape kind={scoreMarkKind(strokes, par)}>{strokes}</ScoreShape>;
}

export function ScoreLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-2 text-[11px] text-muted-foreground ${className}`} aria-label="Score legend">
      {SCORE_LEGEND.map((e) => (
        <span key={e.kind} className="inline-flex items-center gap-1.5">
          <span className={`score-fill score-fill-${e.kind} inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border text-xs`}>
            <ScoreShape kind={e.kind}>4</ScoreShape>
          </span>
          <span><span className="font-semibold text-foreground">{e.label}</span> · {e.shape}</span>
        </span>
      ))}
    </div>
  );
}
