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

    const session = await stripe.checkout.sessions.create({
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
    });

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
