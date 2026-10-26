/**
 * Printout-only selections for Enterprise Printables. Everything here is a
 * pure, in-memory copy: nothing is ever written back to the event.
 */
export interface SelectablePlayer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  group_number: number | null;
  group_position: number | null;
  group_label?: string | null;
  tee_time?: string | null;
}

export interface DraftPlayer<T extends SelectablePlayer = SelectablePlayer> {
  base: T | null;
  id: string;
  first_name: string;
  last_name: string;
  group_number: number | null;
  tee_time: string | null;
  include: boolean;
  added: boolean;
}

export interface GroupLike {
  group_number: number | null;
  tee_time?: string | null;
}

export function draftFrom<T extends SelectablePlayer>(rows: T[]): DraftPlayer<T>[] {
  return rows.map((r) => ({
    base: r,
    id: r.id,
    first_name: r.first_name,
    last_name: r.last_name,
    group_number: r.group_number,
    tee_time: (r.tee_time as string | null) ?? null,
    include: true,
    added: false,
  }));
}

export function addedPlayer(first: string, last: string, group: number | null): DraftPlayer {
  return {
    base: null,
    id: `printout-${Math.random().toString(36).slice(2, 10)}`,
    first_name: first.trim(),
    last_name: last.trim(),
    group_number: group,
    tee_time: null,
    include: true,
    added: true,
  };
}

/** Build the registrations the printables receive, with printout-only overrides applied. */
export function printoutPlayers<T extends SelectablePlayer>(draft: DraftPlayer<T>[]): T[] {
  return draft
    .filter((d) => d.include)
    .map((d) => {
      const base = (d.base ?? { email: "", group_position: null, group_label: null }) as T;
      const groupChanged = d.base ? d.base.group_number !== d.group_number : true;
      return {
        ...base,
        id: d.id,
        first_name: d.first_name,
        last_name: d.last_name,
        group_number: d.group_number,
        tee_time: d.tee_time,
        group_label: groupChanged ? null : base.group_label ?? null,
      } as T;
    });
}

/** Copy of the event's groups with tee times overridden from the printout selections. */
export function printoutGroups<G extends GroupLike>(groups: G[], players: SelectablePlayer[]): G[] {
  const teeByGroup = new Map<number, string | null>();
  for (const p of players) {
    if (p.group_number != null && !teeByGroup.has(p.group_number)) teeByGroup.set(p.group_number, (p.tee_time as string | null) ?? null);
  }
  return groups.map((g) =>
    g.group_number != null && teeByGroup.has(g.group_number) && teeByGroup.get(g.group_number)
      ? { ...g, tee_time: teeByGroup.get(g.group_number) }
      : { ...g },
  );
}
