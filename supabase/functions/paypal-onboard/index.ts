import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const base = Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.paypal.com";

  const res = await fetch(`${base}/v1/oauth2/token`, {
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
    const { action, paypal_merchant_id } = await req.json();

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr || !user) throw new Error("Not authenticated");

    // Get user's org
    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) throw new Error("No organization found");

    if (action === "connect") {
      // User provides their PayPal merchant/business email or merchant ID
      if (!paypal_merchant_id || !paypal_merchant_id.trim()) {
        throw new Error("PayPal Merchant ID or email is required");
      }

      // Verify the merchant ID exists by checking PayPal API
      const accessToken = await getPayPalAccessToken();
      const base = Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.paypal.com";

      // Try to look up merchant — if it fails, still save it (they may not have completed partner signup)
      let verified = false;
      try {
        const verifyRes = await fetch(
          `${base}/v1/customer/partners/${Deno.env.get("PAYPAL_CLIENT_ID")}/merchant-integrations/${paypal_merchant_id.trim()}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        verified = verifyRes.ok;
      } catch {
        // Non-fatal — save anyway
      }

      const { error: updateErr } = await supabaseAdmin
        .from("organizations")
        .update({ paypal_merchant_id: paypal_merchant_id.trim() } as any)
        .eq("id", member.organization_id);

      if (updateErr) throw new Error(updateErr.message);

      return new Response(
        JSON.stringify({ success: true, verified, merchant_id: paypal_merchant_id.trim() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "disconnect") {
      if (member.role !== "owner") throw new Error("Only the organization owner can disconnect PayPal");

      const { error: updateErr } = await supabaseAdmin
        .from("organizations")
        .update({ paypal_merchant_id: null } as any)
        .eq("id", member.organization_id);

      if (updateErr) throw new Error(updateErr.message);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "status") {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("paypal_merchant_id")
        .eq("id", member.organization_id)
        .single();

      return new Response(
        JSON.stringify({
          connected: !!(org as any)?.paypal_merchant_id,
          merchant_id: (org as any)?.paypal_merchant_id || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
