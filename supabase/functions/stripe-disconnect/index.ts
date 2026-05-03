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

    const userId = user.id;

    // Verify the user is the OWNER of the organization
    const { data: membership } = await supabaseClient
      .from("org_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (!membership) throw new Error("No organization found");

    if (membership.role !== "owner") {
      throw new Error("Only the organization owner can disconnect the Stripe account");
    }

    const { organization_id } = membership;

    // Parse the request body for confirmation
    const body = await req.json().catch(() => ({}));
    const { confirm_email } = body;

    // Require the user to confirm by typing their email
    if (!confirm_email || confirm_email.toLowerCase() !== user.email?.toLowerCase()) {
      throw new Error("Email confirmation does not match. Please type your account email to confirm.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get current stripe account id for logging
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", organization_id)
      .single();

    if (!org?.stripe_account_id) {
      throw new Error("No Stripe account is currently connected");
    }

    console.log(`Disconnecting Stripe account ${org.stripe_account_id} from org ${organization_id} by user ${userId}`);

    // Remove the stripe_account_id from the organization
    const { error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({ stripe_account_id: null })
      .eq("id", organization_id);

    if (updateError) throw new Error("Failed to disconnect Stripe account");

    // Fully clear payout methods — wipe ALL Stripe-related cache so the next
    // connection starts from a clean slate. Without this, stale account info
    // (last4, brand, bank name, preferred_method) can shadow the new account.
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

    // Defensive: also force-clear the org's payment_method_override so we don't
    // keep a stale "force_stripe" pointing at a disconnected account.
    await supabaseAdmin
      .from("tournaments")
      .update({ payment_method_override: "default" })
      .eq("organization_id", organization_id)
      .eq("payment_method_override", "force_stripe");

    // Log the disconnect
    await supabaseAdmin.from("stripe_onboarding_logs").insert({
      organization_id,
      stripe_account_id: org.stripe_account_id,
      event_type: "organizer_disconnected",
      metadata: { user_email: user.email },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("stripe-disconnect error:", message);
    const status = message === "Unauthorized" ? 401
      : message.includes("owner") ? 403
      : message.includes("confirmation") ? 400
      : 500;
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
