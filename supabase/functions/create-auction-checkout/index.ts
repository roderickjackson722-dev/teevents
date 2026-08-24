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
      .select("organization_id, slug, pass_fees_to_participants")
      .eq("id", item.tournament_id)
      .single();

    const passFeesToParticipants = (tournament as any)?.pass_fees_to_participants !== false;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const connected = await requireConnectedAccount(
      supabaseAdmin, stripe, tournament?.organization_id || null, "auction",
    );
    const organizerStripeAccountId = connected.stripeAccountId;

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

    const flatRate = await isFlatRateTournament(supabaseAdmin, item.tournament_id);
    const { platformFeeCents, stripeFeeCents, combinedFeesCents } = computeFees(priceCents, flatRate);
    if (passFeesToParticipants && combinedFeesCents > 0) {
      lineItems.push({
        price_data: { currency: "usd", product_data: { name: "Fees" }, unit_amount: combinedFeesCents },
        quantity: 1,
      });
    }

    // Our application fee is always our 5%. Stripe takes its processing fee
    // automatically out of the charge; we don't include it here.
    const applicationFeeAmount = platformFeeCents;

    const checkoutParams: any = {
      customer_email: buyer_email || undefined,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${slug}?auction_purchased=true&item_id=${item_id}${acctQuerySuffix(connected)}`,
      cancel_url: `${origin}/t/${slug}#auction`,
      ...applicationFeeBlock(connected, applicationFeeAmount),
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
        routing: "direct",
      },
    };

    const session = await stripe.checkout.sessions.create(
      checkoutParams, stripeAccountOpts(connected),
    );

    await logDirectCharge(supabaseAdmin, {
      context: "auction",
      tournamentId: item.tournament_id,
      organizationId: tournament?.organization_id || null,
      stripeAccountId: organizerStripeAccountId,
      grossCents: priceCents,
      platformFeeCents, stripeFeeCents,
      applicationFeeCents: applicationFeeAmount,
      passFeesToParticipants,
      stripeSessionId: session.id,
      buyerEmail: buyer_email || null,
      isPlatformFallback: connected.isPlatformFallback
    });

    if (connected.isPlatformFallback) {
      await notifyPlatformFallback({
        context: "auction",
        organizationId: tournament?.organization_id || null,
        organizationName: connected.organizationName,
        tournamentId: item.tournament_id,
        tournamentTitle: null,
        grossCents: priceCents,
        buyerEmail: buyer_email || null,
        stripeSessionId: session.id,
      });
    }

    // Mark item as sold
    await supabaseAdmin
      .from("tournament_auction_items")
      .update({ is_active: false, winner_name: buyer_name || null, winner_email: buyer_email || null })
      .eq("id", item_id);

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
          item.tournament_id,
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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
