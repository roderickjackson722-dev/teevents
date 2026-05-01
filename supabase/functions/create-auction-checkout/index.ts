import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml } from "../_shared/notify.ts";
import { resolveRouting, computeFees, PLATFORM_FEE_RATE } from "../_shared/connectRouting.ts";

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
    const { item_id, buyer_name, buyer_email, tournament_slug } = await req.json();
    if (!item_id) throw new Error("Missing item_id");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: item, error: iErr } = await supabaseAdmin
      .from("tournament_auction_items")
      .select("id, title, description, buy_now_price, image_url, tournament_id, type")
      .eq("id", item_id)
      .eq("is_active", true)
      .single();

    if (iErr || !item) throw new Error("Item not found or inactive");
    if (!item.buy_now_price || item.buy_now_price <= 0) throw new Error("Buy now not available for this item");

    const priceCents = Math.round(item.buy_now_price * 100);

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("organization_id, slug, pass_fees_to_participants, payment_method_override")
      .eq("id", item.tournament_id)
      .single();

    const passFeesToParticipants = (tournament as any)?.pass_fees_to_participants !== false;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Resolve routing: destination charge to organizer if connected & ready, else platform escrow.
    const routing = await resolveRouting(
      supabaseAdmin,
      stripe,
      item.tournament_id,
      tournament?.organization_id || null,
      (tournament as any)?.payment_method_override || null,
      "auction",
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
            name: `Buy Now — ${item.title}`,
            description: item.description || undefined,
            images: item.image_url ? [item.image_url] : undefined,
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

    const applicationFeeAmount = passFeesToParticipants ? combinedFeesCents : platformFeeCents;

    const checkoutParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : buyer_email || undefined,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${slug}?auction_purchased=true&item_id=${item_id}`,
      cancel_url: `${origin}/t/${slug}#auction`,
      metadata: {
        type: "auction_buy_now",
        item_id,
        tournament_id: item.tournament_id,
        organization_id: tournament?.organization_id || "",
        buyer_name: buyer_name || "",
        buyer_email: buyer_email || "",
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

    // Mark item as sold
    await supabaseAdmin
      .from("tournament_auction_items")
      .update({
        is_active: false,
        winner_name: buyer_name || null,
        winner_email: buyer_email || null,
      })
      .eq("id", item_id);

    // Send notification
    try {
      if (tournament) {
        await sendNotificationEmails(
          supabaseAdmin,
          tournament.organization_id,
          "notify_auction_bid",
          `Auction Buy Now — ${item.title}`,
          buildNotificationHtml("Auction Item Purchased", [
            `<strong>${item.title}</strong> was purchased via Buy Now for <strong>$${item.buy_now_price!.toFixed(2)}</strong>.`,
            buyer_name ? `👤 ${buyer_name}` : "",
            buyer_email ? `📧 ${buyer_email}` : "",
          ].filter(Boolean)),
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
