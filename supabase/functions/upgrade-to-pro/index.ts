import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * upgrade-to-pro
 *
 * Creates a Stripe Checkout session for a one-time $399 charge that unlocks
 * Pro features for ONE specific tournament (per-tournament unlock model).
 *
 * Body: { tournament_id: string }
 *
 * Returns: { url: string }  -> redirect the user
 *
 * The matching `verify-pro-upgrade` function flips `tournaments.is_pro = true`
 * after the checkout session completes successfully.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const { tournament_id } = await req.json();
    if (!tournament_id || typeof tournament_id !== "string") {
      throw new Error("tournament_id is required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify caller belongs to the org that owns this tournament
    const { data: tournament, error: tErr } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, organization_id, is_pro")
      .eq("id", tournament_id)
      .maybeSingle();
    if (tErr || !tournament) throw new Error("Tournament not found");
    if (tournament.is_pro) {
      return new Response(JSON.stringify({ error: "Tournament already on Pro" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("organization_id", tournament.organization_id)
      .maybeSingle();
    if (!membership) throw new Error("You are not a member of this organization");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") ?? "https://teevents.golf";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "TeeVents Pro — One Tournament",
            description: `Unlocks Pro features for: ${tournament.title}`,
          },
          unit_amount: 39900,
        },
        quantity: 1,
      }],
      success_url: `${origin}/dashboard?upgrade_session_id={CHECKOUT_SESSION_ID}&tournament_id=${tournament.id}`,
      cancel_url: `${origin}/dashboard?upgrade_canceled=1`,
      metadata: {
        type: "pro_upgrade",
        tournament_id: tournament.id,
        organization_id: tournament.organization_id,
        user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
