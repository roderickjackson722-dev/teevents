// Side Event ticket checkout — Direct Charge to the organizer's Connect account.
// Anonymous attendees can buy tickets. TeeVents takes a 5% application fee.

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireConnectedAccount, logDirectCharge, PLATFORM_FEE_RATE, isFlatRateTournament, stripeAccountOpts, acctQuerySuffix, applicationFeeBlock, notifyPlatformFallback } from "../_shared/connectRouting.ts";

const calculateGrossedUpStripeFee = (subtotalCents: number) =>
  Math.max(0, Math.round((subtotalCents + 30) / (1 - 0.029)) - subtotalCents);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { side_event_id, attendee_name, attendee_email, attendee_phone, quantity, custom_answers } = body;
    const qty = Math.max(1, parseInt(quantity ?? "1", 10) || 1);

    if (!side_event_id || !attendee_name?.trim() || !attendee_email?.trim()) {
      throw new Error("Missing required fields");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ev, error: evErr } = await supabaseAdmin
      .from("side_events")
      .select("id, name, description, price_cents, max_tickets, tickets_sold, is_active, tournament_id")
      .eq("id", side_event_id)
      .single();
    if (evErr || !ev) throw new Error("Side event not found");
    if (!ev.is_active) throw new Error("Side event is not active");
    if (ev.price_cents <= 0) throw new Error("Invalid price");
    if (ev.max_tickets != null && (ev.tickets_sold || 0) + qty > ev.max_tickets) {
      throw new Error("Not enough tickets remaining");
    }

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, organization_id")
      .eq("id", ev.tournament_id)
      .single();
    if (!tournament) throw new Error("Tournament not found");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const connected = await requireConnectedAccount(
      supabaseAdmin,
      stripe,
      tournament.organization_id,
      "side_event",
    );
    const organizerStripeAccountId = connected.stripeAccountId;

    const grossCents = ev.price_cents * qty;

    const { data: ticket, error: tkErr } = await supabaseAdmin
      .from("side_event_tickets")
      .insert({
        side_event_id,
        tournament_id: ev.tournament_id,
        attendee_name: attendee_name.trim(),
        attendee_email: attendee_email.trim(),
        attendee_phone: attendee_phone?.trim() || null,
        quantity: qty,
        amount_cents: grossCents,
        payment_status: "pending",
        custom_answers: Array.isArray(custom_answers) ? custom_answers : null,
      })
      .select("id")
      .single();
    if (tkErr || !ticket) throw new Error(tkErr?.message || "Failed to create ticket");

    const flatRate = await isFlatRateTournament(supabaseAdmin, ev.tournament_id);
    const platformFeeCents = flatRate ? 0 : Math.round(grossCents * PLATFORM_FEE_RATE);
    const stripeFeeCents = calculateGrossedUpStripeFee(grossCents + platformFeeCents);
    const combinedFeesCents = platformFeeCents + stripeFeeCents;
    const applicationFeeAmount = platformFeeCents;

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";
    const lineItems: any[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${ev.name} — ${tournament.title}`,
            description: ev.description || `Ticket for ${tournament.title}`,
          },
          unit_amount: ev.price_cents,
        },
        quantity: qty,
      },
    ];
    if (combinedFeesCents > 0) {
      lineItems.push({
        price_data: { currency: "usd", product_data: { name: "Fees" }, unit_amount: combinedFeesCents },
        quantity: 1,
      });
    }

    const checkoutParams: any = {
      customer_email: attendee_email.trim(),
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${tournament.slug}?side_event_success=true&session_id={CHECKOUT_SESSION_ID}${acctQuerySuffix(connected)}`,
      cancel_url: `${origin}/t/${tournament.slug}?side_event_cancel=true`,
      ...applicationFeeBlock(connected, applicationFeeAmount),
      metadata: {
        type: "side_event_ticket",
        tournament_id: ev.tournament_id,
        organization_id: tournament.organization_id,
        side_event_id,
        side_event_ticket_id: ticket.id,
        quantity: String(qty),
        gross_amount_cents: String(grossCents),
        platform_fee_cents: String(platformFeeCents),
        stripe_fee_cents: String(stripeFeeCents),
        application_fee_cents: String(applicationFeeAmount),
        charge_total_cents: String(grossCents + combinedFeesCents),
        routing: connected.isPlatformFallback ? "platform_fallback" : "direct",
      },
    };

    const session = await stripe.checkout.sessions.create(
      checkoutParams,
      stripeAccountOpts(connected),
    );

    await logDirectCharge(supabaseAdmin, {
      context: "side_event",
      tournamentId: ev.tournament_id,
      organizationId: tournament.organization_id,
      stripeAccountId: organizerStripeAccountId,
      grossCents,
      platformFeeCents,
      stripeFeeCents,
      applicationFeeCents: applicationFeeAmount,
      passFeesToParticipants: true,
      stripeSessionId: session.id,
      buyerEmail: attendee_email?.trim() || null,
      notes: `side_event=${ev.name} qty=${qty}`,
      isPlatformFallback: connected.isPlatformFallback,
    });

    if (connected.isPlatformFallback) {
      await notifyPlatformFallback({
        context: "side_event",
        organizationId: tournament.organization_id,
        organizationName: connected.organizationName,
        tournamentId: ev.tournament_id,
        tournamentTitle: tournament.title,
        grossCents,
        buyerEmail: attendee_email?.trim() || null,
        stripeSessionId: session.id,
      });
    }

    await supabaseAdmin
      .from("side_event_tickets")
      .update({ stripe_session_id: session.id })
      .eq("id", ticket.id);

    return new Response(
      JSON.stringify({ success: true, checkout_url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
