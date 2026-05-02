// Called from the success URL after a vendor pays a booth fee. Marks the
// vendor registration as paid, records a platform_transaction, and emails
// a confirmation. Idempotent on repeat hits.

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLATFORM_FEE_RATE = 0.05;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";

const parseCents = (v?: string | null) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isNaN(n) ? 0 : n;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ verified: false, status: session.payment_status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const vendorRegId = session.metadata?.vendor_registration_id;
    if (!vendorRegId) throw new Error("Missing vendor_registration_id in metadata");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await supabaseAdmin
      .from("vendor_registrations")
      .select("payment_status, contact_email, contact_name, vendor_name, tournament_id, booth_location")
      .eq("id", vendorRegId)
      .single();

    if (existing && (existing as any).payment_status === "paid") {
      return new Response(
        JSON.stringify({ verified: true, status: "paid", already_processed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    await supabaseAdmin
      .from("vendor_registrations")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      })
      .eq("id", vendorRegId);

    // Record platform_transaction (best-effort; matches sponsor flow shape)
    try {
      const grossCents = parseCents(session.metadata?.gross_amount_cents);
      const platformFeeCents =
        parseCents(session.metadata?.platform_fee_cents) ||
        Math.round(grossCents * PLATFORM_FEE_RATE);
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
        type: "vendor_booth_fee",
        amount_cents: grossCents,
        platform_fee_cents: platformFeeCents,
        stripe_fee_cents: stripeFeeCents,
        net_amount_cents: netAmountCents,
        status: "succeeded",
        stripe_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        description: `Vendor booth fee — ${(existing as any)?.vendor_name || "Vendor"}`,
        golfer_name: (existing as any)?.vendor_name || null,
        golfer_email: (existing as any)?.contact_email || null,
        metadata: {
          vendor_registration_id: vendorRegId,
          charge_total_cents: chargeTotalCents,
          application_fee_cents: applicationFeeCents,
        },
      });
    } catch (e) {
      console.error("[verify-vendor-payment] platform_transactions insert failed:", e);
    }

    // Confirmation email to vendor
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && existing) {
      const { data: tournament } = await supabaseAdmin
        .from("tournaments")
        .select("title, slug")
        .eq("id", (existing as any).tournament_id)
        .single();
      try {
        const tName = (tournament as any)?.title || "the tournament";
        const html = `
<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f4f4f5;padding:24px;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;margin:auto;">
    <tr><td style="background:#1a5c38;padding:24px;text-align:center;color:#fff;">
      <h2 style="margin:0;">Booth Fee Received</h2>
    </td></tr>
    <tr><td style="padding:24px;color:#374151;line-height:1.6;">
      <p>Hi ${(existing as any).contact_name},</p>
      <p>We've received your booth fee for <strong>${tName}</strong>. Your spot is confirmed.</p>
      ${(existing as any).booth_location ? `<p><strong>Booth location:</strong> ${(existing as any).booth_location}</p>` : ""}
      <p>Thanks!<br/>— The TeeVents Team</p>
    </td></tr>
  </table>
</body></html>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: [(existing as any).contact_email],
            subject: `Booth fee received — ${tName}`,
            html,
          }),
        });
      } catch (e) {
        console.error("[verify-vendor-payment] confirmation email failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ verified: true, status: "paid" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
