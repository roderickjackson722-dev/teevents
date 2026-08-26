/**
 * Which holes are actually played for a league event.
 * 18-hole events play 1-18. 9-hole events play either the front nine (1-9)
 * or the back nine (10-18), controlled by league_events.start_hole.
 */
export type HoleConfigSource = { holes?: number | null; start_hole?: number | null } | null | undefined;

export function eventHoleCount(ev: HoleConfigSource): 9 | 18 {
  return Number(ev?.holes) === 9 ? 9 : 18;
}

export function eventStartHole(ev: HoleConfigSource): 1 | 10 {
  if (eventHoleCount(ev) === 18) return 1;
  return Number(ev?.start_hole) === 10 ? 10 : 1;
}

/** Ordered list of hole numbers played, e.g. [10..18] for a back-nine event. */
export function eventHoleNumbers(ev: HoleConfigSource): number[] {
  const count = eventHoleCount(ev);
  const start = eventStartHole(ev);
  return Array.from({ length: count }, (_, i) => start + i);
}

export function isHolePlayed(ev: HoleConfigSource, hole: number): boolean {
  const start = eventStartHole(ev);
  const count = eventHoleCount(ev);
  return hole >= start && hole <= start + count - 1;
}

export function nineLabel(ev: HoleConfigSource): string {
  if (eventHoleCount(ev) === 18) return "18 holes";
  return eventStartHole(ev) === 10 ? "9 holes · Back (10-18)" : "9 holes · Front (1-9)";
}
