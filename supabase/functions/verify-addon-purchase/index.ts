import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * verify-addon-purchase
 * Body: { session_id: string }
 * Reads Stripe checkout session and flips the tournament's paid_features flags.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ verified: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only add-on purchase sessions may unlock add-ons.
    if (session.metadata?.type !== "addon_purchase" || !(session.amount_total && session.amount_total > 0)) {
      return new Response(JSON.stringify({ verified: false }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tournamentId = session.metadata?.tournament_id;
    const addonsCsv = session.metadata?.addons || "";
    if (!tournamentId) throw new Error("Missing tournament_id in session metadata");
    const addons = addonsCsv.split(",").filter(Boolean);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Apply each paid session exactly once (prevents repeated credit top-ups).
    const { error: claimErr } = await supabaseAdmin
      .from("stripe_session_fulfillments")
      .insert({ session_id: session.id, kind: "addon_purchase", tournament_id: tournamentId });
    if (claimErr) {
      return new Response(JSON.stringify({ verified: true, tournament_id: tournamentId, addons }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: existing } = await supabaseAdmin
      .from("tournaments")
      .select("paid_features")
      .eq("id", tournamentId)
      .maybeSingle();

    const current = (existing?.paid_features as Record<string, boolean>) || {};
    const next = { ...current };
    for (const a of addons) if (a !== "custom_domain_renewal") next[a] = true;

    // Legacy bundle purchases unlock everything
    if (next["bundle"]) {
      next["custom_domain"] = true;
      next["unlimited_manual_entries"] = true;
      next["auction_raffle"] = true;
      next["custom_event_page"] = true;
      next["live_leaderboard"] = true;
    }

    const update: Record<string, unknown> = { paid_features: next };

    // College Golf Scoring unlocks by number of purchased divisions.
    if (addons.includes("college_scoring")) {
      const divisions = Math.min(4, Math.max(1, parseInt(session.metadata?.divisions || "1", 10)));
      update["college_scoring_paid"] = true;
      update["college_scoring_purchased"] = true;
      update["college_scoring_divisions"] = divisions;
      update["college_scoring_divisions_purchased"] = divisions;
      update["college_scoring_paid_at"] = new Date().toISOString();
      update["college_scoring_purchase_date"] = new Date().toISOString();
    }


    // SMS Blast plans toggle dedicated columns (1 credit = 1 text message).
    if (addons.includes("sms_unlimited")) {
      update["sms_enabled"] = true;
      update["sms_plan"] = "unlimited";
      update["sms_credits_limit"] = 0;
    } else if (addons.includes("sms_100")) {
      const { data: cur } = await supabaseAdmin
        .from("tournaments")
        .select("sms_credits_limit, sms_plan")
        .eq("id", tournamentId)
        .maybeSingle();
      update["sms_enabled"] = true;
      if ((cur as any)?.sms_plan !== "unlimited") {
        update["sms_plan"] = "credits";
        update["sms_credits_limit"] = ((cur as any)?.sms_credits_limit ?? 0) + 100;
      }
    }

    // Custom domain renewal: extend the expiry one year (once per paid session).
    // Mirrors src/lib/domainRenewal.ts renewedExpiryMs.
    if (addons.includes("custom_domain_renewal")) {
      const { data: d } = await supabaseAdmin
        .from("tournaments")
        .select("date, end_date, custom_domain_expires_at, custom_domain_renewal_session_id")
        .eq("id", tournamentId)
        .maybeSingle();
      if ((d as any)?.custom_domain_renewal_session_id !== session_id) {
        const DAY = 86400000;
        const toMs = (v: string | null | undefined) => {
          if (!v) return null;
          const iso = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T23:59:59Z` : v;
          const ms = new Date(iso).getTime();
          return Number.isNaN(ms) ? null : ms;
        };
        const now = Date.now();
        const endMs = toMs((d as any)?.end_date || (d as any)?.date);
        const current = toMs((d as any)?.custom_domain_expires_at) ?? (endMs != null ? endMs + 60 * DAY : now);
        update["custom_domain_expires_at"] = new Date(Math.max(current, now) + 365 * DAY).toISOString();
        update["custom_domain_renewed_at"] = new Date(now).toISOString();
        update["custom_domain_renewal_session_id"] = session_id;
        update["custom_domain_notice1_sent_at"] = null;
        update["custom_domain_notice2_sent_at"] = null;
      }
    }

    await supabaseAdmin
      .from("tournaments")
      .update(update)
      .eq("id", tournamentId);

    return new Response(
      JSON.stringify({ verified: true, tournament_id: tournamentId, addons }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
