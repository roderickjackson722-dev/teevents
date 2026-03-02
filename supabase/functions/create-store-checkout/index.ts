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
    const { product_id, buyer_email, tournament_slug } = await req.json();
    if (!product_id) throw new Error("Missing product_id");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch product + tournament + org
    const { data: product, error: pErr } = await supabaseAdmin
      .from("tournament_store_products")
      .select("id, name, description, price, image_url, tournament_id")
      .eq("id", product_id)
      .eq("is_active", true)
      .single();

    if (pErr || !product) throw new Error("Product not found or inactive");

    const priceCents = Math.round(product.price * 100);
    if (priceCents < 50) throw new Error("Price too low for checkout");

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("organization_id, slug")
      .eq("id", product.tournament_id)
      .single();

    let connectedAccountId: string | null = null;
    if (tournament) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("stripe_account_id")
        .eq("id", tournament.organization_id)
        .single();
      connectedAccountId = org?.stripe_account_id || null;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let customerId: string | undefined;
    if (buyer_email) {
      const customers = await stripe.customers.list({ email: buyer_email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";
    const slug = tournament_slug || tournament?.slug || "";

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : buyer_email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.name,
              description: product.description || undefined,
              images: product.image_url ? [product.image_url] : undefined,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/t/${slug}?purchased=true`,
      cancel_url: `${origin}/t/${slug}`,
      metadata: {
        type: "store_purchase",
        product_id,
        tournament_id: product.tournament_id,
      },
    };

    if (connectedAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(priceCents * 0.05),
        transfer_data: { destination: connectedAccountId },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
