import { allocatePaymentAmount, refundAmounts } from "./refundAmounts";

export async function prepareRefund(input: { registrationId: string; requestId?: string; amountCents?: number }, context: { supabase: any; userId: string }) {
  // Read as the caller and verify membership/role before using privileged clients.
  const { data: registration, error: registrationError } = await context.supabase.from("tournament_registrations").select("id, tournament_id, payment_status, first_name, last_name, email, payment_method").eq("id", input.registrationId).single();
  if (registrationError || !registration) throw new Error("Registration not found or unavailable.");
  const { data: tournament } = await context.supabase.from("tournaments").select("id, title, organization_id").eq("id", registration.tournament_id).single();
  if (!tournament) throw new Error("Tournament not available.");
  const [{ data: isAdmin }, { data: isMember }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("is_org_member", { _user_id: context.userId, _org_id: tournament.organization_id }),
  ]);
  if (!isAdmin && !isMember) throw new Error("Not authorized to refund this registration.");
  if (registration.payment_method === "check" || registration.payment_method === "cash") throw new Error("This is an offline registration. No Stripe refund will be issued.");
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  let requestedAmount = input.amountCents;
  if (input.requestId) {
    const { data: request } = await admin.from("tournament_refund_requests").select("registration_id, status, amount_cents, stripe_refund_id").eq("id", input.requestId).single();
    if (!request || request.registration_id !== registration.id || request.status !== "pending" || request.stripe_refund_id) throw new Error("Refund request is no longer pending.");
    requestedAmount = requestedAmount ?? request.amount_cents;
  }
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Stripe payments are not configured.");
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" as any });
  const [{ data: organization }, { data: payout }, { data: transactions, error: txError }] = await Promise.all([
    admin.from("organizations").select("stripe_account_id").eq("id", tournament.organization_id).single(),
    admin.from("organization_payout_methods").select("stripe_account_id").eq("organization_id", tournament.organization_id).maybeSingle(),
    admin.from("platform_transactions").select("stripe_session_id, stripe_payment_intent_id, metadata").eq("tournament_id", tournament.id).eq("type", "registration").in("status", ["paid", "succeeded"]).order("created_at", { ascending: false }),
  ]);
  if (txError) throw new Error("Original payment could not be read.");
  const transaction = transactions?.find((row: { metadata: unknown }) => {
    const metadata = row.metadata as { registration_ids?: unknown } | null;
    const ids = metadata?.registration_ids;
    return Array.isArray(ids) ? ids.includes(registration.id) : typeof ids === "string" && ids.split(",").includes(registration.id);
  });
  if (!transaction?.stripe_session_id) throw new Error("The original Stripe payment could not be verified. No refund was issued.");
  const accountIds: Array<string | undefined> = [...new Set([payout?.stripe_account_id || organization?.stripe_account_id || undefined, undefined])];
  let session: import("stripe").default.Checkout.Session | null = null;
  let stripeAccount: string | undefined;
  for (const account of accountIds) {
    try {
      const candidate = await stripe.checkout.sessions.retrieve(transaction.stripe_session_id, {}, account ? { stripeAccount: account } : undefined);
      if (candidate.payment_status === "paid" && candidate.metadata?.registration_ids?.split(",").includes(registration.id)) { session = candidate; stripeAccount = account; break; }
    } catch { /* A historical payment can live on the platform rather than today's connected account. */ }
  }
  if (!session || typeof session.payment_intent !== "string") throw new Error("The original paid Stripe session could not be verified. No refund was issued.");
  const opts = stripeAccount ? { stripeAccount } : undefined;
  const intent = await stripe.paymentIntents.retrieve(session.payment_intent, { expand: ["latest_charge.balance_transaction"] }, opts);
  const charge = intent.latest_charge;
  if (!charge || typeof charge === "string" || !charge.paid) throw new Error("Stripe charge details are unavailable.");
  const balance = charge.balance_transaction;
  if (!balance || typeof balance === "string") throw new Error("Stripe processing fees are not available yet. Please try again later.");
  const ids = session.metadata?.registration_ids?.split(",").filter(Boolean) || [];
  const index = ids.indexOf(registration.id);
  const metadata = session.metadata || {};
  if (metadata.tournament_id !== tournament.id) throw new Error("The payment does not belong to this tournament.");
  const cents = (field: string): number => {
    const value = Number(metadata[field]);
    if (metadata[field] == null || !Number.isSafeInteger(value) || value < 0) throw new Error("Original registration amounts are missing. No refund was issued.");
    return value;
  };
  const registrationTotal = cents("gross_registration_cents");
  const discount = Number(metadata.discount_cents || "0");
  if (discount > 0 && Number(metadata.addons_total_cents || "0") > 0) throw new Error("This discounted payment includes add-ons. Its registration refund allocation needs review before a refund can be issued.");
  const registrationAmount = allocatePaymentAmount(Math.max(0, registrationTotal - discount), ids.length, index);
  const platformFee = allocatePaymentAmount(cents("platform_fee_cents"), ids.length, index);
  // Actual Stripe fee details, not an estimated percentage or the passed-through fee.
  const processingTotal = balance.fee_details.filter(detail => detail.type !== "application_fee").reduce((sum, detail) => sum + detail.amount, 0);
  const processingFee = allocatePaymentAmount(processingTotal, ids.length, index);
  const { data: history, error: historyError } = await admin.from("tournament_refund_requests").select("amount_cents, stripe_refund_id, fee_breakdown").eq("registration_id", registration.id).not("stripe_refund_id", "is", null);
  if (historyError) throw new Error("Refund history could not be verified.");
  // Stripe history is authoritative, including external refunds. Do not guess allocation for old refunds.
  let recordedTotal = 0;
  let ownRefunded = 0;
  for await (const refund of stripe.refunds.list({ charge: charge.id, limit: 100 }, opts)) {
    if (refund.status === "failed" || refund.status === "canceled") continue;
    const record = history?.find((row: { stripe_refund_id: string | null }) => row.stripe_refund_id === refund.id);
    const refundRegistration = refund.metadata?.teevents_registration_id;
    if (!refundRegistration && !record) throw new Error("An existing Stripe refund needs review before another refund can be issued.");
    recordedTotal += refund.amount;
    if (refundRegistration === registration.id || record) ownRefunded += refund.amount;
  }
  const amounts = refundAmounts(registrationAmount, ownRefunded, platformFee, processingFee, requestedAmount);
  if (amounts.refundAmountCents > charge.amount - recordedTotal) throw new Error("The Stripe payment does not have enough remaining balance for this refund.");
  const quote = { ...amounts, registrationId: registration.id, paymentIntentId: intent.id, stripeAccount: stripeAccount || null, chargeId: charge.id, golferName: `${registration.first_name} ${registration.last_name}`, feeScope: "Original registration fees remain retained; they are not charged again for each partial refund." };
  const fingerprint = JSON.stringify(quote);
  return { quote, fingerprint, stripe, opts, admin, registration, tournament, charge };
}

