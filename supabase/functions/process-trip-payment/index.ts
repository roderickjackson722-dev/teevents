import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { trip_id, participant_id, amount_cents, payment_type } = await req.json();
    if (!trip_id || !participant_id || !amount_cents || amount_cents < 100) {
      throw new Error("Invalid request");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify trip ownership
    const { data: trip } = await supabase.from("golf_trips").select("id, title, organizer_id").eq("id", trip_id).maybeSingle();
    if (!trip || trip.organizer_id !== user.id) throw new Error("Trip not found or unauthorized");

    const { data: participant } = await supabase.from("trip_participants").select("id, name, email").eq("id", participant_id).maybeSingle();
    if (!participant) throw new Error("Participant not found");

    // 5% platform fee added on top
    const platformFee = Math.round(amount_cents * 0.05);
    const total = amount_cents + platformFee;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: participant.email || undefined,
      line_items: [
        { price_data: { currency: "usd", product_data: { name: `${trip.title} — ${payment_type}` }, unit_amount: amount_cents }, quantity: 1 },
        { price_data: { currency: "usd", product_data: { name: "Platform fee (5%)" }, unit_amount: platformFee }, quantity: 1 },
      ],
      success_url: `${req.headers.get("origin")}/trips/${trip_id}?paid=1`,
      cancel_url: `${req.headers.get("origin")}/trips/${trip_id}?cancelled=1`,
      metadata: { trip_id, participant_id, payment_type, base_amount_cents: String(amount_cents) },
    });

    await supabase.from("trip_payments").insert({
      trip_id,
      participant_id,
      amount_cents: total,
      payment_type,
      stripe_session_id: session.id,
      status: "pending",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
