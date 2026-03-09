import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendRegistrantConfirmationEmail } from "../_shared/notify.ts";

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
      // Support both single registration_id and comma-separated registration_ids
      const registrationIds = session.metadata?.registration_ids
        ? session.metadata.registration_ids.split(",")
        : session.metadata?.registration_id
          ? [session.metadata.registration_id]
          : [];

      if (registrationIds.length === 0) throw new Error("Missing registration IDs in session metadata");

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // Update all registrations to paid
      await supabaseAdmin
        .from("tournament_registrations")
        .update({ payment_status: "paid" })
        .in("id", registrationIds);

      // Send confirmation email to the registrant
      try {
        const { data: reg } = await supabaseAdmin
          .from("tournament_registrations")
          .select("first_name, last_name, email, tournament_id")
          .eq("id", registrationId)
          .single();

        if (reg) {
          const { data: tournament } = await supabaseAdmin
            .from("tournaments")
            .select("title, date, location")
            .eq("id", reg.tournament_id)
            .single();

          if (tournament) {
            await sendRegistrantConfirmationEmail(
              reg.first_name, reg.last_name, reg.email,
              tournament.title, tournament.date, tournament.location,
            );
          }
        }
      } catch (e) {
        console.error("Registrant confirmation error:", e);
      }

      return new Response(
        JSON.stringify({ verified: true, status: "paid" }),
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
