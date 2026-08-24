// Verifies a Stripe Checkout session for a side event ticket purchase,
// marks the ticket paid (which triggers tickets_sold sync), records a
// platform_transaction, and emails the attendee with their ticket code(s).

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyPlatformFallbackForConfirmedSession } from "../_shared/connectRouting.ts";

const PLATFORM_FEE_RATE = 0.05;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "info@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";

const parseCents = (v?: string | null) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isNaN(n) ? 0 : n;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { session_id, acct } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    let session: any;
    try {
      session = acct
        ? await stripe.checkout.sessions.retrieve(session_id, undefined, { stripeAccount: acct })
        : await stripe.checkout.sessions.retrieve(session_id);
    } catch (e) {
      if (acct) session = await stripe.checkout.sessions.retrieve(session_id);
      else throw e;
    }
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ verified: false, status: session.payment_status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const ticketId = session.metadata?.side_event_ticket_id;
    if (!ticketId) throw new Error("Missing side_event_ticket_id metadata");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await supabaseAdmin
      .from("side_event_tickets")
      .select("id, payment_status, attendee_email, attendee_name, quantity, ticket_code, side_event_id, tournament_id")
      .eq("id", ticketId)
      .single();

    if (existing && (existing as any).payment_status === "paid") {
      return new Response(
        JSON.stringify({ verified: true, status: "paid", already_processed: true, ticket_code: (existing as any).ticket_code }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    await supabaseAdmin
      .from("side_event_tickets")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      })
      .eq("id", ticketId);

    // Re-fetch to get generated ticket_code
    const { data: paid } = await supabaseAdmin
      .from("side_event_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    // Platform transaction record (best-effort)
    try {
      const grossCents = parseCents(session.metadata?.gross_amount_cents);
      // A recorded "0" is meaningful (Flat-Rate Pro event).
      const platformFeeCents = session.metadata?.platform_fee_cents != null
        ? parseCents(session.metadata.platform_fee_cents)
        : Math.round(grossCents * PLATFORM_FEE_RATE);
      const stripeFeeCents = parseCents(session.metadata?.stripe_fee_cents);
      const applicationFeeCents =
        parseCents(session.metadata?.application_fee_cents) ||
        platformFeeCents + stripeFeeCents;
      const chargeTotalCents =
        parseCents(session.metadata?.charge_total_cents) ||
        session.amount_total ||
        grossCents + applicationFeeCents;
      const netAmountCents = Math.max(chargeTotalCents - applicationFeeCents, 0);

      await supabaseAdmin.from("platform_transactions").insert({
        tournament_id: session.metadata?.tournament_id,
        organization_id: session.metadata?.organization_id,
        type: "side_event_ticket",
        amount_cents: grossCents,
        platform_fee_cents: platformFeeCents,
        stripe_fee_cents: stripeFeeCents,
        net_amount_cents: netAmountCents,
        status: "succeeded",
        stripe_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        description: `Side event ticket — ${(paid as any)?.attendee_name || "Attendee"}`,
        golfer_name: (paid as any)?.attendee_name || null,
        golfer_email: (paid as any)?.attendee_email || null,
        metadata: {
          side_event_ticket_id: ticketId,
          side_event_id: session.metadata?.side_event_id,
          quantity: session.metadata?.quantity,
          charge_total_cents: chargeTotalCents,
          application_fee_cents: applicationFeeCents,
        },
      });
    } catch (e) {
      console.error("[verify-side-event-payment] platform_transactions insert failed:", e);
    }

    // Email confirmation with ticket code
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && paid) {
      const { data: ev } = await supabaseAdmin
        .from("side_events")
        .select("name, event_date, location")
        .eq("id", (paid as any).side_event_id)
        .single();
      const { data: tournament } = await supabaseAdmin
        .from("tournaments")
        .select("title")
        .eq("id", (paid as any).tournament_id)
        .single();
      try {
        const tName = (tournament as any)?.title || "the tournament";
        const evName = (ev as any)?.name || "Side Event";
        const html = `
<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f4f4f5;padding:24px;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;margin:auto;">
    <tr><td style="background:#1a5c38;padding:24px;text-align:center;color:#fff;">
      <h2 style="margin:0;">Your Ticket is Confirmed</h2>
    </td></tr>
    <tr><td style="padding:24px;color:#374151;line-height:1.6;">
      <p>Hi ${(paid as any).attendee_name},</p>
      <p>Thanks for purchasing <strong>${(paid as any).quantity} × ${evName}</strong> ticket(s) for <strong>${tName}</strong>.</p>
      ${(ev as any)?.event_date ? `<p><strong>When:</strong> ${new Date((ev as any).event_date).toLocaleString()}</p>` : ""}
      ${(ev as any)?.location ? `<p><strong>Where:</strong> ${(ev as any).location}</p>` : ""}
      <div style="margin:20px 0;padding:16px;background:#f9fafb;border:2px dashed #1a5c38;text-align:center;border-radius:8px;">
        <div style="font-size:12px;color:#6b7280;">TICKET CODE</div>
        <div style="font-size:28px;font-weight:bold;letter-spacing:4px;font-family:monospace;color:#1a5c38;">${(paid as any).ticket_code}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:8px;">Show this code at check-in</div>
      </div>
      <p>See you there!<br/>— The TeeVents Team</p>
    </td></tr>
  </table>
</body></html>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: [(paid as any).attendee_email],
            subject: `Ticket confirmed — ${evName}`,
            html,
          }),
        });
      } catch (e) {
        console.error("[verify-side-event-payment] email failed:", e);
      }
    }

    await notifyPlatformFallbackForConfirmedSession(supabaseAdmin, session.id, { context: "side_event" });

    return new Response(
      JSON.stringify({ verified: true, status: "paid", ticket_code: (paid as any)?.ticket_code }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
