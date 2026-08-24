// Stripe Direct-Charge checkout for raffle ticket purchase.
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
    const { raffle_id, quantity, buyer_name, buyer_email, buyer_phone, tournament_slug } = await req.json();
    if (!raffle_id || !buyer_name || !buyer_email) throw new Error("Missing required fields.");
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: raffle, error } = await supabaseAdmin
      .from("raffles")
      .select("id, item_name, ticket_price_cents, max_tickets, tickets_sold, status, tournament_id")
      .eq("id", raffle_id)
      .single();
    if (error || !raffle) throw new Error("Raffle not found.");
    if (raffle.status !== "active") throw new Error("This raffle is no longer active.");
    if (raffle.max_tickets && raffle.tickets_sold + qty > raffle.max_tickets) {
      throw new Error(`Only ${raffle.max_tickets - raffle.tickets_sold} tickets remaining.`);
    }

    const { data: t } = await supabaseAdmin
      .from("tournaments")
      .select("organization_id, slug, pass_fees_to_participants")
      .eq("id", raffle.tournament_id)
      .single();
    const passFees = (t as any)?.pass_fees_to_participants !== false;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const connected = await requireConnectedAccount(supabaseAdmin, stripe, t?.organization_id || null, "raffle");

    const subtotal = raffle.ticket_price_cents * qty;
    const flatRate = await isFlatRateTournament(supabaseAdmin, raffle.tournament_id);
    const { platformFeeCents, stripeFeeCents, combinedFeesCents } = computeFees(subtotal, flatRate);

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";
    const slug = tournament_slug || t?.slug || "";

    const lineItems: any[] = [{
      price_data: {
        currency: "usd",
        product_data: { name: `Raffle Ticket — ${raffle.item_name}` },
        unit_amount: raffle.ticket_price_cents,
      },
      quantity: qty,
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
      success_url: `${origin}/t/${slug}?raffle_purchase=success&raffle_id=${raffle_id}&session_id={CHECKOUT_SESSION_ID}${acctQuerySuffix(connected)}`,
      cancel_url: `${origin}/t/${slug}#raffles`,
      ...applicationFeeBlock(connected, platformFeeCents),
      metadata: {
        type: "raffle_tickets",
        raffle_id,
        tournament_id: raffle.tournament_id,
        organization_id: t?.organization_id || "",
        quantity: String(qty),
        buyer_name,
        buyer_email,
        buyer_phone: buyer_phone || "",
      },
    }, stripeAccountOpts(connected));

    await logDirectCharge(supabaseAdmin, {
      context: "raffle",
      tournamentId: raffle.tournament_id,
      organizationId: t?.organization_id || null,
      stripeAccountId: connected.stripeAccountId,
      grossCents: subtotal,
      platformFeeCents, stripeFeeCents,
      applicationFeeCents: platformFeeCents,
      passFeesToParticipants: passFees,
      stripeSessionId: session.id,
      buyerEmail: buyer_email,
      isPlatformFallback: connected.isPlatformFallback
    });

    if (connected.isPlatformFallback) {
      await notifyPlatformFallback({
        context: "raffle",
        organizationId: t?.organization_id || null,
        organizationName: connected.organizationName,
        tournamentId: raffle.tournament_id,
        tournamentTitle: null,
        grossCents: subtotal,
        buyerEmail: buyer_email,
        stripeSessionId: session.id,
      });
    }

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
