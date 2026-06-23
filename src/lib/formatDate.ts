/**
 * Format a tournament date string (YYYY-MM-DD or ISO) without timezone drift.
 *
 * `new Date("2026-09-11")` parses as UTC midnight, which renders as the
 * previous day in any negative-UTC timezone (e.g. shows 9/10 in the US).
 * Appending "T00:00:00" forces parsing in the viewer's local timezone so the
 * date displayed always matches the date the organizer entered.
 */
export function formatTournamentDate(
  date: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locales: string | string[] = "en-US",
): string {
  if (!date) return "";
  // If it's a date-only string (YYYY-MM-DD), pin it to local midnight.
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date;
  const d = new Date(safe);
  if (isNaN(d.getTime())) return "";
  return options ? d.toLocaleDateString(locales, options) : d.toLocaleDateString();
}
