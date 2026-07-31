// Public league membership registration.
// Creates/updates a league member from the public registration form and either
// completes a free registration or returns a Stripe Checkout URL (direct charge
// on the organizer's Connect account with the 5% platform fee).
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const str = (v: unknown, max = 300) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function discountedCents(
  baseCents: number,
  promo: { discount_percent?: number | null; discount_cents?: number | null } | null,
) {
  if (!promo) return baseCents;
  let amount = baseCents;
  if (promo.discount_percent) {
    amount = Math.round(amount * (1 - Math.min(100, promo.discount_percent) / 100));
  }
  if (promo.discount_cents) amount = amount - promo.discount_cents;
  return Math.max(0, amount);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const leagueSlug = str(body.league_slug, 120);
    const answers = (body.answers && typeof body.answers === "object") ? body.answers : {};
    const promoInput = str(body.promo_code, 40).toUpperCase();
    const returnUrl = str(body.return_url, 500);

    const fullName = str(answers.full_name, 120);
    const email = str(answers.email, 200).toLowerCase();
    if (!leagueSlug) return json({ error: "Missing league" }, 400);
    if (!fullName) return json({ error: "Full name is required" }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "A valid email is required" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: league } = await supabaseAdmin
      .from("golf_leagues")
      .select("id, league_name, league_slug, organization_id, access_status, is_active, pass_platform_fee_to_members")
      .eq("league_slug", leagueSlug)
      .maybeSingle();
    if (!league) return json({ error: "League not found" }, 404);
    if (!league.is_active) return json({ error: "This league is not accepting registrations" }, 400);

    const { data: form } = await supabaseAdmin
      .from("league_registration_forms")
      .select("*")
      .eq("league_id", league.id)
      .maybeSingle();
    if (!form || !form.is_open) return json({ error: "Registration is currently closed for this league" }, 400);

    // ---- Fee + promo resolution (server-authoritative) ----
    let baseCents = form.is_free ? 0 : Number(form.league_fee_cents || 0);
    let promoRow: any = null;
    if (baseCents > 0 && form.promo_code_enabled && promoInput) {
      const { data: p } = await supabaseAdmin
        .from("league_registration_promo_codes")
        .select("*")
        .eq("league_id", league.id)
        .eq("code", promoInput)
        .eq("is_active", true)
        .maybeSingle();
      if (!p) return json({ error: "Promo code not valid" }, 400);
      if (p.max_uses != null && Number(p.times_used || 0) >= Number(p.max_uses)) {
        return json({ error: "Promo code has reached its usage limit" }, 400);
      }
      promoRow = p;
    }
    const amountCents = discountedCents(baseCents, promoRow);

    // ---- Upsert the member ----
    const memberPatch: Record<string, unknown> = {
      member_name: fullName,
      email,
      phone: str(answers.phone, 40) || null,
      handicap_index: num(answers.handicap_index),
      shirt_size: str(answers.shirt_size, 20) || null,
      avg_18_score: num(answers.avg_18_score),
      avg_9_score: num(answers.avg_9_score),
      profile_image_url: str(answers.profile_image_url, 500) || null,
      is_active: true,
    };

    const { data: existing } = await supabaseAdmin
      .from("league_members")
      .select("id, scoring_code, membership_fee_paid")
      .eq("league_id", league.id)
      .ilike("email", email)
      .maybeSingle();

    let memberId: string;
    let scoringCode: string | null = null;
    if (existing) {
      if (existing.membership_fee_paid && amountCents > 0) {
        return json({ error: "This email is already registered and paid for this league." }, 400);
      }
      memberId = existing.id;
      scoringCode = existing.scoring_code;
      await supabaseAdmin.from("league_members").update(memberPatch).eq("id", memberId);
    } else {
      const { data: created, error: cErr } = await supabaseAdmin
        .from("league_members")
        .insert({
          league_id: league.id,
          membership_status: amountCents > 0 ? "pending" : "active",
          membership_fee_cents: amountCents || null,
          ...memberPatch,
        })
        .select("id, scoring_code")
        .single();
      if (cErr) throw cErr;
      memberId = created.id;
      scoringCode = created.scoring_code;
    }

    const { data: response, error: rErr } = await supabaseAdmin
      .from("league_registration_responses")
      .insert({
        league_id: league.id,
        member_id: memberId,
        response_data: answers,
        amount_cents: amountCents,
        promo_code: promoRow?.code || null,
        payment_status: amountCents > 0 ? "pending" : "free",
        paid_at: amountCents > 0 ? null : new Date().toISOString(),
      })
      .select("id")
      .single();
    if (rErr) throw rErr;

    // ---- Free registration: done ----
    if (amountCents <= 0) {
      await supabaseAdmin
        .from("league_members")
        .update({ membership_fee_paid: true, membership_status: "active", membership_fee_cents: 0 })
        .eq("id", memberId);
      if (promoRow) {
        await supabaseAdmin
          .from("league_registration_promo_codes")
          .update({ times_used: Number(promoRow.times_used || 0) + 1 })
          .eq("id", promoRow.id);
      }
      return json({ free: true, scoring_code: scoringCode, member_id: memberId });
    }

    if (amountCents < 100) return json({ error: "League fee must be at least $1.00" }, 400);
    if (league.access_status !== "paid") {
      return json({ error: "This league is not yet activated for payments. Contact your league manager." }, 400);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const account = await requireConnectedAccount(supabaseAdmin, stripe, league.organization_id, "league-registration");
    const { platformFeeCents: feeCents, combinedFeesCents } = computeFees(amountCents);
    const passFee = !!form.pass_platform_fee_to_player || (league as any).pass_platform_fee_to_members !== false;
    const chargeCents = passFee ? amountCents + combinedFeesCents : amountCents;
    const origin = req.headers.get("origin") || "https://teevents.golf";
    const base = returnUrl || `${origin}/league/${league.league_slug}/register`;

    const { data: payment, error: pErr } = await supabaseAdmin
      .from("league_payments")
      .insert({
        league_id: league.id,
        member_id: memberId,
        kind: "registration",
        amount_cents: chargeCents,
        platform_fee_cents: feeCents,
        stripe_account_id: account.stripeAccountId,
        payer_email: email,
        status: "pending",
      })
      .select("id")
      .single();
    if (pErr) throw pErr;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: chargeCents,
              product_data: {
                name: `${league.league_name} — League Registration`,
                description: `Season membership for ${fullName}`,
              },
            },
            quantity: 1,
          },
        ],
        ...applicationFeeBlock(account, feeCents),
        success_url: `${base}?pay=success${acctQuerySuffix(account)}`,
        cancel_url: `${base}?pay=cancelled`,
        metadata: {
          kind: "league_registration",
          payment_id: payment.id,
          member_id: memberId,
          league_id: league.id,
          response_id: response.id,
          promo_code: promoRow?.code || "",
        },
      },
      stripeAccountOpts(account),
    );

    await supabaseAdmin
      .from("league_payments")
      .update({ stripe_session_id: session.id })
      .eq("id", payment.id);

    return json({ url: session.url });
  } catch (e) {
    console.error("league-member-register error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
