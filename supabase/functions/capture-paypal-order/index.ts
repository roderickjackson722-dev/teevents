import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendRegistrantConfirmationEmail } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_BASE = Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) throw new Error("Missing order_id");

    const accessToken = await getPayPalAccessToken();

    // Capture the order
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureRes.json();

    if (captureData.status !== "COMPLETED") {
      return new Response(
        JSON.stringify({ verified: false, status: captureData.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse custom_id to get registration IDs
    const purchaseUnit = captureData.purchase_units?.[0];
    let registrationIds: string[] = [];
    let tournamentId = "";

    try {
      const customData = JSON.parse(purchaseUnit?.payments?.captures?.[0]?.custom_id || purchaseUnit?.custom_id || "{}");
      registrationIds = customData.registration_ids || [];
      tournamentId = customData.tournament_id || "";
    } catch {
      // Try reference_id fallback
      const refId = purchaseUnit?.reference_id;
      if (refId) registrationIds = refId.split(",");
    }

    if (registrationIds.length === 0) {
      return new Response(
        JSON.stringify({ verified: true, status: "COMPLETED", warning: "No registration IDs found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Update payment status
    const { error: updateErr } = await supabaseAdmin
      .from("tournament_registrations")
      .update({ payment_status: "paid" })
      .in("id", registrationIds);

    if (updateErr) console.error("Failed to update registrations:", updateErr);

    // Send confirmation email to first registrant
    try {
      const { data: reg } = await supabaseAdmin
        .from("tournament_registrations")
        .select("first_name, last_name, email, tournament_id")
        .eq("id", registrationIds[0])
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
      console.error("Confirmation email error:", e);
    }

    return new Response(
      JSON.stringify({ verified: true, status: "COMPLETED" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
