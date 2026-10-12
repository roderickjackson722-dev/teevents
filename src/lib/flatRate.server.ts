/** Server-only helpers for grandfathered and current Per-Event pricing. */

export const LEGACY_FLAT_RATE_AMOUNT_CENTS = 15000;
// $299 applies to events created before the Oct 12, 2026 price change (their
// flat_rate_amount_cents still holds the default); events created on or after
// that date are stamped with 39900 at creation and use the $399 price below.
export const FLAT_RATE_AMOUNT_CENTS = 29900;
export const FLAT_RATE_AMOUNT_CENTS_CURRENT = 39900;
export const PER_EVENT_STRIPE_PRICE_ID = "price_1ULsIR7UK8GxgadTNWqa8KCz";
export const PER_EVENT_STRIPE_PRICE_ID_CURRENT = "price_1UPrT67UK8GxgadTO4RDJYcq";

export async function assertOrgMemberForTournament(
  supabase: any,
  admin: any,
  userId: string,
  tournamentId: string,
) {
  const { data: tournament } = await admin
    .from("tournaments")
    .select("id, title, organization_id, pricing_version, pricing_model, event_fee_paid, flat_rate_enabled, flat_rate_paid, flat_rate_paid_at, flat_rate_admin_override, flat_rate_override_reason, flat_rate_amount_cents")
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
