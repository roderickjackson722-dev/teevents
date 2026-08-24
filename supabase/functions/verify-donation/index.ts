import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyPlatformAdmin, buildNotificationHtml, sendNotificationEmails } from "../_shared/notify.ts";
import { notifyPlatformFallbackForConfirmedSession, isFlatRateTournament } from "../_shared/connectRouting.ts";

const PLATFORM_FEE_RATE = 0.05; // 5% platform fee

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    if (session.payment_status === "paid") {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      await supabaseAdmin
        .from("tournament_donations")
        .update({ status: "completed" })
        .eq("stripe_session_id", session_id);

      // Record platform transaction (escrow) with 5% fee
      const organizationId = session.metadata?.organization_id;
      const tournamentId = session.metadata?.tournament_id;
      const amountCents = session.amount_total || 0;

      if (organizationId && amountCents > 0) {
        const flatRate = await isFlatRateTournament(supabaseAdmin, tournamentId);
        const platformFeeCents = flatRate ? 0 : Math.round(amountCents * PLATFORM_FEE_RATE);
        const netAmountCents = amountCents - platformFeeCents;

        // No reserve hold — Connect destination charges split at checkout.
        // hold_* columns were dropped in migration 20260415005850.
        await supabaseAdmin.from("platform_transactions").insert({
          organization_id: organizationId,
          tournament_id: tournamentId || null,
          amount_cents: amountCents,
          platform_fee_cents: platformFeeCents,
          net_amount_cents: netAmountCents,
          type: "donation",
          status: "succeeded",
          stripe_session_id: session_id,
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          description: `Donation — $${(amountCents / 100).toFixed(2)}`,
        });
      }

      // Notify the platform admin of every donation transaction.
      try {
        await notifyPlatformAdmin({
          supabaseAdmin,
          type: "donation",
          subject: `💚 New Donation — $${(amountCents / 100).toFixed(2)}`,
          htmlBody: buildNotificationHtml("New Donation Received", [
            `A donation of <strong>$${(amountCents / 100).toFixed(2)}</strong> was just received.`,
            `🏢 <strong>Organization:</strong> ${organizationId || "n/a"}`,
            `🏆 <strong>Tournament:</strong> ${tournamentId || "n/a"}`,
            `💳 <strong>Stripe Session:</strong> ${session_id}`,
          ]),
          organizationId: organizationId || null,
          tournamentId: tournamentId || null,
        });
      } catch (e) { console.error("[verify-donation] admin notify failed:", e); }

      // Notify the organizer of every donation (uses notify_donation opt-ins plus tournament contact_email fallback).
      if (organizationId) {
        try {
          await sendNotificationEmails(
            supabaseAdmin,
            organizationId,
            "notify_donation",
            `💚 New donation received — $${(amountCents / 100).toFixed(2)}`,
            buildNotificationHtml("New Donation Received", [
              `A donation of <strong>$${(amountCents / 100).toFixed(2)}</strong> was just received for your tournament.`,
              `💳 <strong>Stripe Session:</strong> ${session_id}`,
            ]),
            tournamentId || null,
          );
        } catch (e) { console.error("[verify-donation] organizer notify failed:", e); }
      }

      await notifyPlatformFallbackForConfirmedSession(supabaseAdmin, session.id, { context: "donation" });

      return new Response(
        JSON.stringify({ verified: true, status: "completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ verified: false, status: session.payment_status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
