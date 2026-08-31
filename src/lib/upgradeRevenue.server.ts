/**
 * Server-only helper that records a platform-upgrade purchase (Flat-Rate Pro,
 * Branding Removal, Digital Sponsor) as a platform revenue line so it shows up
 * on the Admin → Revenue Dashboard.
 *
 * The full amount is platform revenue (TeeVents is the seller for these
 * upgrades), so platform_fee_cents equals amount_cents and net is 0.
 * Idempotent on the Stripe session id.
 */

export type UpgradeType = "flat_rate_pro" | "branding_removal" | "digital_sponsor";

const LABELS: Record<UpgradeType, string> = {
  flat_rate_pro: "Flat-Rate Pro (one event)",
  branding_removal: "Branding Removal (one event)",
  digital_sponsor: "Digital Sponsor package (one event)",
};

export async function recordUpgradeRevenue(
  admin: any,
  args: {
    type: UpgradeType;
    organizationId: string;
    tournamentId: string;
    amountCents: number;
    stripeSessionId: string;
    stripePaymentIntentId?: string | null;
    userId?: string | null;
  },
) {
  if (!args.organizationId || !args.stripeSessionId) return;

  const { data: existing } = await admin
    .from("platform_transactions")
    .select("id")
    .eq("stripe_session_id", args.stripeSessionId)
    .eq("type", args.type)
    .maybeSingle();
  if (existing) return;

  await admin.from("platform_transactions").insert({
    organization_id: args.organizationId,
    tournament_id: args.tournamentId,
    amount_cents: args.amountCents,
    platform_fee_cents: args.amountCents,
    net_amount_cents: 0,
    type: args.type,
    status: "paid",
    stripe_session_id: args.stripeSessionId,
    stripe_payment_intent_id: args.stripePaymentIntentId ?? null,
    description: LABELS[args.type],
    metadata: { purchased_by: args.userId ?? null },
  });
}
