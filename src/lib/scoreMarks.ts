/** Display-only score classification versus a hole's par. Never changes a score. */
export type ScoreMarkKind = "albatross" | "eagle" | "birdie" | "par" | "bogey" | "double" | "triple";

export function scoreMarkKind(strokes: number | null | undefined, par: number | null | undefined): ScoreMarkKind | null {
  if (typeof strokes !== "number" || !Number.isFinite(strokes) || strokes < 1) return null;
  if (typeof par !== "number" || !Number.isFinite(par) || par < 1) return null;
  const d = strokes - par;
  if (d <= -3) return "albatross";
  if (d === -2) return "eagle";
  if (d === -1) return "birdie";
  if (d === 0) return "par";
  if (d === 1) return "bogey";
  if (d === 2) return "double";
  return "triple";
}

export const SCORE_LEGEND: { kind: ScoreMarkKind; label: string; shape: string }[] = [
  { kind: "eagle", label: "Eagle", shape: "Double circle" },
  { kind: "birdie", label: "Birdie", shape: "Single circle" },
  { kind: "par", label: "Par", shape: "Plain number" },
  { kind: "bogey", label: "Bogey", shape: "Single square" },
  { kind: "double", label: "Double Bogey", shape: "Double square" },
  { kind: "albatross", label: "Albatross", shape: "Triple circle" },
  { kind: "triple", label: "Triple Bogey or worse", shape: "Triangle" },
];
