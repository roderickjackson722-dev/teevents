/**
 * Normalizes free-form event schedule text into short, one-item-per-line output
 * so emails read well on phones (no long unbroken lines).
 * Mirror of src/lib/formatSchedule.ts.
 */
const TIME_RE = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM|a\.m\.|p\.m\.)/;

function normalizeItem(line: string): string {
  const m = line.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM|a\.m\.|p\.m\.))\s*[-–—:,]?\s*(.*)$/);
  if (m && m[2]) {
    const time = m[1].replace(/\s+/g, " ").replace(/a\.m\./i, "AM").replace(/p\.m\./i, "PM").toUpperCase();
    return `${time} — ${m[2].trim()}`;
  }
  return line;
}

export function formatScheduleLines(raw: string): string[] {
  const s = (raw || "").replace(/\r/g, "").trim();
  if (!s) return [];
  const parts = s.split(/\n+|\s*[•·|]\s*/);
  const out: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const withBreaks = trimmed.replace(
      new RegExp(`(?!^)\\s*(?=${TIME_RE.source})`, "g"),
      "\n",
    );
    for (const rawLine of withBreaks.split("\n")) {
      const line = rawLine.trim().replace(/^[-–—•*]\s*/, "").replace(/\s{2,}/g, " ").replace(/[,;]$/, "");
      if (line) out.push(normalizeItem(line));
    }
  }
  return out;
}

export function formatScheduleText(raw: string): string {
  return formatScheduleLines(raw).join("\n");
}
