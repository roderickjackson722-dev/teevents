/**
 * Splits one pairings group (foursome) into its registered teams.
 *
 * A foursome counts as several teams only when every player belongs to a
 * registered team and there are at least two different teams in it (e.g. two
 * 2-person teams paired together). Otherwise the whole group stays one team,
 * which keeps every other event's leaderboard exactly as before.
 */
export interface FoursomeMember {
  id: string;
  group_id?: string | null;
}

export function splitFoursomeTeams<T extends FoursomeMember>(members: T[]): { key: string; members: T[] }[] {
  const allTeamed = members.length > 0 && members.every((m) => !!m.group_id);
  const distinct = new Set(members.map((m) => m.group_id).filter(Boolean));
  if (!allTeamed || distinct.size < 2) return [{ key: "group", members }];
  const out = new Map<string, T[]>();
  members.forEach((m) => {
    const k = m.group_id as string;
    out.set(k, [...(out.get(k) || []), m]);
  });
  return Array.from(out.entries()).map(([key, list]) => ({ key, members: list }));
}

/** Default team label from last names, e.g. "Martin / Williamson". */
export function defaultTeamLabel(names: { first_name?: string | null; last_name?: string | null }[]): string {
  return names
    .map((n) => (n.last_name || n.first_name || "").trim())
    .filter(Boolean)
    .join(" / ");
}
