import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLATFORM_FEE_RATE = 0.05; // 5% platform fee

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      await supabaseAdmin
        .from("tournament_donations")
        .update({ status: "completed" })
        .eq("stripe_session_id", session_id);

      // Record platform transaction (escrow) with flat $5 fee
      const organizationId = session.metadata?.organization_id;
      const tournamentId = session.metadata?.tournament_id;
      const amountCents = session.amount_total || 0;

      if (organizationId && amountCents > 0) {
        const platformFeeCents = PLATFORM_FEE_CENTS;
        const netAmountCents = amountCents - platformFeeCents;
        const holdAmountCents = Math.round(netAmountCents * 0.15);

        // Calculate hold_release_date: event end_date + 15 days
        let holdReleaseDate: string | null = null;
        if (tournamentId) {
          const { data: tData } = await supabaseAdmin
            .from("tournaments")
            .select("end_date, date")
            .eq("id", tournamentId)
            .single();
          const eventEnd = tData?.end_date || tData?.date;
          if (eventEnd) {
            const d = new Date(eventEnd);
            d.setDate(d.getDate() + 15);
            holdReleaseDate = d.toISOString().split("T")[0];
          }
        }

        await supabaseAdmin.from("platform_transactions").insert({
          organization_id: organizationId,
          tournament_id: tournamentId || null,
          amount_cents: amountCents,
          platform_fee_cents: platformFeeCents,
          net_amount_cents: netAmountCents,
          hold_amount_cents: holdAmountCents,
          hold_release_date: holdReleaseDate,
          hold_status: "active",
          type: "donation",
          status: "held",
          stripe_session_id: session_id,
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          description: `Donation — $${(amountCents / 100).toFixed(2)}`,
        });
      }

      return new Response(
        JSON.stringify({ verified: true, status: "completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ verified: false, status: session.payment_status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
