// Auto-format a legacy plain-text agenda blob into readable HTML.
// Inserts line breaks before time tokens (e.g. "9:00am", "11:00 AM") and
// wraps weekday/date headers (e.g. "Friday, 8/21") in bold on their own line.

const DAY_HEADER_RE =
  /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat),?\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)?/gi;
const TIME_RE = /\d{1,2}:\d{2}\s?(?:am|pm)/gi;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function autoFormatAgenda(plain: string): string {
  if (!plain) return "";
  let text = plain.replace(/\r\n/g, "\n").trim();

  // If author already used newlines, respect them.
  const hasNewlines = /\n/.test(text);
  let working = escapeHtml(text);

  if (!hasNewlines) {
    // Insert clean breaks around day headers, even when pasted text has no spaces
    // between the previous activity and the next weekday.
    working = working.replace(DAY_HEADER_RE, (m) => `\n\n__DAYSTART__${m}__DAYEND__\n`);
    // Repair common flyer/OCR text where a price and the next time touch: "+$207:00pm".
    working = working.replace(/(\+\$\d+?)(\d{1,2}:\d{2}\s?(?:am|pm))/gi, "$1\n$2");
    // Insert breaks before event start times, but not before the second time in a range.
    working = working.replace(TIME_RE, (m, offset, full) => {
      const before = full.slice(0, offset).replace(/\s+$/g, "");
      const prev = before.slice(-1);
      if (!prev || prev === "\n" || prev === "-" || prev === "–" || prev === "—") return m;
      return `\n${m}`;
    });
  } else {
    working = working.replace(DAY_HEADER_RE, (m) => `__DAYSTART__${m}__DAYEND__`);
  }

  // Build paragraphs
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
