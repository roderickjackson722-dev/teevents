import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { tournament_id } = await req.json();
    if (!tournament_id) throw new Error("Missing tournament_id");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get tournament's org
    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("organization_id")
      .eq("id", tournament_id)
      .single();

    if (!tournament) throw new Error("Tournament not found");

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("is_nonprofit, ein, nonprofit_name, nonprofit_verified, plan, stripe_account_id")
      .eq("id", tournament.organization_id)
      .single();

    const FEE_RATES: Record<string, number> = { base: 0.05, starter: 0, premium: 0 };
    const feeRate = (org as any)?.fee_override != null
      ? (org as any).fee_override / 100
      : org?.is_nonprofit ? 0.05 : (FEE_RATES[org?.plan || "base"] ?? 0.05);

    const hasStripe = !!(org as any)?.stripe_account_id;
    const hasPaypal = !!(org as any)?.paypal_merchant_id;

    return new Response(
      JSON.stringify({
        is_nonprofit: org?.is_nonprofit || false,
        nonprofit_name: org?.nonprofit_name || null,
        ein: org?.ein || null,
        nonprofit_verified: org?.nonprofit_verified || false,
        platform_fee_rate: feeRate,
        has_stripe: hasStripe,
        has_paypal: hasPaypal,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
