import type { Registration } from "./types";

export interface RegistrationGroupRow {
  id: string;
  group_number: number | null;
  team_name: string | null;
  tee_time?: string | null;
  cart_sign_names?: { cart1?: string[]; cart2?: string[] } | null;
}

export interface PrintTeam {
  key: string;
  groupNumber: number | null;
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
      groupId: g?.id,
      teamName: g?.team_name || `Hole ${num}`,
      players,
      scoringCode: players.map((p) => (p as any).group_scoring_code || (p as any).scoring_code).find(Boolean) || null,
    });
  });

  solo.forEach((p) => {
    teams.push({
      key: `s-${p.id}`,
      groupNumber: null,
      teamName: playerName(p),
      players: [p],
      scoringCode: (p as any).group_scoring_code || (p as any).scoring_code || null,
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
