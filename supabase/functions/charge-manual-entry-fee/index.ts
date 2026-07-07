// Charge the 5% manual-entry fee immediately to the organizer's connected
// Stripe account (Standard). Called after record_manual_entry with
// payment_method='instant' returns a fee_id + transaction_id.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: userRes } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fee_id, transaction_id, return_url } = await req.json();
    if (!fee_id || !transaction_id) {
      return new Response(JSON.stringify({ error: "Missing fee_id or transaction_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: fee } = await admin
      .from("manual_entry_fees")
      .select("id, tournament_id, fee_cents, paid, fee_payment_method")
      .eq("id", fee_id)
      .maybeSingle();
    if (!fee) {
      return new Response(JSON.stringify({ error: "Fee not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (fee.paid) {
      return new Response(JSON.stringify({ ok: true, alreadyPaid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tournament } = await admin
      .from("tournaments")
      .select("id, title, organization_id, organizations(stripe_account_id)")
      .eq("id", fee.tournament_id)
      .maybeSingle();

    const stripeAccountId = (tournament as any)?.organizations?.stripe_account_id;
    if (!stripeAccountId) {
      return new Response(JSON.stringify({
        error: "Organizer has no connected Stripe account. Choose 'Deduct from next Stripe transaction' instead.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create a Stripe Checkout session on the connected account for the fee.
    const origin = req.headers.get("origin") || "https://teevents.golf";
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Manual Entry Fee — ${tournament?.title ?? "Tournament"}`,
                description: "5% platform fee for a manual entry over free quota.",
              },
              unit_amount: fee.fee_cents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: fee.fee_cents,
          metadata: {
            manual_entry_fee_id: fee.id,
            platform_transaction_id: transaction_id,
            tournament_id: fee.tournament_id,
          },
        },
        success_url: `${return_url || origin}?manual_fee=paid&fee_id=${fee.id}`,
        cancel_url: `${return_url || origin}?manual_fee=cancelled&fee_id=${fee.id}`,
        metadata: {
          manual_entry_fee_id: fee.id,
          platform_transaction_id: transaction_id,
        },
      },
      { stripeAccount: stripeAccountId },
    );

    await admin.from("platform_transactions").update({
      stripe_session_id: session.id,
      manual_entry_fee_liability: false,
    }).eq("id", transaction_id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[charge-manual-entry-fee]", err);
    return new Response(JSON.stringify({ error: err?.message || "Failed to create fee checkout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
