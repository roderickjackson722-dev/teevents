// Shared helper: determine whether to route a charge to the organizer's connected
// Stripe account (destination charge) or keep it on the platform (escrow).
//
// Honors `tournaments.payment_method_override`:
//   default        → organizer Stripe if connected & charges_enabled, else platform escrow
//   force_stripe   → must use organizer Stripe (throws if missing/not ready)
//   force_platform → always platform escrow (direct charge to TeeVents)
//
// Returns { useDestinationCharge, organizerStripeAccountId, override } and logs
// the decision so [Routing] entries appear in edge function logs.

export type RoutingDecision = {
  useDestinationCharge: boolean;
  organizerStripeAccountId: string | null;
  override: "default" | "force_stripe" | "force_platform";
};

export async function resolveRouting(
  supabaseAdmin: any,
  stripe: any,
  tournamentId: string,
  organizationId: string | null,
  paymentMethodOverride: string | null,
  context: string,
): Promise<RoutingDecision> {
  let organizerStripeAccountId: string | null = null;
  if (organizationId) {
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", organizationId)
      .single();
    organizerStripeAccountId = org?.stripe_account_id || null;
  }

  let organizerChargesReady = false;
  if (organizerStripeAccountId) {
    try {
      const acct = await stripe.accounts.retrieve(organizerStripeAccountId);
      organizerChargesReady = !!acct.charges_enabled;
      console.log(
        `[Routing/${context}] acct ${organizerStripeAccountId}: charges_enabled=${acct.charges_enabled}, payouts_enabled=${acct.payouts_enabled}, details_submitted=${acct.details_submitted}`,
      );
    } catch (e) {
      console.error(`[Routing/${context}] Failed to retrieve connected account ${organizerStripeAccountId}:`, e);
    }
  }

  const override = ((paymentMethodOverride as any) || "default") as RoutingDecision["override"];
  let useDestinationCharge = false;
  if (override === "force_stripe") {
    if (!organizerStripeAccountId) {
      throw new Error("Tournament organizer has not connected a payment account. Please contact the organizer.");
    }
    if (!organizerChargesReady) {
      throw new Error("Tournament organizer's payment account is connected but not yet enabled for charges. Please contact the organizer to complete Stripe onboarding.");
    }
    useDestinationCharge = true;
  } else if (override === "force_platform") {
    useDestinationCharge = false;
  } else {
    useDestinationCharge = !!organizerStripeAccountId && organizerChargesReady;
  }

  console.log(
    `[Routing/${context}] tournament=${tournamentId} override=${override} acct=${organizerStripeAccountId} ready=${organizerChargesReady} → ${useDestinationCharge ? "DESTINATION (organizer)" : "PLATFORM (TeeVents)"}`,
  );

  return { useDestinationCharge, organizerStripeAccountId, override };
}

// Compute platform fee + grossed-up Stripe processing fee for the application_fee_amount.
// Sponsor/registration logic uses the same math.
export const PLATFORM_FEE_RATE = 0.05;
export function computeFees(grossCents: number) {
  const platformFeeCents = Math.round(grossCents * PLATFORM_FEE_RATE);
  const preStripeTotal = grossCents + platformFeeCents;
  const stripeFeeCents = Math.max(0, Math.round((preStripeTotal + 30) / (1 - 0.029)) - preStripeTotal);
  const combinedFeesCents = platformFeeCents + stripeFeeCents;
  return { platformFeeCents, stripeFeeCents, combinedFeesCents };
}
