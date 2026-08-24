// Shared helper for Stripe Connect DIRECT CHARGES with PLATFORM FALLBACK.
//
// Default: charge runs on the organizer's connected Stripe account; TeeVents
// takes a 5% application fee.
//
// Fallback: if the organizer has not connected Stripe (or their account
// can't accept charges yet), the charge runs on the PLATFORM TeeVents
// account so attendees can still check out. An admin email is sent to
// info@teevents.golf so the team can perform a manual payout to the
// organizer.

export const PLATFORM_FEE_RATE = 0.05;
export const PLATFORM_FALLBACK_EMAIL = "info@teevents.golf";

export type ConnectedAccount = {
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  isPlatformFallback: boolean;
  organizationName?: string | null;
};

/**
 * Resolve which Stripe account should receive the charge. Never throws for
 * "organizer not connected" — returns a platform-fallback result instead.
 */
export async function requireConnectedAccount(
  supabaseAdmin: any,
  stripe: any,
  organizationId: string | null,
  context: string,
): Promise<ConnectedAccount> {
  const fallback = (orgName?: string | null): ConnectedAccount => ({
    stripeAccountId: null,
    chargesEnabled: false,
    payoutsEnabled: false,
    isPlatformFallback: true,
    organizationName: orgName ?? null,
  });

  if (!organizationId) {
    console.warn(`[Direct/${context}] No organization on tournament — platform fallback.`);
    return fallback(null);
  }

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("stripe_account_id, name")
    .eq("id", organizationId)
    .single();

  const stripeAccountId = org?.stripe_account_id || null;
  if (!stripeAccountId) {
    console.warn(`[Direct/${context}] Org ${organizationId} has no Stripe account — platform fallback.`);
    return fallback(org?.name);
  }

  try {
    const acct = await stripe.accounts.retrieve(stripeAccountId);
    console.log(
      `[Direct/${context}] acct ${stripeAccountId}: charges_enabled=${acct.charges_enabled}, payouts_enabled=${acct.payouts_enabled}`,
    );
    if (!acct.charges_enabled) {
      console.warn(`[Direct/${context}] Acct ${stripeAccountId} cannot accept charges — platform fallback.`);
      return fallback(org?.name);
    }
    return {
      stripeAccountId,
      chargesEnabled: true,
      payoutsEnabled: !!acct.payouts_enabled,
      isPlatformFallback: false,
      organizationName: org?.name ?? null,
    };
  } catch (e: any) {
    console.error(`[Direct/${context}] Failed to retrieve acct ${stripeAccountId}, falling back:`, e?.message || e);
    return fallback(org?.name);
  }
}

/** Stripe SDK second-arg options. Undefined when platform fallback so stripe-node doesn't reject an empty options object. */
export function stripeAccountOpts(account: ConnectedAccount): Record<string, string> | undefined {
  return account.isPlatformFallback || !account.stripeAccountId
    ? undefined
    : { stripeAccount: account.stripeAccountId };
}

/** "&acct=xxx" suffix to append to success URLs, or "" for fallback. */
export function acctQuerySuffix(account: ConnectedAccount): string {
  return account.isPlatformFallback || !account.stripeAccountId
    ? ""
    : `&acct=${account.stripeAccountId}`;
}

/** payment_intent_data fragment with application_fee — empty for fallback. */
export function applicationFeeBlock(account: ConnectedAccount, applicationFeeAmount: number) {
  if (account.isPlatformFallback || !account.stripeAccountId) return {};
  return { payment_intent_data: { application_fee_amount: applicationFeeAmount } };
}

/** Fire-and-forget admin email when checkout was routed to the platform.
 *  IMPORTANT: only sends when `confirmed: true` — i.e. after Stripe has
 *  actually captured the payment. Calls without `confirmed` are a no-op so
 *  that create-checkout code paths don't send premature "manual payout
 *  required" emails for sessions the customer may abandon. */
export async function notifyPlatformFallback(params: {
  context: string;
  organizationId: string | null;
  organizationName?: string | null;
  tournamentId: string | null;
  tournamentTitle?: string | null;
  grossCents: number;
  buyerEmail?: string | null;
  stripeSessionId?: string | null;
  confirmed?: boolean;
}) {
  if (!params.confirmed) return; // Do not email until payment is captured.
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return;
    const dollars = (params.grossCents / 100).toFixed(2);
    const subject = `[Manual payout required] ${params.context} charged on platform account — $${dollars}`;
    const html = `
      <h2>Platform fallback charge — manual payout required</h2>
      <p>A <b>${params.context}</b> checkout was captured on the TeeVents platform Stripe account
      because the organizer has not connected (or completed) Stripe onboarding.</p>
      <ul>
        <li><b>Amount:</b> $${dollars}</li>
        <li><b>Organizer:</b> ${params.organizationName || "—"} (${params.organizationId || "no org"})</li>
        <li><b>Tournament:</b> ${params.tournamentTitle || "—"} (${params.tournamentId || "—"})</li>
        <li><b>Buyer:</b> ${params.buyerEmail || "—"}</li>
        <li><b>Stripe session:</b> ${params.stripeSessionId || "—"}</li>
      </ul>
      <p>Please contact the organizer to collect payout details and issue a manual payout
      (less the 5% TeeVents platform fee).</p>
    `;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "TeeVents <info@notifications.teevents.golf>",
        to: [PLATFORM_FALLBACK_EMAIL],
        reply_to: "info@teevents.golf",
        subject,
        html,
      }),
    });
  } catch (e) {
    console.error("[notifyPlatformFallback] failed:", e);
  }
}

/** Look up a completed session's routing log; if it ran on the platform
 *  fallback account, send the admin "manual payout required" email. Safe to
 *  call unconditionally from verify-* functions after payment_status==="paid". */
export async function notifyPlatformFallbackForConfirmedSession(
  supabaseAdmin: any,
  stripeSessionId: string | null | undefined,
  fallbackMeta?: {
    context?: string;
    tournamentTitle?: string | null;
    buyerEmail?: string | null;
  },
) {
  if (!stripeSessionId) return;
  try {
    const { data: log } = await supabaseAdmin
      .from("payment_routing_logs")
      .select("context, organization_id, tournament_id, gross_cents, buyer_email, routing_decision")
      .eq("stripe_session_id", stripeSessionId)
      .maybeSingle();
    if (!log || log.routing_decision !== "platform_fallback") return;

    let orgName: string | null = null;
    if (log.organization_id) {
      const { data: org } = await supabaseAdmin
        .from("organizations").select("name").eq("id", log.organization_id).maybeSingle();
      orgName = org?.name ?? null;
    }

    await notifyPlatformFallback({
      context: log.context || fallbackMeta?.context || "payment",
      organizationId: log.organization_id ?? null,
      organizationName: orgName,
      tournamentId: log.tournament_id ?? null,
      tournamentTitle: fallbackMeta?.tournamentTitle ?? null,
      grossCents: Number(log.gross_cents) || 0,
      buyerEmail: log.buyer_email ?? fallbackMeta?.buyerEmail ?? null,
      stripeSessionId,
      confirmed: true,
    });
  } catch (e) {
    console.error("[notifyPlatformFallbackForConfirmedSession] failed:", e);
  }
}

/**
 * Flat-Rate Pro: when a tournament has paid the one-time flat fee (or an admin
 * granted the override), NO 5% platform fee is charged on its transactions.
 * Returns false on any lookup problem so billing never silently breaks.
 */
export async function isFlatRateTournament(
  supabaseAdmin: any,
  tournamentId: string | null | undefined,
): Promise<boolean> {
  if (!tournamentId) return false;
  try {
    const { data } = await supabaseAdmin
      .from("tournaments")
      .select("flat_rate_enabled")
      .eq("id", tournamentId)
      .maybeSingle();
    return !!data?.flat_rate_enabled;
  } catch (e) {
    console.error("[isFlatRateTournament] lookup failed:", e);
    return false;
  }
}

// Compute platform fee + grossed-up Stripe processing fee for application_fee_amount.
// When `flatRate` is true the 5% platform fee is waived (Flat-Rate Pro event).
export function computeFees(grossCents: number, flatRate = false) {
  const platformFeeCents = flatRate ? 0 : Math.round(grossCents * PLATFORM_FEE_RATE);
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
    stripeAccountId: string | null;
    grossCents: number;
    platformFeeCents: number;
    stripeFeeCents: number;
    applicationFeeCents: number;
    passFeesToParticipants?: boolean | null;
    stripeSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    buyerEmail?: string | null;
    notes?: string | null;
    isPlatformFallback?: boolean;
  },
) {
  try {
    await supabaseAdmin.from("payment_routing_logs").insert({
      context: params.context,
      tournament_id: params.tournamentId,
      organization_id: params.organizationId,
      organizer_stripe_account_id: params.stripeAccountId,
      organizer_charges_ready: !params.isPlatformFallback,
      payment_method_override: "default",
      routing_decision: params.isPlatformFallback ? "platform_fallback" : "direct",
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
