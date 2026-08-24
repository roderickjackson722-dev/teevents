// Called from the success URL after a vendor pays a booth fee. Marks the
// vendor registration as paid, records a platform_transaction, and emails
// a confirmation. Idempotent on repeat hits.

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyPlatformFallbackForConfirmedSession } from "../_shared/connectRouting.ts";
import { buildVendorAnswersHtml, buildNotificationHtml } from "../_shared/notify.ts";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
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
        .select("title, slug, contact_email")
        .eq("id", (existing as any).tournament_id)
        .single();
      const tName = (tournament as any)?.title || "the tournament";
      const vendorAnswersHtml = await buildVendorAnswersHtml(supabaseAdmin, vendorRegId);

      try {
        const html = buildNotificationHtml("Booth Fee Received", [
          `Hi <strong>${(existing as any).contact_name}</strong>,`,
          `We've received your booth fee for <strong>${tName}</strong>. Your spot is confirmed.`,
          (existing as any).booth_location ? `<strong>Booth location:</strong> ${(existing as any).booth_location}` : "",
          `Thanks!<br/>— The TeeVents Team`,
        ].filter(Boolean) as string[], vendorAnswersHtml);
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
        console.error("[verify-vendor-payment] vendor confirmation email failed:", e);
      }

      // Notify organizer + platform admin that a vendor paid.
      try {
        const organizerEmail = (tournament as any)?.contact_email;
        if (organizerEmail) {
          const orgHtml = buildNotificationHtml("New Vendor Payment", [
            `<strong>${(existing as any).vendor_name || (existing as any).contact_name}</strong> just paid their booth fee for <strong>${tName}</strong>.`,
            `<strong>Contact:</strong> ${(existing as any).contact_name} &lt;${(existing as any).contact_email}&gt;`,
            (existing as any).booth_location ? `<strong>Booth:</strong> ${(existing as any).booth_location}` : "",
          ].filter(Boolean) as string[], vendorAnswersHtml);
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
              to: [organizerEmail],
              bcc: "info@teevents.golf",
              subject: `New vendor payment — ${tName}`,
              html: orgHtml,
            }),
          });
        }
      } catch (e) {
        console.error("[verify-vendor-payment] organizer notification failed:", e);
      }
    }

    await notifyPlatformFallbackForConfirmedSession(supabaseAdmin, session.id, { context: "vendor" });

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
