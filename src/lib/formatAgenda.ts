// Auto-format a legacy plain-text agenda blob into readable HTML.
// Inserts line breaks before time tokens (e.g. "9:00am", "11:00 AM") and
// wraps weekday/date headers (e.g. "Friday, 8/21") in bold on their own line.

const DAY_HEADER_RE =
  /\b(Sun|Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat)[a-z]*,?\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)?/g;
const TIME_RE = /\b(\d{1,2}(?::\d{2})?\s?(?:am|pm|AM|PM))/g;

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
    // Insert breaks BEFORE day headers
    working = working.replace(DAY_HEADER_RE, (m) => `\n\n__DAYSTART__${m}__DAYEND__`);
    // Insert breaks BEFORE time tokens
    working = working.replace(TIME_RE, (m) => `\n${m}`);
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
