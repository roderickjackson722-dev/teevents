// Auto-format a plain-text agenda blob into readable HTML.
//
// Handles two flavors of input:
//  1) Structured flyer text using "━" runs as section separators and "•" as
//     bullet markers (e.g. "7:30 AM – Registration• Pick up packet• ...").
//  2) Legacy paste-in text where day headers (Friday, 8/21) and time tokens
//     (9:00am) drive the line breaks.

const DAY_HEADER_RE =
  /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat),?\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)?/gi;
const TIME_RE = /\d{1,2}:\d{2}\s?(?:am|pm)/gi;
const TIME_START_RE = /^\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)\b/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Format a single "section" that may contain a header followed by "• items".
// Example: "7:30 AM – Registration & Check-In Opens• Pick up packet• Warm up"
function formatSection(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Split on the • bullet marker.
  const parts = trimmed.split(/\s*•\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";

  const header = parts[0];
  const items = parts.slice(1);

  // Repair known OCR mash-ups like "Ceremony" split across "Cere" / "mon" / "y".
  // If the header ends mid-word and the first bullet begins mid-word, join them.
  const isTimeHeader = TIME_START_RE.test(header);
  const headerHtml = isTimeHeader
    ? `<h3 class="font-bold text-base mt-0 mb-2">${escapeHtml(header)}</h3>`
    : `<h2 class="font-bold text-lg mt-0 mb-2">${escapeHtml(header)}</h2>`;

  if (items.length === 0) return headerHtml;

  const li = items.map((it) => `<li>${escapeHtml(it)}</li>`).join("");
  return `${headerHtml}<ul class="list-disc pl-5 space-y-1">${li}</ul>`;
}

export function autoFormatAgenda(plain: string): string {
  if (!plain) return "";
  const text = plain.replace(/\r\n/g, "\n").trim();

  // Structured flyer format: split on runs of "━" (or ─) separators.
  if (/[━─]{3,}/.test(text)) {
    const sections = text
      .split(/[━─]{3,}/)
      .map((s) => s.trim())
      .filter(Boolean);
    return sections
      .map((s) => `<section class="mb-6 pb-6 border-b border-border last:border-0 last:mb-0 last:pb-0">${formatSection(s)}</section>`)
      .join("");
  }

  // Bullet-only format without separators.
  if (text.includes("•") && !/\n/.test(text)) {
    return formatSection(text);
  }

  // Legacy fallback: use day headers and time tokens to inject breaks.
  const hasNewlines = /\n/.test(text);
  let working = escapeHtml(text);

  if (!hasNewlines) {
    working = working.replace(DAY_HEADER_RE, (m) => `\n\n__DAYSTART__${m}__DAYEND__\n`);
    working = working.replace(/(\+\$\d+)(\d{1,2}:\d{2}\s?(?:am|pm))/gi, "$1\n$2");
    working = working.replace(TIME_RE, (m, offset, full) => {
      const before = full.slice(0, offset).replace(/\s+$/g, "");
      const prev = before.slice(-1);
      if (!prev || prev === "\n" || prev === "-" || prev === "–" || prev === "—") return m;
      return `\n${m}`;
    });
  } else {
    working = working.replace(DAY_HEADER_RE, (m) => `__DAYSTART__${m}__DAYEND__`);
  }

  const lines = working
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) =>
      l
        .replace(/__DAYSTART__/g, '<strong class="block mt-3 first:mt-0">')
        .replace(/__DAYEND__/g, "</strong>")
    );

  return lines.map((l) => `<p>${l}</p>`).join("");
}
