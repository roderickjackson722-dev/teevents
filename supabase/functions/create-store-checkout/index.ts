import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml } from "../_shared/notify.ts";

const PLATFORM_FEE_CENTS = 500; // $5 flat fee per transaction

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
      .select("organization_id, slug, pass_fees_to_participants")
      .eq("id", product.tournament_id)
      .single();

    const passFeesToParticipants = (tournament as any)?.pass_fees_to_participants !== false;

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

    const lineItems: any[] = [
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
    ];

    if (passFeesToParticipants) {
      const platformFee = PLATFORM_FEE_CENTS;
      const preStripeTotal = priceCents + platformFee;
      const stripeFee = Math.round((preStripeTotal + 30) / (1 - 0.029)) - preStripeTotal;
      const combinedFees = platformFee + stripeFee;
      if (combinedFees > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: "Fees" },
            unit_amount: combinedFees,
          },
          quantity: 1,
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : buyer_email || undefined,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${slug}?purchased=true`,
      cancel_url: `${origin}/t/${slug}`,
      metadata: {
        type: "store_purchase",
        product_id,
        tournament_id: product.tournament_id,
        organization_id: tournament?.organization_id || "",
      },
    });

    // Send notification
    try {
      if (tournament) {
        await sendNotificationEmails(
          supabaseAdmin,
          tournament.organization_id,
          "notify_store_purchase",
          `New Store Purchase — ${product.name}`,
          buildNotificationHtml("New Store Purchase", [
            `<strong>${product.name}</strong> was purchased for <strong>$${product.price.toFixed(2)}</strong>.`,
            buyer_email ? `📧 Buyer: ${buyer_email}` : "👤 Unknown buyer",
          ]),
        );
      }
    } catch (e) {
      console.error("Notification error:", e);
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
