// Pure helpers for the Players & Pairings roster so the logic can be unit tested.

export interface RosterPlayer {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  payment_status?: string | null;
  group_id?: string | null;
  group_leader?: boolean | null;
  group_number?: number | null;
  handicap?: number | null;
}

export type PaymentFilter = "all" | "paid" | "pending";

export const isPaidStatus = (p: Pick<RosterPlayer, "payment_status">) =>
  (p.payment_status || "").toLowerCase() === "paid";

export function countPayments<T extends RosterPlayer>(players: T[]) {
  const paid = players.filter(isPaidStatus).length;
  return { paid, pending: players.length - paid, total: players.length };
}

export function filterByPayment<T extends RosterPlayer>(players: T[], filter: PaymentFilter): T[] {
  if (filter === "all") return players;
  return players.filter((p) => (filter === "paid" ? isPaidStatus(p) : !isPaidStatus(p)));
}

export interface RegistrationGroup<T> {
  id: string;
  name: string;
  players: T[];
}

/** Groups registrations that signed up together (foursomes, twosomes, ...). */
export function buildRegistrationGroups<T extends RosterPlayer>(
  players: T[],
  groupNames: Record<string, string> = {}
): RegistrationGroup<T>[] {
  const byGroup = new Map<string, T[]>();
  players.forEach((p) => {
    if (!p.group_id) return;
    const list = byGroup.get(p.group_id) || [];
    list.push(p);
    byGroup.set(p.group_id, list);
  });
  return [...byGroup.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([id, list], idx) => ({
      id,
      name: groupNames[id] || `Group ${idx + 1}`,
      players: [...list].sort((a, b) => (a.group_leader === b.group_leader ? 0 : a.group_leader ? -1 : 1)),
    }));
}

/**
 * Splits players into pairing "units". Members of the same registration_group stay
 * in the same unit (chunked only when the group is larger than a hole allows).
 */
export function buildAutoAssignUnits<T extends RosterPlayer>(players: T[], maxGroupSize: number): T[][] {
  const size = Math.max(1, maxGroupSize);
  const byGroup = new Map<string, T[]>();
  const singles: T[] = [];
  players.forEach((p) => {
    if (p.group_id) {
      const list = byGroup.get(p.group_id) || [];
      list.push(p);
      byGroup.set(p.group_id, list);
    } else {
      singles.push(p);
    }
  });
  const units: T[][] = [];
  byGroup.forEach((list) => {
    for (let i = 0; i < list.length; i += size) units.push(list.slice(i, i + size));
  });
  units.sort((a, b) => b.length - a.length);
  singles.forEach((p) => units.push([p]));
  return units;
}

/** Teammates from the same registration group that are NOT on the given hole. */
export function teammatesAwayFromHole<T extends RosterPlayer>(
  player: T,
  players: T[],
  destGroupNumber: number | null
): T[] {
  if (!player.group_id || destGroupNumber === null) return [];
  return players.filter(
    (p) => p.id !== player.id && p.group_id === player.group_id && p.group_number !== destGroupNumber
  );
}
