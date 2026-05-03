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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) throw new Error("Unauthorized");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.split(" ")[1]?.trim();
    let user = null;
    if (token) {
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (!error) user = data.user;
    }
    if (!user) {
      const { data, error } = await supabaseClient.auth.getUser();
      if (!error) user = data.user;
    }
    if (!user) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check admin role
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) throw new Error("Forbidden: admin role required");

    const body = await req.json().catch(() => ({}));
    const { organization_id, reason } = body;

    if (!organization_id) throw new Error("organization_id is required");

    // Get current stripe account
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("stripe_account_id, name")
      .eq("id", organization_id)
      .single();

    const previousStripeAccountId = org?.stripe_account_id || null;

    // Clear stripe from organizations table
    await supabaseAdmin
      .from("organizations")
      .update({ stripe_account_id: null })
      .eq("id", organization_id);

    // Clear stripe from payout methods table — full wipe so the next
    // connection is clean (last4, brand, bank name, preferred method, etc.).
    await supabaseAdmin
      .from("organization_payout_methods")
      .update({
        stripe_account_id: null,
        stripe_onboarding_complete: false,
        stripe_account_status: "pending",
        stripe_account_last4: null,
        stripe_account_brand: null,
        stripe_bank_account_token: null,
        bank_name: null,
        account_last_four: null,
        routing_last_four: null,
        is_verified: false,
        preferred_method: null,
        pending_change_email: null,
        change_requested_at: null,
        change_request_status: "none",
        verification_notes: null,
      })
      .eq("organization_id", organization_id);

    // Force-clear any tournaments that hard-pinned to organizer Stripe routing.
    await supabaseAdmin
      .from("tournaments")
      .update({ payment_method_override: "default" })
      .eq("organization_id", organization_id)
      .eq("payment_method_override", "force_stripe");

    // Log the reset
    await supabaseAdmin.from("stripe_onboarding_logs").insert({
      organization_id,
      stripe_account_id: previousStripeAccountId,
      event_type: "admin_reset",
      metadata: {
        admin_id: user.id,
        admin_email: user.email,
        reason: reason || "Admin reset",
        previous_account_id: previousStripeAccountId,
      },
    });

    // Log to admin audit
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "stripe_account_reset",
      target_type: "organization",
      target_id: organization_id,
      changes: {
        previous_stripe_account_id: previousStripeAccountId,
        reason: reason || "Admin reset",
        org_name: org?.name,
      },
    });

    console.log(`Admin ${user.email} reset Stripe for org ${organization_id} (was: ${previousStripeAccountId})`);

    return new Response(JSON.stringify({ success: true, previous_account_id: previousStripeAccountId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("stripe-admin-reset error:", message);
    const status = message === "Unauthorized" ? 401 : message.includes("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
