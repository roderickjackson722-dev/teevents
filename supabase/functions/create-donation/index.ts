import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml } from "../_shared/notify.ts";
import { requireConnectedAccount, computeFees, isFlatRateTournament, logDirectCharge, stripeAccountOpts, acctQuerySuffix, applicationFeeBlock, notifyPlatformFallback } from "../_shared/connectRouting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { amount_cents, tournament_title, tournament_slug, tournament_id, donor_email } = await req.json();

    if (!amount_cents || amount_cents < 100) {
      throw new Error("Minimum donation is $1.00");
    }
    if (!tournament_id) {
      throw new Error("Missing tournament_id");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("organization_id, pass_fees_to_participants, title")
      .eq("id", tournament_id)
      .single();
    const organizationId = tournament?.organization_id || null;
    const passFeesToParticipants = (tournament as any)?.pass_fees_to_participants !== false;

    const connected = await requireConnectedAccount(
      supabaseAdmin, stripe, organizationId, "donation",
    );
    const organizerStripeAccountId = connected.stripeAccountId;

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";

    const lineItems: any[] = [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `Donation — ${tournament_title || tournament?.title || "Golf Tournament"}` },
          unit_amount: amount_cents,
        },
        quantity: 1,
      },
    ];

    const flatRate = await isFlatRateTournament(supabaseAdmin, tournament_id);
    const { platformFeeCents, stripeFeeCents, combinedFeesCents } = computeFees(amount_cents, flatRate);
    if (passFeesToParticipants && combinedFeesCents > 0) {
      lineItems.push({
        price_data: { currency: "usd", product_data: { name: "Fees" }, unit_amount: combinedFeesCents },
        quantity: 1,
      });
    }

    const applicationFeeAmount = platformFeeCents;

    const checkoutParams: any = {
      customer_email: donor_email || undefined,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${tournament_slug}?donated=true&session_id={CHECKOUT_SESSION_ID}${acctQuerySuffix(connected)}`,
      cancel_url: `${origin}/t/${tournament_slug}#donation`,
      ...applicationFeeBlock(connected, applicationFeeAmount),
      metadata: {
        type: "donation",
        tournament_slug: tournament_slug || "",
        tournament_id,
        organization_id: organizationId || "",
        platform_fee_cents: String(platformFeeCents),
        stripe_fee_cents: String(stripeFeeCents),
        application_fee_cents: String(applicationFeeAmount),
        routing: "direct",
      },
    };

    const session = await stripe.checkout.sessions.create(
      checkoutParams, stripeAccountOpts(connected),
    );

    await logDirectCharge(supabaseAdmin, {
      context: "donation",
      tournamentId: tournament_id,
      organizationId,
      stripeAccountId: organizerStripeAccountId,
      grossCents: amount_cents,
      platformFeeCents, stripeFeeCents,
      applicationFeeCents: applicationFeeAmount,
      passFeesToParticipants,
      stripeSessionId: session.id,
      buyerEmail: donor_email || null,
      isPlatformFallback: connected.isPlatformFallback
    });

    if (connected.isPlatformFallback) {
      await notifyPlatformFallback({
        context: "donation",
        organizationId: null,
        organizationName: connected.organizationName,
        tournamentId: tournament_id,
        tournamentTitle: null,
        grossCents: amount_cents,
        buyerEmail: donor_email || null,
        stripeSessionId: session.id,
      });
    }

    await supabaseAdmin.from("tournament_donations").insert({
      tournament_id,
      amount_cents,
      donor_email: donor_email || null,
      stripe_session_id: session.id,
      status: "pending",
    });

    // NOTE: Notification emails are sent ONLY after Stripe confirms payment
    // (see verify-donation). We no longer send a "pending" notification at
    // checkout creation — those produced confusing emails for transactions
    // that may never complete.

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
