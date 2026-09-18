/**
 * Enterprise scorecard templates.
 *
 * One print builder covers every template; the template only decides how many
 * score rows are printed, what they are labelled and whether a team total row
 * is shown. Every card carries the scoring QR code, the scoring web address,
 * a birdie legend (birdie scores print inside a circle) and, when enabled, a
 * skins strip showing the skin holes with the winning score and winner.
 */

export interface ScorecardTemplate {
  key: string;
  label: string;
  /** Row labels under the Par row */
  rows: (playerNames: string[]) => string[];
  /** Show a combined team/net total row */
  teamRow?: boolean;
  blurb: string;
}

const four = (names: string[]) => [0, 1, 2, 3].map((i) => names[i] || `Player ${i + 1}`);
const two = (names: string[]) => [0, 1].map((i) => names[i] || `Player ${i + 1}`);

export const SCORECARD_TEMPLATES: ScorecardTemplate[] = [
  { key: "standard_stroke", label: "Standard Stroke Play", rows: (n) => four(n), blurb: "One row per player, gross totals." },
  { key: "scramble", label: "Scramble", rows: (n) => four(n), teamRow: true, blurb: "Player rows plus a team score row." },
  { key: "best_ball", label: "Best Ball", rows: (n) => four(n), teamRow: true, blurb: "Player rows plus the best ball row." },
  { key: "alternate_shot", label: "Alternate Shot", rows: (n) => two(n), teamRow: true, blurb: "Two players, one ball." },
  { key: "stableball", label: "Stableball", rows: (n) => four(n), teamRow: true, blurb: "Points-based Stableford card." },
  { key: "two_player_scramble", label: "2-Player Scramble", rows: (n) => two(n), teamRow: true, blurb: "Two-player team card." },
  { key: "stroke_with_marker", label: "Individual Stroke Play with Marker", rows: (n) => [n[0] || "Player", "Marker"], blurb: "Player row plus a marker row." },
  { key: "six_six_six", label: "6-6-6 Format", rows: (n) => four(n), teamRow: true, blurb: "Three six-hole segments." },
];

export const templateByKey = (key: string): ScorecardTemplate =>
  SCORECARD_TEMPLATES.find((t) => t.key === key) || SCORECARD_TEMPLATES[0];

export interface SkinResult {
  hole: number;
  winner: string;
  score: number | string;
  net?: boolean;
}

export interface ScorecardCardData {
  /** Group / starting-hole label */
  groupLabel: string;
  playerNames: string[];
  handicaps: (number | null)[];
  scoringCode?: string | null;
  teeTime?: string | null;
}

export interface ScorecardPrintOptions {
  eventTitle: string;
  courseName: string;
  dateLabel: string;
  numHoles: number;
  pars: number[];
  yardages?: (number | null)[] | null;
  strokeIndexes?: (number | null)[] | null;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
  scoringUrl: string;
  showQr: boolean;
  showSkins: boolean;
  skins?: SkinResult[];
  template: string;
  rowHeightPx: number;
}

const qrImg = (url: string, size = 84) =>
  `<img alt="Scan to score" src="https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}" style="width:${size}px;height:${size}px;" />`;

const summaryCols = (numHoles: number) => (numHoles > 9 ? ["Out", "In", "Tot"] : ["Out", "Tot"]);

function headerRow(o: ScorecardPrintOptions): string {
  const cells: string[] = [];
  for (let h = 1; h <= Math.min(9, o.numHoles); h++) cells.push(`<th>${h}</th>`);
  cells.push(`<th class="sum">Out</th>`);
  if (o.numHoles > 9) {
    for (let h = 10; h <= o.numHoles; h++) cells.push(`<th>${h}</th>`);
    cells.push(`<th class="sum">In</th>`);
  }
  cells.push(`<th class="sum">Tot</th>`);
  return `<tr class="head"><th class="lbl">Hole</th>${cells.join("")}</tr>`;
}

function valueRow(label: string, values: (number | null | undefined)[], o: ScorecardPrintOptions, cls = ""): string {
  const cells: string[] = [];
  const push = (v: unknown) => cells.push(`<td>${v ?? ""}</td>`);
  const sum = (from: number, to: number) =>
    values.slice(from, to).reduce<number>((a, v) => a + (Number(v) || 0), 0) || "";
  for (let i = 0; i < Math.min(9, o.numHoles); i++) push(values[i]);
  cells.push(`<td class="sum">${sum(0, 9)}</td>`);
  if (o.numHoles > 9) {
    for (let i = 9; i < o.numHoles; i++) push(values[i]);
    cells.push(`<td class="sum">${sum(9, o.numHoles)}</td>`);
  }
  cells.push(`<td class="sum">${sum(0, o.numHoles)}</td>`);
  return `<tr class="${cls}"><td class="lbl">${label}</td>${cells.join("")}</tr>`;
}

function blankRow(label: string, o: ScorecardPrintOptions): string {
  const count = o.numHoles + summaryCols(o.numHoles).length;
  const cells = Array.from({ length: count }, () => `<td style="height:${o.rowHeightPx}px;">&nbsp;</td>`).join("");
  return `<tr><td class="lbl">${label}</td>${cells}</tr>`;
}

function skinsStrip(o: ScorecardPrintOptions): string {
  if (!o.showSkins) return "";
  const rows = (o.skins || []).length
    ? (o.skins || [])
        .map(
          (s) =>
            `<span class="skin"><b>Hole ${s.hole}</b> ${s.winner} — ${s.score}${s.net ? " (net)" : ""}</span>`,
        )
        .join("")
    : `<span class="skin muted">Skins are in play on every hole — winners print here once scores are posted.</span>`;
  return `<div class="skins"><p class="skins-title">Skins</p><div class="skins-list">${rows}</div></div>`;
}

/** One printed card (a group / pairing). */
export function scorecardCardHtml(card: ScorecardCardData, o: ScorecardPrintOptions): string {
  const tpl = templateByKey(o.template);
  const labels = tpl.rows(card.playerNames);
  const logo = o.logoUrl
    ? `<img src="${o.logoUrl}" alt="" style="height:38px;object-fit:contain;" />`
    : "";

  return `
  <section class="card">
    <header>
      <div class="brand">
        ${logo}
        <div>
          <p class="title">${o.eventTitle}</p>
          <p class="meta">${[o.courseName, o.dateLabel].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div class="right">
        <p class="grp">Hole ${card.groupLabel}</p>
        ${card.teeTime ? `<p class="meta">Tee ${card.teeTime}</p>` : ""}
      </div>
    </header>

    <table>
      ${headerRow(o)}
      ${o.yardages && o.yardages.some((y) => (y || 0) > 0) ? valueRow("Yardage", o.yardages, o, "soft") : ""}
      ${o.strokeIndexes && o.strokeIndexes.some((y) => (y || 0) > 0) ? valueRow("Hole HCP", o.strokeIndexes, o, "soft") : ""}
      ${valueRow("Par", o.pars, o, "par")}
      ${labels
        .map((name, i) => blankRow(`${name}${card.handicaps[i] != null ? ` (${card.handicaps[i]})` : ""}`, o))
        .join("")}
      ${tpl.teamRow ? blankRow("Team", o) : ""}
    </table>

    ${skinsStrip(o)}

    <footer>
      ${o.showQr ? qrImg(o.scoringUrl) : ""}
      <div>
        <p class="scan">Scan to enter scores</p>
        <p class="url">${o.scoringUrl}</p>
        ${card.scoringCode ? `<p class="code">Scoring code: <b>${card.scoringCode}</b></p>` : ""}
        <p class="legend"><span class="circle">3</span> A circled score is a birdie</p>
      </div>
    </footer>
  </section>`;
}

export function scorecardsPrintCss(o: ScorecardPrintOptions): string {
  return `
  body { font-family: Georgia, serif; }
  .card { border:2px solid ${o.primaryColor}; border-radius:10px; padding:14px; margin:0 0 16px; page-break-inside:avoid; }
  .card header { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px; }
  .brand { display:flex; align-items:center; gap:10px; }
  .title { font-size:16px; font-weight:700; color:${o.primaryColor}; }
  .meta { font-size:11px; color:#666; }
  .grp { font-size:15px; font-weight:700; color:${o.primaryColor}; text-align:right; }
  table { width:100%; border-collapse:collapse; table-layout:fixed; }
  th, td { border:1px solid #ccc; text-align:center; font-size:11px; padding:3px 4px; }
  th.lbl, td.lbl { width:1.5in; text-align:left; font-weight:600; font-size:10px; white-space:nowrap; }
  tr.head th { background:#f4f4f4; font-weight:700; }
  tr.par td { background:#fafafa; font-weight:700; }
  tr.soft td { background:#fff; color:#555; }
  .sum { background:#eef4f1; color:${o.primaryColor}; font-weight:700; }
  .skins { margin-top:8px; border-top:1px dashed #bbb; padding-top:6px; }
  .skins-title { font-size:11px; font-weight:700; color:${o.secondaryColor}; text-transform:uppercase; letter-spacing:.06em; }
  .skins-list { display:flex; flex-wrap:wrap; gap:8px; margin-top:3px; }
  .skin { font-size:10px; color:#333; }
  .skin.muted { color:#777; }
  footer { display:flex; align-items:center; gap:12px; margin-top:10px; }
  .scan { font-size:11px; font-weight:700; color:${o.primaryColor}; }
  .url { font-size:10px; color:#555; }
  .code { font-size:10px; color:#333; }
  .legend { font-size:10px; color:#555; margin-top:3px; }
  .circle { display:inline-block; width:16px; height:16px; line-height:14px; text-align:center; border:1.5px solid ${o.primaryColor}; border-radius:50%; font-size:10px; }
  @page { margin: 0.4in; }
  `;
}

export function scorecardsPrintHtml(cards: ScorecardCardData[], o: ScorecardPrintOptions): string {
  return cards.map((c) => scorecardCardHtml(c, o)).join("");
}
