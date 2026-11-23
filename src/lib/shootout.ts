/**
 * Shootout elimination: on each hole in order, among players still in, the
 * single worst score is eliminated. A tie for worst is never settled by the
 * system (it needs a chip-off or putt-off), so elimination stops at that hole
 * until the organizer resolves it.
 */
export interface ShootoutResult {
  survivors: string[];
  eliminated: { id: string; hole: number }[];
  /** Hole waiting on a chip-off / putt-off, if any. */
  tieHole: number | null;
  tiedIds: string[];
}

export function shootoutStandings(
  players: { id: string; holes: Record<number, number> }[],
  holeOrder: number[] = Array.from({ length: 18 }, (_, i) => i + 1),
): ShootoutResult {
  let alive = players.map((p) => p.id);
  const byId = new Map(players.map((p) => [p.id, p]));
  const eliminated: { id: string; hole: number }[] = [];
  for (const hole of holeOrder) {
    if (alive.length <= 1) break;
    const scored = alive.map((id) => ({ id, s: byId.get(id)!.holes[hole] }));
    if (scored.some((x) => x.s == null)) break; // hole not finished by everyone still in
    const worst = Math.max(...scored.map((x) => x.s as number));
    const losers = scored.filter((x) => x.s === worst);
    if (losers.length > 1) {
      return { survivors: alive, eliminated, tieHole: hole, tiedIds: losers.map((l) => l.id) };
    }
    eliminated.push({ id: losers[0]!.id, hole });
    alive = alive.filter((id) => id !== losers[0]!.id);
  }
  return { survivors: alive, eliminated, tieHole: null, tiedIds: [] };
}
