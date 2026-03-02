import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { amount_cents, tournament_title, tournament_slug, tournament_id, donor_email } =
      await req.json();

    if (!amount_cents || amount_cents < 100) {
      throw new Error("Minimum donation is $1.00");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up the organizer's connected Stripe account via tournament → organization
    let connectedAccountId: string | null = null;
    if (tournament_id) {
      const { data: tournament } = await supabaseAdmin
        .from("tournaments")
        .select("organization_id")
        .eq("id", tournament_id)
        .single();

      if (tournament) {
        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("stripe_account_id")
          .eq("id", tournament.organization_id)
          .single();

        connectedAccountId = org?.stripe_account_id || null;
      }
    }

    // Check for existing Stripe customer
    let customerId: string | undefined;
    if (donor_email) {
      const customers = await stripe.customers.list({
        email: donor_email,
        limit: 1,
      });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const origin =
      req.headers.get("origin") || "https://teevents.lovable.app";

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : donor_email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Donation — ${tournament_title || "Golf Tournament"}`,
            },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/t/${tournament_slug}?donated=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/t/${tournament_slug}#donation`,
      metadata: {
        type: "donation",
        tournament_slug: tournament_slug || "",
        tournament_id: tournament_id || "",
      },
    };

    // Route payment to connected account with 5% application fee
    if (connectedAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(amount_cents * 0.05),
        transfer_data: {
          destination: connectedAccountId,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Record donation as pending
    if (tournament_id) {
      await supabaseAdmin.from("tournament_donations").insert({
        tournament_id,
        amount_cents,
        donor_email: donor_email || null,
        stripe_session_id: session.id,
        status: "pending",
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
