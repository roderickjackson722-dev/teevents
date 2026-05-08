import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const stripeConfigErrorResponse = (message: string, code: string) =>
  new Response(JSON.stringify({ error: message, code }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      throw new Error("Unauthorized");
    }

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

    // Get org membership
    const { data: membership } = await supabaseClient
      .from("org_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (!membership) throw new Error("No organization found");

    const { organization_id } = membership;

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";

    if (!stripeSecretKey) {
      return stripeConfigErrorResponse(
        "Stripe is not configured yet. Please update the Stripe secret key in the Stripe connector, then try again.",
        "STRIPE_SECRET_KEY_MISSING",
      );
    }

    if (!stripeSecretKey.startsWith("sk_live_") && !stripeSecretKey.startsWith("rk_live_")) {
      return stripeConfigErrorResponse(
        "Stripe Connect is in live mode, but the saved Stripe key is not a live secret key. Please update the Stripe connector with a live Stripe secret key, then try again.",
        "STRIPE_LIVE_KEY_REQUIRED",
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check if org already has a stripe account in payout methods
    const { data: payoutMethod } = await supabaseAdmin
      .from("organization_payout_methods")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("organization_id", organization_id)
      .single();

    let accountId = payoutMethod?.stripe_account_id;

    // Also check organizations table for legacy stripe_account_id
    if (!accountId) {
      const { data: orgData } = await supabaseAdmin
        .from("organizations")
        .select("stripe_account_id")
        .eq("id", organization_id)
        .single();
      accountId = orgData?.stripe_account_id;
    }

    if (!accountId) {
      // Create a Standard connected account. Standard matches the TeeVents
      // Platform Profile setting "Stripe manages risk" — Stripe controls losses,
      // and the organizer gets a full Stripe Dashboard. Express is incompatible
      // with stripe-managed losses (Stripe error: "With a dashboard type of
      // `express`, the Connect application must control losses").
      const account = await stripe.accounts.create({
        type: "standard",
        country: "US",
        email: user.email,
        business_profile: {
          mcc: "7941",
          url: "https://teevents.golf",
        },
      });
      accountId = account.id;

      // Save to organizations table
      await supabaseAdmin
        .from("organizations")
        .update({ stripe_account_id: accountId })
        .eq("id", organization_id);

      // Upsert payout method record
      await supabaseAdmin
        .from("organization_payout_methods")
        .upsert({
          organization_id,
          stripe_account_id: accountId,
          stripe_onboarding_complete: false,
          stripe_account_status: "pending",
          preferred_method: "stripe",
          is_verified: false,
        }, { onConflict: "organization_id" });

      // Log onboarding start
      await supabaseAdmin
        .from("stripe_onboarding_logs")
        .insert({
          organization_id,
          stripe_account_id: accountId,
          event_type: "onboarding_started",
          metadata: { user_email: user.email },
        });
    }

    // Create an account link for onboarding
    const origin = req.headers.get("origin") || "https://teevents.lovable.app";

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/payout-settings?refresh=true`,
      return_url: `${origin}/dashboard/payout-settings?stripe_connected=true`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("stripe-connect-onboard error:", message);

    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("expired api key")) {
      return stripeConfigErrorResponse(
        "The saved Stripe secret key is expired. Please update the Stripe connector with a current live secret key, then try again.",
        "STRIPE_SECRET_KEY_EXPIRED",
      );
    }

    if (normalizedMessage.includes("invalid api key") || normalizedMessage.includes("api key provided")) {
      return stripeConfigErrorResponse(
        "The saved Stripe secret key is invalid. Please update the Stripe connector with a current live secret key, then try again.",
        "STRIPE_SECRET_KEY_INVALID",
      );
    }

    const isPlatformConfigError =
      normalizedMessage.includes("responsibilities") ||
      normalizedMessage.includes("platform profile") ||
      normalizedMessage.includes("platform-profile") ||
      normalizedMessage.includes("questionnaire") ||
      normalizedMessage.includes("create live connected accounts");

    if (isPlatformConfigError) {
      return stripeConfigErrorResponse(
        "Stripe Connect is waiting on the platform profile questionnaire/final verification before live organizer accounts can be connected.",
        "STRIPE_PLATFORM_PROFILE_INCOMPLETE",
      );
    }

    const status = message === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
