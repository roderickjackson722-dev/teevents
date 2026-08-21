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

    const tournamentId = session.metadata?.tournament_id;
    const addonsCsv = session.metadata?.addons || "";
    if (!tournamentId) throw new Error("Missing tournament_id in session metadata");
    const addons = addonsCsv.split(",").filter(Boolean);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: existing } = await supabaseAdmin
      .from("tournaments")
      .select("paid_features")
      .eq("id", tournamentId)
      .maybeSingle();

    const current = (existing?.paid_features as Record<string, boolean>) || {};
    const next = { ...current };
    for (const a of addons) next[a] = true;

    // Bundle unlocks everything
    if (next["bundle"]) {
      next["custom_domain"] = true;
      next["unlimited_manual_entries"] = true;
      next["auction_raffle"] = true;
      next["custom_event_page"] = true;
      next["priority_support"] = true;
    }

    const update: Record<string, unknown> = { paid_features: next };

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
        update["sms_plan"] = "starter";
        update["sms_credits_limit"] = ((cur as any)?.sms_credits_limit ?? 0) + 100;
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
