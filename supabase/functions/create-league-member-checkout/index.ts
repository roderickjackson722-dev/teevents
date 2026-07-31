// League membership fee checkout — direct charge to organizer's Connect account with 5% platform fee.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  requireConnectedAccount,
  PLATFORM_FEE_RATE,
  computeFees,
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
    const { member_id, scoring_code, return_url } = await req.json();
    if (!member_id || !scoring_code) throw new Error("Missing member_id or scoring_code");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: member, error: mErr } = await supabaseAdmin
      .from("league_members")
      .select("id, league_id, member_name, email, scoring_code, membership_fee_cents, membership_fee_paid")
      .eq("id", member_id)
      .single();
    if (mErr || !member) throw new Error("Member not found");
    if (String(member.scoring_code || "").toUpperCase() !== String(scoring_code).toUpperCase()) {
      throw new Error("Invalid scoring code");
    }
    if (member.membership_fee_paid) throw new Error("Membership already paid");
    const amountCents = Number((member as any).membership_fee_cents || 0);
    if (!amountCents || amountCents < 100) throw new Error("Membership fee not set");

    const { data: league } = await supabaseAdmin
      .from("golf_leagues")
      .select("id, league_name, organization_id, access_status, pass_platform_fee_to_members")
      .eq("id", member.league_id)
      .single();
    if (!league) throw new Error("League not found");
    if (league.access_status !== "paid") throw new Error("League is not unlocked");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const account = await requireConnectedAccount(supabaseAdmin, stripe, league.organization_id, "league-member");

    const { platformFeeCents: feeCents, combinedFeesCents } = computeFees(amountCents);
    const passFee = (league as any).pass_platform_fee_to_members !== false;
    const chargeCents = passFee ? amountCents + combinedFeesCents : amountCents;
    const origin = req.headers.get("origin") || "https://teevents.golf";

    const { data: payment } = await supabaseAdmin
      .from("league_payments")
      .insert({
        league_id: league.id,
        member_id: member.id,
        kind: "membership",
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
                name: `${league.league_name} — Membership`,
                description: passFee
                  ? `Season membership for ${member.member_name} (includes 5% platform fee + card processing)`
                  : `Season membership for ${member.member_name}`,
              },
            },
            quantity: 1,
          },
        ],
        ...applicationFeeBlock(account, feeCents),
        success_url: `${return_url || origin}?pay=success${acctQuerySuffix(account).replace('&','&')}`,
        cancel_url: `${return_url || origin}?pay=cancelled`,
        metadata: {
          kind: "league_membership",
          payment_id: payment!.id,
          member_id: member.id,
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
