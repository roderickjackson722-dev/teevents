// Direct-charge Stripe Checkout for "Buy Now" on a new-table auction.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireConnectedAccount, computeFees, isFlatRateTournament, logDirectCharge, stripeAccountOpts, acctQuerySuffix, applicationFeeBlock, notifyPlatformFallback } from "../_shared/connectRouting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { auction_id, buyer_name, buyer_email, buyer_phone, tournament_slug } = await req.json();
    if (!auction_id) throw new Error("Missing auction_id");
    if (!buyer_email) throw new Error("Email is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: auction, error } = await supabaseAdmin
      .from("auctions")
      .select("id, item_name, description, images, buy_now_cents, status, tournament_id")
      .eq("id", auction_id)
      .single();
    if (error || !auction) throw new Error("Auction not found.");
    if (auction.status !== "active") throw new Error("Auction is no longer active.");
    if (!auction.buy_now_cents || auction.buy_now_cents <= 0) throw new Error("Buy Now is not available.");

    const { data: t } = await supabaseAdmin
      .from("tournaments")
      .select("organization_id, slug, pass_fees_to_participants")
      .eq("id", auction.tournament_id)
      .single();
    const passFees = (t as any)?.pass_fees_to_participants !== false;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const connected = await requireConnectedAccount(supabaseAdmin, stripe, t?.organization_id || null, "auction-buy-now");

    const priceCents = auction.buy_now_cents;
    const flatRate = await isFlatRateTournament(supabaseAdmin, auction.tournament_id);
    const { platformFeeCents, stripeFeeCents, combinedFeesCents } = computeFees(priceCents, flatRate);

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";
    const slug = tournament_slug || t?.slug || "";

    const lineItems: any[] = [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `Buy Now — ${auction.item_name}`,
          description: auction.description || undefined,
          images: (auction.images && auction.images.length) ? [auction.images[0]] : undefined,
        },
        unit_amount: priceCents,
      },
      quantity: 1,
    }];
    if (passFees && combinedFeesCents > 0) {
      lineItems.push({
        price_data: { currency: "usd", product_data: { name: "Fees" }, unit_amount: combinedFeesCents },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: buyer_email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${slug}?auction_buy_now=success&auction_id=${auction_id}${acctQuerySuffix(connected)}`,
      cancel_url: `${origin}/t/${slug}#auctions`,
      ...applicationFeeBlock(connected, platformFeeCents),
      metadata: {
        type: "auction_buy_now_v2",
        auction_id,
        tournament_id: auction.tournament_id,
        organization_id: t?.organization_id || "",
        buyer_name: buyer_name || "",
        buyer_email,
        buyer_phone: buyer_phone || "",
      },
    }, stripeAccountOpts(connected));

    await logDirectCharge(supabaseAdmin, {
      context: "auction-buy-now",
      tournamentId: auction.tournament_id,
      organizationId: t?.organization_id || null,
      stripeAccountId: connected.stripeAccountId,
      grossCents: priceCents,
      platformFeeCents, stripeFeeCents,
      applicationFeeCents: platformFeeCents,
      passFeesToParticipants: passFees,
      stripeSessionId: session.id,
      buyerEmail: buyer_email,
      isPlatformFallback: connected.isPlatformFallback
    });

    if (connected.isPlatformFallback) {
      await notifyPlatformFallback({
        context: "auction-buy-now",
        organizationId: t?.organization_id || null,
        organizationName: connected.organizationName,
        tournamentId: auction.tournament_id,
        tournamentTitle: null,
        grossCents: priceCents,
        buyerEmail: buyer_email,
        stripeSessionId: session.id,
      });
    }

    // Optimistically mark winner; verify-auction-buy-now will finalize on success
    await supabaseAdmin
      .from("auctions")
      .update({
        status: "ended",
        winning_bidder_name: buyer_name || null,
        winning_bidder_email: buyer_email,
        winning_bid_amount_cents: priceCents,
      })
      .eq("id", auction_id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
