/** Server-only helpers for the per-event Flat-Rate Pro option ($399, no 5% fee). */

export const FLAT_RATE_AMOUNT_CENTS = 39900;

export async function assertOrgMemberForTournament(
  supabase: any,
  admin: any,
  userId: string,
  tournamentId: string,
) {
  const { data: tournament } = await admin
    .from("tournaments")
    .select("id, title, organization_id, flat_rate_enabled, flat_rate_paid, flat_rate_paid_at, flat_rate_admin_override, flat_rate_override_reason, flat_rate_amount_cents")
    .eq("id", tournamentId)
    .maybeSingle();
  if (!tournament) throw new Error("Tournament not found");

  const { data: membership } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("organization_id", tournament.organization_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) throw new Error("Not authorized for this tournament");

  return tournament;
}

export async function assertPlatformAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin access required");
}

export async function logFlatRate(
  admin: any,
  row: {
    tournament_id: string;
    action: string;
    actor_user_id: string | null;
    amount_cents?: number | null;
    reason?: string | null;
    stripe_session_id?: string | null;
  },
) {
  try {
    await admin.from("tournament_flat_rate_log").insert(row);
  } catch (e) {
    console.error("[flatRate] log failed", e);
  }
}
