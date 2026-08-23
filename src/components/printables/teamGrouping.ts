import { effectiveScoringCode } from "./scoringCodes";
import { startingHoleLabelOf, type Registration } from "./types";

export interface RegistrationGroupRow {
  id: string;
  group_number: number | null;
  team_name: string | null;
  tee_time?: string | null;
  /** Starting hole assigned on the Pairings tab */
  starting_hole?: number | null;
  /** Exact printed starting-hole label from pairings, e.g. "11A" */
  starting_hole_label?: string | null;
  cart_sign_names?: { cart1?: string[]; cart2?: string[] } | null;
}

export interface PrintTeam {
  key: string;
  groupNumber: number | null;
  /** Starting hole from pairings (falls back to the group number) */
  startingHole: number | null;
  /** Printed starting-hole label, including lettered slots like "11A" */
  startingHoleLabel: string | null;
  groupId?: string;
  teamName: string;
  /** Tee time for this group, as saved on the pairings page (display string) */
  teeTime?: string | null;
  players: Registration[];
  scoringCode?: string | null;
}


const TEAM_FORMAT_HINTS = ["scramble", "best_ball", "bestball", "best ball", "foursome", "shootout", "team", "shamble", "chapman", "alternate"];

/** Whether a tournament scoring format uses one team score line instead of individual scores */
export function isTeamScoringFormat(format?: string | null): boolean {
  if (!format) return false;
  const f = format.toLowerCase();
  return TEAM_FORMAT_HINTS.some((h) => f.includes(h));
}

export function playerName(r: Registration): string {
  return `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
}

/** Group the roster into teams by pairing (hole) number. Unassigned players become solo teams. */
export function buildTeams(registrations: Registration[], groups: RegistrationGroupRow[] = []): PrintTeam[] {
  const byNumber = new Map<number, Registration[]>();
  const solo: Registration[] = [];

  for (const r of registrations) {
    if (r.group_number == null) solo.push(r);
    else {
      const list = byNumber.get(r.group_number) || [];
      list.push(r);
      byNumber.set(r.group_number, list);
    }
  }

  const teams: PrintTeam[] = [];
  [...byNumber.keys()].sort((a, b) => a - b).forEach((num) => {
    const players = (byNumber.get(num) || []).sort(
      (a, b) => (a.group_position ?? 99) - (b.group_position ?? 99)
    );
    const g = groups.find((x) => x.group_number === num);
    teams.push({
      key: `g-${num}`,
      groupNumber: num,
      startingHole: g?.starting_hole ?? (players.map((p) => (p as any).starting_hole).find((v) => v != null) ?? num),
      startingHoleLabel:
        (g?.starting_hole_label?.trim() ? g.starting_hole_label.trim().toUpperCase() : null) ??
        players.map((p) => startingHoleLabelOf(p as any)).find((v) => v != null) ??
        (g?.starting_hole != null ? String(g.starting_hole) : String(num)),
      groupId: g?.id,
      teamName: g?.team_name || `Group ${num}`,
      teeTime: g?.tee_time ?? (players.map((p) => (p as any).tee_time).find(Boolean) || null),
      players,
      scoringCode: players.map((p) => effectiveScoringCode(p)).find(Boolean) || null,
    });

  });

  solo.forEach((p) => {
    teams.push({
      key: `s-${p.id}`,
      groupNumber: null,
      startingHole: (p as any).starting_hole ?? null,
      startingHoleLabel: startingHoleLabelOf(p as any),
      teamName: playerName(p),
      teeTime: (p as any).tee_time || null,
      players: [p],
      scoringCode: effectiveScoringCode(p),
    });

  });

  return teams;
}

/** Split a team's players into two carts: [1,2] and [3,4] */
export function splitCarts(team: PrintTeam, override?: { cart1?: string[]; cart2?: string[] } | null): { cart1: string[]; cart2: string[] } {
  const names = team.players.map(playerName);
  const cart1 = override?.cart1?.length ? override.cart1 : names.slice(0, 2);
  const cart2 = override?.cart2?.length ? override.cart2 : names.slice(2, 4);
  return {
    cart1: cart1.filter((n) => (n || "").trim().length > 0),
    cart2: cart2.filter((n) => (n || "").trim().length > 0),
  };
}
