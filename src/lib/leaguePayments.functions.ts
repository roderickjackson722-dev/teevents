import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertLeagueManager, buildLeagueLedger } from "./leaguePayments.server";

/**
 * Every COMPLETED league transaction — online (Stripe) and manual/offline entries —
 * with the full gross / fees / net breakdown. Pending checkouts are intentionally
 * excluded: an abandoned checkout is not a payment.
 */
export const listLeaguePayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leagueId: string }) => {
    if (!input?.leagueId) throw new Error("leagueId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertLeagueManager(context.supabase, supabaseAdmin, context.userId, data.leagueId);
    return await buildLeagueLedger(supabaseAdmin, data.leagueId);
  });


/**
 * Re-checks every pending payment directly against Stripe and marks the ones that
 * actually completed as paid. Recovers payments whose webhook never arrived.
 */
export const syncLeaguePaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leagueId: string }) => {
    if (!input?.leagueId) throw new Error("leagueId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertLeagueManager(context.supabase, supabaseAdmin, context.userId, data.leagueId);

    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) throw new Error("Payments are not configured");

    const { data: pending } = await supabaseAdmin
      .from("league_payments")
      .select("id, stripe_session_id, stripe_account_id, member_id, registration_id, kind")
      .eq("league_id", data.leagueId)
      .eq("status", "pending")
      .not("stripe_session_id", "is", null);

    let recovered = 0;
    const checked = (pending || []).length;

    for (const p of pending || []) {
      const headers: Record<string, string> = { Authorization: `Bearer ${stripeKey}` };
      if (p.stripe_account_id) headers["Stripe-Account"] = p.stripe_account_id;
      const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${p.stripe_session_id}`, { headers });
      if (!resp.ok) continue;
      const session: any = await resp.json();
      if (session.payment_status !== "paid") continue;

      const { actualStripeFeeCents } = await import("./leagueFees");
      const gross = Number(session.amount_total || 0) || null;

      await supabaseAdmin
        .from("league_payments")
        .update({
          status: "paid",
          gross_amount_cents: gross,
          stripe_fee_cents: gross ? actualStripeFeeCents(gross) : 0,
          stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id);


      if (p.registration_id) {
        await supabaseAdmin
          .from("league_event_registrations")
          .update({ fee_paid: true, registration_fee_paid: true, paid_at: new Date().toISOString() })
          .eq("id", p.registration_id);
      }
      if (p.kind === "membership" && p.member_id) {
        await supabaseAdmin
          .from("league_members")
          .update({ membership_fee_paid: true, membership_status: "active" })
          .eq("id", p.member_id);
      }
      recovered += 1;
    }

    // Reconcile every completed payment into the registration tables. This is
    // deliberately idempotent so a delayed/missed webhook can never leave the
    // Finances and Registrations views disagreeing.
    const { data: paid } = await supabaseAdmin
      .from("league_payments")
      .select("id, member_id, registration_id, kind, amount_cents, updated_at")
      .eq("league_id", data.leagueId)
      .eq("status", "paid");

    let reconciled = 0;
    const confirmationIds: string[] = [];
    for (const payment of paid || []) {
      if (payment.registration_id) {
        const { data: registration } = await supabaseAdmin
          .from("league_event_registrations")
          .update({
            fee_paid: true,
            registration_fee_paid: true,
            status: "confirmed",
            entry_type: "online",
            is_manual_entry: false,
            paid_at: payment.updated_at,
          })
          .eq("id", payment.registration_id)
          .select("id, confirmation_email_sent_at")
          .maybeSingle();
        if (registration) {
          reconciled += 1;
          if (!registration.confirmation_email_sent_at) confirmationIds.push(registration.id);
        }
      }

      if (["membership", "registration"].includes(payment.kind) && payment.member_id) {
        await supabaseAdmin
          .from("league_members")
          .update({ membership_fee_paid: true, membership_status: "active" })
          .eq("id", payment.member_id);
        const { data: responses } = await supabaseAdmin
          .from("league_registration_responses")
          .update({ payment_status: "paid", paid_at: payment.updated_at })
          .eq("league_id", data.leagueId)
          .eq("member_id", payment.member_id)
          .select("id");
        reconciled += (responses || []).length;
      }
    }

    for (const registrationId of [...new Set(confirmationIds)]) {
      try {
        await fetch("https://www.teevents.golf/api/public/league-event-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registration_id: registrationId }),
        });
      } catch {
        // Payment reconciliation must still succeed if email delivery is unavailable.
      }
    }

    return { checked, recovered, reconciled };
  });
