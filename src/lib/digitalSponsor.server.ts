/** Server-only helpers for the per-event Digital Sponsor package ($799 flat fee). */

export const DIGITAL_SPONSOR_AMOUNT_CENTS = 79900;

export async function assertOrgMemberForDigitalSponsor(
  supabase: any,
  admin: any,
  userId: string,
  tournamentId: string,
) {
  const { data: tournament } = await admin
    .from("tournaments")
    .select(
      "id, title, organization_id, digital_sponsor_purchased, digital_sponsor_purchased_at, digital_sponsor_amount_cents",
    )
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
