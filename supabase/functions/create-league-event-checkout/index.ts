// League event registration fee checkout — direct charge to organizer, 5% platform fee.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  requireConnectedAccount,
  PLATFORM_FEE_RATE,
  stripeAccountOpts,
  acctQuerySuffix,
  applicationFeeBlock,
} from "../_shared/connectRouting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { event_id, member_id, scoring_code, return_url, fee_tier_id } = await req.json();
    if (!event_id || !member_id || !scoring_code) throw new Error("Missing event_id, member_id, or scoring_code");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: member } = await supabaseAdmin
      .from("league_members")
      .select("id, league_id, member_name, email, scoring_code")
      .eq("id", member_id)
      .single();
    if (!member) throw new Error("Member not found");
    if (String(member.scoring_code || "").toUpperCase() !== String(scoring_code).toUpperCase()) {
      throw new Error("Invalid scoring code");
    }

    const { data: event } = await supabaseAdmin
      .from("league_events")
      .select("id, event_name, event_date, league_id, registration_fee_cents, pass_platform_fee_to_player, fee_tiers")
      .eq("id", event_id)
      .single();
    if (!event) throw new Error("Event not found");
    if (event.league_id !== member.league_id) throw new Error("Event does not belong to this league");

    // Resolve fee amount — from selected tier if the event has tiers, else fall back to base fee.
    const tiers: Array<{ id: string; label: string; amount_cents: number }> = Array.isArray((event as any).fee_tiers) ? (event as any).fee_tiers : [];
    let amountCents = Number((event as any).registration_fee_cents || 0);
    let tierLabel: string | null = null;
    let tierId: string | null = null;
    if (tiers.length > 0) {
      if (!fee_tier_id) throw new Error("Please select a registration option");
      const tier = tiers.find(t => t.id === fee_tier_id);
      if (!tier) throw new Error("Selected registration option is no longer available");
      amountCents = Number(tier.amount_cents || 0);
      tierLabel = tier.label;
      tierId = tier.id;
    }
    if (!amountCents || amountCents < 100) throw new Error("Event fee not set");

    const { data: league } = await supabaseAdmin
      .from("golf_leagues")
      .select("id, league_name, organization_id, access_status, pass_platform_fee_to_members")
      .eq("id", event.league_id)
      .single();
    if (!league || league.access_status !== "paid") throw new Error("League is not unlocked");

    // Upsert registration (unpaid) so webhook can flip it
    const { data: existingReg } = await supabaseAdmin
      .from("league_event_registrations")
      .select("id, fee_paid")
      .eq("event_id", event.id)
      .eq("member_id", member.id)
      .maybeSingle();
    if (existingReg?.fee_paid) throw new Error("Already registered and paid");
    let regId = existingReg?.id;
    if (!regId) {
      const { data: newReg, error: rErr } = await supabaseAdmin
        .from("league_event_registrations")
        .insert({
          event_id: event.id,
          member_id: member.id,
          fee_paid: false,
          fee_tier_id: tierId,
          fee_tier_label: tierLabel,
          fee_tier_amount_cents: tiers.length > 0 ? amountCents : null,
        })
        .select("id")
        .single();
      if (rErr) throw rErr;
      regId = newReg.id;
    } else {
      await supabaseAdmin
        .from("league_event_registrations")
        .update({
          fee_tier_id: tierId,
          fee_tier_label: tierLabel,
          fee_tier_amount_cents: tiers.length > 0 ? amountCents : null,
        })
        .eq("id", regId);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const account = await requireConnectedAccount(supabaseAdmin, stripe, league.organization_id, "league-event");
    const feeCents = Math.round(amountCents * PLATFORM_FEE_RATE);
    const passFee = !!(event as any).pass_platform_fee_to_player || (league as any).pass_platform_fee_to_members !== false;
    const chargeCents = passFee ? amountCents + feeCents : amountCents;
    const origin = req.headers.get("origin") || "https://teevents.golf";

    const { data: payment } = await supabaseAdmin
      .from("league_payments")
      .insert({
        league_id: league.id,
        member_id: member.id,
        event_id: event.id,
        registration_id: regId,
        kind: "event",
        amount_cents: amountCents,
        platform_fee_cents: feeCents,
        stripe_account_id: account.stripeAccountId,
        payer_email: (member as any).email,
        status: "pending",
      })
      .select()
      .single();

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: (member as any).email || undefined,
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: chargeCents,
              product_data: {
                name: `${league.league_name} — ${event.event_name}`,
                description: passFee
                  ? `Event entry for ${member.member_name} (includes 5% platform fee)`
                  : `Event entry for ${member.member_name}`,
              },
            },
            quantity: 1,
          },
        ],
        ...applicationFeeBlock(account, feeCents),
        success_url: `${return_url || origin}?pay=success`,
        cancel_url: `${return_url || origin}?pay=cancelled`,
        metadata: {
          kind: "league_event",
          payment_id: payment!.id,
          registration_id: regId,
          member_id: member.id,
          event_id: event.id,
          league_id: league.id,
        },
      },
      stripeAccountOpts(account),
    );

    await supabaseAdmin
      .from("league_payments")
      .update({ stripe_session_id: session.id })
      .eq("id", payment!.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
