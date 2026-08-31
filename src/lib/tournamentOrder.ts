/**
 * Ordering helpers for tournament pickers.
 *
 * Organizers should always land on an event they are still working on, so
 * upcoming events come first (soonest first), then undated drafts, and
 * completed/past events last. A past event is never the default selection.
 */

export interface OrderableTournament {
  id: string;
  date?: string | null;
  end_date?: string | null;
  status?: string | null;
}

const dayMs = 24 * 60 * 60 * 1000;

/** True when the event's last day is more than a day in the past. */
export function isPastTournament(t: OrderableTournament, now = Date.now()): boolean {
  const raw = t.end_date || t.date;
  if (!raw) return false;
  const end = new Date(`${String(raw).slice(0, 10)}T23:59:59`).getTime();
  if (Number.isNaN(end)) return false;
  return end < now - dayMs;
}

function rank(t: OrderableTournament, now: number): number {
  if (isPastTournament(t, now)) return 2;
  return t.date ? 0 : 1; // upcoming dated, then undated drafts
}

/** Upcoming first (soonest), then undated drafts, then past events (most recent first). */
export function sortTournamentsForPicker<T extends OrderableTournament>(list: T[], now = Date.now()): T[] {
  return [...list].sort((a, b) => {
    const ra = rank(a, now);
    const rb = rank(b, now);
    if (ra !== rb) return ra - rb;
    const da = a.date ? new Date(`${String(a.date).slice(0, 10)}T12:00:00`).getTime() : 0;
    const db = b.date ? new Date(`${String(b.date).slice(0, 10)}T12:00:00`).getTime() : 0;
    if (ra === 2) return db - da; // past: most recent first
    return da - db; // upcoming: soonest first
  });
}
