// Shared helper for Stripe Connect DIRECT CHARGES.
//
// As of the Direct Charges migration, every paid checkout MUST run on the
// organizer's connected Stripe account. The organizer is the merchant of
// record; TeeVents only takes its 5% application fee. There is no longer a
// "platform escrow" fallback — if the organizer's account isn't ready,
// checkout is refused with a clear error.

export const PLATFORM_FEE_RATE = 0.05;

export type ConnectedAccount = {
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

/**
 * Look up the organization's connected Stripe account and verify it can
 * accept charges. Throws a user-friendly error otherwise.
 */
export async function requireConnectedAccount(
  supabaseAdmin: any,
  stripe: any,
  organizationId: string | null,
  context: string,
): Promise<ConnectedAccount> {
  if (!organizationId) {
    throw new Error("Tournament is not linked to an organization.");
  }

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("stripe_account_id, name")
    .eq("id", organizationId)
    .single();

  const stripeAccountId = org?.stripe_account_id || null;
  if (!stripeAccountId) {
    throw new Error(
      "This organizer hasn't connected a Stripe payout account yet, so payments can't be accepted. Please check back soon.",
    );
  }

  try {
    const acct = await stripe.accounts.retrieve(stripeAccountId);
    console.log(
      `[Direct/${context}] acct ${stripeAccountId}: charges_enabled=${acct.charges_enabled}, payouts_enabled=${acct.payouts_enabled}, details_submitted=${acct.details_submitted}`,
    );
    if (!acct.charges_enabled) {
      throw new Error(
        "This organizer's Stripe account isn't enabled to accept charges yet. They may still be finishing onboarding — please check back soon.",
      );
    }
    return {
      stripeAccountId,
      chargesEnabled: !!acct.charges_enabled,
      payoutsEnabled: !!acct.payouts_enabled,
    };
  } catch (e: any) {
    if (e?.message && e.message.startsWith("This organizer's Stripe")) throw e;
    console.error(`[Direct/${context}] Failed to retrieve connected account ${stripeAccountId}:`, e);
    throw new Error(
      "We couldn't verify the organizer's payment account with Stripe right now. Please try again in a few minutes.",
    );
  }
}

// Compute platform fee + grossed-up Stripe processing fee for application_fee_amount.
export function computeFees(grossCents: number) {
  const platformFeeCents = Math.round(grossCents * PLATFORM_FEE_RATE);
  const preStripeTotal = grossCents + platformFeeCents;
  const stripeFeeCents = Math.max(0, Math.round((preStripeTotal + 30) / (1 - 0.029)) - preStripeTotal);
  const combinedFeesCents = platformFeeCents + stripeFeeCents;
  return { platformFeeCents, stripeFeeCents, combinedFeesCents };
}

// Best-effort routing log. With Direct Charges this is always "direct".
export async function logDirectCharge(
  supabaseAdmin: any,
  params: {
    context: string;
    tournamentId: string | null;
    organizationId: string | null;
    stripeAccountId: string;
    grossCents: number;
    platformFeeCents: number;
    stripeFeeCents: number;
    applicationFeeCents: number;
    passFeesToParticipants?: boolean | null;
    stripeSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    buyerEmail?: string | null;
    notes?: string | null;
  },
) {
  try {
    await supabaseAdmin.from("payment_routing_logs").insert({
      context: params.context,
      tournament_id: params.tournamentId,
      organization_id: params.organizationId,
      organizer_stripe_account_id: params.stripeAccountId,
      organizer_charges_ready: true,
      payment_method_override: "default",
      routing_decision: "direct",
      gross_cents: params.grossCents,
      platform_fee_cents: params.platformFeeCents,
      stripe_fee_cents: params.stripeFeeCents,
      application_fee_cents: params.applicationFeeCents,
      pass_fees_to_participants: params.passFeesToParticipants ?? null,
      stripe_session_id: params.stripeSessionId ?? null,
      stripe_payment_intent_id: params.stripePaymentIntentId ?? null,
      buyer_email: params.buyerEmail ?? null,
      notes: params.notes ?? null,
    });
  } catch (e) {
    console.error(`[Direct/${params.context}] Failed to insert payment_routing_logs:`, e);
  }
}

// ─── Legacy compatibility shims ───────────────────────────────────────────────
// Older code paths import these names. They now delegate to the direct-charge
// flow so nothing falls back to platform escrow.

export type RoutingDecision = {
  useDestinationCharge: boolean;
  organizerStripeAccountId: string | null;
  override: "default" | "force_stripe" | "force_platform";
  organizerChargesReady: boolean;
};

/** @deprecated use requireConnectedAccount instead. Kept so old imports compile. */
export async function resolveRouting(
  supabaseAdmin: any,
  stripe: any,
  _tournamentId: string,
  organizationId: string | null,
  _paymentMethodOverride: string | null,
  context: string,
): Promise<RoutingDecision> {
  const acct = await requireConnectedAccount(supabaseAdmin, stripe, organizationId, context);
  return {
    useDestinationCharge: true,
    organizerStripeAccountId: acct.stripeAccountId,
    override: "default",
    organizerChargesReady: true,
  };
}

/** @deprecated use logDirectCharge. */
export async function logRoutingDecision(
  supabaseAdmin: any,
  params: {
    context: string;
    tournamentId: string | null;
    organizationId: string | null;
    routing: RoutingDecision;
    organizerChargesReady?: boolean;
    grossCents: number;
    platformFeeCents: number;
    stripeFeeCents: number;
    applicationFeeCents: number;
    passFeesToParticipants?: boolean | null;
    stripeSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    buyerEmail?: string | null;
    notes?: string | null;
  },
) {
  if (!params.routing.organizerStripeAccountId) return;
  await logDirectCharge(supabaseAdmin, {
    context: params.context,
    tournamentId: params.tournamentId,
    organizationId: params.organizationId,
    stripeAccountId: params.routing.organizerStripeAccountId,
    grossCents: params.grossCents,
    platformFeeCents: params.platformFeeCents,
    stripeFeeCents: params.stripeFeeCents,
    applicationFeeCents: params.applicationFeeCents,
    passFeesToParticipants: params.passFeesToParticipants ?? null,
    stripeSessionId: params.stripeSessionId ?? null,
    stripePaymentIntentId: params.stripePaymentIntentId ?? null,
    buyerEmail: params.buyerEmail ?? null,
    notes: params.notes ?? null,
  });
}
