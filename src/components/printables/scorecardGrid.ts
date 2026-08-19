/**
 * Shared scorecard grid model: labelled rows (Hole / Yardage / Hole HCP / Par)
 * with Out / In / Tot summary columns, matching standard golf scorecards.
 */

export type ScoreCol =
  | { kind: "hole"; hole: number }
  | { kind: "out" }
  | { kind: "in" }
  | { kind: "tot" };

/** Columns for a 9 or 18 hole card: 1-9, Out, [10-18, In], Tot */
export function scoreColumns(numHoles: number): ScoreCol[] {
  const cols: ScoreCol[] = [];
  const front = Math.min(9, numHoles);
  for (let i = 1; i <= front; i++) cols.push({ kind: "hole", hole: i });
  cols.push({ kind: "out" });
  if (numHoles > 9) {
    for (let i = 10; i <= numHoles; i++) cols.push({ kind: "hole", hole: i });
    cols.push({ kind: "in" });
  }
  cols.push({ kind: "tot" });
  return cols;
}

const sum = (vals: (number | null | undefined)[]): number =>
  vals.reduce<number>((acc, v) => acc + (Number(v) || 0), 0);

/** Value for a summary column given per-hole values */
export function summaryValue(col: ScoreCol, values: (number | null | undefined)[], numHoles: number): number {
  if (col.kind === "out") return sum(values.slice(0, Math.min(9, numHoles)));
  if (col.kind === "in") return sum(values.slice(9, numHoles));
  return sum(values.slice(0, numHoles));
}

export interface GridData {
  numHoles: number;
  pars: number[];
  yardages?: (number | null)[] | null;
  strokeIndexes?: (number | null)[] | null;
}

const isSummary = (c: ScoreCol) => c.kind !== "hole";

/** Print HTML for the labelled scorecard grid, ending with a blank score row. */
export function scorecardGridHtml(
  data: GridData,
  opts: { color: string; scoreRowLabel?: string; scoreRows?: number },
): string {
  const cols = scoreColumns(data.numHoles);
  const label = (text: string, strong = false) =>
    `<td style="border:1px solid #ccc;padding:4px 8px;font-size:11px;white-space:nowrap;font-weight:${strong ? 700 : 600};color:#333;text-align:left;">${text}</td>`;
  const cell = (text: string | number, o: { bold?: boolean; size?: number; summary?: boolean; pad?: string } = {}) =>
    `<td style="border:1px solid #ccc;padding:${o.pad || "4px 6px"};text-align:center;font-size:${o.size || 11}px;font-weight:${o.bold ? 700 : 400};${o.summary ? `background:#eef4f1;color:${opts.color};font-weight:700;` : "color:#333;"}">${text}</td>`;

  const row = (
    title: string,
    values: (number | null | undefined)[],
    o: { bold?: boolean; bg?: string; size?: number } = {},
  ) =>
    `<tr${o.bg ? ` style="background:${o.bg};"` : ""}>${label(title, o.bold)}${cols
      .map((c) =>
        c.kind === "hole"
          ? cell(values[c.hole - 1] ?? "", { bold: o.bold, size: o.size })
          : cell(summaryValue(c, values, data.numHoles) || "", { summary: true, size: o.size }),
      )
      .join("")}</tr>`;

  const holeRow = `<tr style="background:#f5f5f5;">${label("Hole", true)}${cols
    .map((c) =>
      c.kind === "hole"
        ? cell(c.hole, { bold: true, size: 12 })
        : cell(c.kind === "out" ? "Out" : c.kind === "in" ? "In" : "Tot", { summary: true, size: 12 }),
    )
    .join("")}</tr>`;

  const yards = data.yardages && data.yardages.some((d) => (d || 0) > 0) ? row("Yardage", data.yardages, { bg: "#fafafa" }) : "";
  const hcp = data.strokeIndexes && data.strokeIndexes.some((d) => (d || 0) > 0) ? row("Hole HCP", data.strokeIndexes, { bg: "#fff" }) : "";
  const par = row("Par", data.pars, { bold: true, bg: "#fafafa" });

  const blankRows = Array.from({ length: Math.max(1, opts.scoreRows || 1) }, () =>
    `<tr>${label(opts.scoreRowLabel || "Score", true)}${cols
      .map((c) => cell("&nbsp;", { pad: "12px 6px", summary: isSummary(c) ? false : false }))
      .join("")}</tr>`,
  ).join("");

  return `<table style="border-collapse:collapse;width:100%;table-layout:fixed;">
    ${holeRow}${yards}${hcp}${par}${blankRows}
  </table>`;
}
