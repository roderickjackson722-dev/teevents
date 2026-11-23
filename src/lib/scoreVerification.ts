/** Score verification (attestation) rules shared by phone scoring, organizer close-out and public boards. */
export type VerificationMode = "off" | "standard" | "strict";
export type HoleState = "entered" | "confirmed" | "disputed";
export type PublicLabel = "attested" | "unverified" | "disputed";

export interface GroupPlayer { id: string; teamId: string | null }
export interface HoleStatusRow {
  hole: number; subject_key: string; member_ids: string[]; status: HoleState;
  entered: number | null; marker: number | null; organizer_entered?: boolean;
  resolution_reason?: string | null; resolved_at?: string | null;
}
export interface CardRow {
  subject_key: string; member_ids: string[]; player_ok_at: string | null; attested_at: string | null;
  attested_remote: boolean; force_attested_by: string | null; player_state: "dq" | "wd" | null;
}

const sameTeam = (a: GroupPlayer, b: GroupPlayer) => a.id === b.id || (!!a.teamId && a.teamId === b.teamId);

/**
 * Automatic marker: the next player in the group (wrapping) who is not the player and not a teammate.
 * Organizer reassignments override. Returns null when nobody in the group can legally mark.
 */
export function assignMarkers(players: GroupPlayer[], overrides: Record<string, string> = {}): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  players.forEach((p, i) => {
    const o = overrides[p.id];
    if (o && players.some((x) => x.id === o && !sameTeam(x, p))) { out[p.id] = o; return; }
    let pick: string | null = null;
    for (let k = 1; k < players.length; k++) {
      const c = players[(i + k) % players.length]!;
      if (!sameTeam(c, p)) { pick = c.id; break; }
    }
    out[p.id] = pick;
  });
  return out;
}

/** Marker for a subject (single player or a whole team's one score). */
export function markerForSubject(memberIds: string[], players: GroupPlayer[], overrides: Record<string, string> = {}): string | null {
  if (memberIds.length === 1) return assignMarkers(players, overrides)[memberIds[0]!] ?? null;
  const first = players.findIndex((p) => memberIds.includes(p.id));
  if (first < 0) return null;
  for (let k = 1; k <= players.length; k++) {
    const c = players[(first + k) % players.length]!;
    if (!memberIds.includes(c.id)) return c.id;
  }
  return null;
}

/** Can this actor attest this subject? Never self, never own team. */
export function canAttest(actorId: string, memberIds: string[], players: GroupPlayer[]): boolean {
  if (memberIds.includes(actorId)) return false;
  const actor = players.find((p) => p.id === actorId);
  if (!actor) return false;
  return !players.some((p) => memberIds.includes(p.id) && sameTeam(p, actor));
}

export function cardIsAttested(c: CardRow | undefined): boolean {
  return !!c && (!!c.attested_at || !!c.force_attested_by || !!c.player_state);
}

/** Organizer card status for close-out. */
export function cardStatus(rows: HoleStatusRow[], card: CardRow | undefined): "Unsubmitted" | "Entered" | "Confirmed" | "Attested" | "Disputed" {
  if (rows.some((r) => r.status === "disputed")) return "Disputed";
  if (card && (card.attested_at || card.force_attested_by)) return "Attested";
  if (rows.length === 0) return "Unsubmitted";
  if (rows.length >= 18 && rows.every((r) => r.status === "confirmed")) return card?.player_ok_at ? "Confirmed" : "Unsubmitted";
  return "Entered";
}

/** Public label: Attested only when player + marker attested on site (or organizer force-attest). */
export function publicLabel(rows: HoleStatusRow[], card: CardRow | undefined): PublicLabel {
  if (rows.some((r) => r.status === "disputed")) return "disputed";
  if (card && ((card.attested_at && !card.attested_remote) || card.force_attested_by)) return "attested";
  return "unverified";
}

/** Strict mode: the first hole the group may not move past (a hole with an unconfirmed entry). */
export function strictGateHole(rows: HoleStatusRow[], subjectKeys: string[], holes = 18): number | null {
  for (let h = 1; h <= holes; h++) {
    const hr = rows.filter((r) => r.hole === h);
    if (hr.length === 0) return null;
    if (subjectKeys.some((k) => hr.find((r) => r.subject_key === k)?.status !== "confirmed")) return h;
  }
  return null;
}

/** Row label for a leaderboard row covering these registrations: any Disputed wins, then any Unverified. */
export function rowVerification(memberIds: string[], labels: Record<string, PublicLabel>): PublicLabel {
  const ls = memberIds.map((id) => labels[id] ?? "unverified");
  if (ls.includes("disputed")) return "disputed";
  if (ls.length > 0 && ls.every((l) => l === "attested")) return "attested";
  return "unverified";
}
