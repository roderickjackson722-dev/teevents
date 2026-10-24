import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { registrationRefundOptions } from "./refundAmounts";

const targetSchema = z.object({ registrationId: z.string().uuid(), requestId: z.string().uuid().optional(), amountCents: z.number().int().positive().optional() });
const confirmSchema = targetSchema.extend({ quoteId: z.string().uuid(), fingerprint: z.string(), adminNotes: z.string().max(4000).optional() });


export const previewRegistrationRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => targetSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { prepareRefund } = await import("./registrationRefund.server");
    const { quote, fingerprint } = await prepareRefund(data, context);
    return { ...quote, fingerprint, quoteId: crypto.randomUUID() };
  });

export const confirmRegistrationRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => confirmSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { prepareRefund } = await import("./registrationRefund.server");
    const prepared = await prepareRefund(data, context);
    if (prepared.fingerprint !== data.fingerprint) throw new Error("Refund amounts changed. Review the latest amounts before confirming.");
    const { quote, stripe, opts, admin, registration, tournament, charge } = prepared;
    const recordId = data.requestId || data.quoteId;
    if (!data.requestId) {
      const { error } = await admin.from("tournament_refund_requests").insert({ id: recordId, tournament_id: tournament.id, registration_id: registration.id, amount_cents: quote.refundAmountCents, reason: "Organizer-issued refund", status: "pending", fee_breakdown: quote as any, admin_notes: data.adminNotes || null });
      if (error && error.code !== "23505") throw new Error("Could not create a refund record. No refund was issued.");
    }
    const params: import("stripe").default.RefundCreateParams = {
      payment_intent: quote.paymentIntentId,
      amount: quote.refundAmountCents,
      ...registrationRefundOptions,
      ...(charge.transfer ? { reverse_transfer: true } : {}),
      metadata: { teevents_registration_id: registration.id, teevents_refund_request_id: recordId },
    };
    const refund = await stripe.refunds.create(params, { ...opts, idempotencyKey: `teevents-refund-${recordId}` });
    const succeeded = refund.status === "succeeded";
    const { error: recordError } = await admin.from("tournament_refund_requests").update({ amount_cents: quote.refundAmountCents, status: succeeded ? "approved" : "pending", stripe_refund_id: refund.id, fee_breakdown: { ...quote, stripeStatus: refund.status }, admin_notes: data.adminNotes || null, resolved_at: succeeded ? new Date().toISOString() : null, resolved_by: context.userId }).eq("id", recordId);
    if (recordError) throw new Error(`Stripe returned refund ${refund.id}, but its record could not be saved. Do not retry; contact TeeVents.`);
    if (succeeded && quote.refundAmountCents === quote.refundableCents) {
      const { error } = await admin.from("tournament_registrations").update({ payment_status: "refunded" }).eq("id", registration.id);
      if (error) throw new Error("Stripe refund completed and was recorded, but roster status could not be updated. Contact TeeVents.");
    }
    return { refundId: refund.id, succeeded, fullyRefunded: succeeded && quote.refundAmountCents === quote.refundableCents };
  });