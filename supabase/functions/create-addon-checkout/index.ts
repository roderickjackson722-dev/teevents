import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  requireConnectedAccount,
  logDirectCharge,
  PLATFORM_FEE_RATE,
  isFlatRateTournament,
  stripeAccountOpts,
  acctQuerySuffix,
  applicationFeeBlock,
} from "../_shared/connectRouting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const calculateGrossedUpStripeFee = (subtotalCents: number) =>
  Math.max(0, Math.round((subtotalCents + 30) / (1 - 0.029)) - subtotalCents);
const calculateProcessingFee = (chargeAmountCents: number) =>
  Math.max(0, Math.round(chargeAmountCents * 0.029 + 30));

/**
 * create-addon-checkout
 * Body: { tournament_id, buyer_name?, buyer_email, items: [{ addon_id, quantity }] }
 * Creates a Stripe Checkout session for a standalone add-on purchase
 * (no tournament registration required). Direct charge on the organizer's
 * connected account with the 5% TeeVents application fee.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const tournamentId = String(body.tournament_id || "");
    const buyerEmail = String(body.buyer_email || "").trim();
    const buyerName = typeof body.buyer_name === "string" ? body.buyer_name.trim().slice(0, 120) : "";
    const rawItems: { addon_id: string; quantity: number }[] = Array.isArray(body.items)
      ? body.items
          .filter((i: any) => i && typeof i.addon_id === "string" && Number(i.quantity) > 0)
          .map((i: any) => ({ addon_id: String(i.addon_id), quantity: Math.floor(Number(i.quantity)) }))
      : [];

    if (!tournamentId || !buyerEmail || rawItems.length === 0) {
      throw new Error("Missing required fields");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tournament, error: tErr } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, custom_slug, organization_id, site_published, pass_fees_to_participants")
      .eq("id", tournamentId)
      .single();
    if (tErr || !tournament) throw new Error("Tournament not found");
    if (!tournament.site_published) throw new Error("This tournament page is not published");

    const { data: dbAddons, error: aErr } = await supabaseAdmin
      .from("tournament_registration_addons")
      .select("id, name, price_cents, is_active, tournament_id")
      .in("id", rawItems.map((i) => i.addon_id));
    if (aErr) throw new Error("Failed to load add-ons: " + aErr.message);

    const byId = new Map((dbAddons || []).map((a: any) => [a.id, a]));
    const items: { addon_id: string; name: string; unit_price_cents: number; quantity: number }[] = [];
    let subtotalCents = 0;
    for (const sel of rawItems) {
      const a = byId.get(sel.addon_id);
      if (!a || !a.is_active || a.tournament_id !== tournamentId) continue;
      const qty = Math.min(Math.max(1, sel.quantity), 50);
      items.push({ addon_id: a.id, name: a.name, unit_price_cents: a.price_cents, quantity: qty });
      subtotalCents += a.price_cents * qty;
    }
    if (items.length === 0 || subtotalCents <= 0) throw new Error("No valid paid add-ons selected");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const connected = await requireConnectedAccount(
      supabaseAdmin,
      stripe,
      tournament.organization_id,
      "addon_purchase",
    );

    const buyerPaysFees = (tournament as any).pass_fees_to_participants !== false;
    const flatRate = await isFlatRateTournament(supabaseAdmin, tournamentId);
    const platformFeeCents = flatRate ? 0 : Math.round(subtotalCents * PLATFORM_FEE_RATE);
    const stripeFeeCents = buyerPaysFees
      ? calculateGrossedUpStripeFee(subtotalCents + platformFeeCents)
      : calculateProcessingFee(subtotalCents);
    const combinedFeesCents = platformFeeCents + stripeFeeCents;
    const totalCents = buyerPaysFees ? subtotalCents + combinedFeesCents : subtotalCents;

    const publicSlug = (tournament as any).custom_slug || tournament.slug || "";
    const origin = req.headers.get("origin") || "https://teevents.golf";

    const lineItems: any[] = items.map((i) => ({
      price_data: {
        currency: "usd",
        product_data: { name: i.name, description: `Add-on for ${tournament.title}` },
        unit_amount: i.unit_price_cents,
      },
      quantity: i.quantity,
    }));
    if (buyerPaysFees && combinedFeesCents > 0) {
      lineItems.push({
        price_data: { currency: "usd", product_data: { name: "Fees" }, unit_amount: combinedFeesCents },
        quantity: 1,
      });
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("tournament_addon_orders")
      .insert({
        tournament_id: tournamentId,
        buyer_name: buyerName || null,
        buyer_email: buyerEmail,
        items,
        subtotal_cents: subtotalCents,
        fees_cents: buyerPaysFees ? combinedFeesCents : 0,
        total_cents: totalCents,
        payment_status: "pending",
      })
      .select("id")
      .single();
    if (orderErr) throw new Error(orderErr.message);

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: buyerEmail,
        line_items: lineItems,
        success_url: `${origin}/t/${publicSlug}/add-ons?purchase=success&session_id={CHECKOUT_SESSION_ID}${acctQuerySuffix(connected)}`,
        cancel_url: `${origin}/t/${publicSlug}/add-ons?purchase=cancel`,
        ...applicationFeeBlock(connected, platformFeeCents),
        metadata: {
          type: "addon_purchase",
          tournament_id: tournamentId,
          organization_id: tournament.organization_id || "",
          order_id: order.id,
          subtotal_cents: String(subtotalCents),
          platform_fee_cents: String(platformFeeCents),
          stripe_fee_cents: String(stripeFeeCents),
          charge_total_cents: String(totalCents),
          routing: "direct",
        },
      },
      stripeAccountOpts(connected),
    );

    await supabaseAdmin
      .from("tournament_addon_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    await logDirectCharge(supabaseAdmin, {
      context: "addon_purchase",
      tournamentId: tournament.id,
      organizationId: tournament.organization_id,
      stripeAccountId: connected.stripeAccountId,
      grossCents: subtotalCents,
      platformFeeCents,
      stripeFeeCents,
      applicationFeeCents: platformFeeCents,
      passFeesToParticipants: buyerPaysFees,
      stripeSessionId: session.id,
      buyerEmail,
      isPlatformFallback: connected.isPlatformFallback,
    });

    return new Response(JSON.stringify({ url: session.url, order_id: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[create-addon-checkout] ERROR:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
