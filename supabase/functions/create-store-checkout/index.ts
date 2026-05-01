import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml } from "../_shared/notify.ts";
import { resolveRouting, computeFees, PLATFORM_FEE_RATE, logRoutingDecision } from "../_shared/connectRouting.ts";

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
      .select("organization_id, slug, pass_fees_to_participants, payment_method_override")
      .eq("id", product.tournament_id)
      .single();

    const passFeesToParticipants = (tournament as any)?.pass_fees_to_participants !== false;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Resolve routing: destination charge to organizer if connected & ready, else platform escrow.
    const routing = await resolveRouting(
      supabaseAdmin,
      stripe,
      product.tournament_id,
      tournament?.organization_id || null,
      (tournament as any)?.payment_method_override || null,
      "store",
    );

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

    // Always compute fees for application_fee; only show as line item if passing to buyer.
    const { platformFeeCents, stripeFeeCents, combinedFeesCents } = computeFees(priceCents);
    if (passFeesToParticipants && combinedFeesCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Fees" },
          unit_amount: combinedFeesCents,
        },
        quantity: 1,
      });
    }

    // If absorbing fees, organizer pays them out of their net (application_fee = platform fee only).
    const applicationFeeAmount = passFeesToParticipants ? combinedFeesCents : platformFeeCents;

    const checkoutParams: any = {
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
        platform_fee_cents: String(platformFeeCents),
        stripe_fee_cents: String(stripeFeeCents),
        application_fee_cents: String(applicationFeeAmount),
        routing: routing.useDestinationCharge ? "destination" : "platform_escrow",
        payment_method_override: routing.override,
      },
    };

    if (routing.useDestinationCharge) {
      checkoutParams.payment_intent_data = {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: routing.organizerStripeAccountId },
        on_behalf_of: routing.organizerStripeAccountId,
      };
    }

    const session = await stripe.checkout.sessions.create(checkoutParams);

    await logRoutingDecision(supabaseAdmin, {
      context: "store",
      tournamentId: product.tournament_id,
      organizationId: tournament?.organization_id || null,
      routing,
      organizerChargesReady: routing.organizerChargesReady,
      grossCents: priceCents,
      platformFeeCents,
      stripeFeeCents,
      applicationFeeCents: applicationFeeAmount,
      passFeesToParticipants,
      stripeSessionId: session.id,
      buyerEmail: buyer_email || null,
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
          tournament.id,
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
