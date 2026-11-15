/**
 * Presentation-only overrides for the public TeeVents sample event page
 * (/t/teevents-annual). Nothing here writes to the database; it only changes
 * what visitors see on that one demo page.
 */
export const SAMPLE_EVENT_SLUG = "teevents-annual";

const SAMPLE_TEAM_NAMES = ["Team Fairway", "The Birdie Boys", "Green Jackets", "Par-Tee People", "Eagle Eyes", "Chip Shots"];

export function isSampleEventSlug(slug: string | null | undefined): boolean {
  return (slug || "").toLowerCase() === SAMPLE_EVENT_SLUG;
}

export function applySampleTournament<T extends { slug?: string | null; course_name?: string | null; location?: string | null }>(t: T): T {
  if (!isSampleEventSlug(t?.slug)) return t;
  return { ...t, course_name: "Sample Course", location: "Demo event, no real address" };
}

export function applySampleLeaderboard<R extends { name: string; isTeam?: boolean }>(slug: string | null | undefined, rows: R[]): R[] {
  if (!isSampleEventSlug(slug)) return rows;
  let i = 0;
  return rows.map((r) => (r.isTeam ? { ...r, name: SAMPLE_TEAM_NAMES[i++ % SAMPLE_TEAM_NAMES.length] } : r));
}
