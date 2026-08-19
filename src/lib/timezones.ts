// Helpers for scheduling emails in a chosen time zone rather than the
// organizer's device time zone.

export const TIMEZONES: Array<{ value: string; label: string }> = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  { value: "America/Puerto_Rico", label: "Atlantic (Puerto Rico)" },
  { value: "UTC", label: "UTC" },
];

/** Best-effort guess of the viewer's time zone, falling back to Eastern. */
export function guessTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONES.some((t) => t.value === tz)) return tz;
    if (tz) return tz;
  } catch { /* ignore */ }
  return "America/New_York";
}

function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    parts["year"]!,
    (parts["month"]! - 1),
    parts["day"]!,
    parts["hour"]! % 24,
    parts["minute"]!,
    parts["second"]!,
  );
  return asUtc - date.getTime();
}

/**
 * Converts a `datetime-local` value ("2026-08-19T09:00") interpreted in `tz`
 * into a real UTC Date. Runs the offset lookup twice so DST edges resolve.
 */
export function zonedInputToUtc(local: string, tz: string): Date {
  const [datePart, timePart = "00:00"] = local.split("T");
  const [y, m, d] = (datePart || "").split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  const naive = Date.UTC(y, m - 1, d, h || 0, mi || 0, 0);
  let ts = naive - tzOffsetMs(new Date(naive), tz);
  ts = naive - tzOffsetMs(new Date(ts), tz);
  return new Date(ts);
}

/** Formats an ISO timestamp in a specific time zone with a short label. */
export function formatInTimezone(iso: string, tz?: string | null): string {
  const zone = tz || guessTimezone();
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      dateStyle: "medium",
      timeStyle: "short",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}
